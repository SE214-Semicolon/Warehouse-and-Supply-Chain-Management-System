import { PrismaClient, UserRole, StockMovementType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create users
  console.log('Creating users...');
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'System Administrator',
      email: 'admin@warehouse.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: UserRole.admin,
      active: true,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      fullName: 'Warehouse Manager',
      email: 'manager@warehouse.com',
      passwordHash: await bcrypt.hash('manager123', 10),
      role: UserRole.manager,
      active: true,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      username: 'staff',
      fullName: 'Warehouse Staff',
      email: 'staff@warehouse.com',
      passwordHash: await bcrypt.hash('staff123', 10),
      role: UserRole.warehouse_staff,
      active: true,
    },
  });

  // Create warehouses
  console.log('Creating warehouses...');
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      code: 'MAIN',
      name: 'Main Warehouse',
      address: '123 Industrial Street, City, Country',
    },
  });

  const secondaryWarehouse = await prisma.warehouse.upsert({
    where: { code: 'SEC' },
    update: {},
    create: {
      code: 'SEC',
      name: 'Secondary Warehouse',
      address: '456 Commerce Avenue, City, Country',
    },
  });

  // Create locations
  console.log('Creating locations...');
  const locations = await Promise.all([
    prisma.location.upsert({
      where: { warehouseId_code: { warehouseId: mainWarehouse.id, code: 'A-01' } },
      update: {},
      create: {
        warehouseId: mainWarehouse.id,
        code: 'A-01',
        name: 'Zone A - Shelf 01',
        capacity: 1000,
        type: 'shelf',
      },
    }),
    prisma.location.upsert({
      where: { warehouseId_code: { warehouseId: mainWarehouse.id, code: 'A-02' } },
      update: {},
      create: {
        warehouseId: mainWarehouse.id,
        code: 'A-02',
        name: 'Zone A - Shelf 02',
        capacity: 1000,
        type: 'shelf',
      },
    }),
    prisma.location.upsert({
      where: { warehouseId_code: { warehouseId: mainWarehouse.id, code: 'B-01' } },
      update: {},
      create: {
        warehouseId: mainWarehouse.id,
        code: 'B-01',
        name: 'Zone B - Shelf 01',
        capacity: 800,
        type: 'shelf',
      },
    }),
    prisma.location.upsert({
      where: { warehouseId_code: { warehouseId: secondaryWarehouse.id, code: 'C-01' } },
      update: {},
      create: {
        warehouseId: secondaryWarehouse.id,
        code: 'C-01',
        name: 'Zone C - Shelf 01',
        capacity: 1200,
        type: 'shelf',
      },
    }),
  ]);

  // Create product categories
  console.log('Creating product categories...');
  const electronicsCategory = await prisma.productCategory.upsert({
    where: { name: 'Electronics' },
    update: {},
    create: {
      name: 'Electronics',
    },
  });

  const clothingCategory = await prisma.productCategory.upsert({
    where: { name: 'Clothing' },
    update: {},
    create: {
      name: 'Clothing',
    },
  });

  const foodCategory = await prisma.productCategory.upsert({
    where: { name: 'Food & Beverages' },
    update: {},
    create: {
      name: 'Food & Beverages',
    },
  });

  // Create products
  console.log('Creating products...');
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'LAPTOP-001' },
      update: {},
      create: {
        sku: 'LAPTOP-001',
        name: 'Business Laptop',
        categoryId: electronicsCategory.id,
        unit: 'piece',
        barcode: '1234567890123',
        parameters: {
          unitCost: 1200.00,
          brand: 'TechCorp',
          warranty: '2 years',
        },
      },
    }),
    prisma.product.upsert({
      where: { sku: 'PHONE-001' },
      update: {},
      create: {
        sku: 'PHONE-001',
        name: 'Smartphone',
        categoryId: electronicsCategory.id,
        unit: 'piece',
        barcode: '1234567890124',
        parameters: {
          unitCost: 800.00,
          brand: 'MobileTech',
          warranty: '1 year',
        },
      },
    }),
    prisma.product.upsert({
      where: { sku: 'TSHIRT-001' },
      update: {},
      create: {
        sku: 'TSHIRT-001',
        name: 'Cotton T-Shirt',
        categoryId: clothingCategory.id,
        unit: 'piece',
        barcode: '1234567890125',
        parameters: {
          unitCost: 15.00,
          size: 'M',
          color: 'Blue',
        },
      },
    }),
    prisma.product.upsert({
      where: { sku: 'MILK-001' },
      update: {},
      create: {
        sku: 'MILK-001',
        name: 'Fresh Milk',
        categoryId: foodCategory.id,
        unit: 'liter',
        barcode: '1234567890126',
        parameters: {
          unitCost: 2.50,
          fatContent: '3.5%',
          organic: true,
        },
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BREAD-001' },
      update: {},
      create: {
        sku: 'BREAD-001',
        name: 'Whole Wheat Bread',
        categoryId: foodCategory.id,
        unit: 'loaf',
        barcode: '1234567890127',
        parameters: {
          unitCost: 3.00,
          weight: '500g',
          organic: false,
        },
      },
    }),
  ]);

  // Create product batches with different expiry dates
  console.log('Creating product batches...');
  const now = new Date();
  const batches = await Promise.all([
    // Current stock - good expiry dates
    prisma.productBatch.upsert({
      where: { productId_batchNo: { productId: products[0].id, batchNo: 'L2024-001' } },
      update: {},
      create: {
        productId: products[0].id,
        batchNo: 'L2024-001',
        manufactureDate: new Date('2024-01-15'),
        expiryDate: new Date('2026-01-15'),
      },
    }),
    prisma.productBatch.upsert({
      where: { productId_batchNo: { productId: products[1].id, batchNo: 'P2024-001' } },
      update: {},
      create: {
        productId: products[1].id,
        batchNo: 'P2024-001',
        manufactureDate: new Date('2024-02-01'),
        expiryDate: new Date('2025-08-01'),
      },
    }),
    // Low stock items
    prisma.productBatch.upsert({
      where: { productId_batchNo: { productId: products[2].id, batchNo: 'T2024-001' } },
      update: {},
      create: {
        productId: products[2].id,
        batchNo: 'T2024-001',
        manufactureDate: new Date('2024-03-01'),
        expiryDate: new Date('2025-12-01'),
      },
    }),
    // Expiring soon
    prisma.productBatch.upsert({
      where: { productId_batchNo: { productId: products[3].id, batchNo: 'M2024-001' } },
      update: {},
      create: {
        productId: products[3].id,
        batchNo: 'M2024-001',
        manufactureDate: new Date('2024-09-01'),
        expiryDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      },
    }),
    // Already expired (for testing)
    prisma.productBatch.upsert({
      where: { productId_batchNo: { productId: products[4].id, batchNo: 'B2024-001' } },
      update: {},
      create: {
        productId: products[4].id,
        batchNo: 'B2024-001',
        manufactureDate: new Date('2024-08-01'),
        expiryDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
    }),
  ]);

  // Create inventory records
  console.log('Creating inventory records...');
  const inventoryRecords = await Promise.all([
    // Normal stock levels
    prisma.inventory.upsert({
      where: {
        productBatchId_locationId: {
          productBatchId: batches[0].id,
          locationId: locations[0].id,
        },
      },
      update: {},
      create: {
        productBatchId: batches[0].id,
        locationId: locations[0].id,
        availableQty: 25,
        reservedQty: 5,
      },
    }),
    prisma.inventory.upsert({
      where: {
        productBatchId_locationId: {
          productBatchId: batches[1].id,
          locationId: locations[1].id,
        },
      },
      update: {},
      create: {
        productBatchId: batches[1].id,
        locationId: locations[1].id,
        availableQty: 75,
        reservedQty: 10,
      },
    }),
    // Low stock
    prisma.inventory.upsert({
      where: {
        productBatchId_locationId: {
          productBatchId: batches[2].id,
          locationId: locations[2].id,
        },
      },
      update: {},
      create: {
        productBatchId: batches[2].id,
        locationId: locations[2].id,
        availableQty: 3, // Low stock alert
        reservedQty: 0,
      },
    }),
    // Expiring soon
    prisma.inventory.upsert({
      where: {
        productBatchId_locationId: {
          productBatchId: batches[3].id,
          locationId: locations[0].id,
        },
      },
      update: {},
      create: {
        productBatchId: batches[3].id,
        locationId: locations[0].id,
        availableQty: 150,
        reservedQty: 20,
      },
    }),
    // Expired
    prisma.inventory.upsert({
      where: {
        productBatchId_locationId: {
          productBatchId: batches[4].id,
          locationId: locations[3].id,
        },
      },
      update: {},
      create: {
        productBatchId: batches[4].id,
        locationId: locations[3].id,
        availableQty: 15,
        reservedQty: 0,
      },
    }),
  ]);

  // Create some historical stock movements
  console.log('Creating stock movements...');
  await Promise.all([
    // Initial receipts
    prisma.stockMovement.create({
      data: {
        productBatchId: batches[0].id,
        toLocationId: locations[0].id,
        quantity: 30,
        movementType: StockMovementType.purchase_receipt,
        createdById: staffUser.id,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
    }),
    prisma.stockMovement.create({
      data: {
        productBatchId: batches[1].id,
        toLocationId: locations[1].id,
        quantity: 85,
        movementType: StockMovementType.purchase_receipt,
        createdById: staffUser.id,
        createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
      },
    }),
    // Some dispatches
    prisma.stockMovement.create({
      data: {
        productBatchId: batches[0].id,
        fromLocationId: locations[0].id,
        quantity: 5,
        movementType: StockMovementType.sale_issue,
        createdById: staffUser.id,
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    }),
    prisma.stockMovement.create({
      data: {
        productBatchId: batches[1].id,
        fromLocationId: locations[1].id,
        quantity: 10,
        movementType: StockMovementType.sale_issue,
        createdById: staffUser.id,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
    }),
    // Some adjustments
    prisma.stockMovement.create({
      data: {
        productBatchId: batches[2].id,
        toLocationId: locations[2].id,
        quantity: 8,
        movementType: StockMovementType.adjustment,
        createdById: managerUser.id,
        reference: 'Initial stock adjustment',
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      },
    }),
    // Some reservations
    prisma.stockMovement.create({
      data: {
        productBatchId: batches[0].id,
        toLocationId: locations[0].id,
        quantity: 5,
        movementType: StockMovementType.reservation,
        createdById: staffUser.id,
        reference: 'ORDER-001',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    }),
  ]);

  // Create customers
  console.log('Creating customers...');
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { code: 'CUST-001' },
      update: {},
      create: {
        code: 'CUST-001',
        name: 'Cửa hàng ABC',
        contactInfo: {
          email: 'contact@abcstore.com',
          phone: '+84901111111',
          contactPerson: 'Nguyễn Văn B',
        },
        address: '123 Main Street, City',
      },
    }),
    prisma.customer.upsert({
      where: { code: 'CUST-002' },
      update: {},
      create: {
        code: 'CUST-002',
        name: 'Siêu thị XYZ',
        contactInfo: {
          email: 'sales@xyzmart.com',
          phone: '+84902222222',
          contactPerson: 'Trần Thị C',
        },
        address: '456 Commerce Ave, City',
      },
    }),
  ]);

  // Create suppliers
  console.log('Creating suppliers...');
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { code: 'SUP-001' },
      update: {},
      create: {
        code: 'SUP-001',
        name: 'Nhà cung cấp Electronics Pro',
        contactInfo: {
          email: 'info@elecpro.com',
          phone: '+84903333333',
          contactPerson: 'Lê Văn D',
        },
        address: '789 Industrial Zone, City',
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUP-002' },
      update: {},
      create: {
        code: 'SUP-002',
        name: 'Nhà cung cấp Food Fresh',
        contactInfo: {
          email: 'fresh@foodsupply.com',
          phone: '+84904444444',
          contactPerson: 'Phạm Văn E',
        },
        address: '321 Farm Road, City',
      },
    }),
  ]);

  // Create sales orders
  console.log('Creating sales orders...');
  const salesOrders = await Promise.all([
    prisma.salesOrder.upsert({
      where: { soNo: 'SO-202410-001' },
      update: {},
      create: {
        soNo: 'SO-202410-001',
        customerId: customers[0].id,
        status: 'pending',
        totalAmount: 2400000,
        placedAt: now,
        createdById: managerUser.id,
        items: {
          create: [
            {
              productId: products[0].id,
              qty: 2,
              qtyFulfilled: 0,
              unitPrice: 1200000,
              lineTotal: 2400000,
            },
          ],
        },
      },
    }),
    prisma.salesOrder.upsert({
      where: { soNo: 'SO-202410-002' },
      update: {},
      create: {
        soNo: 'SO-202410-002',
        customerId: customers[1].id,
        status: 'approved',
        totalAmount: 45000,
        placedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        createdById: staffUser.id,
        items: {
          create: [
            {
              productId: products[2].id,
              qty: 3,
              qtyFulfilled: 0,
              unitPrice: 15000,
              lineTotal: 45000,
            },
          ],
        },
      },
    }),
  ]);

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Test Data Summary:');
  console.log(`   Users: ${[adminUser, managerUser, staffUser].length}`);
  console.log(`   Warehouses: ${[mainWarehouse, secondaryWarehouse].length}`);
  console.log(`   Locations: ${locations.length}`);
  console.log(`   Categories: ${[electronicsCategory, clothingCategory, foodCategory].length}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Batches: ${batches.length}`);
  console.log(`   Inventory Records: ${inventoryRecords.length}`);
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Suppliers: ${suppliers.length}`);
  console.log(`   Sales Orders: ${salesOrders.length}`);

  console.log('\n🔐 Test Accounts:');
  console.log('   Admin: admin / admin123');
  console.log('   Manager: manager / manager123');
  console.log('   Staff: staff / staff123');

  console.log('\n🧪 Test Scenarios Available:');
  console.log('   • Low stock alerts (TSHIRT-001: 3 units)');
  console.log('   • Expiry alerts (MILK-001: expires in 15 days)');
  console.log('   • Expired items (BREAD-001: expired 5 days ago)');
  console.log('   • Stock transfers between locations');
  console.log('   • Inventory reports and valuation');
  console.log('   • Reservation and release operations');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });