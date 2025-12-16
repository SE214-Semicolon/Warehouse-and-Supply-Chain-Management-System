import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../../app.module';
import { PrismaService } from '../../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `so-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SANITY TEST - Sales Order Module
 * Verify key functionalities after minor changes/bug fixes
 */
describe('Sales Order Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let adminUserId: string;
  let managerToken: string;
  let customerId: string;

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

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await prisma.salesOrder.deleteMany({
      where: { customer: { code: { contains: TEST_SUITE_ID } } },
    });
    await prisma.customer.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });

    const adminUser = await prisma.user.create({
      data: {
        username: `admin-so-sanity-${TEST_SUITE_ID}`,
        email: `admin-so-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin SO Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-so-sanity-${TEST_SUITE_ID}`,
        email: `manager-so-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager SO Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    adminUserId = adminUser.id;

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

    const customer = await prisma.customer.create({
      data: {
        code: `SANITY-CUSTOMER-${TEST_SUITE_ID}`,
        name: `Sanity Test Customer ${TEST_SUITE_ID}`,
        contactInfo: JSON.stringify({ email: 'customer@test.com' }),
      },
    });

    customerId = customer.id;
  }, 30000);

  afterAll(async () => {
    await prisma.salesOrder.deleteMany({
      where: { customer: { code: { contains: TEST_SUITE_ID } } },
    });
    await prisma.customer.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-SO-01: Core CRUD Operations', () => {
    let orderId: string;

    it('should create sales order with all fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
          placedAt: '2024-01-15T10:00:00Z',
          items: [],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('soNo');
      expect(response.body.customerId).toBe(customerId);
      expect(response.body.status).toBe('pending');
      orderId = response.body.id;
    });

    it('should retrieve sales order with items', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sales-orders/${orderId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.id).toBe(orderId);
      expect(response.body.items).toBeDefined();
    });

    it('should list sales orders with filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders?status=pending')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
    });

    it('should update sales order fields', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/sales-orders/${orderId}`)
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
        })
        .expect(200);

      expect(response.body.id).toBe(orderId);
      expect(response.body.customerId).toBe(customerId);
    });
  });

  describe('SANITY-SO-02: Status Workflow', () => {
    let workflowOrderId: string;

    it('should create sales order in pending status', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
        })
        .expect(201);

      expect(response.body.status).toBe('pending');
      workflowOrderId = response.body.id;
    });

    it('should submit sales order from pending to approved', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${workflowOrderId}/submit`)
        .set('Authorization', adminToken)
        .send({
          userId: adminUserId,
        })
        .expect(201);

      expect(response.body.status).toBe('approved');
    });

    it('should not allow updating approved sales order', async () => {
      await request(app.getHttpServer())
        .patch(`/sales-orders/${workflowOrderId}`)
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
        })
        .expect(400);
    });

    it('should cancel approved sales order', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${workflowOrderId}/cancel`)
        .set('Authorization', adminToken)
        .expect(201);

      expect(response.body.status).toBe('cancelled');
    });
  });

  describe('SANITY-SO-03: Role-Based Access Control', () => {
    it('should allow admin to create sales order', async () => {
      await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
        })
        .expect(201);
    });

    it('should allow manager to create sales order', async () => {
      await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', managerToken)
        .send({
          customerId: customerId,
        })
        .expect(201);
    });

    it('should allow admin to submit sales order', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales-orders/${createResponse.body.id}/submit`)
        .set('Authorization', adminToken)
        .send({
          userId: adminUserId,
        })
        .expect(201);
    });

    it('should allow manager to submit sales order', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', managerToken)
        .send({
          customerId: customerId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales-orders/${createResponse.body.id}/submit`)
        .set('Authorization', managerToken)
        .send({
          userId: adminUserId,
        })
        .expect(201);
    });
  });

  describe('SANITY-SO-04: Data Validation', () => {
    it('should validate sales order creation data', async () => {
      await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              productId: 'invalid-uuid',
              qty: 10,
            },
          ],
        })
        .expect(400);
    });

    it('should validate negative quantity', async () => {
      await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              productId: '00000000-0000-0000-0000-000000000000',
              qty: -5,
            },
          ],
        })
        .expect(400);
    });

    it('should validate submit userId requirement', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales-orders/${createResponse.body.id}/submit`)
        .set('Authorization', adminToken)
        .send({})
        .expect(400);
    });
  });

  describe('SANITY-SO-05: Error Handling', () => {
    it('should handle non-existent sales order gracefully', async () => {
      await request(app.getHttpServer())
        .get('/sales-orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('should handle invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders/invalid-uuid')
        .set('Authorization', adminToken);

      expect([400, 500]).toContain(response.status);
    });

    it('should prevent submitting non-pending sales order', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales-orders/${createResponse.body.id}/submit`)
        .set('Authorization', adminToken)
        .send({
          userId: adminUserId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales-orders/${createResponse.body.id}/submit`)
        .set('Authorization', adminToken)
        .send({
          userId: adminUserId,
        })
        .expect(400);
    });

    it('should prevent cancelling shipped sales order', async () => {
      const so = await prisma.salesOrder.create({
        data: {
          soNo: `SO-SHIPPED-${Date.now()}`,
          status: 'shipped',
          customerId: customerId,
          totalAmount: 0,
        },
      });

      await request(app.getHttpServer())
        .post(`/sales-orders/${so.id}/cancel`)
        .set('Authorization', adminToken)
        .expect(400);
    });
  });

  describe('SANITY-SO-06: Pagination and Sorting', () => {
    beforeAll(async () => {
      // Create multiple sales orders for testing
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/sales-orders')
          .set('Authorization', adminToken)
          .send({
            customerId: customerId,
          });
      }
    });

    it('should paginate sales orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders?page=1&pageSize=3')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(3);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(3);
    });

    it('should sort sales orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders?sort=createdAt:desc')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter sales orders by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders?status=pending')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
      if (response.body.data.length > 0) {
        expect(response.body.data[0].status).toBe('pending');
      }
    });

    it('should filter sales orders by customer', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sales-orders?customerId=${customerId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });
});
