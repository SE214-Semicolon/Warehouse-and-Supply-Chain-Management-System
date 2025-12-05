import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

/**
 * SMOKE TEST - Location Module
 * Critical path testing for basic CRUD operations
 */
describe('Location Module - Smoke Tests', () => {
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

    await prisma.location.deleteMany({});
    await prisma.warehouse.deleteMany({});
    await prisma.user.deleteMany({});

    const adminUser = await prisma.user.create({
      data: {
        username: 'admin-loc-smoke',
        email: 'admin-loc-smoke@test.com',
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
        code: 'SMOKE-WH-001',
        name: 'Smoke Test Warehouse',
      },
    });

    warehouseId = warehouse.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('SMOKE-LOC-01: CRUD Operations', () => {
    let locationId: string;

    it('should CREATE location', async () => {
      const response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', adminToken)
        .send({
          warehouseId: warehouseId,
          code: `SMOKE-LOC-${Date.now()}`,
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
