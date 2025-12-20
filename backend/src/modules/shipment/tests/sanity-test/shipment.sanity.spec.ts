import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const TEST_SUITE_ID = `ship-sanity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Shipment Module - Sanity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let logisticsToken: string;

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

    const logistics = await prisma.user.create({
      data: {
        username: `logistics-sanity-${TEST_SUITE_ID}`,
        email: `logistics-sanity-${TEST_SUITE_ID}@test.com`,
        fullName: 'Logistics Smoke',
        passwordHash: '$2b$10$validhashedpassword',
        role: UserRole.logistics,
        active: true,
      },
    });

    logisticsToken = `Bearer ${jwtService.sign({
      sub: logistics.id,
      email: logistics.email,
      role: logistics.role,
    })}`;
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('SANITY-SHIP-01: Critical Path', () => {
    it('should READ shipments', async () => {
      const response = await request(app.getHttpServer())
        .get('/shipments')
        .set('Authorization', logisticsToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.shipments).toBeInstanceOf(Array);
    });
  });
});
