import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const saltRounds = 10;

async function seedUsers() {
  console.log('🌱 Seeding users...');

  const hashedPassword = await bcrypt.hash('admin123', saltRounds);
  const testPassword = await bcrypt.hash('password123', saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'Admin User',
      passwordHash: hashedPassword,
      email: 'admin@example.com',
      role: UserRole.admin,
      active: true,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      fullName: 'Manager User',
      passwordHash: await bcrypt.hash('manager123', saltRounds),
      email: 'manager@example.com',
      role: UserRole.manager,
      active: true,
    },
  });

  const warehouseStaffUser = await prisma.user.upsert({
    where: { username: 'warehouse' },
    update: {},
    create: {
      username: 'warehouse',
      fullName: 'Warehouse Staff',
      passwordHash: await bcrypt.hash('warehouse123', saltRounds),
      email: 'warehouse@example.com',
      role: UserRole.warehouse_staff,
      active: true,
    },
  });

  const procurementUser = await prisma.user.upsert({
    where: { username: 'procurement' },
    update: {},
    create: {
      username: 'procurement',
      fullName: 'Procurement User',
      passwordHash: await bcrypt.hash('procurement123', saltRounds),
      email: 'procurement@example.com',
      role: UserRole.procurement,
      active: true,
    },
  });

  const testProductUser = await prisma.user.upsert({
    where: { username: 'test-product-user' },
    update: {},
    create: {
      username: 'test-product-user',
      fullName: 'Test Product User',
      passwordHash: testPassword,
      email: 'test.product@example.com',
      role: UserRole.admin,
      active: true,
    },
  });

  console.log(`✅ Created ${5} users`);

  return {
    adminUser,
    managerUser,
    warehouseStaffUser,
    procurementUser,
    testProductUser,
  };
}

async function main() {
  await seedUsers()
    .catch((e) => {
      console.error('❌ Error seeding users:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

if (require.main === module) {
  main();
}
