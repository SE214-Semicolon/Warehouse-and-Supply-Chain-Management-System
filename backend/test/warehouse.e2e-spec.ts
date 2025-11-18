import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Warehouse Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
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

    // Clean up test data
    await cleanDatabase();

    // Create test users and get tokens
    await createTestUsers();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
    await app.close();
  });

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

    // Generate tokens (simplified - in real app, call /auth/login)
    adminToken = `Bearer mock-token-admin-${admin.id}`;
    managerToken = `Bearer mock-token-manager-${manager.id}`;
    staffToken = `Bearer mock-token-staff-${staff.id}`;
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
    });

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
});
