import { Module, Global } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MongoDBService } from './mongodb.service';

@Global()
@Module({
  providers: [PrismaService, MongoDBService],
  exports: [PrismaService, MongoDBService],
})
export class DatabaseModule {}
