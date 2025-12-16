import { Module } from '@nestjs/common';
import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { PurchaseOrderService } from './services/purchase-order.service';
import { PurchaseOrderRepository } from './repositories/purchase-order.repository';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { InventoryModule } from '../../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService, PurchaseOrderRepository],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}


