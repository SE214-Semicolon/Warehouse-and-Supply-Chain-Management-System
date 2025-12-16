import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `sup-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SANITY TEST - Supplier Module
 * Verify key functionalities after minor changes/bug fixes
 */
describe('Supplier Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let procurementToken: string;

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

    await prisma.supplier.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });

    const adminUser = await prisma.user.create({
      data: {
        username: `admin-supplier-sanity-${TEST_SUITE_ID}`,
        email: `admin-supplier-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Supplier Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.admin,
        active: true,
      },
    });

    const procurementUser = await prisma.user.create({
      data: {
        username: `procurement-supplier-sanity-${TEST_SUITE_ID}`,
        email: `procurement-supplier-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Procurement Supplier Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.procurement,
        active: true,
      },
    });

    adminToken = `Bearer ${jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    })}`;

    procurementToken = `Bearer ${jwtService.sign({
      sub: procurementUser.id,
      email: procurementUser.email,
      role: procurementUser.role,
    })}`;
  }, 30000);

  afterAll(async () => {
    await prisma.supplier.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-SUP-01: Core CRUD Operations', () => {
    let supplierId: string;

    it('should create supplier with all fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', adminToken)
        .send({
          code: `SANITY-SUP-${Date.now()}`,
          name: 'Sanity Test Supplier',
          contactInfo: {
            phone: '1234567890',
            email: 'sanity@supplier.com',
            address: '123 Supplier Street',
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Sanity Test Supplier');
      supplierId = response.body.id;
    });

    it('should retrieve supplier by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/suppliers/${supplierId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('id', supplierId);
      expect(response.body.name).toBe('Sanity Test Supplier');
    });

    //Uncomment when be fix this API
    // it('should list all suppliers with pagination', async () => {
    //   const response = await request(app.getHttpServer())
    //     .get('/suppliers')
    //     .query({ page: 1, pageSize: 10 })
    //     .set('Authorization', adminToken)
    //     .expect(200);

    //   expect(Array.isArray(response.body.data)).toBe(true);
    //   expect(response.body.total).toBeGreaterThanOrEqual(1);
    //   expect(response.body.page).toBe(1);
    //   expect(response.body.pageSize).toBe(10);
    // });

    it('should update supplier successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/suppliers/${supplierId}`)
        .set('Authorization', adminToken)
        .send({
          name: 'Updated Sanity Supplier',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Sanity Supplier');
    });
  });

  describe('SANITY-SUP-02: Validation Rules', () => {
    it('should reject duplicate supplier code', async () => {
      const duplicateCode = `SANITY-DUP-${Date.now()}`;
      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', adminToken)
        .send({
          code: duplicateCode,
          name: 'First Supplier',
          contactInfo: { email: 'first@supplier.com' },
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', adminToken)
        .send({
          code: duplicateCode,
          name: 'Second Supplier',
          contactInfo: { email: 'second@supplier.com' },
        })
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', adminToken)
        .send({
          code: `SANITY-MISSING-${Date.now()}`,
          // missing name which is required
        })
        .expect(400);
    });

    it('should reject missing name', async () => {
      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', adminToken)
        .send({
          code: `SANITY-MISSING-${Date.now()}`,
          // name is missing - should fail
        })
        .expect(400);
    });
  });

  describe('SANITY-SUP-03: Authorization', () => {
    it('should allow procurement to view suppliers', async () => {
      const response = await request(app.getHttpServer())
        .get('/suppliers')
        .set('Authorization', procurementToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow procurement to create supplier', async () => {
      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', procurementToken)
        .send({
          code: `SANITY-PROC-${Date.now()}`,
          name: 'Procurement Created Supplier',
          contactInfo: { email: 'procurement@supplier.com' },
        })
        .expect(201);
    });
  });

  describe('SANITY-SUP-04: Error Handling', () => {
    it('should return 404 for non-existent supplier', async () => {
      await request(app.getHttpServer())
        .get('/suppliers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('should handle update of non-existent supplier', async () => {
      await request(app.getHttpServer())
        .patch('/suppliers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminToken)
        .send({
          name: 'Non-existent Supplier',
        })
        .expect(404);
    });
  });

  describe('SANITY-SUP-05: Search Functionality', () => {
    it('should search suppliers by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/suppliers?q=Sanity')
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should search suppliers by code', async () => {
      const response = await request(app.getHttpServer())
        .get('/suppliers?q=SANITY')
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
