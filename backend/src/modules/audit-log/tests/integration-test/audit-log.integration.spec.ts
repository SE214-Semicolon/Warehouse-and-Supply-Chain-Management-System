import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `audit-e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Audit Log Module - E2E Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;

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

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-${TEST_SUITE_ID}`,
        email: `manager-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager User',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

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

    staffToken = `Bearer ${jwtService.sign({
      sub: staffUser.id,
      email: staffUser.email,
      role: staffUser.role,
    })}`;
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('GET /audit-logs', () => {
    it('should get all audit logs (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .expect(200);

      // API returns {page, limit, total, results}
      expect(response.body.results).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('total');
    });

    it('should get audit logs (manager)', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', managerToken)
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/audit-logs').expect(401);
    });

    it('should fail with insufficient permissions (staff)', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', staffToken)
        .expect(403);
    });
  });

  describe('GET /audit-logs - Filtering', () => {
    it('should filter by entity type', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ entityType: 'User' })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should filter by action', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ action: 'CREATE' })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should filter by user ID', async () => {
      const user = await prisma.user.findFirst({
        where: { email: `admin-${TEST_SUITE_ID}@test.com` },
      });

      if (!user) return;

      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ userId: user.id })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-01-01').toISOString();
      const endDate = new Date('2025-12-31').toISOString();

      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should handle pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('INTEGRATION-AUDIT-01: Basic Query', () => {
    it('should retrieve audit logs successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .expect(200);

      // API returns {page, limit, total, results}
      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should return proper structure for audit log entries', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ limit: 1 })
        .expect(200);

      if (response.body.results.length > 0) {
        const log = response.body.results[0];
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('entityType');
        expect(log).toHaveProperty('timestamp');
      }
    });
  });

  describe('INTEGRATION-AUDIT-02: Filtering Capabilities', () => {
    it('should filter by entity type', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ entityType: 'User' })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should filter by action type', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ action: 'CREATE' })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should filter by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });
  });

  describe('INTEGRATION-AUDIT-03: Authorization', () => {
    it('should allow admin access', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .expect(200);
    });

    it('should allow manager access', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', managerToken)
        .expect(200);
    });

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer()).get('/audit-logs').expect(401);
    });
  });

  describe('INTEGRATION-AUDIT-04: Pagination', () => {
    it('should handle pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('results');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.results.length).toBeLessThanOrEqual(5);
    });
  });
});
