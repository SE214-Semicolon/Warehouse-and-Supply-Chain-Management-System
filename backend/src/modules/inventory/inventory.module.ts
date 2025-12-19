import { Module } from '@nestjs/common';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryService } from './services/inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { CacheModule } from 'src/cache/cache.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [PrismaModule, CacheModule, AlertsModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService, InventoryRepository],
})
export class InventoryModule {}
