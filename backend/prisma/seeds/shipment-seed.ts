import { PrismaClient, ShipmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedShipments(options: {
  salesOrders: any[];
  products: any[];
  batches: any[];
}) {
  console.log('�� Seeding shipments and tracking events...');

  const { salesOrders, products, batches } = options;

  const randomPastDate = (daysAgo: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    return date;
  };

  const carriers = ['Express Logistics', 'Fast Delivery', 'Vietnam Post', 'Viettel Post'];

  const shipments = [];

  // Create 10 Shipments with different statuses
  for (let i = 1; i <= 10; i++) {
    const so = salesOrders[(i - 1) % salesOrders.length];
    const shipmentDate = randomPastDate(30);
    const estimatedDelivery = new Date(shipmentDate);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

    let status: ShipmentStatus;
    if (i <= 4) {
      status = ShipmentStatus.delivered;
    } else if (i <= 7) {
      status = ShipmentStatus.in_transit;
    } else {
      status = ShipmentStatus.preparing;
    }

    const shipment = await prisma.shipment.create({
      data: {
        code: `SHIP-2024-${String(i).padStart(3, '0')}`,
        salesOrderId: so.id,
        shipmentDate: status !== ShipmentStatus.preparing ? shipmentDate : null,
        estimatedDelivery: estimatedDelivery,
        actualDelivery: status === ShipmentStatus.delivered ? estimatedDelivery : null,
        status: status,
        carrier: status !== ShipmentStatus.preparing ? carriers[i % carriers.length] : null,
        trackingCode: status !== ShipmentStatus.preparing ? `TRK${Date.now()}-${i}` : null,
        items: {
          create: so.items.slice(0, 1).map((item: any) => ({
            salesOrderId: so.id,
            productId: item.productId,
            productBatchId: item.productBatchId,
            qty: item.qty,
          })),
        },
      },
      include: { items: true },
    });

    // Create tracking events for non-preparing shipments
    if (status !== ShipmentStatus.preparing) {
      await prisma.shipmentTrackingEvent.create({
        data: {
          shipmentId: shipment.id,
          timestamp: shipmentDate,
          location: 'Warehouse',
          status: 'picked_up',
          description: 'Package picked up',
        },
      });

      if (status === ShipmentStatus.in_transit || status === ShipmentStatus.delivered) {
        const transitDate = new Date(shipmentDate);
        transitDate.setDate(transitDate.getDate() + 2);
        await prisma.shipmentTrackingEvent.create({
          data: {
            shipmentId: shipment.id,
            timestamp: transitDate,
            location: 'Transit Hub',
            status: 'in_transit',
            description: 'In transit',
          },
        });
      }

      if (status === ShipmentStatus.delivered) {
        await prisma.shipmentTrackingEvent.create({
          data: {
            shipmentId: shipment.id,
            timestamp: estimatedDelivery,
            location: 'Customer',
            status: 'delivered',
            description: 'Delivered successfully',
          },
        });
      }
    }

    shipments.push(shipment);
  }

  console.log(`✅ Created ${shipments.length} shipments`);
  const trackingCount = await prisma.shipmentTrackingEvent.count();
  console.log(`✅ Created ${trackingCount} tracking events`);
  console.log('✅ Shipment seeding completed!');

  return shipments;
}

if (require.main === module) {
  (async function main() {
    console.log('⚠️  This seed module requires existing sales orders, products, and batches');
    console.log('⚠️  Please run the main seed.ts file instead');
  })()
    .catch((e) => {
      console.error('❌ Error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
