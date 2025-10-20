import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma, Location } from '@prisma/client';

@Injectable()
export class LocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.LocationCreateInput): Promise<Location> {
    return this.prisma.location.create({
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
  }

  async findAll(params: {
    where?: Prisma.LocationWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.LocationOrderByWithRelationInput;
  }): Promise<{ locations: Location[]; total: number }> {
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
  }

  async findOne(id: string): Promise<Location | null> {
    return this.prisma.location.findUnique({
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
  }

  async findByCode(warehouseId: string, code: string): Promise<Location | null> {
    return this.prisma.location.findUnique({
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
  }

  async update(id: string, data: Prisma.LocationUpdateInput): Promise<Location> {
    return this.prisma.location.update({
      where: { id },
      data,
      include: {
        warehouse: true,
        inventory: {
          take: 5,
        },
      },
    });
  }

  async delete(id: string): Promise<Location> {
    return this.prisma.location.delete({ where: { id } });
  }

  async checkCodeExistsInWarehouse(
    warehouseId: string,
    code: string,
    excludeId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.location.count({
      where: {
        warehouseId,
        code,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });
    return count > 0;
  }

  async getLocationStats(locationId: string): Promise<{
    totalInventoryItems: number;
    totalQuantity: number;
    totalReservedQuantity: number;
    utilizationRate: number;
  }> {
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
    const totalReservedQuantity = location.inventory.reduce((sum, inv) => sum + inv.reservedQty, 0);

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
  }

  async findByWarehouse(warehouseId: string): Promise<Location[]> {
    return this.prisma.location.findMany({
      where: { warehouseId },
      orderBy: { code: 'asc' },
      include: {
        warehouse: true,
        inventory: {
          take: 3,
        },
      },
    });
  }

  async findAvailableLocations(warehouseId: string, minCapacity?: number): Promise<Location[]> {
    return this.prisma.location.findMany({
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
  }
}
