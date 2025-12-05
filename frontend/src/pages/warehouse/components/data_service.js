import ProductCategoryService from "@/services/category.service";
import ProductService from "@/services/product.service";
import WarehouseService from "@/services/warehouse.service";
import LocationService from "@/services/location.service";

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
    const res = await ProductCategoryService.getAll();
    return res.data?.data ?? [];
  } catch (error) {
    console.error("Lỗi khi fetch categories:", error);
    return [];
  }
};

export const fetchProductsData = async () => {
  try {
    const res = await ProductService.getAll();
    return res.data?.data ?? [];
  } catch (error) {
    console.error("Lỗi khi fetch products:", error);
    return [];
  }
};

export const fetchWarehousesData = async () => {
  try {
    const res = await WarehouseService.getAll();
    return res.data?.warehouses ?? res.data?.data?.warehouses ?? [];
  } catch (error) {
    console.error("Lỗi khi fetch warehouses:", error);
    return [];
  }
};

export const fetchLocationsData = async () => {
  try {
    const res = await LocationService.getAll();
    return res.data?.locations ?? res.data?.data?.locations ?? [];
  } catch (error) {
    console.error("Lỗi khi fetch locations:", error);
    return [];
  }
};
