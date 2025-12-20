import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `ship-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Shipment Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let logisticsToken: string;
  let adminToken: string;

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

    const admin = await prisma.user.create({
      data: {
        username: `admin-sanity-${TEST_SUITE_ID}`,
        email: `admin-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    adminToken = `Bearer ${jwtService.sign({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    })}`;

    const logistics = await prisma.user.create({
      data: {
        username: `logistics-sanity-${TEST_SUITE_ID}`,
        email: `logistics-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Logistics Smoke',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.logistics,
        active: true,
      },
    });

    logisticsToken = `Bearer ${jwtService.sign({
      sub: logistics.id,
      email: logistics.email,
      role: logistics.role,
    })}`;
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-SHIP-01: Basic Shipment Workflow', () => {
    let shipmentId: string;
    let salesOrderId: string;
    let warehouseId: string;
    let productId: string;

    beforeAll(async () => {
      // Create product
      const prodRes = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send({
          sku: `SKU-SHIP-${TEST_SUITE_ID}`,
          name: `Product-${TEST_SUITE_ID}`,
          unit: 'pcs',
        })
        .expect(201);
      productId = prodRes.body.data?.id || prodRes.body.id;

      // Create warehouse (admin required)
      const whRes = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send({ name: `WH-${TEST_SUITE_ID}`, code: `WH-${TEST_SUITE_ID}` })
        .expect(201);
      warehouseId = whRes.body.data ? whRes.body.data.id : whRes.body.id;

      // Create location for the warehouse
      const locRes = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          warehouseId,
          name: `LOC-${TEST_SUITE_ID}`,
          code: `L-${TEST_SUITE_ID}`,
          type: 'storage',
        })
        .expect(201);
      const locationId = locRes.body.data ? locRes.body.data.id : locRes.body.id;

      // Create product batch
      const batchRes = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send({
          productId,
          batchNo: `BATCH-${TEST_SUITE_ID}`,
          quantity: 1000,
        })
        .expect(201);
      const productBatchId = batchRes.body.data ? batchRes.body.data.id : batchRes.body.id;

      // Add inventory for the product
      await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId,
          locationId,
          quantity: 100,
          idempotencyKey: `ship-inv-${TEST_SUITE_ID}`,
        })
        .expect(201);

      // Create customer (admin required)
      const custRes = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', adminToken)
        .send({ name: `CUST-${TEST_SUITE_ID}`, code: `C-${TEST_SUITE_ID}` })
        .expect(201);

      // Create sales order
      const soRes = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({ customerId: custRes.body.id || custRes.body.data.id })
        .expect(201);
      salesOrderId = soRes.body.data.id;
    });

    it('should CREATE a shipment', async () => {
      const response = await request(app.getHttpServer())
        .post('/shipments')
        .set('Authorization', logisticsToken)
        .send({
          salesOrderId,
          warehouseId,
          carrier: 'Test Carrier',
          trackingCode: `TRACK-${TEST_SUITE_ID}`,
          items: [{ productId: productId, qty: 5 }],
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.trackingCode).toBe(`TRACK-${TEST_SUITE_ID}`);
      shipmentId = response.body.id;
    });

    it('should READ shipments', async () => {
      const response = await request(app.getHttpServer())
        .get('/shipments')
        .set('Authorization', logisticsToken)
        .expect(200);

      const shipments = response.body.shipments || response.body.data || response.body;
      expect(Array.isArray(shipments)).toBe(true);
    });

    it('should UPDATE shipment status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/shipments/${shipmentId}/status`)
        .set('Authorization', logisticsToken)
        .send({
          status: 'in_transit',
        })
        .expect(200);

      expect(response.body.status).toBe('in_transit');
    });
  });
});
