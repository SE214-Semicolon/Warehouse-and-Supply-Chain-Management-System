import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PurchaseOrderRepository } from './repositories/purchase-order.repository';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [OrderController],
  providers: [OrderService, PurchaseOrderRepository],
  exports: [OrderService],
})
export class OrderModule {}
