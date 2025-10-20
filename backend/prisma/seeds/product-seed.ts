import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedProducts() {
  console.log('🌱 Seeding products...');

  // Create categories
  const categories = await Promise.all([
    prisma.productCategory.upsert({
      where: { name: 'Electronics' },
      update: {},
      create: {
        name: 'Electronics',
        metadata: { description: 'Electronic devices and accessories' },
      },
    }),
    prisma.productCategory.upsert({
      where: { name: 'Food & Beverage' },
      update: {},
      create: {
        name: 'Food & Beverage',
        metadata: { description: 'Food and beverage products' },
      },
    }),
    prisma.productCategory.upsert({
      where: { name: 'Clothing' },
      update: {},
      create: {
        name: 'Clothing',
        metadata: { description: 'Apparel and fashion items' },
      },
    }),
    prisma.productCategory.upsert({
      where: { name: 'Home & Garden' },
      update: {},
      create: {
        name: 'Home & Garden',
        metadata: { description: 'Home improvement and garden supplies' },
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Create subcategories
  const subcategories = await Promise.all([
    prisma.productCategory.upsert({
      where: { name: 'Laptops' },
      update: {},
      create: {
        name: 'Laptops',
        parentId: categories[0].id,
        metadata: { description: 'Laptop computers' },
      },
    }),
    prisma.productCategory.upsert({
      where: { name: 'Smartphones' },
      update: {},
      create: {
        name: 'Smartphones',
        parentId: categories[0].id,
        metadata: { description: 'Mobile phones' },
      },
    }),
    prisma.productCategory.upsert({
      where: { name: 'Beverages' },
      update: {},
      create: {
        name: 'Beverages',
        parentId: categories[1].id,
        metadata: { description: 'Drinks and beverages' },
      },
    }),
    prisma.productCategory.upsert({
      where: { name: 'Snacks' },
      update: {},
      create: {
        name: 'Snacks',
        parentId: categories[1].id,
        metadata: { description: 'Snack foods' },
      },
    }),
  ]);

  console.log(`✅ Created ${subcategories.length} subcategories`);

  // Create products
  const products = await Promise.all([
    // Electronics
    prisma.product.upsert({
      where: { sku: 'LAPTOP-DELL-XPS15' },
      update: {},
      create: {
        sku: 'LAPTOP-DELL-XPS15',
        name: 'Dell XPS 15 Laptop',
        categoryId: subcategories[0].id,
        unit: 'pcs',
        barcode: '1234567890001',
        parameters: {
          brand: 'Dell',
          model: 'XPS 15',
          processor: 'Intel i7',
          ram: '16GB',
          storage: '512GB SSD',
          screen: '15.6 inch',
          weight: '2.0kg',
        },
      },
    }),
    prisma.product.upsert({
      where: { sku: 'LAPTOP-HP-ENVY' },
      update: {},
      create: {
        sku: 'LAPTOP-HP-ENVY',
        name: 'HP Envy 13 Laptop',
        categoryId: subcategories[0].id,
        unit: 'pcs',
        barcode: '1234567890002',
        parameters: {
          brand: 'HP',
          model: 'Envy 13',
          processor: 'Intel i5',
          ram: '8GB',
          storage: '256GB SSD',
          screen: '13.3 inch',
          weight: '1.3kg',
        },
      },
    }),
    prisma.product.upsert({
      where: { sku: 'PHONE-IPHONE-14' },
      update: {},
      create: {
        sku: 'PHONE-IPHONE-14',
        name: 'iPhone 14 Pro',
        categoryId: subcategories[1].id,
        unit: 'pcs',
        barcode: '1234567890003',
        parameters: {
          brand: 'Apple',
          model: 'iPhone 14 Pro',
          storage: '256GB',
          color: 'Space Black',
          screen: '6.1 inch',
        },
      },
    }),
    prisma.product.upsert({
      where: { sku: 'PHONE-SAMSUNG-S23' },
      update: {},
      create: {
        sku: 'PHONE-SAMSUNG-S23',
        name: 'Samsung Galaxy S23',
        categoryId: subcategories[1].id,
        unit: 'pcs',
        barcode: '1234567890004',
        parameters: {
          brand: 'Samsung',
          model: 'Galaxy S23',
          storage: '128GB',
          color: 'Phantom Black',
          screen: '6.1 inch',
        },
      },
    }),

    // Food & Beverage
    prisma.product.upsert({
      where: { sku: 'BEV-COKE-330ML' },
      update: {},
      create: {
        sku: 'BEV-COKE-330ML',
        name: 'Coca-Cola 330ml Can',
        categoryId: subcategories[2].id,
        unit: 'can',
        barcode: '1234567890005',
        parameters: {
          brand: 'Coca-Cola',
          volume: '330ml',
          type: 'Carbonated drink',
          packaging: 'Aluminum can',
        },
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BEV-WATER-500ML' },
      update: {},
      create: {
        sku: 'BEV-WATER-500ML',
        name: 'Mineral Water 500ml',
        categoryId: subcategories[2].id,
        unit: 'bottle',
        barcode: '1234567890006',
        parameters: {
          brand: 'Aquafina',
          volume: '500ml',
          type: 'Mineral water',
          packaging: 'PET bottle',
        },
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SNACK-LAYS-50G' },
      update: {},
      create: {
        sku: 'SNACK-LAYS-50G',
        name: "Lay's Potato Chips 50g",
        categoryId: subcategories[3].id,
        unit: 'pack',
        barcode: '1234567890007',
        parameters: {
          brand: "Lay's",
          weight: '50g',
          flavor: 'Classic Salt',
          packaging: 'Bag',
        },
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SNACK-OREO-100G' },
      update: {},
      create: {
        sku: 'SNACK-OREO-100G',
        name: 'Oreo Cookies 100g',
        categoryId: subcategories[3].id,
        unit: 'pack',
        barcode: '1234567890008',
        parameters: {
          brand: 'Oreo',
          weight: '100g',
          type: 'Sandwich cookie',
          packaging: 'Box',
        },
      },
    }),

    // Clothing
    prisma.product.upsert({
      where: { sku: 'CLOTH-TSHIRT-M' },
      update: {},
      create: {
        sku: 'CLOTH-TSHIRT-M',
        name: 'Cotton T-Shirt Medium',
        categoryId: categories[2].id,
        unit: 'pcs',
        barcode: '1234567890009',
        parameters: {
          type: 'T-Shirt',
          material: '100% Cotton',
          size: 'M',
          color: 'Navy Blue',
        },
      },
    }),
    prisma.product.upsert({
      where: { sku: 'CLOTH-JEANS-32' },
      update: {},
      create: {
        sku: 'CLOTH-JEANS-32',
        name: 'Denim Jeans Size 32',
        categoryId: categories[2].id,
        unit: 'pcs',
        barcode: '1234567890010',
        parameters: {
          type: 'Jeans',
          material: 'Denim',
          size: '32',
          color: 'Dark Blue',
          fit: 'Slim',
        },
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // Create product batches
  const batches = await Promise.all([
    // Laptop batches
    prisma.productBatch.upsert({
      where: {
        productId_batchNo: {
          productId: products[0].id,
          batchNo: 'BATCH-DELL-2024-01',
        },
      },
      update: {},
      create: {
        productId: products[0].id,
        batchNo: 'BATCH-DELL-2024-01',
        quantity: 50,
        manufactureDate: new Date('2024-01-15'),
        barcodeOrQr: 'QR:DELL-XPS-2024-01',
      },
    }),
    prisma.productBatch.upsert({
      where: {
        productId_batchNo: {
          productId: products[1].id,
          batchNo: 'BATCH-HP-2024-01',
        },
      },
      update: {},
      create: {
        productId: products[1].id,
        batchNo: 'BATCH-HP-2024-01',
        quantity: 30,
        manufactureDate: new Date('2024-02-01'),
        barcodeOrQr: 'QR:HP-ENVY-2024-01',
      },
    }),

    // Phone batches
    prisma.productBatch.upsert({
      where: {
        productId_batchNo: {
          productId: products[2].id,
          batchNo: 'BATCH-IPHONE-2024-03',
        },
      },
      update: {},
      create: {
        productId: products[2].id,
        batchNo: 'BATCH-IPHONE-2024-03',
        quantity: 100,
        manufactureDate: new Date('2024-03-01'),
        barcodeOrQr: 'QR:IPHONE14-2024-03',
      },
    }),

    // Beverage batches with expiry dates
    prisma.productBatch.upsert({
      where: {
        productId_batchNo: {
          productId: products[4].id,
          batchNo: 'BATCH-COKE-2024-04',
        },
      },
      update: {},
      create: {
        productId: products[4].id,
        batchNo: 'BATCH-COKE-2024-04',
        quantity: 1000,
        manufactureDate: new Date('2024-04-01'),
        expiryDate: new Date('2025-04-01'),
        barcodeOrQr: 'QR:COKE-2024-04',
      },
    }),
    prisma.productBatch.upsert({
      where: {
        productId_batchNo: {
          productId: products[5].id,
          batchNo: 'BATCH-WATER-2024-05',
        },
      },
      update: {},
      create: {
        productId: products[5].id,
        batchNo: 'BATCH-WATER-2024-05',
        quantity: 2000,
        manufactureDate: new Date('2024-05-01'),
        expiryDate: new Date('2025-05-01'),
        barcodeOrQr: 'QR:WATER-2024-05',
      },
    }),

    // Snack batches with expiry dates
    prisma.productBatch.upsert({
      where: {
        productId_batchNo: {
          productId: products[6].id,
          batchNo: 'BATCH-LAYS-2024-06',
        },
      },
      update: {},
      create: {
        productId: products[6].id,
        batchNo: 'BATCH-LAYS-2024-06',
        quantity: 500,
        manufactureDate: new Date('2024-06-01'),
        expiryDate: new Date('2024-12-01'),
        barcodeOrQr: 'QR:LAYS-2024-06',
      },
    }),
    prisma.productBatch.upsert({
      where: {
        productId_batchNo: {
          productId: products[7].id,
          batchNo: 'BATCH-OREO-2024-07',
        },
      },
      update: {},
      create: {
        productId: products[7].id,
        batchNo: 'BATCH-OREO-2024-07',
        quantity: 800,
        manufactureDate: new Date('2024-07-01'),
        expiryDate: new Date('2025-01-01'),
        barcodeOrQr: 'QR:OREO-2024-07',
      },
    }),

    // Clothing batches
    prisma.productBatch.upsert({
      where: {
        productId_batchNo: {
          productId: products[8].id,
          batchNo: 'BATCH-TSHIRT-2024-08',
        },
      },
      update: {},
      create: {
        productId: products[8].id,
        batchNo: 'BATCH-TSHIRT-2024-08',
        quantity: 200,
        manufactureDate: new Date('2024-08-01'),
        barcodeOrQr: 'QR:TSHIRT-2024-08',
      },
    }),
  ]);

  console.log(`✅ Created ${batches.length} product batches`);

  console.log('✅ Product seeding completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  seedProducts()
    .catch((e) => {
      console.error('❌ Error seeding products:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
