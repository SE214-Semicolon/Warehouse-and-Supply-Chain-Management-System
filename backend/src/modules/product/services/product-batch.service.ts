import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProductBatchRepository } from '../repositories/product-batch.repository';
import { ProductRepository } from '../repositories/product.repository';
import { CreateProductBatchDto } from '../dto/create-product-batch.dto';
import { UpdateProductBatchDto } from '../dto/update-product-batch.dto';
import { QueryProductBatchDto } from '../dto/query-product-batch.dto';

@Injectable()
export class ProductBatchService {
  constructor(
    private readonly batchRepo: ProductBatchRepository,
    private readonly productRepo: ProductRepository,
  ) {}

  async create(createBatchDto: CreateProductBatchDto) {
    // Validate product exists
    const product = await this.productRepo.findOne(createBatchDto.productId);
    if (!product) {
      throw new NotFoundException(`Product with ID "${createBatchDto.productId}" not found`);
    }

    // Check for duplicate batch number for the same product
    if (createBatchDto.batchNo) {
      const existingBatch = await this.batchRepo.findByBatchNo(
        createBatchDto.productId,
        createBatchDto.batchNo,
      );
      if (existingBatch) {
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

    return {
      success: true,
      batch,
      message: 'Product batch created successfully',
    };
  }

  async findAll(query: QueryProductBatchDto) {
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

    return {
      success: true,
      batches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const batch = await this.batchRepo.findOne(id);
    if (!batch) {
      throw new NotFoundException(`Product batch with ID "${id}" not found`);
    }
    return {
      success: true,
      batch,
    };
  }

  async findByProduct(productId: string) {
    const product = await this.productRepo.findOne(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    const batches = await this.batchRepo.findByProduct(productId);

    return {
      success: true,
      batches,
      total: batches.length,
    };
  }

  async findExpiring(daysAhead: number = 30, page: number = 1, limit: number = 20) {
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

    return {
      success: true,
      batches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      message: `Batches expiring within ${daysAhead} days`,
    };
  }

  async update(id: string, updateBatchDto: UpdateProductBatchDto) {
    const batch = await this.batchRepo.findOne(id);
    if (!batch) {
      throw new NotFoundException(`Product batch with ID "${id}" not found`);
    }

    // Check for duplicate batch number if updating
    if (updateBatchDto.batchNo && updateBatchDto.batchNo !== batch.batchNo) {
      const existingBatch = await this.batchRepo.findByBatchNo(
        batch.productId,
        updateBatchDto.batchNo,
      );
      if (existingBatch) {
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

    return {
      success: true,
      batch: updatedBatch,
      message: 'Product batch updated successfully',
    };
  }

  async remove(id: string) {
    const batch = await this.batchRepo.findOne(id);
    if (!batch) {
      throw new NotFoundException(`Product batch with ID "${id}" not found`);
    }

    // Check if batch has inventory
    if (batch.inventory && batch.inventory.length > 0) {
      const hasStock = batch.inventory.some(
        (inv) => inv.availableQty > 0 || inv.reservedQty > 0,
      );
      if (hasStock) {
        throw new BadRequestException(
          'Cannot delete a batch with existing inventory. Please clear inventory first.',
        );
      }
    }

    await this.batchRepo.delete(id);

    return {
      success: true,
      message: 'Product batch deleted successfully',
    };
  }
}
