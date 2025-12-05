import { formatDate } from "@/utils/formatDate";

export const menuItems = [
  {
    id: "warehouses",
    label: "Warehouses",
    columns: [
      { id: "stt", label: "No" },
      { id: "code", label: "Code" },
      { id: "name", label: "Name", align: "left" },
      { id: "address", label: "Address", align: "left" },
      {
        id: "totalArea",
        label: "Area",
        render: (_, row) => row.metadata?.totalArea ?? "-",
      },
      {
        id: "updatedAt",
        label: "Update Date",
        render: (_, row) => formatDate(row.updatedAt),
      },
    ],
  },

  {
    id: "categories",
    label: "Categories",
    allowView: false,
    columns: [
      { id: "stt", label: "No" },
      { id: "name", label: "Category" },
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
      { id: "name", label: "Name" },
      {
        id: "categoryId",
        label: "Category",
        render: (_, row) => row.category?.name ?? "-",
      },
      { id: "unit", label: "Unit" },
      { id: "barcode", label: "Barcode" },
      {
        id: "updatedAt",
        label: "Update Date",
        render: (_, row) => formatDate(row.updatedAt),
      },
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
