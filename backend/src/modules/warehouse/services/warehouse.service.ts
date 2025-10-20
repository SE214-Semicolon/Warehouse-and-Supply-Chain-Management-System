import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { QueryWarehouseDto } from '../dto/query-warehouse.dto';

@Injectable()
export class WarehouseService {
  constructor(private readonly warehouseRepo: WarehouseRepository) {}

  async create(createDto: CreateWarehouseDto) {
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

    return {
      success: true,
      warehouse,
      message: 'Warehouse created successfully',
    };
  }

  async findAll(query: QueryWarehouseDto) {
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

  async findOne(id: string) {
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
  }

  async findByCode(code: string) {
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
  }

  async update(id: string, updateDto: UpdateWarehouseDto) {
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

    return {
      success: true,
      warehouse: updatedWarehouse,
      message: 'Warehouse updated successfully',
    };
  }

  async remove(id: string) {
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

    return {
      success: true,
      message: 'Warehouse deleted successfully',
    };
  }

  async getWarehouseStats(id: string) {
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
