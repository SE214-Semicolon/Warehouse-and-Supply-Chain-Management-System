import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CacheService } from '../../../cache/cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../../../cache/cache.constants';
import { ProductPerformanceReportDto } from '../dto/product-report.dto';

@Injectable()
export class ProductReportingService {
  private readonly logger = new Logger(ProductReportingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Product Performance Report
   * Analyzes product turnover, movement frequency, and inventory days
   */
  async getProductPerformanceReport(dto: ProductPerformanceReportDto) {
    this.logger.log(`Generating product performance report`);

    const cacheKey = {
      prefix: CACHE_PREFIX.REPORT,
      key: `product-performance:${dto.productId || 'all'}:${dto.categoryId || 'all'}:${dto.startDate || 'all'}:${dto.endDate || 'all'}:${dto.page}:${dto.limit}`,
    };

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const skip = ((dto.page || 1) - 1) * (dto.limit || 20);
        const take = dto.limit || 20;

        // Build where clause for date range
        const dateFilter: any = {};
        if (dto.startDate || dto.endDate) {
          dateFilter.createdAt = {};
          if (dto.startDate) dateFilter.createdAt.gte = new Date(dto.startDate);
          if (dto.endDate) dateFilter.createdAt.lte = new Date(dto.endDate);
        }

        // Query stock movements grouped by product
        const movements = await this.prisma.stockMovement.groupBy({
          by: ['productBatchId'],
          where: {
            ...dateFilter,
            ...(dto.productId && {
              productBatch: { productId: dto.productId },
            }),
          },
          _count: {
            id: true,
          },
          _sum: {
            quantity: true,
          },
        });

        // Get product details and calculate metrics
        const performanceData = await Promise.all(
          movements.slice(skip, skip + take).map(async (movement) => {
            // Skip if productBatchId is null
            if (!movement.productBatchId) return null;

            const batch = await this.prisma.productBatch.findUnique({
              where: { id: movement.productBatchId },
              include: {
                product: {
                  include: {
                    category: true,
                  },
                },
              },
            });

            if (!batch) return null;

            // Filter by category if specified
            if (dto.categoryId && batch.product.categoryId !== dto.categoryId) {
              return null;
            }

            // Calculate metrics
            const totalMovements = movement._count.id;
            const totalQuantity = movement._sum.quantity || 0;

            // Calculate days in period
            const start = dto.startDate
              ? new Date(dto.startDate)
              : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = dto.endDate ? new Date(dto.endDate) : new Date();
            const daysInPeriod = Math.ceil(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
            );

            // Turnover rate = total quantity moved / days in period
            const turnoverRate = daysInPeriod > 0 ? totalQuantity / daysInPeriod : 0;

            // Movement frequency = movements / days in period
            const movementFrequency = daysInPeriod > 0 ? totalMovements / daysInPeriod : 0;

            return {
              productId: batch.product.id,
              productSku: batch.product.sku,
              productName: batch.product.name,
              categoryName: batch.product.category?.name || 'Uncategorized',
              totalMovements,
              totalQuantity,
              turnoverRate: parseFloat(turnoverRate.toFixed(2)),
              movementFrequency: parseFloat(movementFrequency.toFixed(2)),
              daysInPeriod,
            };
          }),
        );

        // Filter out nulls and sort
        const filteredData = performanceData.filter((item) => item !== null);

        // Sort by the specified field
        const sortField = dto.sortBy || 'turnoverRate';
        const sortOrder = dto.sortOrder || 'desc';

        filteredData.sort((a, b) => {
          const aValue = a[sortField as keyof typeof a] as number;
          const bValue = b[sortField as keyof typeof b] as number;
          return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        });

        const total = filteredData.length;
        const totalPages = Math.ceil(total / take);

        return {
          success: true,
          performanceData: filteredData,
          total,
          page: dto.page || 1,
          limit: take,
          totalPages,
          period: {
            startDate:
              dto.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: dto.endDate || new Date().toISOString(),
          },
        };
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }
}
