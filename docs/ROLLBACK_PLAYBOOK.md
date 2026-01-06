# 🔄 ROLLBACK PLAYBOOK - Warehouse Management System

Hướng dẫn rollback khi xảy ra sự cố.

## 📋 Mục lục

- [Quick Reference - Quyết định nhanh](#quick-reference---quyết-định-nhanh)
- [1. Application Rollback (Slot Swap)](#1-application-rollback-slot-swap)
- [2. Docker Image Rollback](#2-docker-image-rollback)
- [3. Infrastructure Rollback (Terraform)](#3-infrastructure-rollback-terraform)
- [4. Database Rollback](#4-database-rollback)
- [5. Incident Response Checklist](#5-incident-response-checklist)
- [6. Post-Incident Review](#6-post-incident-review)

---

## Quick Reference - Quyết định nhanh

```
┌─────────────────────────────────────────────────────────────────┐
│                     🚨 SỰ CỐ XẢY RA!                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Loại sự cố là gì?             │
              └───────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
  ┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
  │ Lỗi ứng dụng │   │ Lỗi hạ tầng      │   │ Lỗi dữ liệu  │
  │ (bug, crash) │   │ (Terraform)      │   │ (database)   │
  └──────────────┘   └──────────────────┘   └──────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
  │ Slot Swap    │   │ terraform apply  │   │ PITR Restore │
  │ (< 1 phút)   │   │ (5-10 phút)      │   │ (10-30 phút) │
  └──────────────┘   └──────────────────┘   └──────────────┘
```

| Loại sự cố | Phương pháp | Thời gian | Xem mục |
|------------|-------------|-----------|---------|
| Bug trong code mới | Slot Swap | < 1 phút | [Mục 1](#1-application-rollback-slot-swap) |
| Cần version cụ thể | Docker Image Rollback | 5 phút | [Mục 2](#2-docker-image-rollback) |
| Cấu hình hạ tầng sai | Terraform Rollback | 10 phút | [Mục 3](#3-infrastructure-rollback-terraform) |
| Dữ liệu bị hỏng | Database PITR | 10-30 phút | [Mục 4](#4-database-rollback) |

---

## 1. Application Rollback (Slot Swap)

> ⚡ **Phương pháp nhanh nhất** - Chỉ mất < 1 phút

### Khi nào sử dụng?
- Deploy mới gây lỗi
- Bug được phát hiện ngay sau deploy
- Cần rollback khẩn cấp

### Nguyên lý
Production slot và Staging slot hoán đổi vị trí. Bản cũ (đang ở staging) trở thành production.

### Thực hiện

**Backend:**
```bash
az webapp deployment slot swap \
  --resource-group warehouse-mgmt-production-rg \
  --name warehouse-mgmt-production-backend \
  --slot staging \
  --target-slot production
```

**Frontend:**
```bash
az webapp deployment slot swap \
  --resource-group warehouse-mgmt-production-rg \
  --name warehouse-mgmt-production-frontend \
  --slot staging \
  --target-slot production
```

### Xác nhận rollback thành công

```bash
# Kiểm tra health
./iac/scripts/health-check.sh production

# Hoặc kiểm tra thủ công
curl -s https://warehouse-mgmt-production-backend.azurewebsites.net/health
```

### ⚠️ Lưu ý quan trọng
- Slot swap chỉ hoán đổi **app container**, không hoán đổi app settings
- Nếu vấn đề liên quan đến cấu hình → Xem [Mục 3](#3-infrastructure-rollback-terraform)
- Database migrations **không tự động rollback** → Xem [Mục 4](#4-database-rollback)

---

## 2. Docker Image Rollback

### Khi nào sử dụng?
- Cần deploy một version cụ thể trước đó
- Staging slot đã bị ghi đè bởi bản mới hơn
- Muốn rollback về một commit cụ thể

### Bước 1: Xem danh sách images có sẵn

```bash
# Truy cập GitHub Packages
# URL: https://github.com/orgs/SE214-Semicolon/packages

# Hoặc dùng Docker CLI (cần login trước)
docker pull ghcr.io/se214-semicolon/warehouse-and-supply-chain-management-system/backend:main-abc1234
```

### Bước 2: Deploy image cụ thể

**Qua Azure Portal:**
1. Mở Azure Portal → App Services → `warehouse-mgmt-production-backend`
2. Deployment Center → Container settings
3. Chọn Image tag cụ thể
4. Save và restart

**Qua Azure CLI:**
```bash
# Deploy backend với image tag cụ thể
az webapp config container set \
  --resource-group warehouse-mgmt-production-rg \
  --name warehouse-mgmt-production-backend \
  --docker-custom-image-name ghcr.io/se214-semicolon/warehouse-and-supply-chain-management-system/backend:main-abc1234

# Restart app
az webapp restart \
  --resource-group warehouse-mgmt-production-rg \
  --name warehouse-mgmt-production-backend
```

### Bước 3: Xác nhận

```bash
./iac/scripts/health-check.sh production
```

---

## 3. Infrastructure Rollback (Terraform)

### Khi nào sử dụng?
- Terraform apply gây lỗi cấu hình
- Cần khôi phục về state trước đó
- Resource bị misconfigure

### Option A: Rollback qua Git

```bash
# 1. Checkout phiên bản Terraform trước đó
git log --oneline iac/environments/production/
git checkout <commit-hash> -- iac/environments/production/

# 2. Apply lại
cd iac/environments/production
terraform init
terraform plan
terraform apply
```

### Option B: Rollback Terraform State

```bash
# 1. Xem lịch sử state versions
az storage blob list \
  --account-name warehouse1760289755 \
  --container-name tfstate \
  --query "[].{name:name, lastModified:properties.lastModified}" \
  --output table

# 2. Download state cũ
az storage blob download \
  --account-name warehouse1760289755 \
  --container-name tfstate \
  --name "production/terraform.tfstate.backup" \
  --file terraform.tfstate.old

# 3. Restore (CẨN THẬN - đọc state trước khi restore)
terraform state push terraform.tfstate.old
terraform apply
```

### ⚠️ Lưu ý
- **LUÔN** backup state hiện tại trước khi rollback
- Review `terraform plan` cẩn thận trước khi apply
- Một số resources không thể rollback (ví dụ: data đã xóa)

---

## 4. Database Rollback

### 4.1 PostgreSQL (Neon DB)

**Point-in-Time Restore:**

1. Truy cập [Neon Console](https://console.neon.tech)
2. Chọn Project → **Branches**
3. Click **Create Branch** → **From a point in time**
4. Chọn thời điểm cần khôi phục
5. Branch mới sẽ được tạo với dữ liệu tại thời điểm đó
6. Cập nhật `DATABASE_URL` trong App Settings:

```bash
az webapp config appsettings set \
  --resource-group warehouse-mgmt-production-rg \
  --name warehouse-mgmt-production-backend \
  --settings DATABASE_URL="postgresql://new-branch-connection-string"
```

7. Restart app:
```bash
az webapp restart \
  --resource-group warehouse-mgmt-production-rg \
  --name warehouse-mgmt-production-backend
```

### 4.2 MongoDB (Atlas)

**Point-in-Time Restore:**

1. Truy cập [MongoDB Atlas Console](https://cloud.mongodb.com)
2. Chọn Cluster → **Backup**
3. Click **Restore** → **Point in Time**
4. Chọn thời điểm
5. Chọn **Restore to this cluster** hoặc tạo cluster mới
6. Nếu cluster mới, cập nhật `MONGO_URL` tương tự PostgreSQL

### 4.3 Rollback Prisma Migrations

Nếu migration mới gây lỗi:

```bash
# Xem migration history
npx prisma migrate status

# Rollback migration (trong development)
# ⚠️ KHÔNG KHUYẾN KHÍCH cho production - dùng PITR thay thế
npx prisma migrate resolve --rolled-back <migration-name>
```

> [!CAUTION]
> Prisma không hỗ trợ `migrate down` cho production. Sử dụng PITR để rollback data.

---

## 5. Incident Response Checklist

### Khi phát hiện sự cố

- [ ] **Assess** - Đánh giá mức độ nghiêm trọng (P1/P2/P3)
- [ ] **Communicate** - Thông báo cho team
- [ ] **Contain** - Ngăn chặn thiệt hại lan rộng (rollback nếu cần)
- [ ] **Investigate** - Tìm nguyên nhân gốc
- [ ] **Resolve** - Khắc phục vấn đề
- [ ] **Document** - Ghi lại incident

### Mức độ nghiêm trọng

| Level | Mô tả | Response Time | Ví dụ |
|-------|-------|---------------|-------|
| P1 | Toàn bộ hệ thống down | < 15 phút | Backend không khởi động |
| P2 | Feature chính không hoạt động | < 1 giờ | Không thể tạo order |
| P3 | Minor issue | < 24 giờ | UI bug nhỏ |

### Template thông báo sự cố

```markdown
🚨 **INCIDENT ALERT**

**Thời gian phát hiện:** [YYYY-MM-DD HH:MM]
**Mức độ:** P1/P2/P3
**Mô tả:** [Mô tả ngắn gọn vấn đề]
**Ảnh hưởng:** [Users/features bị ảnh hưởng]
**Trạng thái:** Đang điều tra / Đang khắc phục / Đã giải quyết
**Người phụ trách:** [Tên]

**Cập nhật:**
- [HH:MM] Update 1
- [HH:MM] Update 2
```

---

## 6. Post-Incident Review

Sau khi sự cố được giải quyết, tiến hành review:

### Template Post-Mortem

```markdown
# Post-Incident Review

**Incident ID:** INC-YYYY-MM-DD-XXX
**Ngày xảy ra:** [Date]
**Thời gian phát hiện:** [Time]
**Thời gian khắc phục:** [Time]
**Downtime:** [Duration]

## Tóm tắt
[Mô tả ngắn gọn sự cố]

## Timeline
- [HH:MM] Sự cố bắt đầu
- [HH:MM] Phát hiện sự cố
- [HH:MM] Bắt đầu rollback
- [HH:MM] Hệ thống khôi phục

## Nguyên nhân gốc (Root Cause)
[Phân tích nguyên nhân]

## Giải pháp đã áp dụng
[Các bước đã thực hiện]

## Lessons Learned
- [Bài học 1]
- [Bài học 2]

## Action Items
- [ ] [Action 1] - Owner: [Name] - Deadline: [Date]
- [ ] [Action 2] - Owner: [Name] - Deadline: [Date]
```

### Checklist sau incident

- [ ] Tạo GitHub Issue để track root cause
- [ ] Cập nhật monitoring/alerting nếu cần
- [ ] Review và cập nhật runbook nếu phát hiện thiếu sót
- [ ] Share lessons learned với team
- [ ] Thêm test cases để ngăn tái diễn

---

## 📚 Tài liệu tham khảo

- [RUNBOOK.md](./RUNBOOK.md) - Hướng dẫn vận hành chính
- [MONITORING.md](./MONITORING.md) - Giám sát và cảnh báo
- [Azure App Service Deployment Slots](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)
- [Neon Branching](https://neon.tech/docs/introduction/branching)
- [MongoDB Atlas Backup](https://www.mongodb.com/docs/atlas/backup-restore-cluster/)
