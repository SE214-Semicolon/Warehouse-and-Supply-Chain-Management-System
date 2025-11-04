import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { CacheModule } from '../../cache/cache.module';
import { WarehouseController } from './controllers/warehouse.controller';
import { LocationController } from './controllers/location.controller';
import { WarehouseService } from './services/warehouse.service';
import { LocationService } from './services/location.service';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { LocationRepository } from './repositories/location.repository';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [WarehouseController, LocationController],
  providers: [WarehouseService, LocationService, WarehouseRepository, LocationRepository],
  exports: [WarehouseService, LocationService, WarehouseRepository, LocationRepository],
})
export class WarehouseModule {}
