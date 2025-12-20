import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';

const TEST_SUITE_ID = `alert-integration-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * INTEGRATION TEST - Alert Module
 * Purpose: Test complete workflows, business logic, and cross-feature interactions
 * Scope: Full E2E testing with comprehensive validation
 */
describe('Alert Module - Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let managerToken: string;
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

    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });

    const adminUser = await prisma.user.create({
      data: {
        username: `admin-integration-${TEST_SUITE_ID}`,
        email: `admin-integration-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Integration',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-integration-${TEST_SUITE_ID}`,
        email: `manager-integration-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager Integration',
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

    it('should filter unread count by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/unread-count')
        .set('Authorization', adminToken)
        .query({ type: 'LOW_STOCK' })
        .expect(200);

      expect(response.body).toHaveProperty('count');
    });
  });

  describe('Authorization Tests', () => {
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

  describe('Alert Types & Severity', () => {
    it('should create LOW_STOCK alert with WARNING severity', async () => {
      const response = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', adminToken)
        .send({
          type: 'LOW_STOCK',
          severity: 'WARNING',
          message: 'Product XYZ stock below threshold',
          metadata: { productId: 'test-product-123', currentStock: 5, threshold: 10 },
        })
        .expect(201);

      expect(response.body.alert.type).toBe('LOW_STOCK');
      expect(response.body.alert.severity).toBe('WARNING');
    });

    it('should create EXPIRY alert with ERROR severity', async () => {
      const response = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', adminToken)
        .send({
          type: 'EXPIRY',
          severity: 'ERROR',
          message: 'Batch ABC expiring soon',
          metadata: { batchId: 'batch-123', expiryDate: '2025-12-25' },
        })
        .expect(201);

      expect(response.body.alert.type).toBe('EXPIRY');
      expect(response.body.alert.severity).toBe('ERROR');
    });

    it('should create PO_LATE alert', async () => {
      const response = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', adminToken)
        .send({
          type: 'PO_LATE',
          severity: 'WARNING',
          message: 'Purchase Order PO-001 overdue',
          metadata: { poId: 'po-123', expectedDate: '2025-12-20', daysLate: 3 },
        })
        .expect(201);

      expect(response.body.alert.type).toBe('PO_LATE');
    });
  });

  describe('Batch Operations', () => {
    let alertIds: string[] = [];

    beforeAll(async () => {
      // Create multiple alerts for batch testing
      for (let i = 0; i < 3; i++) {
        const res = await request(app.getHttpServer())
          .post('/alerts')
          .set('Authorization', adminToken)
          .send({
            type: 'SYSTEM',
            severity: 'INFO',
            message: `Batch test alert ${i}`,
          })
          .expect(201);

        alertIds.push(res.body.alert.id);
      }
    });

    it('should mark multiple alerts as read', async () => {
      for (const id of alertIds) {
        await request(app.getHttpServer())
          .patch(`/alerts/${id}/read`)
          .set('Authorization', adminToken)
          .expect(200);
      }

      // Verify all marked as read
      for (const id of alertIds) {
        const response = await request(app.getHttpServer())
          .get(`/alerts/${id}`)
          .set('Authorization', adminToken)
          .expect(200);

        expect(response.body.alert.isRead).toBe(true);
      }
    });

    it('should query only unread alerts', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', adminToken)
        .query({ isRead: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data) {
        response.body.data.forEach((alert: any) => {
          expect(alert.isRead).toBe(false);
        });
      }
    });
  });
});
