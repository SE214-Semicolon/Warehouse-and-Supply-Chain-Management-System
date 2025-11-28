import { Prisma, ProductBatch } from '@prisma/client';

export interface IProductBatchRepository {
  create(data: Prisma.ProductBatchCreateInput): Promise<ProductBatch>;

  findAll(params: {
    where?: Prisma.ProductBatchWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.ProductBatchOrderByWithRelationInput;
  }): Promise<{ batches: ProductBatch[]; total: number }>;

  findOne(id: string): Promise<ProductBatch | null>;

  findByBatchNo(productId: string, batchNo: string): Promise<ProductBatch | null>;

  findByProduct(productId: string): Promise<ProductBatch[]>;

  update(id: string, data: Prisma.ProductBatchUpdateInput): Promise<ProductBatch>;

  delete(id: string): Promise<ProductBatch>;

  findExpiring(params: {
    before?: Date;
    after?: Date;
    skip?: number;
    take?: number;
  }): Promise<{ batches: ProductBatch[]; total: number }>;
}
