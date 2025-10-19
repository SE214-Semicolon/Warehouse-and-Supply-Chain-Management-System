# Product Module API Documentation

Base URL: `http://localhost:3000`

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Product Categories

### 1. Create Category
**POST** `/product-categories`

**Roles**: admin, manager, procurement

**Request Body**:
```json
{
  "name": "Electronics",
  "parentId": "optional-parent-uuid"
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "name": "Electronics",
  "parentId": null,
  "metadata": null
}
```

---

### 2. Get All Categories (Tree Structure)
**GET** `/product-categories`

**Roles**: admin, manager, procurement, warehouse_staff

**Response** (200):
```json
[
  {
    "id": "uuid-1",
    "name": "Electronics",
    "parentId": null,
    "metadata": {},
    "children": [
      {
        "id": "uuid-2",
        "name": "Laptops",
        "parentId": "uuid-1",
        "metadata": {},
        "children": []
      }
    ]
  }
]
```

---

### 3. Get Category by ID
**GET** `/product-categories/:id`

**Roles**: admin, manager, procurement, warehouse_staff

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Electronics",
  "parentId": null,
  "metadata": {},
  "children": [...],
  "parent": null
}
```

---

### 4. Update Category
**PATCH** `/product-categories/:id`

**Roles**: admin, manager, procurement

**Request Body**:
```json
{
  "name": "Updated Name",
  "parentId": "new-parent-uuid"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "parentId": "new-parent-uuid",
  "metadata": {}
}
```

---

### 5. Delete Category
**DELETE** `/product-categories/:id`

**Roles**: admin, manager

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Electronics",
  "parentId": null,
  "metadata": {}
}
```

**Error** (400):
```json
{
  "statusCode": 400,
  "message": "Cannot delete a category with children. Please delete or move children first.",
  "error": "Bad Request"
}
```

---

## Products

### 1. Create Product
**POST** `/products`

**Roles**: admin, manager, procurement

**Request Body**:
```json
{
  "sku": "LAPTOP-DELL-XPS15",
  "name": "Dell XPS 15 Laptop",
  "categoryId": "category-uuid",
  "unit": "pcs",
  "barcode": "1234567890123",
  "parameters": {
    "brand": "Dell",
    "processor": "Intel i7",
    "ram": "16GB",
    "storage": "512GB SSD"
  }
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "sku": "LAPTOP-DELL-XPS15",
  "name": "Dell XPS 15 Laptop",
  "categoryId": "category-uuid",
  "unit": "pcs",
  "barcode": "1234567890123",
  "parameters": {...},
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "category": {
    "id": "category-uuid",
    "name": "Laptops"
  }
}
```

---

### 2. Get All Products (Paginated)
**GET** `/products?search=laptop&categoryId=uuid&page=1&limit=20`

**Roles**: admin, manager, procurement, warehouse_staff

**Query Parameters**:
- `search` (optional): Search by name or SKU
- `categoryId` (optional): Filter by category
- `barcode` (optional): Filter by barcode
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page

**Response** (200):
```json
{
  "success": true,
  "products": [
    {
      "id": "uuid",
      "sku": "LAPTOP-DELL-XPS15",
      "name": "Dell XPS 15 Laptop",
      "categoryId": "category-uuid",
      "unit": "pcs",
      "barcode": "1234567890123",
      "parameters": {...},
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "category": {...},
      "batches": [...]
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### 3. Get Product by ID
**GET** `/products/:id`

**Roles**: admin, manager, procurement, warehouse_staff

**Response** (200):
```json
{
  "success": true,
  "product": {
    "id": "uuid",
    "sku": "LAPTOP-DELL-XPS15",
    "name": "Dell XPS 15 Laptop",
    "categoryId": "category-uuid",
    "unit": "pcs",
    "barcode": "1234567890123",
    "parameters": {...},
    "category": {...},
    "batches": [...]
  }
}
```

---

### 4. Get Product by SKU
**GET** `/products/sku/:sku`

**Roles**: admin, manager, procurement, warehouse_staff

**Example**: `/products/sku/LAPTOP-DELL-XPS15`

**Response** (200):
```json
{
  "success": true,
  "product": {...}
}
```

---

### 5. Get Product by Barcode
**GET** `/products/barcode/:barcode`

**Roles**: admin, manager, procurement, warehouse_staff

**Example**: `/products/barcode/1234567890123`

**Response** (200):
```json
{
  "success": true,
  "product": {...}
}
```

---

### 6. Update Product
**PATCH** `/products/:id`

**Roles**: admin, manager, procurement

**Request Body** (all fields optional):
```json
{
  "sku": "NEW-SKU",
  "name": "Updated Name",
  "categoryId": "new-category-uuid",
  "unit": "box",
  "barcode": "9876543210",
  "parameters": {
    "newField": "newValue"
  }
}
```

**Response** (200):
```json
{
  "success": true,
  "product": {...},
  "message": "Product updated successfully"
}
```

---

### 7. Delete Product
**DELETE** `/products/:id`

**Roles**: admin, manager

**Response** (200):
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

**Error** (400):
```json
{
  "statusCode": 400,
  "message": "Cannot delete a product with existing batches. Please delete all batches first.",
  "error": "Bad Request"
}
```

---

## Product Batches

### 1. Create Product Batch
**POST** `/product-batches`

**Roles**: admin, manager, warehouse_staff, procurement

**Request Body**:
```json
{
  "productId": "product-uuid",
  "batchNo": "BATCH-2024-001",
  "quantity": 100,
  "manufactureDate": "2024-01-15T00:00:00.000Z",
  "expiryDate": "2025-01-15T00:00:00.000Z",
  "barcodeOrQr": "QR:BATCH-2024-001",
  "inboundReceiptId": "receipt-uuid"
}
```

**Response** (201):
```json
{
  "success": true,
  "batch": {
    "id": "uuid",
    "productId": "product-uuid",
    "batchNo": "BATCH-2024-001",
    "quantity": 100,
    "manufactureDate": "2024-01-15T00:00:00.000Z",
    "expiryDate": "2025-01-15T00:00:00.000Z",
    "barcodeOrQr": "QR:BATCH-2024-001",
    "inboundReceiptId": "receipt-uuid",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "product": {...}
  },
  "message": "Product batch created successfully"
}
```

---

### 2. Get All Batches (Paginated)
**GET** `/product-batches?productId=uuid&batchNo=BATCH-2024&page=1&limit=20`

**Roles**: admin, manager, procurement, warehouse_staff

**Query Parameters**:
- `productId` (optional): Filter by product
- `batchNo` (optional): Search by batch number
- `barcodeOrQr` (optional): Search by barcode/QR
- `expiryBefore` (optional): Filter batches expiring before date
- `expiryAfter` (optional): Filter batches expiring after date
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page

**Response** (200):
```json
{
  "success": true,
  "batches": [...],
  "total": 25,
  "page": 1,
  "limit": 20,
  "totalPages": 2
}
```

---

### 3. Get Expiring Batches
**GET** `/product-batches/expiring?daysAhead=30&page=1&limit=20`

**Roles**: admin, manager, warehouse_staff

**Query Parameters**:
- `daysAhead` (optional, default: 30): Days to look ahead
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page

**Response** (200):
```json
{
  "success": true,
  "batches": [
    {
      "id": "uuid",
      "productId": "product-uuid",
      "batchNo": "BATCH-2024-001",
      "quantity": 50,
      "expiryDate": "2024-12-31T00:00:00.000Z",
      "product": {...}
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "message": "Batches expiring within 30 days"
}
```

---

### 4. Get Batches by Product
**GET** `/product-batches/product/:productId`

**Roles**: admin, manager, procurement, warehouse_staff

**Response** (200):
```json
{
  "success": true,
  "batches": [...],
  "total": 3
}
```

---

### 5. Get Batch by ID
**GET** `/product-batches/:id`

**Roles**: admin, manager, procurement, warehouse_staff

**Response** (200):
```json
{
  "success": true,
  "batch": {
    "id": "uuid",
    "productId": "product-uuid",
    "batchNo": "BATCH-2024-001",
    "quantity": 100,
    "manufactureDate": "2024-01-15T00:00:00.000Z",
    "expiryDate": "2025-01-15T00:00:00.000Z",
    "product": {...},
    "inventory": [...]
  }
}
```

---

### 6. Update Batch
**PATCH** `/product-batches/:id`

**Roles**: admin, manager, warehouse_staff

**Request Body** (all fields optional):
```json
{
  "batchNo": "BATCH-2024-001-UPDATED",
  "quantity": 150,
  "manufactureDate": "2024-01-20T00:00:00.000Z",
  "expiryDate": "2025-06-15T00:00:00.000Z",
  "barcodeOrQr": "QR:NEW-CODE"
}
```

**Response** (200):
```json
{
  "success": true,
  "batch": {...},
  "message": "Product batch updated successfully"
}
```

---

### 7. Delete Batch
**DELETE** `/product-batches/:id`

**Roles**: admin, manager

**Response** (200):
```json
{
  "success": true,
  "message": "Product batch deleted successfully"
}
```

**Error** (400):
```json
{
  "statusCode": 400,
  "message": "Cannot delete a batch with existing inventory. Please clear inventory first.",
  "error": "Bad Request"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation error message",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Product with ID \"uuid\" not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Product with SKU \"LAPTOP-DELL-XPS15\" already exists",
  "error": "Conflict"
}
```

---

## Postman Collection

You can import this collection into Postman or Thunder Client:

```json
{
  "info": {
    "name": "Product Module API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Categories",
      "item": []
    },
    {
      "name": "Products",
      "item": []
    },
    {
      "name": "Product Batches",
      "item": []
    }
  ],
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  }
}
```

---

## Testing Tips

1. **Get JWT Token**: Login first to get authentication token
   ```bash
   POST /auth/login
   {
     "username": "admin",
     "password": "password"
   }
   ```

2. **Create Category First**: Before creating products
3. **Create Product**: Before creating batches
4. **Test Pagination**: Try different page and limit values
5. **Test Filters**: Use search, categoryId, etc.
6. **Test Validation**: Try invalid data to see error messages
7. **Test Permissions**: Try with different user roles
