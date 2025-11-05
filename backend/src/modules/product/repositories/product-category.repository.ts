import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma, ProductCategory } from '@prisma/client';
import { IProductCategoryRepository } from '../interfaces/product-category-repository.interface';

@Injectable()
export class ProductCategoryRepository implements IProductCategoryRepository {
  private readonly logger = new Logger(ProductCategoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProductCategoryCreateInput): Promise<ProductCategory> {
    try {
      this.logger.log(`Creating product category: ${data.name}`);
      const category = await this.prisma.productCategory.create({ data });
      this.logger.log(`Product category created successfully: ${category.id}`);
      return category;
    } catch (error) {
      this.logger.error(`Failed to create product category: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create product category');
    }
  }

  async findAll(): Promise<ProductCategory[]> {
    try {
      this.logger.log('Finding all product categories');
      const categories = await this.prisma.productCategory.findMany();
      this.logger.log(`Found ${categories.length} product categories`);
      return categories;
    } catch (error) {
      this.logger.error(`Failed to find product categories: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve product categories');
    }
  }

  async findOne(id: string): Promise<ProductCategory | null> {
    try {
      this.logger.log(`Finding product category by ID: ${id}`);
      const category = await this.prisma.productCategory.findUnique({
        where: { id },
        include: { children: true, parent: true },
      });
      if (category) {
        this.logger.log(`Product category found: ${category.name}`);
      } else {
        this.logger.log(`Product category not found with ID: ${id}`);
      }
      return category;
    } catch (error) {
      this.logger.error(`Failed to find product category: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve product category');
    }
  }

  async update(id: string, data: Prisma.ProductCategoryUpdateInput): Promise<ProductCategory> {
    try {
      this.logger.log(`Updating product category: ${id}`);
      const category = await this.prisma.productCategory.update({ where: { id }, data });
      this.logger.log(`Product category updated successfully: ${category.id}`);
      return category;
    } catch (error) {
      this.logger.error(`Failed to update product category: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update product category');
    }
  }

  async delete(id: string): Promise<ProductCategory> {
    try {
      this.logger.log(`Deleting product category: ${id}`);
      const category = await this.prisma.productCategory.delete({ where: { id } });
      this.logger.log(`Product category deleted successfully: ${category.id}`);
      return category;
    } catch (error) {
      this.logger.error(`Failed to delete product category: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete product category');
    }
  }

  async findChildren(parentId: string): Promise<ProductCategory[]> {
    try {
      this.logger.log(`Finding child categories for parent: ${parentId}`);
      const children = await this.prisma.productCategory.findMany({ where: { parentId } });
      this.logger.log(`Found ${children.length} child categories`);
      return children;
    } catch (error) {
      this.logger.error(`Failed to find child categories: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve child categories');
    }
  }
}
