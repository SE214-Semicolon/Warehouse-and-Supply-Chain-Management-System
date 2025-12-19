import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `inv-smoke-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SMOKE TEST - Inventory Module
 * Critical path testing for basic operations
 */
describe('Inventory Module - Smoke Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let productBatchId: string;
  let locationId: string;

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

    await prisma.inventory.deleteMany({
      where: { location: { warehouse: { code: { contains: TEST_SUITE_ID } } } },
    });
    await prisma.productBatch.deleteMany({
      where: { product: { sku: { contains: TEST_SUITE_ID } } },
    });
    await prisma.product.deleteMany({ where: { sku: { contains: TEST_SUITE_ID } } });
    await prisma.location.deleteMany({
      where: { warehouse: { code: { contains: TEST_SUITE_ID } } },
    });
    await prisma.warehouse.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });

    const adminUser = await prisma.user.create({
      data: {
        username: `admin-inventory-smoke-${TEST_SUITE_ID}`,
        email: `admin-inventory-smoke-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Inventory Smoke',
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

    const warehouse = await prisma.warehouse.create({
      data: {
        code: `SMOKE-WH-${TEST_SUITE_ID}`,
        name: `Smoke Test Warehouse ${TEST_SUITE_ID}`,
      },
    });

    const location = await prisma.location.create({
      data: {
        warehouseId: warehouse.id,
        code: `SMOKE-LOC-${TEST_SUITE_ID}`,
        name: `Smoke Test Location ${TEST_SUITE_ID}`,
      },
    });

    locationId = location.id;

    const product = await prisma.product.create({
      data: {
        sku: `SMOKE-INV-PROD-${TEST_SUITE_ID}`,
        name: `Smoke Inventory Product ${TEST_SUITE_ID}`,
        unit: 'pcs',
      },
    });

    const productBatch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNo: `SMOKE-INV-BATCH-${TEST_SUITE_ID}`,
        quantity: 1000,
      },
    });

    productBatchId = productBatch.id;
  }, 30000);

  afterAll(async () => {
    await prisma.inventory.deleteMany({
      where: { location: { warehouse: { code: { contains: TEST_SUITE_ID } } } },
    });
    await prisma.productBatch.deleteMany({
      where: { product: { sku: { contains: TEST_SUITE_ID } } },
    });
    await prisma.product.deleteMany({ where: { sku: { contains: TEST_SUITE_ID } } });
    await prisma.location.deleteMany({
      where: { warehouse: { code: { contains: TEST_SUITE_ID } } },
    });
    await prisma.warehouse.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SMOKE-INV-01: Basic Operations', () => {
    it('should RECEIVE inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: productBatchId,
          locationId: locationId,
          quantity: 100,
          idempotencyKey: 'smoke-receive-001',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should GET inventory by location', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${locationId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.inventories)).toBe(true);
    });

    it('should DISPATCH inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send({
          productBatchId: productBatchId,
          locationId: locationId,
          quantity: 50,
          idempotencyKey: 'smoke-dispatch-001',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should ADJUST inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', adminToken)
        .send({
          productBatchId: productBatchId,
          locationId: locationId,
          adjustmentQuantity: 10,
          reason: 'count_error',
          idempotencyKey: 'smoke-adjust-001',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('SMOKE-INV-02: Authentication Check', () => {
    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${locationId}`)
        .expect(401);
    });
  });
});
