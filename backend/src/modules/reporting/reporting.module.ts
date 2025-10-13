import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule, // gives PrismaService and MongoDBService
  ],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}
