import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `alert-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SANITY TEST - Alert Module
 * Purpose: Verify basic workflows work after changes
 * Scope: Simple happy-path tests, no deep validation
 * Expected: < 2 minutes execution time
 */
describe('Alert Module - Sanity Tests', () => {
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
        fullName: 'Admin Sanity Test',
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

  describe('SANITY-ALERT-01: Basic Workflow', () => {
    let alertId: string;

    it('should complete CREATE-READ-DELETE workflow', async () => {
      // CREATE
      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', adminToken)
        .send({
          type: 'LOW_STOCK',
          severity: 'WARNING',
          message: 'Sanity test alert',
        })
        .expect(201);

      expect(createRes.body.success).toBe(true);
      alertId = createRes.body.alert.id;

      // READ
      const readRes = await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', adminToken)
        .expect(200);

      expect(readRes.body.success).toBe(true);
      expect(readRes.body.alerts).toBeInstanceOf(Array);

      // DELETE
      await request(app.getHttpServer())
        .delete(`/alerts/${alertId}`)
        .set('Authorization', adminToken)
        .expect(200);
    });

    it('should get unread count', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/unread-count')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
