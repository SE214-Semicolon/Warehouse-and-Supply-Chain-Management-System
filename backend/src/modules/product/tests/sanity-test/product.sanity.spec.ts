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
 * Critical path testing for basic CRUD operations
 */
describe('Product Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;

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
        fullName: 'Admin Product Smoke',
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
  }, 30000);

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { sku: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-PROD-01: CRUD Operations', () => {
    let productId: string;

    it('should CREATE product', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', adminToken)
        .send({
          sku: `SANITY-PROD-${TEST_SUITE_ID}`,
          name: `Smoke Test Product ${TEST_SUITE_ID}`,
          unit: 'pcs',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      productId = response.body.data.id;
    });

    it('should READ products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should UPDATE product', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', adminToken)
        .send({
          name: `Updated Smoke Product ${TEST_SUITE_ID}`,
        })
        .expect(200);

      expect(response.body.data.name).toContain('Updated Smoke Product');
    });

    it('should DELETE product', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .set('Authorization', adminToken)
        .expect(200);
    });
  });

  describe('SANITY-PROD-02: Authentication Check', () => {
    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer()).get('/products').expect(401);
    });
  });
});
