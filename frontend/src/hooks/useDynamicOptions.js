import { useState, useEffect } from "react";
import ProductCategoryService from "@/services/category.service";
import WarehouseService from "@/services/warehouse.service";
import ProductService from "@/services/product.service";

const CONFIG = {
  products: {
    service: ProductCategoryService,
    getData: (res) => res?.data?.data ?? [],
    fieldId: "categoryId",
    nestedKey: "category",
  },
  locations: {
    service: WarehouseService,
    getData: (res) => res?.data?.warehouses ?? [],
    fieldId: "warehouseId",
    nestedKey: "warehouse",
  },
  batches: {
    service: ProductService,
    getData: (res) => res?.data?.data ?? [],
    fieldId: "productId",
    nestedKey: "product",
  },
};

export const useDynamicOptions = (selectedMenu, isOpen, selectedRow) => {
  const [options, setOptions] = useState([]);
  const [initialValue, setInitialValue] = useState(null);

  useEffect(() => {
    if (!isOpen || !selectedMenu) {
      setOptions([]);
      setInitialValue(null);
      return;
    }

    const config = CONFIG[selectedMenu];
    if (!config) return;

    const load = async () => {
      try {
        const res = await config.service.getAll();
        const data = config.getData(res);

        const formatted = data.map((item) => ({
          label: item.name,
          value: item.id,
        }));
        setOptions(formatted);

        if (selectedRow) {
          const nestedId = selectedRow[config.nestedKey]?.id;
          if (nestedId) {
            setInitialValue({ [config.fieldId]: nestedId });
          }
        }
      } catch (err) {
        console.error(`Load ${selectedMenu} options failed:`, err);
      }
    };

    load();
  }, [selectedMenu, isOpen, selectedRow]);

  return { options, initialValue };
};
