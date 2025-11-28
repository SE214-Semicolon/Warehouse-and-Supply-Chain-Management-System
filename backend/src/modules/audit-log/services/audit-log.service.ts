import { Injectable, Logger } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { QueryAuditLogDto } from '../dto/query-audit-log.dto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  constructor(private readonly repo: AuditLogRepository) {}

  async write(entry: any) {
    try {
      return await this.repo.insert(entry);
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
      // Don't throw - audit logging should not break business logic
    }
  }

  async query(query: QueryAuditLogDto) {
    return this.repo.query(query);
  }
}
