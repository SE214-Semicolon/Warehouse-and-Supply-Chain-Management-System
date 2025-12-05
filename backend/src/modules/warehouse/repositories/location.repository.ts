import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma, Location } from '@prisma/client';
import { ILocationRepository } from '../interfaces/location-repository.interface';

@Injectable()
export class LocationRepository implements ILocationRepository {
  private readonly logger = new Logger(LocationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.LocationCreateInput): Promise<Location> {
    try {
      this.logger.log(`Creating location with code: ${data.code}`);
      const location = await this.prisma.location.create({
        data,
        include: {
          warehouse: true,
          inventory: {
            take: 5,
            include: {
              productBatch: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });
      this.logger.log(`Location created successfully: ${location.id}`);
      return location;
    } catch (error) {
      this.logger.error(`Error creating location with code ${data.code}:`, error);
      throw error;
    }
  }

  async findAll(params: {
    where?: Prisma.LocationWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.LocationOrderByWithRelationInput;
  }): Promise<{ locations: Location[]; total: number }> {
    try {
      this.logger.debug(`Finding all locations with params: ${JSON.stringify(params)}`);
      const { where, skip, take, orderBy } = params;

      const [locations, total] = await Promise.all([
        this.prisma.location.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            warehouse: true,
            inventory: {
              take: 5,
              include: {
                productBatch: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.location.count({ where }),
      ]);

      return { locations, total };
    } catch (error) {
      this.logger.error('Error finding all locations:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Location | null> {
    try {
      this.logger.debug(`Finding location by ID: ${id}`);
      return await this.prisma.location.findUnique({
        where: { id },
        include: {
          warehouse: true,
          inventory: {
            include: {
              productBatch: {
                include: {
                  product: {
                    include: {
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error finding location ${id}:`, error);
      throw error;
    }
  }

  async findByCode(warehouseId: string, code: string): Promise<Location | null> {
    try {
      this.logger.debug(`Finding location by code: ${code} in warehouse: ${warehouseId}`);
      // Try exact match first
      let location = await this.prisma.location.findUnique({
        where: {
          warehouseId_code: {
            warehouseId,
            code,
          },
        },
        include: {
          warehouse: true,
        },
      });

      // If not found, try case-insensitive search
      if (!location) {
        location = await this.prisma.location.findFirst({
          where: {
            warehouseId,
            code: {
              equals: code,
              mode: 'insensitive',
            },
          },
          include: {
            warehouse: true,
          },
        });
      }

      return location;
    } catch (error) {
      this.logger.error(`Error finding location by code ${code}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Prisma.LocationUpdateInput): Promise<Location> {
    try {
      this.logger.log(`Updating location ${id}`);
      const location = await this.prisma.location.update({
        where: { id },
        data,
        include: {
          warehouse: true,
          inventory: {
            take: 5,
          },
        },
      });
      this.logger.log(`Location updated successfully: ${id}`);
      return location;
    } catch (error) {
      this.logger.error(`Error updating location ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<Location> {
    try {
      this.logger.log(`Deleting location ${id}`);
      const location = await this.prisma.location.delete({ where: { id } });
      this.logger.log(`Location deleted successfully: ${id}`);
      return location;
    } catch (error) {
      this.logger.error(`Error deleting location ${id}:`, error);
      throw error;
    }
  }

  async checkCodeExistsInWarehouse(
    warehouseId: string,
    code: string,
    excludeId?: string,
  ): Promise<boolean> {
    try {
      this.logger.debug(
        `Checking if location code ${code} exists in warehouse ${warehouseId} (case-insensitive)`,
      );
      const count = await this.prisma.location.count({
        where: {
          warehouseId,
          code: {
            equals: code,
            mode: 'insensitive',
          },
          id: excludeId ? { not: excludeId } : undefined,
        },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking location code existence:`, error);
      throw error;
    }
  }

  async getLocationStats(locationId: string): Promise<{
    totalInventoryItems: number;
    totalQuantity: number;
    totalReservedQuantity: number;
    utilizationRate: number;
  }> {
    try {
      this.logger.debug(`Getting stats for location: ${locationId}`);
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        include: {
          inventory: true,
        },
      });

      if (!location) {
        return {
          totalInventoryItems: 0,
          totalQuantity: 0,
          totalReservedQuantity: 0,
          utilizationRate: 0,
        };
      }

      const totalInventoryItems = location.inventory.length;
      const totalQuantity = location.inventory.reduce(
        (sum, inv) => sum + inv.availableQty + inv.reservedQty,
        0,
      );
      const totalReservedQuantity = location.inventory.reduce(
        (sum, inv) => sum + inv.reservedQty,
        0,
      );

      const utilizationRate =
        location.capacity && location.capacity > 0
          ? (totalInventoryItems / location.capacity) * 100
          : 0;

      return {
        totalInventoryItems,
        totalQuantity,
        totalReservedQuantity,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error(`Error getting location stats for ${locationId}:`, error);
      throw error;
    }
  }

  async findByWarehouse(warehouseId: string): Promise<Location[]> {
    try {
      this.logger.debug(`Finding locations by warehouse: ${warehouseId}`);
      return await this.prisma.location.findMany({
        where: { warehouseId },
        orderBy: { code: 'asc' },
        include: {
          warehouse: true,
          inventory: {
            take: 3,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error finding locations by warehouse ${warehouseId}:`, error);
      throw error;
    }
  }

  async findAvailableLocations(warehouseId: string, minCapacity?: number): Promise<Location[]> {
    try {
      this.logger.debug(
        `Finding available locations in warehouse ${warehouseId} with minCapacity: ${minCapacity}`,
      );
      return await this.prisma.location.findMany({
        where: {
          warehouseId,
          capacity: minCapacity ? { gte: minCapacity } : undefined,
        },
        orderBy: { code: 'asc' },
        include: {
          warehouse: true,
          inventory: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error finding available locations:`, error);
      throw error;
    }
  }
}
