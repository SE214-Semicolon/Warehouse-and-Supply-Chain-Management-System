import { Module } from '@nestjs/common';

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

// Controller and Service imports
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './common/controllers/health.controller';

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

    // Business modules
    InventoryModule,
    ProductModule,
    WarehouseModule,
    OrderModule,
    SupplierModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
