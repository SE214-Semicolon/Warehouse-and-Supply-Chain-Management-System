import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditLogModule } from '../../modules/audit-log/audit-log.module';
import { AuditMiddleware } from '../middleware/audit.middleware';

@Global()
@Module({
  imports: [AuditLogModule],
  providers: [PrismaService, AuditMiddleware],
  exports: [PrismaService],
})
export class PrismaModule {}
