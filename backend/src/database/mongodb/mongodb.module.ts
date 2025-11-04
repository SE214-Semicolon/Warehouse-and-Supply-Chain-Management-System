import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from '../config/database.config';
import { MongoDBService } from './mongodb.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(databaseConfig)],
  providers: [MongoDBService],
  exports: [MongoDBService],
})
export class MongoDBModule {}
