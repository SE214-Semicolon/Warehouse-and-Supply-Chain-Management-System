import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PurchaseOrderRepository } from '../repositories/purchase-order.repository';
import { CreatePurchaseOrderDto } from '../dto/purchase-order/create-po.dto';
import { SubmitPurchaseOrderDto } from '../dto/purchase-order/submit-po.dto';
import { ReceivePurchaseOrderDto } from '../dto/purchase-order/receive-po.dto';
import {
  PurchaseOrderResponseDto,
  PurchaseOrderListResponseDto,
} from '../dto/purchase-order/purchase-order-response.dto';
import { InventoryService } from '../../inventory/services/inventory.service';
import { ReceiveInventoryDto } from '../../inventory/dto/receive-inventory.dto';
import { QueryPurchaseOrderDto } from '../dto/purchase-order/query-po.dto';
import { PoStatus, PurchaseOrder, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditMiddleware } from '../../../database/middleware/audit.middleware';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class PurchaseOrderService {
  private readonly logger = new Logger(PurchaseOrderService.name);

  constructor(
    private readonly poRepo: PurchaseOrderRepository,
    private readonly inventorySvc: InventoryService,
    private readonly auditMiddleware: AuditMiddleware,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate PO Number
   * Internal helper method - not tested directly
   */
  private generatePoNo(): string {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const rand = randomUUID().slice(0, 6).toUpperCase();
    return `PO-${y}${m}-${rand}`;
  }

  /**
   * Create Purchase Order API
   * Minimum test cases: 10
   * - PO-TC01: Create draft PO with valid data (201)
   * - PO-TC02: Create without supplierId (201, optional field)
   * - PO-TC03: Create without items (201, empty array)
   * - PO-TC04: Create with items missing unitPrice (201, null values)
   * - PO-TC05: Create with multiple items (201, calculate total)
   * - PO-TC06: Create with invalid productId (400, tested by DTO)
   * - PO-TC07: Create with negative qtyOrdered (400, tested by DTO)
   * - PO-TC08: Permission denied role warehouse_staff (403, tested by guard)
   * - PO-TC09: Create with placedAt in past (201, edge case allowed)
   * - PO-TC10: expectedArrival must be >= placedAt (400, fixed with @IsDateAfterOrEqual validator)
   *
   * Security: createdById is extracted from JWT token in controller (Bug c.2 fix),
   * not from DTO to prevent user impersonation.
   */
  async createPurchaseOrder(
    dto: CreatePurchaseOrderDto,
    createdById: string,
  ): Promise<PurchaseOrderResponseDto> {
    this.logger.log(`Creating purchase order for user: ${createdById}`);
    const poNo = this.generatePoNo();
    const items: Omit<Prisma.PurchaseOrderItemCreateManyInput, 'purchaseOrderId'>[] = (
      dto.items ?? []
    ).map((it) => ({
      productId: it.productId,
      qtyOrdered: it.qtyOrdered,
      unitPrice: it.unitPrice ?? null,
      lineTotal: it.unitPrice ? it.unitPrice * it.qtyOrdered : null,
      remark: it.remark ?? null,
    }));

    const po = await this.poRepo.createDraft(
      {
        poNo,
        supplier: dto.supplierId ? { connect: { id: dto.supplierId } } : undefined,
        status: PoStatus.draft,
        placedAt: dto.placedAt ? new Date(dto.placedAt) : undefined,
        expectedArrival: dto.expectedArrival ? new Date(dto.expectedArrival) : undefined,
        notes: dto.notes,
        createdBy: { connect: { id: createdById } },
      },
      items,
    );

    await this.poRepo.updateTotals(po.id);
    const created = await this.poRepo.findById(po.id);
    if (!created) throw new NotFoundException('PO not found after creation');
    this.logger.log(`Purchase order created successfully: ${created.id} (${poNo})`);

    // Audit logging for PO creation
    this.auditMiddleware
      .logCreate('PurchaseOrder', created as Record<string, unknown>)
      .catch((err) => {
        this.logger.error('Failed to write audit log for PO creation', err);
      });

    return {
      success: true,
      data: created,
      message: 'Purchase order created successfully',
    };
  }

  /**
   * Submit Purchase Order API
   * Minimum test cases: 6
   * - PO-TC11: Submit draft PO successfully (200)
   * - PO-TC12: Missing userId (400, now extracted from JWT)
   * - PO-TC13: Submit PO not in draft status (400)
   * - PO-TC14: Submit non-existent PO (404)
   * - PO-TC15: Permission denied role warehouse_staff (403, tested by guard)
   * - PO-TC16: No authentication (401, tested by guard)
   */
  async submitPurchaseOrder(
    id: string,
    dto: SubmitPurchaseOrderDto,
    submittedById: string,
  ): Promise<PurchaseOrderResponseDto> {
    this.logger.log(`Submitting purchase order: ${id} by user: ${submittedById}`);
    const po = await this.poRepo.findById(id);
    if (!po) {
      this.logger.warn(`Purchase order not found: ${id}`);
      throw new NotFoundException('PO not found');
    }
    if (po.status !== PoStatus.draft) {
      this.logger.warn(`Cannot submit PO ${id}: status is ${po.status}`);
      throw new BadRequestException('Only draft can be submitted');
    }
    await this.poRepo.submit(id);
    const updated = await this.poRepo.findById(id);
    if (!updated) throw new NotFoundException('PO not found after submit');
    this.logger.log(`Purchase order submitted successfully: ${id}`);

    // Audit logging for PO submission (status update)
    this.auditMiddleware
      .logUpdate(
        'PurchaseOrder',
        id,
        po as Record<string, unknown>,
        updated as Record<string, unknown>,
      )
      .catch((err) => {
        this.logger.error('Failed to write audit log for PO submission', err);
      });

    return {
      success: true,
      data: updated,
      message: 'Purchase order submitted successfully',
    };
  }

  /**
   * Get Purchase Order by ID API
   * Minimum test cases: 2
   * - PO-TC17: Find by valid ID (200)
   * - PO-TC18: PO not found (404)
   */
  async findById(id: string): Promise<PurchaseOrderResponseDto> {
    const po = await this.poRepo.findById(id);
    if (!po) throw new NotFoundException('PO not found');
    return {
      success: true,
      data: po,
      message: 'Purchase order retrieved successfully',
    };
  }

  /**
   * Receive Purchase Order API
   * Minimum test cases: 20
   * - PO-TC19: Receive partial successfully (200, status → partial)
   * - PO-TC20: Receive full successfully (200, status → received)
   * - PO-TC21: Receive multiple times partial → partial (200)
   * - PO-TC22: Receive multiple times partial → received (200)
   * - PO-TC23: Receive multiple times with multiple items (200)
   * - PO-TC24: Receive exceeds ordered quantity (400)
   * - PO-TC25: Receive exceeds with multiple receives (400)
   * - PO-TC26: Receive PO not in ordered/partial status (400)
   * - PO-TC27: Receive with invalid poItemId (400)
   * - PO-TC28: Receive without items array (400, tested by DTO)
   * - PO-TC29: Receive with duplicate idempotencyKey (200, idempotent)
   * - PO-TC30: Receive non-existent PO (404)
   * - PO-TC31: Receive without locationId (400, tested by DTO)
   * - PO-TC32: Receive without productBatchId (400, tested by DTO)
   * - PO-TC33: Receive without createdById (400, tested by DTO)
   * - PO-TC34: Receive without idempotencyKey (400, tested by DTO)
   * - PO-TC35: Receive multiple items simultaneously (200)
   * - PO-TC36: Permission denied role warehouse_staff (403, tested by guard)
   * - PO-TC37: No authentication (401, tested by guard)
   * - PO-TC38: Inventory integration verified (200, check stock increases)
   */
  async receivePurchaseOrder(poId: string, dto: ReceivePurchaseOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('No items to receive');
    }

    // Kiểm tra trạng thái PO cho phép nhận
    const poBefore = await this.poRepo.findById(poId);
    if (!poBefore) throw new NotFoundException('PO not found');
    if (!(poBefore.status === PoStatus.ordered || poBefore.status === PoStatus.partial)) {
      throw new BadRequestException('PO status is not eligible for receiving');
    }

    // 1) Kiểm tra với các dòng sản phẩm PO và tính toán increment
    const targetIds = dto.items.map((i) => i.poItemId);
    const existing = await this.poRepo.findItemsByIds(poId, targetIds);
    if (existing.length !== targetIds.length) {
      throw new BadRequestException('Some items not found in PO');
    }

    // 2) Validate over-receive TRƯỚC KHI gọi inventory service để tránh data inconsistency
    for (const r of dto.items) {
      const item = existing.find((e) => e.id === r.poItemId)!;
      if (item.qtyReceived + r.qtyToReceive > item.qtyOrdered) {
        throw new BadRequestException(
          `Receive quantity ${r.qtyToReceive} for item ${item.id} exceeds remaining quantity ${item.qtyOrdered - item.qtyReceived}`,
        );
      }
    }

    // 3) REFACTORED: Auto-allocation logic for locationId and productBatchId
    //    - If locationId is missing: Find default location (first location or 'Default' location)
    //    - If productBatchId is missing: Auto-create ProductBatch with format BATCH-PO-{PO_NO}-{ITEM_ID}
    //    Then call Inventory receive for each line (Inventory supports idempotencyKey)
    //    -> If Inventory returns idempotent=true, do NOT increment qtyReceived again
    const increments: { poItemId: string; qtyInc: number }[] = [];
    for (const r of dto.items) {
      // STEP 3A: Auto-allocate locationId if missing
      let locationId = r.locationId;
      if (!locationId) {
        this.logger.log(`LocationId not provided for item ${r.poItemId}, finding default location`);
        // Try to find location with code 'DEFAULT' or name 'Default' first
        let defaultLocation = await this.prisma.location.findFirst({
          where: {
            OR: [
              { code: { equals: 'DEFAULT', mode: 'insensitive' } },
              { name: { equals: 'Default', mode: 'insensitive' } },
            ],
          },
          orderBy: { createdAt: 'asc' },
        });

        // If not found, get the first location in the system
        if (!defaultLocation) {
          defaultLocation = await this.prisma.location.findFirst({
            orderBy: { createdAt: 'asc' },
          });
        }

        if (!defaultLocation) {
          throw new BadRequestException(
            'No location found in system. Please create a location first or provide locationId.',
          );
        }

        locationId = defaultLocation.id;
        this.logger.log(`Auto-allocated locationId: ${locationId} (${defaultLocation.code})`);
      }

      // STEP 3B: Auto-allocate productBatchId if missing
      const poItem = existing.find((e) => e.id === r.poItemId)!;
      const productId = poItem.productId;

      if (!productId) {
        this.logger.error(`PO item ${r.poItemId} has no productId`);
        throw new BadRequestException(`PO item ${r.poItemId} is missing productId`);
      }

      let productBatchId = r.productBatchId;
      let batch = productBatchId
        ? await this.prisma.productBatch.findUnique({
            where: { id: productBatchId },
          })
        : null;

      // If productBatchId not provided or batch doesn't exist, create new batch
      if (!batch) {
        if (!productBatchId) {
          // Auto-generate batchNo: BATCH-PO-{PO_NO}-{ITEM_ID}
          const batchNo = `BATCH-PO-${poBefore.poNo}-${r.poItemId.substring(0, 8).toUpperCase()}`;
          productBatchId = randomUUID();

          this.logger.log(
            `ProductBatchId not provided for item ${r.poItemId}, creating new batch: ${batchNo}`,
          );
          try {
            batch = await this.prisma.productBatch.create({
              data: {
                id: productBatchId,
                productId: productId,
                batchNo: batchNo,
                quantity: 0, // Will be updated by inventory receive
                // manufactureDate and expiryDate can be added later if needed
              },
            });
            if (!batch) {
              throw new BadRequestException('Failed to create product batch: create returned null');
            }
            this.logger.log(`Created new ProductBatch: ${batch.id} (${batch.batchNo})`);
          } catch (error) {
            this.logger.error(`Failed to create ProductBatch:`, error);
            throw new BadRequestException(
              `Failed to create product batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        } else {
          // productBatchId provided but batch doesn't exist
          this.logger.log(
            `ProductBatch ${productBatchId} not found, creating new batch for product ${productId}`,
          );
          try {
            batch = await this.prisma.productBatch.create({
              data: {
                id: productBatchId,
                productId: productId,
                batchNo: `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                quantity: 0, // Will be updated by inventory receive
                // manufactureDate and expiryDate can be added later if needed
              },
            });
            if (!batch) {
              throw new BadRequestException('Failed to create product batch: create returned null');
            }
            this.logger.log(`Created new ProductBatch: ${batch.id} (${batch.batchNo})`);
          } catch (error) {
            this.logger.error(`Failed to create ProductBatch ${productBatchId}:`, error);
            throw new BadRequestException(
              `Failed to create product batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }
      }

      // STEP 3C: Receive inventory (batch and location now guaranteed to exist)
      // At this point, locationId and productBatchId are guaranteed to be defined
      if (!locationId || !productBatchId) {
        throw new BadRequestException(
          'Internal error: locationId or productBatchId is missing after auto-allocation',
        );
      }

      const payload: ReceiveInventoryDto = {
        productBatchId: productBatchId,
        locationId: locationId,
        quantity: r.qtyToReceive,
        createdById: r.createdById,
        idempotencyKey: r.idempotencyKey,
      };
      const invResult = (await this.inventorySvc.receiveInventory(payload)) as {
        success: boolean;
        idempotent?: boolean;
      };

      // Track increments only when this call is not idempotently ignored
      if (!invResult.idempotent) {
        increments.push({ poItemId: r.poItemId, qtyInc: r.qtyToReceive });
      }
    }

    // 4) Cập nhật qtyReceived và trạng thái PO trong transaction
    // Note: If inventory received but PO update fails, retry will be idempotent
    let updatedPo: PurchaseOrder;
    try {
      // If everything was idempotent, do not mutate PO again; just return current state.
      if (increments.length === 0) {
        this.logger.log(`All items were idempotently received for PO: ${poId}`);
        const current = await this.poRepo.findById(poId);
        if (!current) throw new NotFoundException('PO not found after receive');
        return current;
      }

      updatedPo = await this.poRepo.receiveItems(poId, increments);
    } catch (e) {
      this.logger.error(`Failed to update PO after inventory receipt for ${poId}:`, e);
      if (e instanceof Error) {
        if (e.message === 'PO_STATUS_INVALID') {
          throw new BadRequestException(
            'PO status changed during receive. Inventory received - please check and retry if needed.',
          );
        }
        if (e.message === 'ITEM_NOT_FOUND') {
          throw new BadRequestException(
            'PO item not found. Inventory received - please check data consistency.',
          );
        }
        if (e.message === 'OVER_RECEIVE') {
          throw new BadRequestException(
            'Receive exceeds ordered quantity. This should not happen - validation was done before receive.',
          );
        }
      }
      throw new BadRequestException(
        'Inventory received but failed to update PO. Operation is idempotent - safe to retry.',
      );
    }
    const result = await this.poRepo.findById(updatedPo.id);
    if (!result) throw new NotFoundException('PO not found after receive');
    return result;
  }

  /**
   * List Purchase Orders API
   * Minimum test cases: 12
   * - PO-TC39: Get all with default pagination (200)
   * - PO-TC40: Filter by poNo (200)
   * - PO-TC41: Filter by status (200)
   * - PO-TC42: Filter by supplierId (200)
   * - PO-TC43: Filter by dateFrom (200)
   * - PO-TC44: Filter by dateTo (200)
   * - PO-TC45: Filter by date range (200)
   * - PO-TC46: Pagination (200)
   * - PO-TC47: Sort by placedAt asc (200)
   * - PO-TC48: Sort by status desc (200)
   * - PO-TC49: Combine multiple filters (200)
   * - PO-TC50: SQL injection test (200, should be handled by Prisma)
   * Total: 50 test cases for OrderService
   */
  async list(query: QueryPurchaseOrderDto): Promise<PurchaseOrderListResponseDto> {
    const where: Prisma.PurchaseOrderWhereInput = {};
    if (query.poNo) where.poNo = { contains: query.poNo, mode: 'insensitive' };
    if (query.status) where.status = query.status;
    if (query.supplierId) where.supplierId = query.supplierId;
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

    const orderBy: Prisma.PurchaseOrderOrderByWithRelationInput[] = [];
    for (const part of (query.sort ?? 'placedAt:desc').split(',')) {
      const [field, dir] = part.split(':');
      if (!field) continue;
      orderBy.push({
        [field]: dir === 'asc' ? 'asc' : 'desc',
      } as Prisma.PurchaseOrderOrderByWithRelationInput);
    }

    // Disable pagination - return all records
    const { data, total } = await this.poRepo.list({ where, orderBy });
    return {
      success: true,
      data,
      total,
      message: 'Purchase orders retrieved successfully',
    };
  }

  async updatePurchaseOrder(
    id: string,
    dto: {
      supplierId?: string;
      placedAt?: string;
      expectedArrival?: string;
      notes?: string;
      items?: {
        id?: string;
        productId?: string;
        qtyOrdered?: number;
        unitPrice?: number;
        remark?: string;
      }[];
    },
  ) {
    const po = await this.poRepo.findById(id);
    if (!po) throw new NotFoundException('PO not found');
    if (po.status !== PoStatus.draft) {
      throw new BadRequestException('Only draft PO can be updated');
    }

    const updateData: Prisma.PurchaseOrderUpdateInput = {};
    if (dto.supplierId) updateData.supplier = { connect: { id: dto.supplierId } };
    if (dto.placedAt) updateData.placedAt = new Date(dto.placedAt);
    if (dto.expectedArrival) updateData.expectedArrival = new Date(dto.expectedArrival);
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    await this.poRepo.update(id, updateData);

    if (dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        if (item.id) {
          const existingItem = await this.poRepo.getItemById(item.id);
          if (!existingItem || existingItem.purchaseOrderId !== id) {
            throw new BadRequestException(`Item ${item.id} not found in this PO`);
          }

          const itemUpdateData: Prisma.PurchaseOrderItemUpdateInput = {};
          if (item.productId) itemUpdateData.product = { connect: { id: item.productId } };
          if (item.qtyOrdered !== undefined) itemUpdateData.qtyOrdered = item.qtyOrdered;
          if (item.unitPrice !== undefined) {
            itemUpdateData.unitPrice = item.unitPrice;
            itemUpdateData.lineTotal =
              item.unitPrice * (item.qtyOrdered ?? existingItem.qtyOrdered);
          }
          if (item.remark !== undefined) itemUpdateData.remark = item.remark;

          await this.poRepo.updateItem(item.id, itemUpdateData);
        }
      }
    }

    await this.poRepo.updateTotals(id);
    const updated = await this.poRepo.findById(id);
    if (!updated) throw new NotFoundException('PO not found after update');

    // Audit logging for PO update
    this.auditMiddleware
      .logUpdate(
        'PurchaseOrder',
        id,
        po as Record<string, unknown>,
        updated as Record<string, unknown>,
      )
      .catch((err) => {
        this.logger.error('Failed to write audit log for PO update', err);
      });

    return updated;
  }

  async cancelPurchaseOrder(id: string, dto: { reason?: string }, cancelledById: string) {
    this.logger.log(`Cancelling purchase order: ${id} by user: ${cancelledById}`);

    const po = await this.poRepo.findById(id);
    if (!po) throw new NotFoundException('PO not found');
    if (po.status === PoStatus.received || po.status === PoStatus.cancelled) {
      throw new BadRequestException(`Cannot cancel PO with status: ${po.status}`);
    }

    // Reason is optional but validated by DTO if provided
    // Audit trail is handled by audit-log middleware

    await this.poRepo.cancel(id);
    const updated = await this.poRepo.findById(id);
    if (!updated) throw new NotFoundException('PO not found after cancel');

    // Audit logging for PO cancellation
    this.auditMiddleware
      .logUpdate(
        'PurchaseOrder',
        id,
        po as Record<string, unknown>,
        updated as Record<string, unknown>,
      )
      .catch((err) => {
        this.logger.error('Failed to write audit log for PO cancellation', err);
      });

    return updated;
  }

  async addPurchaseOrderItems(
    id: string,
    items: { productId: string; qtyOrdered: number; unitPrice?: number; remark?: string }[],
  ) {
    const po = await this.poRepo.findById(id);
    if (!po) throw new NotFoundException('PO not found');
    if (po.status !== PoStatus.draft) {
      throw new BadRequestException('Can only add items to draft PO');
    }

    const itemsToAdd: Omit<Prisma.PurchaseOrderItemCreateManyInput, 'purchaseOrderId'>[] =
      items.map((it) => ({
        productId: it.productId,
        qtyOrdered: it.qtyOrdered,
        unitPrice: it.unitPrice ?? null,
        lineTotal: it.unitPrice ? it.unitPrice * it.qtyOrdered : null,
        remark: it.remark ?? null,
      }));

    await this.poRepo.addItems(id, itemsToAdd);
    await this.poRepo.updateTotals(id);

    const updated = await this.poRepo.findById(id);
    if (!updated) throw new NotFoundException('PO not found after adding items');

    // Audit logging for PO items addition
    this.auditMiddleware
      .logUpdate(
        'PurchaseOrder',
        id,
        po as Record<string, unknown>,
        updated as Record<string, unknown>,
      )
      .catch((err) => {
        this.logger.error('Failed to write audit log for PO items addition', err);
      });

    return updated;
  }

  async removePurchaseOrderItems(id: string, itemIds: string[]) {
    const po = await this.poRepo.findById(id);
    if (!po) throw new NotFoundException('PO not found');
    if (po.status !== PoStatus.draft) {
      throw new BadRequestException('Can only remove items from draft PO');
    }

    for (const itemId of itemIds) {
      const item = await this.poRepo.getItemById(itemId);
      if (!item || item.purchaseOrderId !== id) {
        throw new BadRequestException(`Item ${itemId} not found in this PO`);
      }
    }

    await this.poRepo.removeItems(itemIds);
    await this.poRepo.updateTotals(id);

    const updated = await this.poRepo.findById(id);
    if (!updated) throw new NotFoundException('PO not found after removing items');

    // Audit logging for PO items removal
    this.auditMiddleware
      .logUpdate(
        'PurchaseOrder',
        id,
        po as Record<string, unknown>,
        updated as Record<string, unknown>,
      )
      .catch((err) => {
        this.logger.error('Failed to write audit log for PO items removal', err);
      });

    return updated;
  }
}
