import { Injectable } from '@nestjs/common';
import { Prisma, ShipmentStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma/prisma.service';

@Injectable()
export class ShipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.shipment.findUnique({
      where: { id },
      include: {
        warehouse: true,
        salesOrder: {
          include: {
            customer: true,
            items: true,
          },
        },
        items: {
          include: {
            product: true,
            productBatch: true,
            salesOrder: true,
          },
        },
        trackingEvents: {
          orderBy: { eventTime: 'desc' },
        },
      },
    });
  }

  async findByShipmentNo(shipmentNo: string) {
    return this.prisma.shipment.findUnique({
      where: { shipmentNo },
      include: {
        warehouse: true,
        salesOrder: {
          include: {
            customer: true,
          },
        },
        items: {
          include: {
            product: true,
            productBatch: true,
          },
        },
        trackingEvents: {
          orderBy: { eventTime: 'desc' },
        },
      },
    });
  }

  async findByTrackingCode(trackingCode: string) {
    return this.prisma.shipment.findFirst({
      where: { trackingCode },
      include: {
        warehouse: true,
        salesOrder: {
          include: {
            customer: true,
          },
        },
        items: {
          include: {
            product: true,
            productBatch: true,
          },
        },
        trackingEvents: {
          orderBy: { eventTime: 'desc' },
        },
      },
    });
  }

  async create(
    data: Prisma.ShipmentCreateInput,
    items?: Omit<Prisma.ShipmentItemCreateManyInput, 'shipmentId'>[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({ data });
      if (items?.length) {
        await tx.shipmentItem.createMany({
          data: items.map((it) => ({
            shipmentId: shipment.id,
            salesOrderId: it.salesOrderId ?? null,
            productId: it.productId ?? null,
            productBatchId: it.productBatchId ?? null,
            qty: it.qty,
          })),
        });
      }
      return shipment;
    });
  }

  async list(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ShipmentWhereInput;
    orderBy?: Prisma.ShipmentOrderByWithRelationInput[];
  }) {
    const { skip, take, where, orderBy } = params;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          warehouse: true,
          salesOrder: {
            include: {
              customer: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      this.prisma.shipment.count({ where }),
    ]);
    return { data, total };
  }

  async update(id: string, data: Prisma.ShipmentUpdateInput) {
    return this.prisma.shipment.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    status: ShipmentStatus,
    shippedAt?: Date | null,
    deliveredAt?: Date | null,
  ) {
    const updateData: Prisma.ShipmentUpdateInput = { status };
    if (shippedAt !== undefined) {
      updateData.shippedAt = shippedAt;
    }
    if (deliveredAt !== undefined) {
      updateData.deliveredAt = deliveredAt;
    }
    return this.prisma.shipment.update({
      where: { id },
      data: updateData,
    });
  }

  async addTrackingEvent(shipmentId: string, eventData: Prisma.ShipmentTrackingEventCreateInput) {
    return this.prisma.shipmentTrackingEvent.create({
      data: {
        ...eventData,
        shipment: { connect: { id: shipmentId } },
      },
    });
  }

  async getTrackingEvents(shipmentId: string) {
    return this.prisma.shipmentTrackingEvent.findMany({
      where: { shipmentId },
      orderBy: { eventTime: 'desc' },
    });
  }
}
