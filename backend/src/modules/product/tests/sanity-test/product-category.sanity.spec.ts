import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `cat-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SANITY TEST - Product Category Module
 * Verify key functionalities after minor changes/bug fixes
 */
describe('Product Category Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let managerToken: string;

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

    await prisma.productCategory.deleteMany({ where: { name: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });

    const adminUser = await prisma.user.create({
      data: {
        username: `admin-category-sanity-${TEST_SUITE_ID}`,
        email: `admin-category-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Category Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-category-sanity-${TEST_SUITE_ID}`,
        email: `manager-category-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager Category Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    adminToken = `Bearer ${jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    })}`;

    managerToken = `Bearer ${jwtService.sign({
      sub: managerUser.id,
      email: managerUser.email,
      role: managerUser.role,
    })}`;
  }, 30000);

  afterAll(async () => {
    await prisma.productCategory.deleteMany({ where: { name: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-CAT-01: Core CRUD Operations', () => {
    let rootCategoryId: string;
    let childCategoryId: string;

    it('should create root category', async () => {
      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send({
          name: `Sanity Root Category ${TEST_SUITE_ID}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      rootCategoryId = response.body.data.id;
    });

    it('should create child category', async () => {
      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send({
          name: `Sanity Child Category ${TEST_SUITE_ID}`,
          parentId: rootCategoryId,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.parentId).not.toBeNull();
      childCategoryId = response.body.data.id;
    });

    it('should retrieve category by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/product-categories/${rootCategoryId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.name).toContain('Sanity Root Category');
    });

    it('should list all categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should update category name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${childCategoryId}`)
        .set('Authorization', adminToken)
        .send({
          name: `Updated Child Category ${TEST_SUITE_ID}`,
        })
        .expect(200);

      expect(response.body.data.name).toContain('Updated Child Category');
    });

    it('should delete child category', async () => {
      await request(app.getHttpServer())
        .delete(`/product-categories/${childCategoryId}`)
        .set('Authorization', adminToken)
        .expect(200);
    });
  });

  describe('SANITY-CAT-02: Validation Rules', () => {
    it('should reject missing name', async () => {
      await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send({})
        .expect(400);
    });

    it('should reject empty name', async () => {
      await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send({
          name: '',
        })
        .expect(400);
    });

    it('should reject non-existent parent', async () => {
      await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send({
          name: 'Invalid Parent Category',
          parentId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);
    });

    it('should reject self-reference parent', async () => {
      const category = await prisma.productCategory.create({
        data: { name: `Self Reference Test ${TEST_SUITE_ID}` },
      });

      await request(app.getHttpServer())
        .patch(`/product-categories/${category.id}`)
        .set('Authorization', adminToken)
        .send({
          parentId: category.id,
        })
        .expect(400);
    });
  });

  describe('SANITY-CAT-03: Authorization', () => {
    it('should allow manager to view categories', async () => {
      await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', managerToken)
        .expect(200);
    });

    it('should allow admin to create category', async () => {
      await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send({
          name: `Auth Test Category ${TEST_SUITE_ID}`,
        })
        .expect(201);
    });
  });

  describe('SANITY-CAT-04: Error Handling', () => {
    it('should return 404 for non-existent category', async () => {
      await request(app.getHttpServer())
        .get('/product-categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('should handle update of non-existent category', async () => {
      await request(app.getHttpServer())
        .patch('/product-categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .send({
          name: 'Non-existent Category',
        })
        .expect(404);
    });
  });
});
