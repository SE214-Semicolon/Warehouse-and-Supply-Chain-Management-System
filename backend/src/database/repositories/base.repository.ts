import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface BaseEntity {
  id: number | string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

@Injectable()
export abstract class BaseRepository<T extends BaseEntity> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly modelName: Prisma.ModelName,
  ) {}

  protected abstract get delegate(): any;

  async findById(id: number | string, includeDeleted = false): Promise<T | null> {
    const where: any = { id };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return this.delegate.findFirst({ where });
  }

  async findByIdOrThrow(id: number | string, includeDeleted = false): Promise<T> {
    const entity = await this.findById(id, includeDeleted);
    if (!entity) {
      throw new NotFoundException(`${this.modelName} with id ${id} not found`);
    }
    return entity;
  }

  async findMany(options: QueryOptions = {}): Promise<PaginatedResult<T>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'desc',
      includeDeleted = false,
    } = options;

    const skip = (page - 1) * limit;
    const where: any = includeDeleted ? {} : { deletedAt: null };

    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.delegate.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Partial<T>): Promise<T> {
    return this.delegate.create({ data });
  }

  async update(id: number | string, data: Partial<T>): Promise<T> {
    await this.findByIdOrThrow(id);
    return this.delegate.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: number | string): Promise<T> {
    await this.findByIdOrThrow(id);
    return this.delegate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDelete(id: number | string): Promise<T> {
    await this.findByIdOrThrow(id, true);
    return this.delegate.delete({
      where: { id },
    });
  }

  async restore(id: number | string): Promise<T> {
    const entity = await this.findById(id, true);
    if (!entity) {
      throw new NotFoundException(`${this.modelName} with id ${id} not found`);
    }
    if (!entity.deletedAt) {
      throw new Error(`${this.modelName} with id ${id} is not deleted`);
    }

    return this.delegate.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async exists(id: number | string): Promise<boolean> {
    const count = await this.delegate.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  protected async executeInTransaction<R>(
    fn: (tx: Prisma.TransactionClient) => Promise<R>,
  ): Promise<R> {
    return this.prisma.executeWithTransaction(fn);
  }
}
