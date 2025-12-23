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
import { AuditMiddleware } from '../../../database/middleware/audit.middleware';

@Injectable()
export class ProductBatchService {
  private readonly logger = new Logger(ProductBatchService.name);

  constructor(
    private readonly batchRepo: ProductBatchRepository,
    private readonly productRepo: ProductRepository,
    private readonly auditMiddleware: AuditMiddleware,
  ) {}

  /**
   * Create Product Batch API - Test Cases: 20
   * Basic:
   * - BATCH-TC01: Create with valid data (200)
   * - BATCH-TC02: Product not found (404)
   * - BATCH-TC03: Duplicate batch number (409)
   * - BATCH-TC04: Invalid dates (expiry before manufacture) (400)
   * - BATCH-TC05: Create with all optional fields (200)
   * - BATCH-TC06: Missing required fields (tested by DTO)
   * - BATCH-TC07: Permission denied (tested by guard)
   * - BATCH-TC08: No authentication (tested by guard)

   * Edge Cases:
   * - BATCH-TC09: Empty batch number → 201 (nullable)
   * - BATCH-TC10: Batch number with special chars → 201
   * - BATCH-TC11: Very long batch number → 400
   * - BATCH-TC12: Duplicate batch case insensitive → 409
   * - BATCH-TC13: Zero quantity → 201
   * - BATCH-TC14: Negative quantity → 400
   * - BATCH-TC15: Future manufacture date → 201 or 400
   * - BATCH-TC16: Past expiry date → 201 (allowed)
   * - BATCH-TC17: Same manufacture & expiry dates → 400
   * - BATCH-TC18: Only manufacture date → 201
   * - BATCH-TC19: Only expiry date → 201
   * - BATCH-TC20: SQL injection in batch number → sanitized
   */
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

    // Audit log
    this.auditMiddleware
      .logCreate('ProductBatch', batch as Record<string, unknown>)
      .catch((err) => {
        this.logger.error('Failed to write audit log for batch create', err);
      });

    return {
      success: true,
      data: batch,
      message: 'Product batch created successfully',
    };
  }

  /**
   * Get All Product Batches API - Test Cases: 25
   * Basic:
   * - BATCH-TC21: Get all with default pagination (200)
   * - BATCH-TC22: Filter by product ID (200)
   * - BATCH-TC23: Filter by batch number (200)
   * - BATCH-TC24: Filter by barcode/QR (200)
   * - BATCH-TC25: Filter by expiry before (200)
   * - BATCH-TC26: Filter by expiry after (200)
   * - BATCH-TC27: Pagination page 1 (200)
   * - BATCH-TC28: Pagination page 2 (200)
   * - BATCH-TC29: Permission denied (tested by guard)
   * - BATCH-TC30: No authentication (tested by guard)

   * Edge Cases:
   * - BATCH-TC31: Page = 0 → use default
   * - BATCH-TC32: Negative page → use default
   * - BATCH-TC33: Limit = 0 → use default
   * - BATCH-TC34: Very large limit → cap
   * - BATCH-TC35: Invalid product ID → empty
   * - BATCH-TC36: Empty batch number search → all
   * - BATCH-TC37: SQL injection in filters → sanitized
   * - BATCH-TC38: Multiple filters combined → 200
   * - BATCH-TC39: Filter productId + batchNo → 200
   * - BATCH-TC40: Filter expiry range → 200
   * - BATCH-TC41: Invalid date format → 400
   * - BATCH-TC42: Future expiry before → 200
   * - BATCH-TC43: Past expiry after → empty
   * - BATCH-TC44: Case insensitive search → 200
   * - BATCH-TC45: Page beyond total → empty
   */
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

  /**
   * Get Product Batch by ID API
   * Minimum test cases: 5
   * - BATCH-TC19: Find by valid ID (200)
   * - BATCH-TC20: Batch not found (404)
   * - BATCH-TC21: Invalid ID format (tested by DTO)
   * - BATCH-TC22: Permission denied (tested by guard)
   * - BATCH-TC23: No authentication (tested by guard)
   */
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

  /**
   * Get Batches by Product API
   * Minimum test cases: 5
   * - BATCH-TC24: Find by valid product ID (200)
   * - BATCH-TC25: Product not found (404)
   * - BATCH-TC26: Empty batches list (200)
   * - BATCH-TC27: Permission denied (tested by guard)
   * - BATCH-TC28: No authentication (tested by guard)
   */
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

  /**
   * Get Expiring Batches API
   * Minimum test cases: 6
   * - BATCH-TC29: Find expiring within default days (200)
   * - BATCH-TC30: Find expiring within custom days (200)
   * - BATCH-TC31: Pagination (200)
   * - BATCH-TC32: No expiring batches (200)
   * - BATCH-TC33: Permission denied (tested by guard)
   * - BATCH-TC34: No authentication (tested by guard)
   */
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

  /**
   * Update Product Batch API - Test Cases: 25
   * Basic:
   * - BATCH-TC46: Update with valid data (200)
   * - BATCH-TC47: Batch not found (404)
   * - BATCH-TC48: Duplicate batch number (409)
   * - BATCH-TC49: Invalid dates (expiry before manufacture) (400)
   * - BATCH-TC50: Update batch number (200)
   * - BATCH-TC51: Update quantity (200)
   * - BATCH-TC52: Invalid ID format (tested by DTO)
   * - BATCH-TC53: Permission denied (tested by guard)
   * - BATCH-TC54: No authentication (tested by guard)

   * Edge Cases:
   * - BATCH-TC55: Update only batchNo → 200
   * - BATCH-TC56: Update only quantity → 200
   * - BATCH-TC57: Update only manufacture date → 200
   * - BATCH-TC58: Update only expiry date → 200
   * - BATCH-TC59: Update only barcode → 200
   * - BATCH-TC60: Update all fields → 200
   * - BATCH-TC61: Update with empty object → 200
   * - BATCH-TC62: Update batchNo to same → 200
   * - BATCH-TC63: Duplicate batchNo case insensitive → 409
   * - BATCH-TC64: Update quantity to zero → 200
   * - BATCH-TC65: Update quantity to negative → 400
   * - BATCH-TC66: Update barcode to null → 200
   * - BATCH-TC67: Update dates validate together → 400 if invalid
   * - BATCH-TC68: Update only mfg date check existing expiry → validate
   * - BATCH-TC69: Update only exp date check existing mfg → validate
   * - BATCH-TC70: Clear inbound receipt → 200
   */
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

  /**
   * Delete Product Batch API - Test Cases: 12
   * Basic:
   * - BATCH-TC71: Delete batch successfully (200)
   * - BATCH-TC72: Batch not found (404)
   * - BATCH-TC73: Delete batch with inventory (400)
   * - BATCH-TC74: Invalid ID format (tested by DTO)
   * - BATCH-TC75: Permission denied (tested by guard)
   * - BATCH-TC76: No authentication (tested by guard)

   * Edge Cases:
   * - BATCH-TC77: Delete with empty inventory array → 200
   * - BATCH-TC78: Delete with zero qty inventory → 200
   * - BATCH-TC79: Delete with reserved qty only → 400
   * - BATCH-TC80: Delete with available qty → 400
   * - BATCH-TC81: Concurrent delete → 404 second
   * - BATCH-TC82: Invalid ID format → 404

   * Total: 82 test cases for ProductBatchService
   */
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

    // Audit log
    this.auditMiddleware
      .logDelete('ProductBatch', id, batch as Record<string, unknown>)
      .catch((err) => {
        this.logger.error('Failed to write audit log for batch delete', err);
      });

    return {
      success: true,
      message: 'Product batch deleted successfully',
    };
  }
}
