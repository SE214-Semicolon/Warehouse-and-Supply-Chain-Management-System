import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CacheService } from '../../../cache/cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../../../cache/cache.constants';
import { DemandForecastAccuracyReportDto } from '../dto/demand-planning-report.dto';

@Injectable()
export class DemandPlanningReportingService {
  private readonly logger = new Logger(DemandPlanningReportingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Demand Forecast Accuracy Report
   * Compares forecasted quantities with actual sales (sale_issue movements)
   */
  async getDemandForecastAccuracyReport(dto: DemandForecastAccuracyReportDto) {
    this.logger.log(`Generating demand forecast accuracy report`);

    const cacheKey = {
      prefix: CACHE_PREFIX.REPORT,
      key: `forecast-accuracy:${dto.productId || 'all'}:${dto.startDate || 'all'}:${dto.endDate || 'all'}:${dto.page}:${dto.limit}`,
    };

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const skip = ((dto.page || 1) - 1) * (dto.limit || 20);
        const take = dto.limit || 20;

        // Build where clause for date range
        const whereClause: any = {};
        if (dto.productId) {
          whereClause.productId = dto.productId;
        }
        if (dto.startDate || dto.endDate) {
          whereClause.forecastDate = {};
          if (dto.startDate) whereClause.forecastDate.gte = new Date(dto.startDate);
          if (dto.endDate) whereClause.forecastDate.lte = new Date(dto.endDate);
        }

        // Query forecasts
        const [forecasts, total] = await Promise.all([
          this.prisma.demandForecast.findMany({
            where: whereClause,
            skip,
            take,
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                },
              },
            },
            orderBy: {
              forecastDate: 'desc',
            },
          }),
          this.prisma.demandForecast.count({ where: whereClause }),
        ]);

        // For each forecast, get actual sales on that date
        const accuracyData = await Promise.all(
          forecasts.map(async (forecast) => {
            // Get actual sales (sale_issue movements) for the forecast date
            const actualSales = await this.prisma.stockMovement.aggregate({
              where: {
                productBatch: {
                  productId: forecast.productId,
                },
                movementType: 'sale_issue',
                createdAt: {
                  gte: new Date(forecast.forecastDate),
                  lt: new Date(new Date(forecast.forecastDate).getTime() + 24 * 60 * 60 * 1000), // Next day
                },
              },
              _sum: {
                quantity: true,
              },
            });

            const actualQuantity = Math.abs(actualSales._sum.quantity || 0); // sale_issue is negative
            const forecastedQuantity = forecast.forecastedQuantity;

            // Calculate accuracy metrics
            const error = forecastedQuantity - actualQuantity;
            const absoluteError = Math.abs(error);
            const percentageError = actualQuantity > 0 ? (absoluteError / actualQuantity) * 100 : 0;

            // Accuracy = 100% - MAPE
            const accuracy = 100 - percentageError;

            return {
              forecastId: forecast.id,
              productId: forecast.product.id,
              productSku: forecast.product.sku,
              productName: forecast.product.name,
              forecastDate: forecast.forecastDate,
              forecastedQuantity,
              actualQuantity,
              error: parseFloat(error.toFixed(2)),
              absoluteError: parseFloat(absoluteError.toFixed(2)),
              percentageError: parseFloat(percentageError.toFixed(2)),
              accuracy: parseFloat(accuracy.toFixed(2)),
              algorithmUsed: forecast.algorithmUsed,
            };
          }),
        );

        // Sort by the specified field
        const sortField = dto.sortBy || 'accuracy';
        const sortOrder = dto.sortOrder || 'desc';

        accuracyData.sort((a, b) => {
          const aValue = a[sortField as keyof typeof a] as number;
          const bValue = b[sortField as keyof typeof b] as number;
          return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        });

        // Calculate summary statistics
        const summaryStats = {
          totalForecasts: accuracyData.length,
          averageAccuracy:
            accuracyData.length > 0
              ? parseFloat(
                  (
                    accuracyData.reduce((sum, item) => sum + item.accuracy, 0) / accuracyData.length
                  ).toFixed(2),
                )
              : 0,
          averageMAE:
            accuracyData.length > 0
              ? parseFloat(
                  (
                    accuracyData.reduce((sum, item) => sum + item.absoluteError, 0) /
                    accuracyData.length
                  ).toFixed(2),
                )
              : 0,
          averageMAPE:
            accuracyData.length > 0
              ? parseFloat(
                  (
                    accuracyData.reduce((sum, item) => sum + item.percentageError, 0) /
                    accuracyData.length
                  ).toFixed(2),
                )
              : 0,
        };

        const totalPages = Math.ceil(total / take);

        return {
          success: true,
          accuracyData,
          summaryStats,
          total,
          page: dto.page || 1,
          limit: take,
          totalPages,
        };
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }
}
