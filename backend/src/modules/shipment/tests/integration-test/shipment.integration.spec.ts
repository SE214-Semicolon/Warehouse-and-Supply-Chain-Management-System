import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole, ShipmentStatus, OrderStatus } from '@prisma/client';

const TEST_SUITE_ID = `ship-e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Shipment Module - E2E Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let logisticsToken: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let adminToken: string;
  let warehouseId: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let locationId: string;
  let productId: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let productBatchId: string;
  let testCustomerId: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let salesOrderId: string;
  let shipmentId: string;

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

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        username: `admin-${TEST_SUITE_ID}`,
        email: `admin-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin User',
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

    // Create logistics user
    const logistics = await prisma.user.create({
      data: {
        username: `logistics-${TEST_SUITE_ID}`,
        email: `logistics-${TEST_SUITE_ID}@test.com`,
        fullName: 'Logistics User',
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

    // Create warehouse
    const warehouse = await prisma.warehouse.create({
      data: {
        code: `WH-${TEST_SUITE_ID}`,
        name: `Test Warehouse ${TEST_SUITE_ID}`,
        address: 'Test Address',
      },
    });
    warehouseId = warehouse.id;

    // Create location
    const location = await prisma.location.create({
      data: {
        code: `LOC-${TEST_SUITE_ID}`,
        name: `Test Location ${TEST_SUITE_ID}`,
        warehouseId: warehouse.id,
        capacity: 1000,
      },
    });
    locationId = location.id;

    // Create product category
    const category = await prisma.productCategory.create({
      data: {
        name: `Category ${TEST_SUITE_ID}`,
      },
    });

    // Create product
    const product = await prisma.product.create({
      data: {
        sku: `SKU-${TEST_SUITE_ID}`,
        name: `Product ${TEST_SUITE_ID}`,
        category: { connect: { id: category.id } },
        unit: 'PCS',
      },
    });
    productId = product.id;

    // Create product batch
    const productBatch = await prisma.productBatch.create({
      data: {
        batchNo: `BATCH-${TEST_SUITE_ID}`,
        productId: product.id,
        expiryDate: new Date('2026-12-31'),
      },
    });
    productBatchId = productBatch.id;

    // Create inventory
    await prisma.inventory.create({
      data: {
        productBatchId: productBatch.id,
        locationId: location.id,
        reservedQty: 0,
        availableQty: 100,
      },
    });

    // Create customer for sales order
    const customer = await prisma.customer.create({
      data: {
        code: `CUST-${TEST_SUITE_ID}`,
        name: 'Test Customer',
      },
    });
    testCustomerId = customer.id;

    // Create sales order
    const salesOrder = await prisma.salesOrder.create({
      data: {
        soNo: `SO-${TEST_SUITE_ID}`,
        customerId: customer.id,
        status: OrderStatus.pending,
        totalAmount: 1000,
        items: {
          create: [
            {
              productId: product.id,
              qty: 10,
              unitPrice: 100,
              lineTotal: 1000,
            },
          ],
        },
      },
    });
    salesOrderId = salesOrder.id;

    // Create a shipment directly in DB for testing
    const shipment = await prisma.shipment.create({
      data: {
        shipmentNo: `SHIP-${TEST_SUITE_ID}`,
        trackingCode: `TRACK-${TEST_SUITE_ID}`,
        warehouseId: warehouse.id,
        salesOrderId: salesOrder.id,
        carrier: 'DHL',
        status: ShipmentStatus.preparing,
        estimatedDelivery: new Date('2025-02-01'),
        items: {
          create: [
            {
              salesOrderId: salesOrder.id,
              productId: product.id,
              qty: 10,
            },
          ],
        },
      },
    });
    shipmentId = shipment.id;
  }, 60000);

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    // First delete all shipment items and shipments related to test sales orders
    await prisma.shipmentItem.deleteMany({
      where: { shipment: { salesOrder: { soNo: { contains: TEST_SUITE_ID } } } },
    });
    await prisma.shipment.deleteMany({
      where: { salesOrder: { soNo: { contains: TEST_SUITE_ID } } },
    });
    // Also delete by shipmentNo pattern
    await prisma.shipmentItem.deleteMany({
      where: { shipment: { shipmentNo: { contains: TEST_SUITE_ID } } },
    });
    await prisma.shipment.deleteMany({ where: { shipmentNo: { contains: TEST_SUITE_ID } } });
    await prisma.salesOrderItem.deleteMany({
      where: { salesOrder: { soNo: { contains: TEST_SUITE_ID } } },
    });
    await prisma.salesOrder.deleteMany({ where: { soNo: { contains: TEST_SUITE_ID } } });
    await prisma.inventory.deleteMany({
      where: { productBatch: { batchNo: { contains: TEST_SUITE_ID } } },
    });
    await prisma.productBatch.deleteMany({ where: { batchNo: { contains: TEST_SUITE_ID } } });
    await prisma.product.deleteMany({ where: { sku: { contains: TEST_SUITE_ID } } });
    await prisma.productCategory.deleteMany({ where: { name: { contains: TEST_SUITE_ID } } });
    await prisma.customer.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.location.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.warehouse.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('GET /shipments', () => {
    it('should get all shipments', async () => {
      const response = await request(app.getHttpServer())
        .get('/shipments')
        .set('Authorization', logisticsToken)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/shipments')
        .set('Authorization', logisticsToken)
        .query({ status: ShipmentStatus.preparing })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by carrier', async () => {
      const response = await request(app.getHttpServer())
        .get('/shipments')
        .set('Authorization', logisticsToken)
        .query({ carrier: 'DHL' })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /shipments/track/:trackingCode', () => {
    it('should track shipment by code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/shipments/track/TRACK-${TEST_SUITE_ID}`)
        .set('Authorization', logisticsToken)
        .expect(200);

      expect(response.body.trackingCode).toBe(`TRACK-${TEST_SUITE_ID}`);
    });

    it('should fail with invalid tracking code', async () => {
      await request(app.getHttpServer())
        .get('/shipments/track/INVALID-TRACKING-CODE-NOT-FOUND')
        .set('Authorization', logisticsToken)
        .expect(404);
    });
  });

  describe('GET /shipments/:id', () => {
    it('should get shipment by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/shipments/${shipmentId}`)
        .set('Authorization', logisticsToken)
        .expect(200);

      expect(response.body.id).toBe(shipmentId);
      expect(response.body.shipmentNo).toBe(`SHIP-${TEST_SUITE_ID}`);
    });

    it('should fail with non-existent ID', async () => {
      await request(app.getHttpServer())
        .get('/shipments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', logisticsToken)
        .expect(404);
    });
  });

  describe('POST /shipments', () => {
    it('should create a shipment with valid data', async () => {
      // Create another sales order for this test
      const newSalesOrder = await prisma.salesOrder.create({
        data: {
          soNo: `SO2-${TEST_SUITE_ID}`,
          customerId: testCustomerId,
          status: OrderStatus.pending,
          totalAmount: 500,
          items: {
            create: [
              {
                productId: productId,
                qty: 5,
                unitPrice: 100,
                lineTotal: 500,
              },
            ],
          },
        },
      });

      const response = await request(app.getHttpServer())
        .post('/shipments')
        .set('Authorization', logisticsToken)
        .send({
          salesOrderId: newSalesOrder.id,
          warehouseId: warehouseId,
          carrier: 'FedEx',
          trackingCode: `TRACK2-${TEST_SUITE_ID}`,
          estimatedDelivery: '2025-03-01',
          items: [
            {
              productId: productId,
              qty: 5,
            },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.carrier).toBe('FedEx');
    });

    it('should fail without required fields', async () => {
      await request(app.getHttpServer())
        .post('/shipments')
        .set('Authorization', logisticsToken)
        .send({
          carrier: 'DHL',
        })
        .expect(400);
    });

    it('should fail with invalid salesOrderId', async () => {
      await request(app.getHttpServer())
        .post('/shipments')
        .set('Authorization', logisticsToken)
        .send({
          salesOrderId: '00000000-0000-0000-0000-000000000000',
          warehouseId: warehouseId,
          items: [{ productId: productId, qty: 5 }],
        })
        .expect(404);
    });
  });

  describe('PATCH /shipments/:id', () => {
    it('should update shipment info when status is preparing', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/shipments/${shipmentId}`)
        .set('Authorization', logisticsToken)
        .send({ carrier: 'UPS', notes: 'Updated notes' })
        .expect(200);

      expect(response.body.carrier).toBe('UPS');
      expect(response.body.notes).toBe('Updated notes');
    });
  });

  describe('PATCH /shipments/:id/status', () => {
    it('should update shipment status from preparing to in_transit', async () => {
      // Create a new shipment for status tests
      const statusTestSalesOrder = await prisma.salesOrder.create({
        data: {
          soNo: `SO3-${TEST_SUITE_ID}`,
          customerId: testCustomerId,
          status: OrderStatus.pending,
          totalAmount: 500,
          items: {
            create: [
              {
                productId: productId,
                qty: 5,
                unitPrice: 100,
                lineTotal: 500,
              },
            ],
          },
        },
      });

      const newShipment = await prisma.shipment.create({
        data: {
          shipmentNo: `SHIP2-${TEST_SUITE_ID}`,
          warehouseId: warehouseId,
          salesOrderId: statusTestSalesOrder.id,
          carrier: 'DHL',
          status: ShipmentStatus.preparing,
          items: {
            create: [{ salesOrderId: statusTestSalesOrder.id, productId: productId, qty: 5 }],
          },
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/shipments/${newShipment.id}/status`)
        .set('Authorization', logisticsToken)
        .send({ status: ShipmentStatus.in_transit })
        .expect(200);

      expect(response.body.status).toBe(ShipmentStatus.in_transit);
    });

    it('should fail with invalid status transition', async () => {
      // Try to transition from preparing to delivered (invalid)
      const invalidTransitionSalesOrder = await prisma.salesOrder.create({
        data: {
          soNo: `SO4-${TEST_SUITE_ID}`,
          customerId: testCustomerId,
          status: OrderStatus.pending,
          totalAmount: 500,
          items: {
            create: [
              {
                productId: productId,
                qty: 5,
                unitPrice: 100,
                lineTotal: 500,
              },
            ],
          },
        },
      });

      const invalidShipment = await prisma.shipment.create({
        data: {
          shipmentNo: `SHIP3-${TEST_SUITE_ID}`,
          warehouseId: warehouseId,
          salesOrderId: invalidTransitionSalesOrder.id,
          carrier: 'DHL',
          status: ShipmentStatus.preparing,
          items: {
            create: [
              { salesOrderId: invalidTransitionSalesOrder.id, productId: productId, qty: 5 },
            ],
          },
        },
      });

      await request(app.getHttpServer())
        .patch(`/shipments/${invalidShipment.id}/status`)
        .set('Authorization', logisticsToken)
        .send({ status: ShipmentStatus.delivered })
        .expect(400);
    });
  });

  describe('POST /shipments/:id/tracking-events', () => {
    it('should add tracking event to shipment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/shipments/${shipmentId}/tracking-events`)
        .set('Authorization', logisticsToken)
        .send({
          eventTime: new Date().toISOString(),
          statusText: 'Package picked up',
          location: 'Distribution Center',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });
  });

  describe('INTEGRATION-SHIP-01: List and Query', () => {
    it('should list shipments with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/shipments')
        .set('Authorization', logisticsToken)
        .query({ page: 1, pageSize: 10 })
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(10);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should return shipment details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/shipments/${shipmentId}`)
        .set('Authorization', logisticsToken)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('shipmentNo');
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('INTEGRATION-SHIP-02: Tracking', () => {
    it('should track shipment by tracking code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/shipments/track/TRACK-${TEST_SUITE_ID}`)
        .set('Authorization', logisticsToken)
        .expect(200);

      expect(response.body.trackingCode).toBe(`TRACK-${TEST_SUITE_ID}`);
    });
  });

  describe('INTEGRATION-SHIP-03: Authorization', () => {
    it('should allow logistics role access', async () => {
      await request(app.getHttpServer())
        .get('/shipments')
        .set('Authorization', logisticsToken)
        .expect(200);
    });

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer()).get('/shipments').expect(401);
    });
  });
});
