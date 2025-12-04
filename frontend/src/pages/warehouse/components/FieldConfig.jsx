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
    },
    {
      id: "parentId",
      label: "Parent Category",
      type: "text",
      component: FormInput,
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
    },
    {
      id: "name",
      label: "Tên sản phẩm",
      type: "text",
    },
    {
      id: "category",
      label: "Category",
      type: "select",
      options: ["Điện tử", "Thực phẩm", "Dệt may"],
    },
    {
      id: "unit",
      label: "Đơn vị",
      type: "text",
    },
    {
      id: "barcode",
      label: "Barcode",
      type: "text",
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
