import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { ShipmentController } from './shipment.controller';
import { ShipmentService } from './services/shipment.service';
import { ShipmentRepository } from './repositories/shipment.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ShipmentController],
  providers: [ShipmentService, ShipmentRepository],
  exports: [ShipmentService, ShipmentRepository],
})
export class ShipmentModule {}
