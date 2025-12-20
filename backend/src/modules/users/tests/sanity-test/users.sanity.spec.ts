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
        fullName: 'Admin Smoke',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

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

  describe('SANITY-USER-01: Critical Path', () => {
    let userId: string;

    it('should CREATE a user', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', adminToken)
        .send({
          email: `sanity-user-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          role: 'warehouse_staff',
          fullName: 'Smoke Test User',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      userId = response.body.user.id;
    });

    it('should READ users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeInstanceOf(Array);
    });

    it('should GET user by id', async () => {
      if (!userId) return;

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(userId);
    });

    it('should DEACTIVATE user', async () => {
      if (!userId) return;

      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', adminToken)
        .expect(200);
    });
  });
});
