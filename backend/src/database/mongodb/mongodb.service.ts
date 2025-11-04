import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db, Collection, Document } from 'mongodb';

interface LogEntry {
  timestamp: Date;
  level: string;
  context: string;
  message: string;
  metadata?: Record<string, any>;
}

interface MetricEntry {
  timestamp: Date;
  name: string;
  value: number;
  labels?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram';
}

@Injectable()
export class MongoDBService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoDBService.name);
  private client: MongoClient;
  private db: Db;
  private readonly config: {
    url: string;
    maxRetries: number;
    retryDelay: number;
    maxPoolSize: number;
    minPoolSize: number;
    connectTimeoutMS: number;
  };

  // Cached collections
  private logsCollection: Collection<LogEntry>;
  private metricsCollection: Collection<MetricEntry>;

  constructor(private configService: ConfigService) {
    const mongoConfig = this.configService.get('database.mongodb');
    if (!mongoConfig) {
      throw new Error('MongoDB configuration is missing');
    }

    this.config = {
      url: mongoConfig.url,
      maxRetries: mongoConfig.maxRetries,
      retryDelay: mongoConfig.retryDelay,
      maxPoolSize: mongoConfig.maxPoolSize,
      minPoolSize: mongoConfig.minPoolSize,
      connectTimeoutMS: mongoConfig.connectTimeoutMS,
    };

    this.client = new MongoClient(this.config.url, {
      maxPoolSize: this.config.maxPoolSize,
      minPoolSize: this.config.minPoolSize,
      connectTimeoutMS: this.config.connectTimeoutMS,
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
    await this.initializeCollections();
  }

  async onModuleDestroy() {
    await this.cleanDisconnect();
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db();
      this.logger.log('Successfully connected to MongoDB database');
    } catch (error) {
      if (attempt <= this.config.maxRetries) {
        this.logger.warn(
          `Failed to connect to MongoDB (attempt ${attempt}/${this.config.maxRetries}). Retrying in ${
            this.config.retryDelay / 1000
          }s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay));
        await this.connectWithRetry(attempt + 1);
      } else {
        this.logger.error('Failed to connect to MongoDB database after maximum retry attempts');
        throw error;
      }
    }
  }

  private async initializeCollections() {
    // Initialize logs collection with TTL index
    this.logsCollection = this.db.collection<LogEntry>('logs');
    await this.logsCollection.createIndex(
      { timestamp: 1 },
      {
        expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days TTL
      },
    );

    // Initialize metrics collection with indexes
    this.metricsCollection = this.db.collection<MetricEntry>('metrics');
    await this.metricsCollection.createIndex({ timestamp: 1 });
    await this.metricsCollection.createIndex({ name: 1, timestamp: 1 });
  }

  // Log management
  async log(level: string, context: string, message: string, metadata?: Record<string, any>) {
    try {
      await this.logsCollection.insertOne({
        timestamp: new Date(),
        level,
        context,
        message,
        metadata,
      });
    } catch (error) {
      this.logger.error('Failed to write log to MongoDB:', error);
      throw error;
    }
  }

  // Metrics management
  async recordMetric(
    name: string,
    value: number,
    type: 'counter' | 'gauge' | 'histogram' = 'gauge',
    labels?: Record<string, string>,
  ) {
    try {
      await this.metricsCollection.insertOne({
        timestamp: new Date(),
        name,
        value,
        type,
        labels,
      });
    } catch (error) {
      this.logger.error('Failed to write metric to MongoDB:', error);
      throw error;
    }
  }

  // Query helpers for logs
  async queryLogs(filter: Partial<LogEntry>, limit = 100, skip = 0) {
    return this.logsCollection
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  // Query helpers for metrics
  async queryMetrics(name: string, start: Date, end: Date = new Date()) {
    return this.metricsCollection
      .find({
        name,
        timestamp: { $gte: start, $lte: end },
      })
      .sort({ timestamp: 1 })
      .toArray();
  }

  // Generic collection access
  getCollection<T extends Document = Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error('MongoDB connection not established');
    }
    return this.db.collection<T>(name);
  }

  async cleanDisconnect() {
    try {
      await this.client.close();
      this.logger.log('Successfully disconnected from MongoDB');
    } catch (error) {
      this.logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.client.db().admin().ping();
      return { status: 'ok', message: 'MongoDB connection is healthy' };
    } catch (error) {
      this.logger.error('MongoDB health check failed:', error);
      return { status: 'error', message: 'MongoDB connection is not healthy' };
    }
  }
}
