import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `so-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SANITY TEST - Sales Order Module
 * Critical path testing for basic CRUD operations
 */
describe('Sales Order Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let adminUserId: string;
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
        fullName: 'Admin SO Smoke',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    adminUserId = adminUser.id;

    adminToken = `Bearer ${jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
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

  describe('SANITY-SO-01: CRUD Operations', () => {
    let orderId: string;

    it('should CREATE sales order', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.customerId).toBe(customerId);
      orderId = response.body.data.id;
    });

    it('should READ sales orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders')
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should READ single sales order', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sales-orders/${orderId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.id).toBe(orderId);
    });

    it('should UPDATE sales order', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/sales-orders/${orderId}`)
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
        })
        .expect(200);

      expect(response.body.id).toBe(orderId);
    });

    it('should CANCEL (DELETE) sales order', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${orderId}/cancel`)
        .set('Authorization', adminToken)
        .expect(201);

      expect(response.body.status).toBe('cancelled');
    });
  });

  describe('SANITY-SO-02: Submit Workflow', () => {
    it('should submit pending sales order', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
        })
        .expect(201);

      const soId = createResponse.body.data.id;

      const submitResponse = await request(app.getHttpServer())
        .post(`/sales-orders/${soId}/submit`)
        .set('Authorization', adminToken)
        .send({})
        .expect(201);

      expect(submitResponse.body.status).toBe('approved');
    });
  });

  describe('SANITY-SO-03: Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/sales-orders').expect(401);

      await request(app.getHttpServer())
        .post('/sales-orders')
        .send({ customerId: customerId })
        .expect(401);
    });
  });

  describe('SANITY-SO-04: Validation', () => {
    it('should reject invalid data', async () => {
      await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              productId: 'invalid-uuid',
              qty: -5,
            },
          ],
        })
        .expect(400);
    });

    it('should reject non-existent sales order', async () => {
      await request(app.getHttpServer())
        .get('/sales-orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });
  });
});
