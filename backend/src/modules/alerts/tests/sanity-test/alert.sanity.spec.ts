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
 * Purpose: Verify key functionalities after minor changes/bug fixes
 * Scope: Test main features and common use cases
 */
describe('Alert Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let managerToken: string;

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

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-sanity-${TEST_SUITE_ID}`,
        email: `manager-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    adminToken = `Bearer ${jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    })}`;

    managerToken = `Bearer ${jwtService.sign({
      sub: managerUser.id,
      email: managerUser.email,
      role: managerUser.role,
    })}`;
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-ALERT-01: Core CRUD', () => {
    let alertId: string;

    it('should create, read, update and delete alert', async () => {
      // Create
      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', adminToken)
        .send({
          type: 'LOW_STOCK',
          severity: 'WARNING',
          message: 'Sanity test',
        })
        .expect(201);

      alertId = createRes.body.alert.id;

      // Read
      await request(app.getHttpServer())
        .get(`/alerts/${alertId}`)
        .set('Authorization', adminToken)
        .expect(200);

      // Mark as read
      await request(app.getHttpServer())
        .patch(`/alerts/${alertId}/read`)
        .set('Authorization', adminToken)
        .expect(200);

      // Delete
      await request(app.getHttpServer())
        .delete(`/alerts/${alertId}`)
        .set('Authorization', adminToken)
        .expect(200);
    });
  });

  describe('SANITY-ALERT-02: Filtering', () => {
    it('should filter alerts by type and severity', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', adminToken)
        .query({ type: 'LOW_STOCK', severity: 'WARNING' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('SANITY-ALERT-03: Authorization', () => {
    it('should allow manager to read alerts', async () => {
      await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', managerToken)
        .expect(200);
    });

    it('should allow manager to create alerts', async () => {
      await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', managerToken)
        .send({
          type: 'SYSTEM',
          severity: 'INFO',
          message: 'Manager test',
        })
        .expect(201);
    });
  });
});
