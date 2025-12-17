import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { AlertRepository } from '../repositories/alert.repository';
import { CreateAlertDto } from '../dto/create-alert.dto';
import { QueryAlertDto } from '../dto/query-alert.dto';
import {
  AlertResponseDto,
  AlertListResponseDto,
  AlertSingleResponseDto,
  AlertDeleteResponseDto,
  UnreadCountResponseDto,
} from '../dto/alert-response.dto';
import { CacheService } from '../../../cache/cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../../../cache/cache.constants';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly alertRepo: AlertRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Create Alert API
   * Test cases:
   * - ALERT-TC01: Create with valid data (201)
   * - ALERT-TC02: Create without relatedEntity (201)
   * - ALERT-TC03: Invalid type enum (400)
   * - ALERT-TC04: Invalid severity enum (400)
   * - ALERT-TC05: Empty message (400, validated by DTO)
   * - ALERT-TC06: Invalid relatedEntity.id format (400)
   */
  async createAlert(dto: CreateAlertDto): Promise<AlertSingleResponseDto> {
    this.logger.log(`Creating alert: ${dto.type} - ${dto.severity}`);

    try {
      const alert = await this.alertRepo.write(dto);

      // Invalidate cache after creation
      await this.cacheService.deleteByPrefix(CACHE_PREFIX.ALERT);

      return {
        success: true,
        data: this.mapToResponseDto(alert),
        message: 'Alert created successfully',
      };
    } catch (error) {
      this.logger.error('Error creating alert:', error);
      throw new BadRequestException('Failed to create alert');
    }
  }

  /**
   * Get Alerts API
   * Test cases:
   * - ALERT-TC07: Get all with default pagination (200)
   * - ALERT-TC08: Filter by type (200)
   * - ALERT-TC09: Filter by severity (200)
   * - ALERT-TC10: Filter by isRead=false (200)
   * - ALERT-TC11: Filter by isRead=true (200)
   * - ALERT-TC12: Combined filters (200)
   * - ALERT-TC13: Custom pagination (200)
   * - ALERT-TC14: Invalid page number <1 (400)
   * - ALERT-TC15: Invalid limit >100 (400)
   * - ALERT-TC16: Sort by createdAt ascending (200)
   * - ALERT-TC17: Cache hit on repeated query (200)
   */
  async getAlerts(dto: QueryAlertDto): Promise<AlertListResponseDto> {
    this.logger.log(`Querying alerts with filters: ${JSON.stringify(dto)}`);

    // Validation
    if (dto.page !== undefined && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit !== undefined && (dto.limit < 1 || dto.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    // Cache key
    const cacheKey = {
      prefix: CACHE_PREFIX.ALERT,
      key: `list:${dto.type || 'all'}:${dto.severity || 'all'}:${dto.isRead ?? 'all'}:${dto.page}:${dto.limit}:${dto.sortBy}:${dto.sortOrder}`,
    };

    const result = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.alertRepo.query(dto);
      },
      { ttl: CACHE_TTL.SHORT },
    );

    return {
      success: true,
      data: result.alerts.map((alert) => this.mapToResponseDto(alert)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get Alert by ID API
   * Test cases:
   * - ALERT-TC18: Get by valid ID (200)
   * - ALERT-TC19: Alert not found (404)
   * - ALERT-TC20: Invalid ObjectId format (404)
   * - ALERT-TC21: Cache hit on repeated call (200)
   */
  async getAlertById(id: string): Promise<AlertSingleResponseDto> {
    this.logger.log(`Fetching alert by ID: ${id}`);

    const cacheKey = {
      prefix: CACHE_PREFIX.ALERT,
      key: `detail:${id}`,
    };

    const alert = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.alertRepo.findById(id);
      },
      { ttl: CACHE_TTL.SHORT },
    );

    if (!alert) {
      throw new NotFoundException(`Alert not found: ${id}`);
    }

    return {
      success: true,
      data: this.mapToResponseDto(alert),
    };
  }

  /**
   * Mark Alert as Read API
   * Test cases:
   * - ALERT-TC22: Mark as read successfully (200)
   * - ALERT-TC23: Alert not found (404)
   * - ALERT-TC24: Mark already-read alert (200, idempotent)
   * - ALERT-TC25: Invalid ObjectId format (404)
   */
  async markAsRead(id: string): Promise<AlertSingleResponseDto> {
    this.logger.log(`Marking alert as read: ${id}`);

    const alert = await this.alertRepo.markAsRead(id);

    if (!alert) {
      throw new NotFoundException(`Alert not found: ${id}`);
    }

    // Invalidate cache
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.ALERT);

    return {
      success: true,
      data: this.mapToResponseDto(alert),
      message: 'Alert marked as read',
    };
  }

  /**
   * Delete Alert API
   * Test cases:
   * - ALERT-TC26: Delete successfully (200)
   * - ALERT-TC27: Alert not found (404)
   * - ALERT-TC28: Invalid ObjectId format (404)
   */
  async deleteAlert(id: string): Promise<AlertDeleteResponseDto> {
    this.logger.log(`Deleting alert: ${id}`);

    const deleted = await this.alertRepo.delete(id);

    if (!deleted) {
      throw new NotFoundException(`Alert not found: ${id}`);
    }

    // Invalidate cache
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.ALERT);

    return {
      success: true,
      message: 'Alert deleted successfully',
    };
  }

  /**
   * Get Unread Alert Count API
   * Test cases:
   * - ALERT-TC29: Get total unread count (200)
   * - ALERT-TC30: Get unread count by type (200)
   * - ALERT-TC31: Get unread count by severity (200)
   */
  async getUnreadCount(filters?: {
    type?: string;
    severity?: string;
  }): Promise<UnreadCountResponseDto> {
    this.logger.log(`Getting unread count with filters: ${JSON.stringify(filters || {})}`);

    const count = await this.alertRepo.getUnreadCount(filters);

    return {
      success: true,
      unreadCount: count,
    };
  }

  /**
   * Map MongoDB document to response DTO
   */
  private mapToResponseDto(alert: any): AlertResponseDto {
    return {
      id: alert._id.toString(),
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      isRead: alert.isRead,
      relatedEntity: alert.relatedEntity
        ? {
            type: alert.relatedEntity.type,
            id: alert.relatedEntity.id.toString(),
          }
        : undefined,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }
}
