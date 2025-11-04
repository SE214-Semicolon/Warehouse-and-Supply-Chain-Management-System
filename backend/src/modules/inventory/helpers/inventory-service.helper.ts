import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { InventoryRepository } from '../repositories/inventory.repository';

export class InventoryServiceHelper {
  static async handleIdempotency(
    idempotencyKey: string | undefined,
    inventoryRepo: InventoryRepository,
    error?: Error,
  ) {
    if (!idempotencyKey) return null;

    // If there's no error, just check for existing movement
    if (!error) {
      const existing = await inventoryRepo.findMovementByKey(idempotencyKey);
      if (existing) {
        return { success: true, idempotent: true, movement: existing };
      }
      return null;
    }

    // If error is a unique constraint violation on idempotencyKey
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await inventoryRepo.findMovementByKey(idempotencyKey);
      if (existing) {
        return { success: true, idempotent: true, movement: existing };
      }
    }

    // If not an idempotency issue, re-throw the error
    throw error;
  }
}
