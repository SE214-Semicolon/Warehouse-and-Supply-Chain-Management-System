import { Module } from '@nestjs/common';
import { SalesOrderController } from './controllers/sales-order.controller';
import { SalesOrderService } from './services/sales-order.service';
import { SalesOrderRepository } from './repositories/sales-order.repository';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { InventoryModule } from '../../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [SalesOrderController],
  providers: [SalesOrderService, SalesOrderRepository],
  exports: [SalesOrderService, SalesOrderRepository],
})
export class SalesOrderModule {}


