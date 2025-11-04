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
      location,
      message: 'Location created successfully',
    };
  }

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
      locations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

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
          location,
          stats,
        };
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

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
          location,
          stats,
        };
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

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
          locations,
          total: locations.length,
        };
      },
      { ttl: CACHE_TTL.SHORT },
    );
  }

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
      locations: availableLocations,
      total: locations.length,
    };
  }

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
      location: updatedLocation,
      message: 'Location updated successfully',
    };
  }

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
