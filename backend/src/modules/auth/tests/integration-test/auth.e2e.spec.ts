import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';

const TEST_SUITE_ID = `auth-e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Auth Module - E2E Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('POST /auth/signup', () => {
    it('should signup a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `signup-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          fullName: 'Test User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(`signup-${TEST_SUITE_ID}@test.com`);
    });

    it('should fail with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `duplicate-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          fullName: 'User 1',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `duplicate-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          fullName: 'User 2',
        })
        .expect(409);
    });

    it('should fail with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'Test123456',
          fullName: 'Test User',
        })
        .expect(400);
    });

    it('should fail with weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `weak-pwd-${TEST_SUITE_ID}@test.com`,
          password: '123',
          fullName: 'Test User',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `login-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          fullName: 'Login Test User',
        });
    });

    it('should login with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `login-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
    });

    it('should fail with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `login-${TEST_SUITE_ID}@test.com`,
          password: 'WrongPassword123',
        })
        .expect(401);
    });

    it('should fail with non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `nonexistent-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
        })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `refresh-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          fullName: 'Refresh Test User',
        });
      refreshToken = response.body.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).toBeDefined();
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `logout-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          fullName: 'Logout Test User',
        });
      refreshToken = response.body.refreshToken;
    });

    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(200);
    });

    it('should fail to refresh after logout', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('POST /auth/change-password', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `change-pwd-${TEST_SUITE_ID}@test.com`,
          password: 'OldPassword123',
          fullName: 'Change Password User',
        });
      accessToken = response.body.accessToken;
    });

    it('should change password successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword123',
        })
        .expect(200);
    });

    it('should login with new password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `change-pwd-${TEST_SUITE_ID}@test.com`,
          password: 'NewPassword123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });

    it('should fail to login with old password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `change-pwd-${TEST_SUITE_ID}@test.com`,
          password: 'OldPassword123',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    let accessToken: string;
    let userId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `me-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          fullName: 'Me Test User',
        });
      accessToken = response.body.accessToken;
      userId = response.body.user.id;
    });

    it('should get current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.user.id).toBe(userId);
      expect(response.body.user.email).toBe(`me-${TEST_SUITE_ID}@test.com`);
    });

    it('should fail without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });
});
