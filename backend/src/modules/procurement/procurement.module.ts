import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CacheModule } from 'src/cache/cache.module';

// Controllers
import { SupplierController } from './controllers/supplier.controller';
import { PurchaseOrderController } from './controllers/purchase-order.controller';

// Services
import { SupplierService } from './services/supplier.service';
import { PurchaseOrderService } from './services/purchase-order.service';

// Repositories
import { SupplierRepository } from './repositories/supplier.repository';
import { PurchaseOrderRepository } from './repositories/purchase-order.repository';

@Module({
  imports: [PrismaModule, InventoryModule, CacheModule],
  controllers: [SupplierController, PurchaseOrderController],
  providers: [SupplierService, SupplierRepository, PurchaseOrderService, PurchaseOrderRepository],
  exports: [SupplierService, PurchaseOrderService],
})
export class ProcurementModule {}
