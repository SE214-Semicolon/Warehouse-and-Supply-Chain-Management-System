import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `audit-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Audit Log Module - Sanity Tests', () => {
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

  describe('SANITY-AUDIT-01: Basic Query', () => {
    it('should retrieve audit logs successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.auditLogs).toBeInstanceOf(Array);
    });

    it('should return proper structure for audit log entries', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ limit: 1 })
        .expect(200);

      if (response.body.auditLogs.length > 0) {
        const log = response.body.auditLogs[0];
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('entityType');
        expect(log).toHaveProperty('timestamp');
      }
    });
  });

  describe('SANITY-AUDIT-02: Filtering Capabilities', () => {
    it('should filter by entity type', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ entityType: 'User' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.auditLogs).toBeInstanceOf(Array);
    });

    it('should filter by action type', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ action: 'CREATE' })
        .expect(200);

      expect(response.body.success).toBe(true);
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

      expect(response.body.success).toBe(true);
    });
  });

  describe('SANITY-AUDIT-03: Authorization', () => {
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
      await request(app.getHttpServer())
        .get('/audit-logs')
        .expect(401);
    });
  });

  describe('SANITY-AUDIT-04: Pagination', () => {
    it('should handle pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('meta');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.auditLogs.length).toBeLessThanOrEqual(5);
    });
  });
});
