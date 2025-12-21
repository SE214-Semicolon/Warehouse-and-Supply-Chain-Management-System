import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `location-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Location Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Mock tokens for different roles
  let adminToken: string;
  let staffToken: string;

  // Test warehouse and location IDs
  let testWarehouseId: string;
  let testWarehouse2Id: string;
  let createdLocationId: string;

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

    // Create test users and get tokens with unique identifiers
    const adminUser = await prisma.user.create({
      data: {
        username: `admin-loc-${TEST_SUITE_ID}`,
        email: `admin-loc-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Location Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const staffUser = await prisma.user.create({
      data: {
        username: `staff-loc-${TEST_SUITE_ID}`,
        email: `staff-loc-${TEST_SUITE_ID}@test.com`,
        fullName: 'Staff Location Test',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.warehouse_staff,
        active: true,
      },
    });

    // Generate real JWT tokens
    const adminPayload = { sub: adminUser.id, email: adminUser.email, role: adminUser.role };
    const staffPayload = { sub: staffUser.id, email: staffUser.email, role: staffUser.role };

    adminToken = `Bearer ${jwtService.sign(adminPayload)}`;
    staffToken = `Bearer ${jwtService.sign(staffPayload)}`;

    // Create test warehouses
    const warehouse1 = await prisma.warehouse.create({
      data: {
        code: `TEST-WH-LOC-001-${TEST_SUITE_ID}`,
        name: 'Test Warehouse for Locations',
        address: '123 Test Street',
      },
    });
    testWarehouseId = warehouse1.id;

    const warehouse2 = await prisma.warehouse.create({
      data: {
        code: `TEST-WH-LOC-002-${TEST_SUITE_ID}`,
        name: 'Second Test Warehouse',
        address: '456 Test Avenue',
      },
    });
    testWarehouse2Id = warehouse2.id;

    // Create initial test location
    const location = await prisma.location.create({
      data: {
        code: `TEST-LOC-001-${TEST_SUITE_ID}`,
        name: 'Test Location 1',
        capacity: 100,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      },
    });
    createdLocationId = location.id;

    // Create another location for duplicate testing
    await prisma.location.create({
      data: {
        code: `TEST-LOC-002-${TEST_SUITE_ID}`,
        name: 'Test Location 2',
        capacity: 200,
        type: 'PALLET',
        warehouseId: testWarehouseId,
      },
    });
  }, 30000); // 30 second timeout for setup

  afterAll(async () => {
    // Clean up only this test suite's data
    await prisma.location.deleteMany({
      where: {
        code: {
          contains: TEST_SUITE_ID,
        },
      },
    });
    await prisma.warehouse.deleteMany({
      where: {
        code: {
          contains: TEST_SUITE_ID,
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: TEST_SUITE_ID,
        },
      },
    });
    await app.close();
  }, 30000);

  describe('POST /locations - Create Location', () => {
    // LOC-TC01: Create with valid data
    it('LOC-INT-01: Should create location with valid data', async () => {
      const createDto = {
        code: 'LOC-NEW-001',
        name: 'New Location',
        capacity: 150,
        type: 'SHELF',
        warehouseId: testWarehouseId,
        properties: { zone: 'A', aisle: '1' },
      };

      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe(createDto.code);
      expect(response.body.data.capacity).toBe(createDto.capacity);
      expect(response.body.data.warehouseId).toBe(testWarehouseId);
    });

    // LOC-TC02: Warehouse not found
    it('LOC-INT-02: Should return 404 when warehouse not found', async () => {
      const createDto = {
        code: 'LOC-NO-WH',
        name: 'No Warehouse Location',
        capacity: 100,
        type: 'SHELF',
        warehouseId: '00000000-0000-0000-0000-000000000000',
      };

      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(404);

      expect(response.body.message).toContain('Warehouse');
    });

    // LOC-TC03: Duplicate code in same warehouse
    it('LOC-INT-03: Should return 409 for duplicate code in same warehouse', async () => {
      const createDto = {
        code: `TEST-LOC-001-${TEST_SUITE_ID}`, // Already exists in testWarehouseId
        name: 'Duplicate Location',
        capacity: 100,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      };

      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    // LOC-TC04: Invalid data (missing required fields)
    it('LOC-INT-04: Should return 400 for missing required fields', async () => {
      const createDto = {
        code: 'LOC-INVALID',
        // Missing name, capacity, type, warehouseId
      };

      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // LOC-TC05: No permission (tested by guard)
    it('LOC-INT-05: Should return 403 for staff without permission', async () => {
      const createDto = {
        code: 'LOC-NO-PERM',
        name: 'No Permission Location',
        capacity: 100,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      };

      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', staffToken)
        .send(createDto)
        .expect(403);
    });

    // LOC-TC06: No auth
    it('LOC-INT-06: Should return 401 without authentication', async () => {
      const createDto = {
        code: 'LOC-NO-AUTH',
        name: 'No Auth Location',
        capacity: 100,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      };

      await request(app.getHttpServer()).post('/locations').send(createDto).expect(401);
    });
  });

  describe('Edge Cases - Create Location', () => {
    // LOC-TC07: Empty string code
    it('LOC-INT-07: Should return 400 for empty string code', async () => {
      const createDto = {
        code: '',
        name: 'Empty Code Location',
        capacity: 100,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      };

      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // LOC-TC08: Whitespace only name
    it('LOC-INT-08: Should return 400 for whitespace only name', async () => {
      const createDto = {
        code: 'LOC-SPACE',
        name: '   ',
        capacity: 100,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      };

      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // LOC-TC09: Negative capacity
    it('LOC-INT-09: Should return 400 for negative capacity', async () => {
      const createDto = {
        code: 'LOC-NEG-CAP',
        name: 'Negative Capacity',
        capacity: -10,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      };

      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // LOC-TC10: Zero capacity
    it('LOC-INT-10: Should handle zero capacity based on business rules', async () => {
      const createDto = {
        code: 'LOC-ZERO-CAP',
        name: 'Zero Capacity',
        capacity: 0,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      };

      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto);

      // Either accept (201) or reject (400) based on business rules
      expect([201, 400]).toContain(response.status);
    });

    // LOC-TC11: Very large capacity
    it('LOC-INT-11: Should handle very large capacity', async () => {
      const createDto = {
        code: 'LOC-LARGE-CAP',
        name: 'Large Capacity',
        capacity: 9999999,
        type: 'PALLET',
        warehouseId: testWarehouseId,
      };

      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto);

      // Either accept or reject based on business rules
      expect([201, 400]).toContain(response.status);
    });

    // LOC-TC13: Very long code
    it('LOC-INT-12: Should return 400 for very long code', async () => {
      const createDto = {
        code: 'A'.repeat(101), // >100 chars
        name: 'Long Code Location',
        capacity: 100,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      };

      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(400);
    });

    // // LOC-TC14: Invalid type value
    // it('LOC-INT-13: Should return 400 for invalid type', async () => {
    //   const createDto = {
    //     code: 'LOC-BAD-TYPE',
    //     name: 'Invalid Type',
    //     capacity: 100,
    //     type: 'INVALID_TYPE',
    //     warehouseId: testWarehouseId,
    //   };

    //   await request(app.getHttpServer())
    //     .post('/locations')
    //     .set('Authorization', adminToken)
    //     .send(createDto)
    //     .expect(400);
    // });

    // LOC-TC15: Duplicate code (case insensitive) same warehouse
    it('LOC-INT-14: Should return 409 for case-insensitive duplicate in same warehouse', async () => {
      const createDto1 = {
        code: `LOC-CASE-${TEST_SUITE_ID}`,
        name: 'Case Test 1',
        capacity: 100,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      };

      const createDto2 = {
        code: `loc-case-${TEST_SUITE_ID}`,
        name: 'Case Test 2',
        capacity: 100,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      };

      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto1)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto2)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    // LOC-TC16: Same code different warehouse
    it('LOC-INT-15: Should allow same code in different warehouses', async () => {
      const createDto1 = {
        code: `LOC-CROSS-${TEST_SUITE_ID}`,
        name: 'Cross Warehouse 1',
        capacity: 100,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      };

      const createDto2 = {
        code: `LOC-CROSS-${TEST_SUITE_ID}`,
        name: 'Cross Warehouse 2',
        capacity: 100,
        type: 'SHELF',
        warehouseId: testWarehouse2Id,
      };

      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto1)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto2)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    // LOC-TC17: SQL injection in code
    it('LOC-INT-16: Should sanitize SQL injection in code', async () => {
      const createDto = {
        code: "LOC'; DROP TABLE locations;--",
        name: 'SQL Injection Test',
        capacity: 100,
        type: 'SHELF',
        warehouseId: testWarehouseId,
      };

      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto);

      expect([201, 400]).toContain(response.status);

      // Verify table still exists
      const checkResponse = await request(app.getHttpServer())
        .get('/locations')
        .set('Authorization', adminToken)
        .expect(200);

      expect(checkResponse.body.success).toBe(true);
    });

    // LOC-TC18: Complex nested properties
    it('LOC-INT-17: Should handle complex nested properties', async () => {
      const complexProperties = {
        zone: { id: 'A1', name: 'Zone Alpha 1', level: 1 },
        dimensions: { height: 3.5, width: 2.0, depth: 1.5, unit: 'meters' },
        features: ['refrigerated', 'secured', 'automated'],
        restrictions: { weight: 1000, hazmat: false },
      };

      const createDto = {
        code: 'LOC-COMPLEX',
        name: 'Complex Properties Location',
        capacity: 100,
        type: 'PALLET',
        warehouseId: testWarehouseId,
        properties: complexProperties,
      };

      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body.data.properties).toEqual(complexProperties);
    });
  });

  describe('GET /locations - Get All Locations', () => {
    beforeEach(async () => {
      // Create multiple test locations
      await prisma.location.createMany({
        data: [
          {
            code: 'GET-LOC-001',
            name: 'Get Location 1',
            capacity: 100,
            type: 'SHELF',
            warehouseId: testWarehouseId,
          },
          {
            code: 'GET-LOC-002',
            name: 'Get Location 2',
            capacity: 200,
            type: 'PALLET',
            warehouseId: testWarehouseId,
          },
          {
            code: 'GET-LOC-003',
            name: 'Get Location 3',
            capacity: 300,
            type: 'FLOOR',
            warehouseId: testWarehouse2Id,
          },
        ],
      });
    }, 10000);

    afterEach(async () => {
      await prisma.location.deleteMany({
        where: { code: { startsWith: 'GET-LOC-' } },
      });
    }, 10000);

    // LOC-TC19: Get all with default pagination
    it('LOC-INT-18: Should get all locations with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
    });

    // LOC-TC20: Filter by warehouse
    it('LOC-INT-19: Should filter locations by warehouse', async () => {
      const response = await request(app.getHttpServer())
        .get(`/locations?warehouseId=${testWarehouseId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((loc) => {
        expect(loc.warehouseId).toBe(testWarehouseId);
      });
    });

    // LOC-TC21: Filter by type
    it('LOC-INT-20: Should filter locations by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations?type=PALLET')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach((loc) => {
          expect(loc.type).toBe('PALLET');
        });
      }
    });

    // LOC-TC22: Filter by search
    it('LOC-INT-21: Should search locations by code or name', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations?search=Get')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach((loc) => {
          const matchesSearch =
            loc.code.toLowerCase().includes('get') || loc.name.toLowerCase().includes('get');
          expect(matchesSearch).toBe(true);
        });
      }
    });

    // LOC-TC23: Pagination page 1
    it('LOC-INT-22: Should paginate to page 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations?page=1&limit=2')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    // LOC-TC24: Pagination page 2
    it('LOC-INT-23: Should paginate to page 2', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations?page=2&limit=2')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(2);
    });

    // LOC-TC25: No auth
    it('LOC-INT-24: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/locations').expect(401);
    });
  });

  describe('Edge Cases - Get All Locations', () => {
    // LOC-TC26: Page = 0
    it('LOC-INT-25: Should handle page=0 (Error output)', async () => {
      await request(app.getHttpServer())
        .get('/locations?page=0')
        .set('Authorization', adminToken)
        .expect(400);

      //expect(response.body.page).toBeGreaterThanOrEqual(1);
    });

    // LOC-TC27: Negative page
    it('LOC-INT-26: Should handle negative page (Error output)', async () => {
      await request(app.getHttpServer())
        .get('/locations?page=-1')
        .set('Authorization', adminToken)
        .expect(400);

      //expect(response.body.page).toBeGreaterThanOrEqual(1);
    });

    // LOC-TC28: Limit = 0
    it('LOC-INT-27: Should handle limit=0 (Error output)', async () => {
      await request(app.getHttpServer())
        .get('/locations?limit=0')
        .set('Authorization', adminToken)
        .expect(400);
      //expect(response.body.limit).toBeGreaterThan(0);
    });

    // LOC-TC29: Negative limit
    it('LOC-INT-28: Should handle negative limit (Error output)', async () => {
      await request(app.getHttpServer())
        .get('/locations?limit=-10')
        .set('Authorization', adminToken)
        .expect(400);

      //expect(response.body.limit).toBeGreaterThan(0);
    });

    // LOC-TC30: Very large limit
    it('LOC-INT-29: Should cap very large limit', async () => {
      await request(app.getHttpServer())
        .get('/locations?limit=10000')
        .set('Authorization', adminToken)
        .expect(400);

      //expect(response.body.limit).toBeLessThanOrEqual(1000);
    });

    // LOC-TC31: Empty string search
    it('LOC-INT-30: Should handle empty string search', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations?search=')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    // LOC-TC32: SQL injection in search
    it('LOC-INT-31: Should sanitize SQL injection in search', async () => {
      const response = await request(app.getHttpServer())
        .get("/locations?search=' OR '1'='1")
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    // LOC-TC33: Combined filters
    it('LOC-INT-32: Should handle combined filters', async () => {
      const response = await request(app.getHttpServer())
        .get(`/locations?warehouseId=${testWarehouseId}&type=SHELF&search=Test`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach((loc) => {
          expect(loc.warehouseId).toBe(testWarehouseId);
          expect(loc.type).toBe('SHELF');
        });
      }
    });

    // LOC-TC34: Page beyond total
    it('LOC-INT-33: Should return empty array for page beyond total', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations?page=9999')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    // LOC-TC35: Case insensitive search
    it('LOC-INT-34: Should perform case-insensitive search', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/locations?search=test')
        .set('Authorization', adminToken)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/locations?search=TEST')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response1.body.total).toBe(response2.body.total);
    });
  });

  describe('GET /locations/:id - Get Location By ID', () => {
    // LOC-TC44: Find by valid ID
    it('LOC-INT-35: Should get location by valid ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/locations/${createdLocationId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdLocationId);
    });

    // LOC-TC45: Not found
    it('LOC-INT-36: Should return 404 for non-existent location', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/locations/${fakeId}`)
        .set('Authorization', adminToken)
        .expect(404);
    });

    // LOC-TC47: No auth
    it('LOC-INT-37: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get(`/locations/${createdLocationId}`).expect(401);
    });
  });

  describe('GET /locations/code/:code - Get Location By Code', () => {
    // LOC-TC51: Find by valid code
    it('LOC-INT-38: Should get location by valid code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/locations/code/${testWarehouseId}/TEST-LOC-001-${TEST_SUITE_ID}/`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe(`TEST-LOC-001-${TEST_SUITE_ID}`);
    });

    // LOC-TC52: Not found
    it('LOC-INT-39: Should return 404 for non-existent code', async () => {
      await request(app.getHttpServer())
        .get('/locations/code/NON-EXISTENT')
        .set('Authorization', adminToken)
        .expect(404);
    });

    // LOC-TC55: Case insensitive
    it('LOC-INT-40: Should perform case-insensitive code search', async () => {
      const locationCode = `TEST-LOC-001-${TEST_SUITE_ID}`.toLowerCase();
      const response = await request(app.getHttpServer())
        .get(`/locations/code/${testWarehouseId}/${locationCode}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /locations/warehouse/:warehouseId - Get Locations By Warehouse', () => {
    // LOC-TC58: Find by valid warehouse
    it('LOC-INT-41: Should get locations by warehouse ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/locations/warehouse/${testWarehouseId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((loc) => {
        expect(loc.warehouseId).toBe(testWarehouseId);
      });
    });

    // LOC-TC59: Warehouse not found
    it('LOC-INT-42: Should return 404 for non-existent warehouse', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/locations/warehouse/${fakeId}`)
        .set('Authorization', adminToken)
        .expect(404);
    });

    // LOC-TC62: Empty locations
    it('LOC-INT-43: Should return empty array for warehouse with no locations', async () => {
      // Create new warehouse without locations
      const emptyWarehouse = await prisma.warehouse.create({
        data: {
          code: 'EMPTY-WH',
          name: 'Empty Warehouse',
          address: 'No Locations St',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/locations/warehouse/${emptyWarehouse.id}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.data).toEqual([]);

      // Cleanup
      await prisma.warehouse.delete({ where: { id: emptyWarehouse.id } });
    });
  });

  describe('PATCH /locations/:id - Update Location', () => {
    // LOC-TC73: Update with valid data
    it('LOC-INT-44: Should update location with valid data', async () => {
      const updateDto = {
        name: 'Updated Location Name',
        capacity: 250,
      };

      const response = await request(app.getHttpServer())
        .patch(`/locations/${createdLocationId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateDto.name);
      expect(response.body.data.capacity).toBe(updateDto.capacity);
    });

    // LOC-TC74: Duplicate code
    it('LOC-INT-45: Should return 409 for duplicate code in same warehouse', async () => {
      const updateDto = {
        code: `TEST-LOC-002-${TEST_SUITE_ID}`, // Already exists
      };

      const response = await request(app.getHttpServer())
        .patch(`/locations/${createdLocationId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    // LOC-TC75: Not found
    it('LOC-INT-46: Should return 404 for non-existent location', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto = { name: 'Test' };

      await request(app.getHttpServer())
        .patch(`/locations/${fakeId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(404);
    });

    // LOC-TC77: No auth
    it('LOC-INT-47: Should return 401 without authentication', async () => {
      const updateDto = { name: 'Test' };

      await request(app.getHttpServer())
        .patch(`/locations/${createdLocationId}`)
        .send(updateDto)
        .expect(401);
    });

    // LOC-TC76: No permission
    it('LOC-INT-48: Should return 403 for staff without permission', async () => {
      const updateDto = { name: 'Test' };

      await request(app.getHttpServer())
        .patch(`/locations/${createdLocationId}`)
        .set('Authorization', staffToken)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('Edge Cases - Update Location', () => {
    // LOC-TC83: Negative capacity
    it('LOC-INT-49: Should return 400 for negative capacity', async () => {
      const updateDto = { capacity: -50 };

      await request(app.getHttpServer())
        .patch(`/locations/${createdLocationId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(400);
    });

    // LOC-TC86: Update to same code
    it('LOC-INT-50: Should allow updating with same code', async () => {
      const currentLocation = await prisma.location.findUnique({
        where: { id: createdLocationId },
      });

      if (!currentLocation) {
        throw new Error('Test location not found');
      }

      const updateDto = { code: currentLocation.code };

      const response = await request(app.getHttpServer())
        .patch(`/locations/${createdLocationId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    // LOC-TC90: Update properties only
    it('LOC-INT-51: Should update properties only', async () => {
      const updateDto = {
        properties: { zone: 'B', updated: true },
      };

      const response = await request(app.getHttpServer())
        .patch(`/locations/${createdLocationId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body.data.properties).toEqual(updateDto.properties);
    });
  });

  describe('DELETE /locations/:id - Delete Location', () => {
    let locationToDeleteId: string;

    beforeEach(async () => {
      // Use unique code with timestamp to avoid constraint violations
      const uniqueCode = `LOC-TO-DELETE-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const location = await prisma.location.create({
        data: {
          code: uniqueCode,
          name: 'Location to Delete',
          capacity: 100,
          type: 'SHELF',
          warehouseId: testWarehouseId,
        },
      });
      locationToDeleteId = location.id;
    }, 10000);

    // LOC-TC98: Delete without inventory
    it('LOC-INT-52: Should delete location without inventory', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/locations/${locationToDeleteId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const deleted = await prisma.location.findUnique({
        where: { id: locationToDeleteId },
      });
      expect(deleted).toBeNull();
    });

    // LOC-TC100: Not found
    it('LOC-INT-53: Should return 404 for non-existent location', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`/locations/${fakeId}`)
        .set('Authorization', adminToken)
        .expect(404);
    });

    // LOC-TC101: No auth
    it('LOC-INT-54: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).delete(`/locations/${locationToDeleteId}`).expect(401);
    });

    // LOC-TC102: No permission
    it('LOC-INT-55: Should return 403 for staff without permission', async () => {
      await request(app.getHttpServer())
        .delete(`/locations/${locationToDeleteId}`)
        .set('Authorization', staffToken)
        .expect(403);
    });
  });

  describe('GET /locations/:id/stats - Get Location Stats', () => {
    // LOC-TC107: Valid location stats
    it('LOC-INT-56: Should get stats for valid location', async () => {
      const response = await request(app.getHttpServer())
        .get(`/locations/${createdLocationId}/stats`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.locationId).toBe(createdLocationId);
      expect(response.body.capacity).toBeDefined();
      expect(response.body.totalQuantity).toBeDefined();
      expect(response.body.utilizationRate).toBeDefined();
    });

    // LOC-TC108: Not found
    it('LOC-INT-57: Should return 404 for non-existent location', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/locations/${fakeId}/stats`)
        .set('Authorization', adminToken)
        .expect(404);
    });

    // LOC-TC110: No auth
    it('LOC-INT-58: Should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get(`/locations/${createdLocationId}/stats`).expect(401);
    });
  });

  describe('Integration Flow - Complete Location Lifecycle', () => {
    it('LOC-INT-59: Should complete full location lifecycle', async () => {
      // 1. Create location
      const createDto = {
        code: 'LOC-LIFECYCLE',
        name: 'Lifecycle Test Location',
        capacity: 500,
        type: 'PALLET',
        warehouseId: testWarehouseId,
        properties: { phase: 'creation' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      const locationId = createResponse.body.data.id;

      // 2. Get by ID
      const getResponse = await request(app.getHttpServer())
        .get(`/locations/${locationId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(getResponse.body.data.code).toBe(createDto.code);

      // 3. Get by code
      const getByCodeResponse = await request(app.getHttpServer())
        .get(`/locations/code/${testWarehouseId}/${createDto.code}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(getByCodeResponse.body.data.id).toBe(locationId);

      // 4. Get stats
      const statsResponse = await request(app.getHttpServer())
        .get(`/locations/${locationId}/stats`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(statsResponse.body.locationId).toBe(locationId);

      // 5. Update
      const updateResponse = await request(app.getHttpServer())
        .patch(`/locations/${locationId}`)
        .set('Authorization', adminToken)
        .send({ name: 'Updated Lifecycle Location' })
        .expect(200);

      expect(updateResponse.body.data.name).toBe('Updated Lifecycle Location');

      // 6. Verify in warehouse locations list
      const warehouseLocsResponse = await request(app.getHttpServer())
        .get(`/locations/warehouse/${testWarehouseId}`)
        .set('Authorization', adminToken)
        .expect(200);

      const found = warehouseLocsResponse.body.data.find((loc) => loc.id === locationId);
      expect(found).toBeDefined();
      expect(found.name).toBe('Updated Lifecycle Location');

      // 7. Delete
      await request(app.getHttpServer())
        .delete(`/locations/${locationId}`)
        .set('Authorization', adminToken)
        .expect(200);

      // 8. Verify deletion
      await request(app.getHttpServer())
        .get(`/locations/${locationId}`)
        .set('Authorization', adminToken)
        .expect(404);
    });
  });

  describe('INTEGRATION-LOC-01: Core CRUD Operations', () => {
    let locationId: string;

    it('should create location with all valid fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          warehouseId: testWarehouseId,
          code: `INTEGRATION-LOC-${Date.now()}`,
          name: 'Sanity Test Location',
          capacity: 100,
          type: 'shelf',
          properties: { aisle: 'A', rack: '01', shelf: '01', bin: '01' },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      locationId = response.body.data.id;
    });

    it('should retrieve location by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/locations/${locationId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', locationId);
    });

    it('should list all locations with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations?page=1&limit=10')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
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
      expect(response.body.data.name).toBe('Updated Sanity Location');
    });
  });

  describe('INTEGRATION-LOC-02: Validation Rules', () => {
    it('should reject duplicate location code in same warehouse', async () => {
      const duplicateCode = `INTEGRATION-DUP-${Date.now()}`;
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          warehouseId: testWarehouseId,
          code: duplicateCode,
          name: 'First Location',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          warehouseId: testWarehouseId,
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
          code: 'INTEGRATION-NOWAREHOUSE-001',
          name: 'No Warehouse Location',
        })
        .expect(404);
    });
  });

  describe('INTEGRATION-LOC-03: Authorization', () => {
    it('should allow manager to view locations', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow admin to create location', async () => {
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          warehouseId: testWarehouseId,
          code: `INTEGRATION-AUTH-${Date.now()}`,
          name: 'Auth Test Location',
        })
        .expect(201);
    });
  });

  describe('INTEGRATION-LOC-04: Error Handling', () => {
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

  describe('INTEGRATION-LOC-05: Filter by Warehouse', () => {
    it('should filter locations by warehouse', async () => {
      const response = await request(app.getHttpServer())
        .get(`/locations?warehouseId=${testWarehouseId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((location: any) => {
        expect(location.warehouseId).toBe(testWarehouseId);
      });
    });
  });
});
