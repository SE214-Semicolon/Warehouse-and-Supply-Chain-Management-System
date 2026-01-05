import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `demand-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Demand Planning Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let productId: string;

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

    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });

    const adminUser = await prisma.user.create({
      data: {
        username: `admin-sanity-${TEST_SUITE_ID}`,
        email: `admin-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Smoke',
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

    // Create test product with required fields
    const product = await prisma.product.create({
      data: {
        sku: `SKU-SANITY-${TEST_SUITE_ID}`,
        name: 'Sanity Test Product',
        unit: 'pcs',
      },
    });
    productId = product.id;
  }, 30000);

  afterAll(async () => {
    await prisma.demandForecast.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-DEMAND-01: Critical Path', () => {
    let forecastId: string;

    it('should CREATE a forecast', async () => {
      const response = await request(app.getHttpServer())
        .post('/demand-planning/forecasts')
        .set('Authorization', adminToken)
        .send({
          productId,
          forecastDate: '2025-01-01',
          forecastedQuantity: 100,
          algorithmUsed: 'MANUAL',
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.data).toHaveProperty('id');
      forecastId = response.body.data.id;
    });

    it('should READ forecasts', async () => {
      const response = await request(app.getHttpServer())
        .get('/demand-planning/forecasts')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should GET forecast by id', async () => {
      if (!forecastId) return;

      const response = await request(app.getHttpServer())
        .get(`/demand-planning/forecasts/${forecastId}`)
        .set('Authorization', adminToken)
        .expect(200);

      const forecast = response.body.data || response.body.forecast || response.body;
      expect(forecast.id).toBe(forecastId);
    });

    it('should DELETE forecast', async () => {
      if (!forecastId) return;

      await request(app.getHttpServer())
        .delete(`/demand-planning/forecasts/${forecastId}`)
        .set('Authorization', adminToken)
        .expect(200);
    });
  });
});
