import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `alert-smoke-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SMOKE TEST - Alert Module
 * Purpose: Verify critical functionality works (basic health check)
 * Scope: Test only the most critical paths
 */
describe('Alert Module - Smoke Tests', () => {
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
        username: `admin-smoke-${TEST_SUITE_ID}`,
        email: `admin-smoke-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Smoke Test',
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

  describe('SMOKE-ALERT-01: Critical Path', () => {
    let alertId: string;

    it('should CREATE an alert', async () => {
      const response = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', adminToken)
        .send({
          type: 'LOW_STOCK',
          severity: 'WARNING',
          message: 'Smoke test alert',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.alert).toHaveProperty('id');
      alertId = response.body.alert.id;
    });

    it('should READ alerts', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.alerts).toBeInstanceOf(Array);
    });

    it('should GET unread count', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/unread-count')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('unreadCount');
    });

    it('should DELETE alert', async () => {
      if (!alertId) {
        return;
      }

      await request(app.getHttpServer())
        .delete(`/alerts/${alertId}`)
        .set('Authorization', adminToken)
        .expect(200);
    });
  });
});
