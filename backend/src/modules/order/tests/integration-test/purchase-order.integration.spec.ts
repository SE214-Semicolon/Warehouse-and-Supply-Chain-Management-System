import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { OrderModule } from '../../order.module';
import { PoStatus, UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from '../../../../auth/auth.module';
import { InventoryModule } from '../../../inventory/inventory.module';
import { DatabaseModule } from '../../../../database/database.module';

describe('Purchase Order Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let managerToken: string;
  let procurementToken: string;
  let staffToken: string;
  let testSupplierId: string;
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
        OrderModule,
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
        username: 'admin-po-test',
        email: 'admin-po@test.com',
        fullName: 'Admin PO Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: 'manager-po-test',
        email: 'manager-po@test.com',
        fullName: 'Manager PO Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    const procurementUser = await prisma.user.create({
      data: {
        username: 'procurement-po-test',
        email: 'procurement-po@test.com',
        fullName: 'Procurement PO Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.procurement,
        active: true,
      },
    });

    const staffUser = await prisma.user.create({
      data: {
        username: 'staff-po-test',
        email: 'staff-po@test.com',
        fullName: 'Staff PO Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.warehouse_staff,
        active: true,
      },
    });

    // Generate JWT tokens
    adminToken = `Bearer ${jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: adminUser.role })}`;
    managerToken = `Bearer ${jwtService.sign({ sub: managerUser.id, email: managerUser.email, role: managerUser.role })}`;
    procurementToken = `Bearer ${jwtService.sign({ sub: procurementUser.id, email: procurementUser.email, role: procurementUser.role })}`;
    staffToken = `Bearer ${jwtService.sign({ sub: staffUser.id, email: staffUser.email, role: staffUser.role })}`;

    // Store test user ID for submit tests
    testUserId = adminUser.id;

    // Create test supplier
    const supplier = await prisma.supplier.create({
      data: {
        code: `SUP-PO-${Date.now()}`,
        name: 'Test Supplier for PO',
        contactInfo: { phone: '0901234567' },
      },
    });
    testSupplierId = supplier.id;

    // Create test product category
    const category = await prisma.productCategory.create({
      data: {
        name: `PO-Test-Category-${Date.now()}`,
      },
    });

    // Create test product
    const product = await prisma.product.create({
      data: {
        sku: `SKU-PO-${Date.now()}`,
        name: 'Test Product for PO',
        unit: 'pcs',
        categoryId: category.id,
      },
    });
    testProductId = product.id;
  }, 60000);

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  }, 30000);

  async function cleanDatabase() {
    await prisma.stockMovement.deleteMany({});
    await prisma.inventory.deleteMany({});
    await prisma.purchaseOrderItem.deleteMany({});
    await prisma.purchaseOrder.deleteMany({});
    await prisma.productBatch.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.productCategory.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.warehouse.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { contains: '@test.com' } },
    });
  }

  describe('POST /purchase-orders - Create Purchase Order', () => {
    // PO-INT-01: Create draft PO with valid data
    it('PO-INT-01: Should create a draft PO with valid data', async () => {
      const createDto = {
        supplierId: testSupplierId,
        placedAt: '2024-01-15T10:00:00Z',
        expectedArrival: '2024-01-20T10:00:00Z',
        notes: 'Test order',
        items: [
          {
            productId: testProductId,
            qtyOrdered: 10,
            unitPrice: 50000,
            remark: 'Test item',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.status).toBe(PoStatus.draft);
      expect(response.body.poNo).toMatch(/^PO-\d{6}-[A-Z0-9]{6}$/);
      expect(response.body.supplierId).toBe(testSupplierId);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].qtyOrdered).toBe(10);
      expect(Number(response.body.totalAmount)).toBe(500000);
    });

    // PO-INT-02: Create without supplierId
    it('PO-INT-02: Should create a PO without supplierId', async () => {
      const createDto = {
        placedAt: '2024-01-15T10:00:00Z',
        notes: 'Test order without supplier',
        items: [
          {
            productId: testProductId,
            qtyOrdered: 5,
            unitPrice: 30000,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', procurementToken)
        .send(createDto)
        .expect(201);

      expect(response.body.supplierId).toBeNull();
      expect(response.body.status).toBe(PoStatus.draft);
    });

    // PO-INT-03: Create without items
    it('PO-INT-03: Should create a PO without items', async () => {
      const createDto = {
        supplierId: testSupplierId,
        placedAt: '2024-01-15T10:00:00Z',
        items: [],
      };

      const response = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', managerToken)
        .send(createDto)
        .expect(201);

      expect(response.body.items).toEqual([]);
      expect(Number(response.body.totalAmount)).toBe(0);
    });

    // PO-INT-04: Create with items missing unitPrice
    it('PO-INT-04: Should create a PO with items missing unitPrice', async () => {
      const createDto = {
        supplierId: testSupplierId,
        items: [
          {
            productId: testProductId,
            qtyOrdered: 10,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.items[0].unitPrice).toBeNull();
      expect(response.body.items[0].lineTotal).toBeNull();
      expect(Number(response.body.totalAmount)).toBe(0);
    });

    // PO-INT-05: Create with multiple items
    it('PO-INT-05: Should create a PO with multiple items and calculate total', async () => {
      const createDto = {
        supplierId: testSupplierId,
        items: [
          {
            productId: testProductId,
            qtyOrdered: 5,
            unitPrice: 100,
          },
          {
            productId: testProductId,
            qtyOrdered: 3,
            unitPrice: 200,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.items).toHaveLength(2);
      expect(Number(response.body.totalAmount)).toBe(1100);
    });

    // PO-INT-06: Create with invalid productId (tested by DTO)
    it('PO-INT-06: Should return 400 for invalid productId', async () => {
      const createDto = {
        items: [
          {
            productId: 'invalid-uuid',
            qtyOrdered: 10,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // PO-INT-07: Create with negative qtyOrdered (tested by DTO)
    it('PO-INT-07: Should return 400 for negative qtyOrdered', async () => {
      const createDto = {
        items: [
          {
            productId: testProductId,
            qtyOrdered: -5,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // PO-INT-08: Permission denied for warehouse_staff
    it('PO-INT-08: Should return 403 for warehouse_staff role', async () => {
      const createDto = {
        supplierId: testSupplierId,
        items: [],
      };

      await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', staffToken)
        .send(createDto)
        .expect(403);
    });

    // PO-INT-09: Create with placedAt in past
    it('PO-INT-09: Should allow creating PO with placedAt in past', async () => {
      const createDto = {
        supplierId: testSupplierId,
        placedAt: '2020-01-15T10:00:00Z',
        items: [],
      };

      const response = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(new Date(response.body.placedAt).getFullYear()).toBe(2020);
    });

    // PO-INT-10: Create with expectedArrival before placedAt
    it('PO-INT-10: Should reject PO with expectedArrival before placedAt (validation)', async () => {
      const createDto = {
        supplierId: testSupplierId,
        placedAt: '2024-01-15T10:00:00Z',
        expectedArrival: '2024-01-10T10:00:00Z',
        items: [],
      };

      await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });
  });

  describe('POST /purchase-orders/:id/submit - Submit Purchase Order', () => {
    let draftPoId: string;

    beforeEach(async () => {
      const po = await prisma.purchaseOrder.create({
        data: {
          poNo: `PO-TEST-${Date.now()}`,
          status: PoStatus.draft,
          supplierId: testSupplierId,
          totalAmount: 0,
        },
      });
      draftPoId = po.id;
    });

    // PO-INT-11: Submit draft PO successfully
    it('PO-INT-11: Should submit a draft PO successfully', async () => {
      const submitDto = {
        userId: testUserId,
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${draftPoId}/submit`)
        .set('Authorization', adminToken)
        .send(submitDto)
        .expect(201);

      expect(response.body.status).toBe(PoStatus.ordered);
    });

    // PO-INT-12: Missing userId
    it('PO-INT-12: Should return 400 if userId is missing', async () => {
      await request(app.getHttpServer())
        .post(`/purchase-orders/${draftPoId}/submit`)
        .set('Authorization', adminToken)
        .send({})
        .expect(400);
    });

    // PO-INT-13: Submit PO not in draft status
    it('PO-INT-13: Should return 400 if PO is not in draft status', async () => {
      await prisma.purchaseOrder.update({
        where: { id: draftPoId },
        data: { status: PoStatus.ordered },
      });

      const submitDto = {
        userId: testUserId,
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${draftPoId}/submit`)
        .set('Authorization', adminToken)
        .send(submitDto)
        .expect(400);

      expect(response.body.message).toContain('draft');
    });

    // PO-INT-14: Submit non-existent PO
    it('PO-INT-14: Should return 404 if PO not found', async () => {
      const submitDto = {
        userId: testUserId,
      };

      await request(app.getHttpServer())
        .post('/purchase-orders/00000000-0000-0000-0000-000000000000/submit')
        .set('Authorization', adminToken)
        .send(submitDto)
        .expect(404);
    });

    // PO-INT-15: Permission denied for warehouse_staff
    it('PO-INT-15: Should return 403 for warehouse_staff role', async () => {
      const submitDto = {
        userId: testUserId,
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${draftPoId}/submit`)
        .set('Authorization', staffToken)
        .send(submitDto)
        .expect(403);
    });

    // PO-INT-16: No authentication
    it('PO-INT-16: Should return 401 without authentication', async () => {
      const submitDto = {
        userId: testUserId,
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${draftPoId}/submit`)
        .send(submitDto)
        .expect(401);
    });
  });

  describe('GET /purchase-orders/:id - Get Purchase Order', () => {
    let testPoId: string;

    beforeAll(async () => {
      const po = await prisma.purchaseOrder.create({
        data: {
          poNo: `PO-GET-${Date.now()}`,
          status: PoStatus.ordered,
          supplierId: testSupplierId,
          totalAmount: 1000000,
        },
      });
      testPoId = po.id;
    });

    // PO-INT-17: Find by valid ID
    it('PO-INT-17: Should return a PO by valid ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/purchase-orders/${testPoId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.id).toBe(testPoId);
      expect(response.body.status).toBe(PoStatus.ordered);
    });

    // PO-INT-18: PO not found
    it('PO-INT-18: Should return 404 if PO not found', async () => {
      await request(app.getHttpServer())
        .get('/purchase-orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });
  });

  describe('GET /purchase-orders - List Purchase Orders', () => {
    beforeAll(async () => {
      // Create multiple POs for testing
      await prisma.purchaseOrder.createMany({
        data: [
          {
            poNo: 'PO-LIST-001',
            status: PoStatus.draft,
            supplierId: testSupplierId,
            totalAmount: 100000,
            placedAt: new Date('2024-01-10'),
          },
          {
            poNo: 'PO-LIST-002',
            status: PoStatus.ordered,
            supplierId: testSupplierId,
            totalAmount: 200000,
            placedAt: new Date('2024-01-15'),
          },
          {
            poNo: 'PO-LIST-003',
            status: PoStatus.received,
            totalAmount: 150000,
            placedAt: new Date('2024-01-20'),
          },
        ],
      });
    });

    // PO-INT-19: Get all with default pagination
    it('PO-INT-19: Should return all POs with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchase-orders')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(20);
    });

    // PO-INT-20: Filter by poNo
    it('PO-INT-20: Should filter POs by poNo', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchase-orders?poNo=LIST-001')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].poNo).toContain('LIST-001');
    });

    // PO-INT-21: Filter by status
    it('PO-INT-21: Should filter POs by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/purchase-orders?status=${PoStatus.ordered}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((po: any) => {
        expect(po.status).toBe(PoStatus.ordered);
      });
    });

    // PO-INT-22: Filter by supplierId
    it('PO-INT-22: Should filter POs by supplierId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/purchase-orders?supplierId=${testSupplierId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((po: any) => {
        if (po.supplierId) {
          expect(po.supplierId).toBe(testSupplierId);
        }
      });
    });

    // PO-INT-23: Filter by dateFrom
    it('PO-INT-23: Should filter POs by dateFrom', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchase-orders?dateFrom=2024-01-15')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((po: any) => {
        if (po.placedAt) {
          expect(new Date(po.placedAt).getTime()).toBeGreaterThanOrEqual(
            new Date('2024-01-15').getTime(),
          );
        }
      });
    });

    // PO-INT-24: Pagination
    it('PO-INT-24: Should handle pagination correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchase-orders?page=1&pageSize=2')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(2);
    });

    // PO-INT-25: Filter by dateTo
    it('PO-INT-25: Should filter POs by dateTo', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchase-orders?dateTo=2024-01-16')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((po: any) => {
        if (po.placedAt) {
          expect(new Date(po.placedAt).getTime()).toBeLessThanOrEqual(
            new Date('2024-01-16').getTime(),
          );
        }
      });
    });

    // PO-INT-26: Filter by date range
    it('PO-INT-26: Should filter POs by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchase-orders?dateFrom=2024-01-10&dateTo=2024-01-20')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    // PO-INT-27: Sort by placedAt asc
    it('PO-INT-27: Should sort POs by placedAt ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchase-orders?sort=placedAt:asc')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    // PO-INT-28: Sort by status desc
    it('PO-INT-28: Should sort POs by status descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchase-orders?sort=status:desc')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    // PO-INT-29: Combine multiple filters
    it('PO-INT-29: Should combine multiple filters', async () => {
      const response = await request(app.getHttpServer())
        .get(`/purchase-orders?status=${PoStatus.ordered}&supplierId=${testSupplierId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    // PO-INT-30: SQL injection test
    it('PO-INT-30: Should handle SQL injection attempts safely', async () => {
      const response = await request(app.getHttpServer())
        .get("/purchase-orders?poNo='; DROP TABLE purchase_orders;--")
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /purchase-orders/:id/receive - Receive Purchase Order', () => {
    let orderedPoId: string;
    let poItemId: string;
    let testWarehouseId: string;
    let testLocationId: string;
    let testBatchId: string;

    beforeAll(async () => {
      // Create warehouse and location for receiving
      const warehouse = await prisma.warehouse.create({
        data: {
          code: `WH-PO-${Date.now()}`,
          name: 'Test Warehouse for PO',
        },
      });
      testWarehouseId = warehouse.id;

      const location = await prisma.location.create({
        data: {
          warehouseId: testWarehouseId,
          code: `LOC-PO-${Date.now()}`,
          name: 'Test Location for PO',
        },
      });
      testLocationId = location.id;

      // Create product batch
      const batch = await prisma.productBatch.create({
        data: {
          productId: testProductId,
          batchNo: `BATCH-PO-${Date.now()}`,
          quantity: 100,
        },
      });
      testBatchId = batch.id;
    });

    beforeEach(async () => {
      // Create ordered PO with items
      const po = await prisma.purchaseOrder.create({
        data: {
          poNo: `PO-RECEIVE-${Date.now()}`,
          status: PoStatus.ordered,
          supplierId: testSupplierId,
          totalAmount: 1000000,
        },
      });
      orderedPoId = po.id;

      const item = await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: orderedPoId,
          productId: testProductId,
          qtyOrdered: 100,
          qtyReceived: 0,
          unitPrice: 10000,
          lineTotal: 1000000,
        },
      });
      poItemId = item.id;
    });

    // PO-INT-31: Receive partial successfully
    it('PO-INT-31: Should receive partial successfully', async () => {
      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-partial-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      expect(response.body.status).toBe(PoStatus.partial);
      expect(response.body.items[0].qtyReceived).toBe(50);
    });

    // PO-INT-32: Receive full successfully
    it('PO-INT-32: Should receive full successfully', async () => {
      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 100,
            createdById: testUserId,
            idempotencyKey: `idem-full-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      expect(response.body.status).toBe(PoStatus.received);
      expect(response.body.items[0].qtyReceived).toBe(100);
    });

    // PO-INT-33: Receive multiple times partial → partial
    it('PO-INT-33: Should receive multiple times partial to partial', async () => {
      // First receive
      await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              poItemId: poItemId,
              productBatchId: testBatchId,
              locationId: testLocationId,
              qtyToReceive: 30,
              createdById: testUserId,
              idempotencyKey: `idem-1-${Date.now()}`,
            },
          ],
        })
        .expect(201);

      // Second receive
      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', procurementToken)
        .send({
          items: [
            {
              poItemId: poItemId,
              productBatchId: testBatchId,
              locationId: testLocationId,
              qtyToReceive: 30,
              createdById: testUserId,
              idempotencyKey: `idem-2-${Date.now()}`,
            },
          ],
        })
        .expect(201);

      expect(response.body.status).toBe(PoStatus.partial);
      expect(response.body.items[0].qtyReceived).toBe(60);
    });

    // PO-INT-34: Receive multiple times partial → received
    it('PO-INT-34: Should receive multiple times partial to received', async () => {
      // First receive
      await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              poItemId: poItemId,
              productBatchId: testBatchId,
              locationId: testLocationId,
              qtyToReceive: 60,
              createdById: testUserId,
              idempotencyKey: `idem-3-${Date.now()}`,
            },
          ],
        })
        .expect(201);

      // Second receive completes the order
      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', managerToken)
        .send({
          items: [
            {
              poItemId: poItemId,
              productBatchId: testBatchId,
              locationId: testLocationId,
              qtyToReceive: 40,
              createdById: testUserId,
              idempotencyKey: `idem-4-${Date.now()}`,
            },
          ],
        })
        .expect(201);

      expect(response.body.status).toBe(PoStatus.received);
      expect(response.body.items[0].qtyReceived).toBe(100);
    });

    // PO-INT-35: Receive multiple items simultaneously
    it('PO-INT-35: Should receive multiple items simultaneously', async () => {
      // Add another item to the PO
      const item2 = await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: orderedPoId,
          productId: testProductId,
          qtyOrdered: 50,
          qtyReceived: 0,
          unitPrice: 20000,
          lineTotal: 1000000,
        },
      });

      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 100,
            createdById: testUserId,
            idempotencyKey: `idem-multi-1-${Date.now()}`,
          },
          {
            poItemId: item2.id,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-multi-2-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      expect(response.body.status).toBe(PoStatus.received);
      expect(response.body.items).toHaveLength(2);
    });

    // PO-INT-36: Receive exceeds ordered quantity
    it('PO-INT-36: Should return 400 when receive exceeds ordered quantity', async () => {
      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 150,
            createdById: testUserId,
            idempotencyKey: `idem-exceed-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);

      expect(response.body.message).toContain('exceeds');
    });

    // PO-INT-37: Receive exceeds with multiple receives
    it('PO-INT-37: Should return 400 when cumulative receive exceeds ordered', async () => {
      // First receive
      await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              poItemId: poItemId,
              productBatchId: testBatchId,
              locationId: testLocationId,
              qtyToReceive: 80,
              createdById: testUserId,
              idempotencyKey: `idem-cum-1-${Date.now()}`,
            },
          ],
        })
        .expect(201);

      // Second receive exceeds
      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              poItemId: poItemId,
              productBatchId: testBatchId,
              locationId: testLocationId,
              qtyToReceive: 30,
              createdById: testUserId,
              idempotencyKey: `idem-cum-2-${Date.now()}`,
            },
          ],
        })
        .expect(400);

      expect(response.body.message).toContain('exceeds');
    });

    // PO-INT-38: Receive PO not in ordered/partial status
    it('PO-INT-38: Should return 400 if PO not in ordered/partial status', async () => {
      // Change status to draft
      await prisma.purchaseOrder.update({
        where: { id: orderedPoId },
        data: { status: PoStatus.draft },
      });

      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-status-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);

      expect(response.body.message).toContain('not eligible');
    });

    // PO-INT-39: Receive with invalid poItemId
    it('PO-INT-39: Should return 400 with invalid poItemId', async () => {
      const receiveDto = {
        items: [
          {
            poItemId: '00000000-0000-0000-0000-000000000000',
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-invalid-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);

      expect(response.body.message).toContain('not found');
    });

    // PO-INT-40: Receive without items array
    it('PO-INT-40: Should return 400 without items array', async () => {
      await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send({})
        .expect(400);
    });

    // PO-INT-41: Receive with duplicate idempotencyKey (idempotent)
    it('PO-INT-41: Should handle duplicate idempotencyKey (idempotent)', async () => {
      const idempotencyKey = `idem-dup-${Date.now()}`;
      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: idempotencyKey,
          },
        ],
      };

      // First receive
      const firstResponse = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      // Get the total qtyReceived after first receive across all items
      const firstTotal = firstResponse.body.items.reduce(
        (sum: number, item: any) => sum + (item.qtyReceived as number),
        0,
      );

      // Second receive with same idempotencyKey should not double-receive
      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      // Total qtyReceived should remain the same (idempotent)
      const secondTotal = response.body.items.reduce(
        (sum: number, item: any) => sum + (item.qtyReceived as number),
        0,
      );
      expect(secondTotal).toBe(firstTotal);
    });

    // PO-INT-42: Receive non-existent PO
    it('PO-INT-42: Should return 404 for non-existent PO', async () => {
      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-404-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/purchase-orders/00000000-0000-0000-0000-000000000000/receive')
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(404);
    });

    // PO-INT-43: Receive without locationId (tested by DTO)
    it('PO-INT-43: Should return 400 without locationId', async () => {
      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-no-loc-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);
    });

    // PO-INT-44: Receive without productBatchId (tested by DTO)
    it('PO-INT-44: Should return 400 without productBatchId', async () => {
      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-no-batch-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);
    });

    // PO-INT-45: Receive without createdById (tested by DTO)
    it('PO-INT-45: Should return 400 without createdById', async () => {
      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            idempotencyKey: `idem-no-user-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);
    });

    // PO-INT-46: Receive without idempotencyKey (tested by DTO)
    it('PO-INT-46: Should return 400 without idempotencyKey', async () => {
      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);
    });

    // PO-INT-47: Permission denied for warehouse_staff
    it('PO-INT-47: Should return 403 for warehouse_staff role', async () => {
      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-perm-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', staffToken)
        .send(receiveDto)
        .expect(403);
    });

    // PO-INT-48: No authentication
    it('PO-INT-48: Should return 401 without authentication', async () => {
      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-auth-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .send(receiveDto)
        .expect(401);
    });

    // PO-INT-49: Inventory integration verified
    it('PO-INT-49: Should verify inventory increases after receiving', async () => {
      const receiveDto = {
        items: [
          {
            poItemId: poItemId,
            productBatchId: testBatchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-inv-${Date.now()}`,
          },
        ],
      };

      // Get inventory before
      const invBefore = await prisma.inventory.findUnique({
        where: {
          productBatchId_locationId: {
            productBatchId: testBatchId,
            locationId: testLocationId,
          },
        },
      });
      const qtyBefore = invBefore?.availableQty ?? 0;

      // Receive
      await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      // Check inventory after
      const invAfter = await prisma.inventory.findUnique({
        where: {
          productBatchId_locationId: {
            productBatchId: testBatchId,
            locationId: testLocationId,
          },
        },
      });

      expect(invAfter).toBeDefined();
      expect(invAfter!.availableQty).toBe(qtyBefore + 50);
    });

    // PO-INT-50: Receive multiple times with multiple items
    it('PO-INT-50: Should receive multiple times with multiple items', async () => {
      // Add another item
      const item2 = await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: orderedPoId,
          productId: testProductId,
          qtyOrdered: 80,
          qtyReceived: 0,
          unitPrice: 15000,
          lineTotal: 1200000,
        },
      });

      // First receive - partial on both items
      await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              poItemId: poItemId,
              productBatchId: testBatchId,
              locationId: testLocationId,
              qtyToReceive: 50,
              createdById: testUserId,
              idempotencyKey: `idem-multi-a-${Date.now()}`,
            },
            {
              poItemId: item2.id,
              productBatchId: testBatchId,
              locationId: testLocationId,
              qtyToReceive: 40,
              createdById: testUserId,
              idempotencyKey: `idem-multi-b-${Date.now()}`,
            },
          ],
        })
        .expect(201);

      // Second receive - complete both items
      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderedPoId}/receive`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              poItemId: poItemId,
              productBatchId: testBatchId,
              locationId: testLocationId,
              qtyToReceive: 50,
              createdById: testUserId,
              idempotencyKey: `idem-multi-c-${Date.now()}`,
            },
            {
              poItemId: item2.id,
              productBatchId: testBatchId,
              locationId: testLocationId,
              qtyToReceive: 40,
              createdById: testUserId,
              idempotencyKey: `idem-multi-d-${Date.now()}`,
            },
          ],
        })
        .expect(201);

      expect(response.body.status).toBe(PoStatus.received);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0].qtyReceived).toBe(100);
      expect(response.body.items[1].qtyReceived).toBe(80);
    });
  });
});
