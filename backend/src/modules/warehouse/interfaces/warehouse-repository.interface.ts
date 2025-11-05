import { Warehouse, Prisma } from '@prisma/client';

export interface IWarehouseRepository {
  create(data: Prisma.WarehouseCreateInput): Promise<Warehouse>;

  findAll(params: {
    where?: Prisma.WarehouseWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.WarehouseOrderByWithRelationInput;
  }): Promise<{ warehouses: Warehouse[]; total: number }>;

  findOne(id: string): Promise<Warehouse | null>;

  findByCode(code: string): Promise<Warehouse | null>;

  update(id: string, data: Prisma.WarehouseUpdateInput): Promise<Warehouse>;

  delete(id: string): Promise<Warehouse>;

  checkCodeExists(code: string, excludeId?: string): Promise<boolean>;

  getWarehouseStats(warehouseId: string): Promise<{
    totalLocations: number;
    totalCapacity: number;
    occupiedLocations: number;
  }>;
}
