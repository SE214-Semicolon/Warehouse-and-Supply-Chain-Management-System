import { Module } from '@nestjs/common';
import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { PurchaseOrderService } from './services/purchase-order.service';
import { PurchaseOrderRepository } from './repositories/purchase-order.repository';
import { SalesOrderController } from './controllers/sales-order.controller';
import { SalesOrderService } from './services/sales-order.service';
import { SalesOrderRepository } from './repositories/sales-order.repository';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [PurchaseOrderController, SalesOrderController],
  providers: [
    PurchaseOrderService,
    PurchaseOrderRepository,
    SalesOrderService,
    SalesOrderRepository,
  ],
  exports: [PurchaseOrderService, SalesOrderService],
})
export class OrderModule {}
