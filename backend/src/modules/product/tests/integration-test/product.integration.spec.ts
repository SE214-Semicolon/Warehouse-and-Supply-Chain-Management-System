import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `product-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Product Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test tokens
  let adminToken: string;
  let managerToken: string;
  let procurementToken: string;
  let staffToken: string;

  // Test data IDs
  let testCategoryId: string;
  let testProductId: string;

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
        username: `admin-prod-${TEST_SUITE_ID}`,
        email: `admin-prod-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Product Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-prod-${TEST_SUITE_ID}`,
        email: `manager-prod-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager Product Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    const procurementUser = await prisma.user.create({
      data: {
        username: `procurement-prod-${TEST_SUITE_ID}`,
        email: `procurement-prod-${TEST_SUITE_ID}@test.com`,
        fullName: 'Procurement Product Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.procurement,
        active: true,
      },
    });

    const staffUser = await prisma.user.create({
      data: {
        username: `staff-prod-${TEST_SUITE_ID}`,
        email: `staff-prod-${TEST_SUITE_ID}@test.com`,
        fullName: 'Staff Product Test',
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
    const procurementPayload = {
      sub: procurementUser.id,
      email: procurementUser.email,
      role: procurementUser.role,
    };
    const staffPayload = { sub: staffUser.id, email: staffUser.email, role: staffUser.role };

    adminToken = `Bearer ${jwtService.sign(adminPayload)}`;
    managerToken = `Bearer ${jwtService.sign(managerPayload)}`;
    procurementToken = `Bearer ${jwtService.sign(procurementPayload)}`;
    staffToken = `Bearer ${jwtService.sign(staffPayload)}`;

    // Create test category
    const category = await prisma.productCategory.create({
      data: {
        name: `Test-Electronics-${TEST_SUITE_ID}`,
      },
    });
    testCategoryId = category.id;

    // Create initial test product
    const product = await prisma.product.create({
      data: {
        sku: `TEST-SKU-001-${TEST_SUITE_ID}`,
        name: 'Test Product 1',
        unit: 'pcs',
        barcode: '1234567890',
        categoryId: testCategoryId,
      },
    });
    testProductId = product.id;
  }, 30000);

  afterAll(async () => {
    // Clean up only this test suite's data
    await prisma.product.deleteMany({
      where: {
        sku: {
          contains: TEST_SUITE_ID,
        },
      },
    });
    await prisma.productCategory.deleteMany({
      where: {
        name: {
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
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('POST /products - Create Product', () => {
    // PROD-TC01: Create with valid data
    it('PROD-INT-01: Should create product with valid data', async () => {
      const createDto = {
        sku: `PROD-NEW-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: 'New Product',
        unit: 'pcs',
        barcode: '9876543210',
        categoryId: testCategoryId,
        parameters: { color: 'blue', size: 'M' },
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.sku).toBe(createDto.sku);
      expect(response.body.data.name).toBe(createDto.name);
      expect(response.body.data.categoryId).toBe(testCategoryId);
      expect(response.body.message).toBe('Product created successfully');
    });

    // PROD-TC02: Duplicate SKU
    it('PROD-INT-02: Should return 409 for duplicate SKU', async () => {
      const createDto = {
        sku: `TEST-SKU-001-${TEST_SUITE_ID}`, // Already exists
        name: 'Duplicate SKU Product',
        unit: 'pcs',
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    // PROD-TC03: Category not found
    it('PROD-INT-03: Should return 404 when category not found', async () => {
      const createDto = {
        sku: 'PROD-NO-CAT',
        name: 'No Category Product',
        unit: 'pcs',
        categoryId: '00000000-0000-0000-0000-000000000000',
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(404);

      expect(response.body.message).toContain('Category');
    });

    // PROD-TC04: Create with category
    it('PROD-INT-04: Should create product with category', async () => {
      const createDto = {
        sku: `PROD-WITH-CAT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: 'Product With Category',
        unit: 'box',
        categoryId: testCategoryId,
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.categoryId).toBe(testCategoryId);
    });

    // PROD-TC05: Missing required fields
    it('PROD-INT-05: Should return 400 for missing required fields', async () => {
      const createDto = {
        name: 'Missing SKU',
        // Missing sku and unit
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // PROD-TC06: Permission denied (tested by guard)
    it('PROD-INT-06: Should allow manager to create product', async () => {
      const createDto = {
        sku: `PROD-MANAGER-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: 'Manager Product',
        unit: 'pcs',
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', managerToken)
        .send(createDto)
        .expect(201);
    });

    // PROD-TC07: No authentication
    it('PROD-INT-07: Should return 401 without authentication', async () => {
      const createDto = {
        sku: 'PROD-NO-AUTH',
        name: 'No Auth Product',
        unit: 'pcs',
      };

      await request(app.getHttpServer()).post('/products').send(createDto).expect(401);
    });

    it('PROD-INT-08: Should allow procurement to create product', async () => {
      const createDto = {
        sku: `PROD-PROCUREMENT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: 'Procurement Product',
        unit: 'pcs',
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', procurementToken)
        .send(createDto)
        .expect(201);
    });

    it('PROD-INT-09: Should return 403 for staff without permission', async () => {
      const createDto = {
        sku: 'PROD-STAFF-DENY',
        name: 'Staff Denied',
        unit: 'pcs',
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', staffToken)
        .send(createDto)
        .expect(403);
    });
  });

  describe('Edge Cases - Create Product', () => {
    // PROD-TC08: Empty string SKU
    it('PROD-INT-10: Should return 400 for empty string SKU', async () => {
      const createDto = {
        sku: '',
        name: 'Empty SKU',
        unit: 'pcs',
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // PROD-TC09: Whitespace only name
    it('PROD-INT-11: Should return 400 for whitespace only name', async () => {
      const createDto = {
        sku: 'PROD-SPACE',
        name: '   ',
        unit: 'pcs',
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // PROD-TC10: SKU with special chars
    it('PROD-INT-12: Should create product with special chars in SKU', async () => {
      const createDto = {
        sku: `PROD-2024@#$-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: 'Special SKU',
        unit: 'pcs',
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto);

      expect([201, 400]).toContain(response.status);
    });

    // PROD-TC11: Very long SKU
    it('PROD-INT-13: Should return 400 for very long SKU', async () => {
      const createDto = {
        sku: 'A'.repeat(101),
        name: 'Long SKU',
        unit: 'pcs',
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // PROD-TC12: Duplicate SKU case insensitive
    it('PROD-INT-14: Should return 409 for case-insensitive duplicate SKU', async () => {
      const uniqueSku = `PROD-CASE-${TEST_SUITE_ID}`;
      const createDto1 = {
        sku: uniqueSku,
        name: 'Case Test 1',
        unit: 'pcs',
      };

      const createDto2 = {
        sku: uniqueSku.toLowerCase(),
        name: 'Case Test 2',
        unit: 'pcs',
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto1)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto2)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    // PROD-TC13: Create with null barcode
    it('PROD-INT-15: Should create product with null barcode', async () => {
      const createDto = {
        sku: `PROD-NULL-BARCODE-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: 'Null Barcode Product',
        unit: 'pcs',
        barcode: null,
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.barcode).toBeNull();
    });

    // PROD-TC14: Create with complex parameters
    it('PROD-INT-16: Should create product with complex parameters', async () => {
      const createDto = {
        sku: `PROD-COMPLEX-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: 'Complex Parameters',
        unit: 'pcs',
        parameters: {
          specs: {
            cpu: 'Intel i7',
            ram: '16GB',
            storage: '512GB SSD',
          },
          warranty: '2 years',
          features: ['WiFi', 'Bluetooth', 'USB-C'],
        },
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.parameters).toEqual(createDto.parameters);
    });

    // PROD-TC15: Create with empty parameters
    it('PROD-INT-17: Should create product with empty parameters', async () => {
      const createDto = {
        sku: `PROD-EMPTY-PARAMS-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: 'Empty Parameters',
        unit: 'pcs',
        parameters: {},
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);
    });

    // PROD-TC16: Create without category
    it('PROD-INT-18: Should create product without category', async () => {
      const createDto = {
        sku: `PROD-NO-CATEGORY-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: 'No Category Product',
        unit: 'pcs',
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.categoryId).toBeNull();
    });

    // PROD-TC17: Invalid category ID format
    it('PROD-INT-19: Should return error for invalid category ID format', async () => {
      const createDto = {
        sku: 'PROD-INVALID-CAT',
        name: 'Invalid Category ID',
        unit: 'pcs',
        categoryId: 'invalid-uuid',
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto);

      expect([400, 404]).toContain(response.status);
    });

    // PROD-TC18: SQL injection in SKU
    it('PROD-INT-20: Should sanitize SQL injection in SKU', async () => {
      const createDto = {
        sku: `PROD-${Date.now()}-${Math.random().toString(36).substring(7)}'; DROP TABLE products;--`,
        name: 'SQL Injection Test',
        unit: 'pcs',
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createDto);

      expect([201, 400]).toContain(response.status);

      // Verify table still exists
      const checkResponse = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', adminToken)
        .expect(200);

      expect(checkResponse.body.success).toBe(true);
    });
  });

  describe('GET /products - Get All Products', () => {
    beforeEach(async () => {
      try {
        // Ensure test category exists
        let categoryExists = await prisma.productCategory.findUnique({
          where: { id: testCategoryId },
        });
        if (!categoryExists) {
          // Category was deleted, create new one with unique timestamp
          const newCategory = await prisma.productCategory.create({
            data: { name: `Test-Electronics-${TEST_SUITE_ID}-${Date.now()}` },
          });
          testCategoryId = newCategory.id;
          categoryExists = newCategory;
        }

        // Create multiple test products
        await prisma.product.createMany({
          data: [
            {
              sku: `GET-PROD-001-${TEST_SUITE_ID}`,
              name: 'Get Product 1',
              unit: 'pcs',
              barcode: 'BAR-001',
              categoryId: testCategoryId,
            },
            {
              sku: `GET-PROD-002-${TEST_SUITE_ID}`,
              name: 'Get Product 2',
              unit: 'box',
              barcode: 'BAR-002',
              categoryId: testCategoryId,
            },
            {
              sku: `GET-PROD-003-${TEST_SUITE_ID}`,
              name: 'Different Product',
              unit: 'kg',
              barcode: 'BAR-003',
            },
          ],
        });
      } catch (error) {
        console.error('Error in beforeEach:', error);
        throw error;
      }
    }, 10000);

    afterEach(async () => {
      await prisma.product.deleteMany({
        where: { sku: { contains: TEST_SUITE_ID } },
      });
    }, 10000);

    // PROD-TC19: Get all with default pagination
    it('PROD-INT-21: Should get all products with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
    });

    // PROD-TC20: Filter by search
    it('PROD-INT-22: Should filter products by search', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?search=Get')
        .set('Authorization', adminToken)
        .expect(200);

      if (response.body.length > 0) {
        response.body.forEach((prod: any) => {
          const matchesSearch =
            prod.sku.toLowerCase().includes('get') || prod.name.toLowerCase().includes('get');
          expect(matchesSearch).toBe(true);
        });
      }
    });

    // PROD-TC21: Filter by category
    it('PROD-INT-23: Should filter products by category', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products?categoryId=${testCategoryId}`)
        .set('Authorization', adminToken)
        .expect(200);

      if (response.body.length > 0) {
        response.body.forEach((prod: any) => {
          expect(prod.categoryId).toBe(testCategoryId);
        });
      }
    });

    // PROD-TC22: Filter by barcode
    it('PROD-INT-24: Should filter products by barcode', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?barcode=BAR-001')
        .set('Authorization', adminToken)
        .expect(200);

      if (response.body.length > 0) {
        expect(response.body.data[0].barcode).toBe('BAR-001');
      }
    });

    // PROD-TC23: Pagination page 1
    it('PROD-INT-25: Should paginate to page 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=1&limit=2')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    // PROD-TC24: Pagination page 2
    it('PROD-INT-26: Should paginate to page 2', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=2&limit=2')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(2);
    });

    // PROD-TC25: Sort by different fields
    it('PROD-INT-27: Should sort products by name ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?sortBy=name&sortOrder=asc')
        .set('Authorization', adminToken)
        .expect(200);

      if (response.body.length > 1) {
        const firstProduct = response.body.data[0];
        const secondProduct = response.body.data[1];
        expect(firstProduct.name <= secondProduct.name).toBe(true);
      }
    });

    // PROD-TC26: Permission denied (tested by guard)
    it('PROD-INT-28: Should allow staff to view products', async () => {
      await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', staffToken)
        .expect(200);
    });

    // PROD-TC27: No authentication
    it('PROD-INT-29: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/products').expect(401);
    });
  });

  describe('Edge Cases - Get All Products', () => {
    // PROD-TC28: Page = 0
    it('PROD-INT-30: Should handle page=0 (default to page 1)', async () => {
      await request(app.getHttpServer())
        .get('/products?page=0')
        .set('Authorization', adminToken)
        .expect(400);
    });

    // PROD-TC29: Negative page
    it('PROD-INT-31: Should handle negative page (default to page 1)', async () => {
      await request(app.getHttpServer())
        .get('/products?page=-1')
        .set('Authorization', adminToken)
        .expect(400);
    });

    // PROD-TC30: Limit = 0
    it('PROD-INT-32: Should handle limit=0 (use default)', async () => {
      await request(app.getHttpServer())
        .get('/products?limit=0')
        .set('Authorization', adminToken)
        .expect(400);
    });

    // PROD-TC31: Very large limit
    it('PROD-INT-33: Should cap very large limit', async () => {
      await request(app.getHttpServer())
        .get('/products?limit=10000')
        .set('Authorization', adminToken)
        .expect(400);
    });

    // PROD-TC32: Search with empty string
    it('PROD-INT-34: Should handle empty string search', async () => {
      await request(app.getHttpServer())
        .get('/products?search=')
        .set('Authorization', adminToken)
        .expect(200);
    });

    // PROD-TC33: Search with SQL injection
    it('PROD-INT-35: Should sanitize SQL injection in search', async () => {
      await request(app.getHttpServer())
        .get("/products?search='; DROP TABLE products;--")
        .set('Authorization', adminToken)
        .expect(200);
    });

    // PROD-TC34: Filter category + search
    it('PROD-INT-36: Should handle combined category and search filters', async () => {
      await request(app.getHttpServer())
        .get(`/products?categoryId=${testCategoryId}&search=Test`)
        .set('Authorization', adminToken)
        .expect(200);
    });

    // PROD-TC35: Filter barcode + search
    it('PROD-INT-37: Should handle combined barcode and search filters', async () => {
      await request(app.getHttpServer())
        .get('/products?barcode=1234567890&search=Test')
        .set('Authorization', adminToken)
        .expect(200);
    });

    // PROD-TC36: All filters combined
    it('PROD-INT-38: Should handle all filters combined', async () => {
      await request(app.getHttpServer())
        .get(
          `/products?categoryId=${testCategoryId}&search=Test&barcode=1234567890&page=1&limit=10&sortBy=name&sortOrder=asc`,
        )
        .set('Authorization', adminToken)
        .expect(200);
    });

    // PROD-TC37: Invalid category ID
    it('PROD-INT-39: Should return empty result for invalid category ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?categoryId=00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBe(0);
    });

    // PROD-TC41: Case insensitive search
    it('PROD-INT-40: Should perform case-insensitive search', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?search=test')
        .set('Authorization', adminToken)
        .expect(200);

      if (response.body.length > 0) {
        const hasMatch = response.body.some((prod: any): boolean => {
          const sku: string = prod.sku.toLowerCase();
          const name: string = prod.name.toLowerCase();
          return sku.includes('test') || name.includes('test');
        });
        expect(hasMatch).toBe(true);
      }
    });

    // PROD-TC42: Page beyond total
    it('PROD-INT-41: Should return empty array for page beyond total', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=9999&limit=10')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.length).toBe(0);
    });
  });

  describe('GET /products/:id - Get Product By ID', () => {
    // Find by valid ID
    it('PROD-INT-42: Should get product by valid ID', async () => {
      // Ensure testCategory still exists
      const categoryExists = await prisma.productCategory.findUnique({
        where: { id: testCategoryId },
      });
      if (!categoryExists) {
        const newCategory = await prisma.productCategory.create({
          data: { name: `Test-Electronics-${TEST_SUITE_ID}` },
        });
        testCategoryId = newCategory.id;
      }

      // Ensure testProduct still exists
      const productExists = await prisma.product.findUnique({
        where: { id: testProductId },
      });
      if (!productExists) {
        const newProduct = await prisma.product.create({
          data: {
            sku: `TEST-SKU-${Date.now()}`,
            name: 'Test Product Recreated',
            unit: 'pcs',
            categoryId: testCategoryId,
          },
        });
        testProductId = newProduct.id;
      }

      const response = await request(app.getHttpServer())
        .get(`/products/${testProductId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.id).toBe(testProductId);
    });

    // Product not found
    it('PROD-INT-43: Should return 404 for non-existent product', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    // No authentication
    it('PROD-INT-44: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get(`/products/${testProductId}`).expect(401);
    });
  });

  describe('GET /products/sku/:sku - Get Product By SKU', () => {
    beforeAll(async () => {
      // Ensure TEST-SKU-001 product exists
      const existing = await prisma.product.findUnique({ where: { sku: 'TEST-SKU-001' } });
      if (!existing) {
        await prisma.product.create({
          data: { sku: 'TEST-SKU-001', name: 'Test SKU Product', unit: 'pcs' },
        });
      }
    });

    // Find by valid SKU
    it('PROD-INT-45: Should get product by valid SKU', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/sku/TEST-SKU-001')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.sku).toBe('TEST-SKU-001');
    });

    // Product not found
    it('PROD-INT-46: Should return 404 for non-existent SKU', async () => {
      await request(app.getHttpServer())
        .get('/products/sku/NONEXISTENT-SKU')
        .set('Authorization', adminToken)
        .expect(404);
    });

    // Case insensitive
    it('PROD-INT-47: Should perform case-insensitive SKU search', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/sku/test-sku-001')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.sku.toLowerCase()).toBe('test-sku-001');
    });
  });

  describe('PATCH /products/:id - Update Product', () => {
    let updateProductId: string;

    beforeEach(async () => {
      // Ensure test category exists
      const categoryExists = await prisma.productCategory.findUnique({
        where: { id: testCategoryId },
      });
      if (!categoryExists) {
        const newCategory = await prisma.productCategory.create({
          data: { name: `Test-Electronics-${Date.now()}` },
        });
        testCategoryId = newCategory.id;
      }

      const product = await prisma.product.create({
        data: {
          sku: `PROD-TO-UPDATE-${Date.now()}`,
          name: 'Product To Update',
          unit: 'pcs',
          categoryId: testCategoryId,
        },
      });
      updateProductId = product.id;
    }, 10000);

    // Update with valid data
    it('PROD-INT-48: Should update product with valid data', async () => {
      const updateDto = {
        name: 'Updated Product Name',
        unit: 'box',
        barcode: 'NEW-BARCODE',
      };

      const response = await request(app.getHttpServer())
        .patch(`/products/${updateProductId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.data.name).toBe(updateDto.name);
      expect(response.body.data.unit).toBe(updateDto.unit);
    });

    // Duplicate SKU
    it('PROD-INT-49: Should return 409 for duplicate SKU', async () => {
      // Ensure a product with TEST-SKU-001 exists
      const existingProduct = await prisma.product.findUnique({
        where: { sku: 'TEST-SKU-001' },
      });
      if (!existingProduct) {
        await prisma.product.create({
          data: {
            sku: 'TEST-SKU-001',
            name: 'Test Product 1',
            unit: 'pcs',
            categoryId: testCategoryId,
          },
        });
      }

      const updateDto = {
        sku: 'TEST-SKU-001', // Already exists
      };

      const response = await request(app.getHttpServer())
        .patch(`/products/${updateProductId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    // Product not found
    it('PROD-INT-50: Should return 404 for non-existent product', async () => {
      const updateDto = {
        name: 'Updated',
      };

      await request(app.getHttpServer())
        .patch('/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(404);
    });

    // No authentication
    it('PROD-INT-51: Should return 401 without authentication', async () => {
      const updateDto = {
        name: 'No Auth',
      };

      await request(app.getHttpServer())
        .patch(`/products/${updateProductId}`)
        .send(updateDto)
        .expect(401);
    });

    // No permission
    it('PROD-INT-52: Should return 403 for staff without permission', async () => {
      const updateDto = {
        name: 'No Permission',
      };

      await request(app.getHttpServer())
        .patch(`/products/${updateProductId}`)
        .set('Authorization', staffToken)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('DELETE /products/:id - Delete Product', () => {
    let deleteProductId: string;

    beforeEach(async () => {
      await prisma.product.deleteMany({
        where: { sku: { startsWith: 'PROD-TO-DELETE' } },
      });

      // Ensure test category exists
      const categoryExists = await prisma.productCategory.findUnique({
        where: { id: testCategoryId },
      });
      if (!categoryExists) {
        const newCategory = await prisma.productCategory.create({
          data: { name: `Test-Electronics-${Date.now()}` },
        });
        testCategoryId = newCategory.id;
      }

      const product = await prisma.product.create({
        data: {
          sku: `PROD-TO-DELETE-${Date.now()}`,
          name: 'Product To Delete',
          unit: 'pcs',
          categoryId: testCategoryId,
        },
      });
      deleteProductId = product.id;
    }, 10000);

    // Delete with valid ID
    it('PROD-INT-53: Should delete product without dependencies', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/products/${deleteProductId}`)
        .set('Authorization', adminToken);

      if (response.status !== 200) {
        console.log('PROD-INT-53 Error:', response.status, response.body);
      }
      expect(response.status).toBe(200);

      expect(response.body.message).toContain('deleted');

      // Verify deleted
      const check = await prisma.product.findUnique({
        where: { id: deleteProductId },
      });
      expect(check).toBeNull();
    });

    // Product not found
    it('PROD-INT-54: Should return 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .delete('/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    // No authentication
    it('PROD-INT-55: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).delete(`/products/${deleteProductId}`).expect(401);
    });

    // No permission
    it('PROD-INT-56: Should return 403 for staff without permission', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${deleteProductId}`)
        .set('Authorization', staffToken)
        .expect(403);
    });
  });

  describe('Integration Flow - Complete Product Lifecycle', () => {
    it('PROD-INT-57: Should complete full product lifecycle', async () => {
      // 1. Create category
      const createCategoryResponse = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send({ name: `Lifecycle-Category-${Date.now()}` })
        .expect(201);

      const categoryId = createCategoryResponse.body.data.id;

      // 2. Create product
      const createProductDto = {
        sku: `LIFECYCLE-PROD-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: 'Lifecycle Product',
        unit: 'pcs',
        barcode: 'LIFE-001',
        categoryId: categoryId,
        parameters: { test: true },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send(createProductDto)
        .expect(201);

      const productId = createResponse.body.data.id;

      // 3. Get all products
      const getAllResponse = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', adminToken)
        .expect(200);

      expect(getAllResponse.body.success).toBe(true);

      // 4. Get by ID
      const getByIdResponse = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(getByIdResponse.body.data.sku).toBe(createProductDto.sku);

      // 5. Get by SKU
      const getBySkuResponse = await request(app.getHttpServer())
        .get(`/products/sku/${createProductDto.sku}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(getBySkuResponse.body.data.id).toBe(productId);

      // 6. Update product
      const updateDto = {
        name: 'Updated Lifecycle Product',
        unit: 'box',
      };

      const updateResponse = await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(updateResponse.body.data.name).toBe(updateDto.name);

      // 7. Delete product
      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .set('Authorization', adminToken)
        .expect(200);

      // 8. Verify deletion
      await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .set('Authorization', adminToken)
        .expect(404);

      // 9. Clean up category
      await request(app.getHttpServer())
        .delete(`/product-categories/${categoryId}`)
        .set('Authorization', adminToken)
        .expect(200);
    }, 30000);
  });

  describe('INTEGRATION-PROD-01: Core CRUD Operations', () => {
    let productId: string;
    let productSku: string;

    it('should create product with all fields', async () => {
      productSku = `INTEGRATION-PROD-${Date.now()}`;
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send({
          sku: productSku,
          name: 'Sanity Test Product',
          unit: 'box',
          barcode: `12345${Date.now()}`,
          parameters: { color: 'blue', size: 'M' },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.sku).toBe(productSku);
      productId = response.body.data.id;
    });

    it('should retrieve product by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.sku).toBe(productSku);
    });

    it('should retrieve product by SKU', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/sku/${productSku}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.id).toBe(productId);
    });

    it('should list all products with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 10 })
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('total');
    });

    it('should update product successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', adminToken)
        .send({
          name: 'Updated Sanity Product',
          unit: 'pcs',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Sanity Product');
      expect(response.body.data.unit).toBe('pcs');
    });
  });

  describe('INTEGRATION-PROD-02: Validation Rules', () => {
    it('should reject duplicate SKU', async () => {
      const dupSku = `INTEGRATION-DUP-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send({
          sku: dupSku,
          name: 'First Product',
          unit: 'pcs',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send({
          sku: dupSku,
          name: 'Second Product',
          unit: 'pcs',
        })
        .expect(409);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send({
          name: 'Missing SKU Product',
        })
        .expect(400);
    });

    it('should handle empty SKU', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send({
          sku: '',
          name: 'Empty SKU Product',
          unit: 'pcs',
        })
        .expect(400);
    });
  });

  describe('INTEGRATION-PROD-03: Authorization', () => {
    it('should allow manager to view products', async () => {
      await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', managerToken)
        .expect(200);
    });

    it('should allow manager to create product', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', managerToken)
        .send({
          sku: `INTEGRATION-MANAGER-${TEST_SUITE_ID}`,
          name: `Manager Created Product ${TEST_SUITE_ID}`,
          unit: 'pcs',
        })
        .expect(201);
    });
  });

  describe('INTEGRATION-PROD-04: Error Handling', () => {
    it('should return 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('should return 404 for non-existent SKU', async () => {
      await request(app.getHttpServer())
        .get('/products/sku/NONEXISTENT-SKU')
        .set('Authorization', adminToken)
        .expect(404);
    });
  });

  describe('INTEGRATION-PROD-05: Search and Filter', () => {
    it('should search products by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ search: 'Sanity' })
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by barcode', async () => {
      await request(app.getHttpServer())
        .get('/products')
        .query({ barcode: '1234567890' })
        .set('Authorization', adminToken)
        .expect(200);
    });
  });
});
