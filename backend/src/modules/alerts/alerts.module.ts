import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongoDBModule } from '../../database/mongodb/mongodb.module';
import { CacheModule } from '../../cache/cache.module';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AlertController } from './controllers/alert.controller';
import { AlertService } from './services/alert.service';
import { AlertGenerationService } from './services/alert-generation.service';
import { AlertSchedulerService } from './services/alert-scheduler.service';
import { AlertRepository } from './repositories/alert.repository';

@Module({
  imports: [MongoDBModule, CacheModule, PrismaModule, ScheduleModule.forRoot()],
  controllers: [AlertController],
  providers: [AlertService, AlertGenerationService, AlertSchedulerService, AlertRepository],
  exports: [AlertGenerationService], // Export for InventoryModule to use
})
export class AlertsModule {}
