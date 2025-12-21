import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `report-e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Reporting Module - E2E Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let analystToken: string;
  let managerToken: string;

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

    const manager = await prisma.user.create({
      data: {
        username: `manager-${TEST_SUITE_ID}`,
        email: `manager-${TEST_SUITE_ID}@test.com`,
        fullName: 'Manager User',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.manager,
        active: true,
      },
    });

    analystToken = `Bearer ${jwtService.sign({
      sub: analyst.id,
      email: analyst.email,
      role: analyst.role,
    })}`;

    managerToken = `Bearer ${jwtService.sign({
      sub: manager.id,
      email: manager.email,
      role: manager.role,
    })}`;
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('GET /reports/inventory/low-stock', () => {
    it('should get low stock report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/low-stock')
        .set('Authorization', analystToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inventories).toBeInstanceOf(Array);
    });

    it('should work for manager role', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/low-stock')
        .set('Authorization', managerToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter by location', async () => {
      // Note: Uses a fake UUID - just testing that the API accepts the parameter
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/low-stock')
        .set('Authorization', analystToken)
        .query({ locationId: '00000000-0000-0000-0000-000000000000' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /reports/procurement/po-performance', () => {
    it('should get PO performance report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/procurement/po-performance')
        .set('Authorization', analystToken)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should work without date range (optional parameters)', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/procurement/po-performance')
        .set('Authorization', analystToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle pagination', async () => {
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
  });

  describe('GET /reports/procurement/supplier-performance', () => {
    it('should get supplier performance report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/procurement/supplier-performance')
        .set('Authorization', analystToken)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should work with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/procurement/supplier-performance')
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
  });

  describe('GET /reports/sales/so-performance', () => {
    it('should get sales order performance report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/sales/so-performance')
        .set('Authorization', analystToken)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /reports/sales/sales-trends', () => {
    it('should get sales trends report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/sales/sales-trends')
        .set('Authorization', analystToken)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          groupBy: 'month',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support different grouping', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/sales/sales-trends')
        .set('Authorization', analystToken)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          groupBy: 'week',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Authorization Tests', () => {
    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/reports/inventory/low-stock').expect(401);
    });
  });

  describe('INTEGRATION-REPORT-01: Inventory Reports', () => {
    it('should generate low stock report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/low-stock')
        .set('Authorization', analystToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inventories).toBeInstanceOf(Array);
    });

    it('should return correct structure for low stock items', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/low-stock')
        .set('Authorization', analystToken)
        .expect(200);

      if (response.body.inventories.length > 0) {
        const item = response.body.inventories[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('availableQty');
        expect(item).toHaveProperty('productBatch');
      }
    });

    it('should generate expiry alerts report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/expiry')
        .set('Authorization', analystToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inventories).toBeInstanceOf(Array);
    });

    it('should support custom threshold for expiry alerts', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/expiry')
        .set('Authorization', analystToken)
        .query({ daysAhead: 60 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should generate stock levels report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/stock-levels')
        .set('Authorization', analystToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.groupedData).toBeInstanceOf(Array);
    });

    it('should support groupBy for stock levels report', async () => {
      const groupByOptions = ['location', 'product', 'category'];

      for (const groupBy of groupByOptions) {
        const response = await request(app.getHttpServer())
          .get('/reports/inventory/stock-levels')
          .set('Authorization', analystToken)
          .query({ groupBy })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should generate stock movements report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/movements')
        .set('Authorization', analystToken)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.movements).toBeInstanceOf(Array);
    });

    it('should filter movements by type', async () => {
      const movementTypes = ['purchase_receipt', 'sale_issue', 'transfer_in', 'adjustment'];

      for (const movementType of movementTypes) {
        const response = await request(app.getHttpServer())
          .get('/reports/inventory/movements')
          .set('Authorization', analystToken)
          .query({ movementType })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should generate valuation report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/valuation')
        .set('Authorization', analystToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valuationData).toBeInstanceOf(Array);
    });

    it('should support different valuation methods', async () => {
      const methods = ['FIFO', 'LIFO', 'AVERAGE'];

      for (const method of methods) {
        const response = await request(app.getHttpServer())
          .get('/reports/inventory/valuation')
          .set('Authorization', analystToken)
          .query({ method })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('INTEGRATION-REPORT-02: Procurement Reports', () => {
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

    it('should work without date range for procurement reports (optional parameters)', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/procurement/po-performance')
        .set('Authorization', analystToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('INTEGRATION-REPORT-03: Sales Reports', () => {
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
      const groupByOptions = ['day', 'week', 'month'];

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

  describe('INTEGRATION-REPORT-04: Authorization & Access', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/reports/inventory/low-stock').expect(401);
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

  describe('INTEGRATION-REPORT-05: Pagination & Performance', () => {
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
