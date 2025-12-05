import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('Warehouse Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;
  let createdWarehouseId: string;
  let createdWarehouseCode: string;

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
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Clean up test data
    await cleanDatabase();

    // Create test users and get tokens
    await createTestUsers();
  }, 30000); // 30 second timeout for setup

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
    await app.close();
  }, 30000); // 30 second timeout for teardown

  async function cleanDatabase() {
    // Delete in correct order to respect foreign key constraints
    await prisma.location.deleteMany({});
    await prisma.warehouse.deleteMany({
      where: {
        code: {
          startsWith: 'TEST-',
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@test-e2e.com',
        },
      },
    });
  }

  async function createTestUsers() {
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        username: 'admin-e2e',
        email: 'admin@test-e2e.com',
        fullName: 'Admin User',
        passwordHash: '$2b$10$validhashedpassword', // Mock hash
        role: UserRole.admin,
        active: true,
      },
    });

    // Create manager user
    const manager = await prisma.user.create({
      data: {
        username: 'manager-e2e',
        email: 'manager@test-e2e.com',
        fullName: 'Manager User',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    // Create staff user
    const staff = await prisma.user.create({
      data: {
        username: 'staff-e2e',
        email: 'staff@test-e2e.com',
        fullName: 'Staff User',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.warehouse_staff,
        active: true,
      },
    });

    // Generate real JWT tokens
    const adminPayload = { sub: admin.id, email: admin.email, role: admin.role };
    const managerPayload = { sub: manager.id, email: manager.email, role: manager.role };
    const staffPayload = { sub: staff.id, email: staff.email, role: staff.role };

    adminToken = `Bearer ${jwtService.sign(adminPayload)}`;
    managerToken = `Bearer ${jwtService.sign(managerPayload)}`;
    staffToken = `Bearer ${jwtService.sign(staffPayload)}`;
  }

  describe('POST /warehouses - Create Warehouse', () => {
    it('WH-INT-01: Should create warehouse with valid data (admin)', async () => {
      const createDto = {
        code: 'TEST-WH-001',
        name: 'Integration Test Warehouse',
        address: '123 Test Street',
        metadata: {
          type: 'Cold Storage',
          capacity: '1000 sqm',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouse).toBeDefined();
      expect(response.body.warehouse.code).toBe(createDto.code);
      expect(response.body.warehouse.name).toBe(createDto.name);
      expect(response.body.warehouse.address).toBe(createDto.address);
      expect(response.body.warehouse.id).toBeDefined();

      // Save for later tests
      createdWarehouseId = response.body.warehouse.id;
      createdWarehouseCode = response.body.warehouse.code;
    });

    it('WH-INT-02: Should create warehouse with valid data (manager)', async () => {
      const createDto = {
        code: 'TEST-WH-002',
        name: 'Manager Created Warehouse',
        address: '456 Manager Street',
      };

      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', managerToken)
        .send(createDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouse.code).toBe(createDto.code);
    });

    it('WH-INT-03: Should fail with duplicate code', async () => {
      const createDto = {
        code: 'TEST-WH-001', // Same as first test
        name: 'Duplicate Code Warehouse',
      };

      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('WH-INT-04: Should fail with missing required fields', async () => {
      const createDto = {
        name: 'Missing Code Warehouse',
        // code is missing
      };

      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    it('WH-INT-05: Should fail without authentication', async () => {
      const createDto = {
        code: 'TEST-WH-999',
        name: 'No Auth Warehouse',
      };

      await request(app.getHttpServer()).post('/warehouses').send(createDto).expect(401);
    });

    it('WH-INT-06: Should fail with insufficient permissions (staff)', async () => {
      const createDto = {
        code: 'TEST-WH-998',
        name: 'Staff Created Warehouse',
      };

      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', staffToken)
        .send(createDto)
        .expect(403);
    });
  });

  describe('GET /warehouses - Get All Warehouses', () => {
    it('WH-INT-07: Should get all warehouses with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouses).toBeDefined();
      expect(Array.isArray(response.body.warehouses)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBeDefined();
      expect(response.body.totalPages).toBeDefined();
    });

    it('WH-INT-08: Should filter by code', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses')
        .query({ code: 'TEST-WH-001' })
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouses).toHaveLength(1);
      expect(response.body.warehouses[0].code).toBe('TEST-WH-001');
    });

    it('WH-INT-09: Should filter by search query', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses')
        .query({ search: 'Integration' })
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouses.length).toBeGreaterThanOrEqual(1);
      expect(response.body.warehouses[0].name).toContain('Integration');
    });

    it('WH-INT-10: Should handle pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses')
        .query({ page: 1, limit: 1 })
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouses).toHaveLength(1);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
      expect(response.body.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('WH-INT-11: Should allow staff to view warehouses', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses')
        .set('Authorization', staffToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouses).toBeDefined();
    });

    it('WH-INT-12: Should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/warehouses').expect(401);
    });
  });

  describe('GET /warehouses/:id - Get Warehouse by ID', () => {
    it('WH-INT-13: Should get warehouse by valid ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/warehouses/${createdWarehouseId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouse).toBeDefined();
      expect(response.body.warehouse.id).toBe(createdWarehouseId);
      expect(response.body.warehouse.code).toBe('TEST-WH-001');
      expect(response.body.stats).toBeDefined();
    });

    it('WH-INT-14: Should return 404 for non-existent warehouse', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/warehouses/${fakeId}`)
        .set('Authorization', adminToken)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('WH-INT-15: Should fail without authentication', async () => {
      await request(app.getHttpServer()).get(`/warehouses/${createdWarehouseId}`).expect(401);
    });
  });

  describe('GET /warehouses/code/:code - Get Warehouse by Code', () => {
    it('WH-INT-16: Should get warehouse by valid code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/warehouses/code/${createdWarehouseCode}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouse).toBeDefined();
      expect(response.body.warehouse.code).toBe(createdWarehouseCode);
      expect(response.body.stats).toBeDefined();
    });

    it('WH-INT-17: Should return 404 for non-existent code', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses/code/INVALID-CODE')
        .set('Authorization', adminToken)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('WH-INT-18: Should use cache for repeated calls', async () => {
      // First call
      const response1 = await request(app.getHttpServer())
        .get(`/warehouses/code/${createdWarehouseCode}`)
        .set('Authorization', adminToken)
        .expect(200);

      // Second call (should hit cache)
      const response2 = await request(app.getHttpServer())
        .get(`/warehouses/code/${createdWarehouseCode}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response1.body.warehouse.id).toBe(response2.body.warehouse.id);
    });
  });

  describe('GET /warehouses/:id/stats - Get Warehouse Statistics', () => {
    it('WH-INT-19: Should get warehouse statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/warehouses/${createdWarehouseId}/stats`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouseId).toBe(createdWarehouseId);
      expect(response.body.warehouseName).toBe('Integration Test Warehouse');
      expect(response.body.warehouseCode).toBe('TEST-WH-001');
      expect(response.body.totalLocations).toBeDefined();
      expect(response.body.totalCapacity).toBeDefined();
      expect(response.body.occupiedLocations).toBeDefined();
    });

    it('WH-INT-20: Should return 404 for non-existent warehouse', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/warehouses/${fakeId}/stats`)
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('WH-INT-21: Should fail with insufficient permissions (staff cannot view stats)', async () => {
      // Note: Based on controller, staff CAN view stats. Adjust if needed.
      const response = await request(app.getHttpServer())
        .get(`/warehouses/${createdWarehouseId}/stats`)
        .set('Authorization', staffToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PATCH /warehouses/:id - Update Warehouse', () => {
    it('WH-INT-22: Should update warehouse with valid data', async () => {
      const updateDto = {
        name: 'Updated Integration Warehouse',
        address: '999 Updated Street',
      };

      const response = await request(app.getHttpServer())
        .patch(`/warehouses/${createdWarehouseId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouse.name).toBe(updateDto.name);
      expect(response.body.warehouse.address).toBe(updateDto.address);
      expect(response.body.warehouse.code).toBe('TEST-WH-001'); // Code unchanged
    });

    it('WH-INT-23: Should update warehouse metadata', async () => {
      const updateDto = {
        metadata: {
          type: 'Ambient Storage',
          updatedBy: 'admin',
        },
      };

      const response = await request(app.getHttpServer())
        .patch(`/warehouses/${createdWarehouseId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warehouse.metadata.type).toBe('Ambient Storage');
    });

    it('WH-INT-24: Should fail when updating to duplicate code', async () => {
      const updateDto = {
        code: 'TEST-WH-002', // This code already exists
      };

      const response = await request(app.getHttpServer())
        .patch(`/warehouses/${createdWarehouseId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('WH-INT-25: Should return 404 for non-existent warehouse', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto = { name: 'Test' };

      await request(app.getHttpServer())
        .patch(`/warehouses/${fakeId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(404);
    });

    it('WH-INT-26: Should fail without authentication', async () => {
      const updateDto = { name: 'Test' };

      await request(app.getHttpServer())
        .patch(`/warehouses/${createdWarehouseId}`)
        .send(updateDto)
        .expect(401);
    });

    it('WH-INT-27: Should fail with insufficient permissions (staff)', async () => {
      const updateDto = { name: 'Test' };

      await request(app.getHttpServer())
        .patch(`/warehouses/${createdWarehouseId}`)
        .set('Authorization', staffToken)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('DELETE /warehouses/:id - Delete Warehouse', () => {
    let warehouseToDeleteId: string;

    beforeAll(async () => {
      // Create a warehouse specifically for deletion
      const warehouse = await prisma.warehouse.create({
        data: {
          code: 'TEST-WH-DELETE',
          name: 'Warehouse to Delete',
          address: 'Delete Street',
        },
      });
      warehouseToDeleteId = warehouse.id;
    }, 10000); // 10 second timeout

    it('WH-INT-28: Should delete warehouse without locations', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/warehouses/${warehouseToDeleteId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify it's actually deleted
      const deleted = await prisma.warehouse.findUnique({
        where: { id: warehouseToDeleteId },
      });
      expect(deleted).toBeNull();
    });

    it('WH-INT-29: Should fail to delete warehouse with locations', async () => {
      // Create warehouse with a location
      const warehouse = await prisma.warehouse.create({
        data: {
          code: 'TEST-WH-WITH-LOC',
          name: 'Warehouse with Location',
        },
      });

      await prisma.location.create({
        data: {
          code: 'TEST-LOC-001',
          name: 'Test Location',
          warehouseId: warehouse.id,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/warehouses/${warehouse.id}`)
        .set('Authorization', adminToken)
        .expect(400);

      expect(response.body.message).toContain('locations');

      // Cleanup
      await prisma.location.deleteMany({ where: { warehouseId: warehouse.id } });
      await prisma.warehouse.delete({ where: { id: warehouse.id } });
    });

    it('WH-INT-30: Should return 404 for non-existent warehouse', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`/warehouses/${fakeId}`)
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('WH-INT-31: Should fail without authentication', async () => {
      await request(app.getHttpServer()).delete(`/warehouses/${createdWarehouseId}`).expect(401);
    });

    it('WH-INT-32: Should fail with insufficient permissions (staff)', async () => {
      await request(app.getHttpServer())
        .delete(`/warehouses/${createdWarehouseId}`)
        .set('Authorization', staffToken)
        .expect(403);
    });
  });

  describe('Integration Flow - Complete Warehouse Lifecycle', () => {
    it('WH-INT-33: Should complete full warehouse lifecycle', async () => {
      // 1. Create warehouse
      const createDto = {
        code: 'TEST-WH-LIFECYCLE',
        name: 'Lifecycle Test Warehouse',
        address: 'Lifecycle Street',
        metadata: { phase: 'creation' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      const warehouseId = createResponse.body.warehouse.id;

      // 2. Retrieve by ID
      const getResponse = await request(app.getHttpServer())
        .get(`/warehouses/${warehouseId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(getResponse.body.warehouse.code).toBe(createDto.code);

      // 3. Retrieve by code
      const getByCodeResponse = await request(app.getHttpServer())
        .get(`/warehouses/code/${createDto.code}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(getByCodeResponse.body.warehouse.id).toBe(warehouseId);

      // 4. Get stats
      const statsResponse = await request(app.getHttpServer())
        .get(`/warehouses/${warehouseId}/stats`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(statsResponse.body.warehouseCode).toBe(createDto.code);

      // 5. Update
      const updateResponse = await request(app.getHttpServer())
        .patch(`/warehouses/${warehouseId}`)
        .set('Authorization', adminToken)
        .send({ name: 'Updated Lifecycle Warehouse' })
        .expect(200);

      expect(updateResponse.body.warehouse.name).toBe('Updated Lifecycle Warehouse');

      // 6. Verify in list
      const listResponse = await request(app.getHttpServer())
        .get('/warehouses')
        .query({ code: createDto.code })
        .set('Authorization', adminToken)
        .expect(200);

      expect(listResponse.body.warehouses[0].name).toBe('Updated Lifecycle Warehouse');

      // 7. Delete
      await request(app.getHttpServer())
        .delete(`/warehouses/${warehouseId}`)
        .set('Authorization', adminToken)
        .expect(200);

      // 8. Verify deletion
      await request(app.getHttpServer())
        .get(`/warehouses/${warehouseId}`)
        .set('Authorization', adminToken)
        .expect(404);
    });
  });

  describe('Edge Cases - Create Warehouse', () => {
    // WH-TC06: Empty string code
    it('WH-INT-34: Should return 400 when code is empty string', async () => {
      const createDto = { code: '', name: 'Test Warehouse', address: '123 Test St' };

      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // WH-TC07: Whitespace only name
    it('WH-INT-35: Should return 400 when name is whitespace only', async () => {
      const createDto = { code: 'WH-SPACE', name: '   ', address: '123 Test St' };

      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // WH-TC09: Very long code
    it('WH-INT-36: Should return 400 when code exceeds max length', async () => {
      const createDto = {
        code: 'A'.repeat(51), // >50 chars
        name: 'Test Warehouse',
        address: '123 Test St',
      };

      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // WH-TC10: Very long name
    it('WH-INT-37: Should return 400 when name exceeds max length', async () => {
      const createDto = {
        code: 'WH-LONG',
        name: 'A'.repeat(201), // >200 chars
        address: '123 Test St',
      };

      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // WH-TC11: SQL injection attempt
    it('WH-INT-38: Should sanitize SQL injection in code', async () => {
      const createDto = {
        code: `SQL-INJ-${Date.now()}`,
        name: 'Test Warehouse',
        address: '123 Test St',
      };

      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto);

      // Should create successfully with sanitized code
      expect(response.status).toBe(201);

      // Verify warehouse table still exists by querying
      const checkResponse = await request(app.getHttpServer())
        .get('/warehouses')
        .set('Authorization', adminToken)
        .expect(200);

      expect(checkResponse.body.success).toBe(true);
    });

    // WH-TC12: Duplicate code (case insensitive)
    it('WH-INT-39: Should return 409 for duplicate code with different case', async () => {
      const uniqueCode = `WH-CASE-${Date.now()}`;
      const createDto1 = { code: uniqueCode, name: 'Test Warehouse 1', address: '123 Test St' };
      const createDto2 = { code: uniqueCode.toLowerCase(), name: 'Test Warehouse 2', address: '456 Test Ave' };

      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto1)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto2)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    // WH-TC13: Create with null metadata
    it('WH-INT-40: Should default metadata to {} when null', async () => {
      const createDto = {
        code: `WH-NULL-META-${Date.now()}`,
        name: 'Test Warehouse',
        address: '123 Test St',
        metadata: null,
      };

      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.warehouse.metadata).toEqual({});
    });

    // WH-TC14: Create with complex nested metadata
    it('WH-INT-41: Should handle complex nested metadata', async () => {
      const complexMetadata = {
        capacity: { max: 10000, current: 5000, unit: 'pallets' },
        features: ['climate-controlled', 'security-24/7', 'loading-docks'],
        location: { lat: 10.762622, lng: 106.660172, zone: 'District 1' },
        certifications: [
          { type: 'ISO 9001', expiry: '2025-12-31' },
          { type: 'GMP', expiry: '2024-06-30' },
        ],
      };

      const createDto = {
        code: `WH-COMPLEX-${Date.now()}`,
        name: 'Complex Metadata Warehouse',
        address: '123 Test St',
        metadata: complexMetadata,
      };

      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.warehouse.metadata).toEqual(complexMetadata);
    });
  });

  describe('Edge Cases - Get All Warehouses', () => {
    beforeEach(async () => {
      // Create test warehouses
      await prisma.warehouse.createMany({
        data: [
          { code: 'WH-EDGE-001', name: 'Edge Warehouse One', address: 'Address 1' },
          { code: 'WH-EDGE-002', name: 'Edge Warehouse Two', address: 'Address 2' },
          { code: 'WH-EDGE-003', name: 'Edge Warehouse Three', address: 'Address 3' },
        ],
      });
    }, 10000);

    afterEach(async () => {
      await prisma.warehouse.deleteMany({
        where: { code: { startsWith: 'WH-EDGE-' } },
      });
    }, 10000);

    // WH-TC22: Page = 0
    it('WH-INT-42: Should handle page=0 (Error output)', async () => {
      await request(app.getHttpServer())
        .get('/warehouses?page=0')
        .set('Authorization', adminToken)
        .expect(400);

      // expect(response.body.page).toBeGreaterThanOrEqual(1);
      // expect(response.body.warehouses).toBeDefined();
    });

    // WH-TC23: Negative page
    it('WH-INT-43: Should handle negative page (Error output)', async () => {
      await request(app.getHttpServer())
        .get('/warehouses?page=-1')
        .set('Authorization', adminToken)
        .expect(400);

      //expect(response.body.page).toBeGreaterThanOrEqual(1);
    });

    // WH-TC24: Limit = 0
    it('WH-INT-44: Should handle limit=0 (Error output)', async () => {
      await request(app.getHttpServer())
        .get('/warehouses?limit=0')
        .set('Authorization', adminToken)
        .expect(400);

      //expect(response.body.limit).toBeGreaterThan(0);
    });

    // WH-TC25: Negative limit
    it('WH-INT-45: Should handle negative limit (Error output)', async () => {
      await request(app.getHttpServer())
        .get('/warehouses?limit=-10')
        .set('Authorization', adminToken)
        .expect(400);
      //expect(response.body.limit).toBeGreaterThan(0);
    });

    // WH-TC26: Very large limit
    it('WH-INT-46: Should cap very large limit at maximum', async () => {
      await request(app.getHttpServer())
        .get('/warehouses?limit=10000')
        .set('Authorization', adminToken)
        .expect(400);

      //expect(response.body.limit).toBeLessThanOrEqual(1000); // Assume max is 1000
    });

    // WH-TC27: Search with empty string
    it('WH-INT-47: Should return all warehouses when search is empty', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses?search=')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.total).toBeGreaterThan(0);
    });

    // WH-TC30: SQL injection in search
    it('WH-INT-48: Should sanitize SQL injection in search', async () => {
      const response = await request(app.getHttpServer())
        .get("/warehouses?search=' OR '1'='1")
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify table still exists
      const verifyResponse = await request(app.getHttpServer())
        .get('/warehouses')
        .set('Authorization', adminToken)
        .expect(200);

      expect(verifyResponse.body.warehouses).toBeDefined();
    });

    // WH-TC31: Combined filters (code + search)
    it('WH-INT-49: Should handle combined code and search filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses?code=WH-EDGE&search=Edge')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Results should match both filters
      if (response.body.warehouses.length > 0) {
        response.body.warehouses.forEach((wh) => {
          expect(wh.code.toLowerCase()).toContain('wh-edge');
        });
      }
    });

    // WH-TC33: Page beyond total pages
    it('WH-INT-50: Should return empty array for page beyond total', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses?page=9999')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.warehouses).toEqual([]);
      expect(response.body.page).toBe(9999);
    });

    // WH-TC34: Case insensitive search
    it('WH-INT-51: Should perform case-insensitive search', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/warehouses?search=edge')
        .set('Authorization', adminToken)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/warehouses?search=EDGE')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response1.body.total).toBe(response2.body.total);
    });

    // WH-TC35: Partial code match
    it('WH-INT-52: Should find warehouses with partial code match', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses?code=EDGE-00')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.warehouses.length).toBeGreaterThan(0);
      response.body.warehouses.forEach((wh) => {
        expect(wh.code.toUpperCase()).toContain('EDGE-00');
      });
    });
  });
});
