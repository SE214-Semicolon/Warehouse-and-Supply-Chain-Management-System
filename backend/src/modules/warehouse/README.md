# Warehouse Module

Module quản lý kho (Warehouse) và vị trí (Location) trong hệ thống Warehouse Management.

## Tính năng

### 1. Warehouse (Kho)
- ✅ CRUD kho đầy đủ
- ✅ Mã kho unique
- ✅ Tìm kiếm theo tên hoặc mã kho
- ✅ Thống kê kho (tổng locations, capacity, utilization)
- ✅ Metadata tùy chỉnh (JSON)
- ✅ Phân trang

### 2. Location (Vị trí trong kho)
- ✅ CRUD vị trí đầy đủ
- ✅ Mã vị trí unique trong mỗi kho
- ✅ Quản lý capacity (sức chứa)
- ✅ Location types (shelf, rack, bin, zone, etc.)
- ✅ Tìm kiếm theo warehouse, type
- ✅ Thống kê vị trí (inventory items, utilization)
- ✅ Tìm vị trí available (còn chỗ trống)
- ✅ Properties tùy chỉnh (JSON)

## Database Schema

### Warehouse
```prisma
model Warehouse {
  id        String   @id @default(uuid())
  code      String   @unique
  name      String
  address   String?
  metadata  Json?
  createdAt DateTime
  updatedAt DateTime
  
  locations Location[]
}
```

### Location
```prisma
model Location {
  id          String   @id @default(uuid())
  warehouseId String
  code        String
  name        String?
  capacity    Int?
  type        String?
  properties  Json?
  createdAt   DateTime
  updatedAt   DateTime
  
  warehouse Warehouse
  inventory Inventory[]
  
  @@unique([warehouseId, code])
}
```

## API Endpoints

### Warehouses

#### `POST /warehouses`
Tạo kho mới

```json
{
  "code": "WH-001",
  "name": "Main Warehouse",
  "address": "123 Main Street",
  "metadata": {
    "type": "Cold Storage",
    "manager": "John Doe"
  }
}
```

#### `GET /warehouses`
Lấy danh sách kho (có filter và pagination)

Query parameters:
- `search`: tìm kiếm theo tên hoặc mã
- `code`: lọc theo mã kho
- `page`: trang hiện tại (default: 1)
- `limit`: số items mỗi trang (default: 20)

#### `GET /warehouses/:id`
Lấy chi tiết kho theo ID (kèm statistics)

#### `GET /warehouses/code/:code`
Lấy kho theo code

#### `GET /warehouses/:id/stats`
Lấy thống kê kho

Response:
```json
{
  "success": true,
  "warehouseId": "uuid",
  "warehouseName": "Main Warehouse",
  "warehouseCode": "WH-001",
  "totalLocations": 150,
  "totalCapacity": 5000,
  "occupiedLocations": 75
}
```

#### `PATCH /warehouses/:id`
Cập nhật kho

#### `DELETE /warehouses/:id`
Xóa kho (không được có locations)

---

### Locations

#### `POST /locations`
Tạo vị trí mới

```json
{
  "warehouseId": "warehouse-uuid",
  "code": "A-01-01",
  "name": "Aisle A, Rack 01, Level 01",
  "capacity": 100,
  "type": "shelf",
  "properties": {
    "aisle": "A",
    "rack": "01",
    "level": "01",
    "temperature": "-18°C"
  }
}
```

#### `GET /locations`
Lấy danh sách vị trí (có filter và pagination)

Query parameters:
- `warehouseId`: lọc theo kho
- `search`: tìm kiếm theo code hoặc name
- `type`: lọc theo loại vị trí
- `page`: trang hiện tại
- `limit`: số items mỗi trang

#### `GET /locations/warehouse/:warehouseId`
Lấy tất cả locations của một warehouse

#### `GET /locations/warehouse/:warehouseId/available`
Lấy locations còn trống

Query parameters:
- `minCapacity`: capacity tối thiểu

#### `GET /locations/code/:warehouseId/:code`
Lấy location theo warehouse và code

#### `GET /locations/:id`
Lấy chi tiết location (kèm statistics)

#### `GET /locations/:id/stats`
Lấy thống kê location

Response:
```json
{
  "success": true,
  "locationId": "uuid",
  "locationCode": "A-01-01",
  "capacity": 100,
  "totalInventoryItems": 50,
  "totalQuantity": 500,
  "totalReservedQuantity": 100,
  "utilizationRate": 50.0
}
```

#### `PATCH /locations/:id`
Cập nhật location

#### `DELETE /locations/:id`
Xóa location (không được có inventory)

## Phân quyền

### Admin & Manager
- Full access tất cả endpoints

### Warehouse Staff
- CRUD locations
- Read warehouses
- View statistics

### Logistics
- Read only (warehouses và locations)

## Integration với các Module khác

### Inventory Module
- Location được reference trong Inventory records
- StockMovement tracking movements giữa các locations
- Cannot delete location với inventory > 0

### Product Module
- Indirect relation qua Inventory
- Product batches được store tại locations

### Reporting Module
- Warehouse và Location data cho reports
- Utilization reports
- Capacity planning

## Workflow ví dụ

### 1. Setup kho mới
```
1. Tạo Warehouse
2. Tạo Locations trong warehouse
3. Configure properties cho từng location
4. Receive inventory vào locations
```

### 2. Tìm vị trí trống
```
1. GET /locations/warehouse/:id/available
2. Filter theo minCapacity nếu cần
3. Check utilizationRate
4. Assign inventory to location
```

### 3. Quản lý capacity
```
1. Monitor location statistics
2. Alert khi utilization > 80%
3. Plan expansion hoặc reorganization
```

## Location Types

Các loại vị trí phổ biến:
- `shelf` - Kệ hàng
- `rack` - Giá đỡ
- `bin` - Thùng/hộp
- `zone` - Khu vực
- `floor` - Sàn
- `receiving` - Khu nhận hàng
- `shipping` - Khu xuất hàng
- `qc` - Khu kiểm tra chất lượng
- `cold_rack` - Giá lạnh
- `hazardous` - Khu nguy hiểm

## Best Practices

1. **Warehouse Code**: Nên có format chuẩn (VD: WH-CITY-TYPE)
2. **Location Code**: Format có hệ thống (VD: AISLE-RACK-LEVEL)
3. **Capacity Management**: Set realistic capacity values
4. **Properties**: Sử dụng để store custom attributes
5. **Metadata**: Store additional warehouse info
6. **Statistics**: Monitor regularly for optimization
7. **Soft Delete**: Consider before hard delete

## Sample Data

Sau khi run seed, bạn sẽ có:

**Warehouses:**
- WH-MAIN-HCM - Main Warehouse Ho Chi Minh
- WH-COLD-HCM - Cold Storage Ho Chi Minh
- WH-NORTH-HN - Northern Warehouse Hanoi
- WH-CENTRAL-DN - Central Warehouse Da Nang

**Locations:**
- Main Warehouse: 60 shelf locations (A-D aisles, 5 racks, 3 levels)
- Cold Storage: 60 cold_rack locations (3 zones, 5 chambers, 4 racks)
- Northern Warehouse: 24 locations (E-G aisles)
- Central Warehouse: 12 locations (H-I aisles)
- Special zones: receiving, shipping, qc

## Testing

```bash
# Unit tests
npm run test -- warehouse

# E2E tests (coming soon)
npm run test:e2e -- warehouse

# With coverage
npm run test:cov
```

## Seeding

```bash
# Seed warehouses and locations
npx ts-node prisma/seeds/warehouse-seed.ts
```

## Next Steps

1. ✅ Warehouse & Location modules complete
2. 🔄 Integrate with Inventory module
3. 📊 Create utilization reports
4. 🚨 Implement capacity alerts
5. 📱 Add barcode scanning for locations
6. 🗺️ Warehouse layout visualization (future)

---

**Status**: ✅ **COMPLETE** - Ready for Integration Testing
