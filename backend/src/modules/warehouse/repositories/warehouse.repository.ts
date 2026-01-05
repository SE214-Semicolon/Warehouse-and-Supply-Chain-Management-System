import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma, Warehouse } from '@prisma/client';
import { IWarehouseRepository } from '../interfaces/warehouse-repository.interface';

@Injectable()
export class WarehouseRepository implements IWarehouseRepository {
  private readonly logger = new Logger(WarehouseRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WarehouseCreateInput): Promise<Warehouse> {
    try {
      this.logger.log(`Creating warehouse with code: ${data.code}`);
      const warehouse = await this.prisma.warehouse.create({
        data,
        include: {
          locations: {
            take: 10,
            orderBy: { code: 'asc' },
          },
        },
      });
      this.logger.log(`Warehouse created successfully: ${warehouse.id}`);
      return warehouse;
    } catch (error) {
      this.logger.error(`Error creating warehouse with code ${data.code}:`, error);
      throw error;
    }
  }

  async findAll(params: {
    where?: Prisma.WarehouseWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.WarehouseOrderByWithRelationInput;
  }): Promise<{ warehouses: Warehouse[]; total: number }> {
    try {
      this.logger.debug(`Finding all warehouses with params: ${JSON.stringify(params)}`);
      const { where, skip, take, orderBy } = params;

      const [warehouses, total] = await Promise.all([
        this.prisma.warehouse.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            locations: {
              take: 10,
              orderBy: { code: 'asc' },
            },
          },
        }),
        this.prisma.warehouse.count({ where }),
      ]);

      return { warehouses, total };
    } catch (error) {
      this.logger.error('Error finding all warehouses:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Warehouse | null> {
    try {
      this.logger.debug(`Finding warehouse by ID: ${id}`);
      return await this.prisma.warehouse.findUnique({
        where: { id },
        include: {
          locations: {
            orderBy: { code: 'asc' },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error finding warehouse ${id}:`, error);
      throw error;
    }
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    try {
      this.logger.debug(`Finding warehouse by code: ${code}`);
      return await this.prisma.warehouse.findUnique({
        where: { code },
        include: {
          locations: {
            take: 10,
            orderBy: { code: 'asc' },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error finding warehouse by code ${code}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Prisma.WarehouseUpdateInput): Promise<Warehouse> {
    try {
      this.logger.log(`Updating warehouse ${id}`);
      const warehouse = await this.prisma.warehouse.update({
        where: { id },
        data,
        include: {
          locations: {
            take: 10,
            orderBy: { code: 'asc' },
          },
        },
      });
      this.logger.log(`Warehouse updated successfully: ${id}`);
      return warehouse;
    } catch (error) {
      this.logger.error(`Error updating warehouse ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<Warehouse> {
    try {
      this.logger.log(`Deleting warehouse ${id}`);
      const warehouse = await this.prisma.warehouse.delete({ where: { id } });
      this.logger.log(`Warehouse deleted successfully: ${id}`);
      return warehouse;
    } catch (error) {
      this.logger.error(`Error deleting warehouse ${id}:`, error);
      throw error;
    }
  }

  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking if warehouse code ${code} exists (case-insensitive)`);
      const count = await this.prisma.warehouse.count({
        where: {
          code: {
            equals: code,
            mode: 'insensitive',
          },
          id: excludeId ? { not: excludeId } : undefined,
        },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking warehouse code existence:`, error);
      throw error;
    }
  }

  async getWarehouseStats(warehouseId: string): Promise<{
    totalLocations: number;
    totalCapacity: number;
    occupiedLocations: number;
  }> {
    try {
      this.logger.debug(`Getting stats for warehouse: ${warehouseId}`);
      const [totalLocations, capacityData, occupiedLocations] = await Promise.all([
        this.prisma.location.count({
          where: { warehouseId },
        }),
        this.prisma.location.aggregate({
          where: { warehouseId },
          _sum: {
            capacity: true,
          },
        }),
        this.prisma.location.count({
          where: {
            warehouseId,
            inventory: {
              some: {
                OR: [{ availableQty: { gt: 0 } }, { reservedQty: { gt: 0 } }],
              },
            },
          },
        }),
      ]);

      return {
        totalLocations,
        totalCapacity: capacityData._sum.capacity || 0,
        occupiedLocations,
      };
    } catch (error) {
      this.logger.error(`Error getting warehouse stats for ${warehouseId}:`, error);
      throw error;
    }
  }
}
