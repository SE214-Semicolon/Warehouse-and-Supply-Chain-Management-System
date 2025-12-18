import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `auth-smoke-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Auth Module - Smoke Tests', () => {
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

  describe('SMOKE-AUTH-01: Critical Path', () => {
    let refreshToken: string;

    it('should SIGNUP a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `smoke-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
          fullName: 'Smoke Test User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      refreshToken = response.body.refreshToken;
    });

    it('should LOGIN with credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `smoke-${TEST_SUITE_ID}@test.com`,
          password: 'Test123456',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should REFRESH token', async () => {
      if (!refreshToken) return;

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });

    it('should LOGOUT', async () => {
      if (!refreshToken) return;

      await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken }).expect(200);
    });
  });
});
