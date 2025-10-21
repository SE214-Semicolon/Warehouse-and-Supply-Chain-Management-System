import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma, ProductCategory } from '@prisma/client';

@Injectable()
export class ProductCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProductCategoryCreateInput): Promise<ProductCategory> {
    return this.prisma.productCategory.create({ data });
  }

  async findAll(): Promise<ProductCategory[]> {
    return this.prisma.productCategory.findMany();
  }

  async findOne(id: string): Promise<ProductCategory | null> {
    return this.prisma.productCategory.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
  }

  async update(id: string, data: Prisma.ProductCategoryUpdateInput): Promise<ProductCategory> {
    return this.prisma.productCategory.update({ where: { id }, data });
  }

  async delete(id: string): Promise<ProductCategory> {
    return this.prisma.productCategory.delete({ where: { id } });
  }

  async findChildren(parentId: string): Promise<ProductCategory[]> {
    return this.prisma.productCategory.findMany({ where: { parentId } });
  }
}
