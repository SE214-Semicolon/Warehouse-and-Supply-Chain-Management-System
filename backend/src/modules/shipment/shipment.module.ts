import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { ShipmentController } from './shipment.controller';
import { ShipmentService } from './services/shipment.service';
import { ShipmentRepository } from './repositories/shipment.repository';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { SalesOrderModule } from '../sales/sales-order/sales-order.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, WarehouseModule, SalesOrderModule, InventoryModule],
  controllers: [ShipmentController],
  providers: [ShipmentService, ShipmentRepository],
  exports: [ShipmentService, ShipmentRepository],
})
export class ShipmentModule {}
