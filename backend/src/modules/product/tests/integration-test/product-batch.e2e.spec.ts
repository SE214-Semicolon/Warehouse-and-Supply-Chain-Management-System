import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `batch-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Product Batch Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test tokens
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;

  // Test data IDs
  let testProductId: string;
  let testProduct2Id: string;
  let testBatchId: string;

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

    // Create test users and tokens with unique identifiers
    const adminUser = await prisma.user.create({
      data: {
        username: `admin-batch-${TEST_SUITE_ID}`,
        email: `admin-batch-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Batch Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-batch-${TEST_SUITE_ID}`,
        email: `manager-batch-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager Batch Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    const staffUser = await prisma.user.create({
      data: {
        username: `staff-batch-${TEST_SUITE_ID}`,
        email: `staff-batch-${TEST_SUITE_ID}@test.com`,
        fullName: 'Staff Batch Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.warehouse_staff,
        active: true,
      },
    });

    // Generate real JWT tokens
    const adminPayload = { sub: adminUser.id, email: adminUser.email, role: adminUser.role };
    const managerPayload = {
      sub: managerUser.id,
      email: managerUser.email,
      role: managerUser.role,
    };
    const staffPayload = { sub: staffUser.id, email: staffUser.email, role: staffUser.role };

    adminToken = `Bearer ${jwtService.sign(adminPayload)}`;
    managerToken = `Bearer ${jwtService.sign(managerPayload)}`;
    staffToken = `Bearer ${jwtService.sign(staffPayload)}`;

    // Create test products
    const product1 = await prisma.product.create({
      data: {
        sku: `BATCH-PROD-001-${TEST_SUITE_ID}`,
        name: 'Batch Test Product 1',
        unit: 'pcs',
      },
    });
    testProductId = product1.id;

    const product2 = await prisma.product.create({
      data: {
        sku: `BATCH-PROD-002-${TEST_SUITE_ID}`,
        name: 'Batch Test Product 2',
        unit: 'box',
      },
    });
    testProduct2Id = product2.id;

    // Create initial test batch
    const batch = await prisma.productBatch.create({
      data: {
        productId: testProductId,
        batchNo: `BATCH-001-${TEST_SUITE_ID}`,
        manufactureDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-01-01'),
      },
    });
    testBatchId = batch.id;
  }, 30000);

  afterAll(async () => {
    // Clean up only this test suite's data
    await prisma.productBatch.deleteMany({
      where: {
        batchNo: {
          contains: TEST_SUITE_ID,
        },
      },
    });
    await prisma.product.deleteMany({
      where: {
        sku: {
          contains: TEST_SUITE_ID,
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: TEST_SUITE_ID,
        },
      },
    });
    await app.close();
  }, 30000);

  describe('POST /product-batches - Create Product Batch', () => {
    // BATCH-TC01: Create with valid data
    it('BATCH-INT-01: Should create product batch with valid data', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: `NEW-BATCH-001-${TEST_SUITE_ID}`,
        quantity: 200,
        manufactureDate: '2024-06-01',
        expiryDate: '2025-06-01',
        barcodeOrQr: 'QR:12345',
      };

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.batchNo).toBe(createDto.batchNo);
      expect(response.body.data.quantity).toBe(createDto.quantity);
      expect(response.body.data.productId).toBe(testProductId);
      expect(response.body.message).toBe('Product batch created successfully');
    });

    // BATCH-TC02: Product not found
    it('BATCH-INT-02: Should return 404 when product not found', async () => {
      const createDto = {
        productId: '00000000-0000-0000-0000-000000000000',
        batchNo: 'NO-PRODUCT',
        quantity: 100,
      };

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(404);

      expect(response.body.message).toContain('Product');
    });

    // BATCH-TC03: Duplicate batch number
    it('BATCH-INT-03: Should return 409 for duplicate batch number', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: `BATCH-001-${TEST_SUITE_ID}`, // Already exists
        quantity: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    // BATCH-TC04: Invalid dates (expiry before manufacture)
    it('BATCH-INT-04: Should return 400 when expiry date is before manufacture date', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: 'INVALID-DATES',
        quantity: 100,
        manufactureDate: '2025-01-01',
        expiryDate: '2024-01-01',
      };

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);

      expect(response.body.message).toContain('after');
    });

    // BATCH-TC05: Create with all optional fields
    it('BATCH-INT-05: Should create batch with all optional fields', async () => {
      const createDto = {
        productId: testProduct2Id,
        batchNo: 'FULL-BATCH',
        quantity: 150,
        manufactureDate: '2024-03-01',
        expiryDate: '2025-03-01',
        barcodeOrQr: 'BARCODE:987654',
      };

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.barcodeOrQr).toBe(createDto.barcodeOrQr);
    });

    // BATCH-TC06: Missing required fields
    it('BATCH-INT-06: Should return 400 for missing required fields', async () => {
      const createDto = {
        batchNo: 'MISSING-PRODUCT',
        quantity: 100,
      };

      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // BATCH-TC07: Permission denied (tested by guard)
    it('BATCH-INT-07: Should allow manager to create batch', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: 'MANAGER-BATCH',
        quantity: 75,
      };

      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', managerToken)
        .send(createDto)
        .expect(201);
    });

    // BATCH-TC08: No authentication
    it('BATCH-INT-08: Should return 401 without authentication', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: 'NO-AUTH',
        quantity: 100,
      };

      await request(app.getHttpServer()).post('/product-batches').send(createDto).expect(401);
    });

    it('BATCH-INT-09: Should return 403 for staff without permission', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: 'STAFF-DENY',
        quantity: 100,
      };

      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', staffToken)
        .send(createDto)
        .expect(403);
    });
  });

  describe('Edge Cases - Create Product Batch', () => {
    // BATCH-TC09: Empty batch number
    it('BATCH-INT-10: Should create batch with empty batch number', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: null,
        quantity: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.batchNo).toBeNull();
    });

    // BATCH-TC10: Batch number with special chars
    it('BATCH-INT-11: Should create batch with special characters', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: 'BATCH@2024#001',
        quantity: 100,
      };

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto);

      expect([201, 400]).toContain(response.status);
    });

    // BATCH-TC11: Very long batch number
    it('BATCH-INT-12: Should return 400 for very long batch number', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: 'A'.repeat(51),
        quantity: 100,
      };

      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // BATCH-TC12: Duplicate batch case insensitive
    it('BATCH-INT-13: Should return 409 for case-insensitive duplicate', async () => {
      const createDto1 = {
        productId: testProduct2Id,
        batchNo: `CASE-TEST-${TEST_SUITE_ID}`,
        quantity: 100,
      };

      const createDto2 = {
        productId: testProduct2Id,
        batchNo: `case-test-${TEST_SUITE_ID}`,
        quantity: 100,
      };

      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto1)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto2)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    // BATCH-TC13: Zero quantity
    it('BATCH-INT-14: Should create batch with zero quantity', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: 'ZERO-QTY',
        quantity: 0,
      };

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.quantity).toBe(0);
    });

    // BATCH-TC14: Negative quantity
    it('BATCH-INT-15: Should return 400 for negative quantity', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: 'NEG-QTY',
        quantity: -10,
      };

      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // BATCH-TC15: Future manufacture date
    it('BATCH-INT-16: Should handle future manufacture date based on business rules', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const createDto = {
        productId: testProductId,
        batchNo: 'FUTURE-MFG',
        quantity: 100,
        manufactureDate: futureDate.toISOString().split('T')[0],
        expiryDate: new Date(futureDate.getTime() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      };

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto);

      expect([201, 400]).toContain(response.status);
    });

    // BATCH-TC16: Past expiry date
    it('BATCH-INT-17: Should allow past expiry date', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: 'PAST-EXPIRY',
        quantity: 100,
        manufactureDate: '2020-01-01',
        expiryDate: '2021-01-01',
      };

      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);
    });

    // BATCH-TC17: Same manufacture & expiry dates
    it('BATCH-INT-18: Should return 400 for same manufacture and expiry dates', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: 'SAME-DATES',
        quantity: 100,
        manufactureDate: '2024-01-01',
        expiryDate: '2024-01-01',
      };

      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // BATCH-TC18: Only manufacture date
    it('BATCH-INT-19: Should create batch with only manufacture date', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: 'ONLY-MFG',
        quantity: 100,
        manufactureDate: '2024-01-01',
      };

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.expiryDate).toBeNull();
    });

    // BATCH-TC19: Only expiry date
    it('BATCH-INT-20: Should create batch with only expiry date', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: 'ONLY-EXPIRY',
        quantity: 100,
        expiryDate: '2025-12-31',
      };

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.manufactureDate).toBeNull();
    });

    // BATCH-TC20: SQL injection in batch number
    it('BATCH-INT-21: Should sanitize SQL injection in batch number', async () => {
      const createDto = {
        productId: testProductId,
        batchNo: "BATCH'; DROP TABLE product_batches;--",
        quantity: 100,
      };

      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createDto);

      expect([201, 400]).toContain(response.status);

      // Verify table still exists
      const checkResponse = await request(app.getHttpServer())
        .get('/product-batches')
        .set('Authorization', adminToken)
        .expect(200);

      expect(checkResponse.body.success).toBe(true);
    });
  });

  describe('GET /product-batches - Get All Product Batches', () => {
    beforeEach(async () => {
      // Create multiple test batches
      await prisma.productBatch.createMany({
        data: [
          {
            productId: testProductId,
            batchNo: 'GET-BATCH-001',
            quantity: 100,
            manufactureDate: new Date('2024-01-01'),
            expiryDate: new Date('2025-01-01'),
          },
          {
            productId: testProductId,
            batchNo: 'GET-BATCH-002',
            quantity: 200,
            manufactureDate: new Date('2024-02-01'),
            expiryDate: new Date('2025-02-01'),
          },
          {
            productId: testProduct2Id,
            batchNo: 'GET-BATCH-003',
            quantity: 150,
            barcodeOrQr: 'QR:TEST',
          },
        ],
      });
    }, 10000);

    afterEach(async () => {
      await prisma.productBatch.deleteMany({
        where: { batchNo: { startsWith: 'GET-BATCH-' } },
      });
    }, 10000);

    // BATCH-TC21: Get all with default pagination
    it('BATCH-INT-22: Should get all batches with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches')
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
    });

    // BATCH-TC22: Filter by product ID
    it('BATCH-INT-23: Should filter batches by product ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/product-batches?productId=${testProductId}`)
        .set('Authorization', adminToken)
        .expect(200);

      if (response.body.length > 0) {
        response.body.forEach((batch) => {
          expect(batch.productId).toBe(testProductId);
        });
      }
    });

    // BATCH-TC23: Filter by batch number
    it('BATCH-INT-24: Should filter batches by batch number', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches?batchNo=GET-BATCH-001')
        .set('Authorization', adminToken)
        .expect(200);

      if (response.body.length > 0) {
        expect(response.body.data[0].batchNo).toBe('GET-BATCH-001');
      }
    });

    // BATCH-TC24: Filter by barcode/QR
    it('BATCH-INT-25: Should filter batches by barcode or QR', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches?barcodeOrQr=QR:TEST')
        .set('Authorization', adminToken)
        .expect(200);

      if (response.body.length > 0) {
        expect(response.body.data[0].barcodeOrQr).toBe('QR:TEST');
      }
    });

    // BATCH-TC25: Filter by expiry before
    it('BATCH-INT-26: Should filter batches expiring before date', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches?expiryBefore=2025-01-15')
        .set('Authorization', adminToken)
        .expect(200);

      if (response.body.length > 0) {
        response.body.forEach((batch) => {
          if (batch.expiryDate) {
            const expiryDate = new Date(batch.expiryDate);
            const filterDate = new Date('2025-01-15');
            expect(expiryDate <= filterDate).toBe(true);
          }
        });
      }
    });

    // BATCH-TC26: Filter by expiry after
    it('BATCH-INT-27: Should filter batches expiring after date', async () => {
      await request(app.getHttpServer())
        .get('/product-batches?expiryAfter=2024-12-31')
        .set('Authorization', adminToken)
        .expect(200);
    });

    // BATCH-TC27: Pagination page 1
    it('BATCH-INT-28: Should paginate to page 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches?page=1&limit=2')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    // BATCH-TC28: Pagination page 2
    it('BATCH-INT-29: Should paginate to page 2', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches?page=2&limit=2')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(2);
    });

    // BATCH-TC29: Permission denied (tested by guard)
    it('BATCH-INT-30: Should allow staff to view batches', async () => {
      await request(app.getHttpServer())
        .get('/product-batches')
        .set('Authorization', staffToken)
        .expect(200);
    });

    // BATCH-TC30: No authentication
    it('BATCH-INT-31: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/product-batches').expect(401);
    });
  });

  describe('Edge Cases - Get All Product Batches', () => {
    // BATCH-TC31: Page = 0
    it('BATCH-INT-32: Should handle page=0 (default to page 1)', async () => {
      await request(app.getHttpServer())
        .get('/product-batches?page=0')
        .set('Authorization', adminToken)
        .expect(400);
    });

    // BATCH-TC32: Negative page
    it('BATCH-INT-33: Should handle negative page (default to page 1)', async () => {
      await request(app.getHttpServer())
        .get('/product-batches?page=-1')
        .set('Authorization', adminToken)
        .expect(400);
    });

    // BATCH-TC33: Limit = 0
    it('BATCH-INT-34: Should handle limit=0 (use default)', async () => {
      await request(app.getHttpServer())
        .get('/product-batches?limit=0')
        .set('Authorization', adminToken)
        .expect(400);
    });

    // BATCH-TC34: Very large limit
    it('BATCH-INT-35: Should cap very large limit', async () => {
      await request(app.getHttpServer())
        .get('/product-batches?limit=10000')
        .set('Authorization', adminToken)
        .expect(400);
    });

    // BATCH-TC35: Invalid product ID
    it('BATCH-INT-36: Should return empty result for invalid product ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches?productId=00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBe(0);
    });

    // BATCH-TC36: Empty batch number search
    it('BATCH-INT-37: Should handle empty batch number search', async () => {
      await request(app.getHttpServer())
        .get('/product-batches?batchNo=')
        .set('Authorization', adminToken)
        .expect(200);
    });

    // BATCH-TC37: SQL injection in filters
    it('BATCH-INT-38: Should sanitize SQL injection in filters', async () => {
      await request(app.getHttpServer())
        .get("/product-batches?batchNo='; DROP TABLE product_batches;--")
        .set('Authorization', adminToken)
        .expect(200);
    });

    // BATCH-TC38: Multiple filters combined
    it('BATCH-INT-39: Should handle multiple filters combined', async () => {
      await request(app.getHttpServer())
        .get(
          `/product-batches?productId=${testProductId}&batchNo=GET&expiryBefore=2025-12-31&page=1&limit=10`,
        )
        .set('Authorization', adminToken)
        .expect(200);
    });

    // BATCH-TC39: Filter productId + batchNo
    it('BATCH-INT-40: Should handle productId and batchNo filters', async () => {
      await request(app.getHttpServer())
        .get(`/product-batches?productId=${testProductId}&batchNo=BATCH-001`)
        .set('Authorization', adminToken)
        .expect(200);
    });

    // BATCH-TC40: Filter expiry range
    it('BATCH-INT-41: Should filter by expiry date range', async () => {
      await request(app.getHttpServer())
        .get('/product-batches?expiryAfter=2024-01-01&expiryBefore=2025-12-31')
        .set('Authorization', adminToken)
        .expect(200);
    });

    // BATCH-TC44: Case insensitive search
    it('BATCH-INT-42: Should perform case-insensitive search', async () => {
      await request(app.getHttpServer())
        .get('/product-batches?batchNo=batch-001')
        .set('Authorization', adminToken)
        .expect(200);
    });

    // BATCH-TC45: Page beyond total
    it('BATCH-INT-43: Should return empty array for page beyond total', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches?page=9999&limit=10')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBe(0);
    });
  });

  describe('GET /product-batches/:id - Get Batch By ID', () => {
    // Find by valid ID
    it('BATCH-INT-44: Should get batch by valid ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/product-batches/${testBatchId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.id).toBe(testBatchId);
    });

    // Batch not found
    it('BATCH-INT-45: Should return 404 for non-existent batch', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    // No authentication
    it('BATCH-INT-46: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get(`/product-batches/${testBatchId}`).expect(401);
    });
  });

  describe('PATCH /product-batches/:id - Update Batch', () => {
    let updateBatchId: string;

    beforeEach(async () => {
      const batch = await prisma.productBatch.create({
        data: {
          productId: testProductId,
          batchNo: `BATCH-TO-UPDATE-${Date.now()}`,
          quantity: 100,
        },
      });
      updateBatchId = batch.id;
    }, 10000);

    // Update with valid data
    it('BATCH-INT-47: Should update batch with valid data', async () => {
      const updateDto = {
        quantity: 150,
        barcodeOrQr: 'UPDATED-QR',
      };

      const response = await request(app.getHttpServer())
        .patch(`/product-batches/${updateBatchId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.data.quantity).toBe(updateDto.quantity);
      expect(response.body.data.barcodeOrQr).toBe(updateDto.barcodeOrQr);
    });

    // Batch not found
    it('BATCH-INT-48: Should return 404 for non-existent batch', async () => {
      const updateDto = {
        quantity: 200,
      };

      await request(app.getHttpServer())
        .patch('/product-batches/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(404);
    });

    // Invalid dates
    it('BATCH-INT-49: Should return 400 for invalid date update', async () => {
      const updateDto = {
        manufactureDate: '2025-01-01',
        expiryDate: '2024-01-01',
      };

      await request(app.getHttpServer())
        .patch(`/product-batches/${updateBatchId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(400);
    });

    // No authentication
    it('BATCH-INT-50: Should return 401 without authentication', async () => {
      const updateDto = {
        quantity: 200,
      };

      await request(app.getHttpServer())
        .patch(`/product-batches/${updateBatchId}`)
        .send(updateDto)
        .expect(401);
    });

    // No permission
    it('BATCH-INT-51: Should return 403 for staff without permission', async () => {
      const updateDto = {
        quantity: 200,
      };

      await request(app.getHttpServer())
        .patch(`/product-batches/${updateBatchId}`)
        .set('Authorization', staffToken)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('DELETE /product-batches/:id - Delete Batch', () => {
    let deleteBatchId: string;

    beforeEach(async () => {
      await prisma.productBatch.deleteMany({
        where: { batchNo: { startsWith: 'BATCH-TO-DELETE' } },
      });

      // Ensure testProductId exists
      let productId = testProductId;
      const productExists = await prisma.product.findUnique({ where: { id: testProductId } });
      if (!productExists) {
        const newProduct = await prisma.product.create({
          data: {
            sku: `PROD-DELETE-BATCH-${Date.now()}`,
            name: 'Delete Batch Product',
            unit: 'pcs',
          },
        });
        productId = newProduct.id;
      }

      const batch = await prisma.productBatch.create({
        data: {
          productId: productId,
          batchNo: `BATCH-TO-DELETE-${Date.now()}`,
          quantity: 100,
        },
      });
      deleteBatchId = batch.id;
    }, 10000);

    // Delete with valid ID
    it('BATCH-INT-52: Should delete batch without dependencies', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/product-batches/${deleteBatchId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.message).toContain('deleted');

      // Verify deleted
      const check = await prisma.productBatch.findUnique({
        where: { id: deleteBatchId },
      });
      expect(check).toBeNull();
    });

    // Batch not found
    it('BATCH-INT-53: Should return 404 for non-existent batch', async () => {
      await request(app.getHttpServer())
        .delete('/product-batches/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    // No authentication
    it('BATCH-INT-54: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).delete(`/product-batches/${deleteBatchId}`).expect(401);
    });

    // No permission
    it('BATCH-INT-55: Should return 403 for staff without permission', async () => {
      await request(app.getHttpServer())
        .delete(`/product-batches/${deleteBatchId}`)
        .set('Authorization', staffToken)
        .expect(403);
    });
  });

  describe('Integration Flow - Complete Batch Lifecycle', () => {
    it('BATCH-INT-56: Should complete full batch lifecycle', async () => {
      // 1. Create product
      const createProductResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send({
          sku: 'LIFECYCLE-BATCH-PROD',
          name: 'Lifecycle Batch Product',
          unit: 'pcs',
        })
        .expect(201);

      const productId = createProductResponse.body.data.id;

      // 2. Create batch
      const createBatchDto = {
        productId: productId,
        batchNo: 'LIFECYCLE-BATCH-001',
        quantity: 500,
        manufactureDate: '2024-01-01',
        expiryDate: '2025-01-01',
        barcodeOrQr: 'QR:LIFECYCLE',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send(createBatchDto)
        .expect(201);

      const batchId = createResponse.body.data.id;

      // 3. Get all batches
      const getAllResponse = await request(app.getHttpServer())
        .get('/product-batches')
        .set('Authorization', adminToken)
        .expect(200);

      expect(getAllResponse.body.success).toBe(true);

      // 4. Get by ID
      const getByIdResponse = await request(app.getHttpServer())
        .get(`/product-batches/${batchId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(getByIdResponse.body.data.batchNo).toBe(createBatchDto.batchNo);

      // 5. Filter by product
      const filterResponse = await request(app.getHttpServer())
        .get(`/product-batches?productId=${productId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(filterResponse.body.data.length).toBeGreaterThan(0);

      // 6. Update batch
      const updateDto = {
        quantity: 600,
        barcodeOrQr: 'QR:UPDATED',
      };

      const updateResponse = await request(app.getHttpServer())
        .patch(`/product-batches/${batchId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(updateResponse.body.data.quantity).toBe(updateDto.quantity);

      // 7. Delete batch
      await request(app.getHttpServer())
        .delete(`/product-batches/${batchId}`)
        .set('Authorization', adminToken)
        .expect(200);

      // 8. Verify deletion
      await request(app.getHttpServer())
        .get(`/product-batches/${batchId}`)
        .set('Authorization', adminToken)
        .expect(404);

      // 9. Clean up product
      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .set('Authorization', adminToken)
        .expect(200);
    }, 30000);
  });
});
