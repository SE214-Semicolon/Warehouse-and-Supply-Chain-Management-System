import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class InventoryRepository {
  constructor(public readonly prisma: PrismaService) {}

  async findMovementByKey(idempotencyKey: string) {
    return this.prisma.stockMovement.findUnique({
      where: { idempotencyKey },
    });
  }

  async upsertInventory(productBatchId: string, locationId: string, quantity: number) {
    return this.prisma.inventory.upsert({
      where: {
        productBatchId_locationId: {
          productBatchId,
          locationId,
        },
      },
      update: {
        availableQty: { increment: quantity },
      },
      create: {
        productBatchId,
        locationId,
        availableQty: quantity,
        reservedQty: 0,
      },
    });
  }

  async createStockMovement(
    productBatchId: string,
    locationId: string,
    quantity: number,
    createdById: string,
    idempotencyKey?: string,
  ) {
    return this.prisma.stockMovement.create({
      data: {
        productBatchId,
        toLocationId: locationId,
        quantity,
        movementType: StockMovementType.purchase_receipt,
        createdById,
        idempotencyKey,
      },
    });
  }

  /**
   * Transactional receive: upsert inventory (increment) and create movement in single transaction.
   */
  async receiveInventoryTx(
    productBatchId: string,
    locationId: string,
    quantity: number,
    createdById?: string,
    idempotencyKey?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // upsert inventory using transaction client
      const inv = await tx.inventory.upsert({
        where: { productBatchId_locationId: { productBatchId, locationId } },
        update: { availableQty: { increment: quantity } },
        create: { productBatchId, locationId, availableQty: quantity, reservedQty: 0 },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productBatchId,
          toLocationId: locationId,
          quantity,
          movementType: StockMovementType.purchase_receipt,
          createdById,
          idempotencyKey,
        },
      });

      return { inventory: inv, movement };
    });
  }

  async decreaseInventory(productBatchId: string, locationId: string, quantity: number) {
    return this.prisma.inventory.update({
      where: {
        productBatchId_locationId: { productBatchId, locationId },
      },
      data: {
        availableQty: { decrement: quantity },
      },
    });
  }

  /**
   * Transactional dispatch: decrement inventory only if enough availableQty, and create movement in same transaction.
   * Returns { inventory, movement } on success. Throws if not enough stock.
   */
  async dispatchInventoryTx(
    productBatchId: string,
    locationId: string,
    quantity: number,
    createdById?: string,
    idempotencyKey?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // First check if inventory exists and has enough stock
      const existingInventory = await tx.inventory.findUnique({
        where: {
          productBatchId_locationId: {
            productBatchId,
            locationId,
          },
        },
      });

      if (!existingInventory || existingInventory.availableQty < quantity) {
        throw new Error('NotEnoughStock');
      }

      // Update inventory using direct update (more reliable than updateMany for this use case)
      const updatedInventory = await tx.inventory.update({
        where: {
          productBatchId_locationId: {
            productBatchId,
            locationId,
          },
        },
        data: {
          availableQty: { decrement: quantity },
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productBatchId,
          fromLocationId: locationId,
          quantity,
          movementType: StockMovementType.sale_issue,
          createdById,
          idempotencyKey,
        },
      });

      return { inventory: updatedInventory, movement };
    });
  }

  async createDispatchMovement(
    productBatchId: string,
    locationId: string,
    quantity: number,
    createdById: string,
    idempotencyKey?: string,
  ) {
    return this.prisma.stockMovement.create({
      data: {
        productBatchId,
        fromLocationId: locationId,
        quantity,
        movementType: StockMovementType.sale_issue,
        createdById,
        idempotencyKey,
      },
    });
  }

  async findInventory(productBatchId: string, locationId: string) {
    return this.prisma.inventory.findUnique({
      where: {
        productBatchId_locationId: { productBatchId, locationId },
      },
    });
  }

  async findProductBatch(productBatchId: string) {
    if (!productBatchId) return null;
    return this.prisma.productBatch.findUnique({ where: { id: productBatchId } });
  }

  async findLocation(locationId: string) {
    if (!locationId) return null;
    return this.prisma.location.findUnique({ where: { id: locationId } });
  }

  async findUser(userId: string) {
    if (!userId) return null;
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  /**
   * Transactional adjust: adjust inventory quantity and create adjustment movement in single transaction.
   */
  async adjustInventoryTx(
    productBatchId: string,
    locationId: string,
    adjustmentQuantity: number,
    createdById?: string,
    idempotencyKey?: string,
    reason?: string,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Get current inventory or create if doesn't exist
      let inventory = await tx.inventory.findUnique({
        where: { productBatchId_locationId: { productBatchId, locationId } },
      });

      if (!inventory) {
        // Create new inventory record if it doesn't exist
        inventory = await tx.inventory.create({
          data: {
            productBatchId,
            locationId,
            availableQty: 0,
            reservedQty: 0,
          },
        });
      }

      // Calculate new available quantity
      const newAvailableQty = inventory.availableQty + adjustmentQuantity;

      // Ensure we don't go negative unless it's an intentional adjustment
      if (newAvailableQty < 0 && adjustmentQuantity < 0) {
        throw new Error('NotEnoughStock');
      }

      // Update inventory
      const updatedInventory = await tx.inventory.update({
        where: { productBatchId_locationId: { productBatchId, locationId } },
        data: {
          availableQty: newAvailableQty,
        },
      });

      // Create adjustment movement
      const movement = await tx.stockMovement.create({
        data: {
          productBatchId,
          toLocationId: locationId,
          quantity: adjustmentQuantity,
          movementType: StockMovementType.adjustment,
          createdById,
          idempotencyKey,
          reference: reason,
          note,
        },
      });

      return { inventory: updatedInventory, movement };
    });
  }

  /**
   * Transactional transfer: decrease from source location, increase in destination location,
   * and create transfer movements in single transaction.
   */
  async transferInventoryTx(
    productBatchId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    createdById?: string,
    idempotencyKey?: string,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Ensure source and destination are different
      if (fromLocationId === toLocationId) {
        throw new Error('Source and destination locations must be different');
      }

      // Check if source has enough stock
      const sourceInventory = await tx.inventory.findUnique({
        where: {
          productBatchId_locationId: {
            productBatchId,
            locationId: fromLocationId,
          },
        },
      });

      if (!sourceInventory || sourceInventory.availableQty < quantity) {
        throw new Error('NotEnoughStock');
      }

      // Get or create destination inventory
      let destInventory = await tx.inventory.findUnique({
        where: {
          productBatchId_locationId: {
            productBatchId,
            locationId: toLocationId,
          },
        },
      });

      if (!destInventory) {
        destInventory = await tx.inventory.create({
          data: {
            productBatchId,
            locationId: toLocationId,
            availableQty: 0,
            reservedQty: 0,
          },
        });
      }

      // Update source inventory (decrease)
      const updatedSourceInventory = await tx.inventory.update({
        where: {
          productBatchId_locationId: {
            productBatchId,
            locationId: fromLocationId,
          },
        },
        data: {
          availableQty: { decrement: quantity },
        },
      });

      // Update destination inventory (increase)
      const updatedDestInventory = await tx.inventory.update({
        where: {
          productBatchId_locationId: {
            productBatchId,
            locationId: toLocationId,
          },
        },
        data: {
          availableQty: { increment: quantity },
        },
      });

      // Create transfer out movement
      const transferOutMovement = await tx.stockMovement.create({
        data: {
          productBatchId,
          fromLocationId,
          quantity,
          movementType: StockMovementType.transfer_out,
          createdById,
          idempotencyKey,
          note,
        },
      });

      // Create transfer in movement
      const transferInMovement = await tx.stockMovement.create({
        data: {
          productBatchId,
          toLocationId,
          quantity,
          movementType: StockMovementType.transfer_in,
          createdById,
          idempotencyKey,
          note,
        },
      });

      return {
        fromInventory: updatedSourceInventory,
        toInventory: updatedDestInventory,
        transferOutMovement,
        transferInMovement,
      };
    });
  }

  /**
   * Reserve inventory: decrease availableQty and increase reservedQty
   */
  async reserveInventoryTx(
    productBatchId: string,
    locationId: string,
    quantity: number,
    orderId: string,
    createdById?: string,
    idempotencyKey?: string,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Check if inventory exists and has enough available stock
      const existingInventory = await tx.inventory.findUnique({
        where: {
          productBatchId_locationId: {
            productBatchId,
            locationId,
          },
        },
      });

      if (!existingInventory || existingInventory.availableQty < quantity) {
        throw new Error('NotEnoughStock');
      }

      // Update inventory: decrease available, increase reserved
      const updatedInventory = await tx.inventory.update({
        where: {
          productBatchId_locationId: {
            productBatchId,
            locationId,
          },
        },
        data: {
          availableQty: { decrement: quantity },
          reservedQty: { increment: quantity },
        },
      });

      // Create reservation movement
      const movement = await tx.stockMovement.create({
        data: {
          productBatchId,
          toLocationId: locationId,
          quantity,
          movementType: StockMovementType.reservation,
          createdById,
          idempotencyKey,
          reference: orderId,
          note,
        },
      });

      return { inventory: updatedInventory, movement };
    });
  }

  /**
   * Release reservation: increase availableQty and decrease reservedQty
   */
  async releaseReservationTx(
    productBatchId: string,
    locationId: string,
    quantity: number,
    orderId: string,
    createdById?: string,
    idempotencyKey?: string,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Check if inventory exists and has enough reserved stock
      const existingInventory = await tx.inventory.findUnique({
        where: {
          productBatchId_locationId: {
            productBatchId,
            locationId,
          },
        },
      });

      if (!existingInventory || existingInventory.reservedQty < quantity) {
        throw new Error('NotEnoughReservedStock');
      }

      // Update inventory: increase available, decrease reserved
      const updatedInventory = await tx.inventory.update({
        where: {
          productBatchId_locationId: {
            productBatchId,
            locationId,
          },
        },
        data: {
          availableQty: { increment: quantity },
          reservedQty: { decrement: quantity },
        },
      });

      // Create release movement
      const movement = await tx.stockMovement.create({
        data: {
          productBatchId,
          fromLocationId: locationId,
          quantity,
          movementType: StockMovementType.release,
          createdById,
          idempotencyKey,
          reference: orderId,
          note,
        },
      });

      return { inventory: updatedInventory, movement };
    });
  }

  /**
   * Query inventory by location with pagination and sorting
   */
  async findInventoryByLocation(
    locationId: string,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'productBatchId',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    const skip = (page - 1) * limit;

    const [inventories, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where: { locationId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          productBatch: true,
          location: true,
        },
      }),
      this.prisma.inventory.count({
        where: { locationId },
      }),
    ]);

    return {
      inventories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Query inventory by product batch with pagination and sorting
   */
  async findInventoryByProductBatch(
    productBatchId: string,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'locationId',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    const skip = (page - 1) * limit;

    const [inventories, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where: { productBatchId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          productBatch: true,
          location: true,
        },
      }),
      this.prisma.inventory.count({
        where: { productBatchId },
      }),
    ]);

    return {
      inventories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
