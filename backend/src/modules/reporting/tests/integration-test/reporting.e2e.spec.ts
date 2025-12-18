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
      expect(response.body.report).toBeInstanceOf(Array);
    });

    it('should work for manager role', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/low-stock')
        .set('Authorization', managerToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter by warehouse', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/low-stock')
        .set('Authorization', analystToken)
        .query({ warehouseId: 'test-warehouse-id' })
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

    it('should require date range', async () => {
      await request(app.getHttpServer())
        .get('/reports/procurement/po-performance')
        .set('Authorization', analystToken)
        .expect(400);
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

    it('should filter by supplier', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/procurement/supplier-performance')
        .set('Authorization', analystToken)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          supplierId: 'test-supplier-id',
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
});
