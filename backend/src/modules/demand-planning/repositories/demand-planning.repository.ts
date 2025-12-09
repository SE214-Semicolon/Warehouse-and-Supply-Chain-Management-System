import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DemandPlanningRepository {
  private readonly logger = new Logger(DemandPlanningRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new demand forecast
   */
  async create(data: Prisma.DemandForecastCreateInput) {
    this.logger.log(`Creating forecast for product ${data.product.connect?.id}`);
    return this.prisma.demandForecast.create({
      data,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });
  }

  /**
   * Create multiple forecasts in a transaction
   */
  async createMany(forecasts: Prisma.DemandForecastCreateManyInput[]) {
    this.logger.log(`Creating ${forecasts.length} forecasts in batch`);
    return this.prisma.demandForecast.createMany({
      data: forecasts,
      skipDuplicates: true, // Skip if (productId, forecastDate) already exists
    });
  }

  /**
   * Find forecast by ID
   */
  async findById(id: string) {
    return this.prisma.demandForecast.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });
  }

  /**
   * Find forecasts with filters
   */
  async findMany(params: {
    productId?: string;
    startDate?: Date;
    endDate?: Date;
    algorithmUsed?: string;
  }) {
    const where: Prisma.DemandForecastWhereInput = {};

    if (params.productId) {
      where.productId = params.productId;
    }

    if (params.startDate || params.endDate) {
      where.forecastDate = {};
      if (params.startDate) {
        where.forecastDate.gte = params.startDate;
      }
      if (params.endDate) {
        where.forecastDate.lte = params.endDate;
      }
    }

    if (params.algorithmUsed) {
      where.algorithmUsed = params.algorithmUsed;
    }

    return this.prisma.demandForecast.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
      orderBy: {
        forecastDate: 'asc',
      },
    });
  }

  /**
   * Update forecast
   */
  async update(id: string, data: Prisma.DemandForecastUpdateInput) {
    this.logger.log(`Updating forecast ${id}`);
    return this.prisma.demandForecast.update({
      where: { id },
      data,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });
  }

  /**
   * Delete forecast
   */
  async delete(id: string) {
    this.logger.log(`Deleting forecast ${id}`);
    return this.prisma.demandForecast.delete({
      where: { id },
    });
  }

  /**
   * Check if product exists
   */
  async findProduct(productId: string) {
    return this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
      },
    });
  }

  /**
   * Get historical stock movements for a product (sale_issue type)
   * Used for forecasting algorithms
   */
  async getHistoricalMovements(productId: string, fromDate: Date, toDate: Date) {
    return this.prisma.stockMovement.findMany({
      where: {
        productId,
        movementType: 'sale_issue',
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        quantity: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Delete existing forecasts for a product in a date range
   * Used before generating new forecasts
   */
  async deleteByProductAndDateRange(productId: string, startDate: Date, endDate: Date) {
    this.logger.log(
      `Deleting existing forecasts for product ${productId} from ${startDate} to ${endDate}`,
    );
    return this.prisma.demandForecast.deleteMany({
      where: {
        productId,
        forecastDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }
}
