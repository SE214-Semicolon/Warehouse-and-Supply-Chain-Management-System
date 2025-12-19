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
  let analystToken: string;
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

    const analyst = await prisma.user.create({
      data: {
        username: `analyst-sanity-${TEST_SUITE_ID}`,
        email: `analyst-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Analyst Sanity',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.analyst,
        active: true,
      },
    });

    analystToken = `Bearer ${jwtService.sign({
      sub: analyst.id,
      email: analyst.email,
      role: analyst.role,
    })}`;

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

  describe('SANITY-DEMAND-01: CRUD Operations', () => {
    let forecastId: string;

    it('should CREATE forecast successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/demand-planning/forecasts')
        .set('Authorization', analystToken)
        .send({
          productId,
          forecastDate: new Date('2025-01-15'),
          qtyForecast: 100,
          algorithm: 'MANUAL',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.forecast).toHaveProperty('id');
      forecastId = response.body.forecast.id;
    });

    it('should READ forecast by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/demand-planning/forecasts/${forecastId}`)
        .set('Authorization', analystToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.forecast.id).toBe(forecastId);
    });

    it('should UPDATE forecast', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/demand-planning/forecasts/${forecastId}`)
        .set('Authorization', analystToken)
        .send({ qtyForecast: 150 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.forecast.qtyForecast).toBe(150);
    });

    it('should DELETE forecast', async () => {
      await request(app.getHttpServer())
        .delete(`/demand-planning/forecasts/${forecastId}`)
        .set('Authorization', analystToken)
        .expect(200);
    });
  });

  describe('SANITY-DEMAND-02: Algorithm Support', () => {
    it('should support MANUAL algorithm', async () => {
      const response = await request(app.getHttpServer())
        .post('/demand-planning/forecasts')
        .set('Authorization', analystToken)
        .send({
          productId,
          forecastDate: new Date('2025-02-01'),
          qtyForecast: 200,
          algorithm: 'MANUAL',
        })
        .expect(201);

      expect(response.body.forecast.algorithm).toBe('MANUAL');
    });

    it('should support MOVING_AVG algorithm', async () => {
      const response = await request(app.getHttpServer())
        .post('/demand-planning/forecasts')
        .set('Authorization', analystToken)
        .send({
          productId,
          forecastDate: new Date('2025-03-01'),
          qtyForecast: 250,
          algorithm: 'MOVING_AVG',
        })
        .expect(201);

      expect(response.body.forecast.algorithm).toBe('MOVING_AVG');
    });

    it('should support EXP_SMOOTHING algorithm', async () => {
      const response = await request(app.getHttpServer())
        .post('/demand-planning/forecasts')
        .set('Authorization', analystToken)
        .send({
          productId,
          forecastDate: new Date('2025-04-01'),
          qtyForecast: 300,
          algorithm: 'EXP_SMOOTHING',
        })
        .expect(201);

      expect(response.body.forecast.algorithm).toBe('EXP_SMOOTHING');
    });
  });

  describe('SANITY-DEMAND-03: Filtering', () => {
    beforeAll(async () => {
      await prisma.demandForecast.create({
        data: {
          productId,
          forecastDate: new Date('2025-05-01'),
          forecastedQuantity: 350,
          algorithmUsed: 'MOVING_AVG',
        },
      });
    });

    it('should filter by product ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/demand-planning/forecasts')
        .set('Authorization', analystToken)
        .query({ productId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.forecasts).toBeInstanceOf(Array);
      if (response.body.forecasts.length > 0) {
        expect(response.body.forecasts[0].productId).toBe(productId);
      }
    });

    it('should filter by algorithm', async () => {
      const response = await request(app.getHttpServer())
        .get('/demand-planning/forecasts')
        .set('Authorization', analystToken)
        .query({ algorithm: 'MOVING_AVG' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('SANITY-DEMAND-04: Data Validation', () => {
    it('should reject negative forecast quantity', async () => {
      await request(app.getHttpServer())
        .post('/demand-planning/forecasts')
        .set('Authorization', analystToken)
        .send({
          productId,
          forecastDate: new Date('2025-06-01'),
          qtyForecast: -100,
          algorithm: 'MANUAL',
        })
        .expect(400);
    });

    it('should reject invalid product ID', async () => {
      await request(app.getHttpServer())
        .post('/demand-planning/forecasts')
        .set('Authorization', analystToken)
        .send({
          productId: 'invalid-id',
          forecastDate: new Date('2025-06-01'),
          qtyForecast: 100,
          algorithm: 'MANUAL',
        })
        .expect(404);
    });
  });
});
