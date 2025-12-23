import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { AuditLogModule } from '../../modules/audit-log/audit-log.module';
import { AuditMiddleware } from '../middleware/audit.middleware';

@Global()
@Module({
  imports: [ConfigModule, AuditLogModule],
  providers: [PrismaService, AuditMiddleware],
  exports: [PrismaService, AuditMiddleware],
})
export class PrismaModule {}
