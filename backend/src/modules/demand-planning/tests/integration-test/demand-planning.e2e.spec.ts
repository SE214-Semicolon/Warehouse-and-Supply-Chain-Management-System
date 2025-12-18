import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `demand-e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Demand Planning Module - E2E Integration Tests', () => {
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
        username: `analyst-${TEST_SUITE_ID}`,
        email: `analyst-${TEST_SUITE_ID}@test.com`,
        fullName: 'Analyst User',
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
        sku: `SKU-DEMAND-${TEST_SUITE_ID}`,
        name: 'Demand Test Product',
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

  describe('POST /demand-planning/forecasts', () => {
    it('should create a forecast', async () => {
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
      expect(response.body.forecast.qtyForecast).toBe(100);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/demand-planning/forecasts')
        .send({
          productId,
          forecastDate: new Date('2025-01-20'),
          qtyForecast: 50,
          algorithm: 'MANUAL',
        })
        .expect(401);
    });

    it('should fail with invalid product ID', async () => {
      await request(app.getHttpServer())
        .post('/demand-planning/forecasts')
        .set('Authorization', analystToken)
        .send({
          productId: 'invalid-id',
          forecastDate: new Date('2025-01-20'),
          qtyForecast: 50,
          algorithm: 'MANUAL',
        })
        .expect(404);
    });
  });

  describe('GET /demand-planning/forecasts', () => {
    beforeAll(async () => {
      await prisma.demandForecast.create({
        data: {
          productId,
          forecastDate: new Date('2025-02-01'),
          forecastedQuantity: 200,
          algorithmUsed: 'MOVING_AVG',
        },
      });
    });

    it('should get all forecasts', async () => {
      const response = await request(app.getHttpServer())
        .get('/demand-planning/forecasts')
        .set('Authorization', analystToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.forecasts).toBeInstanceOf(Array);
      expect(response.body.forecasts.length).toBeGreaterThan(0);
    });

    it('should filter by product ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/demand-planning/forecasts')
        .set('Authorization', analystToken)
        .query({ productId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.forecasts).toBeInstanceOf(Array);
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

  describe('GET /demand-planning/forecasts/:id', () => {
    let forecastId: string;

    beforeAll(async () => {
      const forecast = await prisma.demandForecast.create({
        data: {
          productId,
          forecastDate: new Date('2025-03-01'),
          forecastedQuantity: 150,
          algorithmUsed: 'EXP_SMOOTHING',
        },
      });
      forecastId = forecast.id;
    });

    it('should get forecast by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/demand-planning/forecasts/${forecastId}`)
        .set('Authorization', analystToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.forecast.id).toBe(forecastId);
    });

    it('should fail with non-existent ID', async () => {
      await request(app.getHttpServer())
        .get('/demand-planning/forecasts/nonexistent-id')
        .set('Authorization', analystToken)
        .expect(404);
    });
  });

  describe('PATCH /demand-planning/forecasts/:id', () => {
    let forecastId: string;

    beforeAll(async () => {
      const forecast = await prisma.demandForecast.create({
        data: {
          productId,
          forecastDate: new Date('2025-04-01'),
          forecastedQuantity: 300,
          algorithmUsed: 'MANUAL',
        },
      });
      forecastId = forecast.id;
    });

    it('should update forecast', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/demand-planning/forecasts/${forecastId}`)
        .set('Authorization', analystToken)
        .send({ qtyForecast: 350 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.forecast.qtyForecast).toBe(350);
    });
  });

  describe('DELETE /demand-planning/forecasts/:id', () => {
    let forecastId: string;

    beforeAll(async () => {
      const forecast = await prisma.demandForecast.create({
        data: {
          productId,
          forecastDate: new Date('2025-05-01'),
          forecastedQuantity: 400,
          algorithmUsed: 'MANUAL',
        },
      });
      forecastId = forecast.id;
    });

    it('should delete forecast', async () => {
      await request(app.getHttpServer())
        .delete(`/demand-planning/forecasts/${forecastId}`)
        .set('Authorization', analystToken)
        .expect(200);
    });

    it('should fail to get deleted forecast', async () => {
      await request(app.getHttpServer())
        .get(`/demand-planning/forecasts/${forecastId}`)
        .set('Authorization', analystToken)
        .expect(404);
    });
  });

  describe('POST /demand-planning/run-algorithm', () => {
    it('should run forecasting algorithm', async () => {
      const response = await request(app.getHttpServer())
        .post('/demand-planning/run-algorithm')
        .set('Authorization', analystToken)
        .send({
          productId,
          algorithm: 'MOVING_AVG',
          periods: 30,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});
