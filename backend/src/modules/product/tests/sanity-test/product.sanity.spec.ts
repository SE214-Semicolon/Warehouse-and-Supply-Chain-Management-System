import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `prod-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SANITY TEST - Product Module
 * Verify key functionalities after minor changes/bug fixes
 */
describe('Product Module - Sanity Tests', () => {
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

    await prisma.product.deleteMany({ where: { sku: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });

    const adminUser = await prisma.user.create({
      data: {
        username: `admin-product-sanity-${TEST_SUITE_ID}`,
        email: `admin-product-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Product Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-product-sanity-${TEST_SUITE_ID}`,
        email: `manager-product-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager Product Sanity',
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
    await prisma.product.deleteMany({ where: { sku: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-PROD-01: Core CRUD Operations', () => {
    let productId: string;
    let productSku: string;

    it('should create product with all fields', async () => {
      productSku = `SANITY-PROD-${Date.now()}`;
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

  describe('SANITY-PROD-02: Validation Rules', () => {
    it('should reject duplicate SKU', async () => {
      const dupSku = `SANITY-DUP-${Date.now()}`;

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

  describe('SANITY-PROD-03: Authorization', () => {
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
          sku: `SANITY-MANAGER-${TEST_SUITE_ID}`,
          name: `Manager Created Product ${TEST_SUITE_ID}`,
          unit: 'pcs',
        })
        .expect(201);
    });
  });

  describe('SANITY-PROD-04: Error Handling', () => {
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

  describe('SANITY-PROD-05: Search and Filter', () => {
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
