import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

/**
 * SMOKE TEST - Product Category Module
 * Critical path testing for basic CRUD operations
 */
describe('Product Category Module - Smoke Tests', () => {
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

    await prisma.productCategory.deleteMany({});
    await prisma.user.deleteMany({});

    const adminUser = await prisma.user.create({
      data: {
        username: 'admin-category-smoke',
        email: 'admin-category-smoke@test.com',
        fullName: 'Admin Category Smoke',
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
    await app.close();
  }, 30000);

  describe('SMOKE-CAT-01: CRUD Operations', () => {
    let categoryId: string;

    it('should CREATE category', async () => {
      const response = await request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', adminToken)
        .send({
          name: 'Smoke Test Category',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      categoryId = response.body.data.id;
    });

    it('should READ categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', adminToken)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should UPDATE category', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/product-categories/${categoryId}`)
        .set('Authorization', adminToken)
        .send({
          name: 'Updated Smoke Category',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Smoke Category');
    });

    it('should DELETE category', async () => {
      await request(app.getHttpServer())
        .delete(`/product-categories/${categoryId}`)
        .set('Authorization', adminToken)
        .expect(200);
    });
  });

  describe('SMOKE-CAT-02: Authentication Check', () => {
    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer()).get('/product-categories').expect(401);
    });
  });
});
