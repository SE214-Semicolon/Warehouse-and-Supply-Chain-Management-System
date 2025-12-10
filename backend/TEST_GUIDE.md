# Hướng dẫn chạy test cho backend

## 1. Cấu trúc thư mục test hiện tại

Các file test được chia theo module và loại test:

```
backend/src/modules/<module>/tests/
  integration-test/
  sanity-test/
  smoke-test/
  unit-test/
```
Ví dụ:
- backend/src/modules/order/tests/integration-test/sales-order.integration.spec.ts
- backend/src/modules/inventory/tests/inventory.integration.spec.ts

## 2. Cách chạy test cho từng module/loại test

### Chạy toàn bộ test
```sh
npx jest
```

### Chạy test cho một module cụ thể
```sh
npx jest src/modules/order/tests
npx jest src/modules/inventory/tests
npx jest src/modules/product/tests
npx jest src/modules/warehouse/test
npx jest src/modules/supplier/tests
```

### Chạy test cho từng loại test
```sh
npx jest src/modules/order/tests/unit-test
npx jest src/modules/order/tests/integration-test
npx jest src/modules/order/tests/sanity-test
npx jest src/modules/order/tests/smoke-test
```

### Chạy một file test cụ thể
```sh
npx jest src/modules/order/tests/integration-test/sales-order.integration.spec.ts
```

## 3. Nếu gom tất cả test vào một folder chung

Giả sử bạn chuyển tất cả test về một thư mục chung như sau:
```
backend/tests/
  integration/
  unit/
  smoke/
  sanity/
```

### Chạy toàn bộ test
```sh
npx jest tests
```

### Chạy từng loại test
```sh
npx jest tests/integration
npx jest tests/unit
npx jest tests/sanity
npx jest tests/smoke
```

### Chạy một file test cụ thể
```sh
npx jest tests/integration/sales-order.integration.spec.ts
```

## 4. Lưu ý chung
- Đảm bảo đã cài đặt dependencies: `npm install`
- Đảm bảo database test đã migrate và có dữ liệu cần thiết
- Nếu test cần biến môi trường, kiểm tra file `.env.test` hoặc set biến môi trường phù hợp
- Nếu dùng PowerShell, có thể cần set biến môi trường như sau:
  ```sh
  $env:NODE_ENV="test"; npx jest
  ```
- Nếu gặp lỗi, kiểm tra log và gửi lại để được hỗ trợ fix

---
**Bạn có thể copy các lệnh trên vào terminal để chạy test theo nhu cầu.**
