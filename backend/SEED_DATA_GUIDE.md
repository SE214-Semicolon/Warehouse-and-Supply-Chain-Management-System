# 📋 Seed Data QA Testing Guide

## Tổng quan

File này cung cấp thông tin chi tiết về dữ liệu mẫu (seed data) đã được tạo trong database để hỗ trợ Frontend QA testing.

**File seed:** `backend/prisma/seed.ts`  
**Lệnh chạy:** `npx prisma db seed`

---

## 🚀 Hướng dẫn Setup Seed Data

### Điều kiện tiên quyết

Trước khi chạy seed data, đảm bảo bạn đã hoàn thành các bước setup cơ bản:

1. ✅ Database đã được setup và chạy (PostgreSQL container)
2. ✅ Migrations đã được apply (bảng đã được tạo)
3. ✅ Backend container đã được build và chạy

### Cách chạy Seed Data

Sau khi đã hoàn thành setup cơ bản theo workflow hiện có, chạy lệnh sau để tạo dữ liệu mẫu:

```bash
# Chạy seed data từ trong backend container
docker compose exec -T backend sh -lc "export DATABASE_URL='postgresql://warehouse_user:warehouse_pass@db:5432/warehouse_db' && npx prisma db seed"
```

**Lưu ý:**
- Lệnh này sẽ **xóa toàn bộ dữ liệu cũ** và tạo lại dữ liệu mẫu mới
- Thời gian chạy: khoảng 30-60 giây tùy vào máy
- Sau khi chạy xong, bạn sẽ có đầy đủ dữ liệu để test

### Khi nào cần chạy Seed Data?

- ✅ **Lần đầu setup project** - Sau khi chạy migrations
- ✅ **Khi cần reset dữ liệu test** - Xóa dữ liệu cũ và tạo lại
- ✅ **Sau khi có thay đổi về seed data** - Pull code mới có update seed file

### Verify Seed Data đã chạy thành công

Sau khi chạy seed, bạn sẽ thấy output tương tự:

```
🌱 ============================================
   BẮT ĐẦU SEED DATABASE
   Warehouse & Supply Chain Management
============================================

📦 Đang xóa dữ liệu cũ...
   ✅ Đã xóa toàn bộ dữ liệu cũ

📦 Đang tạo Users...
   ✅ Đã tạo 7 users

📦 Đang tạo Warehouses và Locations...
   ✅ Đã tạo 3 warehouses
   ✅ Đã tạo 51 locations

...

📊 ============================================
   TÓM TẮT DỮ LIỆU ĐÃ TẠO
============================================
   👥 Users: 7
   🏭 Warehouses: 3
   📍 Locations: 51
   ...
============================================

✅ Seed hoàn tất thành công!
```

Bạn có thể test login ngay với tài khoản: `admin` / `admin123`

---

## 🔐 Tài khoản Test

### Danh sách Users

| Username | Password | Role | Email | Mô tả |
|----------|----------|------|-------|-------|
| `admin` | `admin123` | Admin | admin@warehouse.com | Quyền cao nhất, có thể làm mọi thứ |
| `manager` | `manager123` | Manager | manager@warehouse.com | Quản lý kho, có thể approve orders |
| `staff` | `staff123` | Warehouse Staff | staff@warehouse.com | Nhân viên kho, thực hiện inventory operations |
| `sales1` | `sales123` | Sales | sales1@warehouse.com | Nhân viên bán hàng, tạo sales orders |
| `procurement` | `procurement123` | Procurement | procurement@warehouse.com | Nhân viên mua hàng, tạo purchase orders |
| `logistics` | `logistics123` | Logistics | logistics@warehouse.com | Quản lý vận chuyển, shipments |
| `analyst` | `analyst123` | Analyst | analyst@warehouse.com | Phân tích dữ liệu, xem reports |

### Test Login Flow

1. **Endpoint:** `POST /auth/login`
2. **Request Body:**
   ```json
   {
     "email": "admin@warehouse.com",
     "password": "admin123"
   }
   ```
3. **Expected Response:**
   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": "...",
       "username": "admin",
       "email": "admin@warehouse.com",
       "role": "admin"
     }
   }
   ```

---

## 📊 Dữ liệu Mẫu Đã Tạo

### 1. Warehouses (3 kho)

| Code | Tên | Địa chỉ |
|------|-----|---------|
| `WH-HCM-001` | Kho Tân Bình - TP.HCM | 123 Đường Tân Bình, Phường 1, Quận Tân Bình, TP.HCM |
| `WH-HCM-002` | Kho Bình Tân - TP.HCM | 456 Đường Bình Tân, Phường 2, Quận Bình Tân, TP.HCM |
| `WH-HN-001` | Kho Long Biên - Hà Nội | 789 Đường Long Biên, Phường Long Biên, Quận Long Biên, Hà Nội |

**Locations:** Mỗi kho có **10-20 locations** với code format: `A-01`, `A-02`, `B-01`, etc.

**API Endpoints:**
- `GET /warehouses` - List tất cả warehouses
- `GET /warehouses/:id` - Chi tiết warehouse
- `GET /locations?warehouseId=xxx` - List locations của warehouse

### 2. Suppliers (10 nhà cung cấp)

| Code | Tên |
|------|-----|
| `SUP-001` | Samsung Electronics Vietnam |
| `SUP-002` | Apple Vietnam |
| `SUP-003` | LG Electronics Vietnam |
| `SUP-004` | Sony Vietnam |
| `SUP-005` | Panasonic Vietnam |
| `SUP-006` | Toshiba Vietnam |
| `SUP-007` | Canon Vietnam |
| `SUP-008` | HP Vietnam |
| `SUP-009` | Dell Vietnam |
| `SUP-010` | Lenovo Vietnam |

**API Endpoints:**
- `GET /suppliers` - List suppliers (có pagination)
- `GET /suppliers/:id` - Chi tiết supplier
- `GET /suppliers?search=samsung` - Tìm kiếm supplier

### 3. Customers (50 khách hàng)

**Format Code:** `CUST-0001` đến `CUST-0050`

**Customer Ranks:** Bronze, Silver, Gold, Platinum, Diamond  
**Customer Types:** Retailer, Wholesaler, Distributor, Supermarket, E-commerce

**API Endpoints:**
- `GET /customers` - List customers (có pagination, filter)
- `GET /customers/:id` - Chi tiết customer
- `GET /customers?search=abc` - Tìm kiếm customer

### 4. Product Categories (5 categories)

1. **Điện tử - Điện lạnh**
2. **Điện thoại - Máy tính bảng**
3. **Máy tính - Laptop**
4. **Phụ kiện công nghệ**
5. **Thiết bị văn phòng**

**API Endpoints:**
- `GET /product-categories` - List categories
- `GET /product-categories/:id` - Chi tiết category

### 5. Products (50 sản phẩm)

**Format SKU:** `SKU-000001` đến `SKU-000050`

**Mỗi category có 10 products:**
- Điện tử - Điện lạnh: Tủ lạnh Samsung, Máy giặt LG, Điều hòa Panasonic, ...
- Điện thoại: iPhone 15 Pro Max, Samsung Galaxy S24 Ultra, iPad Pro, ...
- Laptop: MacBook Pro M3, Dell XPS 15, HP Spectre, ...
- Phụ kiện: AirPods Pro, Chuột Logitech, Bàn phím Keychron, ...
- Văn phòng: Máy in Canon, Máy scan Fujitsu, Máy chiếu Epson, ...

**Mỗi product có:**
- SKU, Name, Barcode
- Category
- Parameters: brand, model, warranty, color
- Stock levels: minStockLevel, reorderPoint, leadTimeDays, safetyStockLevel

**API Endpoints:**
- `GET /products` - List products (có pagination, filter)
- `GET /products/:id` - Chi tiết product
- `GET /products/sku/:sku` - Tìm theo SKU
- `GET /products/barcode/:barcode` - Tìm theo barcode
- `GET /products/autocomplete?q=iphone` - Autocomplete search

### 6. Inventory

**Product Batches:** Mỗi product có **1-3 batches** với:
- Batch No: `BATCH-SKU-000001-001`
- Manufacture Date: Trong 3 tháng gần đây
- Expiry Date: Trong tương lai (1-2 năm)

**Inventory Records:** Mỗi batch có inventory tại **1-3 locations** với:
- Available Quantity: 10-500 units
- Reserved Quantity: 0-30% của available

**API Endpoints:**
- `GET /inventory/location?locationId=xxx` - Inventory theo location
- `GET /inventory/product-batch?productBatchId=xxx` - Inventory theo batch
- `GET /inventory/product?productId=xxx` - Tổng inventory của product

### 7. Purchase Orders (20 đơn mua hàng)

**Format PO No:** `PO-2024-0001` đến `PO-2024-0020`

**Status Distribution:**
- `draft`: Một số PO
- `ordered`: Một số PO
- `partial`: Một số PO (đã nhận một phần)
- `received`: Một số PO (đã nhận đầy đủ)

**Mỗi PO có:**
- 1-5 items
- Supplier (từ danh sách 10 suppliers)
- Total Amount (tính từ items)
- Placed At, Expected Arrival dates

**API Endpoints:**
- `GET /purchase-orders` - List POs (có filter theo status)
- `GET /purchase-orders/:id` - Chi tiết PO
- `POST /purchase-orders/:id/submit` - Submit PO (draft → ordered)
- `POST /purchase-orders/:id/receive` - Receive goods

### 8. Sales Orders (50 đơn bán hàng)

**Format SO No:** `SO-2024-0001` đến `SO-2024-0050`

**Status Distribution:**
- `pending`: Một số SO
- `approved`: Một số SO
- `processing`: Một số SO
- `shipped`: Một số SO
- `closed`: Một số SO

**Mỗi SO có:**
- 1-4 items
- Customer (từ danh sách 50 customers)
- Product với ProductBatch và Location (nếu có inventory)
- Total Amount
- qtyFulfilled tracking

**API Endpoints:**
- `GET /sales-orders` - List SOs (có filter theo status, customer)
- `GET /sales-orders/:id` - Chi tiết SO
- `POST /sales-orders/:id/submit` - Submit SO (pending → approved)
- `POST /sales-orders/:id/fulfill` - Fulfill order
- `POST /sales-orders/:id/cancel` - Cancel order

### 9. Shipments (Khoảng 35 shipments)

**Format Shipment No:** `SHIP-2024-0001`, `SHIP-2024-0002`, ...

**Status Distribution:**
- `preparing`: Một số shipments
- `in_transit`: Một số shipments
- `delivered`: Một số shipments
- `delayed`: Một số shipments

**Mỗi shipment có:**
- Sales Order liên kết
- Warehouse
- Carrier: Viettel Post, Vietnam Post, Giao Hàng Nhanh, J&T Express, Shopee Express
- Tracking Code
- Tracking Events (2-3 events cho mỗi shipment)

**API Endpoints:**
- `GET /shipments` - List shipments (có filter theo status, warehouse)
- `GET /shipments/:id` - Chi tiết shipment
- `GET /shipments/:id/tracking` - Tracking events
- `PATCH /shipments/:id/status` - Update shipment status

---

## 🧪 Test Scenarios

### 1. Authentication & Authorization

#### Test Case 1.1: Login với các role khác nhau
- ✅ Login với admin → Kiểm tra accessToken và role
- ✅ Login với manager → Kiểm tra permissions
- ✅ Login với staff → Kiểm tra permissions
- ✅ Login với sales → Kiểm tra permissions
- ❌ Login với password sai → Phải trả về 401

#### Test Case 1.2: Access Control
- ✅ Admin có thể truy cập tất cả endpoints
- ✅ Manager không thể xóa users
- ✅ Staff chỉ có thể thực hiện inventory operations
- ✅ Sales chỉ có thể tạo/view sales orders

### 2. Products & Inventory

#### Test Case 2.1: Product List & Search
- ✅ List products với pagination
- ✅ Filter products theo category
- ✅ Search product theo SKU: `GET /products/sku/SKU-000001`
- ✅ Search product theo barcode
- ✅ Autocomplete search: `GET /products/autocomplete?q=iphone`

#### Test Case 2.2: Inventory Levels
- ✅ Xem inventory của một location
- ✅ Xem inventory của một product
- ✅ Kiểm tra availableQty và reservedQty
- ✅ Verify inventory có đúng productBatch

#### Test Case 2.3: Low Stock Alerts
- ✅ Tìm products có stock thấp (availableQty < minStockLevel)
- ✅ Verify reorderPoint và safetyStockLevel

### 3. Purchase Orders

#### Test Case 3.1: List & Filter POs
- ✅ List tất cả POs
- ✅ Filter POs theo status: `?status=draft`
- ✅ Filter POs theo supplier: `?supplierId=xxx`
- ✅ Xem chi tiết PO với items

#### Test Case 3.2: PO Workflow
- ✅ Tạo draft PO
- ✅ Submit PO (draft → ordered)
- ✅ Receive PO (ordered → received)
- ✅ Partial receive (ordered → partial)
- ✅ Verify qtyOrdered vs qtyReceived

### 4. Sales Orders

#### Test Case 4.1: List & Filter SOs
- ✅ List tất cả SOs
- ✅ Filter SOs theo status: `?status=pending`
- ✅ Filter SOs theo customer: `?customerId=xxx`
- ✅ Xem chi tiết SO với items

#### Test Case 4.2: SO Workflow
- ✅ Tạo pending SO
- ✅ Submit SO (pending → approved)
- ✅ Fulfill SO (approved → processing/closed)
- ✅ Verify qty vs qtyFulfilled
- ✅ Cancel SO

#### Test Case 4.3: Inventory Integration
- ✅ Tạo SO với product có inventory → Phải thành công
- ✅ Verify SO items có productBatch và location
- ✅ Fulfill SO → Verify inventory giảm

### 5. Shipments

#### Test Case 5.1: List & Filter Shipments
- ✅ List tất cả shipments
- ✅ Filter shipments theo status: `?status=delivered`
- ✅ Filter shipments theo warehouse: `?warehouseId=xxx`
- ✅ Filter shipments theo sales order: `?salesOrderId=xxx`

#### Test Case 5.2: Shipment Tracking
- ✅ Xem tracking events của shipment
- ✅ Verify tracking events có eventTime, location, statusText
- ✅ Update shipment status

### 6. Customers & Suppliers

#### Test Case 6.1: Customer Management
- ✅ List customers với pagination
- ✅ Search customers: `?search=abc`
- ✅ Filter customers theo rank: `?rank=Gold`
- ✅ Xem customer details với contactInfo

#### Test Case 6.2: Supplier Management
- ✅ List suppliers với pagination
- ✅ Search suppliers: `?search=samsung`
- ✅ Xem supplier details với contactInfo

### 7. Reporting & Analytics

#### Test Case 7.1: Inventory Reports
- ✅ Inventory valuation report
- ✅ Stock levels by location
- ✅ Products with low stock

#### Test Case 7.2: Sales Reports
- ✅ Sales by customer
- ✅ Sales by product
- ✅ Sales by date range

#### Test Case 7.3: Procurement Reports
- ✅ Purchase orders by supplier
- ✅ Purchase orders by status
- ✅ Expected arrivals

---

## 🔍 Cách Verify Dữ Liệu

### 1. Sử dụng Prisma Studio

```bash
cd backend
npx prisma studio
```

Mở browser tại `http://localhost:5555` để xem trực tiếp dữ liệu trong database.

### 2. Sử dụng API Endpoints

**Base URL:** `http://localhost:3000` (hoặc URL của backend server)

**Swagger UI:** `http://localhost:3000/docs`

### 3. Sample Queries

#### Kiểm tra số lượng records:
```bash
# Products
GET /products?page=1&limit=100

# Customers
GET /customers?page=1&limit=100

# Sales Orders
GET /sales-orders?page=1&limit=100
```

#### Kiểm tra inventory:
```bash
# Inventory của location đầu tiên
GET /inventory/location?locationId={locationId}

# Inventory của product
GET /inventory/product?productId={productId}
```

---

## 📝 Test Data Summary

| Entity | Số lượng | Notes |
|--------|----------|-------|
| Users | 7 | Các role khác nhau |
| Warehouses | 3 | Kho Tân Bình, Bình Tân, Long Biên |
| Locations | 30-60 | 10-20 locations mỗi kho |
| Suppliers | 10 | Samsung, Apple, LG, Sony, ... |
| Customers | 50 | Với rank và type khác nhau |
| Categories | 5 | 5 categories chính |
| Products | 50 | 10 products mỗi category |
| Product Batches | 50-150 | 1-3 batches mỗi product |
| Inventory Records | 100-300 | Inventory tại các locations |
| Purchase Orders | 20 | Mixed status |
| Sales Orders | 50 | Mixed status |
| Shipments | ~35 | Tương ứng với SOs |

---

## 🚀 Quick Start Testing

### 1. Setup Seed Data (Nếu chưa chạy)
```bash
# Chạy seed data từ trong backend container
docker compose exec -T backend sh -lc "export DATABASE_URL='postgresql://warehouse_user:warehouse_pass@db:5432/warehouse_db' && npx prisma db seed"
```

**Lưu ý:** Nếu bạn đã chạy seed data rồi, có thể bỏ qua bước này.

### 2. Test Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@warehouse.com",
    "password": "admin123"
  }'
```

### 3. Test Products List
```bash
curl -X GET http://localhost:3000/products \
  -H "Authorization: Bearer {accessToken}"
```

### 4. Test Sales Orders
```bash
curl -X GET http://localhost:3000/sales-orders?status=pending \
  -H "Authorization: Bearer {accessToken}"
```

---

## ⚠️ Lưu Ý

1. **Dữ liệu sẽ bị xóa khi chạy seed lại:** File seed sẽ xóa toàn bộ dữ liệu cũ trước khi tạo mới.

2. **Dates rải rác trong 3 tháng:** Các dates (createdAt, placedAt) được tạo ngẫu nhiên trong 3 tháng gần đây để phù hợp với biểu đồ.

3. **Inventory có thể không đủ:** Một số sales orders có thể không có inventory đủ để fulfill, đây là intentional để test edge cases.

4. **Test với Swagger UI:** Sử dụng Swagger UI tại `/docs` để test API một cách trực quan.

---
