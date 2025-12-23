import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `wh-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SANITY TEST - Warehouse Module

 * Purpose: Verify critical functionality works (basic health check)
 * Scope: Test only the most critical paths
 * When to run: After every build, before deployment

 * Test Coverage:
 * - Can create a warehouse
 * - Can retrieve warehouses
 * - Can update a warehouse
 * - Can delete a warehouse
 */
describe('Warehouse Module - Sanity Tests', () => {
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

    // Clean only this test suite's data
    await prisma.warehouse.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });

    const adminUser = await prisma.user.create({
      data: {
        username: `admin-sanity-${TEST_SUITE_ID}`,
        email: `admin-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Sanity Test',
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
    // Clean up only this test suite's data
    await prisma.warehouse.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-WH-01: Critical Path - CRUD Operations', () => {
    let warehouseId: string;

    it('should CREATE a warehouse successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send({
          code: `SANITY-WH-${Date.now()}`,
          name: 'Sanity Test Warehouse',
          address: '123 Test Street',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Sanity Test Warehouse');
      warehouseId = response.body.data.id;
    });

    it('should READ warehouses successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should UPDATE a warehouse successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/warehouses/${warehouseId}`)
        .set('Authorization', adminToken)
        .send({
          name: 'Updated Smoke Warehouse',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Smoke Warehouse');
    });

    it('should DELETE a warehouse successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/warehouses/${warehouseId}`)
        .set('Authorization', adminToken)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/warehouses/${warehouseId}`)
        .set('Authorization', adminToken)
        .expect(404);
    });
  });

  describe('SANITY-WH-02: Authentication Check', () => {
    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer()).get('/warehouses').expect(401);
    });
  });
});
