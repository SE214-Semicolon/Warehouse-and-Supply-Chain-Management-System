import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

/**
 * SANITY TEST - Inventory Module
 * Verify key functionalities after minor changes/bug fixes
 */
describe('Inventory Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let adminUserId: string;
  let managerToken: string;
  let productBatchId: string;
  let locationId: string;
  let location2Id: string;

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

    await prisma.inventory.deleteMany({});
    await prisma.productBatch.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.warehouse.deleteMany({});
    await prisma.user.deleteMany({});

    const adminUser = await prisma.user.create({
      data: {
        username: 'admin-inventory-sanity',
        email: 'admin-inventory-sanity@test.com',
        fullName: 'Admin Inventory Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: 'manager-inventory-sanity',
        email: 'manager-inventory-sanity@test.com',
        fullName: 'Manager Inventory Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    adminUserId = adminUser.id;
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

    const warehouse = await prisma.warehouse.create({
      data: {
        code: 'SANITY-WH-001',
        name: 'Sanity Test Warehouse',
      },
    });

    const location = await prisma.location.create({
      data: {
        warehouseId: warehouse.id,
        code: 'SANITY-LOC-001',
        name: 'Sanity Test Location 1',
      },
    });

    const location2 = await prisma.location.create({
      data: {
        warehouseId: warehouse.id,
        code: 'SANITY-LOC-002',
        name: 'Sanity Test Location 2',
      },
    });

    locationId = location.id;
    location2Id = location2.id;

    const product = await prisma.product.create({
      data: {
        sku: 'SANITY-INV-PROD-001',
        name: 'Sanity Inventory Product',
        unit: 'pcs',
      },
    });

    const productBatch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNo: 'SANITY-INV-BATCH-001',
        quantity: 1000,
      },
    });

    productBatchId = productBatch.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('SANITY-INV-01: Receive Operations', () => {
    it('should receive inventory with all fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: productBatchId,
          locationId: locationId,
          quantity: 200,
          createdById: adminUserId,
          idempotencyKey: `sanity-receive-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory.availableQty).toBeGreaterThanOrEqual(200);
    });

    it('should handle idempotency correctly', async () => {
      const idempKey = `sanity-idem-${Date.now()}`;

      const response1 = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: productBatchId,
          locationId: locationId,
          quantity: 100,
          idempotencyKey: idempKey,
        })
        .expect(201);

      expect(response1.body.success).toBe(true);

      const response2 = await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: productBatchId,
          locationId: locationId,
          quantity: 100,
          idempotencyKey: idempKey,
        })
        .expect(201);

      expect(response2.body.idempotent).toBe(true);
    });
  });

  describe('SANITY-INV-02: Dispatch Operations', () => {
    it('should dispatch inventory successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send({
          productBatchId: productBatchId,
          locationId: locationId,
          quantity: 50,
          idempotencyKey: `sanity-dispatch-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject dispatch when insufficient stock', async () => {
      await request(app.getHttpServer())
        .post('/inventory/dispatch')
        .set('Authorization', adminToken)
        .send({
          productBatchId: productBatchId,
          locationId: locationId,
          quantity: 999999,
          idempotencyKey: `sanity-dispatch-insufficient-${Date.now()}`,
        })
        .expect(400);
    });
  });

  describe('SANITY-INV-03: Transfer Operations', () => {
    it('should transfer inventory between locations', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', adminToken)
        .send({
          productBatchId: productBatchId,
          fromLocationId: locationId,
          toLocationId: location2Id,
          quantity: 30,
          idempotencyKey: `sanity-transfer-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject transfer to same location', async () => {
      await request(app.getHttpServer())
        .post('/inventory/transfer')
        .set('Authorization', adminToken)
        .send({
          productBatchId: productBatchId,
          fromLocationId: locationId,
          toLocationId: locationId,
          quantity: 10,
          idempotencyKey: `sanity-transfer-same-${Date.now()}`,
        })
        .expect(400);
    });
  });

  describe('SANITY-INV-04: Reserve and Release', () => {
    it('should reserve inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', adminToken)
        .send({
          productBatchId: productBatchId,
          locationId: locationId,
          quantity: 20,
          orderId: 'order-sanity-001',
          idempotencyKey: `sanity-reserve-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inventory.reservedQty).toBeGreaterThanOrEqual(20);
    });

    it('should release reservation', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/release')
        .set('Authorization', adminToken)
        .send({
          productBatchId: productBatchId,
          locationId: locationId,
          quantity: 10,
          orderId: 'order-sanity-001',
          idempotencyKey: `sanity-release-${Date.now()}`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('SANITY-INV-05: Query Operations', () => {
    it('should get inventory by location', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${locationId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.inventories)).toBe(true);
    });

    it('should get inventory by product batch', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/product-batch?productBatchId=${productBatchId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.inventories)).toBe(true);
    });
  });

  describe('SANITY-INV-06: Authorization', () => {
    it('should allow manager to view inventory', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/location?locationId=${locationId}`)
        .set('Authorization', managerToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('SANITY-INV-07: Validation', () => {
    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          locationId: locationId,
          quantity: 100,
        })
        .expect(400);
    });

    it('should reject non-existent product batch', async () => {
      await request(app.getHttpServer())
        .post('/inventory/receive')
        .set('Authorization', adminToken)
        .send({
          productBatchId: '00000000-0000-0000-0000-000000000000',
          locationId: locationId,
          quantity: 100,
          idempotencyKey: `sanity-invalid-batch-${Date.now()}`,
        })
        .expect(404);
    });
  });
});
