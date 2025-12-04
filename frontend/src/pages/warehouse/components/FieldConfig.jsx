import FormInput from "@/components/FormInput";

export const fieldConfigs = {
  warehouses: [
    {
      id: "code",
      label: "Mã kho",
      type: "text",
      component: FormInput,
    },
    {
      id: "name",
      label: "Tên kho",
      type: "text",
      component: FormInput,
    },
    {
      id: "address",
      label: "Địa chỉ",
      type: "text",
      component: FormInput,
    },
    {
      id: "quantity",
      label: "Số lượng location",
      type: "number",
      component: FormInput,
    },
  ],

  categories: [
    {
      id: "name",
      label: "Name",
      type: "text",
      component: FormInput,
      required: true,
    },
  ],

  locations: [
    {
      id: "code",
      label: "Mã location",
      type: "text",
    },
    {
      id: "name",
      label: "Tên",
      type: "text",
    },
    {
      id: "type",
      label: "Loại",
      type: "text",
    },
    {
      id: "capacity",
      label: "Sức chứa",
      type: "number",
    },
    {
      id: "warehouse",
      label: "Warehouse",
      type: "select",
      options: ["Kho Trung Tâm", "Kho Miền Bắc", "Kho Miền Trung"],
      component: FormInput,
    },
  ],

  products: [
    {
      id: "sku",
      label: "SKU",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "name",
      label: "Name",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "category",
      label: "Category",
      type: "select",
      options: [],
      component: FormInput,
      required: true,
    },
    {
      id: "unit",
      label: "Unit",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "barcode",
      label: "Barcode",
      type: "text",
      component: FormInput,
      required: true,
    },
  ],

  batches: [
    {
      id: "batchNo",
      label: "Batch No",
      type: "text",
    },
    {
      id: "product",
      label: "Sản phẩm",
      type: "select",
      options: ["Sản phẩm A", "Sản phẩm B", "Sản phẩm C"],
    },
    {
      id: "quantity",
      label: "Số lượng",
      type: "number",
    },
    {
      id: "mfgDate",
      label: "Ngày SX",
      type: "date",
      component: FormInput,
    },
    {
      id: "expDate",
      label: "HSD",
      type: "date",
    },
  ],
};
