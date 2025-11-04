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
      this.db = this.client.db('warehouse_analytics');
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
    } catch (error) {
      return false;
    }
  }
}
