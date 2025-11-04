import { Prisma, Product } from '@prisma/client';

export interface IProductRepository {
  create(data: Prisma.ProductCreateInput): Promise<Product>;

  findAll(params: {
    where?: Prisma.ProductWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }): Promise<{ products: Product[]; total: number }>;

  findOne(id: string): Promise<Product | null>;

  findBySku(sku: string): Promise<Product | null>;

  findByBarcode(barcode: string): Promise<Product | null>;

  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product>;

  delete(id: string): Promise<Product>;

  checkSkuExists(sku: string, excludeId?: string): Promise<boolean>;
}
