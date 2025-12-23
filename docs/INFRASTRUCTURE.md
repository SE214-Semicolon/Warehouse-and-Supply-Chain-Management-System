**Infrastructure Overview**

- **Purpose**: Tài liệu này mô tả hạ tầng cho ứng dụng Warehouse-and-Supply-Chain-Management-System: cách deploy, CI/CD, cơ sở dữ liệu, observability và runbook liên quan.

**Deployment Topology**

- **Hosting**: Ứng dụng được đóng gói thành container (frontend + backend) và deploy lên Azure (App Service). Các image được build bởi GitHub Actions và push lên registry Docker.
- **Images & Compose**: Thư mục gốc chứa `docker-compose.yml` và các Dockerfile production: [backend/Dockerfile.prod](backend/Dockerfile.prod), [frontend/Dockerfile.prod](frontend/Dockerfile.prod).
- **Reverse proxy**: `nginx.conf` (root) và `frontend/nginx.conf` chứa cấu hình reverse proxy/serve static.

**CI/CD & Infrastructure as Code**

- **CI**: GitHub repository → GitHub Actions: pipelines build, test, và push Docker images.
- **CD / Infra as Code**: Một repository IaC sử dụng Terraform để quản lý tài nguyên Azure; có pipeline GitHub Actions tách biệt để deploy thay đổi hạ tầng (apply Terraform). Tham khảo thư mục `iac/` và file `iac/README.md` để biết chi tiết cấu trúc và scripts.

**Datastores**

- **Neon DB (Postgres compatible)**: Dùng làm primary relational DB cho app (kết nối từ backend).
- **MongoDB Atlas**: Dùng cho một số dữ liệu phi cấu trúc / audit/ trợ giúp phân tích. Thông tin kết nối được quản lý qua secrets trong môi trường triển khai.

**Monitoring & Observability**

- **Azure Managed Grafana**: Ứng dụng được monitor bằng Azure Managed Grafana. Dashboard và Monitor UI đã được cấu hình trong Grafana để hiển thị metrics và logs từ service.
- **Monitor UI**: UI để quan sát hệ thống (dashboards, panels, alerting) được set up trong Grafana — bao gồm dashboards cho frontend và backend.
- **Alerting**: Alerts cấu hình trong Grafana (hoặc Azure Monitor) gửi tới kênh vận hành (email/Teams/Slack) — runbook/troubleshooting tương ứng được link tới trong alert descriptions.

**Healthchecks & Runtime Checks**

- **Health endpoint**: Backend có healthcheck; xem [backend/healthcheck.js](backend/healthcheck.js) và `src/main.ts` để biết endpoint health.
- **Startup & liveness**: Dockerfile và container entrypoint scripts (`backend/docker-entrypoint.sh`) đảm bảo precheck trước khi service nhận traffic.

**Runbooks & Operational Playbooks**

- **Runbook location**: Xem [docs/RUNBOOK.md](docs/RUNBOOK.md) để biết các playbook thao tác vận hành (rollback, restore DB, khôi phục service, xử lý alert phổ biến).
- **Scripts & helpers**: Thư mục `iac/scripts/` chứa shell scripts hỗ trợ deploy, kiểm thử hạ tầng và khôi phục secrets; repo backend có `scripts/` cho migrate DB, khởi tạo, và kiểm tra chất lượng (ví dụ `scripts/run-migrations.sh`).

**Important Files & Where to Look**

- **CI/CD pipeline**: kiểm tra workflow trong `.github/workflows/` của repo (GitHub Actions).
- **Docker / Compose**: [docker-compose.yml](docker-compose.yml), [backend/Dockerfile.prod](backend/Dockerfile.prod), [frontend/Dockerfile.prod](frontend/Dockerfile.prod).
- **IaC**: [iac/README.md](iac/README.md) và `iac/environments/` cho cấu hình staging/production.
- **Architecture doc**: Xem [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) để hiểu kiến trúc logic ứng dụng.

**Operational Notes & Troubleshooting (tóm tắt)**

- Khi alert Grafana bật: theo runbook trong [docs/RUNBOOK.md](docs/RUNBOOK.md). Nếu DB unavailable: kiểm tra connection string và trạng thái Neon/Mongo Atlas.
- Nếu container không khởi động: kiểm tra logs container, healthcheck URL, và `docker-entrypoint.sh` trong `backend/`.
- Đổi cấu hình hạ tầng: chỉnh Terraform trong `iac/` và thực hiện PR vào repo IaC; pipeline GitHub Actions sẽ apply nếu PR merge.


