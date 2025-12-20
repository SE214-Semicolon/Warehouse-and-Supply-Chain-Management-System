import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3000';

export const handlers = [
  // Auth handlers
  http.post(`${API_BASE}/auth/login`, () => {
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  }),

  // Product handlers
  http.get(`${API_BASE}/products`, () => {
    return HttpResponse.json([
      {
        id: '1',
        name: 'Test Product 1',
        sku: 'SKU-001',
        categoryId: 'cat-1',
        description: 'Test product description',
      },
      {
        id: '2',
        name: 'Test Product 2',
        sku: 'SKU-002',
        categoryId: 'cat-1',
        description: 'Another test product',
      },
    ]);
  }),

  http.post(`${API_BASE}/products`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'new-product-id',
      ...body,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.patch(`${API_BASE}/products/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: params.id,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.delete(`${API_BASE}/products/:id`, ({ params }) => {
    return HttpResponse.json({
      message: 'Product deleted successfully',
      id: params.id,
    });
  }),

  // Category handlers
  http.get(`${API_BASE}/categories`, () => {
    return HttpResponse.json([
      { id: 'cat-1', name: 'Category 1' },
      { id: 'cat-2', name: 'Category 2' },
    ]);
  }),

  // Warehouse handlers
  http.get(`${API_BASE}/warehouses`, () => {
    return HttpResponse.json([
      { id: 'wh-1', name: 'Warehouse 1', address: '123 Test St' },
    ]);
  }),

  // Location handlers
  http.get(`${API_BASE}/locations`, () => {
    return HttpResponse.json([
      { id: 'loc-1', name: 'Location 1', warehouseId: 'wh-1' },
    ]);
  }),
];
