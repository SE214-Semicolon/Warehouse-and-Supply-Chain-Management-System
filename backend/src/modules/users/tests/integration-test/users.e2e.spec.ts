import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `users-e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Users Module - E2E Integration Tests', () => {
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
        username: `admin-${TEST_SUITE_ID}`,
        email: `admin-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin User',
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

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', adminToken)
        .send({
          email: `user1-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          role: 'warehouse_staff',
          fullName: 'Test User 1',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(`user1-${TEST_SUITE_ID}@test.com`);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          email: `user2-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          role: 'warehouse_staff',
          fullName: 'Test User 2',
        })
        .expect(401);
    });

    it('should fail with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', adminToken)
        .send({
          email: `duplicate-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          role: 'warehouse_staff',
          fullName: 'Duplicate User 1',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', adminToken)
        .send({
          email: `duplicate-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          role: 'warehouse_staff',
          fullName: 'Duplicate User 2',
        })
        .expect(409);
    });
  });

  describe('GET /users', () => {
    it('should get all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeInstanceOf(Array);
      expect(response.body.users.length).toBeGreaterThan(0);
    });

    it('should filter by role', async () => {
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

    it('should search by email', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', adminToken)
        .query({ search: TEST_SUITE_ID })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeInstanceOf(Array);
    });
  });

  describe('GET /users/:id', () => {
    let userId: string;

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          username: `getuser-${TEST_SUITE_ID}`,
          email: `getuser-${TEST_SUITE_ID}@test.com`,
          fullName: 'Get User Test',
          passwordHash: '$2b$10$validhashedpassword',
          role: UserRole.warehouse_staff,
          active: true,
        },
      });
      userId = user.id;
    });

    it('should get user by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(userId);
    });

    it('should fail with non-existent ID', async () => {
      await request(app.getHttpServer())
        .get('/users/nonexistent-id')
        .set('Authorization', adminToken)
        .expect(404);
    });
  });

  describe('PATCH /users/:id', () => {
    let userId: string;

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          username: `updateuser-${TEST_SUITE_ID}`,
          email: `updateuser-${TEST_SUITE_ID}@test.com`,
          fullName: 'Update User Test',
          passwordHash: '$2b$10$validhashedpassword',
          role: UserRole.warehouse_staff,
          active: true,
        },
      });
      userId = user.id;
    });

    it('should update user', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', adminToken)
        .send({
          fullName: 'Updated Full Name',
          role: 'manager',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.fullName).toBe('Updated Full Name');
      expect(response.body.user.role).toBe('manager');
    });
  });

  describe('DELETE /users/:id', () => {
    let userId: string;

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          username: `deleteuser-${TEST_SUITE_ID}`,
          email: `deleteuser-${TEST_SUITE_ID}@test.com`,
          fullName: 'Delete User Test',
          passwordHash: '$2b$10$validhashedpassword',
          role: UserRole.warehouse_staff,
          active: true,
        },
      });
      userId = user.id;
    });

    it('should deactivate user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent self-deletion', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${adminUserId}`)
        .set('Authorization', adminToken)
        .expect(403);
    });
  });
});
