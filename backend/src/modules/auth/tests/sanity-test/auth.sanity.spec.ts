import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';

const TEST_SUITE_ID = `auth-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Auth Module - Sanity Tests', () => {
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

  describe('SANITY-AUTH-01: JWT Token Flow', () => {
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

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(`sanity1-${TEST_SUITE_ID}@test.com`);
    });

    it('should refresh access token with refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.accessToken).not.toBe(accessToken);
    });
  });

  describe('SANITY-AUTH-02: Password Security', () => {
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

  describe('SANITY-AUTH-03: Login Validation', () => {
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

  describe('SANITY-AUTH-04: Token Invalidation', () => {
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
