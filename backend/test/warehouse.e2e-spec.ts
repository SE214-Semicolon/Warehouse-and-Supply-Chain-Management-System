// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication, ValidationPipe } from '@nestjs/common';
// import * as request from 'supertest';
// import { AppModule } from '../src/app.module';
// import { PrismaService } from '../src/common/prisma/prisma.service';

// describe('Warehouse Module (e2e)', () => {
//   let app: INestApplication;
//   let prisma: PrismaService;
//   let authToken: string;
//   let warehouseId: string;
//   let locationId: string;

//   beforeAll(async () => {
//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       imports: [AppModule],
//     }).compile();

//     app = moduleFixture.createNestApplication();
//     app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
//     prisma = app.get<PrismaService>(PrismaService);

//     await app.init();

//     // Create test user and login
//     await prisma.user.upsert({
//       where: { username: 'test-warehouse-user' },
//       update: {},
//       create: {
//         username: 'test-warehouse-user',
//         email: 'test-warehouse@example.com',
//         passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
//         role: 'admin',
//         fullName: 'Test Warehouse User',
//         active: true,
//       },
//     });

//     // Get auth token
//     const loginResponse = await request(app.getHttpServer())
//       .post('/auth/login')
//       .send({ username: 'test-warehouse-user', password: 'password123' });

//     if (loginResponse.status === 201 || loginResponse.status === 200) {
//       authToken = loginResponse.body.accessToken;
//     } else {
//       authToken = 'mock-token-for-testing';
//     }
//   });

//   afterAll(async () => {
//     // Cleanup
//     if (locationId) {
//       await prisma.location.deleteMany({ where: { id: locationId } });
//     }
//     if (warehouseId) {
//       await prisma.warehouse.deleteMany({ where: { id: warehouseId } });
//     }
//     await prisma.user.deleteMany({ where: { username: 'test-warehouse-user' } });
//     await app.close();
//   });

//   describe('Warehouse', () => {
//     it('POST /warehouses - should create a warehouse', async () => {
//       const response = await request(app.getHttpServer())
//         .post('/warehouses')
//         .set('Authorization', `Bearer ${authToken}`)
//         .send({
//           code: 'WH-E2E-TEST',
//           name: 'E2E Test Warehouse',
//           address: '123 Test Street',
//           metadata: {
//             type: 'Testing',
//             manager: 'Test Manager',
//           },
//         })
//         .expect(201);

//       expect(response.body.success).toBe(true);
//       expect(response.body.warehouse.code).toBe('WH-E2E-TEST');
//       warehouseId = response.body.warehouse.id;
//     });

//     it('POST /warehouses - should fail with duplicate code', async () => {
//       await request(app.getHttpServer())
//         .post('/warehouses')
//         .set('Authorization', `Bearer ${authToken}`)
//         .send({
//           code: 'WH-E2E-TEST',
//           name: 'Another Warehouse',
//         })
//         .expect(409);
//     });

//     it('GET /warehouses - should get all warehouses', async () => {
//       const response = await request(app.getHttpServer())
//         .get('/warehouses?page=1&limit=10')
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body).toHaveProperty('warehouses');
//       expect(response.body).toHaveProperty('total');
//     });

//     it('GET /warehouses - should filter by search', async () => {
//       const response = await request(app.getHttpServer())
//         .get('/warehouses?search=E2E')
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.warehouses.length).toBeGreaterThan(0);
//     });

//     it('GET /warehouses/code/:code - should get warehouse by code', async () => {
//       const response = await request(app.getHttpServer())
//         .get('/warehouses/code/WH-E2E-TEST')
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.warehouse.code).toBe('WH-E2E-TEST');
//     });

//     it('GET /warehouses/:id - should get warehouse by id', async () => {
//       const response = await request(app.getHttpServer())
//         .get(`/warehouses/${warehouseId}`)
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.warehouse.id).toBe(warehouseId);
//       expect(response.body.stats).toBeDefined();
//     });

//     it('GET /warehouses/:id/stats - should get warehouse statistics', async () => {
//       const response = await request(app.getHttpServer())
//         .get(`/warehouses/${warehouseId}/stats`)
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body).toHaveProperty('totalLocations');
//       expect(response.body).toHaveProperty('totalCapacity');
//     });

//     it('PATCH /warehouses/:id - should update warehouse', async () => {
//       const response = await request(app.getHttpServer())
//         .patch(`/warehouses/${warehouseId}`)
//         .set('Authorization', `Bearer ${authToken}`)
//         .send({
//           name: 'E2E Test Warehouse Updated',
//         })
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.warehouse.name).toBe('E2E Test Warehouse Updated');
//     });
//   });

//   describe('Location', () => {
//     it('POST /locations - should create a location', async () => {
//       const response = await request(app.getHttpServer())
//         .post('/locations')
//         .set('Authorization', `Bearer ${authToken}`)
//         .send({
//           warehouseId: warehouseId,
//           code: 'E2E-01-01',
//           name: 'E2E Test Location',
//           capacity: 100,
//           type: 'shelf',
//           properties: {
//             aisle: 'E2E',
//             rack: '01',
//             level: '01',
//           },
//         })
//         .expect(201);

//       expect(response.body.success).toBe(true);
//       expect(response.body.location.code).toBe('E2E-01-01');
//       locationId = response.body.location.id;
//     });

//     it('POST /locations - should fail with duplicate code in warehouse', async () => {
//       await request(app.getHttpServer())
//         .post('/locations')
//         .set('Authorization', `Bearer ${authToken}`)
//         .send({
//           warehouseId: warehouseId,
//           code: 'E2E-01-01',
//           name: 'Another Location',
//           type: 'shelf',
//         })
//         .expect(409);
//     });

//     it('POST /locations - should fail with invalid warehouse', async () => {
//       await request(app.getHttpServer())
//         .post('/locations')
//         .set('Authorization', `Bearer ${authToken}`)
//         .send({
//           warehouseId: '00000000-0000-0000-0000-000000000000',
//           code: 'E2E-02-01',
//           name: 'Test Location',
//           type: 'shelf',
//         })
//         .expect(404);
//     });

//     it('GET /locations - should get all locations', async () => {
//       const response = await request(app.getHttpServer())
//         .get('/locations?page=1&limit=10')
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body).toHaveProperty('locations');
//     });

//     it('GET /locations - should filter by warehouse', async () => {
//       const response = await request(app.getHttpServer())
//         .get(`/locations?warehouseId=${warehouseId}`)
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.locations.length).toBeGreaterThan(0);
//     });

//     it('GET /locations/warehouse/:warehouseId - should get locations by warehouse', async () => {
//       const response = await request(app.getHttpServer())
//         .get(`/locations/warehouse/${warehouseId}`)
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.locations.length).toBeGreaterThan(0);
//     });

//     it('GET /locations/warehouse/:warehouseId/available - should get available locations', async () => {
//       const response = await request(app.getHttpServer())
//         .get(`/locations/warehouse/${warehouseId}/available`)
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//     });

//     it('GET /locations/code/:warehouseId/:code - should get location by code', async () => {
//       const response = await request(app.getHttpServer())
//         .get(`/locations/code/${warehouseId}/E2E-01-01`)
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.location.code).toBe('E2E-01-01');
//     });

//     it('GET /locations/:id - should get location by id', async () => {
//       const response = await request(app.getHttpServer())
//         .get(`/locations/${locationId}`)
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.location.id).toBe(locationId);
//       expect(response.body.stats).toBeDefined();
//     });

//     it('GET /locations/:id/stats - should get location statistics', async () => {
//       const response = await request(app.getHttpServer())
//         .get(`/locations/${locationId}/stats`)
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body).toHaveProperty('utilizationRate');
//     });

//     it('PATCH /locations/:id - should update location', async () => {
//       const response = await request(app.getHttpServer())
//         .patch(`/locations/${locationId}`)
//         .set('Authorization', `Bearer ${authToken}`)
//         .send({
//           name: 'E2E Test Location Updated',
//           capacity: 150,
//         })
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.location.name).toBe('E2E Test Location Updated');
//       expect(response.body.location.capacity).toBe(150);
//     });

//     it('DELETE /locations/:id - should delete location', async () => {
//       const response = await request(app.getHttpServer())
//         .delete(`/locations/${locationId}`)
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       locationId = null; // Mark as deleted
//     });
//   });

//   describe('Warehouse Deletion', () => {
//     it('DELETE /warehouses/:id - should delete warehouse', async () => {
//       const response = await request(app.getHttpServer())
//         .delete(`/warehouses/${warehouseId}`)
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       warehouseId = null; // Mark as deleted
//     });
//   });
// });
