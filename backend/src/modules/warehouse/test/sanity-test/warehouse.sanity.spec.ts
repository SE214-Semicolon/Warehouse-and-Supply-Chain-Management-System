import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

/**
 * SANITY TEST - Warehouse Module
 * Purpose: Verify key functionalities after minor changes/bug fixes
 * Scope: Test main features and common use cases
 * When to run: After bug fixes, minor updates
 * Test Coverage:
 * - Basic CRUD operations
 * - Data validation
 * - Business rules
 * - Common error scenarios
 */
describe('Warehouse Module - Sanity Tests', () => {
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

    // Clean and setup
    await prisma.warehouse.deleteMany({});
    await prisma.user.deleteMany({});

    const adminUser = await prisma.user.create({
      data: {
        username: 'admin-sanity-test',
        email: 'admin-sanity@test.com',
        fullName: 'Admin Sanity Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: 'manager-sanity-test',
        email: 'manager-sanity@test.com',
        fullName: 'Manager Sanity Test',
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
    await app.close();
  }, 30000);

  describe('SANITY-WH-01: Core CRUD Operations', () => {
    let warehouseId: string;

    it('should create warehouse with all valid fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send({
          code: `SANITY-WH-${Date.now()}`,
          name: 'Sanity Test Warehouse',
          address: '456 Sanity Street',
          metadata: { phone: '1234567890', email: 'sanity@test.com' },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouse).toHaveProperty('id');
      warehouseId = response.body.warehouse.id;
    });

    it('should retrieve warehouse by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/warehouses/${warehouseId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouse).toHaveProperty('id', warehouseId);
    });

    it('should list all warehouses with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses?page=1&limit=10')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.warehouses)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should update warehouse successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/warehouses/${warehouseId}`)
        .set('Authorization', adminToken)
        .send({
          name: 'Updated Sanity Warehouse',
          address: '789 Updated Street',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouse.name).toBe('Updated Sanity Warehouse');
      expect(response.body.warehouse.address).toBe('789 Updated Street');
    });
  });

  describe('SANITY-WH-02: Validation Rules', () => {
    it('should reject duplicate warehouse code', async () => {
      const duplicateCode = `SANITY-DUP-${Date.now()}`;
      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send({
          code: duplicateCode,
          name: 'First Warehouse',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send({
          code: duplicateCode,
          name: 'Second Warehouse',
        })
        .expect(409);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send({
          name: 'Missing Code Warehouse',
        })
        .expect(400);
    });

    it('should handle empty name gracefully', async () => {
      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send({
          code: `SANITY-EMPTY-${Date.now()}`,
          name: '',
        })
        .expect(400);
    });
  });

  describe('SANITY-WH-03: Authorization', () => {
    it('should allow manager to view warehouses', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses')
        .set('Authorization', managerToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow admin to create warehouse', async () => {
      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send({
          code: `SANITY-ADMIN-${Date.now()}`,
          name: 'Auth Test Warehouse',
        })
        .expect(201);
    });
  });

  describe('SANITY-WH-04: Error Handling', () => {
    it('should return 404 for non-existent warehouse', async () => {
      await request(app.getHttpServer())
        .get('/warehouses/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('should handle update of non-existent warehouse', async () => {
      await request(app.getHttpServer())
        .patch('/warehouses/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .send({
          name: 'Non-existent Warehouse',
        })
        .expect(404);
    });
  });
});
