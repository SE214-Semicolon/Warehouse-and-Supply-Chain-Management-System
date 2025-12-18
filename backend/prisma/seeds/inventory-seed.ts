import { PrismaClient, StockMovementType } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedInventoryAndMovements(options: {
  products: any[];
  batches: any[];
  warehouses: any[];
  locations: any[];
  users: any[];
}) {
  console.log('📦 Seeding inventory records and stock movements...');

  const { products, batches, warehouses, locations, users } = options;

  const inventoryRecords = [];
  const movements = [];

  // Helper functions
  const randomPastDate = (daysAgo: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    return date;
  };

  const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Create inventory records for each product-batch-location combination
  console.log('  Creating inventory records...');

  // Distribute inventory across warehouses and locations
  for (const batch of batches) {
    const product = products.find((p: any) => p.id === batch.productId);
    if (!product) continue;

    // Get locations for random warehouses (2-3 warehouses per product)
    const numWarehouses = 2 + Math.floor(Math.random() * 2);
    const selectedWarehouses = [];

    for (let i = 0; i < Math.min(numWarehouses, warehouses.length); i++) {
      const wh = warehouses[i];
      selectedWarehouses.push(wh);
    }

    for (const warehouse of selectedWarehouses) {
      // Get 2-4 locations in this warehouse
      const warehouseLocations = locations.filter((loc: any) => loc.warehouseId === warehouse.id);
      const numLocations = Math.min(2 + Math.floor(Math.random() * 3), warehouseLocations.length);

      for (let i = 0; i < numLocations; i++) {
        const location = warehouseLocations[i];
        if (!location) continue;

        // Calculate quantity (distribute batch quantity across locations)
        const availableQty =
          Math.floor(batch.quantity / (numWarehouses * numLocations)) +
          Math.floor(Math.random() * 20);
        const reservedQty = Math.floor(availableQty * 0.1); // 10% reserved

        if (availableQty > 0) {
          const inventory = await prisma.inventory.create({
            data: {
              productBatchId: batch.id,
              locationId: location.id,
              availableQty: availableQty,
              reservedQty: reservedQty,
            },
          });

          inventoryRecords.push(inventory);
        }
      }
    }
  }

  console.log(`  ✅ Created ${inventoryRecords.length} inventory records`);

  // Create stock movements
  console.log('  Creating stock movements...');

  const movementTypes = [
    StockMovementType.purchase_receipt,
    StockMovementType.sale_issue,
    StockMovementType.adjustment,
    StockMovementType.transfer_in,
    StockMovementType.transfer_out,
    StockMovementType.returned,
  ];

  // Generate 300+ movements
  for (let i = 0; i < 300; i++) {
    const inventory = getRandomItem(inventoryRecords);
    const movementType = getRandomItem(movementTypes);
    const user = getRandomItem(users);

    // Determine quantity and direction based on movement type
    let quantity = 5 + Math.floor(Math.random() * 50);
    let fromLocationId = inventory.locationId;
    let toLocationId = null;
    let notes = '';

    switch (movementType) {
      case StockMovementType.purchase_receipt:
        toLocationId = inventory.locationId;
        fromLocationId = null;
        notes = `Received from supplier - PO-2024-${String(Math.floor(i / 12) + 1).padStart(3, '0')}`;
        break;

      case StockMovementType.sale_issue:
        fromLocationId = inventory.locationId;
        toLocationId = null;
        notes = `Shipped to customer - SO-2024-${String(Math.floor(i / 4) + 1).padStart(3, '0')}`;
        break;

      case StockMovementType.transfer_in:
        // Transfer between locations
        const otherLocations = inventoryRecords.filter(
          (inv: any) => inv.locationId !== inventory.locationId,
        );
        if (otherLocations.length > 0) {
          fromLocationId = getRandomItem(otherLocations).locationId;
        }
        toLocationId = inventory.locationId;
        notes = `Internal transfer - received`;
        break;

      case StockMovementType.transfer_out:
        fromLocationId = inventory.locationId;
        const destLocations = inventoryRecords.filter(
          (inv: any) => inv.locationId !== inventory.locationId,
        );
        if (destLocations.length > 0) {
          toLocationId = getRandomItem(destLocations).locationId;
        }
        notes = `Internal transfer - dispatched`;
        break;

      case StockMovementType.adjustment:
        // Stock adjustment (can be positive or negative)
        quantity = Math.floor(Math.random() * 20) - 10; // -10 to +10
        toLocationId = inventory.locationId;
        fromLocationId = inventory.locationId;
        notes =
          quantity > 0
            ? 'Stock count adjustment - found extra'
            : 'Stock count adjustment - shrinkage';
        break;

      case StockMovementType.returned:
        toLocationId = inventory.locationId;
        fromLocationId = null;
        notes = `Customer return - SO-2024-${String(Math.floor(i / 8) + 1).padStart(3, '0')}`;
        break;
    }

    const movement = await prisma.stockMovement.create({
      data: {
        productBatchId: inventory.productBatchId,
        productId: null,
        fromLocationId: fromLocationId,
        toLocationId: toLocationId,
        quantity: Math.abs(quantity),
        movementType: movementType,
        performedBy: user.id,
        timestamp: randomPastDate(180), // Last 6 months
        notes: notes,
      },
    });

    movements.push(movement);
  }

  console.log(`  ✅ Created ${movements.length} stock movements`);

  // Create summary by movement type
  const movementsByType: { [key: string]: number } = {};
  for (const movement of movements) {
    movementsByType[movement.movementType] = (movementsByType[movement.movementType] || 0) + 1;
  }

  console.log('  📊 Stock movements by type:');
  for (const [type, count] of Object.entries(movementsByType)) {
    console.log(`    - ${type}: ${count}`);
  }

  console.log('✅ Inventory and movement seeding completed!');

  return { inventoryRecords, movements };
}

// Run if this file is executed directly
if (require.main === module) {
  (async function main() {
    console.log(
      '⚠️  This seed module requires existing products, batches, warehouses, locations, and users',
    );
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
