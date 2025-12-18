import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `report-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Reporting Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let analystToken: string;

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
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-REPORT-01: Inventory Reports', () => {
    it('should generate low stock report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/low-stock')
        .set('Authorization', analystToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeInstanceOf(Array);
    });

    it('should return correct structure for low stock items', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/low-stock')
        .set('Authorization', analystToken)
        .expect(200);

      if (response.body.report.length > 0) {
        const item = response.body.report[0];
        expect(item).toHaveProperty('productId');
        expect(item).toHaveProperty('currentStock');
        expect(item).toHaveProperty('reorderLevel');
      }
    });
  });

  describe('SANITY-REPORT-02: Procurement Reports', () => {
    const dateRange = {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    };

    it('should generate PO performance report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/procurement/po-performance')
        .set('Authorization', analystToken)
        .query(dateRange)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should generate supplier performance report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/procurement/supplier-performance')
        .set('Authorization', analystToken)
        .query(dateRange)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require date range for procurement reports', async () => {
      await request(app.getHttpServer())
        .get('/reports/procurement/po-performance')
        .set('Authorization', analystToken)
        .expect(400);
    });
  });

  describe('SANITY-REPORT-03: Sales Reports', () => {
    const dateRange = {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    };

    it('should generate sales order performance report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/sales/so-performance')
        .set('Authorization', analystToken)
        .query(dateRange)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should generate sales trends report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/sales/sales-trends')
        .set('Authorization', analystToken)
        .query({ ...dateRange, groupBy: 'month' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support different grouping options', async () => {
      const groupByOptions = ['day', 'week', 'month', 'quarter'];
      
      for (const groupBy of groupByOptions) {
        const response = await request(app.getHttpServer())
          .get('/reports/sales/sales-trends')
          .set('Authorization', analystToken)
          .query({ ...dateRange, groupBy })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('SANITY-REPORT-04: Authorization & Access', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/reports/inventory/low-stock')
        .expect(401);
    });

    it('should allow analyst access to all reports', async () => {
      const endpoints = [
        '/reports/inventory/low-stock',
        '/reports/procurement/po-performance?startDate=2025-01-01&endDate=2025-12-31',
        '/reports/sales/so-performance?startDate=2025-01-01&endDate=2025-12-31',
      ];

      for (const endpoint of endpoints) {
        await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', analystToken)
          .expect(200);
      }
    });
  });

  describe('SANITY-REPORT-05: Pagination & Performance', () => {
    it('should handle pagination for large datasets', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/procurement/po-performance')
        .set('Authorization', analystToken)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should respond within reasonable time (< 5s)', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/reports/inventory/low-stock')
        .set('Authorization', analystToken)
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });
});
