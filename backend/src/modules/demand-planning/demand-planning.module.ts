import { Module } from '@nestjs/common';
import { DemandPlanningController } from './controllers/demand-planning.controller';
import { DemandPlanningService } from './services/demand-planning.service';
import { DemandPlanningRepository } from './repositories/demand-planning.repository';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { CacheModule } from 'src/cache/cache.module';
import { ProductModule } from '../product/product.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, CacheModule, ProductModule, InventoryModule],
  controllers: [DemandPlanningController],
  providers: [DemandPlanningService, DemandPlanningRepository],
  exports: [DemandPlanningService],
})
export class DemandPlanningModule {}
