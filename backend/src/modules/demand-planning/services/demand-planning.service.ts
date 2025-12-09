import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DemandPlanningRepository } from '../repositories/demand-planning.repository';
import { CreateForecastDto } from '../dto/create-forecast.dto';
import { UpdateForecastDto } from '../dto/update-forecast.dto';
import { QueryForecastDto } from '../dto/query-forecast.dto';
import { RunAlgorithmDto, ForecastAlgorithm } from '../dto/run-algorithm.dto';
import { CacheService } from 'src/cache/cache.service';
import { CACHE_PREFIX } from 'src/cache/cache.constants';

@Injectable()
export class DemandPlanningService {
  private readonly logger = new Logger(DemandPlanningService.name);

  constructor(
    private readonly repository: DemandPlanningRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Create a new forecast
   */
  async createForecast(dto: CreateForecastDto) {
    this.logger.log(`Creating forecast for product ${dto.productId}`);

    // Validate product exists
    const product = await this.repository.findProduct(dto.productId);
    if (!product) {
      throw new NotFoundException(`Product not found: ${dto.productId}`);
    }

    try {
      const forecast = await this.repository.create({
        product: { connect: { id: dto.productId } },
        forecastDate: new Date(dto.forecastDate),
        forecastedQuantity: dto.forecastedQuantity,
        algorithmUsed: dto.algorithmUsed || 'SIMPLE_MOVING_AVERAGE',
      });

      // Invalidate cache
      await this.invalidateForecastCache();

      return { success: true, forecast };
    } catch (error: any) {
      // Handle unique constraint violation (productId + forecastDate)
      if (error.code === 'P2002') {
        throw new BadRequestException(
          `Forecast already exists for product ${dto.productId} on ${dto.forecastDate}`,
        );
      }
      throw error;
    }
  }

  /**
   * Get forecast by ID
   */
  async getForecastById(id: string) {
    const cacheKey = `${CACHE_PREFIX.FORECAST}:${id}`;

    return this.cacheService.getOrSet(cacheKey, async () => {
      const forecast = await this.repository.findById(id);
      if (!forecast) {
        throw new NotFoundException(`Forecast not found: ${id}`);
      }
      return forecast;
    });
  }

  /**
   * Query forecasts with filters
   */
  async queryForecasts(dto: QueryForecastDto) {
    const cacheKey = this.buildQueryCacheKey(dto);

    return this.cacheService.getOrSet(cacheKey, async () => {
      const params: any = {};

      if (dto.productId) params.productId = dto.productId;
      if (dto.startDate) params.startDate = new Date(dto.startDate);
      if (dto.endDate) params.endDate = new Date(dto.endDate);
      if (dto.algorithmUsed) params.algorithmUsed = dto.algorithmUsed;

      return this.repository.findMany(params);
    });
  }

  /**
   * Update forecast
   */
  async updateForecast(id: string, dto: UpdateForecastDto) {
    this.logger.log(`Updating forecast ${id}`);

    // Check if forecast exists
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Forecast not found: ${id}`);
    }

    // Validate product if being updated
    if (dto.productId && dto.productId !== existing.productId) {
      const product = await this.repository.findProduct(dto.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${dto.productId}`);
      }
    }

    try {
      const updateData: any = {};
      if (dto.forecastDate) updateData.forecastDate = new Date(dto.forecastDate);
      if (dto.forecastedQuantity !== undefined)
        updateData.forecastedQuantity = dto.forecastedQuantity;
      if (dto.algorithmUsed) updateData.algorithmUsed = dto.algorithmUsed;
      if (dto.productId) updateData.product = { connect: { id: dto.productId } };

      const forecast = await this.repository.update(id, updateData);

      // Invalidate cache
      await this.invalidateForecastCache();

      return { success: true, forecast };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          `Forecast already exists for the specified product and date combination`,
        );
      }
      throw error;
    }
  }

  /**
   * Delete forecast
   */
  async deleteForecast(id: string) {
    this.logger.log(`Deleting forecast ${id}`);

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Forecast not found: ${id}`);
    }

    await this.repository.delete(id);

    // Invalidate cache
    await this.invalidateForecastCache();

    return { success: true, message: 'Forecast deleted successfully' };
  }

  /**
   * Run forecasting algorithm for a product
   */
  async runAlgorithm(productId: string, dto: RunAlgorithmDto) {
    this.logger.log(`Running ${dto.algorithm} for product ${productId}`);

    // Validate product exists
    const product = await this.repository.findProduct(productId);
    if (!product) {
      throw new NotFoundException(`Product not found: ${productId}`);
    }

    // Execute algorithm
    let result: { forecastsCreated: number; avgDailyDemand: number };

    switch (dto.algorithm) {
      case ForecastAlgorithm.SIMPLE_MOVING_AVERAGE:
        result = await this.runSimpleMovingAverage(productId, dto);
        break;
      default:
        throw new BadRequestException(`Unsupported algorithm: ${dto.algorithm}`);
    }

    // Invalidate cache
    await this.invalidateForecastCache();

    return {
      success: true,
      productId,
      algorithm: dto.algorithm,
      ...result,
    };
  }

  /**
   * Simple Moving Average (SMA) algorithm
   * Analyzes historical DISPATCH movements and calculates average daily demand
   */
  private async runSimpleMovingAverage(
    productId: string,
    dto: RunAlgorithmDto,
  ): Promise<{ forecastsCreated: number; avgDailyDemand: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate date range for historical data
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - dto.windowDays);

    // Get historical stock movements (DISPATCH = outbound/sales)
    const movements = await this.repository.getHistoricalMovements(productId, fromDate, today);

    if (movements.length === 0) {
      this.logger.warn(`No historical data found for product ${productId}`);
      return { forecastsCreated: 0, avgDailyDemand: 0 };
    }

    // Calculate total quantity dispatched
    const totalQuantity = movements.reduce((sum, m) => sum + m.quantity, 0);

    // Calculate average daily demand
    const avgDailyDemand = Math.round(totalQuantity / dto.windowDays);

    // Generate forecast start date
    const forecastStartDate = dto.startDate ? new Date(dto.startDate) : new Date(today);
    forecastStartDate.setDate(forecastStartDate.getDate() + 1); // Start from tomorrow

    // Delete existing forecasts in the range (if any)
    const forecastEndDate = new Date(forecastStartDate);
    forecastEndDate.setDate(forecastEndDate.getDate() + dto.forecastDays - 1);

    await this.repository.deleteByProductAndDateRange(
      productId,
      forecastStartDate,
      forecastEndDate,
    );

    // Create forecasts for future days
    const forecasts: {
      productId: string;
      forecastDate: Date;
      forecastedQuantity: number;
      algorithmUsed: string;
    }[] = [];
    for (let i = 0; i < dto.forecastDays; i++) {
      const forecastDate = new Date(forecastStartDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      forecasts.push({
        productId,
        forecastDate,
        forecastedQuantity: avgDailyDemand,
        algorithmUsed: ForecastAlgorithm.SIMPLE_MOVING_AVERAGE,
      });
    }

    // Batch insert forecasts
    const result = await this.repository.createMany(forecasts);

    this.logger.log(
      `Created ${result.count} forecasts for product ${productId} (avg daily demand: ${avgDailyDemand})`,
    );

    return {
      forecastsCreated: result.count,
      avgDailyDemand,
    };
  }

  /**
   * Build cache key for query
   */
  private buildQueryCacheKey(dto: QueryForecastDto): string {
    const parts = [CACHE_PREFIX.FORECAST, 'query'];
    if (dto.productId) parts.push(`p:${dto.productId}`);
    if (dto.startDate) parts.push(`s:${dto.startDate}`);
    if (dto.endDate) parts.push(`e:${dto.endDate}`);
    if (dto.algorithmUsed) parts.push(`a:${dto.algorithmUsed}`);
    return parts.join(':');
  }

  /**
   * Invalidate all forecast caches
   */
  private async invalidateForecastCache() {
    await this.cacheService.deleteByPrefix(`${CACHE_PREFIX.FORECAST}:`);
  }
}
