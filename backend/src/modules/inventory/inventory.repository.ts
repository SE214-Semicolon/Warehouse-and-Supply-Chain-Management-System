import { Injectable } from '@nestjs/common';
import { Inventory } from '@prisma/client';
import { PrismaService } from 'src/database/prisma/prisma.service';

@Injectable()
export class InventoryRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    productBatchId: string;
    locationId: string;
    availableQty?: number;
    reservedQty?: number;
  }): Promise<Inventory> {
    return await this.prisma.inventory.create({ data });
  }

  async findAll(): Promise<Inventory[]> {
    return await this.prisma.inventory.findMany({
      include: {
        productBatch: true,
        location: true,
      },
    });
  }

  async findOne(id: string): Promise<Inventory | null> {
    return await this.prisma.inventory.findUnique({ where: { id } });
  }

  async update(id: string, data: Partial<Inventory>): Promise<Inventory> {
    return await this.prisma.inventory.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.inventory.delete({ where: { id } });
  }
}
