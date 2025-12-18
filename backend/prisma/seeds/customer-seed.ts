import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCustomers() {
  console.log('👥 Seeding customers...');

  const customers = await Promise.all([
    // Retail Customers
    prisma.customer.upsert({
      where: { code: 'CUST-RET-001' },
      update: {},
      create: {
        code: 'CUST-RET-001',
        name: 'Electronics Store Saigon [Retail]',
        address: '45 Le Loi Street, District 1, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Nguyen Van Minh',
          email: 'info@electronicssg.com',
          phone: '+84-28-3823-1234',
          taxCode: '0123456789',
          customerType: 'retail',
        },
      },
    }),
    prisma.customer.upsert({
      where: { code: 'CUST-RET-002' },
      update: {},
      create: {
        code: 'CUST-RET-002',
        name: 'Mobile World Store [Retail]',
        address: '123 Nguyen Hue Street, District 1, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Tran Thi Lan',
          email: 'sales@mobileworld.vn',
          phone: '+84-28-3823-2345',
          taxCode: '0123456790',
          customerType: 'retail',
        },
      },
    }),
    prisma.customer.upsert({
      where: { code: 'CUST-WHO-001' },
      update: {},
      create: {
        code: 'CUST-WHO-001',
        name: 'Vietnam Electronics Distribution [Wholesale]',
        address: '12 Nguyen Van Cu Street, District 5, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Nguyen Van Truong',
          email: 'orders@vndistribution.com',
          phone: '+84-28-3824-1234',
          taxCode: '0123456794',
          customerType: 'wholesale',
        },
      },
    }),
    prisma.customer.upsert({
      where: { code: 'CUST-CORP-001' },
      update: {},
      create: {
        code: 'CUST-CORP-001',
        name: 'VinGroup Corporation [Corporate]',
        address: '45A Ly Tu Trong Street, District 1, Ho Chi Minh City',
        contactInfo: {
          contactPerson: 'Nguyen Thanh Long',
          email: 'procurement@vingroup.net',
          phone: '+84-28-3825-1234',
          taxCode: '0100000001',
          customerType: 'corporate',
        },
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customers`);
  return customers;
}

if (require.main === module) {
  seedCustomers()
    .catch((e) => {
      console.error('❌ Error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
