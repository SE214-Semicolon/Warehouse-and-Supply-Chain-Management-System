import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { LocationRepository } from '../repositories/location.repository';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { CreateLocationDto } from '../dto/create-location.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { QueryLocationDto } from '../dto/query-location.dto';

@Injectable()
export class LocationService {
  constructor(
    private readonly locationRepo: LocationRepository,
    private readonly warehouseRepo: WarehouseRepository,
  ) {}

  async create(createDto: CreateLocationDto) {
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

    return {
      success: true,
      location,
      message: 'Location created successfully',
    };
  }

  async findAll(query: QueryLocationDto) {
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
  }

  async findByCode(warehouseId: string, code: string) {
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
  }

  async findByWarehouse(warehouseId: string) {
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
  }

  async findAvailableLocations(warehouseId: string, minCapacity?: number) {
    const warehouse = await this.warehouseRepo.findOne(warehouseId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID "${warehouseId}" not found`);
    }

    const locations = await this.locationRepo.findAvailableLocations(warehouseId, minCapacity);

    // Filter by utilization if needed (optional enhancement)
    const availableLocations = locations.filter(async (location) => {
      const stats = await this.locationRepo.getLocationStats(location.id);
      return stats.utilizationRate < 100; // Not fully utilized
    });

    return {
      success: true,
      warehouseId,
      minCapacity,
      locations: await Promise.all(availableLocations),
      total: locations.length,
    };
  }

  async update(id: string, updateDto: UpdateLocationDto) {
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

    return {
      success: true,
      location: updatedLocation,
      message: 'Location updated successfully',
    };
  }

  async remove(id: string) {
    const location = await this.locationRepo.findOne(id);
    if (!location) {
      throw new NotFoundException(`Location with ID "${id}" not found`);
    }

    // Check if location has inventory
    if (location.inventory && location.inventory.length > 0) {
      const hasStock = location.inventory.some(
        (inv) => inv.availableQty > 0 || inv.reservedQty > 0,
      );
      if (hasStock) {
        throw new BadRequestException(
          'Cannot delete a location with existing inventory. Please move or clear inventory first.',
        );
      }
    }

    await this.locationRepo.delete(id);

    return {
      success: true,
      message: 'Location deleted successfully',
    };
  }

  async getLocationStats(id: string) {
    const location = await this.locationRepo.findOne(id);
    if (!location) {
      throw new NotFoundException(`Location with ID "${id}" not found`);
    }

    const stats = await this.locationRepo.getLocationStats(id);

    return {
      success: true,
      locationId: id,
      locationCode: location.code,
      locationName: location.name,
      warehouseName: location.warehouse.name,
      capacity: location.capacity,
      ...stats,
    };
  }
}
