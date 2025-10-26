# 🧪 Hướng Dẫn Test Thủ Công RBAC

## 🚀 Cách Test Nhanh (Recommended)

### Option 1: Script Tự Động (Dễ nhất)
```bash
# 1. Khởi động backend
cd backend
npm run start:dev

# 2. Chạy test RBAC tự động
npm run rbac:test
```

### Option 2: Tạo Token Thủ Công
```bash
# Tạo tokens cho tất cả roles
cd backend
npm run tokens
```

### Option 3: Swagger UI (Giao diện web)
1. Mở browser: `http://localhost:3000/api`
2. Nhấn nút "Authorize" (🔒)
3. Dán token (chỉ phần token, không kèm "Bearer ")
4. Test các endpoint


## 🎯 Test Cases Chi Tiết

### PowerShell Script Test (Khuyến nghị)
```powershell
# Chạy test tự động
cd backend
npm run rbac:test
```

### Test Thủ Công với PowerShell

#### 1. Setup Tokens
```powershell
# Tạo tokens
npm run tokens

# Copy và paste các dòng PowerShell quick set từ output
$admin = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
$manager = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
$partner = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 2. Test Cases

**Test 1: /auth/me (ADMIN)**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/auth/me" -Headers @{"Authorization"="Bearer $admin"} -Method GET
# Expected: 200 OK với user info
```

**Test 2: /reporting/health (MANAGER)**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/reporting/health" -Headers @{"Authorization"="Bearer $manager"} -Method GET
# Expected: 200 OK với {"status":"healthy",...}
```

**Test 3: /reporting/health (PARTNER) - Should Fail**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/reporting/health" -Headers @{"Authorization"="Bearer $partner"} -Method GET
# Expected: 403 Forbidden
```

**Test 4: /inventory/receive (PARTNER) - Should Fail**
```powershell
$body = @{productBatchId="123e4567-e89b-12d3-a456-426614174000"; locationId="123e4567-e89b-12d3-a456-426614174001"; quantity=10; createdById="123e4567-e89b-12d3-a456-426614174002"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/inventory/receive" -Headers @{"Authorization"="Bearer $partner"; "Content-Type"="application/json"} -Method POST -Body $body
# Expected: 403 Forbidden
```

**Test 5: /inventory/receive (ADMIN) - Should Pass**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/inventory/receive" -Headers @{"Authorization"="Bearer $admin"; "Content-Type"="application/json"} -Method POST -Body $body
# Expected: 200/201 hoặc 404 (thiếu data), nhưng KHÔNG phải 403
```

### Test với cURL (Linux/Mac)

**Test 1: ADMIN có thể nhận hàng**
```bash
curl -X POST http://localhost:3000/inventory/receive \
  -H "Authorization: Bearer [ADMIN_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"productBatchId": "123e4567-e89b-12d3-a456-426614174000", "locationId": "123e4567-e89b-12d3-a456-426614174001", "quantity": 10, "createdById": "123e4567-e89b-12d3-a456-426614174002"}'
# Expected: 200/201 hoặc 404 (thiếu data), nhưng KHÔNG phải 403
```

**Test 2: PARTNER không thể nhận hàng**
```bash
curl -X POST http://localhost:3000/inventory/receive \
  -H "Authorization: Bearer [PARTNER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"productBatchId": "123e4567-e89b-12d3-a456-426614174000", "locationId": "123e4567-e89b-12d3-a456-426614174001", "quantity": 10, "createdById": "123e4567-e89b-12d3-a456-426614174002"}'
# Expected: 403 Forbidden
```

**Test 3: MANAGER có thể xem reporting**
```bash
curl -X GET http://localhost:3000/reporting/health \
  -H "Authorization: Bearer [MANAGER_TOKEN]"
# Expected: 200 với response {"status": "healthy", "timestamp": "..."}
```

**Test 4: PARTNER không thể xem reporting**
```bash
curl -X GET http://localhost:3000/reporting/health \
  -H "Authorization: Bearer [PARTNER_TOKEN]"
# Expected: 403 Forbidden
```

## 🎯 Ma Trận Phân Quyền (RBAC Matrix)

### 📊 Bảng Phân Quyền Chi Tiết

| Module | Endpoint | ADMIN | MANAGER | WAREHOUSE_STAFF | PROCUREMENT | LOGISTICS | PARTNER |
|--------|----------|-------|---------|-----------------|-------------|-----------|---------|
| **Auth** | GET /auth/me | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auth** | POST /auth/login | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auth** | POST /auth/signup | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auth** | POST /auth/refresh | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Inventory** | POST /inventory/receive | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Inventory** | POST /inventory/dispatch | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Supplier** | GET /supplier | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Supplier** | POST /supplier | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Supplier** | PUT /supplier/:id | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Supplier** | DELETE /supplier/:id | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Order** | GET /order | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Order** | POST /order | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Order** | PUT /order/:id | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Reporting** | GET /reporting/health | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Reporting** | GET /reporting/inventory | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Reporting** | GET /reporting/orders | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

**Legend:**
- ✅ = **PASS** (200/201/404) - Role có quyền truy cập
- ❌ = **FAIL** (403) - Role bị chặn truy cập

### 📋 Tóm Tắt Quyền Theo Role

#### 🔴 ADMIN
- **Quyền**: Tất cả operations trên tất cả modules
- **Đặc điểm**: Super user, có thể truy cập mọi chức năng

#### 🟡 MANAGER  
- **Quyền**: Đọc tất cả, quản lý inventory, supplier, order, reporting
- **Hạn chế**: Không có quyền đặc biệt nào bị chặn

#### 🟢 WAREHOUSE_STAFF
- **Quyền**: Quản lý inventory (nhận/xuất hàng), đọc order, reporting
- **Hạn chế**: Không thể quản lý supplier

#### 🔵 PROCUREMENT
- **Quyền**: Quản lý supplier, đọc order, reporting
- **Hạn chế**: Không thể quản lý inventory

#### 🟠 LOGISTICS
- **Quyền**: Đọc order, reporting
- **Hạn chế**: Không thể quản lý inventory, supplier

#### 🟣 PARTNER
- **Quyền**: Chỉ đọc order
- **Hạn chế**: Không thể truy cập inventory, supplier, reporting

### ✅ PASS Cases (200/201/404):
- **ADMIN, MANAGER, WAREHOUSE_STAFF**: Inventory operations
- **ADMIN, MANAGER, PROCUREMENT**: Supplier operations  
- **ADMIN, MANAGER, WAREHOUSE_STAFF, LOGISTICS, PARTNER**: Order read
- **ADMIN, MANAGER, WAREHOUSE_STAFF, PROCUREMENT, LOGISTICS**: Reporting
- **Tất cả roles**: /auth/me

### ❌ FAIL Cases (403 Forbidden):
- **PARTNER**: Inventory operations
- **WAREHOUSE_STAFF, LOGISTICS, PARTNER**: Supplier operations
- **PARTNER**: Reporting operations

## 🛠️ Tools & Scripts

### Scripts có sẵn
```bash
# Tạo tokens cho tất cả roles
npm run tokens

# Chạy test RBAC tự động (5 test cases cơ bản)
npm run rbac:test

# Chạy test RBAC toàn diện (tất cả roles × tất cả endpoints)
npm run rbac:full

# Chạy backend
npm run start:dev
```

### Tools khác
- **Swagger UI**: `http://localhost:3000/api`
- **Postman**: Import collection hoặc tạo request mới
- **Thunder Client**: VS Code extension
- **cURL**: Command line tool

## 📋 Checklist Test

### ✅ Test nhanh (5 phút)
- [ ] `npm run rbac:test` chạy thành công
- [ ] ADMIN: /auth/me → 200
- [ ] MANAGER: /reporting/health → 200  
- [ ] PARTNER: /reporting/health → 403
- [ ] PARTNER: /inventory/receive → 403
- [ ] ADMIN: /inventory/receive → 200/404 (không phải 403)

### ✅ Comprehensive Test (15 phút)

#### Test Auth Module (All roles should PASS)
- [ ] ADMIN: /auth/me → 200
- [ ] MANAGER: /auth/me → 200
- [ ] WAREHOUSE_STAFF: /auth/me → 200
- [ ] PROCUREMENT: /auth/me → 200
- [ ] LOGISTICS: /auth/me → 200
- [ ] PARTNER: /auth/me → 200

#### Test Inventory Module
- [ ] ADMIN: /inventory/receive → 200/404 (not 403)
- [ ] MANAGER: /inventory/receive → 200/404 (not 403)
- [ ] WAREHOUSE_STAFF: /inventory/receive → 200/404 (not 403)
- [ ] PROCUREMENT: /inventory/receive → 403
- [ ] LOGISTICS: /inventory/receive → 403
- [ ] PARTNER: /inventory/receive → 403

#### Test Supplier Module
- [ ] ADMIN: /supplier → 200/404 (not 403)
- [ ] MANAGER: /supplier → 200/404 (not 403)
- [ ] WAREHOUSE_STAFF: /supplier → 403
- [ ] PROCUREMENT: /supplier → 200/404 (not 403)
- [ ] LOGISTICS: /supplier → 403
- [ ] PARTNER: /supplier → 403

#### Test Order Module
- [ ] ADMIN: /order → 200/404 (not 403)
- [ ] MANAGER: /order → 200/404 (not 403)
- [ ] WAREHOUSE_STAFF: /order → 200/404 (not 403)
- [ ] PROCUREMENT: /order → 200/404 (not 403)
- [ ] LOGISTICS: /order → 200/404 (not 403)
- [ ] PARTNER: /order → 200/404 (not 403)

#### Test Reporting Module
- [ ] ADMIN: /reporting/health → 200
- [ ] MANAGER: /reporting/health → 200
- [ ] WAREHOUSE_STAFF: /reporting/health → 200
- [ ] PROCUREMENT: /reporting/health → 200
- [ ] LOGISTICS: /reporting/health → 200
- [ ] PARTNER: /reporting/health → 403

### ✅ Test thủ công (10 phút)
- [ ] Swagger UI: `http://localhost:3000/api`
- [ ] Authorize với token ADMIN
- [ ] Test các endpoint với các role khác nhau
- [ ] Xác nhận 403 cho role không có quyền
- [ ] Xác nhận 200/404 cho role có quyền

## 📝 Troubleshooting

### Lỗi thường gặp
1. **401 Unauthorized**: Token hết hạn hoặc secret không khớp
   - Giải pháp: Chạy `npm run tokens` để tạo token mới

2. **EADDRINUSE**: Nhiều backend đang chạy
   - Giải pháp: `Get-Process -Name node | Stop-Process -Force`

3. **403 Forbidden**: RBAC hoạt động đúng (đây là kết quả mong đợi)

4. **404 Not Found**: Role có quyền nhưng thiếu dữ liệu (bình thường)

### Ghi chú quan trọng
- Backend chạy trên port 3000
- Tokens có thời hạn 1 giờ
- JWT secret mặc định: `dev-access-secret`
- Lỗi DB (UUID không tồn tại) là bình thường
- **403 = RBAC hoạt động đúng**
- **200/201 = RBAC cho phép truy cập đúng**
