import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { QueryProductDto } from '../dto/query-product.dto';
import { ProductCategoryRepository } from '../repositories/product-category.repository';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly categoryRepo: ProductCategoryRepository,
  ) {}

  async create(createProductDto: CreateProductDto) {
    // Check if SKU already exists
    const existingSku = await this.productRepo.checkSkuExists(createProductDto.sku);
    if (existingSku) {
      throw new ConflictException(`Product with SKU "${createProductDto.sku}" already exists`);
    }

    // Validate category if provided
    if (createProductDto.categoryId) {
      const category = await this.categoryRepo.findOne(createProductDto.categoryId);
      if (!category) {
        throw new NotFoundException(
          `Category with ID "${createProductDto.categoryId}" not found`,
        );
      }
    }

    return this.productRepo.create({
      sku: createProductDto.sku,
      name: createProductDto.name,
      unit: createProductDto.unit,
      barcode: createProductDto.barcode,
      parameters: createProductDto.parameters || {},
      category: createProductDto.categoryId
        ? { connect: { id: createProductDto.categoryId } }
        : undefined,
    });
  }

  async findAll(query: QueryProductDto) {
    const { search, categoryId, barcode, limit = 20, page = 1 } = query;
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
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne(id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return {
      success: true,
      product,
    };
  }

  async findBySku(sku: string) {
    const product = await this.productRepo.findBySku(sku);
    if (!product) {
      throw new NotFoundException(`Product with SKU "${sku}" not found`);
    }
    return {
      success: true,
      product,
    };
  }

  async findByBarcode(barcode: string) {
    const product = await this.productRepo.findByBarcode(barcode);
    if (!product) {
      throw new NotFoundException(`Product with barcode "${barcode}" not found`);
    }
    return {
      success: true,
      product,
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepo.findOne(id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // Check if new SKU conflicts with existing products
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingSku = await this.productRepo.checkSkuExists(updateProductDto.sku, id);
      if (existingSku) {
        throw new ConflictException(`Product with SKU "${updateProductDto.sku}" already exists`);
      }
    }

    // Validate category if provided
    if (updateProductDto.categoryId) {
      const category = await this.categoryRepo.findOne(updateProductDto.categoryId);
      if (!category) {
        throw new NotFoundException(
          `Category with ID "${updateProductDto.categoryId}" not found`,
        );
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

    return {
      success: true,
      product: updatedProduct,
      message: 'Product updated successfully',
    };
  }

  async remove(id: string) {
    const product = await this.productRepo.findOne(id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // Check if product has batches
    if (product.batches && product.batches.length > 0) {
      throw new BadRequestException(
        'Cannot delete a product with existing batches. Please delete all batches first.',
      );
    }

    await this.productRepo.delete(id);

    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }
}
