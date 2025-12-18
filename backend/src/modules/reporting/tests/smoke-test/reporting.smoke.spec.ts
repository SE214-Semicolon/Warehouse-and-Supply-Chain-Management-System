import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `report-smoke-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Reporting Module - Smoke Tests', () => {
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
        username: `analyst-smoke-${TEST_SUITE_ID}`,
        email: `analyst-smoke-${TEST_SUITE_ID}@test.com`,
        fullName: 'Analyst Smoke',
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

  describe('SMOKE-REPORT-01: Critical Reports', () => {
    it('should GET inventory low stock report', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/low-stock')
        .set('Authorization', analystToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should GET procurement PO performance report', async () => {
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

    it('should GET sales SO performance report', async () => {
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
});
