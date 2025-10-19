# Product Module

Module quản lý sản phẩm, danh mục sản phẩm và lô hàng trong hệ thống Warehouse Management.

## Tính năng

### 1. Product Category (Danh mục sản phẩm)
- ✅ Tạo, đọc, cập nhật, xóa danh mục
- ✅ Hỗ trợ cấu trúc phân cấp (parent-child)
- ✅ Trả về dạng tree structure
- ✅ Validation không cho xóa danh mục có con

### 2. Product (Sản phẩm)
- ✅ CRUD sản phẩm đầy đủ
- ✅ SKU unique cho mỗi sản phẩm
- ✅ Hỗ trợ barcode
- ✅ Tìm kiếm theo tên, SKU, category
- ✅ Phân trang kết quả
- ✅ Validation không cho xóa sản phẩm có batch
- ✅ Metadata/parameters tùy chỉnh (JSON)

### 3. Product Batch (Lô hàng)
- ✅ CRUD lô hàng
- ✅ Quản lý số lô (batch number)
- ✅ Ngày sản xuất và hạn sử dụng
- ✅ Barcode/QR code cho lô
- ✅ Tìm kiếm lô sắp hết hạn
- ✅ Validation ngày tháng
- ✅ Validation không cho xóa lô có tồn kho

## API Endpoints

### Product Categories

#### `POST /product-categories`
Tạo danh mục mới
```json
{
  "name": "Electronics",
  "parentId": "uuid" // optional
}
```

#### `GET /product-categories`
Lấy tất cả danh mục (tree structure)

#### `GET /product-categories/:id`
Lấy chi tiết danh mục

#### `PATCH /product-categories/:id`
Cập nhật danh mục

#### `DELETE /product-categories/:id`
Xóa danh mục

### Products

#### `POST /products`
Tạo sản phẩm mới
```json
{
  "sku": "SKU-001",
  "name": "Laptop Dell XPS 15",
  "categoryId": "uuid", // optional
  "unit": "pcs",
  "barcode": "1234567890123", // optional
  "parameters": {
    "weight": "2.5kg",
    "color": "silver",
    "brand": "Dell"
  }
}
```

#### `GET /products`
Lấy danh sách sản phẩm (có filter và pagination)

Query parameters:
- `search`: tìm kiếm theo tên hoặc SKU
- `categoryId`: lọc theo danh mục
- `barcode`: lọc theo barcode
- `page`: trang hiện tại (default: 1)
- `limit`: số items mỗi trang (default: 20)

#### `GET /products/:id`
Lấy chi tiết sản phẩm theo ID

#### `GET /products/sku/:sku`
Lấy sản phẩm theo SKU

#### `GET /products/barcode/:barcode`
Lấy sản phẩm theo barcode

#### `PATCH /products/:id`
Cập nhật sản phẩm

#### `DELETE /products/:id`
Xóa sản phẩm

### Product Batches

#### `POST /product-batches`
Tạo lô hàng mới
```json
{
  "productId": "uuid",
  "batchNo": "BATCH-2024-001",
  "quantity": 100,
  "manufactureDate": "2024-01-15T00:00:00.000Z", // optional
  "expiryDate": "2025-01-15T00:00:00.000Z", // optional
  "barcodeOrQr": "QR:ABC123XYZ", // optional
  "inboundReceiptId": "receipt-uuid-123" // optional
}
```

#### `GET /product-batches`
Lấy danh sách lô hàng (có filter và pagination)

Query parameters:
- `productId`: lọc theo sản phẩm
- `batchNo`: tìm theo số lô
- `barcodeOrQr`: tìm theo barcode/QR
- `expiryBefore`: lọc lô hết hạn trước ngày
- `expiryAfter`: lọc lô hết hạn sau ngày
- `page`: trang hiện tại (default: 1)
- `limit`: số items mỗi trang (default: 20)

#### `GET /product-batches/expiring`
Lấy danh sách lô sắp hết hạn

Query parameters:
- `daysAhead`: số ngày trong tương lai (default: 30)
- `page`: trang hiện tại
- `limit`: số items mỗi trang

#### `GET /product-batches/product/:productId`
Lấy tất cả lô của một sản phẩm

#### `GET /product-batches/:id`
Lấy chi tiết lô hàng

#### `PATCH /product-batches/:id`
Cập nhật lô hàng

#### `DELETE /product-batches/:id`
Xóa lô hàng

## Phân quyền

### Admin & Manager
- Full access tất cả endpoints

### Procurement
- Tạo, đọc, cập nhật Products và Categories
- Đọc Product Batches

### Warehouse Staff
- Đọc Products và Categories
- CRUD Product Batches
- Đọc danh sách lô sắp hết hạn

## Database Schema

### ProductCategory
```prisma
model ProductCategory {
  id       String  @id @default(uuid())
  name     String  @unique
  parentId String?
  metadata Json?
  
  parent   ProductCategory?
  children ProductCategory[]
  products Product[]
}
```

### Product
```prisma
model Product {
  id         String   @id @default(uuid())
  sku        String   @unique
  name       String
  categoryId String?
  unit       String
  barcode    String?
  parameters Json?
  createdAt  DateTime
  updatedAt  DateTime
  
  category   ProductCategory?
  batches    ProductBatch[]
}
```

### ProductBatch
```prisma
model ProductBatch {
  id               String    @id @default(uuid())
  productId        String
  batchNo          String?
  quantity         Int       @default(0)
  manufactureDate  DateTime?
  expiryDate       DateTime?
  barcodeOrQr      String?
  inboundReceiptId String?
  createdAt        DateTime
  updatedAt        DateTime
  
  product    Product
  inventory  Inventory[]
}
```

## Testing

Chạy unit tests:
```bash
npm run test -- product
```

Chạy e2e tests:
```bash
npm run test:e2e -- --testPathPattern=product
```

## Cấu trúc thư mục

```
product/
├── controllers/
│   ├── product-category.controller.ts
│   ├── product.controller.ts
│   └── product-batch.controller.ts
├── dto/
│   ├── create-category.dto.ts
│   ├── update-category.dto.ts
│   ├── query-category.dto.ts
│   ├── create-product.dto.ts
│   ├── update-product.dto.ts
│   ├── query-product.dto.ts
│   ├── create-product-batch.dto.ts
│   ├── update-product-batch.dto.ts
│   └── query-product-batch.dto.ts
├── repositories/
│   ├── product-category.repository.ts
│   ├── product.repository.ts
│   └── product-batch.repository.ts
├── services/
│   ├── product-category.service.ts
│   ├── product-category.service.spec.ts
│   ├── product.service.ts
│   ├── product.service.spec.ts
│   ├── product-batch.service.ts
│   └── product-batch.service.spec.ts
├── product.module.ts
└── README.md
```

## Best Practices

1. **SKU Management**: SKU phải unique trong toàn hệ thống
2. **Batch Numbers**: Batch number unique trong phạm vi một product
3. **Date Validation**: Luôn validate expiry date > manufacture date
4. **Cascade Delete**: Cẩn thận với việc xóa, luôn check relationships trước
5. **Pagination**: Luôn implement pagination cho list endpoints
6. **Search**: Sử dụng case-insensitive search
7. **Metadata**: Sử dụng JSON field cho các thuộc tính tùy chỉnh

## Integration với các Module khác

### Inventory Module
- ProductBatch được sử dụng trong Inventory records
- Tracking tồn kho theo từng lô hàng

### Order Module (Purchase Order)
- Product được reference trong PurchaseOrderItem
- ProductBatch được tạo khi nhận hàng

### Order Module (Sales Order)
- Product được reference trong SalesOrderItem
- ProductBatch được sử dụng cho FIFO/FEFO dispatch

## Workflow ví dụ

### 1. Thêm sản phẩm mới vào hệ thống
```
1. Tạo ProductCategory (nếu chưa có)
2. Tạo Product với SKU unique
3. Tạo ProductBatch khi nhận hàng
4. Inventory tự động cập nhật thông qua Inventory Module
```

### 2. Quản lý hạn sử dụng
```
1. Định kỳ gọi GET /product-batches/expiring?daysAhead=30
2. Alert warehouse staff về các lô sắp hết hạn
3. Ưu tiên xuất các lô gần hết hạn (FEFO)
```

### 3. Tracking theo lô
```
1. Mỗi lô hàng có batchNo và barcode/QR riêng
2. Scan QR để track nhanh
3. Xem lịch sử movement theo batch
```

## TODO / Future Enhancements

- [ ] Bulk import products từ CSV/Excel
- [ ] Product images/attachments
- [ ] Product pricing history
- [ ] Product variants (size, color, etc.)
- [ ] Auto-generate batch numbers
- [ ] Expiry alerts notifications
- [ ] Batch merge/split operations
- [ ] Product bundle/kit management
