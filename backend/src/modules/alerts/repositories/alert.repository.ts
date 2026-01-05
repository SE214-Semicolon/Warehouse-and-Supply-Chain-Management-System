import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Collection, ObjectId } from 'mongodb';
import { MongoDBService } from '../../../database/mongodb/mongodb.service';
import {
  IAlertRepository,
  CreateAlertDto,
  QueryAlertFilters,
  AlertDocument,
} from '../interfaces/alert-repository.interface';

@Injectable()
export class AlertRepository implements IAlertRepository, OnModuleInit {
  private readonly logger = new Logger(AlertRepository.name);
  private collection: Collection<AlertDocument>;
  private initialized = false;

  constructor(private readonly mongo: MongoDBService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureInitialized();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      this.collection = this.mongo.getCollection<AlertDocument>('alerts');

      // Create indexes
      await Promise.all([
        this.collection.createIndex({ type: 1 }),
        this.collection.createIndex({ severity: 1 }),
        this.collection.createIndex({ isRead: 1 }),
        // TTL index: Auto-delete alerts after 90 days (7776000 seconds)
        this.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }),
      ]);

      this.initialized = true;
      this.logger.log('Alert repository initialized with TTL index (90 days)');
    } catch (error) {
      this.logger.error('Failed to initialize alert repository:', error);
      throw error;
    }
  }

  async write(data: CreateAlertDto): Promise<AlertDocument> {
    await this.ensureInitialized();

    try {
      const now = new Date();
      const document: Partial<AlertDocument> = {
        type: data.type,
        severity: data.severity,
        message: data.message,
        isRead: false,
        createdAt: now,
        updatedAt: now,
      };

      if (data.relatedEntity) {
        document.relatedEntity = {
          type: data.relatedEntity.type,
          id: new ObjectId(data.relatedEntity.id),
        };
      }

      const result = await this.collection.insertOne(document as AlertDocument);

      this.logger.log(`Alert created: ${result.insertedId} (${data.type})`);

      return {
        ...document,
        _id: result.insertedId,
      } as AlertDocument;
    } catch (error) {
      this.logger.error('Error creating alert:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<AlertDocument | null> {
    await this.ensureInitialized();

    try {
      const objectId = new ObjectId(id);
      const alert = await this.collection.findOne({ _id: objectId } as any);
      return alert;
    } catch (error) {
      this.logger.error(`Error finding alert by ID ${id}:`, error);
      return null;
    }
  }

  async query(filters: QueryAlertFilters): Promise<{
    alerts: AlertDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.ensureInitialized();

    try {
      const {
        type,
        severity,
        isRead,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      // Build query filter
      const query: any = {};
      if (type) query.type = type;
      if (severity) query.severity = severity;
      if (isRead !== undefined) query.isRead = isRead;

      // Pagination
      const skip = (page - 1) * limit;

      // Sorting
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const [alerts, total] = await Promise.all([
        this.collection.find(query).sort(sort).skip(skip).limit(limit).toArray(),
        this.collection.countDocuments(query),
      ]);

      const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

      this.logger.debug(
        `Query alerts: ${alerts.length} results (page ${page}/${totalPages}, total: ${total})`,
      );

      return {
        alerts,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Error querying alerts:', error);
      throw error;
    }
  }

  async markAsRead(id: string): Promise<AlertDocument | null> {
    await this.ensureInitialized();

    try {
      const objectId = new ObjectId(id);
      const result = await this.collection.findOneAndUpdate(
        { _id: objectId } as any,
        { $set: { isRead: true, updatedAt: new Date() } },
        { returnDocument: 'after' },
      );

      if (result) {
        this.logger.log(`Alert marked as read: ${id}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error marking alert as read ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const objectId = new ObjectId(id);
      const result = await this.collection.deleteOne({ _id: objectId } as any);

      const deleted = result.deletedCount > 0;
      if (deleted) {
        this.logger.log(`Alert deleted: ${id}`);
      }

      return deleted;
    } catch (error) {
      this.logger.error(`Error deleting alert ${id}:`, error);
      throw error;
    }
  }

  async getUnreadCount(filters?: { type?: string; severity?: string }): Promise<number> {
    await this.ensureInitialized();

    try {
      const query: any = { isRead: false };
      if (filters?.type) query.type = filters.type;
      if (filters?.severity) query.severity = filters.severity;

      const count = await this.collection.countDocuments(query);
      return count;
    } catch (error) {
      this.logger.error('Error getting unread count:', error);
      throw error;
    }
  }
}
