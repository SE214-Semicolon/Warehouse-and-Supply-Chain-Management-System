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
