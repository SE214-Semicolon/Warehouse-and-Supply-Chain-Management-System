import { Typography } from "@mui/material";
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
      },
      {
        id: "updatedAt",
        label: "Update Date",
        filterable: false,
        render: (_, row) => (
          <Typography variant="body2">{formatDate(row.updatedAt)}</Typography>
        ),
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
        filterable: false,
        render: (_, row) => (
          <Typography variant="body2">{formatDate(row.updatedAt)}</Typography>
        ),
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
        filterable: false,
        render: (_, row) => (
          <Typography variant="body2">{formatDate(row.updatedAt)}</Typography>
        ),
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
        filterable: false,
        render: (_, row) => (
          <Typography variant="body2">{formatDate(row.manufactureDate)}</Typography>
        ),
      },
      {
        id: "expiryDate",
        label: "Exp Date",
        filterable: false,
        render: (_, row) => (
          <Typography variant="body2">{formatDate(row.expiryDate) ?? "-"}</Typography>
        ),
      },
      {
        id: "updatedAt",
        label: "Update Date",
        filterable: false,
        render: (_, row) => (
          <Typography variant="body2">{formatDate(row.updatedAt)}</Typography>
        ),
      },
    ],
  },
];
