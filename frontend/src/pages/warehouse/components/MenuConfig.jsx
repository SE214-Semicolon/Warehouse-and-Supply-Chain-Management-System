export const menuItems = [
  {
    id: "warehouses",
    label: "Warehouses",
    columns: [
      { id: "stt", label: "STT" },
      { id: "code", label: "Mã kho" },
      { id: "name", label: "Tên kho" },
      { id: "address", label: "Địa chỉ" },
      { id: "quantity", label: "Số lượng location" },
      { id: "createdAt", label: "Ngày cập nhật" },
    ],
  },
  {
    id: "categories",
    label: "Categories",
    columns: [
      { id: "stt", label: "No" },
      { id: "name", label: "Category" },
      { id: "parentId", label: "Parent Category"}
    ],
  },
  {
    id: "locations",
    label: "Locations",
    columns: [
      { id: "stt", label: "STT" },
      { id: "code", label: "Mã location" },
      { id: "name", label: "Tên" },
      { id: "type", label: "Loại" },
      { id: "capacity", label: "Sức chứa" },
      { id: "warehouse", label: "Thuộc kho" },
      { id: "createdAt", label: "Ngày cập nhật" },
    ],
  },
  {
    id: "products",
    label: "Products",
    columns: [
      { id: "stt", label: "STT" },
      { id: "sku", label: "SKU" },
      { id: "name", label: "Tên sản phẩm" },
      { id: "category", label: "Category" },
      { id: "unit", label: "Đơn vị" },
      { id: "barcode", label: "Barcode" },
      { id: "createdAt", label: "Ngày cập nhật" },
    ],
  },
  {
    id: "batches",
    label: "Batches",
    columns: [
      { id: "stt", label: "STT" },
      { id: "batchNo", label: "Batch No" },
      { id: "product", label: "Sản phẩm" },
      { id: "quantity", label: "Số lượng" },
      { id: "mfgDate", label: "Ngày SX" },
      { id: "expDate", label: "HSD" },
      { id: "createdAt", label: "Ngày cập nhật" },
    ],
  },
];
