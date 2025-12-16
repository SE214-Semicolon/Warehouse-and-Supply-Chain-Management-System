import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

// Configuration imports
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';

// Prometheus metrics
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

// Core module imports
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

// Business module imports
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProductModule } from './modules/product/product.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { SupplierModule } from './modules/procurement/supplier/supplier.module';
import { PurchaseOrderModule } from './modules/procurement/purchase-order/purchase-order.module';
import { SalesOrderModule } from './modules/sales/sales-order/sales-order.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { DemandPlanningModule } from './modules/demand-planning/demand-planning.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { ShipmentModule } from './modules/shipment/shipment.module';

// Controller and Service imports
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './common/controllers/health.controller';
import { AuditContextInterceptor } from './common/interceptors/audit-context.interceptor';
import { MetricsModule, MetricsInterceptor } from './common/metrics';

@Module({
  imports: [
    // Core configurations
    ConfigModule.forRoot({
      isGlobal: true,
      load: configuration,
      validationSchema,
    }),

    // Prometheus metrics - exposes /metrics endpoint
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),

    // Custom metrics module
    MetricsModule,

    // Core modules
    DatabaseModule,
    AuthModule,
    UsersModule,

    // Feature Modules
    ProductModule,
    WarehouseModule,
    InventoryModule,
    SupplierModule,
    PurchaseOrderModule,
    SalesOrderModule,
    AuditLogModule,
    AlertsModule,
    DemandPlanningModule,
    ReportingModule,
    ShipmentModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
