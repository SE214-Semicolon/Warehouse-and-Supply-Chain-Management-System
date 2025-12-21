import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { ProcurementModule } from 'src/modules/procurement/procurement.module';
import { PoStatus, UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/modules/auth/auth.module';
import { InventoryModule } from 'src/modules/inventory/inventory.module';
import { DatabaseModule } from 'src/database/database.module';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `po-int-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Purchase Order Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let container: StartedPostgreSqlContainer;
  let originalDatabaseUrl: string | undefined;
  let adminToken: string;
  let managerToken: string;
  let procurementToken: string;
  let staffToken: string;
  let testSupplierId: string;
  let testProductId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Start isolated PostgreSQL container for this test suite
    console.log('🐳 Starting isolated PostgreSQL container for PO tests...');
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('po_test_db')
      .withUsername('po_test_user')
      .withPassword('po_test_pass')
      .withExposedPorts(5432)
      .start();

    const containerUrl = container.getConnectionUri();
    console.log(`✅ Container started: ${containerUrl}`);

    // Save original DATABASE_URL and set new one
    originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = containerUrl;

    // Run migrations on isolated database
    console.log('📦 Running migrations on isolated database...');
    await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: containerUrl },
    });
    console.log('✅ Migrations completed');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
          ignoreEnvFile: false,
        }),
        DatabaseModule,
        AuthModule,
        ProcurementModule,
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
        username: `admin-po-test-${TEST_SUITE_ID}`,
        email: `admin-po-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin PO Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-po-test-${TEST_SUITE_ID}`,
        email: `manager-po-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager PO Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    const procurementUser = await prisma.user.create({
      data: {
        username: `procurement-po-test-${TEST_SUITE_ID}`,
        email: `procurement-po-${TEST_SUITE_ID}@test.com`,
        fullName: 'Procurement PO Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.procurement,
        active: true,
      },
    });

    const staffUser = await prisma.user.create({
      data: {
        username: `staff-po-test-${TEST_SUITE_ID}`,
        email: `staff-po-${TEST_SUITE_ID}@test.com`,
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
        code: `SUP-PO-${TEST_SUITE_ID}`,
        name: `Test Supplier for PO ${TEST_SUITE_ID}`,
        contactInfo: { phone: '0901234567' },
      },
    });
    testSupplierId = supplier.id;

    // Create test product category
    const category = await prisma.productCategory.create({
      data: {
        name: `PO-Test-Category-${TEST_SUITE_ID}`,
      },
    });

    // Create test product
    const product = await prisma.product.create({
      data: {
        sku: `SKU-PO-${TEST_SUITE_ID}`,
        name: `Test Product for PO ${TEST_SUITE_ID}`,
        unit: 'pcs',
        categoryId: category.id,
      },
    });
    testProductId = product.id;
  }, 60000);

  afterAll(async () => {
    console.log('🧹 Cleaning up isolated container...');
    await cleanDatabase();
    await prisma.$disconnect();
    await app.close();

    // Stop and remove container
    await container.stop();

    // Restore original DATABASE_URL
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    console.log('✅ Cleanup completed');
  }, 30000);

  async function cleanDatabase() {
    await prisma.stockMovement.deleteMany({
      where: { productBatch: { product: { sku: { contains: TEST_SUITE_ID } } } },
    });
    await prisma.inventory.deleteMany({
      where: { location: { warehouse: { code: { contains: TEST_SUITE_ID } } } },
    });
    // Delete order items from this test suite (by PO supplier OR by Product)
    await prisma.purchaseOrderItem.deleteMany({
      where: {
        OR: [
          {
            purchaseOrder: {
              supplier: { code: { contains: TEST_SUITE_ID } },
            },
          },
          {
            product: { sku: { contains: TEST_SUITE_ID } },
          },
        ],
      },
    });
    await prisma.purchaseOrder.deleteMany({
      where: {
        supplier: { code: { contains: TEST_SUITE_ID } },
      },
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
    await prisma.supplier.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
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

      expect(response.body.data.status).toBe(PoStatus.draft);
      expect(response.body.data.poNo).toMatch(/^PO-\d{6}-[A-Z0-9]{6}$/);
      expect(response.body.data.supplierId).toBe(testSupplierId);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].qtyOrdered).toBe(10);
      expect(Number(response.body.data.totalAmount)).toBe(500000);
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

      expect(response.body.data.supplierId).toBeNull();
      expect(response.body.data.status).toBe(PoStatus.draft);
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

      expect(response.body.data.items).toEqual([]);
      expect(Number(response.body.data.totalAmount)).toBe(0);
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

      expect(response.body.data.items[0].unitPrice).toBeNull();
      expect(response.body.data.items[0].lineTotal).toBeNull();
      expect(Number(response.body.data.totalAmount)).toBe(0);
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

      expect(response.body.data.items).toHaveLength(2);
      expect(Number(response.body.data.totalAmount)).toBe(1100);
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

      expect(new Date(response.body.data.placedAt).getFullYear()).toBe(2020);
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
    let localSupplierId: string;

    beforeEach(async () => {
      // Create supplier for this test
      const supplier = await prisma.supplier.create({
        data: {
          code: `SUP-SUBMIT-${TEST_SUITE_ID}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: `Supplier Submit ${TEST_SUITE_ID}`,
          contactInfo: { phone: '0901234567' },
        },
      });
      localSupplierId = supplier.id;

      const po = await prisma.purchaseOrder.create({
        data: {
          poNo: `PO-TEST-${TEST_SUITE_ID}-${Date.now()}`,
          status: PoStatus.draft,
          supplierId: localSupplierId,
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

      expect(response.body.data.status).toBe(PoStatus.ordered);
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
    let localSupplierId: string;

    beforeAll(async () => {
      // Create supplier for this test
      const supplier = await prisma.supplier.create({
        data: {
          code: `SUP-GET-${TEST_SUITE_ID}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: `Supplier GET ${TEST_SUITE_ID}`,
          contactInfo: { phone: '0901234567' },
        },
      });
      localSupplierId = supplier.id;

      const po = await prisma.purchaseOrder.create({
        data: {
          poNo: `PO-GET-${TEST_SUITE_ID}-${Date.now()}`,
          status: PoStatus.ordered,
          supplierId: localSupplierId,
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

      expect(response.body.data.id).toBe(testPoId);
      expect(response.body.data.status).toBe(PoStatus.ordered);
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
    let localSupplierId: string;

    beforeAll(async () => {
      // Create supplier for this test
      const supplier = await prisma.supplier.create({
        data: {
          code: `SUP-LIST-${TEST_SUITE_ID}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: `Supplier LIST ${TEST_SUITE_ID}`,
          contactInfo: { phone: '0901234567' },
        },
      });
      localSupplierId = supplier.id;

      // Create multiple POs for testing
      await prisma.purchaseOrder.createMany({
        data: [
          {
            poNo: `PO-LIST-001-${TEST_SUITE_ID}`,
            status: PoStatus.draft,
            supplierId: localSupplierId,
            totalAmount: 100000,
            placedAt: new Date('2024-01-10'),
          },
          {
            poNo: `PO-LIST-002-${TEST_SUITE_ID}`,
            status: PoStatus.ordered,
            supplierId: localSupplierId,
            totalAmount: 200000,
            placedAt: new Date('2024-01-15'),
          },
          {
            poNo: `PO-LIST-003-${TEST_SUITE_ID}`,
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
    let testWarehouseId: string;
    let testLocationId: string;
    let localSupplierId: string;
    let localCategoryId: string;

    // Helper function to create fresh PO with dedicated product/batch for each test
    const createOrderedPoWithItem = async () => {
      // Create unique product for this test
      const product = await prisma.product.create({
        data: {
          sku: `SKU-PO-${TEST_SUITE_ID}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: `Product PO Test ${TEST_SUITE_ID}`,
          unit: 'pcs',
          categoryId: localCategoryId,
        },
      });

      // Create batch for this product
      const batch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo: `BATCH-PO-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          quantity: 200,
        },
      });

      // Create PO
      const po = await prisma.purchaseOrder.create({
        data: {
          poNo: `PO-RECEIVE-${TEST_SUITE_ID}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          status: PoStatus.ordered,
          supplierId: localSupplierId,
          totalAmount: 1000000,
        },
      });

      // Create PO item
      const item = await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          productId: product.id,
          qtyOrdered: 100,
          qtyReceived: 0,
          unitPrice: 10000,
          lineTotal: 1000000,
        },
      });

      return {
        poId: po.id,
        itemId: item.id,
        productId: product.id,
        batchId: batch.id,
      };
    };

    beforeAll(async () => {
      // Create warehouse and location for receiving
      const warehouse = await prisma.warehouse.create({
        data: {
          code: `WH-RECEIVE-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: `Warehouse Receive ${TEST_SUITE_ID}`,
        },
      });
      testWarehouseId = warehouse.id;

      const location = await prisma.location.create({
        data: {
          warehouseId: testWarehouseId,
          code: `LOC-RECEIVE-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: `Location Receive ${TEST_SUITE_ID}`,
        },
      });
      testLocationId = location.id;

      // Create supplier for receive tests
      const supplier = await prisma.supplier.create({
        data: {
          code: `SUP-RECEIVE-${TEST_SUITE_ID}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: `Supplier Receive ${TEST_SUITE_ID}`,
          contactInfo: { phone: '0901234567' },
        },
      });
      localSupplierId = supplier.id;

      // Create product category (shared for all products in tests)
      const category = await prisma.productCategory.create({
        data: {
          name: `Category-Receive-${TEST_SUITE_ID}-${Date.now()}`,
        },
      });
      localCategoryId = category.id;
    });

    // PO-INT-31: Receive partial successfully
    it('PO-INT-31: Should receive partial successfully', async () => {
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            productBatchId: batchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-partial-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      expect(response.body.status).toBe(PoStatus.partial);
      expect(response.body.items[0].qtyReceived).toBe(50);
    });

    // PO-INT-32: Receive full successfully
    it('PO-INT-32: Should receive full successfully', async () => {
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            productBatchId: batchId,
            locationId: testLocationId,
            qtyToReceive: 100,
            createdById: testUserId,
            idempotencyKey: `idem-full-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      expect(response.body.status).toBe(PoStatus.received);
      expect(response.body.items[0].qtyReceived).toBe(100);
    });

    // PO-INT-33: Receive multiple times partial → partial
    it('PO-INT-33: Should receive multiple times partial to partial', async () => {
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      // First receive
      await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              poItemId: itemId,
              productBatchId: batchId,
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
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', procurementToken)
        .send({
          items: [
            {
              poItemId: itemId,
              productBatchId: batchId,
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
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      // First receive
      await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              poItemId: itemId,
              productBatchId: batchId,
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
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', managerToken)
        .send({
          items: [
            {
              poItemId: itemId,
              productBatchId: batchId,
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
      const { poId, itemId, productId, batchId } = await createOrderedPoWithItem();

      // Add another item to the PO
      const item2 = await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: poId,
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
            poItemId: itemId,
            productBatchId: batchId,
            locationId: testLocationId,
            qtyToReceive: 100,
            createdById: testUserId,
            idempotencyKey: `idem-multi-1-${Date.now()}`,
          },
          {
            poItemId: item2.id,
            productBatchId: batchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-multi-2-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      expect(response.body.status).toBe(PoStatus.received);
      expect(response.body.items).toHaveLength(2);
    });

    // PO-INT-36: Receive exceeds ordered quantity
    it('PO-INT-36: Should return 400 when receive exceeds ordered quantity', async () => {
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            productBatchId: batchId,
            locationId: testLocationId,
            qtyToReceive: 150,
            createdById: testUserId,
            idempotencyKey: `idem-exceed-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);

      expect(response.body.message).toContain('exceeds');
    });

    // PO-INT-37: Receive exceeds with multiple receives
    it('PO-INT-37: Should return 400 when cumulative receive exceeds ordered', async () => {
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      // First receive
      await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              poItemId: itemId,
              productBatchId: batchId,
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
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              poItemId: itemId,
              productBatchId: batchId,
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
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      // Change status to draft
      await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { status: PoStatus.draft },
      });

      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            productBatchId: batchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-status-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);

      expect(response.body.message).toContain('not eligible');
    });

    // PO-INT-39: Receive with invalid poItemId
    it('PO-INT-39: Should return 400 with invalid poItemId', async () => {
      const { poId, batchId } = await createOrderedPoWithItem();

      const receiveDto = {
        items: [
          {
            poItemId: '00000000-0000-0000-0000-000000000000',
            productBatchId: batchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-invalid-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);

      expect(response.body.message).toContain('not found');
    });

    // PO-INT-40: Receive without items array
    it('PO-INT-40: Should return 400 without items array', async () => {
      const { poId } = await createOrderedPoWithItem();

      await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send({})
        .expect(400);
    });

    // PO-INT-41: Receive with duplicate idempotencyKey (idempotent)
    it('PO-INT-41: Should handle duplicate idempotencyKey (idempotent)', async () => {
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      const idempotencyKey = `idem-dup-${Date.now()}`;
      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            productBatchId: batchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: idempotencyKey,
          },
        ],
      };

      // First receive
      const firstResponse = await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
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
        .post(`/purchase-orders/${poId}/receive`)
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
      const { itemId, batchId } = await createOrderedPoWithItem();

      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            productBatchId: batchId,
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
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            productBatchId: batchId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-no-loc-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);
    });

    // PO-INT-44: Receive without productBatchId (tested by DTO)
    it('PO-INT-44: Should return 400 without productBatchId', async () => {
      const { poId, itemId } = await createOrderedPoWithItem();

      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-no-batch-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);
    });

    // PO-INT-45: Receive without createdById (tested by DTO)
    it('PO-INT-45: Should return 400 without createdById', async () => {
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            productBatchId: batchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            idempotencyKey: `idem-no-user-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);
    });

    // PO-INT-46: Receive without idempotencyKey (tested by DTO)
    it('PO-INT-46: Should return 400 without idempotencyKey', async () => {
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            productBatchId: batchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(400);
    });

    // PO-INT-47: warehouse_staff CAN receive (allowed by controller)
    it('PO-INT-47: Should allow warehouse_staff to receive PO', async () => {
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            productBatchId: batchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-perm-${Date.now()}`,
          },
        ],
      };

      // warehouse_staff IS allowed to receive per controller @Roles decorator
      await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', staffToken)
        .send(receiveDto)
        .expect(201);
    });

    // PO-INT-48: No authentication
    it('PO-INT-48: Should return 401 without authentication', async () => {
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            productBatchId: batchId,
            locationId: testLocationId,
            qtyToReceive: 50,
            createdById: testUserId,
            idempotencyKey: `idem-auth-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .send(receiveDto)
        .expect(401);
    });

    // PO-INT-49: Inventory integration verified
    it('PO-INT-49: Should verify inventory increases after receiving', async () => {
      const { poId, itemId, batchId } = await createOrderedPoWithItem();

      const receiveDto = {
        items: [
          {
            poItemId: itemId,
            productBatchId: batchId,
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
            productBatchId: batchId,
            locationId: testLocationId,
          },
        },
      });
      const qtyBefore = invBefore?.availableQty ?? 0;

      // Receive
      await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send(receiveDto)
        .expect(201);

      // Check inventory after
      const invAfter = await prisma.inventory.findUnique({
        where: {
          productBatchId_locationId: {
            productBatchId: batchId,
            locationId: testLocationId,
          },
        },
      });

      expect(invAfter).toBeDefined();
      expect(invAfter!.availableQty).toBe(qtyBefore + 50);
    });

    // PO-INT-50: Receive multiple times with multiple items
    it('PO-INT-50: Should receive multiple times with multiple items', async () => {
      const { poId, itemId, productId, batchId } = await createOrderedPoWithItem();

      // Add another item
      const item2 = await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: poId,
          productId: testProductId,
          qtyOrdered: 80,
          qtyReceived: 0,
          unitPrice: 15000,
          lineTotal: 1200000,
        },
      });

      // First receive - partial on both items
      await request(app.getHttpServer())
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              poItemId: itemId,
              productBatchId: batchId,
              locationId: testLocationId,
              qtyToReceive: 50,
              createdById: testUserId,
              idempotencyKey: `idem-multi-a-${Date.now()}`,
            },
            {
              poItemId: item2.id,
              productBatchId: batchId,
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
        .post(`/purchase-orders/${poId}/receive`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              poItemId: itemId,
              productBatchId: batchId,
              locationId: testLocationId,
              qtyToReceive: 50,
              createdById: testUserId,
              idempotencyKey: `idem-multi-c-${Date.now()}`,
            },
            {
              poItemId: item2.id,
              productBatchId: batchId,
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

  describe('INTEGRATION-ORDER-01: Core CRUD Operations', () => {
    let orderId: string;

    it('should create order with all fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({
          supplierId: testSupplierId,
          expectedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Sanity test order',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.supplierId).toBe(testSupplierId);
      orderId = response.body.data.id;
    });

    it('should retrieve order by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/purchase-orders/${orderId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', orderId);
      expect(response.body.data.supplierId).toBe(testSupplierId);
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
          userId: testUserId,
        })
        .expect(201);

      expect(response.body.data.status).toBe('ordered');
    });
  });

  describe('INTEGRATION-ORDER-02: Validation Rules', () => {
    it('should create order without supplier', async () => {
      const response = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({
          notes: 'Order without supplier',
        })
        .expect(201);

      expect(response.body.data.supplierId).toBeNull();
    });

    it('should reject invalid date format', async () => {
      await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({
          supplierId: testSupplierId,
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

  describe('INTEGRATION-ORDER-03: Authorization', () => {
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
          supplierId: testSupplierId,
          notes: 'Procurement test order',
        })
        .expect(201);
    });
  });

  describe('INTEGRATION-ORDER-04: Error Handling', () => {
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
          userId: testUserId,
        })
        .expect(404);
    });
  });

  describe('INTEGRATION-ORDER-05: Filter by Supplier', () => {
    it('should filter orders by supplier', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchase-orders')
        .query({ supplierId: testSupplierId })
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((order: any) => {
        expect(order.supplierId).toBe(testSupplierId);
      });
    });
  });

  describe('INTEGRATION-ORDER-06: Update PO', () => {
    let draftPoId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({
          supplierId: testSupplierId,
          notes: 'Draft for update test',
        })
        .expect(201);

      draftPoId = res.body.data.id;
    });

    it('should update draft PO details', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/purchase-orders/${draftPoId}`)
        .set('Authorization', adminToken)
        .send({
          notes: 'Updated notes',
          expectedArrival: '2025-12-31',
        })
        .expect(200);

      expect(response.body.notes).toBe('Updated notes');
    });

    it('should not update non-draft PO', async () => {
      // Submit PO first
      await request(app.getHttpServer())
        .post(`/purchase-orders/${draftPoId}/submit`)
        .set('Authorization', adminToken)
        .send({ userId: testUserId })
        .expect(201);

      // Try to update
      await request(app.getHttpServer())
        .patch(`/purchase-orders/${draftPoId}`)
        .set('Authorization', adminToken)
        .send({ notes: 'Should fail' })
        .expect(400);
    });
  });

  describe('INTEGRATION-ORDER-07: Cancel PO', () => {
    let cancelPoId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({
          supplierId: testSupplierId,
          notes: 'PO for cancel test',
        })
        .expect(201);

      cancelPoId = res.body.data.id;

      await request(app.getHttpServer())
        .post(`/purchase-orders/${cancelPoId}/submit`)
        .set('Authorization', adminToken)
        .send({ userId: testUserId })
        .expect(201);
    });

    it('should cancel submitted PO', async () => {
      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${cancelPoId}/cancel`)
        .set('Authorization', adminToken)
        .send({
          userId: testUserId,
          reason: 'Supplier delayed',
        })
        .expect(201);

      expect(response.body.status).toBe('cancelled');
    });

    it('should require userId for cancel', async () => {
      const res = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({ supplierId: testSupplierId })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/purchase-orders/${res.body.data.id}/cancel`)
        .set('Authorization', adminToken)
        .send({ reason: 'Test' })
        .expect(400);
    });
  });

  describe('INTEGRATION-ORDER-08: Add/Remove Items', () => {
    let itemsPoId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({
          supplierId: testSupplierId,
          notes: 'PO for items test',
        })
        .expect(201);

      itemsPoId = res.body.data.id;
    });

    it('should add items to draft PO', async () => {
      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${itemsPoId}/items`)
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              productId: testProductId,
              qtyOrdered: 100,
              unitPrice: 50,
              remark: 'Test item',
            },
          ],
        })
        .expect(201);

      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('should not add items to non-draft PO', async () => {
      await request(app.getHttpServer())
        .post(`/purchase-orders/${itemsPoId}/submit`)
        .set('Authorization', adminToken)
        .send({ userId: testUserId })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/purchase-orders/${itemsPoId}/items`)
        .set('Authorization', adminToken)
        .send({
          items: [{ productId: testProductId, qtyOrdered: 50 }],
        })
        .expect(400);
    });

    it('should remove items from draft PO', async () => {
      // Create new draft with item
      const draftRes = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({ supplierId: testSupplierId })
        .expect(201);

      const newPoId = draftRes.body.data.id;

      const addRes = await request(app.getHttpServer())
        .post(`/purchase-orders/${newPoId}/items`)
        .set('Authorization', adminToken)
        .send({
          items: [{ productId: testProductId, qtyOrdered: 100 }],
        })
        .expect(201);

      const itemId = addRes.body.items[0].id;

      // Remove item
      await request(app.getHttpServer())
        .delete(`/purchase-orders/${newPoId}/items`)
        .set('Authorization', adminToken)
        .send({ itemIds: [itemId] })
        .expect(200);
    });
  });
});
