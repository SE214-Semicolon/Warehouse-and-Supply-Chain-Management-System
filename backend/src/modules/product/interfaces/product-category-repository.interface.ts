import { Prisma, ProductCategory } from '@prisma/client';

export interface IProductCategoryRepository {
  create(data: Prisma.ProductCategoryCreateInput): Promise<ProductCategory>;

  findAll(): Promise<ProductCategory[]>;

  findOne(id: string): Promise<ProductCategory | null>;

  update(id: string, data: Prisma.ProductCategoryUpdateInput): Promise<ProductCategory>;

  delete(id: string): Promise<ProductCategory>;

  findChildren(parentId: string): Promise<ProductCategory[]>;
}
