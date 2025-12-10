import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `batch-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SANITY TEST - Product Batch Module
 * Verify key functionalities after minor changes/bug fixes
 */
describe('Product Batch Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let managerToken: string;
  let productId: string;

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

    await prisma.productBatch.deleteMany({
      where: { product: { sku: { contains: TEST_SUITE_ID } } },
    });
    await prisma.product.deleteMany({ where: { sku: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });

    const adminUser = await prisma.user.create({
      data: {
        username: `admin-batch-sanity-${TEST_SUITE_ID}`,
        email: `admin-batch-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Batch Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-batch-sanity-${TEST_SUITE_ID}`,
        email: `manager-batch-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager Batch Sanity',
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

    const product = await prisma.product.create({
      data: {
        sku: `SANITY-BATCH-PROD-${TEST_SUITE_ID}`,
        name: `Sanity Batch Product ${TEST_SUITE_ID}`,
        unit: 'pcs',
      },
    });

    productId = product.id;
  }, 30000);

  afterAll(async () => {
    await prisma.productBatch.deleteMany({
      where: { product: { sku: { contains: TEST_SUITE_ID } } },
    });
    await prisma.product.deleteMany({ where: { sku: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-BATCH-01: Core CRUD Operations', () => {
    let batchId: string;

    it('should create batch with all fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send({
          productId: productId,
          batchNo: 'SANITY-BATCH-001',
          quantity: 200,
          manufactureDate: '2024-06-01',
          expiryDate: '2025-06-01',
          barcodeOrQr: 'QR:12345',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      batchId = response.body.data.id;
    });

    it('should retrieve batch by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/product-batches/${batchId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data.batchNo).toBe('SANITY-BATCH-001');
    });

    it('should list all batches with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches?page=1&limit=10')
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter batches by product', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches')
        .query({ productId: productId })
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((batch: any) => {
        expect(batch.productId).toBe(productId);
      });
    });

    it('should update batch successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/product-batches/${batchId}`)
        .set('Authorization', adminToken)
        .send({
          quantity: 250,
          barcodeOrQr: 'QR:UPDATED',
        })
        .expect(200);

      expect(response.body.data.quantity).toBe(250);
      expect(response.body.data.barcodeOrQr).toBe('QR:UPDATED');
    });
  });

  describe('SANITY-BATCH-02: Validation Rules', () => {
    it('should reject duplicate batch number', async () => {
      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send({
          productId: productId,
          batchNo: 'SANITY-DUP-001',
          quantity: 100,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send({
          productId: productId,
          batchNo: 'SANITY-DUP-001',
          quantity: 100,
        })
        .expect(409);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send({
          batchNo: 'SANITY-MISSING-001',
        })
        .expect(400);
    });

    it('should reject non-existent product', async () => {
      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send({
          productId: '00000000-0000-0000-0000-000000000000',
          batchNo: 'SANITY-NOPRODUCT-001',
          quantity: 100,
        })
        .expect(404);
    });

    it('should reject invalid dates', async () => {
      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send({
          productId: productId,
          batchNo: 'SANITY-BADDATE-001',
          quantity: 100,
          manufactureDate: '2025-01-01',
          expiryDate: '2024-01-01',
        })
        .expect(400);
    });
  });

  describe('SANITY-BATCH-03: Authorization', () => {
    it('should allow manager to view batches', async () => {
      await request(app.getHttpServer())
        .get('/product-batches')
        .set('Authorization', managerToken)
        .expect(200);
    });

    it('should allow manager to create batch', async () => {
      await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', managerToken)
        .send({
          productId: productId,
          batchNo: 'SANITY-MANAGER-001',
          quantity: 100,
        })
        .expect(201);
    });
  });

  describe('SANITY-BATCH-04: Error Handling', () => {
    it('should return 404 for non-existent batch', async () => {
      await request(app.getHttpServer())
        .get('/product-batches/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('should handle update of non-existent batch', async () => {
      await request(app.getHttpServer())
        .patch('/product-batches/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .send({
          quantity: 100,
        })
        .expect(404);
    });
  });
});
