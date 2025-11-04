import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { databaseConfig } from './config/database.config';
import { databaseValidationSchema } from './config/database.validation';
import { PrismaModule } from './prisma/prisma.module';
import { MongoDBModule } from './mongodb/mongodb.module';
import { DatabaseErrorInterceptor } from './interceptors/database-error.interceptor';

@Module({
  imports: [ConfigModule.forFeature(databaseConfig), PrismaModule, MongoDBModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: DatabaseErrorInterceptor,
    },
  ],
  exports: [PrismaModule, MongoDBModule],
})
export class DatabaseModule {}
