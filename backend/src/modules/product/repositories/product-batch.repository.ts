import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma, ProductBatch } from '@prisma/client';
import { IProductBatchRepository } from '../interfaces/product-batch-repository.interface';

@Injectable()
export class ProductBatchRepository implements IProductBatchRepository {
  private readonly logger = new Logger(ProductBatchRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProductBatchCreateInput): Promise<ProductBatch> {
    try {
      this.logger.log(`Creating product batch for product: ${data.product}`);

      const batch = await this.prisma.productBatch.create({
        data,
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });

      this.logger.log(`Product batch created successfully: ${batch.id}`);
      return batch;
    } catch (error) {
      this.logger.error(`Failed to create product batch: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create product batch');
    }
  }

  async findAll(params: {
    where?: Prisma.ProductBatchWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.ProductBatchOrderByWithRelationInput;
  }): Promise<{ batches: ProductBatch[]; total: number }> {
    try {
      const { where, skip, take, orderBy } = params;

      this.logger.log(`Finding product batches with filters: ${JSON.stringify(where)}`);

      const [batches, total] = await Promise.all([
        this.prisma.productBatch.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            product: {
              include: {
                category: true,
              },
            },
            inventory: {
              include: {
                location: {
                  include: {
                    warehouse: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.productBatch.count({ where }),
      ]);

      this.logger.log(`Found ${total} product batches`);
      return { batches, total };
    } catch (error) {
      this.logger.error(`Failed to find product batches: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve product batches');
    }
  }

  async findOne(id: string): Promise<ProductBatch | null> {
    try {
      this.logger.log(`Finding product batch by ID: ${id}`);

      const batch = await this.prisma.productBatch.findUnique({
        where: { id },
        include: {
          product: {
            include: {
              category: true,
            },
          },
          inventory: {
            include: {
              location: {
                include: {
                  warehouse: true,
                },
              },
            },
          },
        },
      });

      if (batch) {
        this.logger.log(`Product batch found: ${batch.id}`);
      } else {
        this.logger.log(`Product batch not found with ID: ${id}`);
      }

      return batch;
    } catch (error) {
      this.logger.error(`Failed to find product batch: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve product batch');
    }
  }

  async findByBatchNo(productId: string, batchNo: string): Promise<ProductBatch | null> {
    try {
      this.logger.log(
        `Finding batch by product ${productId} and batch number: ${batchNo} (case-insensitive)`,
      );

      const batch = await this.prisma.productBatch.findFirst({
        where: {
          productId,
          batchNo: {
            equals: batchNo,
            mode: 'insensitive',
          },
        },
        include: {
          product: true,
        },
      });

      if (batch) {
        this.logger.log(`Batch found: ${batch.id}`);
      }

      return batch;
    } catch (error) {
      this.logger.error(`Failed to find batch by number: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve batch by number');
    }
  }

  async findByProduct(productId: string): Promise<ProductBatch[]> {
    try {
      this.logger.log(`Finding all batches for product: ${productId}`);

      const batches = await this.prisma.productBatch.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        include: {
          product: true,
          inventory: true,
        },
      });

      this.logger.log(`Found ${batches.length} batches for product ${productId}`);
      return batches;
    } catch (error) {
      this.logger.error(`Failed to find batches by product: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve batches by product');
    }
  }

  async update(id: string, data: Prisma.ProductBatchUpdateInput): Promise<ProductBatch> {
    try {
      this.logger.log(`Updating product batch: ${id}`);

      const batch = await this.prisma.productBatch.update({
        where: { id },
        data,
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });

      this.logger.log(`Product batch updated successfully: ${batch.id}`);
      return batch;
    } catch (error) {
      this.logger.error(`Failed to update product batch: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update product batch');
    }
  }

  async delete(id: string): Promise<ProductBatch> {
    try {
      this.logger.log(`Deleting product batch: ${id}`);

      const batch = await this.prisma.productBatch.delete({ where: { id } });

      this.logger.log(`Product batch deleted successfully: ${batch.id}`);
      return batch;
    } catch (error) {
      this.logger.error(`Failed to delete product batch: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete product batch');
    }
  }

  async findExpiring(params: {
    before?: Date;
    after?: Date;
    skip?: number;
    take?: number;
  }): Promise<{ batches: ProductBatch[]; total: number }> {
    try {
      const { before, after, skip, take } = params;

      this.logger.log(`Finding expiring batches between ${after} and ${before}`);

      const where: Prisma.ProductBatchWhereInput = {
        expiryDate: {
          ...(before && { lte: before }),
          ...(after && { gte: after }),
        },
      };

      const [batches, total] = await Promise.all([
        this.prisma.productBatch.findMany({
          where,
          skip,
          take,
          orderBy: { expiryDate: 'asc' },
          include: {
            product: {
              include: {
                category: true,
              },
            },
            inventory: {
              include: {
                location: true,
              },
            },
          },
        }),
        this.prisma.productBatch.count({ where }),
      ]);

      this.logger.log(`Found ${total} expiring product batches`);
      return { batches, total };
    } catch (error) {
      this.logger.error(`Failed to find expiring batches: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve expiring batches');
    }
  }
}
