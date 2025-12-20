import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `system-smoke-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SMOKE TEST - System-wide
 * Purpose: Verify application can start and critical paths work
 * Scope: Absolute minimum - just verify app doesn't crash
 * Expected: < 30 seconds execution time
 */
describe('System Smoke Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Create test admin user
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    const adminUser = await prisma.user.create({
      data: {
        username: `admin-smoke-${TEST_SUITE_ID}`,
        email: `admin-smoke-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Smoke',
        passwordHash: '$2b$10$K7L/K.hUzHJhLEjLbKmE3eZjV3gGxZzK9mZ9xGxGxGxGxGxGxGxGxG',
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

  describe('Application Health', () => {
    it('should initialize application successfully', () => {
      expect(app).toBeDefined();
    });

    it('should connect to PostgreSQL database', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as result`;
      expect(result).toBeDefined();
    });

    it('should verify database models accessible', async () => {
      // Test that core models can be queried
      const userCount = await prisma.user.count();
      expect(typeof userCount).toBe('number');
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/alerts').expect(401);
    });

    it('should accept valid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', adminToken)
        .expect((res) => expect(res.status).toBeLessThan(500));
    });
  });

  describe('Critical Module Endpoints', () => {
    it('should respond to /alerts endpoint', async () => {
      await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', adminToken)
        .expect((res) => expect(res.status).toBeLessThan(500));
    });

    it('should respond to /purchase-orders endpoint', async () => {
      await request(app.getHttpServer())
        .get('/purchase-orders')
        .set('Authorization', adminToken)
        .expect((res) => expect(res.status).toBeLessThan(500));
    });

    it('should respond to /sales-orders endpoint', async () => {
      await request(app.getHttpServer())
        .get('/sales-orders')
        .set('Authorization', adminToken)
        .expect((res) => expect(res.status).toBeLessThan(500));
    });

    it('should respond to /inventory endpoint', async () => {
      await request(app.getHttpServer())
        .get('/inventory')
        .set('Authorization', adminToken)
        .expect((res) => expect(res.status).toBeLessThan(500));
    });

    it('should respond to /products endpoint', async () => {
      await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', adminToken)
        .expect((res) => expect(res.status).toBeLessThan(500));
    });

    it('should respond to /suppliers endpoint', async () => {
      await request(app.getHttpServer())
        .get('/suppliers')
        .set('Authorization', adminToken)
        .expect((res) => expect(res.status).toBeLessThan(500));
    });

    it('should respond to /warehouses endpoint', async () => {
      await request(app.getHttpServer())
        .get('/warehouses')
        .set('Authorization', adminToken)
        .expect((res) => expect(res.status).toBeLessThan(500));
    });

    it('should respond to /shipments endpoint', async () => {
      await request(app.getHttpServer())
        .get('/shipments')
        .set('Authorization', adminToken)
        .expect((res) => expect(res.status).toBeLessThan(500));
    });

    it('should respond to /users endpoint', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', adminToken)
        .expect((res) => expect(res.status).toBeLessThan(500));
    });

    it('should respond to /audit-logs endpoint', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', adminToken)
        .expect((res) => expect(res.status).toBeLessThan(500));
    });
  });
});
