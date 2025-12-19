import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { LocationRepository } from '../repositories/location.repository';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { CreateLocationDto } from '../dto/create-location.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { QueryLocationDto } from '../dto/query-location.dto';
import { CacheService } from '../../../cache/cache.service';
import { CACHE_TTL, CACHE_PREFIX } from '../../../cache/cache.constants';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private readonly locationRepo: LocationRepository,
    private readonly warehouseRepo: WarehouseRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * POST /locations - Test Cases: 18
   * Basic:
   * LOC-TC01: Create with valid data → 201
   * LOC-TC02: Warehouse not found → 404
   * LOC-TC03: Duplicate code in same warehouse → 409
   * LOC-TC04: Invalid data → 400 (tested by DTO)
   * LOC-TC05: No permission → 403 (tested by guard)
   * LOC-TC06: No auth → 401 (tested by guard)
   *
   * Edge Cases:
   * LOC-TC07: Empty string code → 400
   * LOC-TC08: Whitespace only name → 400
   * LOC-TC09: Negative capacity → 400
   * LOC-TC10: Zero capacity → 400 or 201 based on business rules
   * LOC-TC11: Very large capacity (>1000000) → 201 or 400
   * LOC-TC12: Code with special chars → 201 or 400
   * LOC-TC13: Very long code (>50 chars) → 400
   * LOC-TC14: Invalid type value → 400
   * LOC-TC15: Duplicate code (case insensitive) same warehouse → 409
   * LOC-TC16: Same code different warehouse → 201
   * LOC-TC17: SQL injection in code → sanitized
   * LOC-TC18: Complex nested properties → 201
   */
  async create(createDto: CreateLocationDto) {
    this.logger.log(
      `Creating location with code: ${createDto.code} in warehouse: ${createDto.warehouseId}`,
    );
    // Validate warehouse exists
    const warehouse = await this.warehouseRepo.findOne(createDto.warehouseId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID "${createDto.warehouseId}" not found`);
    }

    // Check if location code already exists in this warehouse
    const existingCode = await this.locationRepo.checkCodeExistsInWarehouse(
      createDto.warehouseId,
      createDto.code,
    );
    if (existingCode) {
      throw new ConflictException(
        `Location with code "${createDto.code}" already exists in warehouse "${warehouse.name}"`,
      );
    }

    const location = await this.locationRepo.create({
      code: createDto.code,
      name: createDto.name,
      capacity: createDto.capacity,
      type: createDto.type,
      properties: createDto.properties || {},
      warehouse: {
        connect: { id: createDto.warehouseId },
      },
    });

    // Invalidate warehouse cache
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.WAREHOUSE);
    this.logger.log(`Location created successfully: ${location.id}`);

    return {
      success: true,
      data: location,
      message: 'Location created successfully',
    };
  }

  /**
   * GET /locations - Test Cases: 25
   * Basic:
   * LOC-TC19: Get all with default pagination → 200
   * LOC-TC20: Filter by warehouse → 200
   * LOC-TC21: Filter by type → 200
   * LOC-TC22: Filter by search → 200
   * LOC-TC23: Pagination page 1 → 200
   * LOC-TC24: Pagination page 2 → 200
   * LOC-TC25: No auth → 401 (tested by guard)
   *
   * Edge Cases:
   * LOC-TC26: Page = 0 → default to 1 or 400
   * LOC-TC27: Negative page → default to 1 or 400
   * LOC-TC28: Limit = 0 → use default or 400
   * LOC-TC29: Negative limit → use default or 400
   * LOC-TC30: Very large limit (>1000) → cap at max
   * LOC-TC31: Search with empty string → return all
   * LOC-TC32: Search with SQL injection → sanitized
   * LOC-TC33: Filter warehouse + type → 200
   * LOC-TC34: Filter warehouse + search → 200
   * LOC-TC35: Filter type + search → 200
   * LOC-TC36: All filters combined → 200
   * LOC-TC37: Invalid warehouse ID filter → empty result
   * LOC-TC38: Case insensitive type filter → 200
   * LOC-TC39: Case insensitive search → 200
   * LOC-TC40: Partial code match → 200
   * LOC-TC41: Page beyond total pages → empty array
   * LOC-TC42: Sort by code ascending → 200
   * LOC-TC43: Invalid type value → empty result or all
   */
  async findAll(query: QueryLocationDto) {
    this.logger.log(`Finding all locations with query: ${JSON.stringify(query)}`);
    const { warehouseId, search, type, limit = 20, page = 1 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = { contains: type, mode: 'insensitive' };
    }

    const { locations, total } = await this.locationRepo.findAll({
      where,
      skip,
      take: limit,
      orderBy: { code: 'asc' },
    });

    return {
      success: true,
      data: locations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * GET /locations/:id - Test Cases: 8
   * Basic:
   * LOC-TC44: Find by valid ID → 200
   * LOC-TC45: Not found → 404
   * LOC-TC46: Cache hit on repeated call → 200
   * LOC-TC47: No auth → 401 (tested by guard)
   *
   * Edge Cases:
   * LOC-TC48: Invalid UUID format → 400 or 404
   * LOC-TC49: Empty string ID → 400
   * LOC-TC50: SQL injection in ID → sanitized, 404
   * LOC-TC51: Very long ID string → 400 or 404
   */
  async findOne(id: string) {
    this.logger.debug(`Finding location by ID: ${id}`);
    const cacheKey = `${CACHE_PREFIX.WAREHOUSE}:location:id:${id}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const location = await this.locationRepo.findOne(id);
        if (!location) {
          throw new NotFoundException(`Location with ID "${id}" not found`);
        }

        // Get location statistics
        const stats = await this.locationRepo.getLocationStats(id);

        return {
          success: true,
          data: location,
          stats,
        };
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

  /**
   * GET /locations/code/:warehouseId/:code - Test Cases: 10
   * Basic:
   * LOC-TC52: Find by valid code → 200
   * LOC-TC53: Not found → 404
   * LOC-TC54: Cache hit on repeated call → 200
   * LOC-TC55: No auth → 401 (tested by guard)
   *
   * Edge Cases:
   * LOC-TC56: Invalid warehouse ID → 404
   * LOC-TC57: Case insensitive code → 200
   * LOC-TC58: Code with special chars → 200 or 404
   * LOC-TC59: Empty string code → 404 or 400
   * LOC-TC60: SQL injection in code → sanitized, 404
   * LOC-TC61: Valid code wrong warehouse → 404
   */
  async findByCode(warehouseId: string, code: string) {
    this.logger.debug(`Finding location by code: ${code} in warehouse: ${warehouseId}`);
    const cacheKey = `${CACHE_PREFIX.WAREHOUSE}:location:${warehouseId}:${code}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const location = await this.locationRepo.findByCode(warehouseId, code);
        if (!location) {
          throw new NotFoundException(
            `Location with code "${code}" not found in warehouse "${warehouseId}"`,
          );
        }

        const stats = await this.locationRepo.getLocationStats(location.id);

        return {
          success: true,
          data: location,
          stats,
        };
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

  /**
   * GET /locations/warehouse/:warehouseId - Test Cases: 8
   * Basic:
   * LOC-TC62: Find by valid warehouse → 200
   * LOC-TC63: Warehouse not found → 404
   * LOC-TC64: Cache hit on repeated call → 200
   * LOC-TC65: No auth → 401 (tested by guard)
   *
   * Edge Cases:
   * LOC-TC66: Warehouse with no locations → empty array
   * LOC-TC67: Warehouse with many locations → all returned
   * LOC-TC68: Invalid warehouse ID format → 404
   * LOC-TC69: SQL injection in warehouse ID → sanitized, 404
   */
  async findByWarehouse(warehouseId: string) {
    this.logger.debug(`Finding locations by warehouse: ${warehouseId}`);
    const cacheKey = `${CACHE_PREFIX.WAREHOUSE}:locations:warehouse:${warehouseId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const warehouse = await this.warehouseRepo.findOne(warehouseId);
        if (!warehouse) {
          throw new NotFoundException(`Warehouse with ID "${warehouseId}" not found`);
        }

        const locations = await this.locationRepo.findByWarehouse(warehouseId);

        return {
          success: true,
          warehouse: {
            id: warehouse.id,
            code: warehouse.code,
            name: warehouse.name,
          },
          data: locations,
          total: locations.length,
        };
      },
      { ttl: CACHE_TTL.SHORT },
    );
  }

  /**
   * GET /locations/available/:warehouseId - Test Cases: 12
   * Basic:
   * LOC-TC70: Get available locations → 200
   * LOC-TC71: With minCapacity filter → 200
   * LOC-TC72: Warehouse not found → 404
   * LOC-TC73: Empty result → 200 with empty array
   * LOC-TC74: No auth → 401 (tested by guard)
   *
   * Edge Cases:
   * LOC-TC75: minCapacity = 0 → return all available
   * LOC-TC76: Negative minCapacity → ignore or 400
   * LOC-TC77: Very large minCapacity → empty result
   * LOC-TC78: All locations full (100% utilization) → empty
   * LOC-TC79: All locations partially full → all returned
   * LOC-TC80: Mixed utilization → only <100% returned
   * LOC-TC81: Invalid warehouse ID → 404
   */
  async findAvailableLocations(warehouseId: string, minCapacity?: number) {
    this.logger.debug(
      `Finding available locations in warehouse: ${warehouseId} with minCapacity: ${minCapacity}`,
    );
    const warehouse = await this.warehouseRepo.findOne(warehouseId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID "${warehouseId}" not found`);
    }

    const locations = await this.locationRepo.findAvailableLocations(warehouseId, minCapacity);

    // Filter by utilization if needed (optional enhancement)
    const availableLocations: typeof locations = [];
    for (const location of locations) {
      const stats = await this.locationRepo.getLocationStats(location.id);
      if (stats.utilizationRate < 100) {
        availableLocations.push(location);
      }
    }

    return {
      success: true,
      warehouseId,
      minCapacity,
      data: availableLocations,
      total: locations.length,
    };
  }

  /**
   * PATCH /locations/:id - Test Cases: 22
   * Basic:
   * LOC-TC82: Update with valid data → 200
   * LOC-TC83: Duplicate code → 409
   * LOC-TC84: Not found → 404
   * LOC-TC85: No permission → 403 (tested by guard)
   * LOC-TC86: No auth → 401 (tested by guard)
   *
   * Edge Cases:
   * LOC-TC87: Update only name → 200
   * LOC-TC88: Update only code → 200
   * LOC-TC89: Update only capacity → 200
   * LOC-TC90: Update only type → 200
   * LOC-TC91: Update only properties → 200
   * LOC-TC92: Update all fields at once → 200
   * LOC-TC93: Update with empty object → 200 (no changes)
   * LOC-TC94: Update code to same value → 200
   * LOC-TC95: Update capacity to negative → 400
   * LOC-TC96: Update capacity to zero → 400 or 200
   * LOC-TC97: Update capacity smaller than current usage → 400 or allow with warning
   * LOC-TC98: Update with empty string name → 400
   * LOC-TC99: Update with null values → 400 or strip nulls
   * LOC-TC100: Update code with special chars → 400 or 200
   * LOC-TC101: Duplicate code (case insensitive) → 409
   * LOC-TC102: Update type to invalid value → 400
   * LOC-TC103: Update properties with nested objects → 200
   */
  async update(id: string, updateDto: UpdateLocationDto) {
    this.logger.log(`Updating location: ${id}`);
    const location = await this.locationRepo.findOne(id);
    if (!location) {
      throw new NotFoundException(`Location with ID "${id}" not found`);
    }

    // Check if new code conflicts with existing locations in the same warehouse
    if (updateDto.code && updateDto.code !== location.code) {
      const existingCode = await this.locationRepo.checkCodeExistsInWarehouse(
        location.warehouseId,
        updateDto.code,
        id,
      );
      if (existingCode) {
        throw new ConflictException(
          `Location with code "${updateDto.code}" already exists in this warehouse`,
        );
      }
    }

    const updateData: any = {};
    if (updateDto.code !== undefined) updateData.code = updateDto.code;
    if (updateDto.name !== undefined) updateData.name = updateDto.name;
    if (updateDto.capacity !== undefined) updateData.capacity = updateDto.capacity;
    if (updateDto.type !== undefined) updateData.type = updateDto.type;
    if (updateDto.properties !== undefined) updateData.properties = updateDto.properties;

    const updatedLocation = await this.locationRepo.update(id, updateData);

    // Invalidate warehouse cache
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.WAREHOUSE);
    this.logger.log(`Location updated successfully: ${id}`);

    return {
      success: true,
      data: updatedLocation,
      message: 'Location updated successfully',
    };
  }

  /**
   * DELETE /locations/:id - Test Cases: 10
   * Basic:
   * LOC-TC104: Delete valid location → 200
   * LOC-TC105: Not found → 404
   * LOC-TC106: Has inventory with stock → 400
   * LOC-TC107: No permission → 403 (tested by guard)
   * LOC-TC108: No auth → 401 (tested by guard)
   *
   * Edge Cases:
   * LOC-TC109: Has inventory with zero qty → 200
   * LOC-TC110: Has reserved qty only → 400
   * LOC-TC111: Empty inventory array → 200
   * LOC-TC112: Invalid ID format → 400 or 404
   * LOC-TC113: Concurrent delete → 404 for second request
   */
  async remove(id: string) {
    this.logger.log(`Removing location: ${id}`);
    const location = await this.locationRepo.findOne(id);
    if (!location) {
      throw new NotFoundException(`Location with ID "${id}" not found`);
    }

    // Check if location has inventory
    const locationWithInventory = location as typeof location & {
      inventory?: Array<{ availableQty: number; reservedQty: number }>;
    };
    if (
      locationWithInventory.inventory &&
      Array.isArray(locationWithInventory.inventory) &&
      locationWithInventory.inventory.length > 0
    ) {
      let hasStock = false;
      for (const inv of locationWithInventory.inventory) {
        if (inv.availableQty > 0 || inv.reservedQty > 0) {
          hasStock = true;
          break;
        }
      }
      if (hasStock) {
        throw new BadRequestException(
          'Cannot delete a location with existing inventory. Please move or clear inventory first.',
        );
      }
    }

    await this.locationRepo.delete(id);

    // Invalidate warehouse cache
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.WAREHOUSE);
    this.logger.log(`Location deleted successfully: ${id}`);

    return {
      success: true,
      message: 'Location deleted successfully',
    };
  }

  /**
   * GET /locations/:id/stats - Test Cases: 6
   * Basic:
   * LOC-TC114: Get stats for valid location → 200
   * LOC-TC115: Not found → 404
   * LOC-TC116: No auth → 401 (tested by guard)
   *
   * Edge Cases:
   * LOC-TC117: Location with no inventory → stats with zeros
   * LOC-TC118: Location with full capacity → 100% utilization
   * LOC-TC119: Location with reserved inventory → stats include reserved
   */
  async getLocationStats(id: string) {
    this.logger.debug(`Getting stats for location: ${id}`);
    const location = await this.locationRepo.findOne(id);
    if (!location) {
      throw new NotFoundException(`Location with ID "${id}" not found`);
    }

    const stats = await this.locationRepo.getLocationStats(id);
    const locationWithWarehouse = location as typeof location & { warehouse?: { name: string } };

    return {
      success: true,
      locationId: id,
      locationCode: location.code,
      locationName: location.name,
      warehouseName: locationWithWarehouse.warehouse?.name || 'Unknown',
      capacity: location.capacity,
      ...stats,
    };
  }
}
