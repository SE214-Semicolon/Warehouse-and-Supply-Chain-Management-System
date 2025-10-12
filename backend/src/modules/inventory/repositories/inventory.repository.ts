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

      // Create transfer in movement (no idempotency key to avoid conflicts)
      const transferInMovement = await tx.stockMovement.create({
        data: {
          productBatchId,
          toLocationId,
          quantity,
          movementType: StockMovementType.transfer_in,
          createdById,
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

  /**
   * Update inventory quantities directly
   */
  async updateInventoryQuantities(
    productBatchId: string,
    locationId: string,
    availableQty: number,
    reservedQty?: number,
    updatedById?: string,
  ) {
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

    const whereClause: any = {
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
    sortBy: string = 'productBatch',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    const skip = (page - 1) * limit;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const whereClause: any = {
      productBatch: {
        expiryDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
    };

    if (locationId) {
      whereClause.locationId = locationId;
    }

    if (productId) {
      whereClause.productBatch = {
        ...whereClause.productBatch,
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

    let groupByField: string;
    let includeClause: any = {};

    switch (groupBy) {
      case 'category':
        groupByField = 'productBatch.product.category.name';
        includeClause = {
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
        };
        break;
      case 'location':
        groupByField = 'location.name';
        includeClause = {
          productBatch: {
            include: {
              product: true,
            },
          },
          location: true,
        };
        break;
      case 'product':
        groupByField = 'productBatch.product.name';
        includeClause = {
          productBatch: {
            include: {
              product: true,
            },
          },
          location: true,
        };
        break;
    }

    const whereClause: any = {};
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
    const groupedData = this.groupInventoryData(inventories, groupBy);

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

    const whereClause: any = {};

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
      whereClause.movementType = movementType;
    }

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
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
          fromLocation: true,
          toLocation: true,
          createdBy: true,
        },
      }),
      this.prisma.stockMovement.count({
        where: whereClause,
      }),
    ]);

    return {
      movements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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

    const whereClause: any = {};
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
    const valuationData = inventories.map((inv) => {
      const params = inv.productBatch.product.parameters as any;
      const unitCost = params?.unitCost || 1;

      return {
        ...inv,
        unitValue: unitCost,
        totalValue: (inv.availableQty + inv.reservedQty) * unitCost,
      };
    });

    const grandTotal = valuationData.reduce((sum, item) => sum + item.totalValue, 0);

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
   * Helper method to group inventory data
   */
  private groupInventoryData(inventories: any[], groupBy: string) {
    const grouped = inventories.reduce((acc, inv) => {
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

      if (!acc[key]) {
        acc[key] = {
          groupName: key,
          totalAvailableQty: 0,
          totalReservedQty: 0,
          totalValue: 0,
          items: [],
        };
      }

      acc[key].totalAvailableQty += inv.availableQty;
      acc[key].totalReservedQty += inv.reservedQty;
      acc[key].items.push(inv);

      return acc;
    }, {});

    return Object.values(grouped);
  }
}
