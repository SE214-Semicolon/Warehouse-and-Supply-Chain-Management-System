import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { CacheModule } from '../../cache/cache.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductModule } from '../product/product.module';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { DemandPlanningModule } from '../demand-planning/demand-planning.module';

// Controllers
import { InventoryReportingController } from './controllers/inventory-reporting.controller';
import { ProductReportingController } from './controllers/product-reporting.controller';
import { WarehouseReportingController } from './controllers/warehouse-reporting.controller';
import { DemandPlanningReportingController } from './controllers/demand-planning-reporting.controller';
import { ProcurementReportingController } from './controllers/procurement-reporting.controller';
import { SalesReportingController } from './controllers/sales-reporting.controller';

// Services
import { InventoryReportingService } from './services/inventory-reporting.service';
import { ProductReportingService } from './services/product-reporting.service';
import { WarehouseReportingService } from './services/warehouse-reporting.service';
import { DemandPlanningReportingService } from './services/demand-planning-reporting.service';
import { ProcurementReportingService } from './services/procurement-reporting.service';
import { SalesReportingService } from './services/sales-reporting.service';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    InventoryModule, // For reusing InventoryService methods
    ProductModule,
    WarehouseModule,
    DemandPlanningModule,
  ],
  controllers: [
    InventoryReportingController,
    ProductReportingController,
    WarehouseReportingController,
    DemandPlanningReportingController,
    ProcurementReportingController,
    SalesReportingController,
  ],
  providers: [
    InventoryReportingService,
    ProductReportingService,
    WarehouseReportingService,
    DemandPlanningReportingService,
    ProcurementReportingService,
    SalesReportingService,
  ],
  exports: [
    InventoryReportingService,
    ProductReportingService,
    WarehouseReportingService,
    DemandPlanningReportingService,
    ProcurementReportingService,
  ],
})
export class ReportingModule {}
