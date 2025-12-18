import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';

const TEST_SUITE_ID = `alert-e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Alert Module - Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService;
  let adminToken: string;
  let _managerToken: string;
  let createdAlertId: string;

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

    await createTestUsers();
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: TEST_SUITE_ID } },
    });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  async function createTestUsers() {
    const admin = await prisma.user.create({
      data: {
        username: `admin-alert-${TEST_SUITE_ID}`,
        email: `admin-alert-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin User',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const manager = await prisma.user.create({
      data: {
        username: `manager-alert-${TEST_SUITE_ID}`,
        email: `manager-alert-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager User',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    adminToken = `Bearer ${jwtService.sign({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    })}`;

    _managerToken = `Bearer ${jwtService.sign({
      sub: manager.id,
      email: manager.email,
      role: manager.role,
    })}`;
  }

  describe('POST /alerts - Create Alert', () => {
    it('should create alert with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', adminToken)
        .send({
          type: 'LOW_STOCK',
          severity: 'WARNING',
          message: 'Test low stock alert',
          entityId: 'test-product-id',
          entityType: 'Product',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.alert).toHaveProperty('id');
      expect(response.body.alert.type).toBe('LOW_STOCK');
      createdAlertId = response.body.alert.id;
    });

    it('should reject invalid severity', async () => {
      await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', adminToken)
        .send({
          type: 'LOW_STOCK',
          severity: 'INVALID',
          message: 'Test',
        })
        .expect(400);
    });
  });

  describe('GET /alerts - List Alerts', () => {
    it('should get all alerts with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', adminToken)
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.alerts).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('total');
    });

    it('should filter by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', adminToken)
        .query({ type: 'LOW_STOCK' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /alerts/:id - Get Alert by ID', () => {
    it('should get alert by id', async () => {
      if (!createdAlertId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/alerts/${createdAlertId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.alert.id).toBe(createdAlertId);
    });

    it('should return 404 for non-existent alert', async () => {
      await request(app.getHttpServer())
        .get('/alerts/non-existent-id')
        .set('Authorization', adminToken)
        .expect(404);
    });
  });

  describe('PATCH /alerts/:id/read - Mark as Read', () => {
    it('should mark alert as read', async () => {
      if (!createdAlertId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/alerts/${createdAlertId}/read`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /alerts/:id - Delete Alert', () => {
    it('should delete alert', async () => {
      if (!createdAlertId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .delete(`/alerts/${createdAlertId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /alerts/unread-count - Unread Count', () => {
    it('should get unread count', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/unread-count')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('unreadCount');
    });
  });
});
