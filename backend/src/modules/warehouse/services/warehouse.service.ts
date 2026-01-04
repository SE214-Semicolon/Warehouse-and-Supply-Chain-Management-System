import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { QueryWarehouseDto } from '../dto/query-warehouse.dto';
import { CacheService } from '../../../cache/cache.service';
import { CACHE_TTL, CACHE_PREFIX } from '../../../cache/cache.constants';
import { AuditMiddleware } from '../../../database/middleware/audit.middleware';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    private readonly warehouseRepo: WarehouseRepository,
    private readonly cacheService: CacheService,
    private readonly auditMiddleware: AuditMiddleware,
  ) {}

  /**
   * POST /warehouses - Test Cases: 15
   * Basic:
   * WH-TC01: Create with valid data → 201
   * WH-TC02: Duplicate code → 409
   * WH-TC03: Missing required fields → 400 (tested by DTO)
   * WH-TC04: No permission → 403 (tested by guard)
   * WH-TC05: No auth → 401 (tested by guard)

   * Edge Cases:
   * WH-TC06: Empty string code → 400
   * WH-TC07: Whitespace only name → 400
   * WH-TC08: Code with special chars (@#$%) → 201 or 400 based on business rules
   * WH-TC09: Very long code (>50 chars) → 400
   * WH-TC10: Very long name (>200 chars) → 400
   * WH-TC11: Code with SQL injection attempt → should be sanitized
   * WH-TC12: Duplicate code (case insensitive) → 409
   * WH-TC13: Create with null metadata → 201 (defaults to {})
   * WH-TC14: Create with complex nested metadata → 201
   * WH-TC15: Concurrent create with same code → 409 for second request
   */
  async create(createDto: CreateWarehouseDto) {
    this.logger.log(`Creating warehouse with code: ${createDto.code}`);
    // Check if code already exists
    const existingCode = await this.warehouseRepo.checkCodeExists(createDto.code);
    if (existingCode) {
      throw new ConflictException(`Warehouse with code "${createDto.code}" already exists`);
    }

    const warehouse = await this.warehouseRepo.create({
      code: createDto.code,
      name: createDto.name,
      address: createDto.address,
      metadata: createDto.metadata || {},
    });

    // Invalidate warehouse cache
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.WAREHOUSE);
    this.logger.log(`Warehouse created successfully: ${warehouse.id}`);

    // Audit log
    this.auditMiddleware
      .logCreate('Warehouse', warehouse as Record<string, unknown>)
      .catch((err) => {
        this.logger.error('Failed to write audit log for warehouse create', err);
      });

    return {
      success: true,
      data: warehouse,
      message: 'Warehouse created successfully',
    };
  }

  /**
   * GET /warehouses - Test Cases: 20
   * Basic:
   * WH-TC16: Get all with default pagination → 200
   * WH-TC17: Filter by code → 200
   * WH-TC18: Filter by search → 200
   * WH-TC19: Pagination page 1 → 200
   * WH-TC20: Pagination page 2 → 200
   * WH-TC21: No auth → 401 (tested by guard)

   * Edge Cases:
   * WH-TC22: Page = 0 → should default to 1 or return 400
   * WH-TC23: Negative page → should default to 1 or return 400
   * WH-TC24: Limit = 0 → should use default or return 400
   * WH-TC25: Negative limit → should use default or return 400
   * WH-TC26: Very large limit (>1000) → should cap at max
   * WH-TC27: Search with empty string → return all
   * WH-TC28: Search with whitespace only → return all or none
   * WH-TC29: Search with special chars → handle safely
   * WH-TC30: Search with SQL injection → sanitized, no error
   * WH-TC31: Filter code + search combined → 200
   * WH-TC32: Multiple filters + sort → 200
   * WH-TC33: Page beyond total pages → empty array
   * WH-TC34: Case insensitive search → 200
   * WH-TC35: Partial code match → 200
   */
  async findAll(query: QueryWarehouseDto) {
    this.logger.log(`Finding all warehouses with query: ${JSON.stringify(query)}`);
    const { search, code, limit = 20, page = 1 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (code) {
      where.code = { contains: code, mode: 'insensitive' };
    }

    const { warehouses, total } = await this.warehouseRepo.findAll({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: warehouses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * GET /warehouses/:id - Test Cases: 8
   * Basic:
   * WH-TC36: Find by valid ID → 200
   * WH-TC37: Not found → 404
   * WH-TC38: Cache hit on repeated call → 200
   * WH-TC39: No auth → 401 (tested by guard)

   * Edge Cases:
   * WH-TC40: Invalid UUID format → 400 or 404
   * WH-TC41: Empty string ID → 400
   * WH-TC42: SQL injection in ID → sanitized, 404
   * WH-TC43: Very long ID string → 400 or 404
   */
  async findOne(id: string) {
    this.logger.debug(`Finding warehouse by ID: ${id}`);
    const cacheKey = `${CACHE_PREFIX.WAREHOUSE}:id:${id}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const warehouse = await this.warehouseRepo.findOne(id);
        if (!warehouse) {
          throw new NotFoundException(`Warehouse with ID "${id}" not found`);
        }

        // Get warehouse statistics
        const stats = await this.warehouseRepo.getWarehouseStats(id);

        return {
          success: true,
          data: warehouse,
          stats,
        };
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

  /**
   * GET /warehouses/code/:code - Test Cases: 8
   * Basic:
   * WH-TC44: Find by valid code → 200
   * WH-TC45: Not found → 404
   * WH-TC46: Cache hit on repeated call → 200
   * WH-TC47: No auth → 401 (tested by guard)

   * Edge Cases:
   * WH-TC48: Case insensitive code → 200
   * WH-TC49: Code with special chars → 200 or 404
   * WH-TC50: Empty string code → 404 or 400
   * WH-TC51: SQL injection in code → sanitized, 404
   */
  async findByCode(code: string) {
    this.logger.debug(`Finding warehouse by code: ${code}`);
    const cacheKey = `${CACHE_PREFIX.WAREHOUSE}:code:${code}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const warehouse = await this.warehouseRepo.findByCode(code);
        if (!warehouse) {
          throw new NotFoundException(`Warehouse with code "${code}" not found`);
        }

        const stats = await this.warehouseRepo.getWarehouseStats(warehouse.id);

        return {
          success: true,
          data: warehouse,
          stats,
        };
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

  /**
   * PATCH /warehouses/:id - Test Cases: 18
   * Basic:
   * WH-TC52: Update with valid data → 200
   * WH-TC53: Duplicate code → 409
   * WH-TC54: Not found → 404
   * WH-TC55: No permission → 403 (tested by guard)
   * WH-TC56: No auth → 401 (tested by guard)

   * Edge Cases:
   * WH-TC57: Update only name → 200
   * WH-TC58: Update only code → 200
   * WH-TC59: Update only address → 200
   * WH-TC60: Update only metadata → 200
   * WH-TC61: Update all fields at once → 200
   * WH-TC62: Update with empty object → 200 (no changes)
   * WH-TC63: Update code to same value → 200
   * WH-TC64: Update with empty string name → 400
   * WH-TC65: Update with null values → 400 or strip nulls
   * WH-TC66: Update code with special chars → 400 or 200
   * WH-TC67: Update with very long strings → 400
   * WH-TC68: Duplicate code (case insensitive) → 409
   * WH-TC69: Update metadata with nested objects → 200
   */
  async update(id: string, updateDto: UpdateWarehouseDto) {
    this.logger.log(`Updating warehouse: ${id}`);
    const warehouse = await this.warehouseRepo.findOne(id);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID "${id}" not found`);
    }

    // Check if new code conflicts with existing warehouses
    if (updateDto.code && updateDto.code !== warehouse.code) {
      const existingCode = await this.warehouseRepo.checkCodeExists(updateDto.code, id);
      if (existingCode) {
        throw new ConflictException(`Warehouse with code "${updateDto.code}" already exists`);
      }
    }

    const updateData: any = {};
    if (updateDto.code !== undefined) updateData.code = updateDto.code;
    if (updateDto.name !== undefined) updateData.name = updateDto.name;
    if (updateDto.address !== undefined) updateData.address = updateDto.address;
    if (updateDto.metadata !== undefined) updateData.metadata = updateDto.metadata;

    const updatedWarehouse = await this.warehouseRepo.update(id, updateData);

    // Invalidate warehouse cache
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.WAREHOUSE);
    this.logger.log(`Warehouse updated successfully: ${id}`);

    // Audit log
    this.auditMiddleware
      .logUpdate(
        'Warehouse',
        id,
        warehouse as Record<string, unknown>,
        updatedWarehouse as Record<string, unknown>,
      )
      .catch((err) => {
        this.logger.error('Failed to write audit log for warehouse update', err);
      });

    return {
      success: true,
      data: updatedWarehouse,
      message: 'Warehouse updated successfully',
    };
  }

  /**
   * DELETE /warehouses/:id - Test Cases: 8
   * Basic:
   * WH-TC70: Delete valid warehouse → 200
   * WH-TC71: Not found → 404
   * WH-TC72: Has locations → 400
   * WH-TC73: No permission → 403 (tested by guard)
   * WH-TC74: No auth → 401 (tested by guard)

   * Edge Cases:
   * WH-TC75: Delete with empty locations array → 200
   * WH-TC76: Invalid ID format → 400 or 404
   * WH-TC77: Concurrent delete → 404 for second request
   */
  async remove(id: string) {
    this.logger.log(`Removing warehouse: ${id}`);
    const warehouse = await this.warehouseRepo.findOne(id);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID "${id}" not found`);
    }

    // Check if warehouse has locations
    const warehouseWithLocations = warehouse as typeof warehouse & {
      locations?: Array<{ id: string }>;
    };
    if (warehouseWithLocations.locations && warehouseWithLocations.locations.length > 0) {
      throw new BadRequestException(
        'Cannot delete a warehouse with existing locations. Please delete all locations first.',
      );
    }

    await this.warehouseRepo.delete(id);

    // Invalidate warehouse cache
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.WAREHOUSE);
    this.logger.log(`Warehouse deleted successfully: ${id}`);

    // Audit log
    this.auditMiddleware
      .logDelete('Warehouse', id, warehouse as Record<string, unknown>)
      .catch((err) => {
        this.logger.error('Failed to write audit log for warehouse delete', err);
      });

    return {
      success: true,
      message: 'Warehouse deleted successfully',
    };
  }

  /**
   * GET /warehouses/:id/stats - Test Cases: 5
   * Basic:
   * WH-TC78: Get stats for valid warehouse → 200
   * WH-TC79: Not found → 404
   * WH-TC80: No auth → 401 (tested by guard)

   * Edge Cases:
   * WH-TC81: Warehouse with no locations → stats with zeros
   * WH-TC82: Warehouse with many locations → stats calculated correctly
   */
  async getWarehouseStats(id: string) {
    this.logger.debug(`Getting stats for warehouse: ${id}`);
    const warehouse = await this.warehouseRepo.findOne(id);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID "${id}" not found`);
    }

    const stats = await this.warehouseRepo.getWarehouseStats(id);

    return {
      success: true,
      warehouseId: id,
      warehouseName: warehouse.name,
      warehouseCode: warehouse.code,
      ...stats,
    };
  }
}
