import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { CustomerRepository } from '../repositories/customer.repository';
import { CreateCustomerDto } from '../dto/customer/create-customer.dto';
import { UpdateCustomerDto } from '../dto/customer/update-customer.dto';
import { QueryCustomerDto } from '../dto/customer/query-customer.dto';
import {
  CustomerResponseDto,
  CustomerListResponseDto,
} from '../dto/customer/customer-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private readonly repo: CustomerRepository) {}

  /**
   * Create Customer API
   * Minimum test cases: 10
   * - CUST-TC01: Create with valid data (201)
   * - CUST-TC02: Duplicate code (400)
   * - CUST-TC03: Create without code (201)
   * - CUST-TC04: Missing required fields name (400, tested by DTO)
   * - CUST-TC05: Missing optional field contactInfo (201)
   * - CUST-TC06: Missing optional field address (201)
   * - CUST-TC07: Invalid email format in contactInfo (400, tested by DTO)
   * - CUST-TC08: Invalid phone format in contactInfo (400, tested by DTO)
   * - CUST-TC09: Permission denied (403, tested by guard)
   * - CUST-TC10: No authentication (401, tested by guard)
   */
  async create(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    this.logger.log(`Creating customer: ${dto.name}`);

    if (dto.code) {
      const exists = await this.repo.findUnique({ code: dto.code });
      if (exists) {
        this.logger.warn(`Customer code already exists: ${dto.code}`);
        throw new BadRequestException('Customer code already exists');
      }
    }

    const customer = await this.repo.create({
      code: dto.code,
      name: dto.name,
      contactInfo: dto.contactInfo,
      address: dto.address,
    });

    this.logger.log(`Customer created successfully: ${customer.id}`);
    return {
      success: true,
      data: customer,
      message: 'Customer created successfully',
    };
  }

  /**
   * Get All Customers API
   * Minimum test cases: 18
   * - CUST-TC11: Get all with default pagination (200)
   * - CUST-TC12: Filter by name (200)
   * - CUST-TC13: Filter by code (200)
   * - CUST-TC14: Filter by phone (200)
   * - CUST-TC15: Filter by search query (q param) (200)
   * - CUST-TC16: Pagination page 1 (200)
   * - CUST-TC17: Pagination page 2 (200)
   * - CUST-TC18: Sort by name asc (200)
   * - CUST-TC19: Sort by name desc (200)
   * - CUST-TC20: Sort by code asc (200)
   * - CUST-TC21: Sort by createdAt desc (default) (200)
   * - CUST-TC22: Sort by multiple fields (200)
   * - CUST-TC23: Combine multiple filters (200)
   * - CUST-TC24: No authentication (401, tested by guard)
   * - CUST-TC25: SQL injection test (200, handled by Prisma)
   * - CUST-TC26: Pagination with negative page (handled by DTO)
   * - CUST-TC27: Pagination with excessive pageSize (handled by DTO)
   * - CUST-TC28: Permission denied (403, tested by guard)
   */
  async findAll(query: QueryCustomerDto): Promise<CustomerListResponseDto> {
    this.logger.log(`Finding customers with query: ${JSON.stringify(query)}`);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = buildCustomerWhere(query);
    const orderBy = parseSort(query.sort);

    const [data, total] = await Promise.all([
      this.repo.findMany({ skip, take: pageSize, where, orderBy }),
      this.repo.count(where),
    ]);

    this.logger.log(`Found ${total} customers`);
    return {
      success: true,
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get Customer by ID API
   * Minimum test cases: 4
   * - CUST-TC29: Find by valid ID (200)
   * - CUST-TC30: Customer not found (404)
   * - CUST-TC31: Invalid ID format (500, should return 400)
   * - CUST-TC32: No authentication (401, tested by guard)
   */
  async findOne(id: string): Promise<CustomerResponseDto> {
    this.logger.log(`Finding customer by ID: ${id}`);

    const customer = await this.repo.findById(id);
    if (!customer) {
      this.logger.warn(`Customer not found: ${id}`);
      throw new NotFoundException('Customer not found');
    }

    return {
      success: true,
      data: customer,
    };
  }

  /**
   * Update Customer API
   * Minimum test cases: 10
   * - CUST-TC33: Update name successfully (200)
   * - CUST-TC34: Update code successfully (200)
   * - CUST-TC35: Update code with duplicate value (400)
   * - CUST-TC36: Update contactInfo (200)
   * - CUST-TC37: Update address (200)
   * - CUST-TC38: Update multiple fields at once (200)
   * - CUST-TC39: Update non-existent customer (404)
   * - CUST-TC40: Update with empty body (200, no changes)
   * - CUST-TC41: Permission denied (403, tested by guard)
   * - CUST-TC42: No authentication (401, tested by guard)
   */
  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    this.logger.log(`Updating customer: ${id}`);

    const existing = await this.repo.findById(id);
    if (!existing) {
      this.logger.warn(`Customer not found for update: ${id}`);
      throw new NotFoundException('Customer not found');
    }

    if (dto.code && dto.code !== existing.code) {
      const dup = await this.repo.findUnique({ code: dto.code });
      if (dup) {
        this.logger.warn(`Duplicate customer code: ${dto.code}`);
        throw new BadRequestException('Customer code already exists');
      }
    }

    const customer = await this.repo.update(id, {
      code: dto.code ?? existing.code,
      name: dto.name ?? existing.name,
      contactInfo: (dto.contactInfo ?? existing.contactInfo) as unknown as
        | Prisma.InputJsonValue
        | Prisma.NullableJsonNullValueInput,
      address: dto.address ?? existing.address,
    });

    this.logger.log(`Customer updated successfully: ${id}`);
    return {
      success: true,
      data: customer,
      message: 'Customer updated successfully',
    };
  }

  /**
   * Delete Customer API
   * Minimum test cases: 5
   * - CUST-TC43: Delete customer successfully (200)
   * - CUST-TC44: Customer not found (404)
   * - CUST-TC45: Delete customer with active sales orders (400)
   * - CUST-TC46: Permission denied (403, tested by guard)
   * - CUST-TC47: No authentication (401, tested by guard)
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting customer: ${id}`);

    const existing = await this.repo.findById(id);
    if (!existing) {
      this.logger.warn(`Customer not found for deletion: ${id}`);
      throw new NotFoundException('Customer not found');
    }

    // Check for active sales orders
    const activeSOCount = await this.repo.countActiveSalesOrders(id);
    if (activeSOCount > 0) {
      this.logger.warn(
        `Cannot delete customer ${id}: ${activeSOCount} active sales order(s) exist`,
      );
      throw new BadRequestException(
        `Cannot delete customer. There are ${activeSOCount} active sales order(s) associated with this customer.`,
      );
    }

    await this.repo.remove(id);
    this.logger.log(`Customer deleted successfully: ${id}`);
  }
}

function buildCustomerWhere(query: QueryCustomerDto): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};

  if (query.name) {
    where.name = { contains: query.name, mode: 'insensitive' };
  }

  if (query.code) {
    where.code = { contains: query.code, mode: 'insensitive' };
  }

  if (query.phone) {
    where.contactInfo = {
      path: ['phone'],
      string_contains: query.phone,
    };
  }

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { code: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

function parseSort(sort?: string): Prisma.CustomerOrderByWithRelationInput[] {
  if (!sort) return [{ createdAt: 'desc' }];

  const parts = sort.split(',');
  const orderBy: Prisma.CustomerOrderByWithRelationInput[] = [];

  for (const part of parts) {
    const [field, direction] = part.split(':');
    if (field && ['name', 'code', 'createdAt'].includes(field)) {
      orderBy.push({
        [field]: direction === 'asc' ? 'asc' : 'desc',
      } as Prisma.CustomerOrderByWithRelationInput);
    }
  }

  return orderBy.length > 0 ? orderBy : [{ createdAt: 'desc' }];
}
