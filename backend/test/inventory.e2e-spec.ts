import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { UserRole } from '@prisma/client';

describe('Inventory Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let testUser: any;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    authService = moduleFixture.get<AuthService>(AuthService);

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Clean up database before each test - order matters due to foreign key constraints
    // Delete in reverse dependency order (children first, parents last)

    // Delete dependent records first
    await prisma.stockMovement.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.productBatch.deleteMany();
    await prisma.product.deleteMany();
    await prisma.location.deleteMany();
    await prisma.warehouse.deleteMany();

    // Delete auth-related records
    await prisma.refreshToken.deleteMany();

    // Delete order-related records
    await prisma.purchaseOrderItem.deleteMany();
    await prisma.salesOrderItem.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.salesOrder.deleteMany();

    // Delete shipment-related records
    await prisma.shipmentTrackingEvent.deleteMany();
    await prisma.shipmentItem.deleteMany();
    await prisma.shipment.deleteMany();

    // Delete base entities
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.user.deleteMany();

    // Delete remaining entities
    await prisma.productCategory.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.alert.deleteMany();

    // Create test user and generate JWT token
    const tokens = await authService.signup('test@example.com', 'password123', 'Test User');
    accessToken = tokens.accessToken;
    testUser = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
  });

  describe('POST /inventory/adjust', () => {
    it('should adjust inventory successfully', async () => {
      // Debug logging for type validation
      console.log('App type:', typeof app);
      console.log('App constructor:', app.constructor.name);
      console.log('HttpServer type:', typeof app.getHttpServer());
      console.log('HttpServer constructor:', app.getHttpServer().constructor?.name || 'unknown');

      // Create test data
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH001', name: 'Test Warehouse' },
      });

      const location = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'LOC001',
          name: 'Test Location',
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'PROD001',
          name: 'Test Product',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH001',
          quantity: 100,
        },
      });

      const user = await prisma.user.create({
        data: {
          username: 'testuser_adjust',
          email: 'test_adjust@example.com',
          role: 'warehouse_staff',
        },
      });

      const adjustPayload = {
        productBatchId: productBatch.id,
        locationId: location.id,
        adjustmentQuantity: 5,
        createdById: user.id,
        idempotencyKey: 'adjust-001',
        reason: 'count_error',
        note: 'Found extra items during count',
      };

      const response = await request(app.getHttpServer() as any)
        .post('/inventory/adjust')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(adjustPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory.availableQty).toBe(5);
      expect(response.body.movement.movementType).toBe('adjustment');
      expect(response.body.movement.quantity).toBe(5);

      // Test idempotency - same request should return existing movement
      console.log('First movement ID:', response.body.movement.id);
      console.log('Idempotency key used:', adjustPayload.idempotencyKey);

      // Check if movement exists in database before second request
      const existingMovement = await prisma.stockMovement.findUnique({
        where: { idempotencyKey: adjustPayload.idempotencyKey },
      });
      console.log('Movement in DB before second request:', existingMovement?.id);

      const response2 = await request(app.getHttpServer() as any)
        .post('/inventory/adjust')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(adjustPayload);

      console.log('Second response status:', response2.status);
      console.log('Second response body:', response2.body);

      // Verify idempotency is working correctly
      expect(response2.body.success).toBe(true);
      expect(response2.body.idempotent).toBe(true);
      expect(response2.body.movement.id).toBe(response.body.movement.id);
      expect([200, 201]).toContain(response2.status); // Accept both 200 and 201 for idempotent response
    });

    it('should handle negative adjustment', async () => {
      // Create test data with initial inventory
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH002', name: 'Test Warehouse 2' },
      });

      const location = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'LOC002',
          name: 'Test Location 2',
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'PROD002',
          name: 'Test Product 2',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH002',
          quantity: 100,
        },
      });

      // Create initial inventory
      await prisma.inventory.create({
        data: {
          productBatchId: productBatch.id,
          locationId: location.id,
          availableQty: 10,
          reservedQty: 0,
        },
      });

      const adjustPayload = {
        productBatchId: productBatch.id,
        locationId: location.id,
        adjustmentQuantity: -3,
        idempotencyKey: 'adjust-negative-001',
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(adjustPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory.availableQty).toBe(7);
      expect(response.body.movement.quantity).toBe(-3);
    });

    it('should return 400 for zero adjustment quantity', async () => {
      const adjustPayload = {
        productBatchId: 'invalid-id',
        locationId: 'invalid-id',
        adjustmentQuantity: 0,
        idempotencyKey: 'adjust-zero-001',
      };

      await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(adjustPayload)
        .expect(400);
    });
  });

  describe('POST /inventory/transfer', () => {
    it('should transfer inventory successfully', async () => {
      // Create test data
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH003', name: 'Test Warehouse 3' },
      });

      const fromLocation = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'FROM001',
          name: 'From Location',
        },
      });

      const toLocation = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'TO001',
          name: 'To Location',
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'PROD003',
          name: 'Test Product 3',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH003',
          quantity: 100,
        },
      });

      // Create initial inventory at source
      await prisma.inventory.create({
        data: {
          productBatchId: productBatch.id,
          locationId: fromLocation.id,
          availableQty: 20,
          reservedQty: 0,
        },
      });

      const transferPayload = {
        productBatchId: productBatch.id,
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        quantity: 10,
        idempotencyKey: 'transfer-001',
        note: 'Moving to different section',
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(transferPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.fromInventory.availableQty).toBe(10);
      expect(response.body.toInventory.availableQty).toBe(10);
      expect(response.body.transferOutMovement.movementType).toBe('transfer_out');
      expect(response.body.transferInMovement.movementType).toBe('transfer_in');
      expect(response.body.transferOutMovement.quantity).toBe(10);
      expect(response.body.transferInMovement.quantity).toBe(10);

      // Test idempotency
      const response2 = await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(transferPayload);

      expect(response2.body.success).toBe(true);
      expect(response2.body.idempotent).toBe(true);
      expect([200, 201]).toContain(response2.status); // Accept both 200 and 201 for idempotent response
    });

    it('should return 400 for same source and destination', async () => {
      const transferPayload = {
        productBatchId: 'invalid-id',
        fromLocationId: 'loc1',
        toLocationId: 'loc1', // Same location
        quantity: 10,
        idempotencyKey: 'transfer-same-001',
      };

      await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(transferPayload)
        .expect(400);
    });

    it('should return 400 for insufficient stock', async () => {
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH004', name: 'Test Warehouse 4' },
      });

      const fromLocation = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'FROM002',
          name: 'From Location 2',
        },
      });

      const toLocation = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'TO002',
          name: 'To Location 2',
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'PROD004',
          name: 'Test Product 4',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH004',
          quantity: 100,
        },
      });

      // Create inventory with only 5 items
      await prisma.inventory.create({
        data: {
          productBatchId: productBatch.id,
          locationId: fromLocation.id,
          availableQty: 5,
          reservedQty: 0,
        },
      });

      const transferPayload = {
        productBatchId: productBatch.id,
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        quantity: 10, // More than available
        idempotencyKey: 'transfer-insufficient-001',
      };

      await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(transferPayload)
        .expect(400);
    });
  });

  describe('POST /inventory/receive', () => {
    it('should receive inventory successfully', async () => {
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH005', name: 'Test Warehouse 5' },
      });

      const location = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'LOC005',
          name: 'Test Location 5',
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'PROD005',
          name: 'Test Product 5',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH005',
          quantity: 100,
        },
      });

      const receivePayload = {
        productBatchId: productBatch.id,
        locationId: location.id,
        quantity: 50,
        idempotencyKey: 'receive-001',
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(receivePayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory.availableQty).toBe(50);
      expect(response.body.movement.movementType).toBe('purchase_receipt');
      expect(response.body.movement.quantity).toBe(50);
    });
  });

  describe('POST /inventory/dispatch', () => {
    it('should dispatch inventory successfully', async () => {
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH006', name: 'Test Warehouse 6' },
      });

      const location = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'LOC006',
          name: 'Test Location 6',
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'PROD006',
          name: 'Test Product 6',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH006',
          quantity: 100,
        },
      });

      // Create initial inventory
      await prisma.inventory.create({
        data: {
          productBatchId: productBatch.id,
          locationId: location.id,
          availableQty: 30,
          reservedQty: 0,
        },
      });

      const dispatchPayload = {
        productBatchId: productBatch.id,
        locationId: location.id,
        quantity: 10,
        idempotencyKey: 'dispatch-001',
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(dispatchPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory.availableQty).toBe(20);
      expect(response.body.movement.movementType).toBe('sale_issue');
      expect(response.body.movement.quantity).toBe(10);
    });
  });

  describe('POST /inventory/reserve', () => {
    it('should reserve inventory successfully', async () => {
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH007', name: 'Test Warehouse 7' },
      });

      const location = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'LOC007',
          name: 'Test Location 7',
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'PROD007',
          name: 'Test Product 7',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH007',
          quantity: 100,
        },
      });

      // Create initial inventory
      await prisma.inventory.create({
        data: {
          productBatchId: productBatch.id,
          locationId: location.id,
          availableQty: 20,
          reservedQty: 0,
        },
      });

      const reservePayload = {
        productBatchId: productBatch.id,
        locationId: location.id,
        quantity: 5,
        orderId: 'order-001',
        idempotencyKey: 'reserve-001',
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(reservePayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory.availableQty).toBe(15);
      expect(response.body.inventory.reservedQty).toBe(5);
      expect(response.body.movement.movementType).toBe('reservation');
      expect(response.body.movement.quantity).toBe(5);
    });
  });

  describe('POST /inventory/release', () => {
    it('should release reservation successfully', async () => {
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH008', name: 'Test Warehouse 8' },
      });

      const location = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'LOC008',
          name: 'Test Location 8',
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'PROD008',
          name: 'Test Product 8',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH008',
          quantity: 100,
        },
      });

      // Create initial inventory with reserved stock
      await prisma.inventory.create({
        data: {
          productBatchId: productBatch.id,
          locationId: location.id,
          availableQty: 10,
          reservedQty: 5,
        },
      });

      const releasePayload = {
        productBatchId: productBatch.id,
        locationId: location.id,
        orderId: 'order-001',
        quantity: 3,
        idempotencyKey: 'release-001',
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/release')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(releasePayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory.availableQty).toBe(13);
      expect(response.body.inventory.reservedQty).toBe(2);
      expect(response.body.movement.movementType).toBe('sale_issue');
      expect(response.body.movement.quantity).toBe(3);
    });
  });

  describe('PUT /inventory/:productBatchId/location/:locationId/update-quantity', () => {
    it('should update inventory quantities successfully', async () => {
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH009', name: 'Test Warehouse 9' },
      });

      const location = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'LOC009',
          name: 'Test Location 9',
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'PROD009',
          name: 'Test Product 9',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH009',
          quantity: 100,
        },
      });

      // Create initial inventory
      await prisma.inventory.create({
        data: {
          productBatchId: productBatch.id,
          locationId: location.id,
          availableQty: 10,
          reservedQty: 2,
        },
      });

      const updatePayload = {
        availableQty: 25,
        reservedQty: 5,
        reason: 'manual_count',
        note: 'Updated after physical count',
      };

      const response = await request(app.getHttpServer())
        .post(`/${productBatch.id}/${location.id}/update-quantity`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatePayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory.availableQty).toBe(25);
      expect(response.body.inventory.reservedQty).toBe(5);
      expect(response.body.message).toBe('Inventory quantity updated successfully');
    });
  });

  describe('DELETE /inventory/:productBatchId/location/:locationId', () => {
    it('should soft delete inventory successfully', async () => {
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH010', name: 'Test Warehouse 10' },
      });

      const location = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'LOC010',
          name: 'Test Location 10',
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'PROD010',
          name: 'Test Product 10',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH010',
          quantity: 100,
        },
      });

      // Create initial inventory
      await prisma.inventory.create({
        data: {
          productBatchId: productBatch.id,
          locationId: location.id,
          availableQty: 15,
          reservedQty: 3,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/${productBatch.id}/${location.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory.availableQty).toBe(0);
      expect(response.body.inventory.reservedQty).toBe(0);
      expect(response.body.message).toBe('Inventory soft deleted successfully');
    });
  });

  describe('GET /inventory/alerts/low-stock', () => {
    it('should return low stock alerts', async () => {
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH011', name: 'Test Warehouse 11' },
      });

      const location = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'LOC011',
          name: 'Test Location 11',
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'PROD011',
          name: 'Test Product 11',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH011',
          quantity: 100,
        },
      });

      // Create low stock inventory
      await prisma.inventory.create({
        data: {
          productBatchId: productBatch.id,
          locationId: location.id,
          availableQty: 5, // Below default threshold of 10
          reservedQty: 0,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/inventory/alerts/low-stock?threshold=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inventories).toBeDefined();
      expect(response.body.total).toBeGreaterThan(0);
    });
  });

  describe('GET /inventory/alerts/expiry', () => {
    it('should return expiry alerts', async () => {
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH012', name: 'Test Warehouse 12' },
      });

      const location = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'LOC012',
          name: 'Test Location 12',
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'PROD012',
          name: 'Test Product 12',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH012',
          quantity: 100,
          expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        },
      });

      await prisma.inventory.create({
        data: {
          productBatchId: productBatch.id,
          locationId: location.id,
          availableQty: 10,
          reservedQty: 0,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/inventory/alerts/expiry?threshold=30')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inventories).toBeDefined();
    });
  });

  describe('GET /inventory/reports/stock-levels', () => {
    it('should return stock level report', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/reports/stock-levels')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.groupedData).toBeDefined();
      expect(response.body.total).toBeDefined();
    });
  });

  describe('GET /inventory/reports/movements', () => {
    it('should return movement report', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/reports/movements')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.movements).toBeDefined();
      expect(response.body.total).toBeDefined();
    });
  });

  describe('GET /inventory/reports/valuation', () => {
    it('should return valuation report', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/reports/valuation')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valuationData).toBeDefined();
      expect(response.body.grandTotal).toBeDefined();
    });
  });

  describe('GET /inventory/location', () => {
    it('should return inventory by location', async () => {
      const warehouse = await prisma.warehouse.create({
        data: { code: 'WH013', name: 'Test Warehouse 13' },
      });

      const location = await prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          code: 'LOC013',
          name: 'Test Location 13',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${location.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inventories).toBeDefined();
      expect(response.body.total).toBeDefined();
    });
  });

  describe('GET /inventory/product-batch', () => {
    it('should return inventory by product batch', async () => {
      const product = await prisma.product.create({
        data: {
          sku: 'PROD014',
          name: 'Test Product 14',
          unit: 'pcs',
        },
      });

      const productBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: 'BATCH014',
          quantity: 100,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/inventory/product-batch?productBatchId=${productBatch.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inventories).toBeDefined();
      expect(response.body.total).toBeDefined();
    });
  });
});
