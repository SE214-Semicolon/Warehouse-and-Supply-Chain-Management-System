import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

// Unique test suite identifier for parallel execution
const TEST_SUITE_ID = `sup-smoke-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * SMOKE TEST - Supplier Module
 * Critical path testing for basic CRUD operations
 */
describe('Supplier Module - Smoke Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;

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
        username: `admin-supplier-smoke-${TEST_SUITE_ID}`,
        email: `admin-supplier-smoke-${TEST_SUITE_ID}@test.com`,
        fullName: 'Admin Supplier Smoke',
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
  }, 30000);

  afterAll(async () => {
    await prisma.supplier.deleteMany({ where: { code: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SMOKE-SUP-01: CRUD Operations', () => {
    let supplierId: string;

    it('should CREATE supplier', async () => {
      const response = await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', adminToken)
        .send({
          code: `SMOKE-SUP-${Date.now()}`,
          name: 'Smoke Test Supplier',
          contactInfo: { email: 'smoke@supplier.com' },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Smoke Test Supplier');
      supplierId = response.body.id;
    });

    it('should READ suppliers', async () => {
      const response = await request(app.getHttpServer())
        .get('/suppliers')
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.page).toBe(1);
    });

    it('should UPDATE supplier', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/suppliers/${supplierId}`)
        .set('Authorization', adminToken)
        .send({
          name: 'Updated Smoke Supplier',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Smoke Supplier');
    });

    it('should DELETE supplier', async () => {
      await request(app.getHttpServer())
        .delete(`/suppliers/${supplierId}`)
        .set('Authorization', adminToken)
        .expect(200);
    });
  });

  describe('SMOKE-SUP-02: Authentication Check', () => {
    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer()).get('/suppliers').expect(401);
    });
  });
});
