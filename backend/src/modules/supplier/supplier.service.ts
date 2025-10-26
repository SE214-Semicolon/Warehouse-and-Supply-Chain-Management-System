import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupplierRepository } from './repositories/supplier.repository';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { Prisma, Supplier } from '@prisma/client';

@Injectable()
export class SupplierService {
  constructor(private readonly repo: SupplierRepository) {}

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    if (dto.code) {
      const exists = await this.repo.findUnique({ code: dto.code });
      if (exists) throw new BadRequestException('Supplier code already exists');
    }
    return this.repo.create({
      code: dto.code,
      name: dto.name,
      contactInfo: dto.contactInfo,
      address: dto.address,
    });
  }

  async findAll(
    query: QuerySupplierDto,
  ): Promise<{ data: Supplier[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = buildSupplierWhere(query);
    const orderBy = parseSort(query.sort);

    const [data, total] = await Promise.all([
      this.repo.findMany({ skip, take: pageSize, where, orderBy }),
      this.repo.count(where),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(id: string): Promise<Supplier> {
    const sup = await this.repo.findById(id);
    if (!sup) throw new NotFoundException('Supplier not found');
    return sup;
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Supplier not found');

    if (dto.code && dto.code !== existing.code) {
      const dup = await this.repo.findUnique({ code: dto.code });
      if (dup) throw new BadRequestException('Supplier code already exists');
    }

    return this.repo.update(id, {
      code: dto.code ?? existing.code,
      name: dto.name ?? existing.name,
      // Prisma yêu cầu kiểu InputJsonValue/NullableJsonNullValueInput cho update
      // Ép kiểu rõ ràng để trình biên dịch hiểu đúng
      contactInfo: (dto.contactInfo ?? existing.contactInfo) as unknown as
        | Prisma.InputJsonValue
        | Prisma.NullableJsonNullValueInput,
      address: dto.address ?? existing.address,
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Supplier not found');

    // Check for active purchase orders
    const activePOCount = await this.repo.countActivePurchaseOrders(id);
    if (activePOCount > 0) {
      throw new BadRequestException(
        `Cannot delete supplier. There are ${activePOCount} active purchase order(s) associated with this supplier.`,
      );
    }

    // Soft delete
    await this.repo.remove(id);
  }
}

function buildSupplierWhere(query: QuerySupplierDto): Prisma.SupplierWhereInput {
  const where: Prisma.SupplierWhereInput = {};
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { code: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  if (query.code) where.code = { contains: query.code, mode: 'insensitive' };
  if (query.name) where.name = { contains: query.name, mode: 'insensitive' };
  if (query.phone) {
    // Prisma JSON path string_contains có typing lỏng lẻo; ép kiểu để thỏa mãn types
    (where as unknown as { contactInfo: unknown }).contactInfo = {
      path: ['phone'],
      string_contains: query.phone,
    } as unknown;
  }
  return where;
}

function parseSort(sort?: string): Prisma.SupplierOrderByWithRelationInput[] {
  if (!sort) return [{ createdAt: 'desc' } as Prisma.SupplierOrderByWithRelationInput];
  const orderBy: Prisma.SupplierOrderByWithRelationInput[] = [];
  for (const part of sort.split(',')) {
    const [field, dir] = part.split(':');
    if (!field) continue;
    orderBy.push({
      [field]: dir === 'asc' ? 'asc' : 'desc',
    } as Prisma.SupplierOrderByWithRelationInput);
  }
  return orderBy.length
    ? orderBy
    : [{ createdAt: 'desc' } as Prisma.SupplierOrderByWithRelationInput];
}
