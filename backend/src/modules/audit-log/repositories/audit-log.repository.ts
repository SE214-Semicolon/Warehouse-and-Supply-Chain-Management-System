import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MongoDBService } from '../../../database/mongodb/mongodb.service';
import { QueryAuditLogDto } from '../dto/query-audit-log.dto';
import { AuditLogEntry } from '../interfaces/audit-log-entry.interface';

@Injectable()
export class AuditLogRepository implements OnModuleInit {
  private readonly logger = new Logger(AuditLogRepository.name);
  private collection: any;
  private initialized = false;
  private initializing?: Promise<void>;

  constructor(private readonly mongo: MongoDBService) {
    // Do not access MongoDB in constructor; wait until module init
  }

  async onModuleInit(): Promise<void> {
    await this.ensureInitialized();
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      // Retry until MongoDB connection is ready
      const maxAttempts = 10;
      const delayMs = 500;
      let attempt = 0;
      while (attempt < maxAttempts) {
        try {
          this.collection = this.mongo.getCollection<AuditLogEntry>('audit_logs');
          await this.setupIndexes();
          this.initialized = true;
          return;
        } catch (err) {
          attempt += 1;
          if (attempt >= maxAttempts) {
            this.logger.error('Failed to initialize audit log collection after retries', err);
            return;
          }
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
    })();

    return this.initializing;
  }

  private async setupIndexes() {
    try {
      // Create indexes (ignore errors if already exist)
      await this.collection.createIndex({ entityType: 1, entityId: 1, timestamp: -1 });
      await this.collection.createIndex({ userId: 1, timestamp: -1 });
      await this.collection.createIndex({ action: 1, timestamp: -1 });
      await this.collection.createIndex({ correlationId: 1 });
      await this.collection.createIndex({ timestamp: -1 });

      // TTL index: expire documents after 180 days (15552000 seconds)
      await this.collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 15552000 });

      this.logger.log('Audit log indexes created successfully (including TTL 180 days)');
    } catch (err) {
      this.logger.warn('Some audit log indexes may already exist', err);
    }
  }

  async insert(entry: AuditLogEntry) {
    try {
      await this.ensureInitialized();
      if (!this.collection) return; // give up silently to avoid blocking business logic
      await this.collection.insertOne({ ...entry, timestamp: entry.timestamp || new Date() });
    } catch (err) {
      this.logger.error('Failed to insert audit log', err);
    }
  }

  async query(params: QueryAuditLogDto) {
    await this.ensureInitialized();
    if (!this.collection) {
      // If still not ready, return empty result gracefully
      return { page: params.page ?? 1, limit: params.limit ?? 50, total: 0, results: [] };
    }
    const {
      entityType,
      entityId,
      action,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      search,
    } = params;

    const filter: any = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (action) filter.action = action;
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) filter.timestamp.$lte = endDate;
    }
    if (search) {
      filter.$or = [
        { before: { $regex: search, $options: 'i' } },
        { after: { $regex: search, $options: 'i' } },
        { metadata: { $regex: search, $options: 'i' } },
        { path: { $regex: search, $options: 'i' } },
      ];
    }

    const cursor = this.collection
      .find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const results = await cursor.toArray();
    const total = await this.collection.countDocuments(filter);
    return {
      page,
      limit,
      total,
      results,
    };
  }
}
