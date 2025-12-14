import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `po-smoke-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SMOKE TEST - Order Module
 * Critical path testing for basic CRUD operations
 */
describe('Purchase Order Module - Smoke Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let adminUserId: string;
  let supplierId: string;

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

    await prisma.purchaseOrder.deleteMany({
      where: { supplier: { code: { contains: TEST_SUITE_ID } } },
    });
    await prisma.supplier.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });

    const adminUser = await prisma.user.create({
      data: {
        username: `admin-order-smoke-${TEST_SUITE_ID}`,
        email: `admin-order-smoke-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Order Smoke',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    adminUserId = adminUser.id;

    adminToken = `Bearer ${jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    })}`;

    const supplier = await prisma.supplier.create({
      data: {
        code: `SMOKE-SUPPLIER-${TEST_SUITE_ID}`,
        name: `Smoke Test Supplier ${TEST_SUITE_ID}`,
        contactInfo: JSON.stringify({ email: 'supplier@test.com' }),
      },
    });

    supplierId = supplier.id;
  }, 30000);

  afterAll(async () => {
    await prisma.purchaseOrder.deleteMany({
      where: { supplier: { code: { contains: TEST_SUITE_ID } } },
    });
    await prisma.supplier.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SMOKE-ORDER-01: CRUD Operations', () => {
    let orderId: string;

    it('should CREATE order', async () => {
      const response = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', adminToken)
        .send({
          supplierId: supplierId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.supplierId).toBe(supplierId);
      orderId = response.body.id;
    });

    it('should READ orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchase-orders')
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
    });

    it('should UPDATE order', async () => {
      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${orderId}/submit`)
        .set('Authorization', adminToken)
        .send({
          userId: adminUserId,
        })
        .expect(201);

      expect(response.body.status).toBe('ordered');
    });
  });

  describe('SMOKE-ORDER-02: Authentication Check', () => {
    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer()).get('/purchase-orders').expect(401);
    });
  });
});
