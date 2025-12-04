export const fieldConfigs = {
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
