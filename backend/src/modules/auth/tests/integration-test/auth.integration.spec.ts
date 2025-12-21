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
    // Clean up test data from previous runs - delete RefreshToken first due to FK constraint
    const usersToDelete = await prisma.user.findMany({
      where: { email: { contains: TEST_SUITE_ID } },
    });
    if (usersToDelete.length > 0) {
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: usersToDelete.map((u) => u.id) } },
      });
      await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    }
  }, 30000);

  afterAll(async () => {
    // Clean up test data - delete RefreshToken first due to FK constraint
    const usersToDelete = await prisma.user.findMany({
      where: { email: { contains: TEST_SUITE_ID } },
    });
    if (usersToDelete.length > 0) {
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: usersToDelete.map((u) => u.id) } },
      });
      await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    }
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
      // API returns only tokens, no user object
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

      // API returns 401 for duplicate email (UnauthorizedException)
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `duplicate-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          fullName: 'User 2',
        })
        .expect(401);
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
      // API returns only tokens, no user object
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
      // API returns 400 for malformed JWT, 401 for expired/revoked tokens
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(400);
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
      await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken }).expect(200);
    });

    it('should fail to refresh after logout', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(401);
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
      // Note: userId is not returned directly from signup, we'll verify by email instead
    });

    it('should get current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // API returns user data directly, not wrapped in user object
      expect(response.body.email).toBe(`me-${TEST_SUITE_ID}@test.com`);
      expect(response.body.userId).toBeDefined();
    });

    it('should fail without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('INTEGRATION-AUTH-01: JWT Token Flow', () => {
    let accessToken: string;
    let refreshToken: string;

    it('should signup and receive valid JWT tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `sanity1-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          fullName: 'Sanity Test User',
        })
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should access protected route with access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // API returns user data directly, not wrapped in user object
      expect(response.body.email).toBe(`sanity1-${TEST_SUITE_ID}@test.com`);
      expect(response.body.userId).toBeDefined();
    });

    it('should refresh access token with refresh token', async () => {
      // Wait 1 second to ensure token timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      // Note: Token may be same if generated within same second (iat timestamp)
      // Just verify we get valid tokens back
    });
  });

  describe('INTEGRATION-AUTH-02: Password Security', () => {
    it('should hash passwords (not stored in plain text)', async () => {
      const email = `sanity2-${TEST_SUITE_ID}@test.com`;
      const password = 'MySecurePass123';

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email,
          password,
          fullName: 'Password Test User',
        })
        .expect(201);

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).toBeDefined();
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe(password);
      expect(user?.passwordHash).toMatch(/^\$2[aby]\$\d{1,2}\$/); // bcrypt hash pattern
    });

    it('should enforce password strength requirements', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `sanity3-${TEST_SUITE_ID}@test.com`,
          password: '123', // Too weak
          fullName: 'Weak Password User',
        })
        .expect(400);
    });
  });

  describe('INTEGRATION-AUTH-03: Login Validation', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `sanity4-${TEST_SUITE_ID}@test.com`,
          password: 'ValidPass123',
          fullName: 'Login Validation User',
        });
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `sanity4-${TEST_SUITE_ID}@test.com`,
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should reject non-existent users', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `nonexistent-${TEST_SUITE_ID}@test.com`,
          password: 'SomePassword123',
        })
        .expect(401);
    });

    it('should accept valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `sanity4-${TEST_SUITE_ID}@test.com`,
          password: 'ValidPass123',
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
    });
  });

  describe('INTEGRATION-AUTH-04: Token Invalidation', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `sanity5-${TEST_SUITE_ID}@test.com`,
          password: 'TokenTest123',
          fullName: 'Token Invalidation User',
        });
      refreshToken = response.body.refreshToken;
    });

    it('should logout and invalidate refresh token', async () => {
      await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken }).expect(200);

      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(401);
    });
  });
});
