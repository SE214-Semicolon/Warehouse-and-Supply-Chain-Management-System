import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

/**
 * SMOKE TEST - Warehouse Module

 * Purpose: Verify critical functionality works (basic health check)
 * Scope: Test only the most critical paths
 * When to run: After every build, before deployment

 * Test Coverage:
 * - Can create a warehouse
 * - Can retrieve warehouses
 * - Can update a warehouse
 * - Can delete a warehouse
 */
describe('Warehouse Module - Smoke Tests', () => {
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

    // Clean and setup
    await prisma.warehouse.deleteMany({});
    await prisma.user.deleteMany({});

    const adminUser = await prisma.user.create({
      data: {
        username: 'admin-smoke-test',
        email: 'admin-smoke@test.com',
        fullName: 'Admin Smoke Test',
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
    await app.close();
  }, 30000);

  describe('SMOKE-WH-01: Critical Path - CRUD Operations', () => {
    let warehouseId: string;

    it('should CREATE a warehouse successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send({
          code: `SMOKE-WH-${Date.now()}`,
          name: 'Smoke Test Warehouse',
          address: '123 Test Street',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouse).toHaveProperty('id');
      expect(response.body.warehouse.name).toBe('Smoke Test Warehouse');
      warehouseId = response.body.warehouse.id;
    });

    it('should READ warehouses successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.warehouses)).toBe(true);
      expect(response.body.warehouses.length).toBeGreaterThan(0);
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
      expect(response.body.warehouse.name).toBe('Updated Smoke Warehouse');
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

  describe('SMOKE-WH-02: Authentication Check', () => {
    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer()).get('/warehouses').expect(401);
    });
  });
});
