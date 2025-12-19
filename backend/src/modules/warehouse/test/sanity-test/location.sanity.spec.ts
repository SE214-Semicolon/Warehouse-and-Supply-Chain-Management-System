import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `loc-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SANITY TEST - Location Module

 * Purpose: Verify key functionalities after minor changes/bug fixes
 * Scope: Test main features and common use cases
 * When to run: After bug fixes, minor updates
 */
describe('Location Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let managerToken: string;
  let warehouseId: string;

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

    await prisma.location.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.warehouse.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });

    const adminUser = await prisma.user.create({
      data: {
        username: `admin-loc-sanity-${TEST_SUITE_ID}`,
        email: `admin-loc-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Location Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        username: `manager-loc-sanity-${TEST_SUITE_ID}`,
        email: `manager-loc-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager Location Sanity',
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

    const warehouse = await prisma.warehouse.create({
      data: {
        code: `SANITY-WH-${TEST_SUITE_ID}`,
        name: `Sanity Test Warehouse ${TEST_SUITE_ID}`,
      },
    });

    warehouseId = warehouse.id;
  }, 30000);

  afterAll(async () => {
    await prisma.location.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.warehouse.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-LOC-01: Core CRUD Operations', () => {
    let locationId: string;

    it('should create location with all valid fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          warehouseId: warehouseId,
          code: `SANITY-LOC-${Date.now()}`,
          name: 'Sanity Test Location',
          capacity: 100,
          type: 'shelf',
          properties: { aisle: 'A', rack: '01', shelf: '01', bin: '01' },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.location).toHaveProperty('id');
      locationId = response.body.location.id;
    });

    it('should retrieve location by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/locations/${locationId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.location).toHaveProperty('id', locationId);
    });

    it('should list all locations with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations?page=1&limit=10')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.locations)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should update location successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/locations/${locationId}`)
        .set('Authorization', adminToken)
        .send({
          name: 'Updated Sanity Location',
          properties: { aisle: 'B' },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.location.name).toBe('Updated Sanity Location');
    });
  });

  describe('SANITY-LOC-02: Validation Rules', () => {
    it('should reject duplicate location code in same warehouse', async () => {
      const duplicateCode = `SANITY-DUP-${Date.now()}`;
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          warehouseId: warehouseId,
          code: duplicateCode,
          name: 'First Location',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          warehouseId: warehouseId,
          code: duplicateCode,
          name: 'Second Location',
        })
        .expect(409);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          name: 'Missing Code Location',
        })
        .expect(400);
    });

    it('should reject non-existent warehouse', async () => {
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          warehouseId: '00000000-0000-0000-0000-000000000000',
          code: 'SANITY-NOWAREHOUSE-001',
          name: 'No Warehouse Location',
        })
        .expect(404);
    });
  });

  describe('SANITY-LOC-03: Authorization', () => {
    it('should allow manager to view locations', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations')
        .set('Authorization', managerToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow admin to create location', async () => {
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          warehouseId: warehouseId,
          code: `SANITY-AUTH-${Date.now()}`,
          name: 'Auth Test Location',
        })
        .expect(201);
    });
  });

  describe('SANITY-LOC-04: Error Handling', () => {
    it('should return 404 for non-existent location', async () => {
      await request(app.getHttpServer())
        .get('/locations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('should handle update of non-existent location', async () => {
      await request(app.getHttpServer())
        .patch('/locations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .send({
          name: 'Non-existent Location',
        })
        .expect(404);
    });
  });

  describe('SANITY-LOC-05: Filter by Warehouse', () => {
    it('should filter locations by warehouse', async () => {
      const response = await request(app.getHttpServer())
        .get(`/locations?warehouseId=${warehouseId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.locations)).toBe(true);
      response.body.locations.forEach((location: any) => {
        expect(location.warehouseId).toBe(warehouseId);
      });
    });
  });
});
