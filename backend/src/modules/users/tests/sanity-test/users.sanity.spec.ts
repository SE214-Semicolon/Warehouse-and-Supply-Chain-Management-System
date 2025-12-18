import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `user-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Users Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });

    const adminUser = await prisma.user.create({
      data: {
        username: `admin-sanity-${TEST_SUITE_ID}`,
        email: `admin-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });
    adminUserId = adminUser.id;

    adminToken = `Bearer ${jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    })}`;
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-USER-01: CRUD Operations', () => {
    let userId: string;

    it('should CREATE user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', adminToken)
        .send({
          email: `sanity1-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          role: 'warehouse_staff',
          fullName: 'Sanity Test User',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      userId = response.body.user.id;
    });

    it('should READ user by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(userId);
    });

    it('should UPDATE user', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', adminToken)
        .send({ fullName: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.fullName).toBe('Updated Name');
    });

    it('should DEACTIVATE user', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', adminToken)
        .expect(200);
    });
  });

  describe('SANITY-USER-02: Role Management', () => {
    const roles = ['admin', 'manager', 'analyst', 'warehouse_staff', 'logistics', 'sales_rep'];

    it('should create users with different roles', async () => {
      for (const role of roles) {
        const response = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', adminToken)
          .send({
            email: `${role}-${TEST_SUITE_ID}@test.com`,
            password: 'Test123456',
            role,
            fullName: `${role} User`,
          })
          .expect(201);

        expect(response.body.user.role).toBe(role);
      }
    });

    it('should update user role', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', adminToken)
        .send({
          email: `rolechange-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          role: 'warehouse_staff',
          fullName: 'Role Change User',
        });

      const userId = createResponse.body.user.id;

      const updateResponse = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', adminToken)
        .send({ role: 'manager' })
        .expect(200);

      expect(updateResponse.body.user.role).toBe('manager');
    });
  });

  describe('SANITY-USER-03: Data Validation', () => {
    it('should prevent duplicate emails', async () => {
      const email = `duplicate-${TEST_SUITE_ID}@test.com`;

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', adminToken)
        .send({
          email,
          password: 'Test123456',
          role: 'warehouse_staff',
          fullName: 'First User',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', adminToken)
        .send({
          email,
          password: 'Test123456',
          role: 'warehouse_staff',
          fullName: 'Second User',
        })
        .expect(409);
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', adminToken)
        .send({
          email: 'invalid-email',
          password: 'Test123456',
          role: 'warehouse_staff',
          fullName: 'Invalid Email User',
        })
        .expect(400);
    });

    it('should enforce password requirements', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', adminToken)
        .send({
          email: `weak-${TEST_SUITE_ID}@test.com`,
          password: '123',
          role: 'warehouse_staff',
          fullName: 'Weak Password User',
        })
        .expect(400);
    });
  });

  describe('SANITY-USER-04: Security & Authorization', () => {
    it('should require admin role for user management', async () => {
      const staffUser = await prisma.user.create({
        data: {
          username: `staff-${TEST_SUITE_ID}`,
          email: `staff-${TEST_SUITE_ID}@test.com`,
          fullName: 'Staff User',
          passwordHash: '$2b$10$validhashedpassword',
          role: UserRole.warehouse_staff,
          active: true,
        },
      });

      const staffToken = `Bearer ${jwtService.sign({
        sub: staffUser.id,
        email: staffUser.email,
        role: staffUser.role,
      })}`;

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', staffToken)
        .send({
          email: `unauthorized-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          role: 'warehouse_staff',
          fullName: 'Unauthorized Creation',
        })
        .expect(403);
    });

    it('should prevent self-deletion', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${adminUserId}`)
        .set('Authorization', adminToken)
        .expect(403);
    });

    it('should hash passwords properly', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', adminToken)
        .send({
          email: `hash-${TEST_SUITE_ID}@test.com`,
          password: 'MySecretPassword123',
          role: 'warehouse_staff',
          fullName: 'Hash Test User',
        })
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { id: response.body.user.id },
      });

      expect(user).toBeDefined();
      expect(user?.passwordHash).not.toBe('MySecretPassword123');
      expect(user?.passwordHash).toMatch(/^\$2[aby]\$\d{1,2}\$/);
    });
  });

  describe('SANITY-USER-05: Search & Filtering', () => {
    it('should filter users by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', adminToken)
        .query({ role: 'admin' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeInstanceOf(Array);
    });

    it('should filter by active status', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', adminToken)
        .query({ active: true })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should search users by email', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', adminToken)
        .query({ search: TEST_SUITE_ID })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeInstanceOf(Array);
    });
  });
});
