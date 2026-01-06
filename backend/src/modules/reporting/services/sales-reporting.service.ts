import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, OrderStatus } from '@prisma/client';

export interface SOPerformanceDto {
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
  status?: OrderStatus;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'placedAt' | 'totalAmount' | 'fulfillmentTime';
  sortOrder?: 'asc' | 'desc';
}

export interface SalesTrendsDto {
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'week' | 'month';
  productId?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SalesReportingService {
  private readonly logger = new Logger(SalesReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * SO Performance Report
   * Metrics: Total SOs by status, average fulfillment time, fulfillment rate
   */
  async getSOPerformance(dto: SOPerformanceDto) {
    this.logger.log('Generating SO Performance Report');

    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.SalesOrderWhereInput = {};
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) where.createdAt.gte = dto.startDate;
      if (dto.endDate) where.createdAt.lte = dto.endDate;
    }
    if (dto.customerId) where.customerId = dto.customerId;
    if (dto.status) where.status = dto.status;

    // Get SOs with items
    const [sos, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  sku: true,
                  name: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: this.buildSOSortOrder(dto.sortBy, dto.sortOrder),
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    // Calculate metrics for each SO
    const sosWithMetrics = sos.map((so) => {
      const orderedQty = so.items?.reduce((sum, item) => sum + item.qty, 0) ?? 0;
      const fulfilledQty = so.items?.reduce((sum, item) => sum + item.qtyFulfilled, 0) ?? 0;
      const fulfillmentRate = orderedQty > 0 ? Math.round((fulfilledQty / orderedQty) * 100) : 0;

      // Fulfillment time calculation (placedAt to updated)
      let fulfillmentTimeDays: number | null = null;
      if (so.status === OrderStatus.closed && so.placedAt && so.updatedAt) {
        fulfillmentTimeDays = Math.round(
          (so.updatedAt.getTime() - so.placedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
      } else if (so.status === OrderStatus.pending && so.placedAt) {
        // Pending time for pending orders
        fulfillmentTimeDays = Math.round(
          (new Date().getTime() - so.placedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      return {
        id: so.id,
        soNo: so.soNo,
        customer: so.customer,
        status: so.status,
        createdAt: so.createdAt,
        placedAt: so.placedAt,
        totalAmount: so.totalAmount ? Number(so.totalAmount) : null,
        orderedQty,
        fulfilledQty,
        fulfillmentRate,
        fulfillmentTimeDays,
        itemsCount: so.items?.length ?? 0,
      };
    });

    // Calculate summary statistics
    const summary = await this.getSOSummaryStats(where);

    return {
      success: true,
      data: sosWithMetrics,
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
   * Calculate summary statistics for SOs
   */
  private async getSOSummaryStats(where: Prisma.SalesOrderWhereInput) {
    const [statusCounts, avgStats] = await Promise.all([
      // Count by status
      this.prisma.salesOrder.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      // Average metrics
      this.prisma.salesOrder.aggregate({
        where: {
          ...where,
          status: { in: [OrderStatus.closed, OrderStatus.shipped, OrderStatus.pending] },
        },
        _avg: {
          totalAmount: true,
        },
      }),
    ]);

    // Calculate average fulfillment time manually (updatedAt - placedAt for fulfilled SOs)
    const fulfilledSOs = await this.prisma.salesOrder.findMany({
      where: { ...where, status: OrderStatus.closed },
      select: {
        placedAt: true,
        updatedAt: true,
      },
    });

    const fulfillmentTimes = fulfilledSOs
      .filter((so) => so.placedAt && so.updatedAt)
      .map((so) => (so.updatedAt.getTime() - so.placedAt!.getTime()) / (1000 * 60 * 60 * 24));

    const avgFulfillmentTime =
      fulfillmentTimes.length > 0
        ? Math.round(fulfillmentTimes.reduce((sum, ft) => sum + ft, 0) / fulfillmentTimes.length)
        : null;

    return {
      totalSOs: statusCounts.reduce((sum, s) => sum + s._count, 0),
      byStatus: statusCounts.reduce(
        (acc, s) => {
          acc[s.status] = s._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      avgOrderValue: avgStats._avg?.totalAmount
        ? Math.round(Number(avgStats._avg.totalAmount))
        : null,
      avgFulfillmentTimeDays: avgFulfillmentTime,
    };
  }

  /**
   * Sales Trends Report
   * Analyzes sales volume and revenue trends over time
   */
  async getSalesTrends(dto: SalesTrendsDto) {
    this.logger.log('Generating Sales Trends Report');

    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    // Build date filter
    const dateFilter: Prisma.SalesOrderWhereInput = {
      status: { in: [OrderStatus.pending, OrderStatus.closed, OrderStatus.shipped] }, // Only count real orders
    };
    if (dto.startDate || dto.endDate) {
      dateFilter.placedAt = {};
      if (dto.startDate) dateFilter.placedAt.gte = dto.startDate;
      if (dto.endDate) dateFilter.placedAt.lte = dto.endDate;
    }

    // Get all qualified SOs
    const salesOrders = await this.prisma.salesOrder.findMany({
      where: dateFilter,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                categoryId: true,
              },
            },
          },
        },
      },
      orderBy: { placedAt: 'desc' },
    });

    // Apply product/category filters
    let filteredOrders = salesOrders;
    if (dto.productId || dto.categoryId) {
      filteredOrders = salesOrders.filter((so) =>
        so.items?.some((item) => {
          if (dto.productId && item.productId !== dto.productId) return false;
          if (dto.categoryId && item.product?.categoryId !== dto.categoryId) return false;
          return true;
        }),
      );
    }

    // Group by time period
    const groupBy = dto.groupBy ?? 'day';
    const grouped = this.groupByTimePeriod(filteredOrders, groupBy);

    // Paginate results
    const paginatedData = grouped.slice(skip, skip + limit);

    // Calculate top products
    const topProducts = await this.getTopProducts(dto, 10);

    return {
      success: true,
      data: paginatedData,
      topProducts,
      summary: {
        totalRevenue: filteredOrders.reduce((sum, so) => sum + Number(so.totalAmount ?? 0), 0),
        totalOrders: filteredOrders.length,
        totalItems: filteredOrders.reduce(
          (sum, so) => sum + (so.items?.reduce((s, item) => s + item.qty, 0) ?? 0),
          0,
        ),
        avgOrderValue:
          filteredOrders.length > 0
            ? Math.round(
                filteredOrders.reduce((sum, so) => sum + Number(so.totalAmount ?? 0), 0) /
                  filteredOrders.length,
              )
            : 0,
      },
      pagination: {
        total: grouped.length,
        page,
        limit,
        totalPages: Math.ceil(grouped.length / limit),
      },
    };
  }

  /**
   * Group sales orders by time period
   */
  private groupByTimePeriod(orders: any[], groupBy: 'day' | 'week' | 'month') {
    const groups = new Map<string, any>();

    orders.forEach((so) => {
      if (!so.placedAt) return;

      const date = new Date(so.placedAt);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else {
        // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groups.has(key)) {
        groups.set(key, {
          period: key,
          orders: 0,
          revenue: 0,
          itemsSold: 0,
        });
      }

      const group = groups.get(key)!;
      group.orders += 1;
      group.revenue += Number(so.totalAmount ?? 0);
      group.itemsSold += so.items?.reduce((sum: number, item: any) => sum + item.qty, 0) ?? 0;
    });

    // Convert to array and sort by period descending
    return Array.from(groups.values()).sort((a, b) => b.period.localeCompare(a.period));
  }

  /**
   * Get top selling products
   */
  private async getTopProducts(dto: SalesTrendsDto, limit: number) {
    const dateFilter: Prisma.SalesOrderWhereInput = {
      status: { in: [OrderStatus.pending, OrderStatus.closed, OrderStatus.shipped] },
    };
    if (dto.startDate || dto.endDate) {
      dateFilter.placedAt = {};
      if (dto.startDate) dateFilter.placedAt.gte = dto.startDate;
      if (dto.endDate) dateFilter.placedAt.lte = dto.endDate;
    }

    const orderItems = await this.prisma.salesOrderItem.findMany({
      where: {
        salesOrder: dateFilter,
        ...(dto.productId ? { productId: dto.productId } : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            categoryId: true,
          },
        },
      },
    });

    // Apply category filter if provided
    const filteredItems = dto.categoryId
      ? orderItems.filter((item) => item.product?.categoryId === dto.categoryId)
      : orderItems;

    // Group by product
    const productMap = new Map<string, any>();
    filteredItems.forEach((item) => {
      if (!item.product) return;

      const productId = item.productId;
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product: item.product,
          totalQty: 0,
          totalRevenue: 0,
          orderCount: 0,
        });
      }

      const data = productMap.get(productId)!;
      data.totalQty += item.qty;
      data.totalRevenue += Number(item.unitPrice ?? 0) * item.qty;
      data.orderCount += 1;
    });

    // Sort by quantity and take top N
    return Array.from(productMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, limit)
      .map((item) => ({
        productId: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        totalQtySold: item.totalQty,
        totalRevenue: Math.round(item.totalRevenue),
        orderCount: item.orderCount,
      }));
  }

  /**
   * Build sort order for SO query
   */
  private buildSOSortOrder(
    sortBy?: string,
    sortOrder?: string,
  ): Prisma.SalesOrderOrderByWithRelationInput {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    switch (sortBy) {
      case 'createdAt':
        return { createdAt: order };
      case 'placedAt':
        return { placedAt: order };
      case 'totalAmount':
        return { totalAmount: order };
      default:
        return { createdAt: 'desc' };
    }
  }
}
