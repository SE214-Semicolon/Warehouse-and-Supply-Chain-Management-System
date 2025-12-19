import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupplierRepository } from '../repositories/supplier.repository';
import { CreateSupplierDto } from '../dto/supplier/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/supplier/update-supplier.dto';
import { QuerySupplierDto } from '../dto/supplier/query-supplier.dto';
import {
  SupplierResponseDto,
  SupplierListResponseDto,
} from '../dto/supplier/supplier-response.dto';
import { CacheService } from 'src/cache/cache.service';
import { CACHE_PREFIX, CACHE_TTL } from 'src/cache/cache.constants';
import { Prisma, Supplier } from '@prisma/client';

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    private readonly repo: SupplierRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Create Supplier API
   * Minimum test cases: 10
   * - SUP-TC01: Create with valid data (201)
   * - SUP-TC02: Duplicate code (400)
   * - SUP-TC03: Create without code (201)
   * - SUP-TC04: Missing required fields name (400, tested by DTO)
   * - SUP-TC05: Missing optional field contactInfo (201)
   * - SUP-TC06: Missing optional field address (201)
   * - SUP-TC07: Invalid email format in contactInfo (400, tested by DTO)
   * - SUP-TC08: Invalid phone format in contactInfo (400, tested by DTO)
   * - SUP-TC09: Permission denied (403, tested by guard)
   * - SUP-TC10: No authentication (401, tested by guard)
   */
  async create(dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    this.logger.log(`Creating supplier: ${dto.name}`);
    if (dto.code) {
      const exists = await this.repo.findUnique({ code: dto.code });
      if (exists) {
        this.logger.warn(`Supplier code already exists: ${dto.code}`);
        throw new BadRequestException('Supplier code already exists');
      }
    }
    const supplier = await this.repo.create({
      code: dto.code,
      name: dto.name,
      contactInfo: dto.contactInfo,
      address: dto.address,
    });
    this.logger.log(`Supplier created successfully: ${supplier.id}`);
    return {
      success: true,
      data: supplier,
      message: 'Supplier created successfully',
    };
  }

  /**
   * Get All Suppliers API
   * Minimum test cases: 18
   * - SUP-TC11: Get all with default pagination (200)
   * - SUP-TC12: Filter by name (200)
   * - SUP-TC13: Filter by code (200)
   * - SUP-TC14: Filter by phone (200)
   * - SUP-TC15: Filter by search query (q param, searches name/code) (200)
   * - SUP-TC16: Pagination page 1 (200)
   * - SUP-TC17: Pagination page 2 (200)
   * - SUP-TC18: Pagination with pageSize = 0 (400 or special handling)
   * - SUP-TC19: Sort by name asc (200)
   * - SUP-TC20: Sort by name desc (200)
   * - SUP-TC21: Sort by code asc (200)
   * - SUP-TC22: Sort by createdAt desc (default) (200)
   * - SUP-TC23: Sort by multiple fields (200)
   * - SUP-TC24: Combine multiple filters (200)
   * - SUP-TC25: No authentication (401, tested by guard)
   * - SUP-TC26: SQL injection test (200, should be handled by Prisma)
   * - SUP-TC27: Pagination with negative page (400)
   * - SUP-TC28: Pagination with excessive pageSize (400)
   */
  async findAll(query: QuerySupplierDto): Promise<SupplierListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = buildSupplierWhere(query);
    const orderBy = parseSort(query.sort);

    const [data, total] = await Promise.all([
      this.repo.findMany({ skip, take: pageSize, where, orderBy }),
      this.repo.count(where),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      pageSize,
      message: 'Suppliers retrieved successfully',
    };
  }

  /**
   * Get Supplier by ID API
   * Minimum test cases: 4
   * - SUP-TC29: Find by valid ID (200)
   * - SUP-TC30: Supplier not found (404)
   * - SUP-TC31: Invalid ID format (500, should return 400)
   * - SUP-TC32: No authentication (401, tested by guard)
   */
  async findOne(id: string): Promise<SupplierResponseDto> {
    const cacheKey = `${CACHE_PREFIX.USER}supplier:${id}`;
    const cached = await this.cacheService.get<Supplier>(cacheKey);
    if (cached) {
      this.logger.debug(`Supplier found in cache: ${id}`);
      return {
        success: true,
        data: cached,
        message: 'Supplier retrieved successfully',
      };
    }

    const sup = await this.repo.findById(id);
    if (!sup) {
      this.logger.warn(`Supplier not found: ${id}`);
      throw new NotFoundException('Supplier not found');
    }

    await this.cacheService.set(cacheKey, sup, { ttl: CACHE_TTL.MEDIUM });
    this.logger.log(`Supplier retrieved successfully: ${id}`);
    return {
      success: true,
      data: sup,
      message: 'Supplier retrieved successfully',
    };
  }

  /**
   * Update Supplier API
   * Minimum test cases: 10
   * - SUP-TC32: Update name successfully (200)
   * - SUP-TC33: Update code successfully (200)
   * - SUP-TC34: Update code with duplicate value (400)
   * - SUP-TC35: Update contactInfo (200)
   * - SUP-TC36: Update address (200)
   * - SUP-TC37: Update multiple fields at once (200)
   * - SUP-TC38: Update non-existent supplier (404)
   * - SUP-TC39: Update with empty body (200, no changes)
   * - SUP-TC40: Permission denied (403, tested by guard)
   * - SUP-TC41: No authentication (401, tested by guard)
   */
  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierResponseDto> {
    this.logger.log(`Updating supplier: ${id}`);
    const existing = await this.repo.findById(id);
    if (!existing) {
      this.logger.warn(`Supplier not found for update: ${id}`);
      throw new NotFoundException('Supplier not found');
    }

    if (dto.code && dto.code !== existing.code) {
      const dup = await this.repo.findUnique({ code: dto.code });
      if (dup) {
        this.logger.warn(`Duplicate supplier code: ${dto.code}`);
        throw new BadRequestException('Supplier code already exists');
      }
    }

    const updated = await this.repo.update(id, {
      code: dto.code ?? existing.code,
      name: dto.name ?? existing.name,
      // Prisma yêu cầu kiểu InputJsonValue/NullableJsonNullValueInput cho update
      // Ép kiểu rõ ràng để trình biên dịch hiểu đúng
      contactInfo: (dto.contactInfo ?? existing.contactInfo) as unknown as
        | Prisma.InputJsonValue
        | Prisma.NullableJsonNullValueInput,
      address: dto.address ?? existing.address,
    });

    // Invalidate cache
    const cacheKey = `${CACHE_PREFIX.USER}supplier:${id}`;
    await this.cacheService.delete(cacheKey);
    this.logger.log(`Supplier updated successfully: ${id}`);

    return {
      success: true,
      data: updated,
      message: 'Supplier updated successfully',
    };
  }

  /**
   * Delete Supplier API
   * Minimum test cases: 5
   * - SUP-TC41: Delete supplier successfully (200)
   * - SUP-TC42: Supplier not found (404)
   * - SUP-TC43: Delete supplier with active POs (400) - TODO
   * - SUP-TC44: Permission denied role procurement (403, tested by guard)
   * - SUP-TC45: Permission denied role warehouse_staff (403, tested by guard)
   * Total: 45 test cases for SupplierService
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting supplier: ${id}`);
    const existing = await this.repo.findById(id);
    if (!existing) {
      this.logger.warn(`Supplier not found for deletion: ${id}`);
      throw new NotFoundException('Supplier not found');
    }

    // Check for active purchase orders
    const activePOCount = await this.repo.countActivePurchaseOrders(id);
    if (activePOCount > 0) {
      this.logger.warn(`Cannot delete supplier ${id}: ${activePOCount} active purchase orders`);
      throw new BadRequestException(
        `Cannot delete supplier. There are ${activePOCount} active purchase order(s) associated with this supplier.`,
      );
    }

    // Soft delete
    await this.repo.remove(id);

    // Invalidate cache
    const cacheKey = `${CACHE_PREFIX.USER}supplier:${id}`;
    await this.cacheService.delete(cacheKey);
    this.logger.log(`Supplier deleted successfully: ${id}`);
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
