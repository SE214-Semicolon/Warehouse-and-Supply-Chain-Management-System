import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

// Configuration imports
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';

// Core module imports
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

// Business module imports
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrderModule } from './modules/order/order.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { ProductModule } from './modules/product/product.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AlertsModule } from './modules/alerts/alerts.module';

// Controller and Service imports
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './common/controllers/health.controller';
import { AuditContextInterceptor } from './common/interceptors/audit-context.interceptor';

@Module({
  imports: [
    // Core configurations
    ConfigModule.forRoot({
      isGlobal: true,
      load: configuration,
      validationSchema,
    }),

    // Core modules
    DatabaseModule,
    AuthModule,
    UsersModule,

    // Feature Modules
    ProductModule,
    WarehouseModule,
    InventoryModule,
    AuditLogModule,
    AlertsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditContextInterceptor,
    },
  ],
})
export class AppModule {}
