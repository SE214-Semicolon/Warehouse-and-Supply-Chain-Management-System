import ProductCategoryService from "@/services/category.service";
import ProductService from "@/services/product.service";
import WarehouseService from "@/services/warehouse.service";
import LocationService from "@/services/location.service";
import ProductBatchService from "@/services/batch.service";

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
    return res.data?.data ?? res.data?.data?.warehouses ?? [];
  } catch (error) {
    console.error("Lỗi khi fetch warehouses:", error);
    return [];
  }
};

export const fetchLocationsData = async () => {
  try {
    const res = await LocationService.getAll();
    return res.data?.data ?? res.data?.data?.locations ?? [];
  } catch (error) {
    console.error("Lỗi khi fetch locations:", error);
    return [];
  }
};

export const fetchBatchesData = async () => {
  try {
    const res = await ProductBatchService.getAll();
    return res.data?.data ?? [];
  } catch (error) {
    console.error("Lỗi khi fetch batches:", error);
    return [];
  }
};
