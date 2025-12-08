import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma, Supplier } from '@prisma/client';

@Injectable()
export class SupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SupplierCreateInput): Promise<Supplier> {
    return this.prisma.supplier.create({ data });
  }

  async findById(id: string): Promise<Supplier | null> {
    return this.prisma.supplier.findUnique({
      where: { id },
    });
  }

  async findUnique(where: Prisma.SupplierWhereUniqueInput): Promise<Supplier | null> {
    return this.prisma.supplier.findUnique({
      where,
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SupplierWhereInput;
    orderBy?: Prisma.SupplierOrderByWithRelationInput[];
  }): Promise<Supplier[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.supplier.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  async count(where?: Prisma.SupplierWhereInput): Promise<number> {
    return this.prisma.supplier.count({
      where,
    });
  }

  async countActivePurchaseOrders(supplierId: string): Promise<number> {
    return this.prisma.purchaseOrder.count({
      where: {
        supplierId,
        status: {
          in: ['draft', 'ordered', 'partial'],
        },
      },
    });
  }

  async update(id: string, data: Prisma.SupplierUpdateInput): Promise<Supplier> {
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Supplier> {
    // Note: Supplier model does not have deletedAt field, so we use hard delete
    return this.prisma.supplier.delete({ where: { id } });
  }
}
