import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Product Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let categoryId: string;
  let productId: string;
  let batchId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = app.get<PrismaService>(PrismaService);

    await app.init();

    // Create test user and login
    const testUser = await prisma.user.upsert({
      where: { username: 'test-product-user' },
      update: {},
      create: {
        username: 'test-product-user',
        email: 'test-product@example.com',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv', // dummy hash
        role: 'admin',
        fullName: 'Test Product User',
        active: true,
      },
    });

    // Get auth token (mock)
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'test-product-user', password: 'password123' });

    if (loginResponse.status === 201 || loginResponse.status === 200) {
      authToken = loginResponse.body.accessToken;
    } else {
      // If login fails, use a mock token (for testing purposes)
      authToken = 'mock-token-for-testing';
    }
  });

  afterAll(async () => {
    // Cleanup
    if (batchId) {
      await prisma.productBatch.deleteMany({ where: { id: batchId } });
    }
    if (productId) {
      await prisma.product.deleteMany({ where: { id: productId } });
    }
    if (categoryId) {
      await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    }
    await prisma.user.deleteMany({ where: { username: 'test-product-user' } });
    await app.close();
  });

  describe('ProductCategory', () => {
    it('POST /product-categories - should create a category', async () => {
      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Test Category',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('E2E Test Category');
      categoryId = response.body.id;
    });

    it('GET /product-categories - should get all categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /product-categories/:id - should get category by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/product-categories/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(categoryId);
    });

    it('PATCH /product-categories/:id - should update category', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Test Category Updated',
        })
        .expect(200);

      expect(response.body.name).toBe('E2E Test Category Updated');
    });
  });

  describe('Product', () => {
    it('POST /products - should create a product', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sku: 'E2E-SKU-001',
          name: 'E2E Test Product',
          categoryId: categoryId,
          unit: 'pcs',
          barcode: '1234567890123',
          parameters: {
            color: 'blue',
            weight: '1kg',
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.sku).toBe('E2E-SKU-001');
      productId = response.body.id;
    });

    it('POST /products - should fail with duplicate SKU', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sku: 'E2E-SKU-001', // duplicate
          name: 'Another Product',
          unit: 'pcs',
        })
        .expect(409);
    });

    it('GET /products - should get all products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
    });

    it('GET /products - should filter by search', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?search=E2E')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.products.length).toBeGreaterThan(0);
    });

    it('GET /products/sku/:sku - should get product by SKU', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/sku/E2E-SKU-001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.product.sku).toBe('E2E-SKU-001');
    });

    it('GET /products/:id - should get product by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.product.id).toBe(productId);
    });

    it('PATCH /products/:id - should update product', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Test Product Updated',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.product.name).toBe('E2E Test Product Updated');
    });
  });

  describe('ProductBatch', () => {
    it('POST /product-batches - should create a batch', async () => {
      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: productId,
          batchNo: 'E2E-BATCH-001',
          quantity: 100,
          manufactureDate: '2024-01-01T00:00:00.000Z',
          expiryDate: '2025-01-01T00:00:00.000Z',
          barcodeOrQr: 'QR:E2E-TEST',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.batch.batchNo).toBe('E2E-BATCH-001');
      batchId = response.body.batch.id;
    });

    it('POST /product-batches - should fail with duplicate batch number', async () => {
      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: productId,
          batchNo: 'E2E-BATCH-001', // duplicate
          quantity: 50,
        })
        .expect(409);
    });

    it('POST /product-batches - should fail with invalid dates', async () => {
      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: productId,
          batchNo: 'E2E-BATCH-002',
          quantity: 50,
          manufactureDate: '2025-01-01T00:00:00.000Z',
          expiryDate: '2024-01-01T00:00:00.000Z', // before manufacture date
        })
        .expect(400);
    });

    it('GET /product-batches - should get all batches', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('batches');
      expect(response.body).toHaveProperty('total');
    });

    it('GET /product-batches/product/:productId - should get batches by product', async () => {
      const response = await request(app.getHttpServer())
        .get(`/product-batches/product/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.batches.length).toBeGreaterThan(0);
    });

    it('GET /product-batches/expiring - should get expiring batches', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches/expiring?daysAhead=365')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /product-batches/:id - should get batch by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/product-batches/${batchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.batch.id).toBe(batchId);
    });

    it('PATCH /product-batches/:id - should update batch', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/product-batches/${batchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 150,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.batch.quantity).toBe(150);
    });

    it('DELETE /product-batches/:id - should delete batch', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/product-batches/${batchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      batchId = null; // Mark as deleted
    });
  });

  describe('Product Deletion', () => {
    it('DELETE /products/:id - should delete product', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      productId = null; // Mark as deleted
    });
  });

  describe('Category Deletion', () => {
    it('DELETE /product-categories/:id - should delete category', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/product-categories/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      categoryId = null; // Mark as deleted
    });
  });
});
