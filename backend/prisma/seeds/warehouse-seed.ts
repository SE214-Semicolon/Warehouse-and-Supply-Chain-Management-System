import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedWarehouses() {
  console.log('🏭 Seeding warehouses and locations...');

  // Create warehouses
  const warehouses = await Promise.all([
    prisma.warehouse.upsert({
      where: { code: 'WH-MAIN-HCM' },
      update: {},
      create: {
        code: 'WH-MAIN-HCM',
        name: 'Main Warehouse - Ho Chi Minh City',
        address: '123 Nguyen Trai Street, District 1, Ho Chi Minh City',
        metadata: {
          type: 'General Storage',
          totalArea: '5000 sqm',
          manager: 'Nguyen Van A',
          phone: '+84-123-456-789',
          email: 'whmanager1@example.com',
          operatingHours: '24/7',
        },
      },
    }),
    prisma.warehouse.upsert({
      where: { code: 'WH-COLD-HCM' },
      update: {},
      create: {
        code: 'WH-COLD-HCM',
        name: 'Cold Storage Warehouse - Ho Chi Minh City',
        address: '456 Le Van Luong Street, District 7, Ho Chi Minh City',
        metadata: {
          type: 'Cold Storage',
          totalArea: '3000 sqm',
          temperatureRange: '-25°C to +5°C',
          manager: 'Tran Thi B',
          phone: '+84-987-654-321',
          email: 'coldmanager@example.com',
          certification: 'ISO 22000',
        },
      },
    }),
    prisma.warehouse.upsert({
      where: { code: 'WH-NORTH-HN' },
      update: {},
      create: {
        code: 'WH-NORTH-HN',
        name: 'Northern Regional Warehouse - Hanoi',
        address: '789 Giai Phong Street, Hai Ba Trung District, Hanoi',
        metadata: {
          type: 'Regional Hub',
          totalArea: '4000 sqm',
          manager: 'Le Van C',
          phone: '+84-345-678-901',
          email: 'northwh@example.com',
        },
      },
    }),
    prisma.warehouse.upsert({
      where: { code: 'WH-CENTRAL-DN' },
      update: {},
      create: {
        code: 'WH-CENTRAL-DN',
        name: 'Central Warehouse - Da Nang',
        address: '321 Dien Bien Phu Street, Hai Chau District, Da Nang',
        metadata: {
          type: 'Distribution Center',
          totalArea: '2500 sqm',
          manager: 'Pham Thi D',
          phone: '+84-234-567-890',
          email: 'centralwh@example.com',
        },
      },
    }),
  ]);

  console.log(`✅ Created ${warehouses.length} warehouses`);

  // Create locations for Main Warehouse (WH-MAIN-HCM)
  const mainWarehouseLocations: any[] = [];
  const aisles = ['A', 'B', 'C', 'D'];
  const racks = [1, 2, 3, 4, 5];
  const levels = [1, 2, 3];

  for (const aisle of aisles) {
    for (const rack of racks) {
      for (const level of levels) {
        const code = `${aisle}-${String(rack).padStart(2, '0')}-${String(level).padStart(2, '0')}`;
        const location = await prisma.location.upsert({
          where: {
            warehouseId_code: {
              warehouseId: warehouses[0].id,
              code: code,
            },
          },
          update: {},
          create: {
            warehouseId: warehouses[0].id,
            code: code,
            name: `Aisle ${aisle}, Rack ${String(rack).padStart(2, '0')}, Level ${String(level).padStart(2, '0')}`,
            capacity: 50,
            type: 'shelf',
            properties: {
              aisle: aisle,
              rack: rack,
              level: level,
              hazardous: false,
            },
          },
        });
        mainWarehouseLocations.push(location);
      }
    }
  }

  console.log(`✅ Created ${mainWarehouseLocations.length} locations for Main Warehouse`);

  // Create locations for Cold Storage Warehouse (WH-COLD-HCM)
  const coldWarehouseLocations: any[] = [];
  const coldZones = ['FROZEN', 'CHILLED', 'COOL'];

  for (const zone of coldZones) {
    for (let chamber = 1; chamber <= 5; chamber++) {
      for (let rack = 1; rack <= 4; rack++) {
        const code = `${zone}-C${chamber}-R${String(rack).padStart(2, '0')}`;
        const tempRanges = {
          FROZEN: '-25°C to -18°C',
          CHILLED: '0°C to +5°C',
          COOL: '+5°C to +15°C',
        };
        const location = await prisma.location.upsert({
          where: {
            warehouseId_code: {
              warehouseId: warehouses[1].id,
              code: code,
            },
          },
          update: {},
          create: {
            warehouseId: warehouses[1].id,
            code: code,
            name: `${zone} Zone, Chamber ${chamber}, Rack ${String(rack).padStart(2, '0')}`,
            capacity: 30,
            type: 'cold_rack',
            properties: {
              zone: zone,
              chamber: chamber,
              rack: rack,
              temperature: tempRanges[zone],
              hazardous: false,
            },
          },
        });
        coldWarehouseLocations.push(location);
      }
    }
  }

  console.log(`✅ Created ${coldWarehouseLocations.length} locations for Cold Storage`);

  // Create locations for Northern Warehouse (WH-NORTH-HN)
  const northWarehouseLocations: any[] = [];
  for (const aisle of ['E', 'F', 'G']) {
    for (const rack of [1, 2, 3, 4]) {
      for (const level of [1, 2]) {
        const code = `${aisle}-${String(rack).padStart(2, '0')}-${String(level).padStart(2, '0')}`;
        const location = await prisma.location.upsert({
          where: {
            warehouseId_code: {
              warehouseId: warehouses[2].id,
              code: code,
            },
          },
          update: {},
          create: {
            warehouseId: warehouses[2].id,
            code: code,
            name: `Aisle ${aisle}, Rack ${String(rack).padStart(2, '0')}, Level ${String(level).padStart(2, '0')}`,
            capacity: 40,
            type: 'shelf',
            properties: {
              aisle: aisle,
              rack: rack,
              level: level,
            },
          },
        });
        northWarehouseLocations.push(location);
      }
    }
  }

  console.log(`✅ Created ${northWarehouseLocations.length} locations for Northern Warehouse`);

  // Create locations for Central Warehouse (WH-CENTRAL-DN)
  const centralWarehouseLocations: any[] = [];
  for (const aisle of ['H', 'I']) {
    for (const rack of [1, 2, 3]) {
      for (const level of [1, 2]) {
        const code = `${aisle}-${String(rack).padStart(2, '0')}-${String(level).padStart(2, '0')}`;
        const location = await prisma.location.upsert({
          where: {
            warehouseId_code: {
              warehouseId: warehouses[3].id,
              code: code,
            },
          },
          update: {},
          create: {
            warehouseId: warehouses[3].id,
            code: code,
            name: `Aisle ${aisle}, Rack ${String(rack).padStart(2, '0')}, Level ${String(level).padStart(2, '0')}`,
            capacity: 35,
            type: 'shelf',
            properties: {
              aisle: aisle,
              rack: rack,
              level: level,
            },
          },
        });
        centralWarehouseLocations.push(location);
      }
    }
  }

  console.log(`✅ Created ${centralWarehouseLocations.length} locations for Central Warehouse`);

  // Create special zones
  const specialLocations = await Promise.all([
    prisma.location.upsert({
      where: {
        warehouseId_code: {
          warehouseId: warehouses[0].id,
          code: 'RECEIVING-01',
        },
      },
      update: {},
      create: {
        warehouseId: warehouses[0].id,
        code: 'RECEIVING-01',
        name: 'Receiving Bay 1',
        capacity: 100,
        type: 'receiving',
        properties: {
          zone: 'receiving',
          bayNumber: 1,
        },
      },
    }),
    prisma.location.upsert({
      where: {
        warehouseId_code: {
          warehouseId: warehouses[0].id,
          code: 'SHIPPING-01',
        },
      },
      update: {},
      create: {
        warehouseId: warehouses[0].id,
        code: 'SHIPPING-01',
        name: 'Shipping Bay 1',
        capacity: 100,
        type: 'shipping',
        properties: {
          zone: 'shipping',
          bayNumber: 1,
        },
      },
    }),
    prisma.location.upsert({
      where: {
        warehouseId_code: {
          warehouseId: warehouses[0].id,
          code: 'QC-ZONE-01',
        },
      },
      update: {},
      create: {
        warehouseId: warehouses[0].id,
        code: 'QC-ZONE-01',
        name: 'Quality Control Zone',
        capacity: 50,
        type: 'qc',
        properties: {
          zone: 'quality_control',
        },
      },
    }),
  ]);

  console.log(`✅ Created ${specialLocations.length} special zones`);

  const totalLocations =
    mainWarehouseLocations.length +
    coldWarehouseLocations.length +
    northWarehouseLocations.length +
    centralWarehouseLocations.length +
    specialLocations.length;

  console.log(`✅ Total locations created: ${totalLocations}`);
  console.log('✅ Warehouse and location seeding completed!');

  return {
    warehouses,
    totalLocations,
  };
}

// Run if this file is executed directly
if (require.main === module) {
  seedWarehouses()
    .catch((e) => {
      console.error('❌ Error seeding warehouses:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
