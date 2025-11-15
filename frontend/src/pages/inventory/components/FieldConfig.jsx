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
  inventory: [
    {
      id: "sku",
      label: "SKU",
      type: "text",
    },
    {
      id: "product",
      label: "Sản phẩm",
      type: "select",
      options: ["Sản phẩm A", "Sản phẩm B", "Sản phẩm C"],
    },
    {
      id: "batch",
      label: "Batch",
      type: "select",
      options: ["BATCH001", "BATCH002", "BATCH003"],
    },
    {
      id: "warehouse",
      label: "Kho",
      type: "select",
      options: ["Kho Trung Tâm", "Kho Miền Bắc", "Kho Miền Trung"],
    },
    {
      id: "location",
      label: "Location",
      type: "select",
      options: ["A-01-01", "B-02-03", "C-01-05"],
    },
    {
      id: "available",
      label: "Available Qty",
      type: "number",
    },
    {
      id: "reserved",
      label: "Reserved Qty",
      type: "number",
    },
  ],
  movements: [
    {
      id: "date",
      label: "Ngày giờ",
      type: "date",
    },
    {
      id: "type",
      label: "Loại",
      type: "select",
      options: ["Nhập kho", "Chuyển kho", "Xuất kho"],
    },
    {
      id: "product",
      label: "Sản phẩm",
      type: "select",
      options: ["Sản phẩm A", "Sản phẩm B", "Sản phẩm C"],
    },
    {
      id: "batch",
      label: "Batch",
      type: "select",
      options: ["BATCH001", "BATCH002", "BATCH003"],
    },
    {
      id: "from",
      label: "From Location",
      type: "text",
    },
    {
      id: "to",
      label: "To Location",
      type: "text",
    },
    {
      id: "qty",
      label: "Qty",
      type: "number",
    },
    {
      id: "reference",
      label: "Reference",
      type: "text",
    },
  ],
};
