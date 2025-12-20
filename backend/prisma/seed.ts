import {
  PrismaClient,
  Prisma,
  UserRole,
  PoStatus,
  OrderStatus,
  ShipmentStatus,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Tạo số thập phân cho tiền tệ sử dụng Prisma.Decimal
 */
function createDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

type SeedPurchaseOrderItem = {
  productId: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  remark?: string;
};

type SeedSalesOrderItem = {
  productId: string;
  productBatchId?: string;
  locationId?: string;
  qty: number;
  qtyFulfilled: number;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

/**
 * Tạo ngày tháng ngẫu nhiên trong 3 tháng gần đây
 */
function randomDateInLast3Months(): Date {
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  return faker.date.between({ from: threeMonthsAgo, to: now });
}

/**
 * Tạo ngày tháng trong tương lai (cho expectedArrival)
 */
function randomFutureDate(daysFromNow: number = 7): Date {
  const now = new Date();
  const future = new Date(now);
  future.setDate(now.getDate() + daysFromNow);
  return faker.date.between({ from: now, to: future });
}

/**
 * Format log message đẹp
 */
function log(message: string): void {
  console.log(`\n📦 ${message}`);
}

function logSuccess(message: string): void {
  console.log(`   ✅ ${message}`);
}

function logError(message: string): void {
  console.error(`   ❌ ${message}`);
}

// ============================================================================
// CLEAN DATABASE
// ============================================================================

async function cleanDatabase(): Promise<void> {
  log('Đang xóa dữ liệu cũ...');

  // Xóa theo thứ tự ràng buộc khóa ngoại (từ bảng con đến bảng cha)
  await prisma.shipmentTrackingEvent.deleteMany();
  await prisma.shipmentItem.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.demandForecast.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productBatch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.location.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userInvite.deleteMany();
  await prisma.user.deleteMany();

  logSuccess('Đã xóa toàn bộ dữ liệu cũ');
}

// ============================================================================
// SEED USERS
// ============================================================================

async function seedUsers(): Promise<Prisma.UserGetPayload<Record<string, never>>[]> {
  log('Đang tạo Users...');

  const users: Prisma.UserCreateInput[] = [
    {
      username: 'admin',
      fullName: 'Nguyễn Văn Admin',
      email: 'admin@warehouse.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: UserRole.admin,
      active: true,
    },
    {
      username: 'manager',
      fullName: 'Trần Thị Manager',
      email: 'manager@warehouse.com',
      passwordHash: await bcrypt.hash('manager123', 10),
      role: UserRole.manager,
      active: true,
    },
    {
      username: 'staff',
      fullName: 'Lê Văn Staff',
      email: 'staff@warehouse.com',
      passwordHash: await bcrypt.hash('staff123', 10),
      role: UserRole.warehouse_staff,
      active: true,
    },
    {
      username: 'sales1',
      fullName: 'Phạm Thị Sales',
      email: 'sales1@warehouse.com',
      passwordHash: await bcrypt.hash('sales123', 10),
      role: UserRole.sales,
      active: true,
    },
    {
      username: 'procurement',
      fullName: 'Hoàng Văn Procurement',
      email: 'procurement@warehouse.com',
      passwordHash: await bcrypt.hash('procurement123', 10),
      role: UserRole.procurement,
      active: true,
    },
    {
      username: 'logistics',
      fullName: 'Vũ Thị Logistics',
      email: 'logistics@warehouse.com',
      passwordHash: await bcrypt.hash('logistics123', 10),
      role: UserRole.logistics,
      active: true,
    },
    {
      username: 'analyst',
      fullName: 'Đỗ Văn Analyst',
      email: 'analyst@warehouse.com',
      passwordHash: await bcrypt.hash('analyst123', 10),
      role: UserRole.analyst,
      active: true,
    },
  ];

  const createdUsers = await Promise.all(users.map((user) => prisma.user.create({ data: user })));

  logSuccess(`Đã tạo ${createdUsers.length} users`);
  return createdUsers;
}

// ============================================================================
// SEED WAREHOUSES & LOCATIONS
// ============================================================================

async function seedWarehousesAndLocations(): Promise<{
  warehouses: Prisma.WarehouseGetPayload<Record<string, never>>[];
  locations: Prisma.LocationGetPayload<Record<string, never>>[];
}> {
  log('Đang tạo Warehouses và Locations...');

  const warehouseData: Prisma.WarehouseCreateInput[] = [
    {
      code: 'WH-HCM-001',
      name: 'Kho Tân Bình - TP.HCM',
      address: '123 Đường Tân Bình, Phường 1, Quận Tân Bình, TP.HCM',
    },
    {
      code: 'WH-HCM-002',
      name: 'Kho Bình Tân - TP.HCM',
      address: '456 Đường Bình Tân, Phường 2, Quận Bình Tân, TP.HCM',
    },
    {
      code: 'WH-HN-001',
      name: 'Kho Long Biên - Hà Nội',
      address: '789 Đường Long Biên, Phường Long Biên, Quận Long Biên, Hà Nội',
    },
  ];

  const warehouses = await Promise.all(
    warehouseData.map((warehouse) => prisma.warehouse.create({ data: warehouse })),
  );

  logSuccess(`Đã tạo ${warehouses.length} warehouses`);

  // Tạo locations cho mỗi warehouse (10-20 locations mỗi kho)
  const locationTypes = ['shelf', 'rack', 'pallet', 'bin', 'zone'];
  const allLocations: Prisma.LocationGetPayload<Record<string, never>>[] = [];

  for (const warehouse of warehouses) {
    const locationCount = faker.number.int({ min: 10, max: 20 });
    const locations: Prisma.LocationCreateInput[] = [];

    for (let i = 1; i <= locationCount; i++) {
      const zone = String.fromCharCode(65 + Math.floor((i - 1) / 5)); // A, B, C, D...
      const shelf = String(i % 5 || 5).padStart(2, '0');
      const locationType = faker.helpers.arrayElement(locationTypes);

      locations.push({
        warehouse: { connect: { id: warehouse.id } },
        code: `${zone}-${shelf}`,
        name: `Khu vực ${zone} - Kệ ${shelf}`,
        capacity: faker.number.int({ min: 100, max: 2000 }),
        type: locationType,
        properties: {
          temperature: locationType === 'zone' ? faker.number.int({ min: 15, max: 25 }) : null,
          humidity: locationType === 'zone' ? faker.number.int({ min: 40, max: 60 }) : null,
        },
      });
    }

    const createdLocations = await Promise.all(
      locations.map((location) => prisma.location.create({ data: location })),
    );

    allLocations.push(...createdLocations);
  }

  logSuccess(`Đã tạo ${allLocations.length} locations`);

  return { warehouses, locations: allLocations };
}

// ============================================================================
// SEED SUPPLIERS
// ============================================================================

async function seedSuppliers(): Promise<Prisma.SupplierGetPayload<Record<string, never>>[]> {
  log('Đang tạo Suppliers...');

  const supplierNames = [
    'Samsung Electronics Vietnam',
    'Apple Vietnam',
    'LG Electronics Vietnam',
    'Sony Vietnam',
    'Panasonic Vietnam',
    'Toshiba Vietnam',
    'Canon Vietnam',
    'HP Vietnam',
    'Dell Vietnam',
    'Lenovo Vietnam',
  ];

  const suppliers: Prisma.SupplierCreateInput[] = supplierNames.map((name, index) => ({
    code: `SUP-${String(index + 1).padStart(3, '0')}`,
    name,
    contactInfo: {
      email: faker.internet.email({ firstName: name.split(' ')[0] }),
      phone: faker.phone.number({ style: 'international' }),
      contactPerson: faker.person.fullName(),
    },
    address: faker.location.streetAddress({ useFullAddress: true }),
    createdAt: randomDateInLast3Months(),
  }));

  const createdSuppliers = await Promise.all(
    suppliers.map((supplier) => prisma.supplier.create({ data: supplier })),
  );

  logSuccess(`Đã tạo ${createdSuppliers.length} suppliers`);
  return createdSuppliers;
}

// ============================================================================
// SEED CUSTOMERS
// ============================================================================

async function seedCustomers(): Promise<Prisma.CustomerGetPayload<Record<string, never>>[]> {
  log('Đang tạo Customers...');

  const customerRanks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  const customerTypes = ['Retailer', 'Wholesaler', 'Distributor', 'Supermarket', 'E-commerce'];

  const customers: Prisma.CustomerCreateInput[] = [];

  for (let i = 1; i <= 50; i++) {
    const rank = faker.helpers.arrayElement(customerRanks);
    const type = faker.helpers.arrayElement(customerTypes);
    const companyName = faker.company.name();

    customers.push({
      code: `CUST-${String(i).padStart(4, '0')}`,
      name: companyName,
      contactInfo: {
        email: faker.internet.email({ firstName: companyName.split(' ')[0] }),
        phone: faker.phone.number({ style: 'international' }),
        contactPerson: faker.person.fullName(),
        rank,
        type,
      },
      address: faker.location.streetAddress({ useFullAddress: true }),
      createdAt: randomDateInLast3Months(),
    });
  }

  const createdCustomers = await Promise.all(
    customers.map((customer) => prisma.customer.create({ data: customer })),
  );

  logSuccess(`Đã tạo ${createdCustomers.length} customers`);
  return createdCustomers;
}

// ============================================================================
// SEED CATEGORIES & PRODUCTS
// ============================================================================

async function seedCategoriesAndProducts(): Promise<{
  categories: Prisma.ProductCategoryGetPayload<Record<string, never>>[];
  products: Prisma.ProductGetPayload<Record<string, never>>[];
}> {
  log('Đang tạo Categories và Products...');

  const categoryNames = [
    'Điện tử - Điện lạnh',
    'Điện thoại - Máy tính bảng',
    'Máy tính - Laptop',
    'Phụ kiện công nghệ',
    'Thiết bị văn phòng',
  ];

  const categories = await Promise.all(
    categoryNames.map((name) =>
      prisma.productCategory.create({
        data: { name },
      }),
    ),
  );

  logSuccess(`Đã tạo ${categories.length} categories`);

  // Tạo 50 products (10 products mỗi category)
  const productTemplates = [
    // Điện tử - Điện lạnh
    {
      category: 0,
      names: [
        'Tủ lạnh Samsung',
        'Máy giặt LG',
        'Điều hòa Panasonic',
        'Tủ đông Sharp',
        'Máy sấy Electrolux',
        'Bếp từ Bosch',
        'Lò vi sóng Sharp',
        'Máy lọc nước Kangaroo',
        'Quạt điều hòa Daikin',
        'Máy hút bụi Dyson',
      ],
    },
    // Điện thoại - Máy tính bảng
    {
      category: 1,
      names: [
        'iPhone 15 Pro Max',
        'Samsung Galaxy S24 Ultra',
        'iPad Pro 12.9"',
        'Xiaomi 14 Pro',
        'OnePlus 12',
        'Google Pixel 8 Pro',
        'Huawei Mate 60 Pro',
        'Oppo Find X6 Pro',
        'Vivo X100 Pro',
        'Realme GT 5 Pro',
      ],
    },
    // Máy tính - Laptop
    {
      category: 2,
      names: [
        'MacBook Pro M3',
        'Dell XPS 15',
        'HP Spectre x360',
        'Lenovo ThinkPad X1',
        'ASUS ROG Strix',
        'Acer Predator Helios',
        'MSI Stealth 16',
        'Razer Blade 15',
        'Microsoft Surface Laptop',
        'LG Gram 17',
      ],
    },
    // Phụ kiện công nghệ
    {
      category: 3,
      names: [
        'Tai nghe AirPods Pro',
        'Chuột Logitech MX Master',
        'Bàn phím cơ Keychron',
        'Webcam Logitech C920',
        'Ổ cứng SSD Samsung',
        'Pin sạc dự phòng Anker',
        'Cáp USB-C Belkin',
        'Adapter HDMI Apple',
        'Balo laptop Targus',
        'Giá đỡ màn hình Ergotron',
      ],
    },
    // Thiết bị văn phòng
    {
      category: 4,
      names: [
        'Máy in Canon PIXMA',
        'Máy scan Fujitsu',
        'Máy fax Brother',
        'Máy hủy giấy Fellowes',
        'Máy chiếu Epson',
        'Máy photocopy Ricoh',
        'Máy đóng gáy GBC',
        'Máy bấm lỗ Rapesco',
        'Máy đếm tiền Glory',
        'Máy đóng dấu tự động',
      ],
    },
  ];

  const products: Prisma.ProductCreateInput[] = [];
  let productIndex = 1;

  // Tạo 10 products cho mỗi category (tổng 50)
  for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
    const template = productTemplates[categoryIndex];

    for (let i = 0; i < 10 && productIndex <= 50; i++) {
      const baseName = template.names[i];
      const sku = `SKU-${String(productIndex).padStart(6, '0')}`;

      products.push({
        sku,
        name: baseName,
        category: { connect: { id: categories[categoryIndex].id } },
        unit: 'piece',
        barcode: faker.string.numeric(13),
        parameters: {
          brand: baseName.split(' ')[0],
          model: baseName,
          warranty: `${faker.number.int({ min: 1, max: 3 })} years`,
          color: faker.helpers.arrayElement(['Black', 'White', 'Silver', 'Gold', 'Space Gray']),
        },
        minStockLevel: faker.number.int({ min: 10, max: 50 }),
        reorderPoint: faker.number.int({ min: 20, max: 100 }),
        leadTimeDays: faker.number.int({ min: 3, max: 14 }),
        safetyStockLevel: faker.number.int({ min: 5, max: 30 }),
        createdAt: randomDateInLast3Months(),
      });

      productIndex++;
    }
  }

  const createdProducts = await Promise.all(
    products.map((product) => prisma.product.create({ data: product })),
  );

  logSuccess(`Đã tạo ${createdProducts.length} products`);

  return { categories, products: createdProducts };
}

// ============================================================================
// SEED INVENTORY (ProductBatch & Inventory)
// ============================================================================

async function seedInventory(
  products: Prisma.ProductGetPayload<Record<string, never>>[],
  locations: Prisma.LocationGetPayload<Record<string, never>>[],
): Promise<{
  batches: Prisma.ProductBatchGetPayload<Record<string, never>>[];
  inventoryRecords: Prisma.InventoryGetPayload<Record<string, never>>[];
}> {
  log('Đang tạo Inventory (ProductBatch & Inventory)...');

  const batches: Prisma.ProductBatchGetPayload<Record<string, never>>[] = [];
  const inventoryRecords: Prisma.InventoryGetPayload<Record<string, never>>[] = [];

  // Tạo batches cho mỗi product (1-3 batches mỗi product)
  for (const product of products) {
    const batchCount = faker.number.int({ min: 1, max: 3 });

    for (let i = 1; i <= batchCount; i++) {
      const manufactureDate = randomDateInLast3Months();
      const expiryDate = faker.date.future({ years: 2, refDate: manufactureDate });

      const batch = await prisma.productBatch.create({
        data: {
          product: { connect: { id: product.id } },
          batchNo: `BATCH-${product.sku}-${String(i).padStart(3, '0')}`,
          manufactureDate,
          expiryDate,
          barcodeOrQr: faker.string.alphanumeric(20),
          createdAt: manufactureDate,
        },
      });

      batches.push(batch);

      // Tạo inventory records cho batch này tại các locations ngẫu nhiên
      const locationCount = faker.number.int({ min: 1, max: 3 });
      const selectedLocations = faker.helpers.arrayElements(locations, locationCount);

      for (const location of selectedLocations) {
        const availableQty = faker.number.int({ min: 10, max: 500 });
        const reservedQty = faker.number.int({ min: 0, max: Math.floor(availableQty * 0.3) });

        const inventory = await prisma.inventory.create({
          data: {
            productBatch: { connect: { id: batch.id } },
            location: { connect: { id: location.id } },
            availableQty,
            reservedQty,
          },
        });

        inventoryRecords.push(inventory);
      }
    }
  }

  logSuccess(`Đã tạo ${batches.length} product batches`);
  logSuccess(`Đã tạo ${inventoryRecords.length} inventory records`);

  return { batches, inventoryRecords };
}

// ============================================================================
// SEED PURCHASE ORDERS
// ============================================================================

async function seedPurchaseOrders(
  suppliers: Prisma.SupplierGetPayload<Record<string, never>>[],
  products: Prisma.ProductGetPayload<Record<string, never>>[],
  users: Prisma.UserGetPayload<Record<string, never>>[],
): Promise<Prisma.PurchaseOrderGetPayload<Record<string, never>>[]> {
  log('Đang tạo Purchase Orders...');

  const purchaseOrders: Prisma.PurchaseOrderGetPayload<Record<string, never>>[] = [];
  const statuses: PoStatus[] = [
    PoStatus.draft,
    PoStatus.ordered,
    PoStatus.partial,
    PoStatus.received,
  ];

  for (let i = 1; i <= 20; i++) {
    const supplier = faker.helpers.arrayElement(suppliers);
    const createdBy = faker.helpers.arrayElement(users);
    const status = faker.helpers.arrayElement(statuses);
    const placedAt = status !== PoStatus.draft ? randomDateInLast3Months() : null;
    const expectedArrival = placedAt
      ? new Date(placedAt.getTime() + faker.number.int({ min: 3, max: 14 }) * 24 * 60 * 60 * 1000)
      : randomFutureDate();

    // Tạo 1-5 items cho mỗi PO
    const itemCount = faker.number.int({ min: 1, max: 5 });
    const selectedProducts = faker.helpers.arrayElements(products, itemCount);

    const items: SeedPurchaseOrderItem[] = selectedProducts.map((product) => {
      const qtyOrdered = faker.number.int({ min: 10, max: 100 });
      const unitPrice = createDecimal(
        faker.number.float({ min: 100000, max: 50000000, fractionDigits: 2 }),
      );
      const lineTotal = createDecimal(qtyOrdered * parseFloat(unitPrice.toString()));

      let qtyReceived = 0;
      if (status === PoStatus.received) {
        qtyReceived = qtyOrdered;
      } else if (status === PoStatus.partial) {
        qtyReceived = faker.number.int({ min: 1, max: qtyOrdered - 1 });
      }

      return {
        productId: product.id,
        qtyOrdered,
        qtyReceived,
        unitPrice,
        lineTotal,
        remark:
          faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) || undefined,
      };
    });

    const totalAmount = items.reduce((sum, item) => sum.plus(item.lineTotal), createDecimal(0));

    const po = await prisma.purchaseOrder.create({
      data: {
        poNo: `PO-${new Date().getFullYear()}-${String(i).padStart(4, '0')}`,
        supplier: { connect: { id: supplier.id } },
        status,
        placedAt,
        expectedArrival,
        totalAmount,
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.5 }) || undefined,
        createdBy: { connect: { id: createdBy.id } },
        createdAt: placedAt || randomDateInLast3Months(),
        items: {
          create: items.map((item) => ({
            product: { connect: { id: item.productId } },
            qtyOrdered: item.qtyOrdered,
            qtyReceived: item.qtyReceived,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            remark: item.remark,
          })),
        },
      },
    });

    purchaseOrders.push(po);
  }

  logSuccess(`Đã tạo ${purchaseOrders.length} purchase orders`);
  return purchaseOrders;
}

// ============================================================================
// SEED SALES ORDERS
// ============================================================================

async function seedSalesOrders(
  customers: Prisma.CustomerGetPayload<Record<string, never>>[],
  products: Prisma.ProductGetPayload<Record<string, never>>[],
  batches: Prisma.ProductBatchGetPayload<Record<string, never>>[],
  locations: Prisma.LocationGetPayload<Record<string, never>>[],
  users: Prisma.UserGetPayload<Record<string, never>>[],
): Promise<Prisma.SalesOrderGetPayload<Record<string, never>>[]> {
  log('Đang tạo Sales Orders...');

  const salesOrders: Prisma.SalesOrderGetPayload<Record<string, never>>[] = [];
  const statuses: OrderStatus[] = [
    OrderStatus.pending,
    OrderStatus.approved,
    OrderStatus.processing,
    OrderStatus.shipped,
    OrderStatus.closed,
  ];

  for (let i = 1; i <= 50; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const createdBy = faker.helpers.arrayElement(users);
    const status = faker.helpers.arrayElement(statuses);
    const placedAt = randomDateInLast3Months();

    // Tạo 1-4 items cho mỗi SO
    const itemCount = faker.number.int({ min: 1, max: 4 });
    const selectedProducts = faker.helpers.arrayElements(products, itemCount);

    const items: SeedSalesOrderItem[] = await Promise.all(
      selectedProducts.map(async (product) => {
        // Tìm batch có sẵn cho product này
        const availableBatches = batches.filter((b) => b.productId === product.id);
        const batch =
          availableBatches.length > 0 ? faker.helpers.arrayElement(availableBatches) : null;

        // Tìm location có inventory cho product này
        let location: Prisma.LocationGetPayload<Record<string, never>> | null = null;
        if (batch) {
          const inventory = await prisma.inventory.findFirst({
            where: { productBatchId: batch.id, availableQty: { gt: 0 } },
            include: { location: true },
          });
          location = inventory?.location || null;
        }

        const qty = faker.number.int({ min: 1, max: 20 });
        const unitPrice = createDecimal(
          faker.number.float({ min: 50000, max: 10000000, fractionDigits: 2 }),
        );
        const lineTotal = createDecimal(qty * parseFloat(unitPrice.toString()));

        let qtyFulfilled = 0;
        if (status === OrderStatus.shipped || status === OrderStatus.closed) {
          qtyFulfilled = qty;
        } else if (status === OrderStatus.processing) {
          qtyFulfilled = qty > 1 ? faker.number.int({ min: 1, max: qty - 1 }) : 1;
        }

        return {
          productId: product.id,
          productBatchId: batch?.id,
          locationId: location?.id,
          qty,
          qtyFulfilled,
          unitPrice,
          lineTotal,
        };
      }),
    );

    const totalAmount = items.reduce((sum, item) => sum.plus(item.lineTotal), createDecimal(0));

    const so = await prisma.salesOrder.create({
      data: {
        soNo: `SO-${new Date().getFullYear()}-${String(i).padStart(4, '0')}`,
        customer: { connect: { id: customer.id } },
        status,
        placedAt,
        totalAmount,
        createdBy: { connect: { id: createdBy.id } },
        createdAt: placedAt,
        items: {
          create: items.map((item) => ({
            product: { connect: { id: item.productId } },
            productBatch: item.productBatchId
              ? { connect: { id: item.productBatchId } }
              : undefined,
            location: item.locationId ? { connect: { id: item.locationId } } : undefined,
            qty: item.qty,
            qtyFulfilled: item.qtyFulfilled,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
    });

    salesOrders.push(so);
  }

  logSuccess(`Đã tạo ${salesOrders.length} sales orders`);
  return salesOrders;
}

// ============================================================================
// SEED SHIPMENTS
// ============================================================================

async function seedShipments(
  salesOrders: Prisma.SalesOrderGetPayload<Record<string, never>>[],
  warehouses: Prisma.WarehouseGetPayload<Record<string, never>>[],
): Promise<Prisma.ShipmentGetPayload<Record<string, never>>[]> {
  log('Đang tạo Shipments...');

  const shipments: Prisma.ShipmentGetPayload<Record<string, never>>[] = [];
  const statuses: ShipmentStatus[] = [
    ShipmentStatus.preparing,
    ShipmentStatus.in_transit,
    ShipmentStatus.delivered,
    ShipmentStatus.delayed,
  ];

  const carriers = [
    'Viettel Post',
    'Vietnam Post',
    'Giao Hàng Nhanh',
    'J&T Express',
    'Shopee Express',
  ];

  // Chỉ tạo shipments cho các SO đã approved trở lên
  const eligibleSOs = salesOrders.filter(
    (so) =>
      so.status === OrderStatus.approved ||
      so.status === OrderStatus.processing ||
      so.status === OrderStatus.shipped ||
      so.status === OrderStatus.closed,
  );

  // Tạo shipment cho khoảng 70% các SO đủ điều kiện
  const soCount = Math.floor(eligibleSOs.length * 0.7);
  const selectedSOs = faker.helpers.arrayElements(eligibleSOs, soCount);

  for (const salesOrder of selectedSOs) {
    const warehouse = faker.helpers.arrayElement(warehouses);
    const status = faker.helpers.arrayElement(statuses);
    const carrier = faker.helpers.arrayElement(carriers);
    const trackingCode = faker.string.alphanumeric(12).toUpperCase();

    const placedAt = salesOrder.placedAt || salesOrder.createdAt;
    const shippedAt =
      status === ShipmentStatus.in_transit ||
      status === ShipmentStatus.delivered ||
      status === ShipmentStatus.delayed
        ? new Date(placedAt.getTime() + faker.number.int({ min: 1, max: 3 }) * 24 * 60 * 60 * 1000)
        : null;

    const deliveredAt =
      status === ShipmentStatus.delivered
        ? new Date(
            (shippedAt || placedAt).getTime() +
              faker.number.int({ min: 1, max: 5 }) * 24 * 60 * 60 * 1000,
          )
        : null;

    const estimatedDelivery = shippedAt
      ? new Date(shippedAt.getTime() + faker.number.int({ min: 2, max: 7 }) * 24 * 60 * 60 * 1000)
      : randomFutureDate(7);

    // Lấy items từ sales order
    const soItems = await prisma.salesOrderItem.findMany({
      where: { salesOrderId: salesOrder.id },
      include: { product: true, productBatch: true },
    });

    const shipmentItems: Prisma.ShipmentItemCreateWithoutShipmentInput[] = soItems.map((item) => ({
      salesOrder: { connect: { id: salesOrder.id } },
      product: { connect: { id: item.productId } },
      productBatch: item.productBatchId ? { connect: { id: item.productBatchId } } : undefined,
      qty: item.qtyFulfilled || item.qty,
    }));

    // Tạo tracking events
    const trackingEvents: Prisma.ShipmentTrackingEventCreateWithoutShipmentInput[] = [];

    if (shippedAt) {
      trackingEvents.push({
        eventTime: shippedAt,
        location: warehouse.name,
        statusText: 'Đã lấy hàng từ kho',
      });

      if (status === ShipmentStatus.in_transit || status === ShipmentStatus.delivered) {
        trackingEvents.push({
          eventTime: new Date(shippedAt.getTime() + 2 * 60 * 60 * 1000), // 2 giờ sau
          location: 'Trung tâm phân loại',
          statusText: 'Đang vận chuyển',
        });
      }

      if (status === ShipmentStatus.delivered && deliveredAt) {
        trackingEvents.push({
          eventTime: deliveredAt,
          location: 'Điểm giao hàng',
          statusText: 'Đã giao hàng thành công',
        });
      }
    }

    const shipment = await prisma.shipment.create({
      data: {
        shipmentNo: `SHIP-${new Date().getFullYear()}-${String(shipments.length + 1).padStart(4, '0')}`,
        warehouse: { connect: { id: warehouse.id } },
        salesOrder: { connect: { id: salesOrder.id } },
        carrier,
        trackingCode,
        status,
        shippedAt,
        deliveredAt,
        estimatedDelivery,
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) || undefined,
        items: { create: shipmentItems },
        trackingEvents: { create: trackingEvents },
      },
    });

    shipments.push(shipment);
  }

  logSuccess(`Đã tạo ${shipments.length} shipments`);
  return shipments;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main(): Promise<void> {
  try {
    console.log('\n🌱 ============================================');
    console.log('   BẮT ĐẦU SEED DATABASE');
    console.log('   Warehouse & Supply Chain Management');
    console.log('============================================\n');

    // 1. Clean database
    await cleanDatabase();

    // 2. Seed Users
    const users = await seedUsers();

    // 3. Seed Warehouses & Locations
    const { warehouses, locations } = await seedWarehousesAndLocations();

    // 4. Seed Suppliers
    const suppliers = await seedSuppliers();

    // 5. Seed Customers
    const customers = await seedCustomers();

    // 6. Seed Categories & Products
    const { categories, products } = await seedCategoriesAndProducts();

    // 7. Seed Inventory
    const { batches, inventoryRecords } = await seedInventory(products, locations);

    // 8. Seed Purchase Orders
    const purchaseOrders = await seedPurchaseOrders(suppliers, products, users);

    // 9. Seed Sales Orders
    const salesOrders = await seedSalesOrders(customers, products, batches, locations, users);

    // 10. Seed Shipments
    const shipments = await seedShipments(salesOrders, warehouses);

    // Summary
    console.log('\n📊 ============================================');
    console.log('   TÓM TẮT DỮ LIỆU ĐÃ TẠO');
    console.log('============================================');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🏭 Warehouses: ${warehouses.length}`);
    console.log(`   📍 Locations: ${locations.length}`);
    console.log(`   🏢 Suppliers: ${suppliers.length}`);
    console.log(`   👤 Customers: ${customers.length}`);
    console.log(`   📂 Categories: ${categories.length}`);
    console.log(`   📦 Products: ${products.length}`);
    console.log(`   🏷️  Product Batches: ${batches.length}`);
    console.log(`   📊 Inventory Records: ${inventoryRecords.length}`);
    console.log(`   🛒 Purchase Orders: ${purchaseOrders.length}`);
    console.log(`   💰 Sales Orders: ${salesOrders.length}`);
    console.log(`   🚚 Shipments: ${shipments.length}`);
    console.log('============================================\n');

    console.log('🔐 TÀI KHOẢN TEST:');
    console.log('   Admin:       admin / admin123');
    console.log('   Manager:     manager / manager123');
    console.log('   Staff:       staff / staff123');
    console.log('   Sales:       sales1 / sales123');
    console.log('   Procurement: procurement / procurement123');
    console.log('   Logistics:   logistics / logistics123');
    console.log('   Analyst:     analyst / analyst123');
    console.log('\n✅ Seed hoàn tất thành công!\n');
  } catch (error) {
    logError('Seed thất bại!');
    console.error(error);
    throw error;
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

main()
  .catch((error) => {
    console.error('❌ Lỗi khi chạy seed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
