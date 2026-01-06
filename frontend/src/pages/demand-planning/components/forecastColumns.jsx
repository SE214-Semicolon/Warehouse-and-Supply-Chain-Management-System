import { Chip, Stack, Typography } from "@mui/material";
import { formatDate } from "@/utils/formatDate";

export const getForecastColumns = () => [
  { id: "stt", label: "No", width: 50, align: "center", filterable: false },

  {
    id: "productInfo",
    label: "Product",
    align: "left",
    minWidth: 200,
    valueGetter: (row) => row.product?.name || "",
    render: (_, row) => (
      <Stack>
        <Typography variant="body2" fontWeight="bold">
          {row.product?.name || "Unknown Product"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          SKU: {row.product?.sku || row.productId}
        </Typography>
      </Stack>
    ),
  },

  {
    id: "forecastDate",
    label: "Forecast Date",
    render: (val) => <Typography variant="body2">{formatDate(val)}</Typography>,
  },

  {
    id: "forecastedQuantity",
    label: "Forecasted Quantity",
    render: (val) => (
      <Typography fontWeight="bold" color="primary">
        {Number(val).toLocaleString()}
      </Typography>
    ),
  },

  {
    id: "algorithmUsed",
    label: "Algorithm",
    filterable: true,
    render: (val) => (
      <Chip
        label={val?.replace(/_/g, " ")}
        color="info"
        variant="outlined"
        size="small"
        sx={{ fontWeight: 500 }}
      />
    ),
  },

  {
    id: "updatedAt",
    label: "Update Date",
    render: (val) => <Typography variant="body2">{formatDate(val)}</Typography>,
  },
];
