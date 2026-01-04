import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { StockMovementType, Prisma } from '@prisma/client';
import { IInventoryRepository } from '../interfaces/inventory-repository.interface';
import { LocationCapacityExceeded } from '../errors/location-capacity.error';

// Type definitions for inventory operations
type InventoryWithRelations = Prisma.InventoryGetPayload<{
  include: {
    productBatch: {
      include: {
        product: {
          include: {
            category: true;
          };
        };
      };
    };
    location: true;
  };
}>;

type GroupedInventoryData = {
  groupName: string;
  totalAvailableQty: number;
  totalReservedQty: number;
  totalValue: number;
  items: InventoryWithRelations[];
};

type ValuationData = InventoryWithRelations & {
  unitValue: number;
  totalValue: number;
};

@Injectable()
export class InventoryRepository implements IInventoryRepository {
  private readonly logger = new Logger(InventoryRepository.name);

  constructor(public readonly prisma: PrismaService) {}

  async findMovementByKey(idempotencyKey: string) {
    try {
      this.logger.debug(`Finding movement by idempotency key: ${idempotencyKey}`);
      return this.prisma.stockMovement.findUnique({
        where: { idempotencyKey },
      });
    } catch (error) {
      this.logger.error(`Error finding movement by key ${idempotencyKey}:`, error);
      throw error;
    }
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
    try {
      this.logger.log(
        `Receiving inventory - Batch: ${productBatchId}, Location: ${locationId}, Qty: ${quantity}`,
      );
      return this.prisma.$transaction(async (tx) => {
        // Check capacity for location before receiving
        const location = await tx.location.findUnique({ where: { id: locationId } });
        if (location && location.capacity != null) {
          const agg = await tx.inventory.aggregate({
            where: { locationId },
            _sum: { availableQty: true, reservedQty: true },
          });
          const currentStored = (agg._sum?.availableQty || 0) + (agg._sum?.reservedQty || 0);
          const projected = currentStored + quantity;
          if (location.capacity < projected) {
            throw new LocationCapacityExceeded(location.capacity, currentStored, quantity);
          }
        }

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

        this.logger.log(`Inventory received successfully - Movement ID: ${movement.id}`);
        return { inventory: inv, movement };
      });
    } catch (error) {
      this.logger.error(
        `Error receiving inventory - Batch: ${productBatchId}, Location: ${locationId}:`,
        error,
      );
      throw error;
    }
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
   * Transactional dispatch: decrement inventory and create movement in single transaction.
   * REFACTORED: Support atomic reservation consumption
   *
   * @param consumeReservation - If true, decrements BOTH availableQty AND reservedQty (for orders with reservation)
   *                            If false, decrements ONLY availableQty (direct dispatch without reservation)
   *
   * Returns { inventory, movement } on success. Throws if not enough stock.
   */
  async dispatchInventoryTx(
    productBatchId: string,
    locationId: string,
    quantity: number,
    createdById?: string,
    idempotencyKey?: string,
    consumeReservation: boolean = false,
  ) {
    try {
      this.logger.log(
        `Dispatching inventory - Batch: ${productBatchId}, Location: ${locationId}, Qty: ${quantity}, ConsumeReservation: ${consumeReservation}`,
      );
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

        if (!existingInventory) {
          this.logger.warn(
            `Inventory not found - Batch: ${productBatchId}, Location: ${locationId}`,
          );
          throw new Error('InventoryNotFound');
        }

        // Validation logic depends on whether we're consuming reservation
        if (consumeReservation) {
          // When consuming reservation: check if we have enough reserved quantity
          if (existingInventory.reservedQty < quantity) {
            this.logger.warn(
              `Not enough reserved stock - Batch: ${productBatchId}, Location: ${locationId}, Reserved: ${existingInventory.reservedQty}, Requested: ${quantity}`,
            );
            throw new Error('NotEnoughReservedStock');
          }
          // Also ensure total quantity is sufficient (safety check)
          const totalQty = existingInventory.availableQty + existingInventory.reservedQty;
          if (totalQty < quantity) {
            this.logger.error(
              `Data inconsistency - Total quantity insufficient. This should not happen!`,
            );
            throw new Error('NotEnoughStock');
          }
        } else {
          // When NOT consuming reservation: check available quantity only
          if (existingInventory.availableQty < quantity) {
            this.logger.warn(
              `Not enough available stock - Batch: ${productBatchId}, Location: ${locationId}, Available: ${existingInventory.availableQty}, Requested: ${quantity}`,
            );
            throw new Error('NotEnoughStock');
          }
        }

        // Update inventory based on dispatch mode
        const updateData: Prisma.InventoryUpdateInput = consumeReservation
          ? {
              // ATOMIC: Consume reservation - decrement BOTH availableQty and reservedQty
              // This prevents double-counting: reservation already moved qty from available to reserved
              // Now we remove it from both (net effect: total qty decreases by quantity)
              availableQty: { decrement: quantity },
              reservedQty: { decrement: quantity },
            }
          : {
              // Direct dispatch without reservation - decrement availableQty only
              availableQty: { decrement: quantity },
            };

        const updatedInventory = await tx.inventory.update({
          where: {
            productBatchId_locationId: {
              productBatchId,
              locationId,
            },
          },
          data: updateData,
        });

        // Validate that reservedQty didn't go negative (data integrity check)
        if (updatedInventory.reservedQty < 0) {
          this.logger.error(
            `CRITICAL: Reserved quantity went negative after dispatch! This indicates a bug.`,
          );
          throw new Error('ReservedQtyNegative');
        }

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

        this.logger.log(
          `Inventory dispatched successfully - Movement ID: ${movement.id}, Mode: ${consumeReservation ? 'ConsumeReservation' : 'Direct'}`,
        );
        return { inventory: updatedInventory, movement };
      });
    } catch (error) {
      this.logger.error(
        `Error dispatching inventory - Batch: ${productBatchId}, Location: ${locationId}:`,
        error,
      );
      throw error;
    }
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
    try {
      if (!productBatchId) return null;
      this.logger.debug(`Finding product batch: ${productBatchId}`);
      return this.prisma.productBatch.findUnique({ where: { id: productBatchId } });
    } catch (error) {
      this.logger.error(`Error finding product batch ${productBatchId}:`, error);
      throw error;
    }
  }

  async findLocation(locationId: string) {
    try {
      if (!locationId) return null;
      this.logger.debug(`Finding location: ${locationId}`);
      return this.prisma.location.findUnique({ where: { id: locationId } });
    } catch (error) {
      this.logger.error(`Error finding location ${locationId}:`, error);
      throw error;
    }
  }

  async findUser(userId: string) {
    try {
      if (!userId) return null;
      this.logger.debug(`Finding user: ${userId}`);
      return this.prisma.user.findUnique({ where: { id: userId } });
    } catch (error) {
      this.logger.error(`Error finding user ${userId}:`, error);
      throw error;
    }
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
      // Get current inventory or create if it doesn't exist
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

      // If positive adjustment, check capacity first
      if (adjustmentQuantity > 0) {
        const location = await tx.location.findUnique({ where: { id: locationId } });
        if (location && location.capacity != null) {
          const agg = await tx.inventory.aggregate({
            where: { locationId },
            _sum: { availableQty: true, reservedQty: true },
          });
          const currentStored = (agg._sum?.availableQty || 0) + (agg._sum?.reservedQty || 0);
          const projected = currentStored + adjustmentQuantity;
          if (location.capacity < projected) {
            throw new LocationCapacityExceeded(
              location.capacity,
              currentStored,
              adjustmentQuantity,
            );
          }
        }
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

      // Check destination capacity before creating/updating dest inventory
      const toLocation = await tx.location.findUnique({ where: { id: toLocationId } });
      if (toLocation && toLocation.capacity != null) {
        const agg = await tx.inventory.aggregate({
          where: { locationId: toLocationId },
          _sum: { availableQty: true, reservedQty: true },
        });
        const currentStoredDest = (agg._sum?.availableQty || 0) + (agg._sum?.reservedQty || 0);
        const projectedDest = currentStoredDest + quantity;
        if (toLocation.capacity < projectedDest) {
          throw new LocationCapacityExceeded(toLocation.capacity, currentStoredDest, quantity);
        }
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

      // Create a transfer group id to link the out/in movements
      const transferGroupId = randomUUID();

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
          transferGroupId,
        },
      });

      // Create transfer in movement (no idempotency key to avoid conflicts)
      const transferInMovement = await tx.stockMovement.create({
        data: {
          productBatchId,
          toLocationId,
          quantity,
          movementType: StockMovementType.transfer_in,
          createdById,
          note,
          transferGroupId,
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
    quantity: number | undefined,
    orderId: string,
    createdById?: string,
    idempotencyKey?: string,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Check if inventory exists
      const existingInventory = await tx.inventory.findUnique({
        where: {
          productBatchId_locationId: {
            productBatchId,
            locationId,
          },
        },
      });

      if (!existingInventory) {
        throw new Error('InventoryNotFound');
      }

      // If quantity is not specified, release all reserved stock
      const releaseQuantity = quantity || existingInventory.reservedQty;

      if (existingInventory.reservedQty < releaseQuantity) {
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
          availableQty: { increment: releaseQuantity },
          reservedQty: { decrement: releaseQuantity },
        },
      });

      // Create release movement
      const movement = await tx.stockMovement.create({
        data: {
          productBatchId,
          fromLocationId: locationId,
          quantity: releaseQuantity,
          movementType: StockMovementType.sale_issue,
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
    // Input validation
    if (page < 1) throw new Error('Page must be greater than 0');
    if (limit < 1 || limit > 1000) throw new Error('Limit must be between 1 and 1000');

    const skip = (page - 1) * limit;

    // Handle sorting by related fields
    let orderBy: Prisma.InventoryOrderByWithRelationInput;
    switch (sortBy) {
      case 'productName':
        orderBy = { productBatch: { product: { name: sortOrder } } };
        break;
      case 'productBatch':
        orderBy = { productBatch: { batchNo: sortOrder } };
        break;
      case 'location':
        orderBy = { location: { name: sortOrder } };
        break;
      default:
        // Default sorting by inventory table fields
        orderBy = { [sortBy]: sortOrder } as Prisma.InventoryOrderByWithRelationInput;
    }

    // Define include clause as a constant for reusability and clarity
    const includeClause: Prisma.InventoryInclude = {
      productBatch: {
        include: {
          product: true, // Consider using select if only specific fields are needed
        },
      },
      location: true,
    };

    try {
      const [inventories, total] = await Promise.all([
        this.prisma.inventory.findMany({
          where: { locationId },
          skip,
          take: limit,
          orderBy,
          include: includeClause,
        }),
        this.prisma.inventory.count({
          where: { locationId },
        }),
      ]);

      const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

      return {
        inventories,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      // Log error and throw a domain-specific exception
      console.error('Error fetching inventory by location:', error);
      throw new Error('Failed to retrieve inventory data');
    }
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

    // Handle sorting by related fields
    let orderBy: Prisma.InventoryOrderByWithRelationInput;
    switch (sortBy) {
      case 'location':
        orderBy = { location: { name: sortOrder } };
        break;
      case 'productBatch':
        orderBy = { productBatch: { batchNo: sortOrder } };
        break;
      case 'productName':
        orderBy = { productBatch: { product: { name: sortOrder } } };
        break;
      default:
        // Default sorting by inventory table fields
        orderBy = { [sortBy]: sortOrder } as Prisma.InventoryOrderByWithRelationInput;
    }

    const [inventories, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where: { productBatchId },
        skip,
        take: limit,
        orderBy,
        include: {
          productBatch: {
            include: {
              product: true,
            },
          },
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

  /**
   * Update inventory quantities directly
   */
  async updateInventoryQuantities(
    productBatchId: string,
    locationId: string,
    availableQty: number,
    reservedQty?: number,
  ) {
    // Before applying direct updates, ensure it doesn't exceed location capacity
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });

    if (location && location.capacity != null) {
      // Compute existing reserved if not provided
      const existing = await this.prisma.inventory.findUnique({
        where: { productBatchId_locationId: { productBatchId, locationId } },
      });
      const existingReserved = existing?.reservedQty ?? 0;
      const reservedAfter = reservedQty ?? existingReserved;
      const totalAfter = availableQty + reservedAfter;
      if (totalAfter > location.capacity) {
        throw new LocationCapacityExceeded(
          location.capacity,
          (existing?.availableQty ?? 0) + existingReserved,
          availableQty - (existing?.availableQty ?? 0),
        );
      }
    }

    return this.prisma.inventory.update({
      where: {
        productBatchId_locationId: { productBatchId, locationId },
      },
      data: {
        availableQty,
        reservedQty: reservedQty ?? undefined,
      },
    });
  }

  /**
   * Soft delete inventory (mark as inactive)
   */
  async softDeleteInventory(productBatchId: string, locationId: string) {
    // In a real implementation, you might want to add a 'deletedAt' field to the schema
    // For now, we'll set quantities to 0
    return this.prisma.inventory.update({
      where: {
        productBatchId_locationId: { productBatchId, locationId },
      },
      data: {
        availableQty: 0,
        reservedQty: 0,
      },
    });
  }

  /**
   * Find inventory with low stock levels
   */
  async findLowStockInventory(
    threshold: number = 10,
    locationId?: string,
    productId?: string,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'availableQty',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    const skip = (page - 1) * limit;

    const whereClause: Prisma.InventoryWhereInput = {
      availableQty: { lt: threshold },
    };

    if (locationId) {
      whereClause.locationId = locationId;
    }

    if (productId) {
      whereClause.productBatch = {
        productId,
      };
    }

    const [inventories, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          productBatch: {
            include: {
              product: true,
            },
          },
          location: true,
        },
      }),
      this.prisma.inventory.count({
        where: whereClause,
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
   * Find inventory with expiring products
   */
  async findExpiringInventory(
    daysAhead: number = 30,
    locationId?: string,
    productId?: string,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'updatedAt',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    const skip = (page - 1) * limit;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const productBatchWhere: Prisma.ProductBatchWhereInput = {
      expiryDate: {
        lte: futureDate,
        gte: new Date(),
      },
    };

    if (productId) {
      productBatchWhere.productId = productId;
    }

    const whereClause: Prisma.InventoryWhereInput = {
      productBatch: productBatchWhere,
    };

    if (locationId) {
      whereClause.locationId = locationId;
    }

    const [inventories, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          productBatch: {
            include: {
              product: true,
            },
          },
          location: true,
        },
      }),
      this.prisma.inventory.count({
        where: whereClause,
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
   * Generate stock level report
   */
  async generateStockLevelReport(
    locationId?: string,
    productId?: string,
    groupBy: 'category' | 'location' | 'product' = 'location',
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const includeClause: Prisma.InventoryInclude = {
      productBatch: {
        include: {
          product:
            groupBy === 'category'
              ? {
                  include: {
                    category: true,
                  },
                }
              : true,
        },
      },
      location: true,
    };

    const whereClause: Prisma.InventoryWhereInput = {};
    if (locationId) whereClause.locationId = locationId;
    if (productId) whereClause.productBatch = { productId };

    const [inventories, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: includeClause,
      }),
      this.prisma.inventory.count({
        where: whereClause,
      }),
    ]);

    // Group and aggregate results
    const groupedData = this.groupInventoryData(inventories as InventoryWithRelations[], groupBy);

    return {
      groupedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Generate movement report
   */
  async generateMovementReport(
    startDate?: string,
    endDate?: string,
    locationId?: string,
    productId?: string,
    movementType?: string,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * limit;

    const whereClause: Prisma.StockMovementWhereInput = {};

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    if (locationId) {
      whereClause.OR = [{ fromLocationId: locationId }, { toLocationId: locationId }];
    }

    if (productId) {
      whereClause.productBatch = { productId };
    }

    if (movementType) {
      // Support filtering by logical 'transfer' (grouped) which matches both transfer_in and transfer_out rows
      if (movementType === 'transfer') {
        whereClause.movementType = {
          in: [StockMovementType.transfer_in, StockMovementType.transfer_out],
        } as any;
      } else {
        whereClause.movementType = movementType as StockMovementType;
      }
    }

    // Fetch all matching movements and group transfers by transferGroupId
    const movementsRaw = await this.prisma.stockMovement.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      include: {
        productBatch: {
          include: {
            product: true,
          },
        },
        fromLocation: true,
        toLocation: true,
        createdBy: true,
      },
    });

    const transferGroups = new Map<string, any[]>();
    const standalone: any[] = [];

    for (const m of movementsRaw) {
      if (m.transferGroupId) {
        if (!transferGroups.has(m.transferGroupId)) transferGroups.set(m.transferGroupId, []);
        transferGroups.get(m.transferGroupId)!.push(m);
      } else {
        standalone.push(m);
      }
    }

    const groupedTransfers: any[] = [];
    for (const [groupId, items] of transferGroups.entries()) {
      const out = items.find((i) => i.movementType === 'transfer_out') || items[0];
      const inp = items.find((i) => i.movementType === 'transfer_in') || items[1] || items[0];

      const combined = {
        id: groupId,
        movementType: 'transfer',
        productBatchId: out.productBatchId || inp.productBatchId,
        productId: out.productId || inp.productId,
        quantity: out.quantity || inp.quantity,
        reference: out.reference || inp.reference,
        note: out.note || inp.note,
        transferGroupId: groupId,
        fromLocation: out.fromLocation || null,
        toLocation: inp.toLocation || null,
        fromLocationId: out.fromLocationId || null,
        toLocationId: inp.toLocationId || null,
        createdBy: out.createdBy || inp.createdBy || null,
        createdById: out.createdById || inp.createdById || null,
        createdAt: [out.createdAt, inp.createdAt].filter(Boolean).sort()[0] || out.createdAt,
      };

      groupedTransfers.push(combined);
    }

    const combinedList = [...standalone, ...groupedTransfers];

    combinedList.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortOrder === 'asc' ? -1 : 1;
      if (bVal == null) return sortOrder === 'asc' ? 1 : -1;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = combinedList.length;
    const totalPages = Math.ceil(total / limit);
    const movements = combinedList.slice(skip, skip + limit);

    return {
      movements,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Generate inventory valuation report
   */
  async generateValuationReport(
    locationId?: string,
    productId?: string,
    method: 'FIFO' | 'LIFO' | 'AVERAGE' = 'AVERAGE',
    page: number = 1,
    limit: number = 20,
  ) {
    // This is a simplified implementation
    // In a real scenario, you'd need purchase prices and more complex logic

    const whereClause: Prisma.InventoryWhereInput = {};
    if (locationId) whereClause.locationId = locationId;
    if (productId) whereClause.productBatch = { productId };

    const [inventories, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          productBatch: {
            include: {
              product: true,
            },
          },
          location: true,
        },
      }),
      this.prisma.inventory.count({
        where: whereClause,
      }),
    ]);

    // Calculate valuation (simplified - using quantity as value for demo)
    const valuationData: ValuationData[] = inventories.map((inv: InventoryWithRelations) => {
      const params = inv.productBatch.product.parameters as { unitCost?: number } | null;
      const unitCost = params?.unitCost || 1;

      return {
        ...inv,
        unitValue: unitCost,
        totalValue: (inv.availableQty + inv.reservedQty) * unitCost,
      };
    });

    const grandTotal = valuationData.reduce(
      (sum: number, item: ValuationData) => sum + item.totalValue,
      0,
    );

    return {
      valuationData,
      grandTotal,
      method,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get stock movements by product batch
   * Used for tracking movement history of a specific batch
   */
  async getMovementsByProductBatch(
    productBatchId: string,
    movementType?: string,
    locationId?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    this.logger.log(`Fetching movements for batch ${productBatchId}, page ${page}, limit ${limit}`);

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.StockMovementWhereInput = {
      productBatchId,
    };

    if (movementType) {
      // Support filtering by logical 'transfer' (grouped) which matches both transfer_in and transfer_out rows
      if (movementType === 'transfer') {
        where.movementType = {
          in: [StockMovementType.transfer_in, StockMovementType.transfer_out],
        } as any;
      } else {
        where.movementType = movementType as any;
      }
    }

    if (locationId) {
      where.OR = [{ fromLocationId: locationId }, { toLocationId: locationId }];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Fetch all matching movements and group transfers by transferGroupId for a single "transfer" record
    // NOTE: this fetches all matching rows and then paginates on grouped results. If dataset is large, consider implementing DB-level grouping and pagination.
    const movementsRaw = await this.prisma.stockMovement.findMany({
      where,
      include: {
        productBatch: {
          include: {
            product: true,
          },
        },
        fromLocation: true,
        toLocation: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
    });

    // Group transfers that have transferGroupId
    const transferGroups = new Map<string, any[]>();
    const standalone: any[] = [];

    for (const m of movementsRaw) {
      if (m.transferGroupId) {
        if (!transferGroups.has(m.transferGroupId)) transferGroups.set(m.transferGroupId, []);
        transferGroups.get(m.transferGroupId)!.push(m);
      } else {
        standalone.push(m);
      }
    }

    const groupedTransfers: any[] = [];
    for (const [groupId, items] of transferGroups.entries()) {
      // Expect 2 items (out + in), but be resilient to variations
      const out = items.find((i) => i.movementType === 'transfer_out') || items[0];
      const inp = items.find((i) => i.movementType === 'transfer_in') || items[1] || items[0];

      const combined = {
        id: groupId, // use group id as synthetic id for transfer
        movementType: 'transfer',
        productBatchId: out.productBatchId || inp.productBatchId,
        productId: out.productId || inp.productId,
        quantity: out.quantity || inp.quantity,
        reference: out.reference || inp.reference,
        note: out.note || inp.note,
        transferGroupId: groupId,
        // locations as full objects to match include
        fromLocation: out.fromLocation || null,
        toLocation: inp.toLocation || null,
        fromLocationId: out.fromLocationId || null,
        toLocationId: inp.toLocationId || null,
        createdBy: out.createdBy || inp.createdBy || null,
        createdById: out.createdById || inp.createdById || null,
        // choose earliest createdAt
        createdAt: [out.createdAt, inp.createdAt].filter(Boolean).sort()[0] || out.createdAt,
      };

      groupedTransfers.push(combined);
    }

    // Combine grouped transfers with standalone movements
    const combinedList = [...standalone, ...groupedTransfers];

    // Sort combined list by sortBy and order
    combinedList.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortOrder === 'asc' ? -1 : 1;
      if (bVal == null) return sortOrder === 'asc' ? 1 : -1;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = combinedList.length;
    const totalPages = Math.ceil(total / limit);
    const movements = combinedList.slice(skip, skip + limit);

    return {
      movements,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Helper method to group inventory data
   */
  private groupInventoryData(
    inventories: InventoryWithRelations[],
    groupBy: string,
  ): GroupedInventoryData[] {
    const grouped: Record<string, GroupedInventoryData> = {};

    for (const inv of inventories) {
      let key: string;

      switch (groupBy) {
        case 'category':
          key = inv.productBatch?.product?.category?.name || 'Uncategorized';
          break;
        case 'location':
          key = inv.location?.name || 'Unknown Location';
          break;
        case 'product':
          key = inv.productBatch?.product?.name || 'Unknown Product';
          break;
        default:
          key = 'Other';
      }

      if (!grouped[key]) {
        grouped[key] = {
          groupName: key,
          totalAvailableQty: 0,
          totalReservedQty: 0,
          totalValue: 0,
          items: [],
        };
      }

      grouped[key].totalAvailableQty += inv.availableQty || 0;
      grouped[key].totalReservedQty += inv.reservedQty || 0;
      grouped[key].items.push(inv);
    }

    return Object.values(grouped);
  }

  /**
   * Find inventory records by productId across multiple locations
   * Used for inventory availability checks in shipment creation
   */
  async findInventoryByProductAndLocations(
    productId: string,
    locationIds: string[],
  ): Promise<InventoryWithRelations[]> {
    try {
      this.logger.debug(
        `Finding inventory for product ${productId} in locations: ${locationIds.join(', ')}`,
      );
      return this.prisma.inventory.findMany({
        where: {
          locationId: { in: locationIds },
          productBatch: {
            productId: productId,
          },
          deletedAt: null,
        },
        include: {
          productBatch: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
          location: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error finding inventory for product ${productId} in locations:`, error);
      throw error;
    }
  }

  /**
   * Find all inventory records for a product (across all batches and locations)
   * Used for global inventory calculation in Sales Order validation
   */
  async findInventoriesByProduct(productId: string): Promise<InventoryWithRelations[]> {
    try {
      this.logger.debug(`Finding all inventory for product: ${productId}`);
      return this.prisma.inventory.findMany({
        where: {
          productBatch: {
            productId: productId,
          },
          deletedAt: null,
        },
        include: {
          productBatch: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
          location: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error finding inventory for product ${productId}:`, error);
      throw error;
    }
  }
}
