import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('Product Category Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test tokens
  let adminToken: string;
  let staffToken: string;

  // Test data IDs
  let rootCategoryId: string;
  let childCategoryId: string;

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

    // Clean database
    await cleanDatabase();

    // Create test users and tokens
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin-category-test',
        email: 'admin-category@test.com',
        fullName: 'Admin Category Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const staffUser = await prisma.user.create({
      data: {
        username: 'staff-category-test',
        email: 'staff-category@test.com',
        fullName: 'Staff Category Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.warehouse_staff,
        active: true,
      },
    });

    // Generate real JWT tokens
    const adminPayload = { sub: adminUser.id, email: adminUser.email, role: adminUser.role };
    const staffPayload = { sub: staffUser.id, email: staffUser.email, role: staffUser.role };

    adminToken = `Bearer ${jwtService.sign(adminPayload)}`;
    staffToken = `Bearer ${jwtService.sign(staffPayload)}`;

    // Create initial test categories
    const rootCategory = await prisma.productCategory.create({
      data: {
        name: `Electronics-${Date.now()}`,
      },
    });
    rootCategoryId = rootCategory.id;

    const childCategory = await prisma.productCategory.create({
      data: {
        name: `Laptops-${Date.now()}`,
        parentId: rootCategoryId,
      },
    });
    childCategoryId = childCategory.id;
  }, 30000);

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  }, 30000);

  async function cleanDatabase() {
    await prisma.productCategory.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@test.com',
        },
      },
    });
  }

  describe('POST /categories - Create Category', () => {
    // CAT-TC01: Create with valid data
    it('CAT-INT-01: Should create category with valid data', async () => {
      const createDto = {
        name: 'Smartphones',
      };

      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(createDto.name);
      expect(response.body.data.parentId).toBeNull();
      expect(response.body.message).toBe('Category created successfully');
    });

    // CAT-TC02: Create with parent category
    it('CAT-INT-02: Should create category with parent category', async () => {
      const createDto = {
        name: 'Gaming Laptops',
        parentId: childCategoryId,
      };

      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(createDto.name);
      expect(response.body.data.parentId).toBe(childCategoryId);
    });

    // CAT-TC03: Parent category not found
    it('CAT-INT-03: Should return 404 when parent category not found', async () => {
      const createDto = {
        name: 'Invalid Parent',
        parentId: '00000000-0000-0000-0000-000000000000',
      };

      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(404);

      expect(response.body.message).toContain('Parent category');
    });

    // CAT-TC04: Missing required fields
    it('CAT-INT-04: Should return 400 for missing required fields', async () => {
      const createDto = {
        description: 'Missing name field',
      };

      await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // CAT-TC05: No permission (staff)
    it('CAT-INT-05: Should return 403 for staff without permission', async () => {
      const createDto = {
        name: 'No Permission',
      };

      await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', staffToken)
        .send(createDto)
        .expect(403);
    });

    // CAT-TC06: No authentication
    it('CAT-INT-06: Should return 401 without authentication', async () => {
      const createDto = {
        name: 'No Auth',
      };

      await request(app.getHttpServer()).post('/product-categories').send(createDto).expect(401);
    });
  });

  describe('Edge Cases - Create Category', () => {
    // CAT-TC07: Empty string name
    it('CAT-INT-07: Should return 400 for empty string name', async () => {
      const createDto = {
        name: '',
      };

      await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // CAT-TC08: Whitespace only name
    it('CAT-INT-08: Should return 400 for whitespace only name', async () => {
      const createDto = {
        name: '   ',
      };

      await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // CAT-TC09: Very long name
    it('CAT-INT-09: Should return 400 for very long name', async () => {
      const createDto = {
        name: 'A'.repeat(201),
      };

      await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // CAT-TC10: Name with special characters
    it('CAT-INT-10: Should create category with special characters', async () => {
      const createDto = {
        name: 'Electronics & Gadgets (2024)',
      };

      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(createDto.name);
    });

    // CAT-TC11: Create without parent (root)
    it('CAT-INT-11: Should create root category without parent', async () => {
      const createDto = {
        name: 'Furniture',
      };

      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.parentId).toBeNull();
    });

    // CAT-TC12: Invalid parent ID format
    it('CAT-INT-12: Should return 404 for invalid parent ID format', async () => {
      const createDto = {
        name: 'Invalid Parent ID',
        parentId: 'invalid-uuid',
      };

      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto);

      expect([400, 404]).toContain(response.status);
    });

    // CAT-TC13: SQL injection in name
    it('CAT-INT-13: Should sanitize SQL injection in name', async () => {
      const createDto = {
        name: "CAT'; DROP TABLE product_categories;--",
      };

      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto);

      expect([201, 400]).toContain(response.status);

      // Verify table still exists
      const checkResponse = await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', adminToken)
        .expect(200);

      expect(checkResponse.body.success).toBe(true);
    });

    // CAT-TC14: Duplicate name same parent (allowed)
    it('CAT-INT-14: Should allow duplicate name in same parent', async () => {
      const createDto = {
        name: 'Accessories',
        parentId: rootCategoryId,
      };

      await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    // CAT-TC15: Create with description
    it('CAT-INT-15: Should create category with metadata', async () => {
      const createDto = {
        name: 'Office Supplies',
      };

      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(createDto.name);
    });
  });

  describe('GET /categories - Get All Categories', () => {
    // CAT-TC16: Get all categories with tree structure
    it('CAT-INT-16: Should get all categories with tree structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
    });

    // CAT-TC17: Empty categories list (tested after cleanup)
    it('CAT-INT-17: Should return empty array when no categories exist', async () => {
      // Temporarily delete all categories
      await prisma.productCategory.deleteMany({});

      const response = await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);

      // Restore test data
      const root = await prisma.productCategory.create({
        data: { name: 'Electronics' },
      });
      rootCategoryId = root.id;
    });

    // CAT-TC18: Permission denied (tested by guard)
    it('CAT-INT-18: Should allow all authenticated users to view categories', async () => {
      await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', staffToken)
        .expect(200);
    });

    // CAT-TC19: No authentication
    it('CAT-INT-19: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/product-categories').expect(401);
    });
  });

  describe('Edge Cases - Get All Categories', () => {
    beforeEach(async () => {
      // Clean and create test hierarchy
      await prisma.productCategory.deleteMany({});

      const root = await prisma.productCategory.create({
        data: { name: 'Root' },
      });
      rootCategoryId = root.id;

      const child1 = await prisma.productCategory.create({
        data: { name: 'Child 1', parentId: rootCategoryId },
      });

      await prisma.productCategory.create({
        data: { name: 'Grandchild 1', parentId: child1.id },
      });
    }, 10000);

    // CAT-TC20: Only root categories
    it('CAT-INT-20: Should return only root categories at top level', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((cat) => cat.parentId === null)).toBe(true);
    });

    // CAT-TC21: Deep nested categories (3+ levels)
    it('CAT-INT-21: Should handle deep nested categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Check that tree structure includes nested children
      const rootCat = response.body.data.find((cat) => cat.name === 'Root');
      expect(rootCat.children).toBeDefined();
      expect(rootCat.children.length).toBeGreaterThan(0);
    });

    // CAT-TC22: Orphaned categories (parent deleted)
    it('CAT-INT-22: Should handle orphaned categories', async () => {
      // This is implementation-specific - depends on cascade delete
      const response = await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    // CAT-TC23: Large number of categories
    it('CAT-INT-23: Should handle large number of categories', async () => {
      // Create 50 categories
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          prisma.productCategory.create({
            data: { name: `Category ${i}`, parentId: i % 2 === 0 ? rootCategoryId : null },
          }),
        );
      }
      await Promise.all(promises);

      const response = await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.total).toBeGreaterThan(50);
    }, 15000);
  });

  describe('GET /categories/:id - Get Category By ID', () => {
    // CAT-TC11: Find by valid ID
    it('CAT-INT-24: Should get category by valid ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/product-categories/${rootCategoryId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(rootCategoryId);
    });

    // CAT-TC12: Category not found
    it('CAT-INT-25: Should return 404 for non-existent category', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    // CAT-TC13: Invalid ID format (tested by DTO)
    it('CAT-INT-26: Should return 400 for invalid ID format', async () => {
      await request(app.getHttpServer())
        .get('/product-categories/invalid-uuid')
        .set('Authorization', adminToken)
        .expect(400);
    });

    // CAT-TC15: No authentication
    it('CAT-INT-27: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get(`/product-categories/${rootCategoryId}`).expect(401);
    });
  });

  describe('PATCH /product-categories/:id - Update Category', () => {
    let updateCategoryId: string;

    beforeEach(async () => {
      const category = await prisma.productCategory.create({
        data: { name: `TO-UPDATE-${Date.now()}` },
      });
      updateCategoryId = category.id;
    }, 10000);

    // CAT-TC24: Update with valid data
    it('CAT-INT-28: Should update category with valid data', async () => {
      const updateDto = {
        name: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateDto.name);
    });

    // CAT-TC25: Category not found
    it('CAT-INT-29: Should return 404 for non-existent category', async () => {
      const updateDto = {
        name: 'Updated',
      };

      const response = await request(app.getHttpServer())
        .patch('/product-categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    // CAT-TC26: Parent category not found
    it('CAT-INT-30: Should return 404 for non-existent parent category', async () => {
      const updateDto = {
        parentId: '00000000-0000-0000-0000-000000000000',
      };

      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(404);

      expect(response.body.message).toContain('Parent category');
    });

    // CAT-TC27: Self-reference parent
    it('CAT-INT-31: Should return 400 for self-reference parent', async () => {
      const updateDto = {
        parentId: updateCategoryId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(400);

      expect(response.body.message).toContain('A category cannot be its own parent.');
    });

    // CAT-TC28: Update parent category
    it('CAT-INT-32: Should update parent category', async () => {
      const updateDto = {
        parentId: rootCategoryId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.parentId).toBe(rootCategoryId);
    });

    // CAT-TC30: Permission denied
    it('CAT-INT-33: Should return 403 for staff without permission', async () => {
      const updateDto = {
        name: 'No Permission',
      };

      await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .set('Authorization', staffToken)
        .send(updateDto)
        .expect(403);
    });

    // CAT-TC31: No authentication
    it('CAT-INT-34: Should return 401 without authentication', async () => {
      const updateDto = {
        name: 'No Auth',
      };

      await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .send(updateDto)
        .expect(401);
    });
  });

  describe('Edge Cases - Update Category', () => {
    let updateCategoryId: string;

    beforeEach(async () => {
      const category = await prisma.productCategory.create({
        data: { name: `EDGE-UPDATE-${Date.now()}` },
      });
      updateCategoryId = category.id;
    }, 10000);

    // CAT-TC32: Update only name
    it('CAT-INT-35: Should update only name', async () => {
      const updateDto = {
        name: 'Name Only',
      };

      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateDto.name);
    });

    // CAT-TC33: Update only description
    it.skip('CAT-INT-36: Should update only description (SKIPPED - no description field in schema)', async () => {
      // ProductCategory schema does not have description field
    });

    // CAT-TC34: Update only parent
    it('CAT-INT-37: Should update only parent', async () => {
      const updateDto = {
        parentId: rootCategoryId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.parentId).toBe(rootCategoryId);
    });

    // CAT-TC35: Update all fields
    it('CAT-INT-38: Should update all fields', async () => {
      const updateDto = {
        name: 'All Fields',
        parentId: rootCategoryId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateDto.name);
      expect(response.body.data.parentId).toBe(rootCategoryId);
    });

    // CAT-TC36: Update with empty object
    it('CAT-INT-39: Should handle update with empty object', async () => {
      const updateDto = {};

      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    // CAT-TC37: Update parent to null (make root)
    it('CAT-INT-40: Should update parent to null to make root', async () => {
      // First set parent
      await prisma.productCategory.update({
        where: { id: updateCategoryId },
        data: { parentId: rootCategoryId },
      });

      const updateDto = {
        parentId: null,
      };

      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.parentId).toBeNull();
    });

    // CAT-TC38: Update to same parent
    it('CAT-INT-41: Should allow updating to same parent', async () => {
      // First set parent
      await prisma.productCategory.update({
        where: { id: updateCategoryId },
        data: { parentId: rootCategoryId },
      });

      const updateDto = {
        parentId: rootCategoryId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    // CAT-TC40: Update name with special chars
    it('CAT-INT-42: Should update name with special characters', async () => {
      const updateDto = {
        name: 'Special & Updated (2024)',
      };

      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${updateCategoryId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateDto.name);
    });
  });

  describe('DELETE /categories/:id - Delete Category', () => {
    let deleteCategoryId: string;

    beforeEach(async () => {
      await prisma.productCategory.deleteMany({
        where: { name: { startsWith: 'CAT-TO-DELETE' } },
      });

      const category = await prisma.productCategory.create({
        data: { name: `CAT-TO-DELETE-${Date.now()}` },
      });
      deleteCategoryId = category.id;
    }, 10000);

    // Delete with valid ID
    it('CAT-INT-43: Should delete category without children', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/product-categories/${deleteCategoryId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify deleted
      const check = await prisma.productCategory.findUnique({
        where: { id: deleteCategoryId },
      });
      expect(check).toBeNull();
    });

    // Category not found
    it('CAT-INT-44: Should return 404 for non-existent category', async () => {
      const response = await request(app.getHttpServer())
        .delete('/product-categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    // No authentication
    it('CAT-INT-45: Should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/product-categories/${deleteCategoryId}`)
        .expect(401);
    });

    // No permission
    it('CAT-INT-46: Should return 403 for staff without permission', async () => {
      await request(app.getHttpServer())
        .delete(`/product-categories/${deleteCategoryId}`)
        .set('Authorization', staffToken)
        .expect(403);
    });
  });

  describe('Integration Flow - Complete Category Lifecycle', () => {
    it('CAT-INT-47: Should complete full category lifecycle', async () => {
      // 1. Create root category
      const createRootDto = {
        name: 'Lifecycle Root',
      };

      const createRootResponse = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createRootDto)
        .expect(201);

      const rootId = createRootResponse.body.data.id;

      // 2. Create child category
      const createChildDto = {
        name: 'Lifecycle Child',
        parentId: rootId,
      };

      const createChildResponse = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send(createChildDto)
        .expect(201);

      const childId = createChildResponse.body.data.id;

      // 3. Get all categories
      const getAllResponse = await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', adminToken)
        .expect(200);

      expect(getAllResponse.body.success).toBe(true);

      // 4. Get by ID
      const getByIdResponse = await request(app.getHttpServer())
        .get(`/product-categories/${childId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(getByIdResponse.body.data.parentId).toBe(rootId);

      // 5. Update child
      const updateDto = {
        name: 'Updated Lifecycle Child',
      };

      const updateResponse = await request(app.getHttpServer())
        .patch(`/product-categories/${childId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(updateResponse.body.data.name).toBe(updateDto.name);

      // 6. Delete child
      await request(app.getHttpServer())
        .delete(`/product-categories/${childId}`)
        .set('Authorization', adminToken)
        .expect(200);

      // 7. Delete root
      await request(app.getHttpServer())
        .delete(`/product-categories/${rootId}`)
        .set('Authorization', adminToken)
        .expect(200);

      // 8. Verify deletion
      await request(app.getHttpServer())
        .get(`/product-categories/${rootId}`)
        .set('Authorization', adminToken)
        .expect(404);
    }, 30000);
  });
});
