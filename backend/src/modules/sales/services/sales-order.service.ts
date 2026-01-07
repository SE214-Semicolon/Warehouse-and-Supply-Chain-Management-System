import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SalesOrderRepository } from '../repositories/sales-order.repository';
import { CreateSalesOrderDto } from '../dto/sales-order/create-so.dto';
import { UpdateSalesOrderDto } from '../dto/sales-order/update-so.dto';
import { SubmitSalesOrderDto } from '../dto/sales-order/submit-so.dto';
import { FulfillSalesOrderDto } from '../dto/sales-order/fulfill-so.dto';
import { QuerySalesOrderDto } from '../dto/sales-order/query-so.dto';
import {
  SalesOrderResponseDto,
  SalesOrderListResponseDto,
} from '../dto/sales-order/sales-order-response.dto';
import { InventoryService } from '../../inventory/services/inventory.service';
import { DispatchInventoryDto } from '../../inventory/dto/dispatch-inventory.dto';
import { OrderStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuditMiddleware } from '../../../database/middleware/audit.middleware';

@Injectable()
export class SalesOrderService {
  private readonly logger = new Logger(SalesOrderService.name);

  constructor(
    private readonly soRepo: SalesOrderRepository,
    private readonly inventorySvc: InventoryService,
    private readonly prisma: PrismaService,
    private readonly auditMiddleware: AuditMiddleware,
  ) {}

  /**
   * Generate SO Number
   * Internal helper method - not tested directly
   */
  private generateSONo(): string {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const rand = randomUUID().slice(0, 6).toUpperCase();
    return `SO-${y}${m}-${rand}`;
  }

  /**
   * Create Sales Order API
   * Minimum test cases: 10
   * - SO-TC01: Create pending SO with valid data (201)
   * - SO-TC02: Create without customerId (201, optional field)
   * - SO-TC03: Create without items (201, empty array)
   * - SO-TC04: Create with items missing unitPrice (201, null values)
   * - SO-TC05: Create with multiple items (201, calculate total)
   * - SO-TC06: Create with invalid productId (400, tested by DTO)
   * - SO-TC07: Create with negative qty (400, tested by DTO)
   * - SO-TC08: Permission denied role warehouse_staff (403, tested by guard)
   * - SO-TC09: Create with placedAt in past (201, edge case allowed)
   * - SO-TC10: Create with placedAt in future (201, edge case allowed)
   *
   * Security: createdById is extracted from JWT token in controller,
   * not from DTO to prevent user impersonation.
   */
  async createSalesOrder(
    dto: CreateSalesOrderDto,
    createdById: string,
  ): Promise<SalesOrderResponseDto> {
    this.logger.log(`Creating sales order for user: ${createdById}`);
    const soNo = this.generateSONo();
    const items: Omit<Prisma.SalesOrderItemCreateManyInput, 'salesOrderId'>[] = (
      dto.items ?? []
    ).map((it) => ({
      productId: it.productId,
      productBatchId: it.productBatchId ?? null,
      locationId: it.locationId ?? null, // Store locationId for inventory reservation
      qty: it.qty,
      unitPrice: it.unitPrice ?? null,
      lineTotal: it.unitPrice ? it.unitPrice * it.qty : null,
    }));

    const so = await this.soRepo.createDraft(
      {
        soNo,
        customer: dto.customerId ? { connect: { id: dto.customerId } } : undefined,
        status: OrderStatus.pending,
        placedAt: dto.placedAt ? new Date(dto.placedAt) : undefined,
        createdBy: { connect: { id: createdById } },
      },
      items,
    );

    await this.soRepo.updateTotals(so.id);
    const created = await this.soRepo.findById(so.id);
    if (!created) throw new NotFoundException('SO not found after creation');
    this.logger.log(`Sales order created successfully: ${created.id} (${soNo})`);

    // Audit logging for SO creation
    this.auditMiddleware
      .logCreate('SalesOrder', created as Record<string, unknown>)
      .catch((err) => {
        this.logger.error('Failed to write audit log for SO creation', err);
      });

    return {
      success: true,
      data: created,
      message: 'Sales order created successfully',
    };
  }

  /**
   * Submit Sales Order API (REFACTORED - Auto-Allocation with FEFO)
   * Minimum test cases: 6
   * - SO-TC11: Submit pending SO successfully (200, status → approved)
   * - SO-TC12: Missing userId (400, now handled by JWT Guard)
   * - SO-TC13: Submit SO not in pending status (400)
   * - SO-TC14: Submit non-existent SO (404)
   * - SO-TC15: Permission denied role warehouse_staff (403, tested by guard)
   * - SO-TC16: No authentication (401, tested by guard)
   *
   * NEW: Auto-Allocation with FEFO (First Expired First Out):
   * - If item has productBatchId and locationId: Reserve specific batch
   * - If item has NO productBatchId/locationId: Auto-allocate using FEFO algorithm
   *   - Find batches with nearest expiry date first
   *   - Allocate from multiple batches if needed
   *   - Reserve allocated inventory
   *   - Throw error if insufficient total inventory
   */
  async submitSalesOrder(id: string, dto: SubmitSalesOrderDto, userId: string) {
    this.logger.log(`Submitting sales order: ${id} by user: ${userId}`);
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    const so = await this.soRepo.findById(id);
    if (!so) throw new NotFoundException('SO not found');
    if (so.status !== OrderStatus.pending) {
      throw new BadRequestException('Only pending SO can be submitted');
    }

    // STEP 1: Validate inventory availability and prepare allocation plan
    // Store allocation plan for items without batch/location
    const allocationPlan: Map<
      string,
      Array<{ productBatchId: string; locationId: string; qty: number }>
    > = new Map();

    for (const item of so.items || []) {
      if (item.productBatchId && item.locationId) {
        // Case A: User specified batch/location - validate specific batch
        this.logger.log(
          `Validating batch-specific inventory for SO item ${item.id}: Batch=${item.productBatchId}, Location=${item.locationId}`,
        );
        try {
          const inventory = await this.inventorySvc.getInventoryByBatchAndLocation(
            item.productBatchId,
            item.locationId,
          );
          if (!inventory || inventory.availableQty < item.qty) {
            throw new BadRequestException(
              `Không đủ hàng trong batch ${item.productBatchId} tại location ${item.locationId}. ` +
                `Khả dụng: ${inventory?.availableQty || 0}, Yêu cầu: ${item.qty}`,
            );
          }
        } catch (error) {
          if (error instanceof BadRequestException) throw error;
          throw new BadRequestException(
            `Lỗi khi kiểm tra tồn kho batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      } else if (item.productId) {
        // Case B: User did NOT specify batch/location - Auto-allocate using FEFO
        this.logger.log(
          `Auto-allocating inventory for SO item ${item.id}: Product=${item.productId} using FEFO`,
        );
        try {
          const availableInventories = await this.inventorySvc.getAvailableInventoryForFEFO(
            item.productId,
          );

          if (!availableInventories || availableInventories.length === 0) {
            const globalInventory = await this.inventorySvc.getGlobalInventoryByProduct(
              item.productId,
            );
            const productName = globalInventory.productName || item.productId;
            throw new BadRequestException(
              `Sản phẩm "${productName}" không có hàng khả dụng trong kho.`,
            );
          }

          // Apply FEFO algorithm: allocate from batches with nearest expiry first
          let remainingQty = item.qty;
          const allocations: Array<{ productBatchId: string; locationId: string; qty: number }> =
            [];

          for (const inv of availableInventories) {
            if (remainingQty <= 0) break;

            const qtyToAllocate = Math.min(remainingQty, inv.availableQty);
            allocations.push({
              productBatchId: inv.productBatchId,
              locationId: inv.locationId,
              qty: qtyToAllocate,
            });

            this.logger.log(
              `FEFO Allocation: Batch=${inv.batchNo || inv.productBatchId}, Location=${inv.locationName || inv.locationId}, ` +
                `Qty=${qtyToAllocate}, ExpiryDate=${inv.expiryDate?.toISOString() || 'N/A'}`,
            );

            remainingQty -= qtyToAllocate;
          }

          // Check if we have enough inventory
          if (remainingQty > 0) {
            const globalInventory = await this.inventorySvc.getGlobalInventoryByProduct(
              item.productId,
            );
            const productName = globalInventory.productName || item.productId;
            const totalAvailable = globalInventory.totalAvailableQty;
            throw new BadRequestException(
              `Sản phẩm "${productName}" không đủ hàng trong kho. ` +
                `Tổng khả dụng: ${totalAvailable}, Yêu cầu: ${item.qty}`,
            );
          }

          // Store allocation plan for this item
          allocationPlan.set(item.id, allocations);
          this.logger.log(
            `FEFO allocation completed for item ${item.id}: ${allocations.length} batch(es) allocated`,
          );
        } catch (error) {
          if (error instanceof BadRequestException) throw error;
          throw new BadRequestException(
            `Lỗi khi phân bổ tồn kho tự động: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      } else {
        this.logger.error(`SO item ${item.id} missing both productBatchId and productId`);
        throw new BadRequestException(
          `Item ${item.id} không có thông tin sản phẩm (productId hoặc productBatchId)`,
        );
      }
    }

    // STEP 2: Reserve inventory based on allocation plan
    // Note: If reservation succeeds but submit fails, retry will be idempotent
    for (const item of so.items || []) {
      if (item.productBatchId && item.locationId) {
        // Case A: User specified batch/location - reserve directly
        try {
          await this.inventorySvc.reserveInventory({
            productBatchId: item.productBatchId,
            locationId: item.locationId,
            quantity: item.qty,
            orderId: so.id,
            createdById: userId,
            idempotencyKey: `SO-${so.id}-${item.id}`,
            note: `Reservation for Sales Order ${so.soNo}`,
          });
          this.logger.log(`Reserved ${item.qty} units for SO ${so.soNo}, item ${item.id}`);
        } catch (error) {
          this.logger.error(`Failed to reserve inventory for SO ${so.soNo}:`, error);
          throw new BadRequestException(
            `Failed to reserve inventory: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      } else {
        // Case B: Auto-allocated items - reserve according to allocation plan
        const allocations = allocationPlan.get(item.id);
        if (!allocations || allocations.length === 0) {
          throw new BadRequestException(
            `No allocation plan found for item ${item.id}. This should not happen.`,
          );
        }

        this.logger.log(
          `Reserving auto-allocated inventory for SO item ${item.id}: ${allocations.length} allocation(s)`,
        );

        // Reserve each allocated batch
        for (let i = 0; i < allocations.length; i++) {
          const allocation = allocations[i];
          try {
            await this.inventorySvc.reserveInventory({
              productBatchId: allocation.productBatchId,
              locationId: allocation.locationId,
              quantity: allocation.qty,
              orderId: so.id,
              createdById: userId,
              idempotencyKey: `SO-${so.id}-${item.id}-${i}`,
              note: `FEFO Auto-Allocation for Sales Order ${so.soNo} (part ${i + 1}/${allocations.length})`,
            });
            this.logger.log(
              `Reserved ${allocation.qty} units from batch ${allocation.productBatchId} ` +
                `at location ${allocation.locationId} for SO ${so.soNo}, item ${item.id}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to reserve auto-allocated inventory for SO ${so.soNo}, item ${item.id}:`,
              error,
            );
            throw new BadRequestException(
              `Failed to reserve auto-allocated inventory: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }
      }
    }

    // Update SO status to approved
    try {
      await this.soRepo.submit(id);
    } catch (error) {
      this.logger.error(`Failed to update SO status after reservation for ${so.soNo}:`, error);
      throw new BadRequestException(
        'Inventory reserved but failed to update order status. Please retry - operation is idempotent.',
      );
    }

    const updated = await this.soRepo.findById(id);
    if (!updated) throw new NotFoundException('SO not found after submit');
    this.logger.log(`Sales order submitted successfully: ${id}`);

    // Audit logging for SO submission (status update)
    this.auditMiddleware
      .logUpdate(
        'SalesOrder',
        id,
        so as Record<string, unknown>,
        updated as Record<string, unknown>,
      )
      .catch((err) => {
        this.logger.error('Failed to write audit log for SO submission', err);
      });

    return updated;
  }

  /**
   * Get Sales Order by ID API
   * Minimum test cases: 3
   * - SO-TC17: Find by valid ID (200)
   * - SO-TC18: SO not found (404)
   * - SO-TC19: Find by invalid UUID format (400/500, edge case)
   */
  async findById(id: string): Promise<SalesOrderResponseDto> {
    const so = await this.soRepo.findById(id);
    if (!so) throw new NotFoundException('SO not found');
    return {
      success: true,
      data: so,
      message: 'Sales order retrieved successfully',
    };
  }

  /**
   * List Sales Orders API
   * Minimum test cases: 13
   * - SO-TC20: Get all with default pagination (200)
   * - SO-TC21: Filter by soNo (200)
   * - SO-TC22: Filter by status (200)
   * - SO-TC23: Filter by customerId (200)
   * - SO-TC24: Filter by dateFrom (200)
   * - SO-TC25: Filter by dateTo (200)
   * - SO-TC26: Filter by date range (200)
   * - SO-TC27: Pagination page 1 (200)
   * - SO-TC28: Pagination page 2 (200)
   * - SO-TC29: Sort by placedAt asc (200)
   * - SO-TC30: Sort by status desc (200)
   * - SO-TC31: Combine multiple filters (200)
   * - SO-TC32: SQL injection test (200, handled by Prisma)
   */
  async list(query: QuerySalesOrderDto): Promise<SalesOrderListResponseDto> {
    const where: Prisma.SalesOrderWhereInput = {};
    if (query.soNo) where.soNo = { contains: query.soNo, mode: 'insensitive' };
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.dateFrom || query.dateTo) {
      const placedAtFilter: Prisma.DateTimeNullableFilter = {};
      if (query.dateFrom) {
        placedAtFilter.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        placedAtFilter.lte = new Date(query.dateTo);
      }
      where.placedAt = placedAtFilter;
    }

    const orderBy: Prisma.SalesOrderOrderByWithRelationInput[] = [];
    for (const part of (query.sort ?? 'placedAt:desc').split(',')) {
      const [field, dir] = part.split(':');
      if (!field) continue;
      orderBy.push({
        [field]: dir === 'asc' ? 'asc' : 'desc',
      } as Prisma.SalesOrderOrderByWithRelationInput);
    }

    // Disable pagination - return all records
    const { data, total } = await this.soRepo.list({ where, orderBy });
    return {
      success: true,
      data,
      total,
      message: 'Sales orders retrieved successfully',
    };
  }

  /**
   * Update Sales Order API
   * Minimum test cases: 12
   * - SO-TC33: Update pending SO customer successfully (200)
   * - SO-TC34: Update pending SO placedAt successfully (200)
   * - SO-TC35: Update pending SO items successfully (200)
   * - SO-TC36: Update item qty successfully (200)
   * - SO-TC37: Update item unitPrice successfully (200, recalculate lineTotal)
   * - SO-TC38: Update multiple items at once (200)
   * - SO-TC39: Update with invalid itemId (400)
   * - SO-TC40: Update SO not in pending status (400)
   * - SO-TC41: Update non-existent SO (404)
   * - SO-TC42: Update with empty items array (200, no changes)
   * - SO-TC43: Permission denied role warehouse_staff (403, tested by guard)
   * - SO-TC44: No authentication (401, tested by guard)
   */
  async updateSalesOrder(id: string, dto: UpdateSalesOrderDto) {
    const so = await this.soRepo.findById(id);
    if (!so) throw new NotFoundException('SO not found');
    if (so.status !== OrderStatus.pending) {
      throw new BadRequestException('Only pending SO can be updated');
    }

    const updateData: Prisma.SalesOrderUpdateInput = {};
    if (dto.customerId) updateData.customer = { connect: { id: dto.customerId } };
    if (dto.placedAt) updateData.placedAt = new Date(dto.placedAt);

    await this.soRepo.update(id, updateData);

    if (dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        if (item.id) {
          const existingItem = await this.soRepo.getItemById(item.id);
          if (!existingItem || existingItem.salesOrderId !== id) {
            throw new BadRequestException(`Item ${item.id} not found in this SO`);
          }

          const itemUpdateData: Prisma.SalesOrderItemUpdateInput = {};
          if (item.productId) itemUpdateData.product = { connect: { id: item.productId } };
          if (item.qty !== undefined) itemUpdateData.qty = item.qty;
          if (item.unitPrice !== undefined) {
            itemUpdateData.unitPrice = item.unitPrice;
            itemUpdateData.lineTotal = item.unitPrice * (item.qty ?? existingItem.qty);
          }

          await this.soRepo.updateItem(item.id, itemUpdateData);
        }
      }
    }

    await this.soRepo.updateTotals(id);
    const updated = await this.soRepo.findById(id);
    if (!updated) throw new NotFoundException('SO not found after update');

    // Audit logging for SO update
    this.auditMiddleware
      .logUpdate(
        'SalesOrder',
        id,
        so as Record<string, unknown>,
        updated as Record<string, unknown>,
      )
      .catch((err) => {
        this.logger.error('Failed to write audit log for SO update', err);
      });

    return updated;
  }

  /**
   * Fulfill Sales Order API (Dispatch Inventory)
   * Minimum test cases: 25
   * - SO-TC45: Fulfill partial successfully (200, status → processing)
   * - SO-TC46: Fulfill full successfully (200, status → shipped)
   * - SO-TC47: Fulfill multiple times partial → partial (200)
   * - SO-TC48: Fulfill multiple times partial → shipped (200)
   * - SO-TC49: Fulfill multiple times with multiple items (200)
   * - SO-TC50: Fulfill exceeds ordered quantity (400)
   * - SO-TC51: Fulfill exceeds with multiple fulfills (400)
   * - SO-TC52: Fulfill SO not in approved/processing status (400)
   * - SO-TC53: Fulfill with invalid soItemId (400)
   * - SO-TC54: Fulfill without items array (400, tested by DTO)
   * - SO-TC55: Fulfill with duplicate idempotencyKey (200, idempotent)
   * - SO-TC56: Fulfill non-existent SO (404)
   * - SO-TC57: Fulfill without locationId (400, tested by DTO)
   * - SO-TC58: Fulfill without productBatchId (400, tested by DTO)
   * - SO-TC59: Fulfill without createdById (400, tested by DTO)
   * - SO-TC60: Fulfill without idempotencyKey (400, tested by DTO)
   * - SO-TC61: Fulfill multiple items simultaneously (200)
   * - SO-TC62: Fulfill pending SO (400, not approved yet)
   * - SO-TC63: Fulfill cancelled SO (400)
   * - SO-TC64: Fulfill shipped SO (400, already completed)
   * - SO-TC65: Fulfill with insufficient inventory (400/500, inventory service error)
   * - SO-TC66: Fulfill validates qtyToFulfill > 0 (400, tested by DTO)
   * - SO-TC67: Permission denied role sales_analyst (403, tested by guard)
   * - SO-TC68: No authentication (401, tested by guard)
   * - SO-TC69: Inventory integration verified (200, check stock decreases)
   */
  async fulfillSalesOrder(soId: string, dto: FulfillSalesOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('No items to fulfill');
    }

    const so = await this.soRepo.findById(soId);
    if (!so) throw new NotFoundException('SO not found');
    if (!(so.status === OrderStatus.approved || so.status === OrderStatus.processing)) {
      throw new BadRequestException('SO status is not eligible for fulfillment');
    }

    const targetIds = dto.items.map((i) => i.soItemId);
    const existing = await this.soRepo.findItemsByIds(soId, targetIds);
    if (existing.length !== targetIds.length) {
      throw new BadRequestException('Some items not found in SO');
    }

    // Validate qtyToFulfill không vượt quá qty còn lại chưa fulfill
    for (const r of dto.items) {
      const item = existing.find((e) => e.id === r.soItemId)!;
      const remainingQty = item.qty - item.qtyFulfilled;
      if (r.qtyToFulfill > remainingQty) {
        throw new BadRequestException(
          `Fulfill quantity ${r.qtyToFulfill} exceeds remaining quantity ${remainingQty} for item ${item.id}`,
        );
      }
    }

    // Validate batch expiry dates for all items before fulfilling
    for (const r of dto.items) {
      const soItem = existing.find((e) => e.id === r.soItemId)!;
      // Use batch from DTO if provided, otherwise from SO item
      const productBatchId = r.productBatchId || soItem.productBatchId;

      if (productBatchId) {
        const batch = await this.prisma.productBatch.findUnique({
          where: { id: productBatchId },
          select: { id: true, batchNo: true, expiryDate: true },
        });

        if (!batch) {
          throw new BadRequestException(
            `ProductBatch ${productBatchId} not found for fulfillment`,
          );
        }

        if (batch.expiryDate) {
          const now = new Date();
          if (batch.expiryDate < now) {
            throw new BadRequestException(
              `Cannot fulfill with expired batch ${batch.batchNo || batch.id}. Expiry date: ${batch.expiryDate.toISOString()}`,
            );
          }
        }
      }
    }

    // REFACTORED: Dispatch inventory with ATOMIC reservation consumption
    // CRITICAL FIX: Do NOT release reservation before dispatch!
    // The dispatch operation will atomically consume the reservation
    for (const r of dto.items) {
      const soItem = existing.find((e) => e.id === r.soItemId)!;

      // Use batch/location from DTO if provided, otherwise fallback to SO item (reservation)
      const productBatchId = r.productBatchId || soItem.productBatchId;
      const locationId = r.locationId || soItem.locationId;

      // Determine if this item has a reservation (indicated by batch/location in SO item)
      const hasReservation = !!(soItem.productBatchId && soItem.locationId);

      // If neither DTO nor SO item has batch/location, throw error
      if (!productBatchId || !locationId) {
        throw new BadRequestException(
          `ProductBatchId and LocationId are required for fulfillment. Either provide them in the request or ensure the SO item has a reservation.`,
        );
      }

      if (hasReservation) {
        this.logger.log(
          `Dispatching with reservation consumption for SO ${so.soNo}, item ${r.soItemId}`,
        );
      } else {
        this.logger.log(`Dispatching without reservation for SO ${so.soNo}, item ${r.soItemId}`);
      }

      // Dispatch inventory with atomic reservation consumption
      // If hasReservation=true: dispatch will decrement BOTH availableQty AND reservedQty
      // If hasReservation=false: dispatch will decrement ONLY availableQty
      const payload: DispatchInventoryDto = {
        productBatchId: productBatchId,
        locationId: locationId,
        quantity: r.qtyToFulfill,
        createdById: r.createdById,
        idempotencyKey: r.idempotencyKey,
      };

      try {
        await this.inventorySvc.dispatchInventory(payload, {
          consumeReservation: hasReservation,
        });
        this.logger.log(
          `Successfully dispatched ${r.qtyToFulfill} units for SO ${so.soNo}, item ${r.soItemId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to dispatch inventory for SO ${so.soNo}, item ${r.soItemId}:`,
          error,
        );
        throw new BadRequestException(
          `Failed to dispatch inventory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Update qtyFulfilled for item
      await this.soRepo.updateItemFulfilled(r.soItemId, r.qtyToFulfill);
    }

    // Recalculate SO status based on fulfillment progress
    const updatedItems = await this.soRepo.findItemsByIds(soId, targetIds);
    const allItemsFullyFulfilled = updatedItems.every((item) => item.qtyFulfilled >= item.qty);
    const anyItemsFulfilled = updatedItems.some((item) => item.qtyFulfilled > 0);

    let newStatus: OrderStatus;
    if (allItemsFullyFulfilled) {
      newStatus = OrderStatus.shipped;
    } else if (anyItemsFulfilled) {
      newStatus = OrderStatus.processing;
    } else {
      newStatus = so.status; // Keep current status
    }

    await this.soRepo.updateStatus(soId, newStatus);

    const updated = await this.soRepo.findById(soId);
    if (!updated) throw new NotFoundException('SO not found after fulfillment');

    // Audit logging for SO fulfillment (status update)
    this.auditMiddleware
      .logUpdate(
        'SalesOrder',
        soId,
        so as Record<string, unknown>,
        updated as Record<string, unknown>,
      )
      .catch((err) => {
        this.logger.error('Failed to write audit log for SO fulfillment', err);
      });

    return updated;
  }

  /**
   * Cancel Sales Order API
   * Minimum test cases: 8
   * - SO-TC70: Cancel pending SO successfully (200, status → cancelled)
   * - SO-TC71: Cancel approved SO successfully (200)
   * - SO-TC72: Cancel processing SO successfully (200)
   * - SO-TC73: Cancel shipped SO (400, cannot cancel)
   * - SO-TC74: Cancel already cancelled SO (400)
   * - SO-TC75: Cancel non-existent SO (404)
   * - SO-TC76: Permission denied role sales_analyst (403, tested by guard)
   * - SO-TC77: No authentication (401, tested by guard)
   *
   * Total: 77 test cases for SalesOrderService
   * Additional considerations:
   * - Integration with InventoryService for dispatch operations
   * - Transaction rollback scenarios if inventory dispatch fails
   * - Concurrent fulfillment handling with idempotency keys
   * - Status transition validation (pending → approved → processing → shipped)
   * - Business rule: Cannot fulfill more than ordered quantity
   * - Edge case: Multiple partial fulfillments leading to shipped status
   */
  async cancelSalesOrder(id: string) {
    this.logger.log(`Cancelling sales order: ${id}`);
    const so = await this.soRepo.findById(id);
    if (!so) throw new NotFoundException('SO not found');
    if (so.status === OrderStatus.shipped || so.status === OrderStatus.cancelled) {
      throw new BadRequestException(`Cannot cancel SO with status: ${so.status}`);
    }

    // Release inventory reservations for items that have both productBatchId and locationId
    for (const item of so.items || []) {
      if (item.productBatchId && item.locationId) {
        try {
          await this.inventorySvc.releaseReservation({
            productBatchId: item.productBatchId,
            locationId: item.locationId,
            quantity: item.qty,
            orderId: so.id,
            idempotencyKey: `SO-CANCEL-${so.id}-${item.id}`,
            note: `Cancellation of Sales Order ${so.soNo}`,
          });
          this.logger.log(
            `Released ${item.qty} units for cancelled SO ${so.soNo}, item ${item.id}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to release reservation for SO ${so.soNo}, item ${item.id}:`,
            error,
          );
          // Continue cancelling even if release fails (graceful degradation)
        }
      }
    }

    await this.soRepo.cancel(id);
    const updated = await this.soRepo.findById(id);
    if (!updated) throw new NotFoundException('SO not found after cancel');
    this.logger.log(`Sales order cancelled successfully: ${id}`);

    // Audit logging for SO cancellation
    this.auditMiddleware
      .logUpdate(
        'SalesOrder',
        id,
        so as Record<string, unknown>,
        updated as Record<string, unknown>,
      )
      .catch((err) => {
        this.logger.error('Failed to write audit log for SO cancellation', err);
      });

    return updated;
  }
}
