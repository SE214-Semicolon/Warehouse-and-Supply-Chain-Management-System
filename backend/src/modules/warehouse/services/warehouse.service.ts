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

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    private readonly warehouseRepo: WarehouseRepository,
    private readonly cacheService: CacheService,
  ) {}

  // POST /warehouses - Min Test Cases: 5 (Success 201, Duplicate 409, Missing fields 400, No permission 403, No auth 401)
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

    return {
      success: true,
      warehouse,
      message: 'Warehouse created successfully',
    };
  }

  // GET /warehouses - Min Test Cases: 6 (Get all 200, Filter code 200, Filter search 200, Page 1, Page 2, No auth 401)
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
      warehouses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // GET /warehouses/:id - Min Test Cases: 4 (Found 200, Not found 404, Cache hit 200, No auth 401)
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
          warehouse,
          stats,
        };
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

  // GET /warehouses/code/:code - Min Test Cases: 4 (Found 200, Not found 404, Cache hit 200, No auth 401)
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
          warehouse,
          stats,
        };
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

  // PATCH /warehouses/:id - Min Test Cases: 6 (Update 200, Duplicate code 409, Not found 404, No permission 403, No auth 401)
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

    return {
      success: true,
      warehouse: updatedWarehouse,
      message: 'Warehouse updated successfully',
    };
  }

  // DELETE /warehouses/:id - Min Test Cases: 5 (Delete 200, Not found 404, Has locations 400, No permission 403, No auth 401)
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

    return {
      success: true,
      message: 'Warehouse deleted successfully',
    };
  }

  // GET /warehouses/:id/stats - Min Test Cases: 3 (Get stats 200, Not found 404, No auth 401)
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
