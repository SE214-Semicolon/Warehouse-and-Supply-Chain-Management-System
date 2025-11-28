import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma, Product } from '@prisma/client';
import { IProductRepository } from '../interfaces/product-repository.interface';

@Injectable()
export class ProductRepository implements IProductRepository {
  private readonly logger = new Logger(ProductRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    try {
      this.logger.log(`Creating product with SKU: ${data.sku}`);

      const product = await this.prisma.product.create({
        data,
        include: {
          category: true,
        },
      });

      this.logger.log(`Product created successfully with ID: ${product.id}`);
      return product;
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  async findAll(params: {
    where?: Prisma.ProductWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }): Promise<{ products: Product[]; total: number }> {
    try {
      const { where, skip, take, orderBy } = params;

      this.logger.log(`Finding products with filters: ${JSON.stringify(where)}`);

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            category: true,
            batches: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        }),
        this.prisma.product.count({ where }),
      ]);

      this.logger.log(`Found ${total} products`);
      return { products, total };
    } catch (error) {
      this.logger.error(`Failed to find products: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve products');
    }
  }

  async findOne(id: string): Promise<Product | null> {
    try {
      this.logger.log(`Finding product by ID: ${id}`);

      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          batches: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (product) {
        this.logger.log(`Product found: ${product.sku}`);
      } else {
        this.logger.log(`Product not found with ID: ${id}`);
      }

      return product;
    } catch (error) {
      this.logger.error(`Failed to find product by ID: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve product');
    }
  }

  async findBySku(sku: string): Promise<Product | null> {
    try {
      this.logger.log(`Finding product by SKU: ${sku}`);

      const product = await this.prisma.product.findUnique({
        where: { sku },
        include: {
          category: true,
        },
      });

      if (product) {
        this.logger.log(`Product found with SKU: ${sku}`);
      }

      return product;
    } catch (error) {
      this.logger.error(`Failed to find product by SKU: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve product by SKU');
    }
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    try {
      this.logger.log(`Finding product by barcode: ${barcode}`);

      const product = await this.prisma.product.findFirst({
        where: { barcode },
        include: {
          category: true,
        },
      });

      if (product) {
        this.logger.log(`Product found with barcode: ${barcode}`);
      }

      return product;
    } catch (error) {
      this.logger.error(`Failed to find product by barcode: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve product by barcode');
    }
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    try {
      this.logger.log(`Updating product with ID: ${id}`);

      const product = await this.prisma.product.update({
        where: { id },
        data,
        include: {
          category: true,
        },
      });

      this.logger.log(`Product updated successfully: ${product.sku}`);
      return product;
    } catch (error) {
      this.logger.error(`Failed to update product: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update product');
    }
  }

  async delete(id: string): Promise<Product> {
    try {
      this.logger.log(`Deleting product with ID: ${id}`);

      const product = await this.prisma.product.delete({ where: { id } });

      this.logger.log(`Product deleted successfully: ${product.sku}`);
      return product;
    } catch (error) {
      this.logger.error(`Failed to delete product: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete product');
    }
  }

  async checkSkuExists(sku: string, excludeId?: string): Promise<boolean> {
    try {
      this.logger.log(`Checking if SKU exists: ${sku}`);

      const count = await this.prisma.product.count({
        where: {
          sku,
          id: excludeId ? { not: excludeId } : undefined,
        },
      });

      const exists = count > 0;
      this.logger.log(`SKU ${sku} exists: ${exists}`);

      return exists;
    } catch (error) {
      this.logger.error(`Failed to check SKU existence: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to check SKU existence');
    }
  }
}
