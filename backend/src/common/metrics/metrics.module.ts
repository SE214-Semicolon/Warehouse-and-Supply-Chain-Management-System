import { Module } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';

/**
 * Metrics Module
 *
 * DevOps scope: Infrastructure & Application metrics (auto-collected)
 * Backend scope: Business metrics (manually implemented if needed)
 *
 * Để thêm business metrics, backend dev có thể:
 * 1. Thêm provider vào businessMetricsProviders
 * 2. Tạo MetricsService để inject
 * 3. Gọi trong business logic
 */

// ==========================================
// DEVOPS SCOPE - Auto-collected metrics
// ==========================================
const infrastructureMetricsProviders = [
  // HTTP Request metrics - auto-collected by MetricsInterceptor
  makeCounterProvider({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status_code'],
  }),
  makeHistogramProvider({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'path', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  }),
];

// ==========================================
// BACKEND SCOPE - Business metrics (optional)
// Backend dev có thể uncomment và implement nếu cần
// ==========================================
const businessMetricsProviders = [
  // Uncomment nếu cần track orders
  // makeCounterProvider({
  //   name: 'orders_total',
  //   help: 'Total number of orders created',
  //   labelNames: ['status', 'warehouse'],
  // }),

  // Uncomment nếu cần track inventory
  // makeCounterProvider({
  //   name: 'inventory_movements_total',
  //   help: 'Total inventory movements',
  //   labelNames: ['type', 'warehouse', 'product'],
  // }),

  // Uncomment nếu cần track stock levels
  // makeGaugeProvider({
  //   name: 'inventory_stock_level',
  //   help: 'Current stock level by product and warehouse',
  //   labelNames: ['warehouse', 'product'],
  // }),

  // Uncomment nếu cần track alerts
  // makeGaugeProvider({
  //   name: 'active_alerts_count',
  //   help: 'Number of active alerts',
  //   labelNames: ['severity', 'type'],
  // }),

  // Uncomment nếu cần track DB performance
  // makeHistogramProvider({
  //   name: 'database_query_duration_seconds',
  //   help: 'Duration of database queries in seconds',
  //   labelNames: ['operation', 'table'],
  //   buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  // }),
];

@Module({
  providers: [...infrastructureMetricsProviders, ...businessMetricsProviders],
  exports: [...infrastructureMetricsProviders, ...businessMetricsProviders],
})
export class MetricsModule {}
