import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

/**
 * SMOKE TEST - Sales Order Module
 * Critical path testing for basic CRUD operations
 */
describe('Sales Order Module - Smoke Tests', () => {
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

    await prisma.salesOrder.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.user.deleteMany({});

    const adminUser = await prisma.user.create({
      data: {
        username: 'admin-so-smoke',
        email: 'admin-so-smoke@test.com',
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
        code: 'SMOKE-CUSTOMER-001',
        name: 'Smoke Test Customer',
        contactInfo: JSON.stringify({ email: 'customer@test.com' }),
      },
    });

    customerId = customer.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('SMOKE-SO-01: CRUD Operations', () => {
    let orderId: string;

    it('should CREATE sales order', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.customerId).toBe(customerId);
      orderId = response.body.id;
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

      expect(response.body.id).toBe(orderId);
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

  describe('SMOKE-SO-02: Submit Workflow', () => {
    it('should submit pending sales order', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: customerId,
        })
        .expect(201);

      const orderId = createResponse.body.id;

      const submitResponse = await request(app.getHttpServer())
        .post(`/sales-orders/${orderId}/submit`)
        .set('Authorization', adminToken)
        .send({
          userId: adminUserId,
        })
        .expect(201);

      expect(submitResponse.body.status).toBe('approved');
    });
  });

  describe('SMOKE-SO-03: Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/sales-orders').expect(401);

      await request(app.getHttpServer())
        .post('/sales-orders')
        .send({ customerId: customerId })
        .expect(401);
    });
  });

  describe('SMOKE-SO-04: Validation', () => {
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
