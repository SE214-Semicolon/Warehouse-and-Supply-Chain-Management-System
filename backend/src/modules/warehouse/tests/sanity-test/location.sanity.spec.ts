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
 * Critical path testing for basic CRUD operations
 */
describe('Location Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
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
        fullName: 'Admin Location Smoke',
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

    const warehouse = await prisma.warehouse.create({
      data: {
        code: `SANITY-WH-${TEST_SUITE_ID}`,
        name: `Smoke Test Warehouse ${TEST_SUITE_ID}`,
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

  describe('SANITY-LOC-01: CRUD Operations', () => {
    let locationId: string;

    it('should CREATE location', async () => {
      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          warehouseId: warehouseId,
          code: `SANITY-LOC-${Date.now()}`,
          name: 'Smoke Test Location',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.location).toHaveProperty('id');
      locationId = response.body.location.id;
    });

    it('should READ locations', async () => {
      const response = await request(app.getHttpServer())
        .get('/locations')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.locations)).toBe(true);
      expect(response.body.locations.length).toBeGreaterThan(0);
    });

    it('should UPDATE location', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/locations/${locationId}`)
        .set('Authorization', adminToken)
        .send({
          name: 'Updated Smoke Location',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.location.name).toBe('Updated Smoke Location');
    });

    it('should DELETE location', async () => {
      await request(app.getHttpServer())
        .delete(`/locations/${locationId}`)
        .set('Authorization', adminToken)
        .expect(200);
    });
  });
});
