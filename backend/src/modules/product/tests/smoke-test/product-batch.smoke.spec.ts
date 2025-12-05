import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

/**
 * SMOKE TEST - Product Batch Module
 * Critical path testing for basic CRUD operations
 */
describe('Product Batch Module - Smoke Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
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

    await prisma.productBatch.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});

    const adminUser = await prisma.user.create({
      data: {
        username: 'admin-batch-smoke',
        email: 'admin-batch-smoke@test.com',
        fullName: 'Admin Batch Smoke',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    adminToken = `Bearer ${jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    })}`;

    const product = await prisma.product.create({
      data: {
        sku: 'SMOKE-BATCH-PROD-001',
        name: 'Smoke Batch Product',
        unit: 'pcs',
      },
    });

    productId = product.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('SMOKE-BATCH-01: CRUD Operations', () => {
    let batchId: string;

    it('should CREATE product batch', async () => {
      const response = await request(app.getHttpServer())
        .post('/product-batches')
        .set('Authorization', adminToken)
        .send({
          productId: productId,
          batchNo: 'SMOKE-BATCH-001',
          quantity: 100,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      batchId = response.body.data.id;
    });

    it('should READ product batches', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-batches')
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should UPDATE product batch', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/product-batches/${batchId}`)
        .set('Authorization', adminToken)
        .send({
          quantity: 150,
        })
        .expect(200);

      expect(response.body.data.quantity).toBe(150);
    });

    it('should DELETE product batch', async () => {
      await request(app.getHttpServer())
        .delete(`/product-batches/${batchId}`)
        .set('Authorization', adminToken)
        .expect(200);
    });
  });

  describe('SMOKE-BATCH-02: Authentication Check', () => {
    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer()).get('/product-batches').expect(401);
    });
  });
});
