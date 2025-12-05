import ProductCategories from "@/services/category.service";
import Products from "@/services/product.service";
import Warehouses from "@/services/warehouse.service";

export const locationsData = [
  {
    id: 1,
    code: "A-01-01",
    name: "Kệ A - Tầng 1 - Ô 1",
    type: "Kệ",
    capacity: 1000,
    warehouse: "Kho Trung Tâm",
    createdAt: "2024-01-16",
  },
  {
    id: 2,
    code: "B-02-03",
    name: "Kệ B - Tầng 2 - Ô 3",
    type: "Kệ",
    capacity: 800,
    warehouse: "Kho Trung Tâm",
    createdAt: "2024-01-17",
  },
  {
    id: 3,
    code: "C-01-05",
    name: "Kệ C - Tầng 1 - Ô 5",
    type: "Pallet",
    capacity: 1500,
    warehouse: "Kho Miền Bắc",
    createdAt: "2024-02-21",
  },
];

export const batchesData = [
  {
    id: 1,
    batchNo: "BATCH001",
    product: "Sản phẩm A",
    quantity: 100,
    mfgDate: "2024-01-05",
    expDate: "2025-01-05",
    createdAt: "2024-01-10",
  },
  {
    id: 2,
    batchNo: "BATCH002",
    product: "Sản phẩm B",
    quantity: 200,
    mfgDate: "2024-02-01",
    expDate: "2024-08-01",
    createdAt: "2024-02-05",
  },
  {
    id: 3,
    batchNo: "BATCH003",
    product: "Sản phẩm C",
    quantity: 150,
    mfgDate: "2024-03-01",
    expDate: "2026-03-01",
    createdAt: "2024-03-05",
  },
];

// Call api

export const fetchCategoriesData = async () => {
  try {
    const res = await ProductCategories.getAll();
    return res.data?.data ?? [];
  } catch (error) {
    console.error("Lỗi khi fetch categories:", error);
    return [];
  }
};

export const fetchProductsData = async () => {
  try {
    const res = await Products.getAll();
    return res.data?.data ?? [];
  } catch (error) {
    console.error("Lỗi khi fetch products:", error);
    return [];
  }
};

export const fetchWarehousesData = async () => {
  try {
    const res = await Warehouses.getAll();
    return res.data?.warehouses ?? res.data?.data?.warehouses ?? [];
  } catch (error) {
    console.error("Lỗi khi fetch warehouses:", error);
    return [];
  }
};
