import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PurchaseOrderRepository } from './repositories/purchase-order.repository';
import { SalesOrderController } from './sales-order.controller';
import { SalesOrderService } from './sales-order.service';
import { SalesOrderRepository } from './repositories/sales-order.repository';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [OrderController, SalesOrderController],
  providers: [OrderService, PurchaseOrderRepository, SalesOrderService, SalesOrderRepository],
  exports: [OrderService, SalesOrderService],
})
export class OrderModule {}
