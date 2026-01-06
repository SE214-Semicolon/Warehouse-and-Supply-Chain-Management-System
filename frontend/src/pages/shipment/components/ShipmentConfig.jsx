/* eslint-disable react-refresh/only-export-components */
import { formatDate } from "@/utils/formatDate";
import { Chip, Typography, Stack, Tooltip, Box } from "@mui/material";

const RenderWrapText = ({ value, align = "left", color = "text.primary" }) => (
  <Typography
    variant="body2"
    align={align}
    color={color}
    sx={{
      whiteSpace: "normal",
      wordBreak: "break-word",
      lineHeight: 1.4,
    }}
  >
    {value || "-"}
  </Typography>
);

export const shipmentColumns = [
  { id: "stt", label: "No", filterable: false, width: 10, align: "center" },

  {
    id: "shipmentNo",
    label: "Shipment No",
    filterable: true,
    width: 100,
    render: (val) => <RenderWrapText value={val} />,
  },

  {
    id: "salesOrderId",
    label: "Sales Order",
    filterable: true,
    width: 100,
    align: "left",
    valueGetter: (row) => row.salesOrder?.soNo || "Unknown",
    render: (_, row) => <RenderWrapText value={row.salesOrder?.soNo || "Unknown"} />,
  },

  {
    id: "warehouseId",
    label: "Warehouse",
    filterable: true,
    width: 100,
    align: "left",
    valueGetter: (row) => row.warehouse?.name || "-",
    render: (_, row) => <RenderWrapText value={row.warehouse?.name} />,
  },

  {
    id: "carrier",
    label: "Carrier",
    filterable: true,
    width: 120,
    render: (val) => <RenderWrapText value={val} />,
  },

  {
    id: "trackingCode",
    label: "Tracking Code",
    filterable: true,
    width: 150,
    render: (val) => <RenderWrapText value={val} />,
  },

  {
    id: "status",
    label: "Status",
    filterable: true,
    width: 120,
    align: "center",
    valueGetter: (row) => row.status,
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
          sx={{
            fontWeight: 500,
            minWidth: 90,
            fontSize: "0.75rem",
            height: 24,
          }}
        />
      );
    },
  },

  {
    id: "estimatedDelivery",
    label: "Est. Delivery",
    width: 110,
    valueGetter: (row) => formatDate(row.estimatedDelivery),
    render: (val) => (
      <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
        {formatDate(val)}
      </Typography>
    ),
  },
];

export const shipmentItemColumns = [
  {
    id: "productInfo",
    label: "Product / SKU",
    align: "left",
    render: (_, row) => {
      const product = row?.product || {};
      return (
        <Box>
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            {product.name || "Unknown Product"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            SKU: {product.sku || "N/A"}
          </Typography>
        </Box>
      );
    },
  },
  {
    id: "batchInfo",
    label: "Batch Details",
    render: (_, row) => {
      const batch = row?.productBatch;
      if (!batch)
        return (
          <Typography variant="caption" color="text.secondary">
            -
          </Typography>
        );

      return (
        <Box>
          <Typography variant="body1">{batch.batchNo}</Typography>
          {batch.expiryDate && (
            <Typography variant="caption" color="error.main">
              Exp: {formatDate(batch.expiryDate)}
            </Typography>
          )}
        </Box>
      );
    },
  },
  {
    id: "qty",
    label: "Quantity",
    render: (val, row) => (
      <Typography fontWeight="bold" color="primary.main">
        {val || 0} {row?.product?.unit || ""}
      </Typography>
    ),
  },
];
