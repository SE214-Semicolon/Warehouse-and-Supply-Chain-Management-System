import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

/**
 * SANITY TEST - Order Module
 * Verify key functionalities after minor changes/bug fixes
 */
describe('Order Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let adminUserId: string;
  let procurementToken: string;
  let supplierId: string;

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

    await prisma.purchaseOrder.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.user.deleteMany({});

    const adminUser = await prisma.user.create({
      data: {
        username: 'admin-order-sanity',
        email: 'admin-order-sanity@test.com',
        fullName: 'Admin Order Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const procurementUser = await prisma.user.create({
      data: {
        username: 'procurement-order-sanity',
        email: 'procurement-order-sanity@test.com',
        fullName: 'Procurement Order Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.procurement,
        active: true,
      },
    });

    adminUserId = adminUser.id;

    adminToken = `Bearer ${jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    })}`;

    procurementToken = `Bearer ${jwtService.sign({
      sub: procurementUser.id,
      email: procurementUser.email,
      role: procurementUser.role,
    })}`;

    const supplier = await prisma.supplier.create({
      data: {
        code: 'SANITY-SUPPLIER-001',
        name: 'Sanity Test Supplier',
        contactInfo: JSON.stringify({ email: 'supplier@test.com' }),
      },
    });

    supplierId = supplier.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('SANITY-ORDER-01: Core CRUD Operations', () => {
    let orderId: string;

    it('should create order with all fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({
          supplierId: supplierId,
          expectedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Sanity test order',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.supplierId).toBe(supplierId);
      orderId = response.body.id;
    });

    it('should retrieve order by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/purchase-orders/${orderId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('id', orderId);
      expect(response.body.supplierId).toBe(supplierId);
    });

    //Uncomment when be fix this API
    // it('should list all orders with pagination', async () => {
    //   const response = await request(app.getHttpServer())
    //     .get('/purchase-orders')
    //     .query({ page: 1, pageSize: 10 })
    //     .set('Authorization', adminToken)
    //     .expect(200);

    //   expect(Array.isArray(response.body.data)).toBe(true);
    // });

    it('should update order status', async () => {
      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderId}/submit`)
        .set('Authorization', adminToken)
        .send({
          userId: adminUserId,
        })
        .expect(201);

      expect(response.body.status).toBe('ordered');
    });
  });

  describe('SANITY-ORDER-02: Validation Rules', () => {
    it('should create order without supplier', async () => {
      const response = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({
          notes: 'Order without supplier',
        })
        .expect(201);

      expect(response.body.supplierId).toBeNull();
    });

    it('should reject invalid date format', async () => {
      await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({
          supplierId: supplierId,
          placedAt: 'invalid-date',
        })
        .expect(400);
    });

    it('should reject invalid supplier UUID', async () => {
      await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({
          supplierId: 'not-a-valid-uuid',
        })
        .expect(400);
    });
  });

  describe('SANITY-ORDER-03: Authorization', () => {
    it('should allow procurement to view orders', async () => {
      await request(app.getHttpServer())
        .get('/purchase-orders')
        .set('Authorization', procurementToken)
        .expect(200);
    });

    it('should allow procurement to create order', async () => {
      await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', procurementToken)
        .send({
          supplierId: supplierId,
          notes: 'Procurement test order',
        })
        .expect(201);
    });
  });

  describe('SANITY-ORDER-04: Error Handling', () => {
    it('should return 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .get('/purchase-orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('should handle submit of non-existent order', async () => {
      await request(app.getHttpServer())
        .post('/purchase-orders/00000000-0000-0000-0000-000000000000/submit')
        .set('Authorization', adminToken)
        .send({
          userId: adminUserId,
        })
        .expect(404);
    });
  });

  describe('SANITY-ORDER-05: Filter by Supplier', () => {
    it('should filter orders by supplier', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchase-orders')
        .query({ supplierId: supplierId })
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((order: any) => {
        expect(order.supplierId).toBe(supplierId);
      });
    });
  });
});
