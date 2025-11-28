import { Location, Prisma } from '@prisma/client';

export interface ILocationRepository {
  create(data: Prisma.LocationCreateInput): Promise<Location>;

  findAll(params: {
    where?: Prisma.LocationWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.LocationOrderByWithRelationInput;
  }): Promise<{ locations: Location[]; total: number }>;

  findOne(id: string): Promise<Location | null>;

  findByCode(warehouseId: string, code: string): Promise<Location | null>;

  update(id: string, data: Prisma.LocationUpdateInput): Promise<Location>;

  delete(id: string): Promise<Location>;

  checkCodeExistsInWarehouse(
    warehouseId: string,
    code: string,
    excludeId?: string,
  ): Promise<boolean>;

  getLocationStats(locationId: string): Promise<{
    totalInventoryItems: number;
    totalQuantity: number;
    totalReservedQuantity: number;
    utilizationRate: number;
  }>;

  findByWarehouse(warehouseId: string): Promise<Location[]>;

  findAvailableLocations(warehouseId: string, minCapacity?: number): Promise<Location[]>;
}
