import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepo: InventoryRepository) {}

  async receiveInventory(dto: ReceiveInventoryDto) {
    // Basic existence validation (before making DB state changes)
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

    // Idempotency: if movement exists, return it (idempotent)
    if (dto.idempotencyKey) {
      const existing = await this.inventoryRepo.findMovementByKey(dto.idempotencyKey);
      if (existing) {
        console.log('Found existing movement for idempotency key:', dto.idempotencyKey);
        return { success: true, idempotent: true, movement: existing };
      } else {
        console.log('No existing movement found for idempotency key:', dto.idempotencyKey);
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

      return { success: true, inventory, movement };
    } catch (err) {
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

  async dispatchInventory(dto: DispatchInventoryDto) {
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
      const { inventory, movement } = await this.inventoryRepo.dispatchInventoryTx(
        dto.productBatchId,
        dto.locationId,
        dto.quantity,
        dto.createdById,
        dto.idempotencyKey,
      );

      return { success: true, inventory, movement };
    } catch (err) {
      if (err instanceof Error && err.message === 'NotEnoughStock') {
        throw new BadRequestException('Not enough stock available');
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

      return { success: true, inventory, movement };
    } catch (err) {
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

      return {
        success: true,
        fromInventory,
        toInventory,
        transferOutMovement,
        transferInMovement,
      };
    } catch (err) {
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

  async reserveInventory(dto: ReserveInventoryDto) {
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

  async getInventoryByLocation(dto: QueryByLocationDto) {
    // Basic existence validation
    const location = await this.inventoryRepo.findLocation(dto.locationId);
    if (!location) {
      throw new NotFoundException(`Location not found: ${dto.locationId}`);
    }

    // Validate pagination parameters
    if (dto.page && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit && (dto.limit < 1 || dto.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const result = await this.inventoryRepo.findInventoryByLocation(
      dto.locationId,
      dto.page,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    return {
      success: true,
      ...result,
    };
  }

  async getInventoryByProductBatch(dto: QueryByProductBatchDto) {
    // Basic existence validation
    const batch = await this.inventoryRepo.findProductBatch(dto.productBatchId);
    if (!batch) {
      throw new NotFoundException(`ProductBatch not found: ${dto.productBatchId}`);
    }

    // Validate pagination parameters
    if (dto.page && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit && (dto.limit < 1 || dto.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const result = await this.inventoryRepo.findInventoryByProductBatch(
      dto.productBatchId,
      dto.page,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    return {
      success: true,
      ...result,
    };
  }

  async updateInventoryQuantity(
    productBatchId: string,
    locationId: string,
    dto: any, // UpdateQuantityDto will be imported
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

    const updatedInventory = await this.inventoryRepo.updateInventoryQuantities(
      productBatchId,
      locationId,
      dto.availableQty,
      dto.reservedQty,
      dto.updatedById,
    );

    return {
      success: true,
      inventory: updatedInventory,
      message: 'Inventory quantity updated successfully',
    };
  }

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

    const deletedInventory = await this.inventoryRepo.softDeleteInventory(productBatchId, locationId);

    return {
      success: true,
      inventory: deletedInventory,
      message: 'Inventory soft deleted successfully',
    };
  }

  async getLowStockAlerts(dto: any) { // AlertQueryDto
    // Validate pagination parameters
    if (dto.page && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit && (dto.limit < 1 || dto.limit > 100)) {
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

  async getExpiryAlerts(dto: any) { // AlertQueryDto
    // Validate pagination parameters
    if (dto.page && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit && (dto.limit < 1 || dto.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const result = await this.inventoryRepo.findExpiringInventory(
      dto.threshold || 30, // Default to 30 days
      dto.locationId,
      dto.productId,
      dto.page || 1,
      dto.limit || 20,
      dto.sortBy || 'productBatch',
      dto.sortOrder || 'asc',
    );

    return {
      success: true,
      ...result,
    };
  }

  async getStockLevelReport(dto: any) { // StockLevelReportDto
    // Validate pagination parameters
    if (dto.page && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit && (dto.limit < 1 || dto.limit > 100)) {
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

  async getMovementReport(dto: any) { // MovementReportDto
    // Validate pagination parameters
    if (dto.page && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit && (dto.limit < 1 || dto.limit > 100)) {
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

  async getValuationReport(dto: any) { // ValuationReportDto
    // Validate pagination parameters
    if (dto.page && dto.page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (dto.limit && (dto.limit < 1 || dto.limit > 100)) {
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
}
