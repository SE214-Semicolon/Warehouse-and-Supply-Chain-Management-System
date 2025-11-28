# Monitoring & Observability Guide

Hướng dẫn cấu hình và sử dụng hệ thống monitoring với **Azure Managed Grafana** và **Azure Monitor Workspace (Prometheus)**.

## 📋 Mục lục

- [Tổng quan kiến trúc](#tổng-quan-kiến-trúc)
- [Metrics được thu thập](#metrics-được-thu-thập)
- [Cấu hình GitHub Secrets](#cấu-hình-github-secrets)
- [Cấu hình Terraform Variables](#cấu-hình-terraform-variables)
- [Truy cập Grafana Dashboard](#truy-cập-grafana-dashboard)
- [Tạo Dashboard trong Grafana](#tạo-dashboard-trong-grafana)
- [Alerting](#alerting)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                         Azure Cloud                              │
│  ┌──────────────┐    ┌─────────────────────┐    ┌─────────────┐ │
│  │   Backend    │───▶│  Azure Monitor      │───▶│   Azure     │ │
│  │   NestJS     │    │  Workspace          │    │   Managed   │ │
│  │  /metrics    │    │  (Prometheus)       │    │   Grafana   │ │
│  └──────────────┘    └─────────────────────┘    └─────────────┘ │
│         │                                              │         │
│         │            ┌─────────────────────┐           │         │
│         └───────────▶│  Application        │───────────┘         │
│                      │  Insights           │                     │
│                      └─────────────────────┘                     │
│                                                                  │
│                      ┌─────────────────────┐                     │
│                      │  Log Analytics      │                     │
│                      │  Workspace          │                     │
│                      └─────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Metrics được thu thập

### Phân chia trách nhiệm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DEVOPS / SRE SCOPE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✅ Setup infrastructure (Prometheus, Grafana, Azure Monitor)               │
│  ✅ Configure alerting rules                                                 │
│  ✅ Monitor infrastructure metrics (CPU, Memory, Disk)                       │
│  ✅ Monitor application health (HTTP 5xx, latency, uptime)                   │
│  ✅ Setup dashboards cho SLA/SLO                                             │
│  ❌ KHÔNG viết business logic                                                │
│  ❌ KHÔNG quyết định track metrics nào của business                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND DEV SCOPE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✅ Quyết định cần track business metrics nào (orders, inventory...)        │
│  ✅ Implement business metrics vào code                                      │
│  ❌ KHÔNG setup Prometheus/Grafana infrastructure                            │
│  ❌ KHÔNG quản lý alerting infrastructure                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Metrics hiện tại (DevOps scope - Tự động thu thập)

| Metric | Type | Description | Auto |
|--------|------|-------------|------|
| `http_requests_total` | Counter | Tổng số HTTP requests | ✅ |
| `http_request_duration_seconds` | Histogram | Thời gian xử lý request | ✅ |
| `process_cpu_seconds_total` | Counter | CPU time | ✅ |
| `process_resident_memory_bytes` | Gauge | Memory usage | ✅ |
| `nodejs_eventloop_lag_seconds` | Gauge | Event loop lag | ✅ |
| `nodejs_heap_size_*` | Gauge | Heap memory | ✅ |
| `nodejs_active_resources_total` | Gauge | Active handles | ✅ |

### Business Metrics (Backend scope - Optional)

Nếu Backend dev muốn thêm business metrics, có thể uncomment trong `metrics.module.ts`:

```typescript
// src/common/metrics/metrics.module.ts

const businessMetricsProviders = [
  // Uncomment nếu cần track orders
  makeCounterProvider({
    name: 'orders_total',
    help: 'Total number of orders created',
    labelNames: ['status', 'warehouse'],
  }),
  // ... more business metrics
];
```

### 1. HTTP Request Metrics (Tự động thu thập ✅)

| Metric | Type | Labels | Mô tả |
|--------|------|--------|-------|
| `http_requests_total` | Counter | `method`, `path`, `status_code` | Tổng số HTTP requests |
| `http_request_duration_seconds` | Histogram | `method`, `path`, `status_code` | Thời gian xử lý request (seconds) |

**Ví dụ queries:**
```promql
# Request rate per second
rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

### 2. Business Metrics

| Metric | Type | Labels | Mô tả |
|--------|------|--------|-------|
| `orders_total` | Counter | `status`, `warehouse` | Tổng số orders được tạo |
| `inventory_movements_total` | Counter | `type`, `warehouse`, `product` | Số lần di chuyển inventory |
| `inventory_stock_level` | Gauge | `warehouse`, `product` | Mức stock hiện tại |
| `active_alerts_count` | Gauge | `severity`, `type` | Số alerts đang active |

**Ví dụ queries:**
```promql
# Orders per hour
increase(orders_total[1h])

# Low stock alerts
active_alerts_count{type="low_stock"}

# Inventory movements by type
sum by (type) (rate(inventory_movements_total[1h]))
```

### 3. Database Metrics

| Metric | Type | Labels | Mô tả |
|--------|------|--------|-------|
| `database_query_duration_seconds` | Histogram | `operation`, `table` | Thời gian query database |

**Ví dụ queries:**
```promql
# Slow queries (> 100ms)
histogram_quantile(0.99, rate(database_query_duration_seconds_bucket[5m])) > 0.1

# Query rate by table
sum by (table) (rate(database_query_duration_seconds_count[5m]))
```

### 4. Node.js Runtime Metrics (Auto-collected)

| Metric | Mô tả |
|--------|-------|
| `process_cpu_user_seconds_total` | CPU time used |
| `process_resident_memory_bytes` | Memory usage |
| `nodejs_eventloop_lag_seconds` | Event loop lag |
| `nodejs_active_resources` | Active handles/requests |
| `nodejs_heap_size_total_bytes` | Heap memory |

---

## 🔐 Cấu hình GitHub Secrets

Vào **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**

### Secrets bắt buộc cho Monitoring

| Secret Name | Mô tả | Ví dụ |
|-------------|-------|-------|
| `ENABLE_PROMETHEUS_STAGING` | Bật Prometheus cho staging | `true` hoặc `false` |
| `ENABLE_GRAFANA_STAGING` | Bật Grafana cho staging | `true` hoặc `false` |
| `ENABLE_PROMETHEUS_PRODUCTION` | Bật Prometheus cho production | `true` |
| `ENABLE_GRAFANA_PRODUCTION` | Bật Grafana cho production | `true` |
| `GRAFANA_ADMIN_OBJECT_IDS` | Azure AD Object IDs của Grafana admins | `["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"]` |

### Cách lấy Azure AD Object ID

```bash
# Object ID của user đang login
az ad signed-in-user show --query id -o tsv

# Object ID của user khác (theo email)
az ad user show --id "user@domain.com" --query id -o tsv

# Object ID của group
az ad group show --group "Group Name" --query id -o tsv
```

### Secrets đã có sẵn (cho reference)

| Secret Name | Mô tả |
|-------------|-------|
| `AZURE_CLIENT_ID` | Service Principal Client ID |
| `AZURE_CLIENT_SECRET` | Service Principal Secret |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID |
| `AZURE_TENANT_ID` | Azure AD Tenant ID |
| `AZURE_CREDENTIALS` | Full Azure credentials JSON |
| `ALERT_EMAIL_1` | Email nhận alerts |

---

## ⚙️ Cấu hình Terraform Variables

### Staging (`iac/environments/staging/variables.tf`)

```hcl
variable "enable_prometheus" {
  default = false  # Set true để bật
}

variable "enable_grafana" {
  default = false  # Set true để bật
}

variable "grafana_admin_object_ids" {
  default = []  # Thêm Azure AD Object IDs
}
```

### Production (`iac/environments/production/variables.tf`)

```hcl
variable "enable_prometheus" {
  default = true  # Mặc định bật cho production
}

variable "enable_grafana" {
  default = true  # Mặc định bật cho production
}

variable "grafana_admin_object_ids" {
  default = []
}
```

### Module Monitoring Options

| Variable | Default | Mô tả |
|----------|---------|-------|
| `enable_prometheus` | `false` | Bật Azure Monitor Workspace |
| `enable_grafana` | `false` | Bật Azure Managed Grafana |
| `grafana_major_version` | `"10"` | Version Grafana (9 hoặc 10) |
| `grafana_sku` | `"Standard"` | SKU (Standard hoặc Essential) |
| `grafana_zone_redundancy` | `false` | Zone redundancy (production nên bật) |
| `grafana_public_network_access` | `true` | Cho phép public access |
| `grafana_subscription_reader` | `false` | Grafana có thể đọc toàn subscription |
| `grafana_admin_object_ids` | `[]` | List Azure AD Object IDs làm admin |

---

## 🖥️ Truy cập Grafana Dashboard

### 1. Ai có thể truy cập Grafana?

**⚠️ Mặc định: Chỉ người trong Azure AD tenant + có Grafana role**

| Role | Quyền | Cách assign |
|------|-------|-------------|
| **Grafana Admin** | Full access, quản lý users, data sources | Thêm Object ID vào `grafana_admin_object_ids` |
| **Grafana Editor** | Tạo/edit dashboards | Azure Portal → IAM |
| **Grafana Viewer** | Chỉ xem dashboards | Azure Portal → IAM |

### 2. Kiểm tra ai có quyền xem Grafana

```bash
# Liệt kê role assignments
az role assignment list \
  --scope "/subscriptions/<sub-id>/resourceGroups/warehouse-mgmt-production-rg/providers/Microsoft.Dashboard/grafana/warehouse-mgmt-production-grafana" \
  --output table
```

### 3. Thêm người dùng mới vào Grafana

**Cách 1: Qua Terraform** (chỉ cho Admin role)
```hcl
# Thêm Object ID vào GitHub Secret
GRAFANA_ADMIN_OBJECT_IDS=["id1", "id2", "id3"]
```

**Cách 2: Qua Azure Portal**
1. Vào **Resource Group** → **Grafana resource**
2. **Access control (IAM)** → **Add role assignment**
3. Chọn role: `Grafana Admin`, `Grafana Editor`, hoặc `Grafana Viewer`
4. Chọn user/group

### 4. Người ngoài tổ chức có xem được không?

❌ **KHÔNG** - Azure Managed Grafana yêu cầu Azure AD authentication

Nếu muốn share cho người ngoài:
- Thêm họ như **Guest user** trong Azure AD
- Assign Grafana Viewer role

### 5. Sau khi deploy xong

Terraform sẽ output URL của Grafana:

```bash
# Xem outputs
cd iac/environments/production
terraform output grafana_endpoint
```

### 2. Truy cập qua Azure Portal

1. Vào [Azure Portal](https://portal.azure.com)
2. Tìm **Resource Group**: `warehouse-mgmt-production-rg`
3. Chọn resource type **Azure Managed Grafana**
4. Click **Endpoint** để mở Grafana

### 3. Đăng nhập

- Sử dụng **Azure AD account** 
- Cần có role **Grafana Admin** hoặc **Grafana Viewer**

---

## 📈 Tạo Dashboard trong Grafana

### ⚠️ Dashboard chưa được tạo tự động!

Terraform chỉ tạo **Grafana instance** và **data sources**. Dashboard phải import thủ công.

### 1. Import Dashboard có sẵn của dự án

File dashboard: `iac/modules/monitoring/dashboards/warehouse-infra.json`

**Cách import:**
1. Mở Grafana (URL từ Azure Portal)
2. **Dashboards** → **New** → **Import**
3. Upload file `warehouse-infra.json` hoặc paste nội dung
4. Chọn data source **Azure Monitor**
5. Click **Import**

### 2. Dashboard bao gồm những gì?

| Section | Panels |
|---------|--------|
| **Overview** | Request Rate, Response Time P95, Error Rate, Total Requests |
| **HTTP Metrics** | Request Rate by Endpoint, Response Time Percentiles |
| **Status Codes** | Requests by Status Code, Errors by Endpoint |
| **Node.js Runtime** | CPU Usage, Memory Usage, Event Loop Lag |
| **Resources** | Active Resources, File Descriptors |

### 3. Import Dashboard từ Grafana.com

Một số dashboard IDs hữu ích từ Grafana.com:

| Dashboard | ID | Mô tả |
|-----------|-----|-------|
| Node.js Application | `11159` | Node.js metrics |
| Prometheus Stats | `3662` | Prometheus overview |
| Request Handling | `10915` | HTTP request metrics |

**Cách import:**
1. Grafana → **Dashboards** → **Import**
2. Nhập Dashboard ID
3. Chọn data source **Azure Monitor**

### 4. Data Sources đã được cấu hình sẵn

✅ **Azure Monitor** - Prometheus metrics từ Azure Monitor Workspace  
✅ **Azure Monitor Logs** - Log Analytics queries  
✅ **Application Insights** - App Insights metrics

### 5. Tạo Dashboard tùy chỉnh

**Panel 1: Request Rate**
```promql
sum(rate(http_requests_total[5m])) by (path)
```

**Panel 2: Response Time P95**
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path))
```

**Panel 3: Error Rate**
```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

**Panel 4: Active Stock Alerts**
```promql
active_alerts_count{type="low_stock"}
```

---

## 🔔 Alerting

### Azure Monitor Alerts (Terraform managed)

Đã cấu hình sẵn trong Terraform:
- CPU usage > 80%
- Memory usage > 80%
- Response time > 5s
- PostgreSQL CPU > 80%
- Cosmos DB RU consumption > 80%

### Grafana Alerts

1. Vào Dashboard → Panel → **Edit**
2. Tab **Alert** → **Create alert rule**
3. Cấu hình conditions và notifications

**Ví dụ alert rule:**
```yaml
Alert: High Error Rate
Condition: sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
For: 5m
Severity: Critical
```

---

## 🔧 Troubleshooting

### 1. Metrics endpoint không hoạt động

```bash
# Kiểm tra endpoint
curl http://localhost:3000/metrics

# Kiểm tra logs
docker logs <backend-container>
```

### 2. Grafana không nhận metrics

1. Kiểm tra Data Source configuration
2. Verify Azure Monitor Workspace ID
3. Check role assignments:
   ```bash
   az role assignment list --assignee <grafana-principal-id>
   ```

### 3. Không truy cập được Grafana

1. Kiểm tra bạn có trong `grafana_admin_object_ids`
2. Hoặc được assign role Grafana Viewer/Admin trên Azure Portal:
   - Resource → **Access control (IAM)** → **Add role assignment**

### 4. Terraform errors

```bash
# Validate config
terraform validate

# Check state
terraform state list | grep -E "(grafana|prometheus)"

# Force refresh
terraform refresh
```

---

## 💰 Chi phí ước tính

| Resource | SKU | Estimated Cost/Month |
|----------|-----|---------------------|
| Azure Managed Grafana | Standard | ~$50-100 |
| Azure Monitor Workspace | Pay-as-you-go | ~$0.30/GB ingested |
| Log Analytics | Pay-as-you-go | ~$2.76/GB |
| Application Insights | Pay-as-you-go | ~$2.30/GB |

**Tips tiết kiệm:**
- Staging: Dùng `grafana_sku = "Essential"` (~$10/month)
- Giảm `log_analytics_retention_days` 
- Disable Prometheus/Grafana cho staging nếu không cần

---

## 📚 Tài liệu tham khảo

- [Azure Managed Grafana Documentation](https://learn.microsoft.com/en-us/azure/managed-grafana/)
- [Azure Monitor Workspace (Prometheus)](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/prometheus-metrics-overview)
- [Prometheus Query Language (PromQL)](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [NestJS Prometheus Module](https://github.com/willsoto/nestjs-prometheus)
- [prom-client Library](https://github.com/siimon/prom-client)
