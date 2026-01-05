import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';

@Injectable()
export class MongoDBService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;
  public db: Db;

  async onModuleInit() {
    try {
      const mongoUri =
        process.env.MONGODB_URI ||
        process.env.MONGO_URL ||
        'mongodb://mongo_user:mongo_pass@localhost:27017/warehouse_db?authSource=admin';
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not defined');
      }

      this.client = new MongoClient(mongoUri);
      await this.client.connect();
      // Use database name from env or default to 'warehouse_analytics'
      const dbName = process.env.MONGODB_DB_NAME || 'warehouse_analytics';
      this.db = this.client.db(dbName);
    } catch (error) {
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
    }
  }

  // Get collection
  getCollection(name: string) {
    return this.db.collection(name);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}
