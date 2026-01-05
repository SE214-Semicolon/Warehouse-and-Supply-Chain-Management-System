import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ShipmentRepository } from '../repositories/shipment.repository';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { UpdateShipmentDto } from '../dto/update-shipment.dto';
import { UpdateShipmentStatusDto } from '../dto/update-shipment-status.dto';
import { AddTrackingEventDto } from '../dto/add-tracking-event.dto';
import { QueryShipmentDto } from '../dto/query-shipment.dto';
import { Prisma, ShipmentStatus } from '@prisma/client';
import { WarehouseRepository } from '../../warehouse/repositories/warehouse.repository';
import { SalesOrderRepository } from '../../sales/repositories/sales-order.repository';
import { InventoryRepository } from '../../inventory/repositories/inventory.repository';
import { randomUUID } from 'crypto';
import { AuditMiddleware } from '../../../database/middleware/audit.middleware';

@Injectable()
export class ShipmentService {
  private readonly logger = new Logger(ShipmentService.name);

  constructor(
    private readonly shipmentRepo: ShipmentRepository,
    private readonly warehouseRepo: WarehouseRepository,
    private readonly salesOrderRepo: SalesOrderRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly auditMiddleware: AuditMiddleware,
  ) {}

  private generateShipmentNo(): string {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const rand = randomUUID().slice(0, 6).toUpperCase();
    return `SHIP-${y}${m}-${rand}`;
  }

  async createShipment(dto: CreateShipmentDto): Promise<any> {
    this.logger.log(`Creating shipment for sales order: ${dto.salesOrderId}`);
    // Step 1: Validate SalesOrder exists (using Repository pattern)
    const salesOrder = await this.salesOrderRepo.findById(dto.salesOrderId);

    if (!salesOrder) {
      this.logger.warn(`SalesOrder not found: ${dto.salesOrderId}`);
      throw new NotFoundException(`SalesOrder with ID ${dto.salesOrderId} not found`);
    }

    // Step 2: Validate Warehouse exists (using Repository pattern)
    const warehouse = await this.warehouseRepo.findOne(dto.warehouseId);

    if (!warehouse) {
      this.logger.warn(`Warehouse not found: ${dto.warehouseId}`);
      throw new NotFoundException(`Warehouse with ID ${dto.warehouseId} not found`);
    }

    // Step 3: Inventory Check (CRITICAL) - using Repository pattern
    // Get all location IDs in the warehouse
    // WarehouseRepository.findOne includes locations (type assertion needed)
    const warehouseWithLocations = warehouse as typeof warehouse & {
      locations: Array<{ id: string }>;
    };
    if (!warehouseWithLocations.locations || warehouseWithLocations.locations.length === 0) {
      throw new BadRequestException(`Warehouse ${dto.warehouseId} has no locations`);
    }
    const locationIds = warehouseWithLocations.locations.map((loc) => loc.id);

    if (locationIds.length === 0) {
      throw new BadRequestException(`Warehouse ${dto.warehouseId} has no locations`);
    }

    // For each item in the shipment, check inventory availability
    for (const item of dto.items) {
      if (!item.productId) {
        throw new BadRequestException('Product ID is required for all shipment items');
      }

      // Calculate total available stock for this product across all locations in the warehouse
      // Using InventoryRepository instead of PrismaService directly
      const inventoryRecords = await this.inventoryRepo.findInventoryByProductAndLocations(
        item.productId,
        locationIds,
      );

      // Sum up availableQty for this product across all locations in the warehouse
      const totalAvailableQty = inventoryRecords.reduce((sum, inv) => sum + inv.availableQty, 0);

      // Check if we have enough stock
      if (totalAvailableQty < item.qty) {
        const product = inventoryRecords[0]?.productBatch?.product;
        const productName = product?.name || item.productId;
        throw new BadRequestException(
          `Insufficient inventory for product ${productName} (ID: ${item.productId}). ` +
            `Available: ${totalAvailableQty}, Requested: ${item.qty}`,
        );
      }
    }

    // Step 4: Create Shipment with warehouseId and salesOrderId
    const shipmentNo = this.generateShipmentNo();

    const items: Omit<Prisma.ShipmentItemCreateManyInput, 'shipmentId'>[] = dto.items.map((it) => ({
      salesOrderId: dto.salesOrderId, // Link to the sales order
      productId: it.productId ?? null,
      productBatchId: it.productBatchId ?? null,
      qty: it.qty,
    }));

    const shipmentData: Prisma.ShipmentCreateInput = {
      shipmentNo,
      warehouse: { connect: { id: dto.warehouseId } },
      salesOrder: { connect: { id: dto.salesOrderId } },
      carrier: dto.carrier ?? null,
      trackingCode: dto.trackingCode ?? null,
      status: ShipmentStatus.preparing,
      estimatedDelivery: dto.estimatedDelivery ? new Date(dto.estimatedDelivery) : null,
      notes: dto.notes ?? null,
    };

    const shipment = await this.shipmentRepo.create(shipmentData, items);
    const created = await this.shipmentRepo.findById(shipment.id);

    // Audit logging for Shipment creation
    if (created) {
      this.auditMiddleware
        .logCreate('Shipment', created as Record<string, unknown>)
        .catch((err) => {
          this.logger.error('Failed to write audit log for Shipment creation', err);
        });
    }

    return created;
  }

  async findById(id: string) {
    const shipment = await this.shipmentRepo.findById(id);
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  async findByShipmentNo(shipmentNo: string) {
    const shipment = await this.shipmentRepo.findByShipmentNo(shipmentNo);
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  async list(query: QueryShipmentDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ShipmentWhereInput = {};

    if (query.shipmentNo) {
      where.shipmentNo = { contains: query.shipmentNo, mode: 'insensitive' };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.carrier) {
      where.carrier = { contains: query.carrier, mode: 'insensitive' };
    }
    if (query.trackingCode) {
      where.trackingCode = { contains: query.trackingCode, mode: 'insensitive' };
    }
    if (query.dateFrom || query.dateTo) {
      const shippedAtFilter: Prisma.DateTimeNullableFilter = {};
      if (query.dateFrom) {
        shippedAtFilter.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        shippedAtFilter.lte = new Date(query.dateTo);
      }
      where.shippedAt = shippedAtFilter;
    }

    const orderBy: Prisma.ShipmentOrderByWithRelationInput[] = [];
    for (const part of (query.sort ?? 'shippedAt:desc').split(',')) {
      const [field, dir] = part.split(':');
      if (!field) continue;
      orderBy.push({
        [field]: dir === 'asc' ? 'asc' : 'desc',
      } as Prisma.ShipmentOrderByWithRelationInput);
    }

    const { data, total } = await this.shipmentRepo.list({ skip, take: pageSize, where, orderBy });
    return { data, total, page, pageSize };
  }

  async updateShipment(id: string, dto: UpdateShipmentDto) {
    const shipment = await this.shipmentRepo.findById(id);
    if (!shipment) throw new NotFoundException('Shipment not found');

    // Only allow updates when status is preparing
    if (shipment.status !== ShipmentStatus.preparing) {
      throw new BadRequestException('Only shipments with status "preparing" can be updated');
    }

    const updateData: Prisma.ShipmentUpdateInput = {};
    if (dto.carrier !== undefined) updateData.carrier = dto.carrier;
    if (dto.trackingCode !== undefined) updateData.trackingCode = dto.trackingCode;
    if (dto.estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = new Date(dto.estimatedDelivery);
    }
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    await this.shipmentRepo.update(id, updateData);
    const updated = await this.shipmentRepo.findById(id);

    // Audit logging for Shipment update
    if (updated) {
      this.auditMiddleware
        .logUpdate(
          'Shipment',
          id,
          shipment as Record<string, unknown>,
          updated as Record<string, unknown>,
        )
        .catch((err) => {
          this.logger.error('Failed to write audit log for Shipment update', err);
        });
    }

    return updated;
  }

  async updateShipmentStatus(id: string, dto: UpdateShipmentStatusDto) {
    const shipment = await this.shipmentRepo.findById(id);
    if (!shipment) throw new NotFoundException('Shipment not found');

    // Validate status transitions
    const currentStatus = shipment.status;
    const newStatus = dto.status;

    // Cannot change status of delivered shipment
    if (currentStatus === ShipmentStatus.delivered) {
      throw new BadRequestException('Cannot change status of delivered shipment');
    }

    // Valid transitions
    const validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
      [ShipmentStatus.preparing]: [
        ShipmentStatus.in_transit,
        ShipmentStatus.delayed,
        ShipmentStatus.cancelled,
      ],
      [ShipmentStatus.in_transit]: [
        ShipmentStatus.delivered,
        ShipmentStatus.delayed,
        ShipmentStatus.cancelled,
      ],
      [ShipmentStatus.delayed]: [
        ShipmentStatus.in_transit,
        ShipmentStatus.delivered,
        ShipmentStatus.cancelled,
      ],
      [ShipmentStatus.delivered]: [],
      [ShipmentStatus.cancelled]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }

    // Set timestamps based on status
    let shippedAt: Date | null | undefined = undefined;
    let deliveredAt: Date | null | undefined = undefined;

    if (newStatus === ShipmentStatus.in_transit && !shipment.shippedAt) {
      shippedAt = new Date();
    }

    if (newStatus === ShipmentStatus.delivered) {
      deliveredAt = new Date();
      if (!shipment.shippedAt) {
        shippedAt = new Date(); // Auto-set shippedAt if not set
      }
    }

    // Update notes if provided
    if (dto.notes) {
      await this.shipmentRepo.update(id, { notes: dto.notes });
    }

    await this.shipmentRepo.updateStatus(id, newStatus, shippedAt, deliveredAt);
    const updated = await this.shipmentRepo.findById(id);

    // Audit logging for Shipment status update
    if (updated) {
      this.auditMiddleware
        .logUpdate(
          'Shipment',
          id,
          shipment as Record<string, unknown>,
          updated as Record<string, unknown>,
        )
        .catch((err) => {
          this.logger.error('Failed to write audit log for Shipment status update', err);
        });
    }

    return updated;
  }

  async addTrackingEvent(shipmentId: string, dto: AddTrackingEventDto) {
    const shipment = await this.shipmentRepo.findById(shipmentId);
    if (!shipment) throw new NotFoundException('Shipment not found');

    const eventData: Prisma.ShipmentTrackingEventCreateInput = {
      eventTime: new Date(dto.eventTime),
      location: dto.location ?? null,
      statusText: dto.statusText,
      rawPayload: dto.rawPayload ?? Prisma.JsonNull,
      shipment: { connect: { id: shipmentId } },
    };

    await this.shipmentRepo.addTrackingEvent(shipmentId, eventData);
    return this.shipmentRepo.findById(shipmentId);
  }

  async trackByCode(trackingCode: string) {
    const shipment = await this.shipmentRepo.findByTrackingCode(trackingCode);
    if (!shipment) throw new NotFoundException('Shipment not found with this tracking code');
    return shipment;
  }

  async deleteShipment(id: string) {
    this.logger.log(`Attempting to delete shipment: ${id}`);
    const shipment = await this.shipmentRepo.findById(id);
    if (!shipment) {
      this.logger.warn(`Shipment not found: ${id}`);
      throw new NotFoundException('Không tìm thấy vận đơn');
    }

    // Validation: Không cho xóa nếu đang in_transit hoặc delivered
    if (shipment.status === ShipmentStatus.in_transit) {
      this.logger.warn(`Cannot delete shipment ${id}: status is ${shipment.status}`);
      throw new BadRequestException('Không thể xóa vận đơn đang trong quá trình vận chuyển.');
    }

    if (shipment.status === ShipmentStatus.delivered) {
      this.logger.warn(`Cannot delete shipment ${id}: status is ${shipment.status}`);
      throw new BadRequestException('Không thể xóa vận đơn đã giao hàng thành công.');
    }

    // Soft delete: chuyển status thành cancelled
    await this.shipmentRepo.update(id, { status: ShipmentStatus.cancelled });

    const updated = await this.shipmentRepo.findById(id);

    // Audit logging for Shipment deletion (soft delete)
    if (updated) {
      this.auditMiddleware
        .logUpdate(
          'Shipment',
          id,
          shipment as Record<string, unknown>,
          updated as Record<string, unknown>,
        )
        .catch((err) => {
          this.logger.error('Failed to write audit log for Shipment deletion', err);
        });
    }

    this.logger.log(`Shipment ${id} soft deleted (cancelled) successfully`);
    return updated;
  }
}
