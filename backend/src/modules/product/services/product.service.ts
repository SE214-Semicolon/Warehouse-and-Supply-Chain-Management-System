import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { QueryProductDto } from '../dto/query-product.dto';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import {
  ProductResponseDto,
  ProductListResponseDto,
  ProductDeleteResponseDto,
} from '../dto/product-response.dto';
import { CacheService } from 'src/cache/cache.service';
import { CACHE_PREFIX, CACHE_TTL } from 'src/cache/cache.constants';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly productRepo: ProductRepository,
    private readonly categoryRepo: ProductCategoryRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Create Product API - Test Cases: 18
   * Basic:
   * - PROD-TC01: Create with valid data (200)
   * - PROD-TC02: Duplicate SKU (409)
   * - PROD-TC03: Category not found (404)
   * - PROD-TC04: Create with category (200)
   * - PROD-TC05: Missing required fields (tested by DTO)
   * - PROD-TC06: Permission denied (tested by guard)
   * - PROD-TC07: No authentication (tested by guard)

   * Edge Cases:
   * - PROD-TC08: Empty string SKU → 400
   * - PROD-TC09: Whitespace only name → 400
   * - PROD-TC10: SKU with special chars → 201
   * - PROD-TC11: Very long SKU (>50 chars) → 400
   * - PROD-TC12: Duplicate SKU case insensitive → 409
   * - PROD-TC13: Create with null barcode → 201
   * - PROD-TC14: Create with complex parameters → 201
   * - PROD-TC15: Create with empty parameters → 201
   * - PROD-TC16: Create without category → 201
   * - PROD-TC17: Invalid category ID format → 404
   * - PROD-TC18: SQL injection in SKU → sanitized
   */
  async create(createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku}`);

    // Check if SKU already exists
    const existingSku = await this.productRepo.checkSkuExists(createProductDto.sku);
    if (existingSku) {
      this.logger.warn(`SKU already exists: ${createProductDto.sku}`);
      throw new ConflictException(`Product with SKU "${createProductDto.sku}" already exists`);
    }

    // Validate category if provided
    if (createProductDto.categoryId) {
      const category = await this.categoryRepo.findOne(createProductDto.categoryId);
      if (!category) {
        this.logger.warn(`Category not found: ${createProductDto.categoryId}`);
        throw new NotFoundException(`Category with ID "${createProductDto.categoryId}" not found`);
      }
    }

    const product = await this.productRepo.create({
      sku: createProductDto.sku,
      name: createProductDto.name,
      unit: createProductDto.unit,
      barcode: createProductDto.barcode,
      parameters: createProductDto.parameters || {},
      category: createProductDto.categoryId
        ? { connect: { id: createProductDto.categoryId } }
        : undefined,
    });

    this.logger.log(`Product created successfully: ${product.id}`);

    // Invalidate product-related caches
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.PRODUCT);

    return {
      success: true,
      data: product,
      message: 'Product created successfully',
    };
  }

  /**
   * Get All Products API - Test Cases: 25
   * Basic:
   * - PROD-TC19: Get all with default pagination (200)
   * - PROD-TC20: Filter by search (200)
   * - PROD-TC21: Filter by category (200)
   * - PROD-TC22: Filter by barcode (200)
   * - PROD-TC23: Pagination page 1 (200)
   * - PROD-TC24: Pagination page 2 (200)
   * - PROD-TC25: Sort by different fields (200)
   * - PROD-TC26: Permission denied (tested by guard)
   * - PROD-TC27: No authentication (tested by guard)

   * Edge Cases:
   * - PROD-TC28: Page = 0 → use default
   * - PROD-TC29: Negative page → use default
   * - PROD-TC30: Limit = 0 → use default
   * - PROD-TC31: Very large limit (>1000) → cap
   * - PROD-TC32: Search with empty string → all
   * - PROD-TC33: Search with SQL injection → sanitized
   * - PROD-TC34: Filter category + search → 200
   * - PROD-TC35: Filter barcode + search → 200
   * - PROD-TC36: All filters combined → 200
   * - PROD-TC37: Invalid category ID → empty result
   * - PROD-TC38: Sort by invalid field → default
   * - PROD-TC39: Sort ascending → 200
   * - PROD-TC40: Sort descending → 200
   * - PROD-TC41: Case insensitive search → 200
   * - PROD-TC42: Page beyond total → empty array
   * - PROD-TC43: Special chars in search → handled
   */
  async findAll(query: QueryProductDto): Promise<ProductListResponseDto> {
    this.logger.log(`Finding all products with filters: ${JSON.stringify(query)}`);

    const {
      search,
      categoryId,
      barcode,
      limit = 20,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (barcode) {
      where.barcode = { contains: barcode, mode: 'insensitive' };
    }

    const { products, total } = await this.productRepo.findAll({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    this.logger.log(`Found ${total} products`);

    return {
      success: true,
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get Product by ID API
   * Minimum test cases: 6
   * - PROD-TC17: Find by valid ID (200)
   * - PROD-TC18: Product not found (404)
   * - PROD-TC19: Cache hit (200)
   * - PROD-TC20: Invalid ID format (tested by DTO)
   * - PROD-TC21: Permission denied (tested by guard)
   * - PROD-TC22: No authentication (tested by guard)
   */
  async findOne(id: string): Promise<ProductResponseDto> {
    this.logger.log(`Finding product by ID: ${id}`);

    const product = await this.cacheService.getOrSet(
      { prefix: CACHE_PREFIX.PRODUCT, key: `id:${id}` },
      async () => {
        const found = await this.productRepo.findOne(id);
        if (!found) {
          this.logger.warn(`Product not found: ${id}`);
          throw new NotFoundException(`Product with ID "${id}" not found`);
        }
        return found;
      },
      { ttl: CACHE_TTL.MEDIUM },
    );

    return {
      success: true,
      data: product,
    };
  }

  /**
   * Get Product by SKU API
   * Minimum test cases: 5
   * - PROD-TC23: Find by valid SKU (200)
   * - PROD-TC24: Product not found (404)
   * - PROD-TC25: Cache hit (200)
   * - PROD-TC26: Permission denied (tested by guard)
   * - PROD-TC27: No authentication (tested by guard)
   */
  async findBySku(sku: string): Promise<ProductResponseDto> {
    this.logger.log(`Finding product by SKU: ${sku}`);

    const product = await this.cacheService.getOrSet(
      { prefix: CACHE_PREFIX.PRODUCT, key: `sku:${sku}` },
      async () => {
        const found = await this.productRepo.findBySku(sku);
        if (!found) {
          this.logger.warn(`Product not found with SKU: ${sku}`);
          throw new NotFoundException(`Product with SKU "${sku}" not found`);
        }
        return found;
      },
      { ttl: CACHE_TTL.MEDIUM },
    );

    return {
      success: true,
      data: product,
    };
  }

  /**
   * Get Product by Barcode API
   * Minimum test cases: 5
   * - PROD-TC28: Find by valid barcode (200)
   * - PROD-TC29: Product not found (404)
   * - PROD-TC30: Cache hit (200)
   * - PROD-TC31: Permission denied (tested by guard)
   * - PROD-TC32: No authentication (tested by guard)
   */
  async findByBarcode(barcode: string): Promise<ProductResponseDto> {
    this.logger.log(`Finding product by barcode: ${barcode}`);

    const product = await this.cacheService.getOrSet(
      { prefix: CACHE_PREFIX.PRODUCT, key: `barcode:${barcode}` },
      async () => {
        const found = await this.productRepo.findByBarcode(barcode);
        if (!found) {
          this.logger.warn(`Product not found with barcode: ${barcode}`);
          throw new NotFoundException(`Product with barcode "${barcode}" not found`);
        }
        return found;
      },
      { ttl: CACHE_TTL.MEDIUM },
    );

    return {
      success: true,
      data: product,
    };
  }

  /**
   * Autocomplete Products API
   * Minimum test cases: 5
   * - PROD-TC33: Autocomplete with search (200)
   * - PROD-TC34: Autocomplete without search (200)
   * - PROD-TC35: Cache hit (200)
   * - PROD-TC36: Permission denied (tested by guard)
   * - PROD-TC37: No authentication (tested by guard)
   */
  async autocomplete(search: string, limit = 10) {
    this.logger.log(`Autocomplete products - search: ${search}, limit: ${limit}`);
    const key = { prefix: CACHE_PREFIX.PRODUCT, key: `ac:${search || ''}:${limit}` };
    return this.cacheService.getOrSet(
      key,
      async () => {
        const where: any = {};
        if (search) {
          where.OR = [
            { sku: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ];
        }

        const { products } = await this.productRepo.findAll({
          where,
          skip: 0,
          take: limit,
          orderBy: { createdAt: 'desc' },
        });

        return products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          barcode: (p as any).barcode ?? null,
        }));
      },
      { ttl: CACHE_TTL.SHORT },
    );
  }

  /**
   * Update Product API - Test Cases: 22
   * Basic:
   * - PROD-TC44: Update with valid data (200)
   * - PROD-TC45: Product not found (404)
   * - PROD-TC46: Duplicate SKU (409)
   * - PROD-TC47: Category not found (404)
   * - PROD-TC48: Update with category (200)
   * - PROD-TC49: Update SKU (200)
   * - PROD-TC50: Invalid ID format (tested by DTO)
   * - PROD-TC51: Permission denied (tested by guard)
   * - PROD-TC52: No authentication (tested by guard)

   * Edge Cases:
   * - PROD-TC53: Update only name → 200
   * - PROD-TC54: Update only SKU → 200
   * - PROD-TC55: Update only unit → 200
   * - PROD-TC56: Update only barcode → 200
   * - PROD-TC57: Update only parameters → 200
   * - PROD-TC58: Update all fields → 200
   * - PROD-TC59: Update with empty object → 200
   * - PROD-TC60: Update SKU to same value → 200
   * - PROD-TC61: Duplicate SKU case insensitive → 409
   * - PROD-TC62: Update barcode to null → 200
   * - PROD-TC63: Update parameters to empty → 200
   * - PROD-TC64: Update category to null → 200
   * - PROD-TC65: Complex parameters update → 200
   */
  async update(id: string, updateProductDto: UpdateProductDto): Promise<ProductResponseDto> {
    this.logger.log(`Updating product: ${id}`);

    const product = await this.productRepo.findOne(id);
    if (!product) {
      this.logger.warn(`Product not found for update: ${id}`);
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // Check if new SKU conflicts with existing products
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingSku = await this.productRepo.checkSkuExists(updateProductDto.sku, id);
      if (existingSku) {
        this.logger.warn(`SKU already exists: ${updateProductDto.sku}`);
        throw new ConflictException(`Product with SKU "${updateProductDto.sku}" already exists`);
      }
    }

    // Validate category if provided
    if (updateProductDto.categoryId) {
      const category = await this.categoryRepo.findOne(updateProductDto.categoryId);
      if (!category) {
        this.logger.warn(`Category not found: ${updateProductDto.categoryId}`);
        throw new NotFoundException(`Category with ID "${updateProductDto.categoryId}" not found`);
      }
    }

    const updateData: any = {
      ...(updateProductDto.sku && { sku: updateProductDto.sku }),
      ...(updateProductDto.name && { name: updateProductDto.name }),
      ...(updateProductDto.unit && { unit: updateProductDto.unit }),
      ...(updateProductDto.barcode !== undefined && { barcode: updateProductDto.barcode }),
      ...(updateProductDto.parameters !== undefined && { parameters: updateProductDto.parameters }),
    };

    if (updateProductDto.categoryId) {
      updateData.category = { connect: { id: updateProductDto.categoryId } };
    }

    const updatedProduct = await this.productRepo.update(id, updateData);

    this.logger.log(`Product updated successfully: ${id}`);

    // Invalidate product-related caches
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.PRODUCT);

    return {
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully',
    };
  }

  /**
   * Delete Product API - Test Cases: 10
   * Basic:
   * - PROD-TC66: Delete product successfully (200)
   * - PROD-TC67: Product not found (404)
   * - PROD-TC68: Delete product with batches (400)
   * - PROD-TC69: Invalid ID format (tested by DTO)
   * - PROD-TC70: Permission denied (tested by guard)
   * - PROD-TC71: No authentication (tested by guard)

   * Edge Cases:
   * - PROD-TC72: Delete with empty batches array → 200
   * - PROD-TC73: Delete with zero quantity batches → 200
   * - PROD-TC74: Concurrent delete → 404 second
   * - PROD-TC75: Invalid ID format → 404

   * Total: 75 test cases for ProductService
   */
  async remove(id: string): Promise<ProductDeleteResponseDto> {
    this.logger.log(`Deleting product: ${id}`);

    const product = await this.productRepo.findOne(id);
    if (!product) {
      this.logger.warn(`Product not found for deletion: ${id}`);
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // Check if product has batches
    const productWithBatches = product as typeof product & { batches?: Array<{ id: string }> };
    if (productWithBatches.batches && productWithBatches.batches.length > 0) {
      this.logger.warn(`Cannot delete product with batches: ${id}`);
      throw new BadRequestException(
        'Cannot delete a product with existing batches. Please delete all batches first.',
      );
    }

    await this.productRepo.delete(id);

    this.logger.log(`Product deleted successfully: ${id}`);

    // Invalidate product-related caches
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.PRODUCT);

    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }
}
