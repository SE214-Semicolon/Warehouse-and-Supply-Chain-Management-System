import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ReceiveInventoryDto } from '../dto/receive-inventory.dto';
import { DispatchInventoryDto } from '../dto/dispatch-inventory.dto';

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
}
