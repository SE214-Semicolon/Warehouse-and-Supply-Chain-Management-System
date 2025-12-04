export const inventoryData = [
  {
    id: 1,
    sku: "PROD001",
    product: "Sản phẩm A",
    batch: "BATCH001",
    warehouse: "Kho Trung Tâm",
    location: "A-01-01",
    available: 80,
    reserved: 20,
    createdAt: "2024-01-16",
  },
  {
    id: 2,
    sku: "PROD002",
    product: "Sản phẩm B",
    batch: "BATCH002",
    warehouse: "Kho Miền Bắc",
    location: "C-01-05",
    available: 180,
    reserved: 20,
    createdAt: "2024-02-21",
  },
  {
    id: 3,
    sku: "PROD003",
    product: "Sản phẩm C",
    batch: "BATCH003",
    warehouse: "Kho Trung Tâm",
    location: "B-02-03",
    available: 140,
    reserved: 10,
    createdAt: "2024-03-10",
  },
];

export const movementsData = [
  {
    id: 1,
    date: "2024-03-20",
    type: "Nhập kho",
    product: "Sản phẩm A",
    batch: "BATCH001",
    from: "Nhà cung cấp",
    to: "A-01-01",
    qty: 50,
    reference: "PO-001",
  },
  {
    id: 2,
    date: "2024-03-21",
    type: "Chuyển kho",
    product: "Sản phẩm B",
    batch: "BATCH002",
    from: "A-01-01",
    to: "C-01-05",
    qty: 30,
    reference: "TRANS-001",
  },
  {
    id: 3,
    date: "2024-03-22",
    type: "Xuất kho",
    product: "Sản phẩm C",
    batch: "BATCH003",
    from: "B-02-03",
    to: "Khách hàng",
    qty: 20,
    reference: "SO-001",
  },
];

// Data provider

export const dataProvider = async (menu) => {
  switch (menu) {
    case "inventory":
      return inventoryData;

    case "movements":
      return movementsData;

    default:
      console.warn("Chưa có dữ liệu cho menu:", menu);
      return [];
  }
};
