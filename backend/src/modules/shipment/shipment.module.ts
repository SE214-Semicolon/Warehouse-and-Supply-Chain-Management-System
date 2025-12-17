import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { ShipmentController } from './shipment.controller';
import { ShipmentService } from './services/shipment.service';
import { ShipmentRepository } from './repositories/shipment.repository';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { SalesModule } from '../sales/sales.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  imports: [PrismaModule, WarehouseModule, SalesModule, InventoryModule, CacheModule],
  controllers: [ShipmentController],
  providers: [ShipmentService, ShipmentRepository],
  exports: [ShipmentService, ShipmentRepository],
})
export class ShipmentModule {}
