import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma/prisma.service';
import bcryptjs from 'bcryptjs';

describe('ProductCategoryController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Create a test user and get the access token
    const testUsername = 'testuser-category-e2e';
    const testEmail = 'test-category-e2e@example.com';
    const testPassword = 'password123';
    const passwordHash = await bcryptjs.hash(testPassword, 10);

    await prisma.user.upsert({
      where: { username: testUsername },
      update: {},
      create: {
        username: testUsername,
        email: testEmail,
        passwordHash: passwordHash,
        role: 'admin',
        fullName: 'Test Category User',
        active: true,
      },
    });

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up in correct order (respect foreign keys)
    await prisma.productCategory.deleteMany({});
    await prisma.refreshToken.deleteMany({ where: { userEmail: 'test-category-e2e@example.com' } });
    await prisma.user.deleteMany({ where: { username: 'testuser-category-e2e' } });
    await app.close();
  });

  beforeEach(async () => {
    // Clean the product category table before each test
    await prisma.productCategory.deleteMany({});
  });

  describe('POST /product-categories', () => {
    it('should create a root category', () => {
      return request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Electronics' })
        .expect(201)
        .then((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Electronics');
          expect(res.body.parentId).toBeNull();
        });
    });

    it('should create a child category', async () => {
      const parent = await prisma.productCategory.create({
        data: { name: 'Electronics' },
      });

      return request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Laptops', parentId: parent.id })
        .expect(201)
        .then((res) => {
          expect(res.body.name).toBe('Laptops');
          expect(res.body.parentId).toBe(parent.id);
        });
    });

    it('should return 400 for missing name', () => {
      return request(app.getHttpServer())
        .post('/product-categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /product-categories', () => {
    it('should return a category tree', async () => {
      const parent = await prisma.productCategory.create({ data: { name: 'Electronics' } });
      const child = await prisma.productCategory.create({
        data: { name: 'Laptops', parentId: parent.id },
      });
      await prisma.productCategory.create({ data: { name: 'Gaming Laptops', parentId: child.id } });

      return request(app.getHttpServer())
        .get('/product-categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBe(1);
          expect(res.body[0].name).toBe('Electronics');
          expect(res.body[0].children.length).toBe(1);
          expect(res.body[0].children[0].name).toBe('Laptops');
          expect(res.body[0].children[0].children.length).toBe(1);
          expect(res.body[0].children[0].children[0].name).toBe('Gaming Laptops');
        });
    });
  });

  describe('DELETE /product-categories/:id', () => {
    it('should delete a category without children', async () => {
      const category = await prisma.productCategory.create({ data: { name: 'ToDelete' } });

      return request(app.getHttpServer())
        .delete(`/product-categories/${category.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should not delete a category with children', async () => {
      const parent = await prisma.productCategory.create({ data: { name: 'Parent' } });
      await prisma.productCategory.create({ data: { name: 'Child', parentId: parent.id } });

      return request(app.getHttpServer())
        .delete(`/product-categories/${parent.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });
});
