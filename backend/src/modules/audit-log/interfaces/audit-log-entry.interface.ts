export interface AuditLogEntry {
  timestamp: Date;
  correlationId?: string;
  entityType: string;
  entityId: string;
  action: string; // CREATE | UPDATE | DELETE | DOMAIN_EVENT
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  method?: string;
  path?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any>;
}
