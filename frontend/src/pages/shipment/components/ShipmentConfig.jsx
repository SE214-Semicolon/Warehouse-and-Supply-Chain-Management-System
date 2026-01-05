import { formatDate } from "@/utils/formatDate";
import { Chip, Typography, Stack, Tooltip } from "@mui/material";

export const shipmentColumns = [
  { id: "stt", label: "No", filterable: false, width: 50, align: "center" },

  {
    id: "shipmentNo",
    label: "Shipment No",
    filterable: true,
    minWidth: 160,
    render: (val) => (
      <Typography variant="body2" fontWeight="bold">
        {val}
      </Typography>
    ),
  },

  {
    id: "salesOrderId",
    label: "Sales Order",
    filterable: true,
    minWidth: 150,
    render: (_, row) => (
      <Typography variant="body2" color="primary" sx={{ cursor: "pointer" }}>
        {row.salesOrder?.soNo || "Unknown"}
      </Typography>
    ),
  },

  {
    id: "warehouseId",
    label: "Warehouse",
    filterable: true,
    minWidth: 180,
    render: (_, row) => row.warehouse?.name || "-",
  },

  { id: "carrier", label: "Carrier", filterable: true },

  { id: "trackingCode", label: "Tracking Code", filterable: true },

  {
    id: "status",
    label: "Status",
    filterable: true,
    width: 120,
    render: (_, row) => {
      const statusMap = {
        delivered: { color: "success", label: "DELIVERED" },
        in_transit: { color: "info", label: "IN TRANSIT" },
        preparing: { color: "warning", label: "PREPARING" },
        cancelled: { color: "error", label: "CANCELLED" },
        returned: { color: "error", label: "RETURNED" },
      };

      const config = statusMap[row.status] || { color: "default", label: row.status };

      return (
        <Chip
          label={config.label}
          color={config.color}
          size="small"
          variant="filled"
          sx={{ fontWeight: "bold", minWidth: 90 }}
        />
      );
    },
  },

  {
    id: "estimatedDelivery",
    label: "Est. Delivery",
    minWidth: 120,
    render: (val) => formatDate(val),
  },
];

export const shipmentItemColumns = [
  { id: "stt", label: "No", filterable: false, width: 60, align: "center" },

  {
    id: "productId",
    label: "Product Info",
    minWidth: 250,
    render: (_, row) => (
      <Stack>
        <Typography variant="body2" fontWeight="600">
          {row.product?.name || "Unknown Product"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          SKU: {row.product?.sku || row.productId}
        </Typography>
      </Stack>
    ),
  },

  {
    id: "productBatchId",
    label: "Batch ID",
    width: 200,
    render: (val) => <Typography variant="caption">{val || "-"}</Typography>,
  },

  {
    id: "salesOrderId",
    label: "SO ID (Item)",
    width: 150,
    render: (val) => (
      <Tooltip title={val}>
        <Typography variant="caption">{val?.substring(0, 8)}...</Typography>
      </Tooltip>
    ),
  },

  {
    id: "qty",
    label: "Qty",
    align: "right",
    width: 100,
    render: (val) => (
      <Typography fontWeight="bold">{Number(val).toLocaleString()}</Typography>
    ),
  },
];
