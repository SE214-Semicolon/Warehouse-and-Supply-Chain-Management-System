import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma, Warehouse } from '@prisma/client';

@Injectable()
export class WarehouseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WarehouseCreateInput): Promise<Warehouse> {
    return this.prisma.warehouse.create({
      data,
      include: {
        locations: {
          take: 10,
          orderBy: { code: 'asc' },
        },
      },
    });
  }

  async findAll(params: {
    where?: Prisma.WarehouseWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.WarehouseOrderByWithRelationInput;
  }): Promise<{ warehouses: Warehouse[]; total: number }> {
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
  }

  async findOne(id: string): Promise<Warehouse | null> {
    return this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        locations: {
          orderBy: { code: 'asc' },
        },
      },
    });
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    return this.prisma.warehouse.findUnique({
      where: { code },
      include: {
        locations: {
          take: 10,
          orderBy: { code: 'asc' },
        },
      },
    });
  }

  async update(id: string, data: Prisma.WarehouseUpdateInput): Promise<Warehouse> {
    return this.prisma.warehouse.update({
      where: { id },
      data,
      include: {
        locations: {
          take: 10,
          orderBy: { code: 'asc' },
        },
      },
    });
  }

  async delete(id: string): Promise<Warehouse> {
    return this.prisma.warehouse.delete({ where: { id } });
  }

  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.warehouse.count({
      where: {
        code,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });
    return count > 0;
  }

  async getWarehouseStats(warehouseId: string): Promise<{
    totalLocations: number;
    totalCapacity: number;
    occupiedLocations: number;
  }> {
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
  }
}
