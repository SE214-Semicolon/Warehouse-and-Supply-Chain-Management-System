import { formatDate } from "@/utils/formatDate";

export const menuItems = [
  {
    id: "warehouses",
    label: "Warehouses",
    columns: [
      { id: "stt", label: "No", search: false },
      { id: "code", label: "Code" },
      { id: "name", label: "Name", align: "left" },
      { id: "address", label: "Address", align: "left" },
      {
        id: "totalArea",
        label: "Area",
        render: (_, row) => row.metadata?.totalArea ?? "-",
        searchValue: (row) => row.metadata?.totalArea,
      },
      {
        id: "updatedAt",
        label: "Update Date",
        render: (_, row) => formatDate(row.updatedAt),
        searchValue: (row) => formatDate(row.updatedAt),
      },
    ],
  },

  {
    id: "categories",
    label: "Categories",
    allowView: false,
    columns: [
      { id: "stt", label: "No", search: false },
      { id: "name", label: "Category" },
    ],
  },

  {
    id: "locations",
    label: "Locations",
    columns: [
      { id: "stt", label: "No", search: false },
      { id: "code", label: "Code" },
      { id: "name", label: "Name", align: "left" },
      { id: "type", label: "Type" },
      { id: "capacity", label: "Capacity" },
      {
        id: "warehouseId",
        label: "Warehouse",
        align: "left",
        render: (_, row) => row.warehouse?.name ?? "-",
        searchValue: (row) => row.warehouse?.name,
      },
      {
        id: "updatedAt",
        label: "Update Date",
        render: (_, row) => formatDate(row.updatedAt),
        searchValue: (row) => formatDate(row.updatedAt),
      },
    ],
  },

  {
    id: "products",
    label: "Products",
    columns: [
      { id: "stt", label: "No", search: false },
      { id: "sku", label: "SKU" },
      { id: "name", label: "Name" },
      {
        id: "categoryId",
        label: "Category",
        render: (_, row) => row.category?.name ?? "-",
        searchValue: (row) => row.category?.name,
      },
      { id: "unit", label: "Unit" },
      { id: "barcode", label: "Barcode" },
      {
        id: "updatedAt",
        label: "Update Date",
        render: (_, row) => formatDate(row.updatedAt),
        searchValue: (row) => formatDate(row.updatedAt),
      },
    ],
  },

  {
    id: "batches",
    label: "Batches",
    columns: [
      { id: "stt", label: "No", search: false },
      { id: "batchNo", label: "Batch No" },
      {
        id: "productId",
        label: "Product",
        align: "left",
        render: (_, row) => row.product?.name ?? "-",
        searchValue: (row) => row.product?.name,
      },
      { id: "quantity", label: "Quantity" },
      {
        id: "manufactureDate",
        label: "Mfg Date",
        render: (_, row) => formatDate(row.manufactureDate),
        searchValue: (row) => formatDate(row.manufactureDate),
      },
      {
        id: "expiryDate",
        label: "Exp Date",
        render: (_, row) => formatDate(row.expiryDate) ?? "-",
        searchValue: (row) => formatDate(row.expiryDate),
      },
      {
        id: "updatedAt",
        label: "Update Date",
        render: (_, row) => formatDate(row.updatedAt),
        searchValue: (row) => formatDate(row.updatedAt),
      },
    ],
  },
];
