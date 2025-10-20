import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma, ProductBatch } from '@prisma/client';

@Injectable()
export class ProductBatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProductBatchCreateInput): Promise<ProductBatch> {
    return this.prisma.productBatch.create({
      data,
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async findAll(params: {
    where?: Prisma.ProductBatchWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.ProductBatchOrderByWithRelationInput;
  }): Promise<{ batches: ProductBatch[]; total: number }> {
    const { where, skip, take, orderBy } = params;

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

    return { batches, total };
  }

  async findOne(id: string): Promise<ProductBatch | null> {
    return this.prisma.productBatch.findUnique({
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
  }

  async findByBatchNo(productId: string, batchNo: string): Promise<ProductBatch | null> {
    return this.prisma.productBatch.findFirst({
      where: {
        productId,
        batchNo,
      },
      include: {
        product: true,
      },
    });
  }

  async findByProduct(productId: string): Promise<ProductBatch[]> {
    return this.prisma.productBatch.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        inventory: true,
      },
    });
  }

  async update(id: string, data: Prisma.ProductBatchUpdateInput): Promise<ProductBatch> {
    return this.prisma.productBatch.update({
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
  }

  async delete(id: string): Promise<ProductBatch> {
    return this.prisma.productBatch.delete({ where: { id } });
  }

  async findExpiring(params: {
    before?: Date;
    after?: Date;
    skip?: number;
    take?: number;
  }): Promise<{ batches: ProductBatch[]; total: number }> {
    const { before, after, skip, take } = params;

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
        },
      }),
      this.prisma.productBatch.count({ where }),
    ]);

    return { batches, total };
  }
}
