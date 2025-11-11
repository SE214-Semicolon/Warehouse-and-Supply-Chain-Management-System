# 🧭 RUNBOOK - Warehouse Management System

## 1. Triển khai hệ thống (Deployment)

### 1.1 Mô hình tổng quan
Hệ thống Warehouse Management System được triển khai trên nền tảng **Azure Cloud**, bao gồm:
- **Frontend**: Ứng dụng React, chạy trên **Azure App Service**
- **Backend**: API NestJS (Node.js 16 LTS), chạy trên **Azure App Service**
- **Database**: PostgreSQL (Neon DB) và MongoDB (Azure Cosmos DB)
- **Hạ tầng** được quản lý bằng **Terraform** (IaC), triển khai qua **GitHub Actions**

Cấu trúc thư mục hạ tầng nằm tại `./iac/`, gồm:
```
iac/
├── modules/
│   ├── app-service/
│   ├── database/
│   ├── monitoring/
│   └── networking/
├── environments/
│   ├── production/
│   └── staging/
└── scripts/
```

---

### 1.2 Quy trình triển khai thủ công (Terraform)

**Điều kiện tiên quyết:**
- Đã cài đặt Terraform >= 1.5
- Có quyền truy cập Azure CLI và tài khoản có quyền Contributor
- Biến môi trường `ARM_SUBSCRIPTION_ID`, `ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_TENANT_ID` được cấu hình

**Các bước triển khai:**

```bash
# 1. Đăng nhập vào Azure
az login

# 2. Di chuyển đến thư mục môi trường (ví dụ: staging)
cd iac/environments/staging

# 3. Khởi tạo Terraform
terraform init

# 4. Kiểm tra kế hoạch triển khai
terraform plan -out=tfplan

# 5. Áp dụng cấu hình
terraform apply "tfplan"
```

**Kết quả mong đợi:**
- Tạo đầy đủ các tài nguyên: App Service, Database, VNet, Monitoring, Key Vault.
- Tên tài nguyên tuân theo quy tắc `{project}-{env}-{resource-type}`  
  Ví dụ: `warehouse-mgmt-production-postgres`

---

### 1.3 Quy trình CI/CD tự động (GitHub Actions)

**Pipeline chính:** `.github/workflows/deploy.yml`

**Mô tả luồng hoạt động:**
1. Khi có commit lên nhánh `main` hoặc `staging`, workflow tự động kích hoạt.
2. Chạy các bước:
   - Kiểm tra cú pháp và cài đặt dependencies.
   - Build frontend và backend.
   - Deploy bằng Terraform đến Azure tương ứng (staging hoặc production).
3. Lưu trạng thái Terraform trong **Azure Storage Account** để quản lý version.

**Các secrets cần thiết trong GitHub:**
- `AZURE_CREDENTIALS`
- `ARM_SUBSCRIPTION_ID`
- `ARM_CLIENT_ID`
- `ARM_CLIENT_SECRET`
- `ARM_TENANT_ID`

---

### 1.4 Biến môi trường & Secrets quan trọng

```markdown
- APP_VERSION: Phiên bản ứng dụng (ví dụ 1.0.0)
- NODE_ENV: staging/production
- PORT: Cổng chạy backend (3000)
- FRONTEND_URL: URL của ứng dụng React
- DB_HOST, DB_PORT, DB_NAME: Thông tin PostgreSQL
- MONGODB_URI: Chuỗi kết nối Cosmos DB
```

---

## 2. Giám sát & Theo dõi (Monitoring)

### 2.1 Công cụ giám sát
Hệ thống sử dụng **Azure Application Insights** để theo dõi hiệu năng và lỗi.  
Các chỉ số quan trọng:
- **Thời gian phản hồi (Response Time)**: < 500ms
- **Tỷ lệ lỗi (Error Rate)**: < 1%
- **CPU**: < 80%
- **Memory**: < 85%

---

### 2.2 Xem log & truy vết lỗi
- Mở Azure Portal → Application Insights → Logs  
- Truy vấn log bằng **Kusto Query Language (KQL)**.  
Ví dụ:
```kql
requests
| where success == false
| sort by timestamp desc
| take 20
```

**Backend logs:**
- Có thể truy cập trong tab **Log Stream** của Azure App Service backend.  
- Hoặc xem bằng lệnh:
```bash
az webapp log tail --name warehouse-mgmt-production-backend --resource-group warehouse-mgmt-production-rg
```

---

### 2.3 Cảnh báo và hành động khắc phục
**Ngưỡng cảnh báo (Alert Rules):**
- P95 latency > 1s  
- Error rate > 5%  
- CPU > 80% trong 10 phút liên tục  
- Kết nối database vượt 80% giới hạn

**Hành động khắc phục cơ bản:**
1. Kiểm tra log để xác định lỗi.  
2. Nếu do lỗi ứng dụng → rollback tạm thời bằng bản build trước (qua Azure App Service).  
3. Nếu do hạ tầng → scale-out tạm thời App Service.  
4. Gửi báo cáo sự cố lên GitHub issue của dự án.

---

## 3. Sao lưu & Phục hồi (Backup)

### 3.1 Cấu hình sao lưu
**Neon DB:**
- Neon tự động sao lưu dữ liệu thông qua cơ chế Point-in-Time Restore (PITR).
- Dữ liệu được lưu trữ an toàn trên hạ tầng lưu trữ phi trạng thái (serverless storage).
- Không cần cấu hình thủ công, nhưng có thể xem và quản lý branch (nhánh dữ liệu) trong trang quản trị Neon.
- Có thể tạo branch thủ công định kỳ (ví dụ hằng ngày) để mô phỏng bản sao lưu, giữ tối đa 7 bản gần nhất.

**Cosmos DB:**
- Đã bật **Continuous Backup**, có thể phục hồi đến bất kỳ thời điểm trong 30 ngày.  

**Terraform State:**
- Lưu trong Azure Storage Container (`tfstate`), có versioning bật.

---

### 3.2 Phục hồi dữ liệu
**Neon DB:**
- Dùng tính năng "Branch from point in time" trong giao diện quản trị Neon để phục hồi về thời điểm mong muốn.
- Sau khi tạo branch phục hồi, cập nhật lại connection string trong ứng dụng hoặc Key Vault / file cấu hình để trỏ tới branch mới (nếu chạy server mới).

**Cosmos DB:**
- Vào Data Restore → chọn container → chọn thời gian cần khôi phục.  

---

## 4. Nhiệm vụ định kỳ (Routine Tasks)

### 4.1 Hàng ngày
- Kiểm tra logs lỗi trong Application Insights.  
- Đảm bảo các service hoạt động bình thường (App Service, DB).  
- Kiểm tra dung lượng đĩa PostgreSQL.

### 4.2 Hàng tuần
- Xem báo cáo hiệu năng hệ thống (CPU, Memory).  
- Kiểm tra cấu hình alert có hoạt động đúng không.  
- Đảm bảo Terraform state và backup được cập nhật.

### 4.3 Hàng tháng
- Kiểm tra lại quyền truy cập (RBAC, Managed Identity).  
- Cập nhật phiên bản Node.js, package dependencies.  
- Đánh giá chi phí vận hành Azure và tối ưu tài nguyên.

---

## 5. Phụ lục

### 5.1 Liên hệ và vai trò
| Vai trò | Người phụ trách | Ghi chú |
|----------|----------------|---------|
| DevOps Engineer | Sinh viên phụ trách hạ tầng | Quản lý Terraform, CI/CD |
| Backend Lead | Thành viên backend | Giám sát API, log |
| Frontend Lead | Thành viên frontend | Triển khai giao diện |
| Giảng viên | Người hướng dẫn đồ án | Giám sát & đánh giá |
