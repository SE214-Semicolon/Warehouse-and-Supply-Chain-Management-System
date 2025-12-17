import { Prisma, Supplier } from '@prisma/client';

export interface ISupplierRepository {
  create(data: Prisma.SupplierCreateInput): Promise<Supplier>;

  findById(id: string): Promise<Supplier | null>;

  findUnique(where: Prisma.SupplierWhereUniqueInput): Promise<Supplier | null>;

  findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SupplierWhereInput;
    orderBy?: Prisma.SupplierOrderByWithRelationInput[];
  }): Promise<Supplier[]>;

  count(where?: Prisma.SupplierWhereInput): Promise<number>;

  countActivePurchaseOrders(supplierId: string): Promise<number>;

  update(id: string, data: Prisma.SupplierUpdateInput): Promise<Supplier>;

  remove(id: string): Promise<Supplier>;

  hardDelete(id: string): Promise<Supplier>;
}
