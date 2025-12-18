import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole, ShipmentStatus } from '@prisma/client';

const TEST_SUITE_ID = `ship-e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('Shipment Module - E2E Integration Tests', () => {
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
        username: `logistics-${TEST_SUITE_ID}`,
        email: `logistics-${TEST_SUITE_ID}@test.com`,
        fullName: 'Logistics User',
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
    await prisma.shipment.deleteMany({ where: { trackingCode: { contains: TEST_SUITE_ID } } });
    await prisma.user.deleteMany({ where: { email: { contains: TEST_SUITE_ID } } });
    await prisma.$disconnect();
    await app.close();
  }, 30000);

  describe('POST /shipments', () => {
    it('should create a shipment', async () => {
      const response = await request(app.getHttpServer())
        .post('/shipments')
        .set('Authorization', logisticsToken)
        .send({
          trackingCode: `TRACK-${TEST_SUITE_ID}-001`,
          carrier: 'DHL',
          status: ShipmentStatus.preparing,
          estimatedDelivery: new Date('2025-01-30'),
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.shipment).toHaveProperty('id');
      expect(response.body.shipment.trackingCode).toBe(`TRACK-${TEST_SUITE_ID}-001`);
    });

    it('should fail with duplicate tracking code', async () => {
      await request(app.getHttpServer())
        .post('/shipments')
        .set('Authorization', logisticsToken)
        .send({
          trackingCode: `TRACK-${TEST_SUITE_ID}-DUP`,
          carrier: 'FedEx',
          status: ShipmentStatus.preparing,
          estimatedDelivery: new Date('2025-01-30'),
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/shipments')
        .set('Authorization', logisticsToken)
        .send({
          trackingCode: `TRACK-${TEST_SUITE_ID}-DUP`,
          carrier: 'UPS',
          status: ShipmentStatus.preparing,
          estimatedDelivery: new Date('2025-01-30'),
        })
        .expect(409);
    });
  });

  describe('GET /shipments', () => {
    it('should get all shipments', async () => {
      const response = await request(app.getHttpServer())
        .get('/shipments')
        .set('Authorization', logisticsToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.shipments).toBeInstanceOf(Array);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/shipments')
        .set('Authorization', logisticsToken)
        .query({ status: ShipmentStatus.in_transit })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter by carrier', async () => {
      const response = await request(app.getHttpServer())
        .get('/shipments')
        .set('Authorization', logisticsToken)
        .query({ carrier: 'UPS' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /shipments/track/:trackingCode', () => {
    const trackingCode = `TRACK-${TEST_SUITE_ID}-003`;

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/shipments')
        .set('Authorization', logisticsToken)
        .send({
          trackingCode,
          carrier: 'FedEx',
          status: ShipmentStatus.preparing,
          estimatedDelivery: new Date('2025-02-05'),
        });
    });

    it('should track shipment by code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/shipments/track/TRACK-${TEST_SUITE_ID}-003`)
        .set('Authorization', logisticsToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.shipment.trackingCode).toBe(`TRACK-${TEST_SUITE_ID}-003`);
    });

    it('should fail with invalid tracking code', async () => {
      await request(app.getHttpServer())
        .get('/shipments/track/INVALID-CODE')
        .set('Authorization', logisticsToken)
        .expect(404);
    });
  });

  describe('GET /shipments/:id', () => {
    let shipmentId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/shipments')
        .set('Authorization', logisticsToken)
        .send({
          trackingCode: `TRACK-${TEST_SUITE_ID}-004`,
          carrier: 'DHL',
          status: ShipmentStatus.preparing,
          estimatedDelivery: new Date('2025-02-10'),
        });
      shipmentId = response.body.shipment?.id;
    });

    it('should get shipment by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/shipments/${shipmentId}`)
        .set('Authorization', logisticsToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.shipment.id).toBe(shipmentId);
    });
  });

  describe('PATCH /shipments/:id', () => {
    let shipmentId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/shipments')
        .set('Authorization', logisticsToken)
        .send({
          trackingCode: `TRACK-${TEST_SUITE_ID}-005`,
          carrier: 'UPS',
          status: ShipmentStatus.preparing,
          estimatedDelivery: new Date('2025-02-15'),
        });
      shipmentId = response.body.shipment?.id;
    });

    it('should update shipment status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/shipments/${shipmentId}`)
        .set('Authorization', logisticsToken)
        .send({ status: ShipmentStatus.in_transit })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.shipment.status).toBe(ShipmentStatus.in_transit);
    });
  });

  describe('DELETE /shipments/:id', () => {
    let shipmentId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/shipments')
        .set('Authorization', logisticsToken)
        .send({
          trackingCode: `TRACK-${TEST_SUITE_ID}-006`,
          carrier: 'FedEx',
          status: ShipmentStatus.preparing,
          estimatedDelivery: new Date('2025-02-20'),
        });
      shipmentId = response.body.shipment?.id;
    });

    it('should delete shipment', async () => {
      await request(app.getHttpServer())
        .delete(`/shipments/${shipmentId}`)
        .set('Authorization', logisticsToken)
        .expect(200);
    });
  });
});
