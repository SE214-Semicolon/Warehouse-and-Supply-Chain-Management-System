import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { InventoryModule } from 'src/modules/inventory/inventory.module';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/modules/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { ProductModule } from 'src/modules/product/product.module';
jest.setTimeout(180000);

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `inv-int-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Inventory Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let managerToken: string;
  let _staffToken: string;
  let testProductBatchId: string;
  let testLocationId: string;
  let testWarehouseId: string;
  let testProductId: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
          ignoreEnvFile: false,
        }),
        DatabaseModule,
        AuthModule,
        ProductModule,
        InventoryModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Clean database
    await cleanDatabase();

    // Create test users
    const adminUser = await prisma.user.create({
      data: {
        username: `admin-inventory-test-${TEST_SUITE_ID}`,
        email: `admin-inventory-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Inventory Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-inventory-test-${TEST_SUITE_ID}`,
        email: `manager-inventory-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager Inventory Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    const staffUser = await prisma.user.create({
      data: {
        username: `staff-inventory-test-${TEST_SUITE_ID}`,
        email: `staff-inventory-${TEST_SUITE_ID}@test.com`,
        fullName: 'Staff Inventory Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.warehouse_staff,
        active: true,
      },
    });

    // Generate JWT tokens
    adminToken = `Bearer ${jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: adminUser.role })}`;
    managerToken = `Bearer ${jwtService.sign({ sub: managerUser.id, email: managerUser.email, role: managerUser.role })}`;
    _staffToken = `Bearer ${jwtService.sign({ sub: staffUser.id, email: staffUser.email, role: staffUser.role })}`;

    testUserId = adminUser.id;

    // Create test warehouse
    const warehouse = await prisma.warehouse.create({
      data: {
        code: `WH-INV-${TEST_SUITE_ID}`,
        name: `Test Warehouse for Inventory ${TEST_SUITE_ID}`,
      },
    });
    testWarehouseId = warehouse.id;

    // Create test location
    const location = await prisma.location.create({
      data: {
        warehouseId: testWarehouseId,
        code: `LOC-INV-${TEST_SUITE_ID}`,
        name: `Test Location for Inventory ${TEST_SUITE_ID}`,
      },
    });
    testLocationId = location.id;

    // Create test product category
    const category = await prisma.productCategory.create({
      data: {
        name: `INV-Test-Category-${TEST_SUITE_ID}`,
      },
    });

    // Create test product
    const product = await prisma.product.create({
      data: {
        sku: `SKU-INV-${TEST_SUITE_ID}`,
        name: `Test Product for Inventory ${TEST_SUITE_ID}`,
        unit: 'pcs',
        categoryId: category.id,
      },
    });
    testProductId = product.id;

    // Create test product batch
    const batch = await prisma.productBatch.create({
      data: {
        productId: testProductId,
        batchNo: `BATCH-INV-${TEST_SUITE_ID}`,
        quantity: 1000,
      },
    });
    testProductBatchId = batch.id;
  }, 180000);

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  async function cleanDatabase() {
    if (!prisma) return;

    await prisma.stockMovement.deleteMany({
      where: { productBatch: { product: { sku: { contains: TEST_SUITE_ID } } } },
    });
    await prisma.inventory.deleteMany({
      where: { location: { warehouse: { code: { contains: TEST_SUITE_ID } } } },
    });
    await prisma.productBatch.deleteMany({
      where: { product: { sku: { contains: TEST_SUITE_ID } } },
    });
    await prisma.product.deleteMany({ where: { sku: { contains: TEST_SUITE_ID } } });
    await prisma.productCategory.deleteMany({ where: { name: { contains: TEST_SUITE_ID } } });
    await prisma.location.deleteMany({
      where: { warehouse: { code: { contains: TEST_SUITE_ID } } },
    });
    await prisma.warehouse.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
  }

  describe('POST /inventory/receive - Receive Inventory', () => {
    // INV-INT-01: Receive with valid data
    it('INV-INT-01: Should receive inventory with valid data', async () => {
      const receiveDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 100,
        createdById: testUserId,
        idempotencyKey: `idem-receive-1-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory).toBeDefined();
      expect(response.body.movement).toBeDefined();
      expect(response.body.inventory.availableQty).toBeGreaterThanOrEqual(100);
    });

    // INV-INT-02: Product batch not found
    it('INV-INT-02: Should return 404 if product batch not found', async () => {
      const receiveDto = {
        productBatchId: '00000000-0000-0000-0000-000000000000',
        locationId: testLocationId,
        quantity: 100,
        idempotencyKey: `idem-receive-2-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(404);

      expect(response.body.message).toContain('ProductBatch not found');
    });

    // INV-INT-03: Location not found
    it('INV-INT-03: Should return 404 if location not found', async () => {
      const receiveDto = {
        productBatchId: testProductBatchId,
        locationId: '00000000-0000-0000-0000-000000000000',
        quantity: 100,
        idempotencyKey: `idem-receive-3-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(404);

      expect(response.body.message).toContain('Location not found');
    });

    // INV-INT-04: User not found
    it('INV-INT-04: Should return 404 if user not found', async () => {
      const receiveDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 100,
        createdById: '00000000-0000-0000-0000-000000000000',
        idempotencyKey: `idem-receive-4-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(404);

      expect(response.body.message).toContain('User not found');
    });

    // INV-INT-05: Idempotency key reuse
    it('INV-INT-05: Should return existing movement if idempotency key already used', async () => {
      const idempotencyKey = `idem-receive-5-${Date.now()}`;
      const receiveDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 50,
        createdById: testUserId,
        idempotencyKey: idempotencyKey,
      };

      // First receive
      await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      // Second receive with same idempotency key
      const response = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.idempotent).toBe(true);
      expect(response.body.movement).toBeDefined();
    });

    // INV-INT-06: Missing required fields
    it('INV-INT-06: Should return 400 for missing required fields', async () => {
      const receiveDto = {
        locationId: testLocationId,
        quantity: 100,
      };

      await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);
    });

    // INV-INT-07: No authentication
    it('INV-INT-07: Should return 401 without authentication', async () => {
      const receiveDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 100,
        idempotencyKey: `idem-receive-7-${Date.now()}`,
      };

      await request(app.getHttpServer()).post('/inventory/receive').send(receiveDto).expect(401);
    });

    // INV-INT-08: Receive with very large quantity
    it('INV-INT-08: Should receive inventory with very large quantity', async () => {
      const receiveDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 999999999,
        createdById: testUserId,
        idempotencyKey: `idem-receive-8-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    // INV-INT-09: Receive without createdById
    it('INV-INT-09: Should receive inventory without createdById', async () => {
      const receiveDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 100,
        idempotencyKey: `idem-receive-9-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /inventory/dispatch - Dispatch Inventory', () => {
    beforeEach(async () => {
      // Ensure inventory exists for dispatch tests
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: {
          availableQty: 500,
          reservedQty: 0,
        },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 500,
          reservedQty: 0,
        },
      });
    });

    // INV-INT-10: Dispatch with valid data
    it('INV-INT-10: Should dispatch inventory with valid data', async () => {
      const dispatchDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 50,
        createdById: testUserId,
        idempotencyKey: `idem-dispatch-1-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send(dispatchDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory).toBeDefined();
      expect(response.body.movement).toBeDefined();
    });

    // INV-INT-11: Product batch not found
    it('INV-INT-11: Should return 404 if product batch not found', async () => {
      const dispatchDto = {
        productBatchId: '00000000-0000-0000-0000-000000000000',
        locationId: testLocationId,
        quantity: 50,
        idempotencyKey: `idem-dispatch-2-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send(dispatchDto)
        .expect(404);

      expect(response.body.message).toContain('ProductBatch not found');
    });

    // INV-INT-12: Location not found
    it('INV-INT-12: Should return 404 if location not found', async () => {
      const dispatchDto = {
        productBatchId: testProductBatchId,
        locationId: '00000000-0000-0000-0000-000000000000',
        quantity: 50,
        idempotencyKey: `idem-dispatch-3-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send(dispatchDto)
        .expect(404);

      expect(response.body.message).toContain('Location not found');
    });

    // INV-INT-13: User not found
    it('INV-INT-13: Should return 404 if user not found', async () => {
      const dispatchDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 50,
        createdById: '00000000-0000-0000-0000-000000000000',
        idempotencyKey: `idem-dispatch-4-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send(dispatchDto)
        .expect(404);

      expect(response.body.message).toContain('User not found');
    });

    // INV-INT-14: Not enough stock
    it('INV-INT-14: Should return 400 if not enough stock', async () => {
      const dispatchDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 999999,
        createdById: testUserId,
        idempotencyKey: `idem-dispatch-5-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send(dispatchDto)
        .expect(400);

      expect(response.body.message).toContain('Not enough stock');
    });

    // INV-INT-15: Idempotency key reuse
    it('INV-INT-15: Should return existing movement if idempotency key already used', async () => {
      const idempotencyKey = `idem-dispatch-6-${Date.now()}`;
      const dispatchDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 20,
        createdById: testUserId,
        idempotencyKey: idempotencyKey,
      };

      // First dispatch
      await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send(dispatchDto)
        .expect(201);

      // Second dispatch with same idempotency key
      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send(dispatchDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.idempotent).toBe(true);
    });

    // INV-INT-16: Dispatch exact available quantity
    it('INV-INT-16: Should dispatch all available inventory', async () => {
      // Get current inventory
      const currentInventory = await prisma.inventory.findUnique({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
      });

      const dispatchDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: currentInventory!.availableQty,
        createdById: testUserId,
        idempotencyKey: `idem-dispatch-7-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send(dispatchDto)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    // INV-INT-17: Dispatch minimal quantity of 1
    it('INV-INT-17: Should dispatch minimal quantity of 1', async () => {
      // First receive to ensure stock
      await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 10,
          idempotencyKey: `idem-pre-dispatch-${Date.now()}`,
        });

      const dispatchDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 1,
        createdById: testUserId,
        idempotencyKey: `idem-dispatch-8-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send(dispatchDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.movement.quantity).toBe(1);
    });
  });

  describe('POST /inventory/adjust - Adjust Inventory', () => {
    beforeEach(async () => {
      // Ensure inventory exists for adjust tests
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: {
          availableQty: 100,
          reservedQty: 0,
        },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 100,
          reservedQty: 0,
        },
      });
    });

    // INV-INT-18: Adjust with positive quantity
    it('INV-INT-18: Should adjust inventory with positive quantity', async () => {
      const adjustDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        adjustmentQuantity: 50,
        reason: 'count_error',
        createdById: testUserId,
        idempotencyKey: `idem-adjust-1-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send(adjustDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory).toBeDefined();
    });

    // INV-INT-19: Adjust with negative quantity
    it('INV-INT-19: Should adjust inventory with negative quantity', async () => {
      const adjustDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        adjustmentQuantity: -30,
        reason: 'damage',
        createdById: testUserId,
        idempotencyKey: `idem-adjust-2-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send(adjustDto)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    // INV-INT-20: Product batch not found
    it('INV-INT-20: Should return 404 if product batch not found', async () => {
      const adjustDto = {
        productBatchId: '00000000-0000-0000-0000-000000000000',
        locationId: testLocationId,
        adjustmentQuantity: 50,
        reason: 'count_error',
        idempotencyKey: `idem-adjust-3-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send(adjustDto)
        .expect(404);

      expect(response.body.message).toContain('ProductBatch not found');
    });

    // INV-INT-21: Zero adjustment quantity
    it('INV-INT-21: Should return 400 if adjustment quantity is zero', async () => {
      const adjustDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        adjustmentQuantity: 0,
        reason: 'count_error',
        idempotencyKey: `idem-adjust-4-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send(adjustDto)
        .expect(400);

      expect(response.body.message).toContain('must not be zero');
    });

    // INV-INT-22: Idempotency key reuse
    it('INV-INT-22: Should return existing movement if idempotency key already used', async () => {
      const idempotencyKey = `idem-adjust-5-${Date.now()}`;
      const adjustDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        adjustmentQuantity: 25,
        reason: 'count_error',
        createdById: testUserId,
        idempotencyKey: idempotencyKey,
      };

      // First adjust
      await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send(adjustDto)
        .expect(201);

      // Second adjust with same idempotency key
      const response = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send(adjustDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.idempotent).toBe(true);
    });

    // INV-INT-23: Adjust by 1
    it('INV-INT-23: Should adjust inventory by 1', async () => {
      const adjustDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        adjustmentQuantity: 1,
        reason: 'count_error',
        createdById: testUserId,
        idempotencyKey: `idem-adjust-6-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send(adjustDto)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    // INV-INT-24: Adjust by -1
    it('INV-INT-24: Should adjust inventory by -1', async () => {
      const adjustDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        adjustmentQuantity: -1,
        reason: 'damage',
        createdById: testUserId,
        idempotencyKey: `idem-adjust-7-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send(adjustDto)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /inventory/transfer - Transfer Inventory', () => {
    let toLocationId: string;

    beforeAll(async () => {
      // Create second location for transfer
      const location2 = await prisma.location.create({
        data: {
          warehouseId: testWarehouseId,
          code: `LOC-INV-TO-${Date.now()}`,
          name: 'Test To Location',
        },
      });
      toLocationId = location2.id;
    });

    beforeEach(async () => {
      // Ensure inventory exists in source location
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: {
          availableQty: 200,
          reservedQty: 0,
        },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 200,
          reservedQty: 0,
        },
      });
    });

    // INV-INT-25: Transfer with valid data
    it('INV-INT-25: Should transfer inventory with valid data', async () => {
      const transferDto = {
        productBatchId: testProductBatchId,
        fromLocationId: testLocationId,
        toLocationId: toLocationId,
        quantity: 50,
        createdById: testUserId,
        idempotencyKey: `idem-transfer-1-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', adminToken)
        .send(transferDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.fromInventory).toBeDefined();
      expect(response.body.toInventory).toBeDefined();
    });

    // INV-INT-26: Product batch not found
    it('INV-INT-26: Should return 404 if product batch not found', async () => {
      const transferDto = {
        productBatchId: '00000000-0000-0000-0000-000000000000',
        fromLocationId: testLocationId,
        toLocationId: toLocationId,
        quantity: 50,
        idempotencyKey: `idem-transfer-2-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', adminToken)
        .send(transferDto)
        .expect(404);

      expect(response.body.message).toContain('ProductBatch not found');
    });

    // INV-INT-27: From location not found
    it('INV-INT-27: Should return 404 if from location not found', async () => {
      const transferDto = {
        productBatchId: testProductBatchId,
        fromLocationId: '00000000-0000-0000-0000-000000000000',
        toLocationId: toLocationId,
        quantity: 50,
        idempotencyKey: `idem-transfer-3-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', adminToken)
        .send(transferDto)
        .expect(404);

      expect(response.body.message).toContain('From location not found');
    });

    // INV-INT-28: Same source and destination
    it('INV-INT-28: Should return 400 if source and destination are same', async () => {
      const transferDto = {
        productBatchId: testProductBatchId,
        fromLocationId: testLocationId,
        toLocationId: testLocationId,
        quantity: 50,
        createdById: testUserId,
        idempotencyKey: `idem-transfer-4-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', adminToken)
        .send(transferDto)
        .expect(400);

      expect(response.body.message).toContain('must be different');
    });

    // INV-INT-29: Not enough stock
    it('INV-INT-29: Should return 400 if not enough stock', async () => {
      const transferDto = {
        productBatchId: testProductBatchId,
        fromLocationId: testLocationId,
        toLocationId: toLocationId,
        quantity: 999999,
        createdById: testUserId,
        idempotencyKey: `idem-transfer-5-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', adminToken)
        .send(transferDto)
        .expect(400);

      expect(response.body.message).toContain('Not enough stock');
    });

    // INV-INT-30: Transfer minimal quantity of 1
    it('INV-INT-30: Should transfer minimal quantity of 1', async () => {
      const transferDto = {
        productBatchId: testProductBatchId,
        fromLocationId: testLocationId,
        toLocationId: toLocationId,
        quantity: 1,
        createdById: testUserId,
        idempotencyKey: `idem-transfer-6-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', adminToken)
        .send(transferDto)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /inventory/reserve - Reserve Inventory', () => {
    beforeEach(async () => {
      // Ensure inventory exists for reserve tests
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: {
          availableQty: 300,
          reservedQty: 0,
        },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 300,
          reservedQty: 0,
        },
      });
    });

    // INV-INT-31: Reserve with valid data
    it('INV-INT-31: Should reserve inventory with valid data', async () => {
      const reserveDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 50,
        orderId: `order-${Date.now()}`,
        createdById: testUserId,
        idempotencyKey: `idem-reserve-1-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', adminToken)
        .send(reserveDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory).toBeDefined();
      expect(response.body.inventory.reservedQty).toBeGreaterThanOrEqual(50);
    });

    // INV-INT-32: Product batch not found
    it('INV-INT-32: Should return 404 if product batch not found', async () => {
      const reserveDto = {
        productBatchId: '00000000-0000-0000-0000-000000000000',
        locationId: testLocationId,
        quantity: 50,
        orderId: `order-${Date.now()}`,
        idempotencyKey: `idem-reserve-2-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', adminToken)
        .send(reserveDto)
        .expect(404);

      expect(response.body.message).toContain('ProductBatch not found');
    });

    // INV-INT-33: Zero or negative quantity
    it('INV-INT-33: Should return 400 if quantity is zero', async () => {
      const reserveDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 0,
        orderId: `order-${Date.now()}`,
        idempotencyKey: `idem-reserve-3-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', adminToken)
        .send(reserveDto)
        .expect(400);

      expect(response.body.message).toContain('quantity must not be less than 1');
    });

    // INV-INT-34: Not enough available stock
    it('INV-INT-34: Should return 400 if not enough available stock', async () => {
      const reserveDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 999999,
        orderId: `order-${Date.now()}`,
        createdById: testUserId,
        idempotencyKey: `idem-reserve-4-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', adminToken)
        .send(reserveDto)
        .expect(400);

      expect(response.body.message).toContain('Not enough available stock');
    });

    // INV-INT-35: Reserve minimal quantity of 1
    it('INV-INT-35: Should reserve minimal quantity of 1', async () => {
      const reserveDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 1,
        orderId: `order-${Date.now()}`,
        createdById: testUserId,
        idempotencyKey: `idem-reserve-5-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', adminToken)
        .send(reserveDto)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /inventory/release - Release Reservation', () => {
    beforeEach(async () => {
      // Ensure inventory exists with reserved quantity
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: {
          availableQty: 100,
          reservedQty: 100,
        },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 100,
          reservedQty: 100,
        },
      });
    });

    // INV-INT-36: Release with valid data
    it('INV-INT-36: Should release reservation with valid data', async () => {
      const releaseDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 30,
        orderId: `order-${Date.now()}`,
        createdById: testUserId,
        idempotencyKey: `idem-release-1-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/release')
        .set('Authorization', adminToken)
        .send(releaseDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory).toBeDefined();
    });

    // INV-INT-37: Product batch not found
    it('INV-INT-37: Should return 404 if product batch not found', async () => {
      const releaseDto = {
        productBatchId: '00000000-0000-0000-0000-000000000000',
        locationId: testLocationId,
        quantity: 30,
        orderId: `order-${Date.now()}`,
        idempotencyKey: `idem-release-2-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/release')
        .set('Authorization', adminToken)
        .send(releaseDto)
        .expect(404);

      expect(response.body.message).toContain('ProductBatch not found');
    });

    // INV-INT-38: Not enough reserved stock
    it('INV-INT-38: Should return 400 if not enough reserved stock', async () => {
      const releaseDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 999999,
        orderId: `order-${Date.now()}`,
        createdById: testUserId,
        idempotencyKey: `idem-release-3-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/release')
        .set('Authorization', adminToken)
        .send(releaseDto)
        .expect(400);

      expect(response.body.message).toContain('Not enough reserved stock');
    });

    // INV-INT-39: Release partial reservation
    it('INV-INT-39: Should release partial reserved quantity', async () => {
      const releaseDto = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 20,
        orderId: `order-${Date.now()}`,
        createdById: testUserId,
        idempotencyKey: `idem-release-4-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/release')
        .set('Authorization', adminToken)
        .send(releaseDto)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /inventory/location/:locationId - Get Inventory by Location', () => {
    beforeAll(async () => {
      // Create multiple inventory records
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: {
          availableQty: 100,
          reservedQty: 20,
        },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 100,
          reservedQty: 20,
        },
      });
    });

    // INV-INT-40: Get with valid location
    it('INV-INT-40: Should get inventory by location with valid data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${testLocationId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.inventories)).toBe(true);
    });

    // INV-INT-41: Location not found
    it('INV-INT-41: Should return 404 if location not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/location?locationId=00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);

      expect(response.body.message).toContain('Location not found');
    });

    // INV-INT-42: Pagination
    it('INV-INT-42: Should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${testLocationId}&page=1&limit=10`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    // INV-INT-43: Invalid page number
    it('INV-INT-43: Should return 400 if page number is invalid', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${testLocationId}&page=0`)
        .set('Authorization', adminToken)
        .expect(400);

      expect(response.body.message).toContain('page must not be less than 1');
    });

    // INV-INT-44: Invalid limit
    it('INV-INT-44: Should return 400 if limit is invalid', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${testLocationId}&limit=0`)
        .set('Authorization', adminToken)
        .expect(400);

      expect(response.body.message).toContain('limit must not be less than 1');
    });
  });

  describe('GET /inventory/batch/:productBatchId - Get Inventory by Product Batch', () => {
    // INV-INT-45: Get with valid product batch
    it('INV-INT-45: Should get inventory by product batch with valid data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/product-batch?productBatchId=${testProductBatchId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.inventories)).toBe(true);
    });

    // INV-INT-46: Product batch not found
    it('INV-INT-46: Should return 404 if product batch not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/product-batch?productBatchId=00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);

      expect(response.body.message).toContain('ProductBatch not found');
    });

    // INV-INT-47: Pagination
    it('INV-INT-47: Should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/product-batch?productBatchId=${testProductBatchId}&page=1&limit=10`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PATCH /inventory/:productBatchId/:locationId - Update Inventory Quantity', () => {
    beforeEach(async () => {
      // Ensure inventory exists
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: {
          availableQty: 100,
          reservedQty: 20,
        },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 100,
          reservedQty: 20,
        },
      });
    });

    // INV-INT-48: Update with valid data
    it('INV-INT-48: Should update inventory quantity with valid data', async () => {
      const updateDto = {
        availableQty: 150,
        reservedQty: 30,
        updatedById: testUserId,
      };

      const response = await request(app.getHttpServer())
        .post(`/inventory/${testProductBatchId}/${testLocationId}/update-quantity`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory).toBeDefined();
    });

    // INV-INT-49: Product batch not found
    it('INV-INT-49: Should return 404 if product batch not found', async () => {
      const updateDto = {
        availableQty: 150,
      };

      const response = await request(app.getHttpServer())
        .post(`/inventory/00000000-0000-0000-0000-000000000000/${testLocationId}/update-quantity`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(404);

      expect(response.body.message).toContain('ProductBatch not found');
    });

    // INV-INT-50: Negative available quantity
    it('INV-INT-50: Should return 400 if available quantity is negative', async () => {
      const updateDto = {
        availableQty: -10,
      };

      const response = await request(app.getHttpServer())
        .post(`/inventory/${testProductBatchId}/${testLocationId}/update-quantity`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(400);

      expect(response.body.message).toContain('availableQty must be a positive number');
    });

    // INV-INT-51: Update with minimal availableQty (1) and reservedQty to 0
    it('INV-INT-51: Should update with minimal availableQty and zero reservedQty', async () => {
      const updateDto = {
        availableQty: 1,
        reservedQty: 0,
      };

      const response = await request(app.getHttpServer())
        .post(`/inventory/${testProductBatchId}/${testLocationId}/update-quantity`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /inventory/:productBatchId/:locationId - Soft Delete Inventory', () => {
    beforeEach(async () => {
      // Ensure inventory exists
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: {
          availableQty: 50,
          reservedQty: 0,
          deletedAt: null,
        },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 50,
          reservedQty: 0,
        },
      });
    });

    // INV-INT-52: Soft delete with valid data
    it('INV-INT-52: Should soft delete inventory with valid data', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/inventory/${testProductBatchId}/${testLocationId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    // INV-INT-53: Product batch not found
    it('INV-INT-53: Should return 404 if product batch not found', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/inventory/00000000-0000-0000-0000-000000000000/${testLocationId}`)
        .set('Authorization', adminToken)
        .expect(404);

      expect(response.body.message).toContain('ProductBatch not found');
    });
  });

  // describe('GET /inventory/alerts/low-stock - Get Low Stock Alerts', () => {
  //   beforeAll(async () => {
  //     // Create inventory with low stock
  //     await prisma.inventory.upsert({
  //       where: {
  //         productBatchId_locationId: {
  //           productBatchId: testProductBatchId,
  //           locationId: testLocationId,
  //         },
  //       },
  //       update: {
  //         availableQty: 5,
  //         reservedQty: 0,
  //         deletedAt: null,
  //       },
  //       create: {
  //         productBatchId: testProductBatchId,
  //         locationId: testLocationId,
  //         availableQty: 5,
  //         reservedQty: 0,
  //       },
  //     });
  //   });

  //   // INV-INT-54: Get alerts with threshold
  //   it('INV-INT-54: Should get low stock alerts with threshold', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/alerts/low-stock?threshold=10')
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //     expect(Array.isArray(response.body.inventories)).toBe(true);
  //   });

  //   // INV-INT-55: Filter by location and product
  //   it('INV-INT-55: Should filter alerts by location and product', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get(
  //         `/inventory/alerts/low-stock?threshold=10&locationId=${testLocationId}&productId=${testProductId}`,
  //       )
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-56: Invalid pagination
  //   it('INV-INT-56: Should return 400 if pagination is invalid', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/alerts/low-stock?page=-1')
  //       .set('Authorization', adminToken)
  //       .expect(400);

  //     expect(response.body.message).toContain('page must be a positive number');
  //   });

  //   // INV-INT-57: Get alerts without threshold
  //   it('INV-INT-57: Should use default threshold of 10 when not provided', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/alerts/low-stock')
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });
  // });

  // describe('GET /inventory/reports/stock-levels - Get Stock Level Report', () => {
  //   // INV-INT-59: Get stock level report with valid data
  //   it('INV-INT-59: Should get stock level report with valid data', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/reports/stock-levels')
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //     expect(Array.isArray(response.body.groupedData)).toBe(true);
  //   });

  //   // INV-INT-60: Filter by location
  //   it('INV-INT-60: Should filter stock level report by location', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get(`/inventory/reports/stock-levels?locationId=${testLocationId}`)
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-61: Filter by product
  //   it('INV-INT-61: Should filter stock level report by product', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get(`/inventory/reports/stock-levels?productId=${testProductId}`)
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-62: Group by location
  //   it('INV-INT-62: Should group stock level report by location', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/reports/stock-levels?groupBy=location')
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-63: Pagination support
  //   it('INV-INT-63: Should support pagination in stock level report', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/reports/stock-levels?page=1&limit=10')
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-64: Invalid pagination
  //   it('INV-INT-64: Should return 400 if pagination is invalid', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/reports/stock-levels?page=0')
  //       .set('Authorization', adminToken)
  //       .expect(400);

  //     expect(response.body.message).toContain('page must be a positive number');
  //   });
  // });

  // describe('GET /inventory/reports/movements - Get Movement Report', () => {
  //   // INV-INT-65: Get movement report with date range
  //   it('INV-INT-65: Should get movement report with date range', async () => {
  //     const startDate = new Date('2024-01-01').toISOString();
  //     const endDate = new Date('2024-12-31').toISOString();

  //     const response = await request(app.getHttpServer())
  //       .get(`/inventory/reports/movements?startDate=${startDate}&endDate=${endDate}`)
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //     expect(Array.isArray(response.body.movements)).toBe(true);
  //   });

  //   // INV-INT-66: Filter by location
  //   it('INV-INT-66: Should filter movement report by location', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get(`/inventory/reports/movements?locationId=${testLocationId}`)
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-67: Filter by product
  //   it('INV-INT-67: Should filter movement report by product', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get(`/inventory/reports/movements?productId=${testProductId}`)
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-68: Filter by movement type
  //   it('INV-INT-68: Should filter movement report by movement type', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/reports/movements?movementType=purchase_receipt')
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-69: Pagination and sorting
  //   it('INV-INT-69: Should support pagination and sorting in movement report', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/reports/movements?page=1&limit=10&sortBy=createdAt&sortOrder=desc')
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-70: Invalid pagination
  //   it('INV-INT-70: Should return 400 if pagination is invalid', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/reports/movements?page=-1')
  //       .set('Authorization', adminToken)
  //       .expect(400);

  //     expect(response.body.message).toContain('page must be a positive number');
  //   });
  // });

  // describe('GET /inventory/reports/valuation - Get Valuation Report', () => {
  //   // INV-INT-71: Get valuation report with average method
  //   it('INV-INT-71: Should get valuation report with average method', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/reports/valuation?method=AVERAGE')
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //     expect(Array.isArray(response.body.valuationData)).toBe(true);
  //   });

  //   // INV-INT-72: Filter by location
  //   it('INV-INT-72: Should filter valuation report by location', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get(`/inventory/reports/valuation?locationId=${testLocationId}`)
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-73: Filter by product
  //   it('INV-INT-73: Should filter valuation report by product', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get(`/inventory/reports/valuation?productId=${testProductId}`)
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-74: Pagination support
  //   it('INV-INT-74: Should support pagination in valuation report', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/reports/valuation?page=1&limit=10')
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-75: Invalid pagination
  //   it('INV-INT-75: Should return 400 if pagination is invalid', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/reports/valuation?limit=0')
  //       .set('Authorization', adminToken)
  //       .expect(400);

  //     expect(response.body.message).toContain('limit must be a positive number');
  //   });
  // });

  // describe('GET /inventory/alerts/expiry - Get Expiry Alerts', () => {
  //   // INV-INT-76: Get expiry alerts with threshold
  //   it('INV-INT-76: Should get expiry alerts with threshold', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/alerts/expiry?threshold=30')
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //     expect(Array.isArray(response.body.inventories)).toBe(true);
  //   });

  //   // INV-INT-77: Filter by location
  //   it('INV-INT-77: Should filter expiry alerts by location', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get(`/inventory/alerts/expiry?locationId=${testLocationId}`)
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-78: Filter by product
  //   it('INV-INT-78: Should filter expiry alerts by product', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get(`/inventory/alerts/expiry?productId=${testProductId}`)
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-79: Pagination support
  //   it('INV-INT-79: Should support pagination in expiry alerts', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/alerts/expiry?page=1&limit=10')
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });

  //   // INV-INT-80: Invalid pagination
  //   it('INV-INT-80: Should return 400 if pagination is invalid', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/alerts/expiry?page=0')
  //       .set('Authorization', adminToken)
  //       .expect(400);

  //     expect(response.body.message).toContain('page must be a positive number');
  //   });

  //   // INV-INT-81: Use default threshold when not provided
  //   it('INV-INT-81: Should use default threshold of 30 when not provided', async () => {
  //     const response = await request(app.getHttpServer())
  //       .get('/inventory/alerts/expiry')
  //       .set('Authorization', adminToken)
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //   });
  // });

  describe('Edge Cases - Concurrent Operations', () => {
    // INV-INT-82: Concurrent receive operations
    it('INV-INT-82: Should handle concurrent receive operations with different idempotency keys', async () => {
      const receiveDto1 = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 50,
        createdById: testUserId,
        idempotencyKey: `concurrent-receive-1-${Date.now()}`,
      };

      const receiveDto2 = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 60,
        createdById: testUserId,
        idempotencyKey: `concurrent-receive-2-${Date.now()}`,
      };

      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/inventory/receive')
          .set('Authorization', adminToken)
          .send(receiveDto1),
        request(app.getHttpServer())
          .post('/inventory/receive')
          .set('Authorization', adminToken)
          .send(receiveDto2),
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });

    // INV-INT-83: Concurrent dispatch operations
    it('INV-INT-83: Should handle concurrent dispatch operations', async () => {
      // First ensure enough stock
      await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 500,
          idempotencyKey: `prep-concurrent-dispatch-${Date.now()}`,
        });

      const dispatchDto1 = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 20,
        createdById: testUserId,
        idempotencyKey: `concurrent-dispatch-1-${Date.now()}`,
      };

      const dispatchDto2 = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 30,
        createdById: testUserId,
        idempotencyKey: `concurrent-dispatch-2-${Date.now()}`,
      };

      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/inventory/dispatch')
          .set('Authorization', adminToken)
          .send(dispatchDto1),
        request(app.getHttpServer())
          .post('/inventory/dispatch')
          .set('Authorization', adminToken)
          .send(dispatchDto2),
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });

    // INV-INT-84: Concurrent reserve operations
    it('INV-INT-84: Should handle concurrent reserve operations', async () => {
      // Ensure enough stock
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: { availableQty: 500, reservedQty: 0 },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 500,
          reservedQty: 0,
        },
      });

      const reserveDto1 = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 40,
        orderId: `order-concurrent-1-${Date.now()}`,
        createdById: testUserId,
        idempotencyKey: `concurrent-reserve-1-${Date.now()}`,
      };

      const reserveDto2 = {
        productBatchId: testProductBatchId,
        locationId: testLocationId,
        quantity: 50,
        orderId: `order-concurrent-2-${Date.now()}`,
        createdById: testUserId,
        idempotencyKey: `concurrent-reserve-2-${Date.now()}`,
      };

      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/inventory/reserve')
          .set('Authorization', adminToken)
          .send(reserveDto1),
        request(app.getHttpServer())
          .post('/inventory/reserve')
          .set('Authorization', adminToken)
          .send(reserveDto2),
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });

    // INV-INT-85: Mixed concurrent operations
    it('INV-INT-85: Should handle mixed concurrent operations', async () => {
      // Ensure enough stock
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: { availableQty: 1000, reservedQty: 0 },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 1000,
          reservedQty: 0,
        },
      });

      const [receiveRes, dispatchRes, reserveRes] = await Promise.all([
        request(app.getHttpServer())
          .post('/inventory/receive')
          .set('Authorization', adminToken)
          .send({
            productBatchId: testProductBatchId,
            locationId: testLocationId,
            quantity: 100,
            idempotencyKey: `mixed-receive-${Date.now()}`,
          }),
        request(app.getHttpServer())
          .post('/inventory/dispatch')
          .set('Authorization', adminToken)
          .send({
            productBatchId: testProductBatchId,
            locationId: testLocationId,
            quantity: 50,
            idempotencyKey: `mixed-dispatch-${Date.now()}`,
          }),
        request(app.getHttpServer())
          .post('/inventory/reserve')
          .set('Authorization', adminToken)
          .send({
            productBatchId: testProductBatchId,
            locationId: testLocationId,
            quantity: 60,
            orderId: `order-mixed-${Date.now()}`,
            idempotencyKey: `mixed-reserve-${Date.now()}`,
          }),
      ]);

      expect(receiveRes.status).toBe(201);
      expect(dispatchRes.status).toBe(201);
      expect(reserveRes.status).toBe(201);
    });
  });

  describe('Edge Cases - Boundary Values', () => {
    // INV-INT-86: Receive quantity of 1
    it('INV-INT-86: Should receive minimum quantity of 1', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 1,
          idempotencyKey: `boundary-receive-1-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    // INV-INT-87: Adjust with maximum positive value
    it('INV-INT-87: Should adjust with large positive value', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          adjustmentQuantity: 1000000,
          reason: 'count_error',
          idempotencyKey: `boundary-adjust-max-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    // INV-INT-88: Adjust with minimum negative value
    it('INV-INT-88: Should adjust with small negative value', async () => {
      // Ensure enough stock first
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: { availableQty: 100 },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 100,
          reservedQty: 0,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          adjustmentQuantity: -1,
          reason: 'damage',
          idempotencyKey: `boundary-adjust-min-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    // INV-INT-89: Query with limit = 100 (maximum)
    it('INV-INT-89: Should query with maximum limit of 100', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${testLocationId}&limit=100`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.limit).toBe(100);
    });

    // INV-INT-90: Query with limit > 100
    it('INV-INT-90: Should reject limit greater than 100', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${testLocationId}&limit=101`)
        .set('Authorization', adminToken)
        .expect(400);

      expect(response.body.message).toContain('limit must not be greater than 100');
    });
  });

  describe('Edge Cases - Complex Scenarios', () => {
    // INV-INT-91: Multiple transfers creating chain
    it('INV-INT-91: Should handle multiple transfer chain', async () => {
      // Create additional locations
      const loc2 = await prisma.location.create({
        data: {
          warehouseId: testWarehouseId,
          code: `LOC-CHAIN-2-${Date.now()}`,
          name: 'Chain Location 2',
        },
      });

      const loc3 = await prisma.location.create({
        data: {
          warehouseId: testWarehouseId,
          code: `LOC-CHAIN-3-${Date.now()}`,
          name: 'Chain Location 3',
        },
      });

      // Ensure stock in first location
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: { availableQty: 300 },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 300,
          reservedQty: 0,
        },
      });

      // Transfer chain: loc1 -> loc2 -> loc3
      const transfer1 = await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          fromLocationId: testLocationId,
          toLocationId: loc2.id,
          quantity: 100,
          idempotencyKey: `chain-transfer-1-${Date.now()}`,
        })
        .expect(201);

      const transfer2 = await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          fromLocationId: loc2.id,
          toLocationId: loc3.id,
          quantity: 50,
          idempotencyKey: `chain-transfer-2-${Date.now()}`,
        })
        .expect(201);

      expect(transfer1.body.success).toBe(true);
      expect(transfer2.body.success).toBe(true);
    });

    // INV-INT-92: Reserve then dispatch partial
    it('INV-INT-92: Should handle reserve then dispatch partial', async () => {
      // Reset inventory
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: { availableQty: 200, reservedQty: 0 },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 200,
          reservedQty: 0,
        },
      });

      // Reserve
      await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 100,
          orderId: `order-reserve-before-dispatch-${Date.now()}`,
          idempotencyKey: `reserve-before-dispatch-${Date.now()}`,
        })
        .expect(201);

      // Dispatch from available (not reserved)
      const dispatchRes = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 50,
          idempotencyKey: `dispatch-after-reserve-${Date.now()}`,
        })
        .expect(201);

      expect(dispatchRes.body.success).toBe(true);
    });

    // INV-INT-93: Multiple adjustments in sequence
    it('INV-INT-93: Should handle multiple adjustments in sequence', async () => {
      // Reset inventory
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: { availableQty: 100 },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 100,
          reservedQty: 0,
        },
      });

      // Multiple adjustments
      await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          adjustmentQuantity: 20,
          reason: 'count_error',
          idempotencyKey: `seq-adjust-1-${Date.now()}`,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          adjustmentQuantity: -10,
          reason: 'damage',
          idempotencyKey: `seq-adjust-2-${Date.now()}`,
        })
        .expect(201);

      const finalAdjust = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          adjustmentQuantity: 5,
          reason: 'count_error',
          idempotencyKey: `seq-adjust-3-${Date.now()}`,
        })
        .expect(201);

      expect(finalAdjust.body.success).toBe(true);
    });

    // INV-INT-94: Full reserve, partial release, then dispatch
    it('INV-INT-94: Should handle reserve, partial release, then dispatch', async () => {
      // Reset inventory
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: { availableQty: 150, reservedQty: 0 },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 150,
          reservedQty: 0,
        },
      });

      // Reserve all
      await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 150,
          orderId: `order-complex-reserve-${Date.now()}`,
          idempotencyKey: `complex-reserve-${Date.now()}`,
        })
        .expect(201);

      // Release partial
      await request(app.getHttpServer())
        .post('/inventory/release')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 50,
          orderId: `order-complex-release-${Date.now()}`,
          idempotencyKey: `complex-release-${Date.now()}`,
        })
        .expect(201);

      // Dispatch from released
      const dispatchRes = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 30,
          idempotencyKey: `complex-dispatch-${Date.now()}`,
        })
        .expect(201);

      expect(dispatchRes.body.success).toBe(true);
    });

    // INV-INT-95: Update quantity after multiple operations
    it('INV-INT-95: Should update quantity after multiple operations', async () => {
      // Perform some operations
      await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 100,
          idempotencyKey: `before-update-${Date.now()}`,
        });

      // Manual update to correct inventory
      const updateRes = await request(app.getHttpServer())
        .post(`/inventory/${testProductBatchId}/${testLocationId}/update-quantity`)
        .set('Authorization', adminToken)
        .send({
          availableQty: 500,
          reservedQty: 0,
        })
        .expect(201);

      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.inventory.availableQty).toBe(500);
    });
  });

  describe('Edge Cases - Validation and Error Handling', () => {
    // INV-INT-96: Dispatch more than available after reservation
    it('INV-INT-96: Should fail to dispatch when not enough available after reservation', async () => {
      // Reset with specific amounts
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: { availableQty: 50, reservedQty: 40 },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 50,
          reservedQty: 40,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 60,
          idempotencyKey: `fail-dispatch-${Date.now()}`,
        })
        .expect(400);

      expect(response.body.message).toContain('Not enough stock');
    });

    // INV-INT-97: Reserve more than available
    it('INV-INT-97: Should fail to reserve more than available', async () => {
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: { availableQty: 30 },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 30,
          reservedQty: 0,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 50,
          orderId: `order-fail-reserve-${Date.now()}`,
          idempotencyKey: `fail-reserve-${Date.now()}`,
        })
        .expect(400);

      expect(response.body.message).toContain('Not enough available stock');
    });

    // INV-INT-98: Release more than reserved
    it('INV-INT-98: Should fail to release more than reserved', async () => {
      await prisma.inventory.upsert({
        where: {
          productBatchId_locationId: {
            productBatchId: testProductBatchId,
            locationId: testLocationId,
          },
        },
        update: { reservedQty: 20 },
        create: {
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          availableQty: 100,
          reservedQty: 20,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/inventory/release')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 30,
          orderId: `order-fail-release-${Date.now()}`,
          idempotencyKey: `fail-release-${Date.now()}`,
        })
        .expect(400);

      expect(response.body.message).toContain('Not enough reserved stock');
    });

    // INV-INT-99: Invalid UUID format in path
    it('INV-INT-99: Should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/inventory/location?locationId=invalid-uuid')
        .set('Authorization', adminToken)
        .expect(400);
    });

    // INV-INT-100: Query with very large page number
    it('INV-INT-100: Should handle very large page number', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${testLocationId}&page=99999`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inventories.length).toBe(0);
    });
  });

  describe('Integration Flow - Complete Inventory Lifecycle', () => {
    it('INV-INT-101: Should complete full inventory lifecycle', async () => {
      const uniqueBatchNo = `BATCH-LIFECYCLE-${Date.now()}`;

      // 1. Create product batch
      const batch = await prisma.productBatch.create({
        data: {
          productId: testProductId,
          batchNo: uniqueBatchNo,
          quantity: 500,
        },
      });

      // 2. Receive inventory
      const receiveResponse = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: batch.id,
          locationId: testLocationId,
          quantity: 500,
          createdById: testUserId,
          idempotencyKey: `lifecycle-receive-${Date.now()}`,
        })
        .expect(201);

      expect(receiveResponse.body.success).toBe(true);

      // 3. Reserve some inventory
      const reserveResponse = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', adminToken)
        .send({
          productBatchId: batch.id,
          locationId: testLocationId,
          quantity: 100,
          orderId: `order-lifecycle-reserve-${Date.now()}`,
          createdById: testUserId,
          idempotencyKey: `lifecycle-reserve-${Date.now()}`,
        })
        .expect(201);

      expect(reserveResponse.body.success).toBe(true);

      // 4. Release reservation
      const releaseResponse = await request(app.getHttpServer())
        .post('/inventory/release')
        .set('Authorization', adminToken)
        .send({
          productBatchId: batch.id,
          locationId: testLocationId,
          quantity: 50,
          orderId: `order-lifecycle-release-${Date.now()}`,
          createdById: testUserId,
          idempotencyKey: `lifecycle-release-${Date.now()}`,
        })
        .expect(201);

      expect(releaseResponse.body.success).toBe(true);

      // 5. Adjust inventory
      const adjustResponse = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send({
          productBatchId: batch.id,
          locationId: testLocationId,
          adjustmentQuantity: -20,
          reason: 'damage',
          createdById: testUserId,
          idempotencyKey: `lifecycle-adjust-${Date.now()}`,
        })
        .expect(201);

      expect(adjustResponse.body.success).toBe(true);

      // 6. Dispatch inventory
      const dispatchResponse = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send({
          productBatchId: batch.id,
          locationId: testLocationId,
          quantity: 100,
          createdById: testUserId,
          idempotencyKey: `lifecycle-dispatch-${Date.now()}`,
        })
        .expect(201);

      expect(dispatchResponse.body.success).toBe(true);

      // 7. Get inventory by location
      const getByLocationResponse = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${testLocationId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(getByLocationResponse.body.success).toBe(true);

      // 8. Get inventory by batch
      const getByBatchResponse = await request(app.getHttpServer())
        .get(`/inventory/product-batch?productBatchId=${batch.id}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(getByBatchResponse.body.success).toBe(true);

      // 9. Update inventory quantity
      const updateResponse = await request(app.getHttpServer())
        .post(`/inventory/${batch.id}/${testLocationId}/update-quantity`)
        .set('Authorization', adminToken)
        .send({
          availableQty: 200,
          reservedQty: 0,
        })
        .expect(201);

      expect(updateResponse.body.success).toBe(true);

      // 10. Soft delete inventory
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/inventory/${batch.id}/${testLocationId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
    }, 180000);
  });

  describe('INTEGRATION-INV-01: Receive Operations', () => {
    it('should receive inventory with all fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 200,
          createdById: testUserId,
          idempotencyKey: `integration-receive-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory.availableQty).toBeGreaterThanOrEqual(200);
    });

    it('should handle idempotency correctly', async () => {
      const idempKey = `integration-idem-${Date.now()}`;

      const response1 = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 100,
          idempotencyKey: idempKey,
        })
        .expect(201);

      expect(response1.body.success).toBe(true);

      const response2 = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 100,
          idempotencyKey: idempKey,
        })
        .expect(201);

      expect(response2.body.idempotent).toBe(true);
    });
  });

  describe('INTEGRATION-INV-02: Dispatch Operations', () => {
    it('should dispatch inventory successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 50,
          idempotencyKey: `integration-dispatch-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject dispatch when insufficient stock', async () => {
      await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 999999,
          idempotencyKey: `integration-dispatch-insufficient-${Date.now()}`,
        })
        .expect(400);
    });
  });

  describe('INTEGRATION-INV-03: Transfer Operations', () => {
    let testLocation2Id: string;

    beforeAll(async () => {
      // Create second location for transfer tests
      const location2 = await prisma.location.create({
        data: {
          code: `LOC2-${Date.now()}`,
          name: `Integration Location 2 ${Date.now()}`,
          warehouseId: testWarehouseId,
          type: 'RACK',
        },
      });
      testLocation2Id = location2.id;
    });

    it('should transfer inventory between locations', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          fromLocationId: testLocationId,
          toLocationId: testLocation2Id,
          quantity: 30,
          idempotencyKey: `integration-transfer-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject transfer to same location', async () => {
      await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          fromLocationId: testLocationId,
          toLocationId: testLocationId,
          quantity: 10,
          idempotencyKey: `integration-transfer-same-${Date.now()}`,
        })
        .expect(400);
    });
  });

  describe('INTEGRATION-INV-04: Reserve and Release', () => {
    it('should reserve inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 20,
          orderId: 'order-integration-001',
          idempotencyKey: `integration-reserve-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory.reservedQty).toBeGreaterThanOrEqual(20);
    });

    it('should release reservation', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/release')
        .set('Authorization', adminToken)
        .send({
          productBatchId: testProductBatchId,
          locationId: testLocationId,
          quantity: 10,
          orderId: 'order-integration-001',
          idempotencyKey: `integration-release-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('INTEGRATION-INV-05: Query Operations', () => {
    it('should get inventory by location', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${testLocationId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.inventories)).toBe(true);
    });

    it('should get inventory by product batch', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/product-batch?productBatchId=${testProductBatchId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.inventories)).toBe(true);
    });
  });

  describe('INTEGRATION-INV-06: Authorization', () => {
    it('should allow manager to view inventory', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${testLocationId}`)
        .set('Authorization', managerToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('INTEGRATION-INV-07: Validation', () => {
    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          locationId: testLocationId,
          quantity: 100,
        })
        .expect(400);
    });

    it('should reject non-existent product batch', async () => {
      await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: '00000000-0000-0000-0000-000000000000',
          locationId: testLocationId,
          quantity: 100,
          idempotencyKey: `integration-invalid-batch-${Date.now()}`,
        })
        .expect(404);
    });
  });
});
