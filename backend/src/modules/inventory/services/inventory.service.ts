import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ReceiveInventoryDto } from '../dto/receive-inventory.dto';
import { DispatchInventoryDto } from '../dto/dispatch-inventory.dto';
import { AdjustInventoryDto } from '../dto/adjust-inventory.dto';
import { TransferInventoryDto } from '../dto/transfer-inventory.dto';
import { ReserveInventoryDto } from '../dto/reserve-inventory.dto';
import { ReleaseReservationDto } from '../dto/release-reservation.dto';
import { QueryByLocationDto } from '../dto/query-by-location.dto';
import { QueryByProductBatchDto } from '../dto/query-by-product-batch.dto';
import { AlertQueryDto } from '../dto/alert-query.dto';
import { MovementQueryDto } from '../dto/movement-query.dto';
import {
  StockLevelReportDto,
  MovementReportDto,
  ValuationReportDto,
} from '../dto/report-query.dto';
import { CacheService } from 'src/cache/cache.service';
import { CACHE_PREFIX, CACHE_TTL } from 'src/cache/cache.constants';
import { AlertGenerationService } from '../../alerts/services/alert-generation.service';
import { AuditMiddleware } from '../../../database/middleware/audit.middleware';
import { LocationCapacityExceeded } from '../errors/location-capacity.error';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly cacheService: CacheService,
    private readonly alertGenService: AlertGenerationService,
    private readonly auditMiddleware: AuditMiddleware,
  ) {}

  /**
   * Receive Inventory API
   * Minimum test cases: 12
   * - INV-TC01: Receive with valid data (200)
   * - INV-TC02: Product batch not found (404)
   * - INV-TC03: Location not found (404)
   * - INV-TC04: User not found (404)
   * - INV-TC05: Idempotency key reuse (200)
   * - INV-TC06: Concurrent idempotency conflict (200)
   * - INV-TC07: Missing required fields (tested by DTO)
   * - INV-TC08: Permission denied (tested by guard)
   * - INV-TC09: No authentication (tested by guard)
   * Edge cases:
   * - Receive with very large quantity (999,999,999)
   * - Receive without createdById (optional field)
   * - Receive without idempotency key (optional field)
   */
  async receiveInventory(dto: ReceiveInventoryDto) {
    this.logger.log(
      `Receiving inventory - Batch: ${dto.productBatchId}, Location: ${dto.locationId}, Qty: ${dto.quantity}`,
    );

    // Basic existence validation (before making DB state changes)
    const batch = await this.inventoryRepo.findProductBatch(dto.productBatchId);
    if (!batch) {
      this.logger.warn(`ProductBatch not found: ${dto.productBatchId}`);
      throw new NotFoundException(`ProductBatch not found: ${dto.productBatchId}`);
    }

    // Warn if receiving expired or near-expiry batch
    if (batch.expiryDate) {
      const now = new Date();
      if (batch.expiryDate < now) {
        this.logger.warn(
          `Receiving EXPIRED batch ${batch.batchNo || batch.id}. Expired on ${batch.expiryDate.toISOString().split('T')[0]}`,
        );
      } else {
        const daysUntilExpiry = Math.floor(
          (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysUntilExpiry <= 30) {
          this.logger.warn(
            `Receiving near-expiry batch ${batch.batchNo || batch.id}. Expires in ${daysUntilExpiry} days (${batch.expiryDate.toISOString().split('T')[0]})`,
          );
        }
      }
    }

    const location = await this.inventoryRepo.findLocation(dto.locationId);
    if (!location) {
      throw new NotFoundException(`Location not found: ${dto.locationId}`);
    }

    if (dto.createdById) {
      const user = await this.inventoryRepo.findUser(dto.createdById);
      if (!user) {
        throw new NotFoundException(`User not found: ${dto.createdById}`);
      }
    }

    // Idempotency: if movement exists, return it (idempotent)
    if (dto.idempotencyKey) {
      const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
      if (existing) {
        return { success: true, idempotent: true, movement: existing };
      }
    }

    // Transactional receive: upsert inventory and create movement atomically
    try {
      const { inventory, movement } = await this.inventoryRepo.receiveInventoryTx(
        dto.productBatchId,
        dto.locationId,
        dto.quantity,
        dto.createdById,
        dto.idempotencyKey,
      );

      // Invalidate inventory caches after receive
      await this.cacheService.deleteByPrefix(CACHE_PREFIX.INVENTORY);

      // Audit logs for inventory and movement
      this.auditMiddleware
        .logCreate('StockMovement', movement as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for stock movement', err);
        });
      this.auditMiddleware
        .logUpdate('Inventory', inventory.id, null, inventory as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for inventory update', err);
        });

      return { success: true, inventory, movement };
    } catch (err) {
      if (err instanceof LocationCapacityExceeded) {
        const message = `Location capacity exceeded: capacity=${err.capacity}, currentStored=${err.currentStored}, requested=${err.requested}`;
        throw new BadRequestException(message);
      }

      // If movement creation failed due to unique constraint on idempotencyKey, return existing movement
      if (
        dto.idempotencyKey &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
        if (existing) return { success: true, idempotent: true, movement: existing };
      }

      throw err;
    }
  }

  /**
   * Dispatch Inventory API
   * Minimum test cases: 12
   * - INV-TC10: Dispatch with valid data (200)
   * - INV-TC11: Product batch not found (404)
   * - INV-TC12: Location not found (404)
   * - INV-TC13: User not found (404)
   * - INV-TC14: Not enough stock (400)
   * - INV-TC15: Idempotency key reuse (200)
   * - INV-TC16: Concurrent idempotency conflict (200)
   * - INV-TC17: Missing required fields (tested by DTO)
   * - INV-TC18: Permission denied (tested by guard)
   * - INV-TC19: No authentication (tested by guard)
   * Edge cases:
   * - Dispatch exact available quantity (all stock)
   * - Dispatch minimal quantity of 1
   */
  async dispatchInventory(dto: DispatchInventoryDto, options?: { consumeReservation?: boolean }) {
    // Basic existence validation
    const batch = await this.inventoryRepo.findProductBatch(dto.productBatchId);
    if (!batch) {
      throw new NotFoundException(`ProductBatch not found: ${dto.productBatchId}`);
    }

    // Validate batch expiry
    if (batch.expiryDate && batch.expiryDate < new Date()) {
      throw new BadRequestException(
        `Cannot dispatch expired batch ${batch.batchNo || batch.id}. Expired on ${batch.expiryDate.toISOString().split('T')[0]}`,
      );
    }

    const location = await this.inventoryRepo.findLocation(dto.locationId);
    if (!location) {
      throw new NotFoundException(`Location not found: ${dto.locationId}`);
    }

    if (dto.createdById) {
      const user = await this.inventoryRepo.findUser(dto.createdById);
      if (!user) {
        throw new NotFoundException(`User not found: ${dto.createdById}`);
      }
    }

    // Idempotency short-circuit
    if (dto.idempotencyKey) {
      const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
      if (existing) {
        return { success: true, idempotent: true, movement: existing };
      }
    }

    const consumeReservation = options?.consumeReservation || false;
    this.logger.log(
      `Dispatching inventory with consumeReservation=${consumeReservation} for batch ${dto.productBatchId}`,
    );

    try {
      const { inventory, movement } = await this.inventoryRepo.dispatchInventoryTx(
        dto.productBatchId,
        dto.locationId,
        dto.quantity,
        dto.createdById,
        dto.idempotencyKey,
        consumeReservation,
      );

      // Trigger low stock alert check (non-blocking)
      this.alertGenService
        .checkLowStockAlert({
          productBatchId: dto.productBatchId,
          locationId: dto.locationId,
          availableQty: inventory.availableQty,
        })
        .catch((err) => this.logger.warn('Failed to check low stock alert:', err));

      // Audit logging for dispatch operation
      this.auditMiddleware
        .logCreate('StockMovement', movement as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for stock movement creation', err);
        });
      this.auditMiddleware
        .logUpdate('Inventory', inventory.id, null, inventory as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for inventory update', err);
        });

      // Invalidate inventory caches
      await this.cacheService.deleteByPrefix(CACHE_PREFIX.INVENTORY);

      return { success: true, inventory, movement };
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'NotEnoughStock') {
          throw new BadRequestException('Not enough stock available');
        }
        if (err.message === 'NotEnoughReservedStock') {
          throw new BadRequestException(
            'Not enough reserved stock. This may indicate the reservation was already consumed or released.',
          );
        }
        if (err.message === 'ReservedQtyNegative') {
          throw new BadRequestException(
            'CRITICAL: Reserved quantity went negative. Data inconsistency detected.',
          );
        }
        if (err.message === 'InventoryNotFound') {
          throw new NotFoundException('Inventory record not found');
        }
      }

      // If unique constraint on idempotencyKey occurred concurrently, return existing movement
      if (
        dto.idempotencyKey &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
        if (existing) return { success: true, idempotent: true, movement: existing };
      }

      throw err;
    }
  }

  /**
   * Adjust Inventory API
   * Minimum test cases: 15
   * - INV-TC20: Adjust with positive quantity (200)
   * - INV-TC21: Adjust with negative quantity (200)
   * - INV-TC22: Product batch not found (404)
   * - INV-TC23: Location not found (404)
   * - INV-TC24: User not found (404)
   * - INV-TC25: Zero adjustment quantity (400)
   * - INV-TC26: Idempotency key reuse (200)
   * - INV-TC27: Concurrent idempotency conflict (200)
   * - INV-TC28: Missing required fields (tested by DTO)
   * - INV-TC29: Permission denied (tested by guard)
   * - INV-TC30: No authentication (tested by guard)
   * Edge cases:
   * - Adjust with very large positive value (1,000,000)
   * - Adjust with very large negative value (-50)
   * - Adjust by +1 (minimum positive)
   * - Adjust by -1 (minimum negative)
   */
  async adjustInventory(dto: AdjustInventoryDto) {
    // Basic existence validation
    const batch = await this.inventoryRepo.findProductBatch(dto.productBatchId);
    if (!batch) {
      throw new NotFoundException(`ProductBatch not found: ${dto.productBatchId}`);
    }

    const location = await this.inventoryRepo.findLocation(dto.locationId);
    if (!location) {
      throw new NotFoundException(`Location not found: ${dto.locationId}`);
    }

    if (dto.createdById) {
      const user = await this.inventoryRepo.findUser(dto.createdById);
      if (!user) {
        throw new NotFoundException(`User not found: ${dto.createdById}`);
      }
    }

    // Validate adjustment quantity
    if (dto.adjustmentQuantity === 0) {
      throw new BadRequestException('Adjustment quantity must not be zero');
    }

    // Idempotency short-circuit
    if (dto.idempotencyKey) {
      const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
      if (existing) {
        return { success: true, idempotent: true, movement: existing };
      }
    }

    try {
      const { inventory, movement } = await this.inventoryRepo.adjustInventoryTx(
        dto.productBatchId,
        dto.locationId,
        dto.adjustmentQuantity,
        dto.createdById,
        dto.idempotencyKey,
        dto.reason,
        dto.note,
      );

      // Trigger low stock alert check if adjustment decreased inventory (non-blocking)
      if (dto.adjustmentQuantity < 0) {
        this.alertGenService
          .checkLowStockAlert({
            productBatchId: dto.productBatchId,
            locationId: dto.locationId,
            availableQty: inventory.availableQty,
          })
          .catch((err) => this.logger.warn('Failed to check low stock alert:', err));
      }

      // Audit logging for adjustment operation
      this.auditMiddleware
        .logCreate('StockMovement', movement as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for stock movement creation', err);
        });
      this.auditMiddleware
        .logUpdate('Inventory', inventory.id, null, inventory as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for inventory update', err);
        });

      // Invalidate inventory caches
      await this.cacheService.deleteByPrefix(CACHE_PREFIX.INVENTORY);

      return { success: true, inventory, movement };
    } catch (err) {
      if (err instanceof LocationCapacityExceeded) {
        const message = `Location capacity exceeded: capacity=${err.capacity}, currentStored=${err.currentStored}, requested=${err.requested}`;
        throw new BadRequestException(message);
      }

      // If unique constraint on idempotencyKey occurred concurrently, return existing movement
      if (
        dto.idempotencyKey &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
        if (existing) return { success: true, idempotent: true, movement: existing };
      }

      throw err;
    }
  }

  /**
   * Transfer Inventory API
   * Minimum test cases: 14
   * - INV-TC31: Transfer with valid data (200)
   * - INV-TC32: Product batch not found (404)
   * - INV-TC33: From location not found (404)
   * - INV-TC34: To location not found (404)
   * - INV-TC35: User not found (404)
   * - INV-TC36: Same source and destination (400)
   * - INV-TC37: Not enough stock (400)
   * - INV-TC38: Idempotency key reuse (200)
   * - INV-TC39: Concurrent idempotency conflict (200)
   * - INV-TC40: Missing required fields (tested by DTO)
   * - INV-TC41: Permission denied (tested by guard)
   * - INV-TC42: No authentication (tested by guard)
   * Edge cases:
   * - Transfer entire available quantity
   * - Transfer minimal quantity of 1
   */
  async transferInventory(dto: TransferInventoryDto) {
    // Basic existence validation
    const batch = await this.inventoryRepo.findProductBatch(dto.productBatchId);
    if (!batch) {
      throw new NotFoundException(`ProductBatch not found: ${dto.productBatchId}`);
    }

    const fromLocation = await this.inventoryRepo.findLocation(dto.fromLocationId);
    if (!fromLocation) {
      throw new NotFoundException(`From location not found: ${dto.fromLocationId}`);
    }

    const toLocation = await this.inventoryRepo.findLocation(dto.toLocationId);
    if (!toLocation) {
      throw new NotFoundException(`To location not found: ${dto.toLocationId}`);
    }

    if (dto.createdById) {
      const user = await this.inventoryRepo.findUser(dto.createdById);
      if (!user) {
        throw new NotFoundException(`User not found: ${dto.createdById}`);
      }
    }

    // Validate that source and destination are different
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('Source and destination locations must be different');
    }

    // Idempotency short-circuit
    if (dto.idempotencyKey) {
      const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
      if (existing) {
        return { success: true, idempotent: true, movement: existing };
      }
    }

    try {
      const { fromInventory, toInventory, transferOutMovement, transferInMovement } =
        await this.inventoryRepo.transferInventoryTx(
          dto.productBatchId,
          dto.fromLocationId,
          dto.toLocationId,
          dto.quantity,
          dto.createdById,
          dto.idempotencyKey,
          dto.note,
        );

      // Audit logging for transfer operation
      this.auditMiddleware
        .logCreate('StockMovement', transferOutMovement as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for transfer out movement', err);
        });
      this.auditMiddleware
        .logCreate('StockMovement', transferInMovement as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for transfer in movement', err);
        });
      this.auditMiddleware
        .logUpdate('Inventory', fromInventory.id, null, fromInventory as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for from inventory update', err);
        });
      this.auditMiddleware
        .logUpdate('Inventory', toInventory.id, null, toInventory as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for to inventory update', err);
        });

      // Invalidate inventory caches
      await this.cacheService.deleteByPrefix(CACHE_PREFIX.INVENTORY);

      return {
        success: true,
        fromInventory,
        toInventory,
        transferOutMovement,
        transferInMovement,
      };
    } catch (err) {
      if (err instanceof LocationCapacityExceeded) {
        const message = `Location capacity exceeded: capacity=${err.capacity}, currentStored=${err.currentStored}, requested=${err.requested}`;
        throw new BadRequestException(message);
      }

      if (err instanceof Error && err.message === 'NotEnoughStock') {
        throw new BadRequestException('Not enough stock available for transfer');
      }

      // If unique constraint on idempotencyKey occurred concurrently, return existing movement
      if (
        dto.idempotencyKey &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
        if (existing) return { success: true, idempotent: true, movement: existing };
      }

      throw err;
    }
  }

  /**
   * Reserve Inventory API
   * Minimum test cases: 13
   * - INV-TC43: Reserve with valid data (200)
   * - INV-TC44: Product batch not found (404)
   * - INV-TC45: Location not found (404)
   * - INV-TC46: User not found (404)
   * - INV-TC47: Zero or negative quantity (400)
   * - INV-TC48: Not enough available stock (400)
   * - INV-TC49: Idempotency key reuse (200)
   * - INV-TC50: Concurrent idempotency conflict (200)
   * - INV-TC51: Missing required fields (tested by DTO)
   * - INV-TC52: Permission denied (tested by guard)
   * - INV-TC53: No authentication (tested by guard)
   * Edge cases:
   * - Reserve entire available quantity
   * - Reserve minimal quantity of 1
   */
  async reserveInventory(dto: ReserveInventoryDto) {
    // Basic existence validation
    const batch = await this.inventoryRepo.findProductBatch(dto.productBatchId);
    if (!batch) {
      throw new NotFoundException(`ProductBatch not found: ${dto.productBatchId}`);
    }

    // Validate batch expiry - don't reserve expired batches
    if (batch.expiryDate && batch.expiryDate < new Date()) {
      throw new BadRequestException(
        `Cannot reserve expired batch ${batch.batchNo || batch.id}. Expired on ${batch.expiryDate.toISOString().split('T')[0]}`,
      );
    }

    const location = await this.inventoryRepo.findLocation(dto.locationId);
    if (!location) {
      throw new NotFoundException(`Location not found: ${dto.locationId}`);
    }

    if (dto.createdById) {
      const user = await this.inventoryRepo.findUser(dto.createdById);
      if (!user) {
        throw new NotFoundException(`User not found: ${dto.createdById}`);
      }
    }

    // Validate quantity
    if (dto.quantity <= 0) {
      throw new BadRequestException('Reservation quantity must be greater than zero');
    }

    // Idempotency short-circuit
    if (dto.idempotencyKey) {
      const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
      if (existing) {
        return { success: true, idempotent: true, movement: existing };
      }
    }

    try {
      const { inventory, movement } = await this.inventoryRepo.reserveInventoryTx(
        dto.productBatchId,
        dto.locationId,
        dto.quantity,
        dto.orderId,
        dto.createdById,
        dto.idempotencyKey,
        dto.note,
      );

      // Audit logging for reserve operation
      this.auditMiddleware
        .logCreate('StockMovement', movement as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for reserve movement', err);
        });
      this.auditMiddleware
        .logUpdate('Inventory', inventory.id, null, inventory as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for inventory update', err);
        });

      // Invalidate inventory caches
      await this.cacheService.deleteByPrefix(CACHE_PREFIX.INVENTORY);

      return { success: true, inventory, movement };
    } catch (err) {
      if (err instanceof Error && err.message === 'NotEnoughStock') {
        throw new BadRequestException('Not enough available stock to reserve');
      }

      // If unique constraint on idempotencyKey occurred concurrently, return existing movement
      if (
        dto.idempotencyKey &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
        if (existing) return { success: true, idempotent: true, movement: existing };
      }

      throw err;
    }
  }

  /**
   * Release Reservation API
   * Minimum test cases: 13
   * - INV-TC54: Release with valid data (200)
   * - INV-TC55: Product batch not found (404)
   * - INV-TC56: Location not found (404)
   * - INV-TC57: User not found (404)
   * - INV-TC58: Inventory not found (404)
   * - INV-TC59: Not enough reserved stock (400)
   * - INV-TC60: Idempotency key reuse (200)
   * - INV-TC61: Concurrent idempotency conflict (200)
   * - INV-TC62: Missing required fields (tested by DTO)
   * - INV-TC63: Permission denied (tested by guard)
   * - INV-TC64: No authentication (tested by guard)
   * Edge cases:
   * - Release entire reserved quantity
   * - Release partial reservation
   */
  async releaseReservation(dto: ReleaseReservationDto) {
    // Basic existence validation
    const batch = await this.inventoryRepo.findProductBatch(dto.productBatchId);
    if (!batch) {
      throw new NotFoundException(`ProductBatch not found: ${dto.productBatchId}`);
    }

    const location = await this.inventoryRepo.findLocation(dto.locationId);
    if (!location) {
      throw new NotFoundException(`Location not found: ${dto.locationId}`);
    }

    if (dto.createdById) {
      const user = await this.inventoryRepo.findUser(dto.createdById);
      if (!user) {
        throw new NotFoundException(`User not found: ${dto.createdById}`);
      }
    }

    // Idempotency short-circuit
    if (dto.idempotencyKey) {
      const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
      if (existing) {
        return { success: true, idempotent: true, movement: existing };
      }
    }

    try {
      const { inventory, movement } = await this.inventoryRepo.releaseReservationTx(
        dto.productBatchId,
        dto.locationId,
        dto.quantity,
        dto.orderId,
        dto.createdById,
        dto.idempotencyKey,
        dto.note,
      );

      // Audit logging for release reservation operation
      this.auditMiddleware
        .logCreate('StockMovement', movement as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for release movement', err);
        });
      this.auditMiddleware
        .logUpdate('Inventory', inventory.id, null, inventory as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for inventory update', err);
        });

      // Invalidate inventory caches
      await this.cacheService.deleteByPrefix(CACHE_PREFIX.INVENTORY);

      return { success: true, inventory, movement };
    } catch (err) {
      if (err instanceof Error && err.message === 'NotEnoughReservedStock') {
        throw new BadRequestException('Not enough reserved stock to release');
      }
      if (err instanceof Error && err.message === 'InventoryNotFound') {
        throw new NotFoundException('Inventory not found');
      }

      // If unique constraint on idempotencyKey occurred concurrently, return existing movement
      if (
        dto.idempotencyKey &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
        if (existing) return { success: true, idempotent: true, movement: existing };
      }

      throw err;
    }
  }

  /**
   * Get Inventory by Location API
   * Minimum test cases: 11
   * - INV-TC65: Get with valid location (200)
   * - INV-TC66: Location not found (404)
   * - INV-TC67: Invalid page number (400)
   * - INV-TC68: Invalid limit (400)
   * - INV-TC69: Pagination and sorting (200)
   * - INV-TC70: Cache hit (200)
   * - INV-TC71: Permission denied (tested by guard)
   * - INV-TC72: No authentication (tested by guard)
   * Edge cases:
   * - Page = 0 (should reject)
   * - Limit = 0 (should reject)
   * - Limit > 100 (should reject)
   */
  async getInventoryByLocation(dto: QueryByLocationDto) {
    // Basic existence validation
    const location = await this.inventoryRepo.findLocation(dto.locationId);
    if (!location) {
      throw new NotFoundException(`Location not found: ${dto.locationId}`);
    }

    // Validate pagination parameters
    if (dto.page != undefined && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit != undefined && (dto.limit < 1 || dto.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    // Cache key based on query params
    const cacheKey = {
      prefix: CACHE_PREFIX.INVENTORY,
      key: `location:${dto.locationId}:${dto.page || 1}:${dto.limit || 20}:${dto.sortBy || 'productBatchId'}:${dto.sortOrder || 'asc'}`,
    };

    const result = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.inventoryRepo.findInventoryByLocation(
          dto.locationId,
          dto.page,
          dto.limit,
          dto.sortBy,
          dto.sortOrder,
        );
      },
      { ttl: CACHE_TTL.SHORT },
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get Inventory by Product Batch API
   * Minimum test cases: 8
   * - INV-TC73: Get with valid product batch (200)
   * - INV-TC74: Product batch not found (404)
   * - INV-TC75: Invalid page number (400)
   * - INV-TC76: Invalid limit (400)
   * - INV-TC77: Pagination and sorting (200)
   * - INV-TC78: Cache hit (200)
   * - INV-TC79: Permission denied (tested by guard)
   * - INV-TC80: No authentication (tested by guard)
   */
  async getInventoryByProductBatch(dto: QueryByProductBatchDto) {
    // Basic existence validation
    const batch = await this.inventoryRepo.findProductBatch(dto.productBatchId);
    if (!batch) {
      throw new NotFoundException(`ProductBatch not found: ${dto.productBatchId}`);
    }

    // Validate pagination parameters
    if (dto.page != undefined && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit != undefined && (dto.limit < 1 || dto.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    // Cache key based on query params
    const cacheKey = {
      prefix: CACHE_PREFIX.INVENTORY,
      key: `batch:${dto.productBatchId}:${dto.page || 1}:${dto.limit || 20}:${dto.sortBy || 'locationId'}:${dto.sortOrder || 'asc'}`,
    };

    const result = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.inventoryRepo.findInventoryByProductBatch(
          dto.productBatchId,
          dto.page,
          dto.limit,
          dto.sortBy,
          dto.sortOrder,
        );
      },
      { ttl: CACHE_TTL.SHORT },
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Update Inventory Quantity API
   * Minimum test cases: 12
   * - INV-TC81: Update with valid data (200)
   * - INV-TC82: Product batch not found (404)
   * - INV-TC83: Location not found (404)
   * - INV-TC84: User not found (404)
   * - INV-TC85: Negative available quantity (400)
   * - INV-TC86: Negative reserved quantity (400)
   * - INV-TC87: Missing required fields (tested by DTO)
   * - INV-TC88: Permission denied (tested by guard)
   * - INV-TC89: No authentication (tested by guard)
   * Edge cases:
   * - Update both quantities to 0
   * - Update only availableQty
   * - Update with very large values (999,999,999)
   */
  async updateInventoryQuantity(
    productBatchId: string,
    locationId: string,
    dto: { availableQty: number; reservedQty?: number; updatedById?: string },
  ) {
    // Basic existence validation
    const batch = await this.inventoryRepo.findProductBatch(productBatchId);
    if (!batch) {
      throw new NotFoundException(`ProductBatch not found: ${productBatchId}`);
    }

    const location = await this.inventoryRepo.findLocation(locationId);
    if (!location) {
      throw new NotFoundException(`Location not found: ${locationId}`);
    }

    if (dto.updatedById) {
      const user = await this.inventoryRepo.findUser(dto.updatedById);
      if (!user) {
        throw new NotFoundException(`User not found: ${dto.updatedById}`);
      }
    }

    // Validate quantities
    if (dto.availableQty < 0) {
      throw new BadRequestException('Available quantity cannot be negative');
    }

    if (dto.reservedQty !== undefined && dto.reservedQty < 0) {
      throw new BadRequestException('Reserved quantity cannot be negative');
    }

    let updatedInventory;
    try {
      updatedInventory = await this.inventoryRepo.updateInventoryQuantities(
        productBatchId,
        locationId,
        dto.availableQty,
        dto.reservedQty,
      );
    } catch (err) {
      if (err instanceof LocationCapacityExceeded) {
        const message = `Location capacity exceeded: capacity=${err.capacity}, currentStored=${err.currentStored}, requested=${err.requested}`;
        throw new BadRequestException(message);
      }
      throw err;
    }

    // Invalidate inventory caches
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.INVENTORY);

    return {
      success: true,
      inventory: updatedInventory,
      message: 'Inventory quantity updated successfully',
    };
  }

  /**
   * Soft Delete Inventory API
   * Minimum test cases: 6
   * - INV-TC90: Soft delete with valid data (200)
   * - INV-TC91: Product batch not found (404)
   * - INV-TC92: Location not found (404)
   * - INV-TC93: Invalid ID format (tested by DTO)
   * - INV-TC94: Permission denied (tested by guard)
   * - INV-TC95: No authentication (tested by guard)
   */
  async softDeleteInventory(productBatchId: string, locationId: string) {
    // Basic existence validation
    const batch = await this.inventoryRepo.findProductBatch(productBatchId);
    if (!batch) {
      throw new NotFoundException(`ProductBatch not found: ${productBatchId}`);
    }

    const location = await this.inventoryRepo.findLocation(locationId);
    if (!location) {
      throw new NotFoundException(`Location not found: ${locationId}`);
    }

    const deletedInventory = await this.inventoryRepo.softDeleteInventory(
      productBatchId,
      locationId,
    );

    // Invalidate inventory caches
    await this.cacheService.deleteByPrefix(CACHE_PREFIX.INVENTORY);

    return {
      success: true,
      inventory: deletedInventory,
      message: 'Inventory soft deleted successfully',
    };
  }

  /**
   * Get Low Stock Alerts API
   * Minimum test cases: 8
   * - INV-TC96: Get alerts with threshold (200)
   * - INV-TC97: Filter by location and product (200)
   * - INV-TC98: Invalid pagination (400)
   * - INV-TC99: Permission denied (tested by guard)
   * - INV-TC100: No authentication (tested by guard)
   * Edge cases:
   * - Get alerts with very high threshold (10,000)
   * - Get alerts with negative page (should reject)
   * - Get alerts without threshold (should use default 10)
   */
  async getLowStockAlerts(dto: AlertQueryDto) {
    // Validate pagination parameters
    if (dto.page != undefined && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit != undefined && (dto.limit < 1 || dto.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const result = await this.inventoryRepo.findLowStockInventory(
      dto.threshold || 10,
      dto.locationId,
      dto.productId,
      dto.page || 1,
      dto.limit || 20,
      dto.sortBy || 'availableQty',
      dto.sortOrder || 'asc',
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get Expiry Alerts API
   * (Shares test cases with Low Stock Alerts - similar logic)
   * Test coverage: INV-TC96 to TC100 apply here too
   */
  async getExpiryAlerts(dto: AlertQueryDto) {
    // Validate pagination parameters
    if (dto.page != undefined && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit != undefined && (dto.limit < 1 || dto.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const result = await this.inventoryRepo.findExpiringInventory(
      dto.threshold || 30, // Default to 30 days
      dto.locationId,
      dto.productId,
      dto.page || 1,
      dto.limit || 20,
      dto.sortBy || 'updatedAt',
      dto.sortOrder || 'asc',
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get Stock Level Report API
   * (Similar pagination/validation logic to alert APIs)
   * Test coverage: Similar to INV-TC96-100
   */
  async getStockLevelReport(dto: StockLevelReportDto) {
    // Validate pagination parameters
    if (dto.page != undefined && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit != undefined && (dto.limit < 1 || dto.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const result = await this.inventoryRepo.generateStockLevelReport(
      dto.locationId,
      dto.productId,
      dto.groupBy || 'location',
      dto.page || 1,
      dto.limit || 20,
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get Movement Report API
   * (Similar pagination/validation logic to other report APIs)
   * Test coverage: Similar to INV-TC96-100
   */
  async getMovementReport(dto: MovementReportDto) {
    // Validate pagination parameters
    if (dto.page != undefined && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit != undefined && (dto.limit < 1 || dto.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const result = await this.inventoryRepo.generateMovementReport(
      dto.startDate,
      dto.endDate,
      dto.locationId,
      dto.productId,
      dto.movementType,
      dto.page || 1,
      dto.limit || 20,
      dto.sortBy || 'createdAt',
      dto.sortOrder || 'desc',
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get Valuation Report API
   * (Similar pagination/validation logic to other report APIs)
   * Test coverage: Similar to INV-TC96-100
   */
  async getValuationReport(dto: ValuationReportDto) {
    // Validate pagination parameters
    if (dto.page != undefined && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit != undefined && (dto.limit < 1 || dto.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const result = await this.inventoryRepo.generateValuationReport(
      dto.locationId,
      dto.productId,
      dto.method || 'AVERAGE',
      dto.page || 1,
      dto.limit || 20,
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get Movements By Product Batch API
   * Returns movement history for a specific product batch
   * Test coverage: INV-TC101-105
   * - INV-TC101: Get movements with valid product batch ID (200)
   * - INV-TC102: Product batch not found (404)
   * - INV-TC103: Filter by movement type (200)
   * - INV-TC104: Filter by location (200)
   * - INV-TC105: Filter by date range (200)
   */
  async getMovementsByProductBatch(dto: MovementQueryDto) {
    this.logger.log(`Getting movements for product batch: ${dto.productBatchId}`);

    // Validate product batch exists
    const batch = await this.inventoryRepo.findProductBatch(dto.productBatchId);
    if (!batch) {
      throw new NotFoundException(`ProductBatch not found: ${dto.productBatchId}`);
    }

    // Validate pagination parameters
    if (dto.page != undefined && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit != undefined && (dto.limit < 1 || dto.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const result = await this.inventoryRepo.getMovementsByProductBatch(
      dto.productBatchId,
      dto.movementType,
      dto.locationId,
      dto.startDate,
      dto.endDate,
      dto.page || 1,
      dto.limit || 20,
      dto.sortBy || 'createdAt',
      dto.sortOrder || 'desc',
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get inventory for specific batch and location
   * Used for batch-specific validation in Sales Order submission
   */
  async getInventoryByBatchAndLocation(
    productBatchId: string,
    locationId: string,
  ): Promise<{ availableQty: number; reservedQty: number } | null> {
    const inventory = await this.inventoryRepo.findInventory(productBatchId, locationId);
    if (!inventory) return null;
    return {
      availableQty: inventory.availableQty,
      reservedQty: inventory.reservedQty,
    };
  }

  /**
   * Get GLOBAL inventory summary for a product (all batches/locations)
   * Used for flexible validation when SO items don't have specific batch/location
   *
   * Formula: TotalAvailable = SUM(availableQty) across ALL inventory records
   * Note: This does NOT consider reservedQty from other orders
   */
  async getGlobalInventoryByProduct(productId: string): Promise<{
    productId: string;
    productName: string | null;
    totalAvailableQty: number;
    totalReservedQty: number;
    batchCount: number;
  }> {
    this.logger.log(`Calculating global inventory for product: ${productId}`);

    // Query all inventory records for this product across all batches and locations
    const inventories = await this.inventoryRepo.findInventoriesByProduct(productId);

    if (!inventories || inventories.length === 0) {
      // Product exists but has no inventory
      return {
        productId,
        productName: null,
        totalAvailableQty: 0,
        totalReservedQty: 0,
        batchCount: 0,
      };
    }

    // Calculate totals
    const totalAvailableQty = inventories.reduce((sum, inv) => sum + inv.availableQty, 0);
    const totalReservedQty = inventories.reduce((sum, inv) => sum + inv.reservedQty, 0);
    const batchCount = new Set(inventories.map((inv) => inv.productBatchId)).size;

    // Get product name from first inventory record
    const productName = inventories[0]?.productBatch?.product?.name || null;

    this.logger.log(
      `Global inventory for product ${productId}: Available=${totalAvailableQty}, Reserved=${totalReservedQty}, Batches=${batchCount}`,
    );

    return {
      productId,
      productName,
      totalAvailableQty,
      totalReservedQty,
      batchCount,
    };
  }

  /**
   * Get available inventory for FEFO (First Expired First Out) allocation
   * Returns inventory records sorted by expiry date (nearest expiry first)
   * Only includes non-expired batches with availableQty > 0
   *
   * Used for automatic inventory allocation in Sales Order submission
   */
  async getAvailableInventoryForFEFO(productId: string): Promise<
    Array<{
      productBatchId: string;
      locationId: string;
      availableQty: number;
      reservedQty: number;
      expiryDate: Date | null;
      batchNo: string | null;
      locationName: string | null;
    }>
  > {
    this.logger.log(`Finding available inventory for FEFO allocation: ${productId}`);

    const inventories = await this.inventoryRepo.findAvailableInventoryForFEFO(productId);

    return inventories.map((inv) => ({
      productBatchId: inv.productBatchId,
      locationId: inv.locationId,
      availableQty: inv.availableQty,
      reservedQty: inv.reservedQty,
      expiryDate: inv.productBatch?.expiryDate || null,
      batchNo: inv.productBatch?.batchNo || null,
      locationName: inv.location?.name || null,
    }));
  }
}
