import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MongoDBService } from '../../database/mongodb.service';

@Injectable()
export class ReportingService {
  constructor(
    private prisma: PrismaService,
    private mongoService: MongoDBService,
  ) {}

  // example: get inventory summary from Postgres
  async inventorySummary() {
    return await this.prisma.inventory.groupBy({
      by: ['productBatchId'],
      _sum: { availableQty: true, reservedQty: true },
    });
  }

  // query audit logs from Mongo using MongoDB Driver
  async recentAudit(limit = 50) {
    return await this.mongoService
      .getCollection('audit_logs')
      .find({})
      .sort({ performedAt: -1 })
      .limit(limit)
      .toArray();
  }

  // MongoDB Analytics Methods
  async logUserAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown> = {},
  ) {
    const logEntry = {
      userId,
      action,
      entityType,
      entityId,
      metadata,
      timestamp: new Date(),
    };

    return await this.mongoService.getCollection('user_actions').insertOne(logEntry);
  }

  async getUserActivityLogs(userId: string, limit: number = 50) {
    return await this.mongoService
      .getCollection('user_actions')
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  async getInventoryTrends(productId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.mongoService
      .getCollection('inventory_metrics')
      .aggregate([
        {
          $match: {
            productId,
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$timestamp',
              },
            },
            avgStock: { $avg: '$stockLevel' },
            minStock: { $min: '$stockLevel' },
            maxStock: { $max: '$stockLevel' },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();
  }

  async healthCheck() {
    return await this.mongoService.healthCheck();
  }
}
