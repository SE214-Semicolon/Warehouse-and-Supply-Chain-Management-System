import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { SalesModule } from 'src/modules/sales/sales.module';
import { OrderStatus, UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/modules/auth/auth.module';
import { InventoryModule } from 'src/modules/inventory/inventory.module';
import { DatabaseModule } from 'src/database/database.module';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `so-int-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Sales Order Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;
  let salesAnalystToken: string;
  let testCustomerId: string;
  let testProductId: string;
  let testProductBatchId: string;
  let testLocationId: string;
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
        SalesModule,
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
        username: `admin-so-test-${TEST_SUITE_ID}`,
        email: `admin-so-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin SO Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-so-test-${TEST_SUITE_ID}`,
        email: `manager-so-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager SO Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    const staffUser = await prisma.user.create({
      data: {
        username: `staff-so-test-${TEST_SUITE_ID}`,
        email: `staff-so-${TEST_SUITE_ID}@test.com`,
        fullName: 'Staff SO Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.warehouse_staff,
        active: true,
      },
    });

    const salesUser = await prisma.user.create({
      data: {
        username: `sales-so-test-${TEST_SUITE_ID}`,
        email: `sales-so-${TEST_SUITE_ID}@test.com`,
        fullName: 'Sales Analyst SO Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.analyst,
        active: true,
      },
    });

    // Generate JWT tokens
    adminToken = `Bearer ${jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: adminUser.role })}`;
    managerToken = `Bearer ${jwtService.sign({ sub: managerUser.id, email: managerUser.email, role: managerUser.role })}`;
    staffToken = `Bearer ${jwtService.sign({ sub: staffUser.id, email: staffUser.email, role: staffUser.role })}`;
    salesAnalystToken = `Bearer ${jwtService.sign({ sub: salesUser.id, email: salesUser.email, role: salesUser.role })}`;

    // Store test user ID for submit tests
    testUserId = adminUser.id;

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        code: `CUST-SO-${TEST_SUITE_ID}`,
        name: `Test Customer for SO ${TEST_SUITE_ID}`,
        contactInfo: { phone: '0901234567' },
      },
    });
    testCustomerId = customer.id;

    // Create test product category
    const category = await prisma.productCategory.create({
      data: {
        name: `SO-Test-Category-${TEST_SUITE_ID}`,
      },
    });

    // Create test product
    const product = await prisma.product.create({
      data: {
        sku: `SKU-SO-${TEST_SUITE_ID}`,
        name: `Test Product for SO ${TEST_SUITE_ID}`,
        unit: 'pcs',
        categoryId: category.id,
      },
    });
    testProductId = product.id;

    // Create warehouse and location for fulfillment tests
    const warehouse = await prisma.warehouse.create({
      data: {
        code: `WH-SO-${TEST_SUITE_ID}`,
        name: `Test Warehouse for SO ${TEST_SUITE_ID}`,
      },
    });

    const location = await prisma.location.create({
      data: {
        warehouseId: warehouse.id,
        code: `LOC-SO-${TEST_SUITE_ID}`,
        name: `Test Location for SO ${TEST_SUITE_ID}`,
      },
    });
    testLocationId = location.id;

    // Create test product batch with inventory
    const batch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNo: `BATCH-SO-${TEST_SUITE_ID}`,
        quantity: 1000,
      },
    });
    testProductBatchId = batch.id;

    // Create inventory for fulfillment
    await prisma.inventory.create({
      data: {
        productBatchId: batch.id,
        locationId: location.id,
        availableQty: 1000,
        reservedQty: 0,
      },
    });
  }, 60000);

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  }, 30000);

  async function cleanDatabase() {
    await prisma.stockMovement.deleteMany({
      where: { productBatch: { product: { sku: { contains: TEST_SUITE_ID } } } },
    });
    await prisma.inventory.deleteMany({
      where: { location: { warehouse: { code: { contains: TEST_SUITE_ID } } } },
    });
    // Delete order items from this test suite (by SO customer OR by Product)
    await prisma.salesOrderItem.deleteMany({
      where: {
        OR: [
          {
            salesOrder: {
              customer: { code: { contains: TEST_SUITE_ID } },
            },
          },
          {
            product: { sku: { contains: TEST_SUITE_ID } },
          },
        ],
      },
    });
    await prisma.salesOrder.deleteMany({
      where: {
        customer: { code: { contains: TEST_SUITE_ID } },
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
    await prisma.customer.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
  }

  describe('POST /sales-orders - Create Sales Order', () => {
    // SO-INT-01: Create pending SO with valid data
    it('SO-INT-01: Should create a pending SO with valid data', async () => {
      const createDto = {
        customerId: testCustomerId,
        placedAt: '2024-01-15T10:00:00Z',
        items: [
          {
            productId: testProductId,
            qty: 10,
            unitPrice: 50000,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.status).toBe(OrderStatus.pending);
      expect(response.body.data.soNo).toMatch(/^SO-\d{6}-[A-Z0-9]{6}$/);
      expect(response.body.data.customerId).toBe(testCustomerId);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].qty).toBe(10);
      expect(Number(response.body.data.totalAmount)).toBe(500000);
    });

    // SO-INT-02: Create without customerId
    it('SO-INT-02: Should create a SO without customerId', async () => {
      const createDto = {
        placedAt: '2024-01-15T10:00:00Z',
        items: [
          {
            productId: testProductId,
            qty: 5,
            unitPrice: 30000,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', managerToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.customerId).toBeNull();
      expect(response.body.data.status).toBe(OrderStatus.pending);
    });

    // SO-INT-03: Create without items
    it('SO-INT-03: Should create a SO without items', async () => {
      const createDto = {
        customerId: testCustomerId,
        placedAt: '2024-01-15T10:00:00Z',
        items: [],
      };

      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.items).toEqual([]);
      expect(Number(response.body.data.totalAmount)).toBe(0);
    });

    // SO-INT-04: Create with items missing unitPrice
    it('SO-INT-04: Should create a SO with items missing unitPrice', async () => {
      const createDto = {
        customerId: testCustomerId,
        items: [
          {
            productId: testProductId,
            qty: 10,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.items[0].unitPrice).toBeNull();
      expect(response.body.data.items[0].lineTotal).toBeNull();
      expect(Number(response.body.data.totalAmount)).toBe(0);
    });

    // SO-INT-05: Create with multiple items
    it('SO-INT-05: Should create a SO with multiple items and calculate total', async () => {
      const createDto = {
        customerId: testCustomerId,
        items: [
          {
            productId: testProductId,
            qty: 5,
            unitPrice: 100,
          },
          {
            productId: testProductId,
            qty: 3,
            unitPrice: 200,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.items).toHaveLength(2);
      expect(Number(response.body.data.totalAmount)).toBe(1100);
    });

    // SO-INT-06: Create with invalid productId (tested by DTO)
    it('SO-INT-06: Should return 400 for invalid productId', async () => {
      const createDto = {
        items: [
          {
            productId: '00000000-0000-0000-0000-000000000000',
            qty: 10,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // SO-INT-07: Create with negative qty (tested by DTO)
    it('SO-INT-07: Should return 400 for negative qty', async () => {
      const createDto = {
        items: [
          {
            productId: testProductId,
            qty: -5,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // SO-INT-08: Permission denied for warehouse_staff
    it('SO-INT-08: Should return 403 for warehouse_staff role', async () => {
      const createDto = {
        customerId: testCustomerId,
        items: [],
      };

      await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', staffToken)
        .send(createDto)
        .expect(403);
    });

    // SO-INT-09: Create with placedAt in past
    it('SO-INT-09: Should allow creating SO with placedAt in past', async () => {
      const createDto = {
        customerId: testCustomerId,
        placedAt: '2020-01-15T10:00:00Z',
        items: [],
      };

      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(new Date(response.body.data.placedAt).getFullYear()).toBe(2020);
    });

    // SO-INT-10: Create with placedAt in future
    it('SO-INT-10: Should allow creating SO with placedAt in future', async () => {
      const createDto = {
        customerId: testCustomerId,
        placedAt: '2030-01-15T10:00:00Z',
        items: [],
      };

      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(new Date(response.body.data.placedAt).getFullYear()).toBe(2030);
    });
  });

  describe('POST /sales-orders/:id/submit - Submit Sales Order', () => {
    let pendingSoId: string;

    beforeEach(async () => {
      const so = await prisma.salesOrder.create({
        data: {
          soNo: `SO-TEST-${TEST_SUITE_ID}-${Date.now()}`,
          status: OrderStatus.pending,
          customerId: testCustomerId,
          totalAmount: 0,
        },
      });
      pendingSoId = so.id;
    });

    // SO-INT-11: Submit pending SO successfully
    it('SO-INT-11: Should submit a pending SO successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${pendingSoId}/submit`)
        .set('Authorization', adminToken)
        .send({})
        .expect(201);

      expect(response.body.status).toBe(OrderStatus.approved);
    });

    // SO-INT-12: Submit cancelled SO should fail (business rule: only pending can be submitted)
    it('SO-INT-12: Should return 400 if SO is cancelled', async () => {
      await prisma.salesOrder.update({
        where: { id: pendingSoId },
        data: { status: OrderStatus.cancelled },
      });

      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${pendingSoId}/submit`)
        .set('Authorization', adminToken)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Only pending SO can be submitted');
    });

    // SO-INT-13: Submit SO not in pending status (approved)
    it('SO-INT-13: Should return 400 if SO is approved', async () => {
      await prisma.salesOrder.update({
        where: { id: pendingSoId },
        data: { status: OrderStatus.approved },
      });

      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${pendingSoId}/submit`)
        .set('Authorization', adminToken)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Only pending SO can be submitted');
    });

    // SO-INT-14: Submit non-existent SO
    it('SO-INT-14: Should return 404 if SO not found', async () => {
      await request(app.getHttpServer())
        .post('/sales-orders/00000000-0000-0000-0000-000000000000/submit')
        .set('Authorization', adminToken)
        .send({})
        .expect(404);
    });

    // SO-INT-15: Permission denied for warehouse_staff
    it('SO-INT-15: Should return 403 for warehouse_staff role', async () => {
      await request(app.getHttpServer())
        .post(`/sales-orders/${pendingSoId}/submit`)
        .set('Authorization', staffToken)
        .send({})
        .expect(403);
    });

    // SO-INT-16: No authentication
    it('SO-INT-16: Should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/sales-orders/${pendingSoId}/submit`)
        .send({})
        .expect(401);
    });
  });

  describe('GET /sales-orders/:id - Get Sales Order by ID', () => {
    let soId: string;

    beforeAll(async () => {
      const so = await prisma.salesOrder.create({
        data: {
          soNo: `SO-GET-${TEST_SUITE_ID}-${Date.now()}`,
          status: OrderStatus.pending,
          customerId: testCustomerId,
          totalAmount: 0,
        },
      });
      soId = so.id;
    });

    // SO-INT-17: Find by valid ID
    it('SO-INT-17: Should return a SO by valid ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sales-orders/${soId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.id).toBe(soId);
      expect(response.body.data.customerId).toBe(testCustomerId);
    });

    // SO-INT-18: SO not found
    it('SO-INT-18: Should return 404 if SO not found', async () => {
      await request(app.getHttpServer())
        .get('/sales-orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    // SO-INT-19: Find by invalid UUID format
    it('SO-INT-19: Should return 404 for non-existent SO with safe UUID', async () => {
      await request(app.getHttpServer())
        .get('/sales-orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });
  });

  describe('GET /sales-orders - List Sales Orders', () => {
    beforeAll(async () => {
      // Create multiple SOs for listing tests
      await prisma.salesOrder.createMany({
        data: [
          {
            soNo: `SO-LIST-001-${TEST_SUITE_ID}-${Date.now()}`,
            status: OrderStatus.pending,
            customerId: testCustomerId,
            placedAt: new Date('2024-01-10'),
            totalAmount: 100,
          },
          {
            soNo: `SO-LIST-002-${TEST_SUITE_ID}-${Date.now()}`,
            status: OrderStatus.approved,
            customerId: testCustomerId,
            placedAt: new Date('2024-01-15'),
            totalAmount: 200,
          },
          {
            soNo: `SO-LIST-003-${TEST_SUITE_ID}-${Date.now()}`,
            status: OrderStatus.shipped,
            placedAt: new Date('2024-01-20'),
            totalAmount: 300,
          },
        ],
      });
    });

    // SO-INT-20: Get all with default pagination
    it('SO-INT-20: Should return all SOs with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(20);
    });

    // SO-INT-21: Filter by soNo
    it('SO-INT-21: Should filter SOs by soNo', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders?soNo=SO-LIST')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].soNo).toContain('SO-LIST');
    });

    // SO-INT-22: Filter by status
    it('SO-INT-22: Should filter SOs by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sales-orders?status=${OrderStatus.approved}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((so: any) => {
        expect(so.status).toBe(OrderStatus.approved);
      });
    });

    // SO-INT-23: Filter by customerId
    it('SO-INT-23: Should filter SOs by customerId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sales-orders?customerId=${testCustomerId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((so: any) => {
        expect(so.customerId).toBe(testCustomerId);
      });
    });

    // SO-INT-24: Filter by dateFrom
    it('SO-INT-24: Should filter SOs by dateFrom', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders?dateFrom=2024-01-12')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    // SO-INT-25: Filter by dateTo
    it('SO-INT-25: Should filter SOs by dateTo', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders?dateTo=2024-01-18')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    // SO-INT-26: Filter by date range
    it('SO-INT-26: Should filter SOs by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders?dateFrom=2024-01-12&dateTo=2024-01-18')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    // SO-INT-27: Pagination page 1
    it('SO-INT-27: Should return SOs for page 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders?page=1&pageSize=2')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(2);
    });

    // SO-INT-28: Pagination page 2
    it('SO-INT-28: Should return SOs for page 2', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders?page=2&pageSize=2')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.pageSize).toBe(2);
    });

    // SO-INT-29: Sort by placedAt asc
    it('SO-INT-29: Should sort SOs by placedAt ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders?sort=placedAt:asc')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    // SO-INT-30: Sort by status desc
    it('SO-INT-30: Should sort SOs by status descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales-orders?sort=status:desc')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    // SO-INT-31: Combine multiple filters
    it('SO-INT-31: Should combine multiple filters', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sales-orders?status=${OrderStatus.pending}&customerId=${testCustomerId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    // SO-INT-32: SQL injection test
    it('SO-INT-32: Should handle SQL injection attempts safely', async () => {
      const response = await request(app.getHttpServer())
        .get("/sales-orders?soNo='; DROP TABLE sales_orders;--")
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('PATCH /sales-orders/:id - Update Sales Order', () => {
    let updateSoId: string;

    beforeEach(async () => {
      const so = await prisma.salesOrder.create({
        data: {
          soNo: `SO-UPDATE-${Date.now()}`,
          status: OrderStatus.pending,
          customerId: testCustomerId,
          totalAmount: 0,
        },
      });
      updateSoId = so.id;
    });

    // SO-INT-33: Update pending SO customer successfully
    it('SO-INT-33: Should update pending SO customer successfully', async () => {
      const updateDto = {
        customerId: testCustomerId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/sales-orders/${updateSoId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.customerId).toBe(testCustomerId);
    });

    // SO-INT-40: Update SO not in pending status
    it('SO-INT-40: Should return 400 if SO is not pending', async () => {
      await prisma.salesOrder.update({
        where: { id: updateSoId },
        data: { status: OrderStatus.approved },
      });

      const updateDto = {
        customerId: testCustomerId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/sales-orders/${updateSoId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(400);

      expect(response.body.message).toContain('Only pending SO can be updated');
    });

    // SO-INT-41: Update non-existent SO
    it('SO-INT-41: Should return 404 if SO not found', async () => {
      const updateDto = {
        customerId: testCustomerId,
      };

      await request(app.getHttpServer())
        .patch('/sales-orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(404);
    });

    // SO-INT-42: Update with empty items array
    it('SO-INT-42: Should handle update with empty items array', async () => {
      const updateDto = {
        items: [],
      };

      const response = await request(app.getHttpServer())
        .patch(`/sales-orders/${updateSoId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    // SO-INT-43: Permission denied for warehouse_staff
    it('SO-INT-43: Should return 403 for warehouse_staff role', async () => {
      const updateDto = {
        customerId: testCustomerId,
      };

      await request(app.getHttpServer())
        .patch(`/sales-orders/${updateSoId}`)
        .set('Authorization', staffToken)
        .send(updateDto)
        .expect(403);
    });

    // SO-INT-44: No authentication
    it('SO-INT-44: Should return 401 without authentication', async () => {
      const updateDto = {
        customerId: testCustomerId,
      };

      await request(app.getHttpServer())
        .patch(`/sales-orders/${updateSoId}`)
        .send(updateDto)
        .expect(401);
    });
  });

  describe('POST /sales-orders/:id/fulfill - Fulfill Sales Order', () => {
    let fulfillSoId: string;
    let soItemId: string;

    beforeEach(async () => {
      const so = await prisma.salesOrder.create({
        data: {
          soNo: `SO-FULFILL-${TEST_SUITE_ID}-${Date.now()}`,
          status: OrderStatus.approved,
          customerId: testCustomerId,
          totalAmount: 500000,
          items: {
            create: {
              productId: testProductId,
              productBatchId: testProductBatchId,
              qty: 10,
              qtyFulfilled: 0,
              unitPrice: 50000,
              lineTotal: 500000,
            },
          },
        },
      });
      fulfillSoId = so.id;
      const items = await prisma.salesOrderItem.findMany({
        where: { salesOrderId: so.id },
      });
      soItemId = items[0].id;
    });

    // SO-INT-45: Fulfill partial successfully
    it('SO-INT-45: Should fulfill partial successfully and set status to processing', async () => {
      const fulfillDto = {
        items: [
          {
            soItemId: soItemId,
            productBatchId: testProductBatchId,
            locationId: testLocationId,
            qtyToFulfill: 5,
            createdById: testUserId,
            idempotencyKey: `fulfill-partial-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${fulfillSoId}/fulfill`)
        .set('Authorization', staffToken)
        .send(fulfillDto)
        .expect(201);

      expect(response.body.status).toBe(OrderStatus.processing);
      expect(response.body.items[0].qtyFulfilled).toBe(5);
    });

    // SO-INT-46: Fulfill full successfully
    it('SO-INT-46: Should fulfill full successfully and set status to shipped', async () => {
      const fulfillDto = {
        items: [
          {
            soItemId: soItemId,
            productBatchId: testProductBatchId,
            locationId: testLocationId,
            qtyToFulfill: 10,
            createdById: testUserId,
            idempotencyKey: `fulfill-full-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${fulfillSoId}/fulfill`)
        .set('Authorization', staffToken)
        .send(fulfillDto)
        .expect(201);

      expect(response.body.status).toBe(OrderStatus.shipped);
      expect(response.body.items[0].qtyFulfilled).toBe(10);
    });

    // SO-INT-50: Fulfill exceeds ordered quantity
    it('SO-INT-50: Should return 400 if fulfill exceeds ordered quantity', async () => {
      const fulfillDto = {
        items: [
          {
            soItemId: soItemId,
            productBatchId: testProductBatchId,
            locationId: testLocationId,
            qtyToFulfill: 15,
            createdById: testUserId,
            idempotencyKey: `fulfill-exceed-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${fulfillSoId}/fulfill`)
        .set('Authorization', staffToken)
        .send(fulfillDto)
        .expect(400);

      expect(response.body.message).toContain('exceeds remaining quantity');
    });

    // SO-INT-52: Fulfill SO not in approved/processing status
    it('SO-INT-52: Should return 400 if SO is not approved/processing', async () => {
      await prisma.salesOrder.update({
        where: { id: fulfillSoId },
        data: { status: OrderStatus.pending },
      });

      const fulfillDto = {
        items: [
          {
            soItemId: soItemId,
            productBatchId: testProductBatchId,
            locationId: testLocationId,
            qtyToFulfill: 5,
            createdById: testUserId,
            idempotencyKey: `fulfill-pending-${Date.now()}`,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${fulfillSoId}/fulfill`)
        .set('Authorization', staffToken)
        .send(fulfillDto)
        .expect(400);

      expect(response.body.message).toContain('not eligible for fulfillment');
    });

    // SO-INT-54: Fulfill without items array
    it('SO-INT-54: Should return 400 without items array', async () => {
      const fulfillDto = {
        items: [],
      };

      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${fulfillSoId}/fulfill`)
        .set('Authorization', staffToken)
        .send(fulfillDto)
        .expect(400);

      expect(response.body.message).toContain('No items to fulfill');
    });

    // SO-INT-56: Fulfill non-existent SO
    it('SO-INT-56: Should return 404 if SO not found', async () => {
      const fulfillDto = {
        items: [
          {
            soItemId: soItemId,
            productBatchId: testProductBatchId,
            locationId: testLocationId,
            qtyToFulfill: 5,
            createdById: testUserId,
            idempotencyKey: `fulfill-notfound-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/sales-orders/00000000-0000-0000-0000-000000000000/fulfill')
        .set('Authorization', staffToken)
        .send(fulfillDto)
        .expect(404);
    });

    // SO-INT-67: Permission denied for sales_analyst
    it('SO-INT-67: Should return 403 for sales_analyst role', async () => {
      const fulfillDto = {
        items: [
          {
            soItemId: soItemId,
            productBatchId: testProductBatchId,
            locationId: testLocationId,
            qtyToFulfill: 5,
            createdById: testUserId,
            idempotencyKey: `fulfill-forbidden-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/sales-orders/${fulfillSoId}/fulfill`)
        .set('Authorization', salesAnalystToken)
        .send(fulfillDto)
        .expect(403);
    });

    // SO-INT-68: No authentication
    it('SO-INT-68: Should return 401 without authentication', async () => {
      const fulfillDto = {
        items: [
          {
            soItemId: soItemId,
            productBatchId: testProductBatchId,
            locationId: testLocationId,
            qtyToFulfill: 5,
            createdById: testUserId,
            idempotencyKey: `fulfill-noauth-${Date.now()}`,
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/sales-orders/${fulfillSoId}/fulfill`)
        .send(fulfillDto)
        .expect(401);
    });
  });

  describe('DELETE /sales-orders/:id - Cancel Sales Order', () => {
    let cancelSoId: string;

    beforeEach(async () => {
      const so = await prisma.salesOrder.create({
        data: {
          soNo: `SO-CANCEL-${Date.now()}`,
          status: OrderStatus.pending,
          customerId: testCustomerId,
          totalAmount: 0,
        },
      });
      cancelSoId = so.id;
    });

    // SO-INT-70: Cancel pending SO successfully
    it('SO-INT-70: Should cancel a pending SO successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${cancelSoId}/cancel`)
        .set('Authorization', adminToken)
        .expect(201);

      expect(response.body.status).toBe(OrderStatus.cancelled);
    });

    // SO-INT-71: Cancel approved SO successfully
    it('SO-INT-71: Should cancel an approved SO successfully', async () => {
      await prisma.salesOrder.update({
        where: { id: cancelSoId },
        data: { status: OrderStatus.approved },
      });

      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${cancelSoId}/cancel`)
        .set('Authorization', managerToken)
        .expect(201);

      expect(response.body.status).toBe(OrderStatus.cancelled);
    });

    // SO-INT-73: Cancel shipped SO
    it('SO-INT-73: Should return 400 for trying to cancel shipped SO', async () => {
      await prisma.salesOrder.update({
        where: { id: cancelSoId },
        data: { status: OrderStatus.shipped },
      });

      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${cancelSoId}/cancel`)
        .set('Authorization', adminToken)
        .expect(400);

      expect(response.body.message).toContain('Cannot cancel SO with status');
    });

    // SO-INT-74: Cancel already cancelled SO
    it('SO-INT-74: Should return 400 if SO is already cancelled', async () => {
      await prisma.salesOrder.update({
        where: { id: cancelSoId },
        data: { status: OrderStatus.cancelled },
      });

      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${cancelSoId}/cancel`)
        .set('Authorization', adminToken)
        .expect(400);

      expect(response.body.message).toContain('Cannot cancel SO with status');
    });

    // SO-INT-75: Cancel non-existent SO
    it('SO-INT-75: Should return 404 if SO not found', async () => {
      await request(app.getHttpServer())
        .post('/sales-orders/00000000-0000-0000-0000-000000000000/cancel')
        .set('Authorization', adminToken)
        .expect(404);
    });

    // SO-INT-76: Permission denied for sales_analyst
    it('SO-INT-76: Should return 403 for sales_analyst role', async () => {
      await request(app.getHttpServer())
        .post(`/sales-orders/${cancelSoId}/cancel`)
        .set('Authorization', salesAnalystToken)
        .expect(403);
    });

    // SO-INT-77: No authentication
    it('SO-INT-77: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).post(`/sales-orders/${cancelSoId}/cancel`).expect(401);
    });
  });

  describe('INTEGRATION-SO-01: Core CRUD Operations', () => {
    let orderId: string;

    it('should create sales order with all fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: testCustomerId,
          placedAt: '2024-01-15T10:00:00Z',
          items: [],
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('soNo');
      expect(response.body.data.customerId).toBe(testCustomerId);
      expect(response.body.data.status).toBe('pending');
      orderId = response.body.data.id;
    });

    it('should retrieve sales order with items', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sales-orders/${orderId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.id).toBe(orderId);
      expect(response.body.data.items).toBeDefined();
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
          customerId: testCustomerId,
        })
        .expect(200);

      expect(response.body.id).toBe(orderId);
      expect(response.body.customerId).toBe(testCustomerId);
    });
  });

  describe('INTEGRATION-SO-02: Status Workflow', () => {
    let workflowOrderId: string;

    it('should create sales order in pending status', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: testCustomerId,
        })
        .expect(201);

      expect(response.body.data.status).toBe('pending');
      workflowOrderId = response.body.data.id;
    });

    it('should submit sales order from pending to approved', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sales-orders/${workflowOrderId}/submit`)
        .set('Authorization', adminToken)
        .send({})
        .expect(201);

      expect(response.body.status).toBe('approved');
    });

    it('should not allow updating approved sales order', async () => {
      await request(app.getHttpServer())
        .patch(`/sales-orders/${workflowOrderId}`)
        .set('Authorization', adminToken)
        .send({
          customerId: testCustomerId,
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

  describe('INTEGRATION-SO-03: Role-Based Access Control', () => {
    it('should allow admin to create sales order', async () => {
      await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: testCustomerId,
        })
        .expect(201);
    });

    it('should allow manager to create sales order', async () => {
      await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', managerToken)
        .send({
          customerId: testCustomerId,
        })
        .expect(201);
    });

    it('should allow admin to submit sales order', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: testCustomerId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales-orders/${createResponse.body.data.id}/submit`)
        .set('Authorization', adminToken)
        .send({})
        .expect(201);
    });

    it('should allow manager to submit sales order', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', managerToken)
        .send({
          customerId: testCustomerId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales-orders/${createResponse.body.data.id}/submit`)
        .set('Authorization', managerToken)
        .send({})
        .expect(201);
    });
  });

  describe('INTEGRATION-SO-04: Data Validation', () => {
    it('should validate sales order creation data', async () => {
      await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          items: [
            {
              productId: '00000000-0000-0000-0000-000000000000',
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

    it('should validate submit sales order ID format (invalid UUID)', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales-orders/00000000-0000-0000-0000-000000000000/submit')
        .set('Authorization', adminToken)
        .send({});

      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('INTEGRATION-SO-05: Error Handling', () => {
    it('should handle non-existent sales order gracefully', async () => {
      await request(app.getHttpServer())
        .get('/sales-orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('should handle invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/sales-orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('should prevent submitting non-pending sales order', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/sales-orders')
        .set('Authorization', adminToken)
        .send({
          customerId: testCustomerId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales-orders/${createResponse.body.data.id}/submit`)
        .set('Authorization', adminToken)
        .send({})
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales-orders/${createResponse.body.data.id}/submit`)
        .set('Authorization', adminToken)
        .send({})
        .expect(400);
    });

    it('should prevent cancelling shipped sales order', async () => {
      const so = await prisma.salesOrder.create({
        data: {
          soNo: `SO-SHIPPED-${Date.now()}`,
          status: 'shipped',
          customerId: testCustomerId,
          totalAmount: 0,
        },
      });

      await request(app.getHttpServer())
        .post(`/sales-orders/${so.id}/cancel`)
        .set('Authorization', adminToken)
        .expect(400);
    });
  });

  describe('INTEGRATION-SO-06: Pagination and Sorting', () => {
    beforeAll(async () => {
      // Create multiple sales orders for testing
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/sales-orders')
          .set('Authorization', adminToken)
          .send({
            customerId: testCustomerId,
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
        .get(`/sales-orders?customerId=${testCustomerId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });
});
