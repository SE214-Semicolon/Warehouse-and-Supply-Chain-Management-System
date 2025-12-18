import { PrismaClient, OrderStatus, PoStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedOrders(options: {
  customers: any[];
  suppliers: any[];
  products: any[];
  batches: any[];
}) {
  console.log('📦 Seeding purchase orders and sales orders...');

  const { customers, suppliers, products, batches } = options;

  const randomPastDate = (daysAgo: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    return date;
  };

  const purchaseOrders = [];
  
  // Create 10 Purchase Orders with realistic data
  for (let i = 1; i <= 10; i++) {
    const supplier = suppliers[i % suppliers.length];
    const product = products[i % products.length];
    const batch = batches.find((b: any) => b.productId === product.id) || batches[0];
    
    const qtyOrdered = 50 + (i * 25);
    const isReceived = i <= 6; // First 6 are received
    
    const po = await prisma.purchaseOrder.create({
      data: {
        poNo: `PO-2024-${String(i).padStart(3, '0')}`,
        supplierId: supplier.id,
        orderDate: randomPastDate(90),
        expectedDate: randomPastDate(60),
        status: isReceived ? PoStatus.received : i <= 8 ? PoStatus.ordered : PoStatus.draft,
        items: {
          create: [
            {
              productId: product.id,
              productBatchId: isReceived ? batch.id : null,
              qtyOrdered: qtyOrdered,
              qtyReceived: isReceived ? qtyOrdered : 0,
              unitPrice: 50000 + (i * 10000),
            },
          ],
        },
      },
      include: { items: true },
    });
    purchaseOrders.push(po);
  }

  console.log(`✅ Created ${purchaseOrders.length} purchase orders`);

  const salesOrders = [];

  // Create 20 Sales Orders 
  for (let i = 1; i <= 20; i++) {
    const customer = customers[i % customers.length];
    const numItems = 1 + (i % 2); // 1-2 items
    
    const items = [];
    for (let j = 0; j < numItems; j++) {
      const productIdx = (i + j) % products.length;
      const product = products[productIdx];
      const batch = batches.find((b: any) => b.productId === product.id);
      
      items.push({
        productId: product.id,
        productBatchId: batch?.id || null,
        qty: 10 + (i * 5) + (j * 10),
        unitPrice: 80000 + (i * 5000),
      });
    }
    
    const orderStatuses = [OrderStatus.pending, OrderStatus.approved, OrderStatus.processing, OrderStatus.shipped, OrderStatus.closed];
    const status = orderStatuses[i % orderStatuses.length];
    
    const so = await prisma.salesOrder.create({
      data: {
        soNo: `SO-2024-${String(i).padStart(3, '0')}`,
        customerId: customer.id,
        orderDate: randomPastDate(60),
        deliveryDate: randomPastDate(30),
        status: status,
        items: {
          create: items,
        },
      },
      include: { items: true },
    });
    salesOrders.push(so);
  }

  console.log(`✅ Created ${salesOrders.length} sales orders`);
  console.log('✅ Order seeding completed!');

  return { purchaseOrders, salesOrders };
}

if (require.main === module) {
  (async function main() {
    console.log('⚠️  This seed module requires existing customers, suppliers, products, and batches');
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
