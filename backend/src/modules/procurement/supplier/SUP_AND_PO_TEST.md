# Hướng dẫn Test Thủ công - Supplier & Purchase Order Management

## Tổng quan
Module quản lý Nhà cung cấp và Đơn đặt hàng bao gồm:
- **Supplier Management**: CRUD nhà cung cấp, tìm kiếm theo thông tin liên hệ
- **Purchase Order Workflow**: Tạo → Submit → Receive → Track đơn hàng từ nhà cung cấp

Tài liệu này hướng dẫn test thủ công toàn bộ luồng hoạt động qua Swagger UI.

## Prerequisites
- Backend đang chạy: `npm run start:dev`
- Swagger UI: http://localhost:3000/api
- Database đã migrate: `npx prisma migrate dev`

## 1. Authentication Setup

### 1.1 Tạo User Account
```bash
POST /auth/signup
```
```json
{
  "username": "admin",
  "password": "password123",
  "fullName": "Admin User"
}
```

### 1.2 Login để lấy JWT Token
```bash
POST /auth/login
```
```json
{
  "username": "admin",
  "password": "password123"
}
```
**Copy `accessToken` từ response**

### 1.3 Authorize trong Swagger
1. Click nút **"Authorize"** (🔒) ở góc trên phải
2. Nhập: `Bearer YOUR_ACCESS_TOKEN`
3. Click **"Authorize"** → **"Close"**

## 2. Supplier Management

### 2.1 Tạo Supplier
```bash
POST /suppliers
```
```json
{
  "code": "SUP-001",
  "name": "Nhà cung cấp ABC",
  "contactInfo": {
    "phone": "0901234567",
    "email": "contact@abc.com",
    "contactPerson": "Nguyễn Văn A"
  },
  "address": "123 Đường ABC, Quận 1, TP.HCM"
}
```
**Copy `id` từ response để dùng cho PO**

### 2.2 List Suppliers
```bash
GET /suppliers
```
Query parameters (tùy chọn):
- `q`: Tìm kiếm chung
- `code`: Filter theo mã
- `name`: Filter theo tên  
- `phone`: Filter theo số điện thoại
- `page`: Trang (default: 1)
- `pageSize`: Số lượng/trang (default: 20)
- `sort`: Sắp xếp (vd: `createdAt:desc,name:asc`)

### 2.3 Chi tiết Supplier
```bash
GET /suppliers/{id}
```

### 2.4 Cập nhật Supplier
```bash
PATCH /suppliers/{id}
```
```json
{
  "name": "Nhà cung cấp ABC Updated",
  "contactInfo": {
    "phone": "0901234567",
    "email": "new@abc.com",
    "contactPerson": "Nguyễn Văn B"
  }
}
```

### 2.5 Xóa Supplier
```bash
DELETE /suppliers/{id}
```

## 3. Purchase Order Management

### 3.1 Tạo Purchase Order (Draft)
```bash
POST /purchase-orders
```
```json
{
  "supplierId": "SUPPLIER_ID_FROM_STEP_2_1",
  "placedAt": "2024-01-15T10:00:00Z",
  "expectedArrival": "2024-01-20T10:00:00Z",
  "notes": "Đơn hàng khẩn cấp",
  "createdById": "USER_ID_FROM_LOGIN",
  "items": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "qtyOrdered": 10,
      "unitPrice": 50000,
      "remark": "Hàng chất lượng cao"
    }
  ]
}
```
**Copy `id` của PO để dùng cho các bước tiếp theo**

### 3.2 Chi tiết Purchase Order
```bash
GET /purchase-orders/{id}
```

### 3.3 Submit Purchase Order (Draft → Ordered)
```bash
POST /purchase-orders/{id}/submit
```
```json
{
  "userId": "USER_ID_FROM_LOGIN"
}
```

### 3.4 List Purchase Orders
```bash
GET /purchase-orders
```
Query parameters:
- `poNo`: Filter theo số PO
- `status`: Filter theo trạng thái (`draft`, `ordered`, `partial`, `received`)
- `supplierId`: Filter theo nhà cung cấp
- `dateFrom`: Ngày đặt hàng từ
- `dateTo`: Ngày đặt hàng đến
- `page`, `pageSize`, `sort`: Pagination & sorting

### 3.5 Receive Purchase Order (Partial)
```bash
POST /purchase-orders/{id}/receive
```
```json
{
  "items": [
    {
      "poItemId": "PO_ITEM_ID_FROM_STEP_3_2",
      "qtyToReceive": 5,
      "locationId": "LOCATION_ID",
      "productBatchId": "BATCH_ID",
      "createdById": "USER_ID_FROM_LOGIN",
      "idempotencyKey": "receive-20240115-001"
    }
  ],
  "note": "Nhận hàng một phần"
}
```

## 4. Luồng Test Hoàn chỉnh

### Scenario: Tạo PO → Submit → Receive Partial

1. **Setup**: Login, tạo Supplier
2. **Create PO**: Tạo PO với status `draft`
3. **Submit PO**: Chuyển status thành `ordered`
4. **Receive Partial**: Nhận một phần hàng, status chuyển thành `partial`
5. **Verify**: Kiểm tra `qtyReceived` và status đã cập nhật

### Expected Results:
- PO status transitions: `draft` → `ordered` → `partial` → `received`
- `qtyReceived` tăng dần theo từng lần receive
- `totalAmount` được tính tự động từ `qtyOrdered × unitPrice`

## 5. Error Handling

### Common Errors:
- **401 Unauthorized**: Chưa login hoặc token hết hạn
- **400 Bad Request**: 
  - `productId must be a UUID`: Cần UUID hợp lệ cho productId
  - `PO status is not eligible for receiving`: Chỉ receive khi status `ordered/partial`
- **404 Not Found**: Supplier/PO không tồn tại
- **409 Conflict**: Supplier code đã tồn tại

### Troubleshooting:
1. **Token expired**: Login lại và authorize
2. **Missing data**: Đảm bảo có Supplier, Product, Location trong DB
3. **Invalid UUID**: Dùng UUID thật từ database, không dùng placeholder

## 6. Data Requirements

### Minimum Test Data:
- **User**: Từ `/auth/signup` hoặc `/auth/login`
- **Supplier**: Từ `/suppliers` POST
- **Product**: Cần có sẵn trong DB (Inventory Module)
- **Location**: Cần có sẵn trong DB (Inventory Module)
- **ProductBatch**: Cần có sẵn trong DB (Inventory Module)

### Note:
- Module Supplier hoạt động độc lập với Supplier CRUD
- Purchase Order cần dependency từ Inventory Module cho Product data
- E2E tests đã cover toàn bộ luồng với seed data

## 7. Business Logic Validation

### Supplier:
- `code` phải unique
- `name` là bắt buộc
- Search theo `contactInfo.phone` sử dụng GIN index

### Purchase Order:
- Tạo ở trạng thái `draft`
- Chỉ có thể submit từ `draft` → `ordered`
- Chỉ có thể receive khi `ordered` hoặc `partial`
- Không thể receive vượt quá `qtyOrdered`
- Status tự động cập nhật: `partial` (một phần) hoặc `received` (hoàn tất)

### Authorization:
- Supplier CRUD: `admin`, `manager`, `procurement`
- PO Create/Submit: `admin`, `manager`, `procurement`
- PO Receive: `admin`, `manager`, `warehouse_staff`
- PO View: Tất cả roles

## 8. Performance Notes

### Database Indexes:
- `suppliers.code` (unique)
- `suppliers.contactInfo` (GIN index for JSONB)
- `purchase_orders.status`
- `purchase_orders.supplierId`
- `purchase_orders.placedAt`

### Query Optimization:
- Pagination cho large datasets
- Case-insensitive search
- Efficient JSONB queries cho contactInfo
