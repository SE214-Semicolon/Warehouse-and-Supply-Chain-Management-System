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
      where: { id, deletedAt: null },
    });
  }

  async findUnique(where: Prisma.SupplierWhereUniqueInput): Promise<Supplier | null> {
    return this.prisma.supplier.findFirst({
      where: { ...where, deletedAt: null },
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
      where: { ...where, deletedAt: null },
      orderBy,
    });
  }

  async count(where?: Prisma.SupplierWhereInput): Promise<number> {
    return this.prisma.supplier.count({
      where: { ...where, deletedAt: null },
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
    return this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<Supplier> {
    return this.prisma.supplier.delete({ where: { id } });
  }
}
