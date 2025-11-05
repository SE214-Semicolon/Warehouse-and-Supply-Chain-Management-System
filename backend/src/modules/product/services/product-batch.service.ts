import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ProductBatchRepository } from '../repositories/product-batch.repository';
import { ProductRepository } from '../repositories/product.repository';
import { CreateProductBatchDto } from '../dto/create-product-batch.dto';
import { UpdateProductBatchDto } from '../dto/update-product-batch.dto';
import { QueryProductBatchDto } from '../dto/query-product-batch.dto';
import {
  ProductBatchResponseDto,
  ProductBatchListResponseDto,
  ProductBatchDeleteResponseDto,
} from '../dto/product-batch-response.dto';

@Injectable()
export class ProductBatchService {
  private readonly logger = new Logger(ProductBatchService.name);

  constructor(
    private readonly batchRepo: ProductBatchRepository,
    private readonly productRepo: ProductRepository,
  ) {}

  async create(createBatchDto: CreateProductBatchDto): Promise<ProductBatchResponseDto> {
    this.logger.log(`Creating batch for product: ${createBatchDto.productId}`);

    // Validate product exists
    const product = await this.productRepo.findOne(createBatchDto.productId);
    if (!product) {
      this.logger.warn(`Product not found: ${createBatchDto.productId}`);
      throw new NotFoundException(`Product with ID "${createBatchDto.productId}" not found`);
    }

    // Check for duplicate batch number for the same product
    if (createBatchDto.batchNo) {
      const existingBatch = await this.batchRepo.findByBatchNo(
        createBatchDto.productId,
        createBatchDto.batchNo,
      );
      if (existingBatch) {
        this.logger.warn(`Duplicate batch number: ${createBatchDto.batchNo}`);
        throw new ConflictException(
          `Batch with number "${createBatchDto.batchNo}" already exists for this product`,
        );
      }
    }

    // Validate dates
    if (createBatchDto.manufactureDate && createBatchDto.expiryDate) {
      const mfgDate = new Date(createBatchDto.manufactureDate);
      const expDate = new Date(createBatchDto.expiryDate);
      if (expDate <= mfgDate) {
        this.logger.warn('Invalid dates: expiry date before manufacture date');
        throw new BadRequestException('Expiry date must be after manufacture date');
      }
    }

    const batch = await this.batchRepo.create({
      product: { connect: { id: createBatchDto.productId } },
      batchNo: createBatchDto.batchNo,
      quantity: createBatchDto.quantity || 0,
      manufactureDate: createBatchDto.manufactureDate
        ? new Date(createBatchDto.manufactureDate)
        : undefined,
      expiryDate: createBatchDto.expiryDate ? new Date(createBatchDto.expiryDate) : undefined,
      barcodeOrQr: createBatchDto.barcodeOrQr,
      inboundReceiptId: createBatchDto.inboundReceiptId,
    });

    this.logger.log(`Product batch created successfully: ${batch.id}`);

    return {
      success: true,
      data: batch,
      message: 'Product batch created successfully',
    };
  }

  async findAll(query: QueryProductBatchDto): Promise<ProductBatchListResponseDto> {
    this.logger.log(`Finding all product batches with filters: ${JSON.stringify(query)}`);

    const {
      productId,
      batchNo,
      barcodeOrQr,
      expiryBefore,
      expiryAfter,
      limit = 20,
      page = 1,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (batchNo) {
      where.batchNo = { contains: batchNo, mode: 'insensitive' };
    }

    if (barcodeOrQr) {
      where.barcodeOrQr = { contains: barcodeOrQr, mode: 'insensitive' };
    }

    if (expiryBefore || expiryAfter) {
      where.expiryDate = {};
      if (expiryBefore) {
        where.expiryDate.lte = new Date(expiryBefore);
      }
      if (expiryAfter) {
        where.expiryDate.gte = new Date(expiryAfter);
      }
    }

    const { batches, total } = await this.batchRepo.findAll({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(`Found ${total} product batches`);

    return {
      success: true,
      data: batches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<ProductBatchResponseDto> {
    this.logger.log(`Finding product batch by ID: ${id}`);

    const batch = await this.batchRepo.findOne(id);
    if (!batch) {
      this.logger.warn(`Product batch not found: ${id}`);
      throw new NotFoundException(`Product batch with ID "${id}" not found`);
    }

    return {
      success: true,
      data: batch,
    };
  }

  async findByProduct(productId: string): Promise<ProductBatchListResponseDto> {
    this.logger.log(`Finding batches for product: ${productId}`);

    const product = await this.productRepo.findOne(productId);
    if (!product) {
      this.logger.warn(`Product not found: ${productId}`);
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    const batches = await this.batchRepo.findByProduct(productId);

    this.logger.log(`Found ${batches.length} batches for product ${productId}`);

    return {
      success: true,
      data: batches,
      total: batches.length,
      page: 1,
      limit: batches.length,
      totalPages: 1,
    };
  }

  async findExpiring(
    daysAhead: number = 30,
    page: number = 1,
    limit: number = 20,
  ): Promise<ProductBatchListResponseDto> {
    this.logger.log(`Finding batches expiring within ${daysAhead} days`);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    const skip = (page - 1) * limit;

    const { batches, total } = await this.batchRepo.findExpiring({
      before: futureDate,
      after: now,
      skip,
      take: limit,
    });

    this.logger.log(`Found ${total} expiring batches`);

    return {
      success: true,
      data: batches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      message: `Batches expiring within ${daysAhead} days`,
    };
  }

  async update(
    id: string,
    updateBatchDto: UpdateProductBatchDto,
  ): Promise<ProductBatchResponseDto> {
    this.logger.log(`Updating product batch: ${id}`);

    const batch = await this.batchRepo.findOne(id);
    if (!batch) {
      this.logger.warn(`Product batch not found for update: ${id}`);
      throw new NotFoundException(`Product batch with ID "${id}" not found`);
    }

    // Check for duplicate batch number if updating
    if (updateBatchDto.batchNo && updateBatchDto.batchNo !== batch.batchNo) {
      const existingBatch = await this.batchRepo.findByBatchNo(
        batch.productId,
        updateBatchDto.batchNo,
      );
      if (existingBatch) {
        this.logger.warn(`Duplicate batch number: ${updateBatchDto.batchNo}`);
        throw new ConflictException(
          `Batch with number "${updateBatchDto.batchNo}" already exists for this product`,
        );
      }
    }

    // Validate dates
    const mfgDate =
      updateBatchDto.manufactureDate !== undefined
        ? new Date(updateBatchDto.manufactureDate)
        : batch.manufactureDate;
    const expDate =
      updateBatchDto.expiryDate !== undefined
        ? new Date(updateBatchDto.expiryDate)
        : batch.expiryDate;

    if (mfgDate && expDate && expDate <= mfgDate) {
      this.logger.warn('Invalid dates: expiry date before manufacture date');
      throw new BadRequestException('Expiry date must be after manufacture date');
    }

    const updateData: any = {};
    if (updateBatchDto.batchNo !== undefined) updateData.batchNo = updateBatchDto.batchNo;
    if (updateBatchDto.quantity !== undefined) updateData.quantity = updateBatchDto.quantity;
    if (updateBatchDto.manufactureDate !== undefined)
      updateData.manufactureDate = new Date(updateBatchDto.manufactureDate);
    if (updateBatchDto.expiryDate !== undefined)
      updateData.expiryDate = new Date(updateBatchDto.expiryDate);
    if (updateBatchDto.barcodeOrQr !== undefined)
      updateData.barcodeOrQr = updateBatchDto.barcodeOrQr;
    if (updateBatchDto.inboundReceiptId !== undefined)
      updateData.inboundReceiptId = updateBatchDto.inboundReceiptId;

    const updatedBatch = await this.batchRepo.update(id, updateData);

    this.logger.log(`Product batch updated successfully: ${id}`);

    return {
      success: true,
      data: updatedBatch,
      message: 'Product batch updated successfully',
    };
  }

  async remove(id: string): Promise<ProductBatchDeleteResponseDto> {
    this.logger.log(`Deleting product batch: ${id}`);

    const batch = await this.batchRepo.findOne(id);
    if (!batch) {
      this.logger.warn(`Product batch not found for deletion: ${id}`);
      throw new NotFoundException(`Product batch with ID "${id}" not found`);
    }

    // Check if batch has inventory
    const batchWithInventory = batch as typeof batch & {
      inventory?: Array<{ availableQty: number; reservedQty: number }>;
    };
    if (
      batchWithInventory.inventory &&
      Array.isArray(batchWithInventory.inventory) &&
      batchWithInventory.inventory.length > 0
    ) {
      let hasStock = false;
      for (const inv of batchWithInventory.inventory) {
        if (inv.availableQty > 0 || inv.reservedQty > 0) {
          hasStock = true;
          break;
        }
      }
      if (hasStock) {
        this.logger.warn(`Cannot delete batch with inventory: ${id}`);
        throw new BadRequestException(
          'Cannot delete a batch with existing inventory. Please clear inventory first.',
        );
      }
    }

    await this.batchRepo.delete(id);

    this.logger.log(`Product batch deleted successfully: ${id}`);

    return {
      success: true,
      message: 'Product batch deleted successfully',
    };
  }
}
