import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, PoStatus } from '@prisma/client';

export interface POPerformanceDto {
  startDate?: Date;
  endDate?: Date;
  supplierId?: string;
  status?: PoStatus;
  page?: number;
  limit?: number;
  sortBy?: 'placedAt' | 'expectedArrival' | 'totalAmount' | 'leadTime';
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierPerformanceDto {
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'totalOrders' | 'totalValue' | 'avgLeadTime' | 'onTimeRate';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ProcurementReportingService {
  private readonly logger = new Logger(ProcurementReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * PO Performance Report
   * Metrics: Total POs by status, average lead time, fulfillment rate
   */
  async getPOPerformance(dto: POPerformanceDto) {
    this.logger.log('Generating PO Performance Report');

    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PurchaseOrderWhereInput = {};
    if (dto.startDate || dto.endDate) {
      where.placedAt = {};
      if (dto.startDate) where.placedAt.gte = dto.startDate;
      if (dto.endDate) where.placedAt.lte = dto.endDate;
    }
    if (dto.supplierId) where.supplierId = dto.supplierId;
    if (dto.status) where.status = dto.status;

    // Get POs with items
    const [pos, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          items: true,
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: this.buildPOSortOrder(dto.sortBy, dto.sortOrder),
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    // Calculate metrics for each PO
    const posWithMetrics = pos.map((po) => {
      const orderedQty = po.items?.reduce((sum, item) => sum + item.qtyOrdered, 0) ?? 0;
      const receivedQty = po.items?.reduce((sum, item) => sum + item.qtyReceived, 0) ?? 0;
      const fulfillmentRate = orderedQty > 0 ? Math.round((receivedQty / orderedQty) * 100) : 0;

      // Lead time calculation (placedAt to current if not received, or to last update)
      let leadTimeDays: number | null = null;
      if (po.status === 'received' && po.updatedAt && po.placedAt) {
        leadTimeDays = Math.round(
          (po.updatedAt.getTime() - po.placedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
      } else if (po.status === 'partial' && po.placedAt) {
        leadTimeDays = Math.round(
          (new Date().getTime() - po.placedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      return {
        id: po.id,
        poNo: po.poNo,
        supplier: po.supplier,
        status: po.status,
        placedAt: po.placedAt,
        expectedArrival: po.expectedArrival,
        totalAmount: po.totalAmount,
        orderedQty,
        receivedQty,
        fulfillmentRate,
        leadTimeDays,
        itemsCount: po.items?.length ?? 0,
      };
    });

    // Calculate summary statistics
    const summary = await this.getPOSummaryStats(where);

    return {
      success: true,
      data: posWithMetrics,
      summary,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Calculate summary statistics for POs
   */
  private async getPOSummaryStats(where: Prisma.PurchaseOrderWhereInput) {
    const [statusCounts, avgStats] = await Promise.all([
      // Count by status
      this.prisma.purchaseOrder.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      // Average metrics
      this.prisma.purchaseOrder.aggregate({
        where: { ...where, status: { in: ['received', 'partial'] } },
        _avg: {
          totalAmount: true,
        },
      }),
    ]);

    // Calculate average lead time manually (updatedAt - placedAt for received POs)
    const receivedPOs = await this.prisma.purchaseOrder.findMany({
      where: { ...where, status: 'received' },
      select: {
        placedAt: true,
        updatedAt: true,
      },
    });

    const leadTimes = receivedPOs
      .filter((po) => po.updatedAt && po.placedAt)
      .map((po) => (po.updatedAt!.getTime() - po.placedAt!.getTime()) / (1000 * 60 * 60 * 24));

    const avgLeadTime =
      leadTimes.length > 0
        ? Math.round(leadTimes.reduce((sum, lt) => sum + lt, 0) / leadTimes.length)
        : null;

    return {
      totalPOs: statusCounts.reduce((sum, s) => sum + s._count, 0),
      byStatus: statusCounts.reduce(
        (acc, s) => {
          acc[s.status] = s._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      avgOrderValue: avgStats._avg.totalAmount
        ? Math.round(Number(avgStats._avg.totalAmount))
        : null,
      avgLeadTimeDays: avgLeadTime,
    };
  }

  /**
   * Supplier Performance Report
   * Metrics: Total orders per supplier, average lead time, on-time delivery rate
   */
  async getSupplierPerformance(dto: SupplierPerformanceDto) {
    this.logger.log('Generating Supplier Performance Report');

    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    // Build date filter
    const dateFilter: Prisma.PurchaseOrderWhereInput = {};
    if (dto.startDate || dto.endDate) {
      dateFilter.placedAt = {};
      if (dto.startDate) dateFilter.placedAt.gte = dto.startDate;
      if (dto.endDate) dateFilter.placedAt.lte = dto.endDate;
    }

    // Get all suppliers with their POs
    const suppliers = await this.prisma.supplier.findMany({
      include: {
        purchaseOrders: {
          where: dateFilter,
          include: {
            items: true,
          },
        },
      },
      skip,
      take: limit,
    });

    const totalSuppliers = await this.prisma.supplier.count();

    // Calculate metrics for each supplier
    const suppliersWithMetrics = suppliers.map((supplier) => {
      const pos = supplier.purchaseOrders;
      const totalOrders = pos.length;

      // Total value (convert Decimal to number)
      const totalValue = pos.reduce((sum, po) => sum + Number(po.totalAmount ?? 0), 0);

      // Average lead time (only for received POs)
      const receivedPOs = pos.filter(
        (po) => po.status === 'received' && po.updatedAt && po.placedAt,
      );
      const leadTimes = receivedPOs.map(
        (po) => (po.updatedAt!.getTime() - po.placedAt!.getTime()) / (1000 * 60 * 60 * 24),
      );
      const avgLeadTime =
        leadTimes.length > 0
          ? Math.round(leadTimes.reduce((sum, lt) => sum + lt, 0) / leadTimes.length)
          : null;

      // On-time delivery rate (received before expectedArrival)
      const onTimePOs = receivedPOs.filter(
        (po) => po.expectedArrival && po.updatedAt && po.updatedAt <= po.expectedArrival,
      );
      const onTimeRate =
        receivedPOs.length > 0 ? Math.round((onTimePOs.length / receivedPOs.length) * 100) : null;

      // Fulfillment rate
      const totalOrdered = pos.reduce(
        (sum, po) => sum + (po.items?.reduce((s, item) => s + item.qtyOrdered, 0) ?? 0),
        0,
      );
      const totalReceived = pos.reduce(
        (sum, po) => sum + (po.items?.reduce((s, item) => s + item.qtyReceived, 0) ?? 0),
        0,
      );
      const fulfillmentRate =
        totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

      return {
        id: supplier.id,
        name: supplier.name,
        contactInfo: supplier.contactInfo,
        totalOrders,
        totalValue: Math.round(totalValue),
        avgOrderValue: totalOrders > 0 ? Math.round(totalValue / totalOrders) : 0,
        avgLeadTimeDays: avgLeadTime,
        onTimeDeliveryRate: onTimeRate,
        fulfillmentRate,
      };
    });

    // Sort results
    const sortedSuppliers = this.sortSuppliers(suppliersWithMetrics, dto.sortBy, dto.sortOrder);

    return {
      success: true,
      data: sortedSuppliers,
      pagination: {
        total: totalSuppliers,
        page,
        limit,
        totalPages: Math.ceil(totalSuppliers / limit),
      },
    };
  }

  /**
   * Build sort order for PO query
   */
  private buildPOSortOrder(
    sortBy?: string,
    sortOrder?: string,
  ): Prisma.PurchaseOrderOrderByWithRelationInput {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    switch (sortBy) {
      case 'placedAt':
        return { placedAt: order };
      case 'expectedArrival':
        return { expectedArrival: order };
      case 'totalAmount':
        return { totalAmount: order };
      default:
        return { createdAt: 'desc' };
    }
  }

  /**
   * Sort suppliers by specified field
   */
  private sortSuppliers(suppliers: any[], sortBy?: string, sortOrder?: string): any[] {
    const order = sortOrder === 'asc' ? 1 : -1;

    return suppliers.sort((a, b) => {
      let aVal: number, bVal: number;

      switch (sortBy) {
        case 'totalOrders':
          aVal = a.totalOrders;
          bVal = b.totalOrders;
          break;
        case 'totalValue':
          aVal = a.totalValue;
          bVal = b.totalValue;
          break;
        case 'avgLeadTime':
          aVal = a.avgLeadTimeDays ?? 9999;
          bVal = b.avgLeadTimeDays ?? 9999;
          break;
        case 'onTimeRate':
          aVal = a.onTimeDeliveryRate ?? -1;
          bVal = b.onTimeDeliveryRate ?? -1;
          break;
        default:
          aVal = a.totalOrders;
          bVal = b.totalOrders;
      }

      return (aVal - bVal) * order;
    });
  }
}
