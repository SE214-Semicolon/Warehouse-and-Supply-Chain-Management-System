import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSuppliers() {
  console.log('🏭 Seeding suppliers...');

  const suppliers = await Promise.all([
    // Electronics Suppliers
    prisma.supplier.upsert({
      where: { code: 'SUPP-ELEC-001' },
      update: {},
      create: {
        code: 'SUPP-ELEC-001',
        name: 'Dell Technologies Vietnam',
        email: 'vietnam.sales@dell.com',
        phone: '+84-28-3910-1234',
        address: 'Dell Building, 194 Golden Building, Pham Van Bach, Cau Giay, Hanoi',
        contactInfo: {
          contactPerson: 'John Smith',
          taxCode: '0300000001',
          bankAccount: 'HSBC-VN-001',
          website: 'www.dell.com.vn',
          rating: 'AAA',
          paymentTerms: 'Net 30',
          leadTime: 15,
          category: 'Electronics',
        },
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUPP-ELEC-002' },
      update: {},
      create: {
        code: 'SUPP-ELEC-002',
        name: 'HP Vietnam Company Limited',
        email: 'orders@hp.com.vn',
        phone: '+84-28-3910-2345',
        address: 'HP Office, Flemington Tower, 182 Le Dai Hanh, District 11, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Sarah Johnson',
          taxCode: '0300000002',
          bankAccount: 'HSBC-VN-002',
          website: 'www.hp.com.vn',
          rating: 'AAA',
          paymentTerms: 'Net 30',
          leadTime: 20,
          category: 'Electronics',
        },
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUPP-ELEC-003' },
      update: {},
      create: {
        code: 'SUPP-ELEC-003',
        name: 'Apple Authorized Distributor Vietnam',
        email: 'supply@appleauthorized.vn',
        phone: '+84-28-3910-3456',
        address: '123 Mac Thi Buoi, District 1, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Nguyen Van Phong',
          taxCode: '0300000003',
          bankAccount: 'VCB-300000003',
          rating: 'AAA',
          paymentTerms: 'Net 45',
          leadTime: 30,
          category: 'Electronics',
          minimumOrder: 10,
        },
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUPP-ELEC-004' },
      update: {},
      create: {
        code: 'SUPP-ELEC-004',
        name: 'Samsung Electronics Vietnam',
        email: 'b2b@samsung.com.vn',
        phone: '+84-28-3910-4567',
        address: 'Samsung Building, Thu Thiem New Urban Area, District 2, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Kim Min-ho',
          taxCode: '0300000004',
          bankAccount: 'Shinhan-VN-001',
          website: 'www.samsung.com.vn',
          rating: 'AAA',
          paymentTerms: 'Net 30',
          leadTime: 15,
          category: 'Electronics',
        },
      },
    }),

    // Food & Beverage Suppliers
    prisma.supplier.upsert({
      where: { code: 'SUPP-FOOD-001' },
      update: {},
      create: {
        code: 'SUPP-FOOD-001',
        name: 'Coca-Cola Vietnam',
        email: 'sales@coca-cola.com.vn',
        phone: '+84-28-3911-1234',
        address: 'Coca-Cola Plant, Tan Thuan Export Processing Zone, District 7, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Tran Van Hai',
          taxCode: '0300000005',
          bankAccount: 'HSBC-VN-003',
          website: 'www.coca-cola.com.vn',
          rating: 'AAA',
          paymentTerms: 'Net 30',
          leadTime: 7,
          category: 'Beverages',
          certification: 'ISO 22000, HACCP',
        },
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUPP-FOOD-002' },
      update: {},
      create: {
        code: 'SUPP-FOOD-002',
        name: 'PepsiCo Vietnam',
        email: 'orders@pepsico.com.vn',
        phone: '+84-28-3911-2345',
        address: 'PepsiCo Office, Le Thanh Ton Street, District 1, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Le Thi Huong',
          taxCode: '0300000006',
          bankAccount: 'Citi-VN-001',
          website: 'www.pepsico.com.vn',
          rating: 'AAA',
          paymentTerms: 'Net 30',
          leadTime: 7,
          category: 'Beverages',
          certification: 'ISO 22000',
        },
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUPP-FOOD-003' },
      update: {},
      create: {
        code: 'SUPP-FOOD-003',
        name: 'Nestle Vietnam',
        email: 'supply.chain@nestle.com.vn',
        phone: '+84-28-3911-3456',
        address: 'Nestle Factory, Bien Hoa Industrial Park, Dong Nai Province',
        contactInfo: {
          contactPerson: 'Pham Minh Duc',
          taxCode: '0300000007',
          bankAccount: 'HSBC-VN-004',
          website: 'www.nestle.com.vn',
          rating: 'AAA',
          paymentTerms: 'Net 45',
          leadTime: 10,
          category: 'Food & Beverage',
          certification: 'ISO 22000, HACCP, BRC',
        },
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUPP-FOOD-004' },
      update: {},
      create: {
        code: 'SUPP-FOOD-004',
        name: 'Tan Hiep Phat Group',
        email: 'business@thp.com.vn',
        phone: '+84-28-3911-4567',
        address: 'THP Tower, 199 Huynh Van Banh, Phu Nhuan District, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Nguyen Thi Phuong',
          taxCode: '0300000008',
          bankAccount: 'VCB-300000008',
          website: 'www.thp.com.vn',
          rating: 'AA+',
          paymentTerms: 'Net 30',
          leadTime: 5,
          category: 'Beverages',
          certification: 'ISO 22000',
        },
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUPP-FOOD-005' },
      update: {},
      create: {
        code: 'SUPP-FOOD-005',
        name: 'Mondelez Kinh Do Vietnam',
        email: 'sales@mondelez.com.vn',
        phone: '+84-28-3911-5678',
        address: 'Mondelez Factory, Long An Province',
        contactInfo: {
          contactPerson: 'Hoang Van Long',
          taxCode: '0300000009',
          bankAccount: 'HSBC-VN-005',
          website: 'www.mondelezinternational.com',
          rating: 'AAA',
          paymentTerms: 'Net 30',
          leadTime: 10,
          category: 'Snacks',
          certification: 'ISO 22000, HACCP',
        },
      },
    }),

    // Clothing/Textile Suppliers
    prisma.supplier.upsert({
      where: { code: 'SUPP-TEXT-001' },
      update: {},
      create: {
        code: 'SUPP-TEXT-001',
        name: 'Viet Tien Garment Corporation',
        email: 'export@viettien.com.vn',
        phone: '+84-28-3912-1234',
        address: 'Viet Tien Building, 346 Ben Van Don, District 4, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Tran Van Thanh',
          taxCode: '0300000010',
          bankAccount: 'VCB-300000010',
          website: 'www.viettien.com.vn',
          rating: 'AA',
          paymentTerms: 'Net 30',
          leadTime: 20,
          category: 'Textiles',
          minimumOrder: 100,
        },
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUPP-TEXT-002' },
      update: {},
      create: {
        code: 'SUPP-TEXT-002',
        name: 'Phong Phu International',
        email: 'business@phongphu.com.vn',
        phone: '+84-28-3912-2345',
        address: 'Phong Phu Corporation, 704 Nguyen Kiem, Go Vap District, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Le Thi Mai',
          taxCode: '0300000011',
          bankAccount: 'BIDV-300000011',
          website: 'www.phongphu.com.vn',
          rating: 'AA',
          paymentTerms: 'Net 45',
          leadTime: 25,
          category: 'Textiles',
        },
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUPP-TEXT-003' },
      update: {},
      create: {
        code: 'SUPP-TEXT-003',
        name: 'Thanh Cong Textile Garment Investment',
        email: 'sales@tcig.com.vn',
        phone: '+84-28-3912-3456',
        address: 'TCIG Building, 28 Vo Van Kiet, District 1, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Nguyen Van Cuong',
          taxCode: '0300000012',
          bankAccount: 'VCB-300000012',
          website: 'www.tcig.com.vn',
          rating: 'AA+',
          paymentTerms: 'Net 30',
          leadTime: 20,
          category: 'Textiles',
        },
      },
    }),

    // Home & Garden Suppliers
    prisma.supplier.upsert({
      where: { code: 'SUPP-HOME-001' },
      update: {},
      create: {
        code: 'SUPP-HOME-001',
        name: 'Asian Home Furniture Co.',
        email: 'export@asianhome.com',
        phone: '+84-28-3913-1234',
        address: '123 Binh Duong Province Industrial Zone',
        contactInfo: {
          contactPerson: 'Pham Van Hung',
          taxCode: '0300000013',
          bankAccount: 'VCB-300000013',
          rating: 'A',
          paymentTerms: 'Net 45',
          leadTime: 30,
          category: 'Furniture',
        },
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUPP-HOME-002' },
      update: {},
      create: {
        code: 'SUPP-HOME-002',
        name: 'Vietnam Garden Tools JSC',
        email: 'sales@vngardentools.vn',
        phone: '+84-28-3913-2345',
        address: '456 Long An Industrial Park',
        contactInfo: {
          contactPerson: 'Hoang Thi Lan',
          taxCode: '0300000014',
          bankAccount: 'BIDV-300000014',
          rating: 'B+',
          paymentTerms: 'Net 30',
          leadTime: 15,
          category: 'Garden',
        },
      },
    }),

    // General/Multi-category Suppliers
    prisma.supplier.upsert({
      where: { code: 'SUPP-GEN-001' },
      update: {},
      create: {
        code: 'SUPP-GEN-001',
        name: 'Vietnam General Import Export Corporation',
        email: 'info@vngenimex.com',
        phone: '+84-28-3914-1234',
        address: '789 Tran Hung Dao, District 1, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Nguyen Van Tuan',
          taxCode: '0300000015',
          bankAccount: 'VCB-300000015',
          website: 'www.vngenimex.com',
          rating: 'A',
          paymentTerms: 'Net 45',
          leadTime: 25,
          category: 'General Merchandise',
        },
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUPP-GEN-002' },
      update: {},
      create: {
        code: 'SUPP-GEN-002',
        name: 'Southern Trading Company',
        email: 'orders@southtrade.vn',
        phone: '+84-28-3914-2345',
        address: '234 Le Lai, District 1, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Tran Minh Hoang',
          taxCode: '0300000016',
          bankAccount: 'BIDV-300000016',
          rating: 'B',
          paymentTerms: 'Net 30',
          leadTime: 20,
          category: 'General',
        },
      },
    }),
  ]);

  console.log(`✅ Created ${suppliers.length} suppliers`);
  console.log('✅ Supplier seeding completed!');

  return suppliers;
}

// Run if this file is executed directly
if (require.main === module) {
  seedSuppliers()
    .catch((e) => {
      console.error('❌ Error seeding suppliers:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
