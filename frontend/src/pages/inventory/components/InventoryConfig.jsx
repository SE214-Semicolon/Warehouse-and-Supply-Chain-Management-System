import { Typography, Chip, Box, IconButton, Tooltip } from "@mui/material";
import {
  SwapHoriz,
  LocalShipping,
  Inventory2,
  BookmarkBorder,
  LockOpen,
  EditNote,
  AssignmentReturn,
  PrecisionManufacturing,
} from "@mui/icons-material";
import { formatDate } from "@/utils/formatDate";

export const MOVEMENT_CONFIG = {
  purchase_receipt: {
    label: "Purchase Receipt",
    color: "success",
    icon: <LocalShipping fontSize="small" />,
  },
  sale_issue: {
    label: "Sale Issue",
    color: "error",
    icon: <Inventory2 fontSize="small" />,
  },
  transfer: { label: "Transfer", color: "info", icon: <SwapHoriz fontSize="small" /> },
  reserve: {
    label: "Reserve",
    color: "warning",
    icon: <BookmarkBorder fontSize="small" />,
  },
  release: { label: "Release", color: "default", icon: <LockOpen fontSize="small" /> },
  receive: {
    label: "Receive",
    color: "success",
    icon: <LocalShipping fontSize="small" />,
  },
  dispatch: { label: "Dispatch", color: "error", icon: <Inventory2 fontSize="small" /> },
  adjustment: {
    label: "Adjustment",
    color: "secondary",
    icon: <EditNote fontSize="small" />,
  },
  returned: {
    label: "Returned",
    color: "warning",
    icon: <AssignmentReturn fontSize="small" />,
  },
  consumption: {
    label: "Consumption",
    color: "default",
    icon: <PrecisionManufacturing fontSize="small" />,
  },
};

export const getInventoryColumns = (onRowAction) => [
  { id: "stt", label: "No", width: 70, filterable: false },
  {
    id: "location",
    label: "Location",
    filterable: false,
    minWidth: 200,
    render: (_, row) => (
      <Box sx={{ textAlign: "left" }}>
        <Typography variant="body2" fontWeight={600} sx={{ color: "#1e293b" }}>
          {row.location?.name || "N/A"}
        </Typography>
        <Typography variant="caption">{row.location?.code}</Typography>
      </Box>
    ),
  },
  {
    id: "availableQty",
    label: "Available",
    align: "center",
    width: 120,
    filterable: false,
    render: (val) => (
      <Typography fontWeight={600} color="success.main">
        {val?.toLocaleString("vi-VN")}
      </Typography>
    ),
  },
  {
    id: "reservedQty",
    label: "Reserved",
    align: "center",
    width: 120,
    filterable: false,
    render: (val) => (
      <Typography fontWeight={600} color="warning.main">
        {(val || 0).toLocaleString("vi-VN")}
      </Typography>
    ),
  },
  {
    id: "actions",
    label: "Actions",
    align: "center",
    width: 120,
    filterable: false,
    render: (_, row) => (
      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
        <Tooltip title="Transfer">
          <IconButton
            size="small"
            color="info"
            onClick={() => onRowAction("transfer", row)}
            sx={{
              bgcolor: "rgba(2, 136, 209, 0.04)",
              "&:hover": { bgcolor: "rgba(2, 136, 209, 0.12)" },
            }}
          >
            <SwapHoriz fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Adjust Stock">
          <IconButton
            size="small"
            color="secondary"
            onClick={() => onRowAction("adjust", row)}
            sx={{
              bgcolor: "rgba(156, 39, 176, 0.04)",
              "&:hover": { bgcolor: "rgba(156, 39, 176, 0.12)" },
            }}
          >
            <EditNote fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ),
  },
];

export const movementColumns = [
  { id: "stt", label: "No", width: 70, filterable: false },
  {
    id: "type",
    label: "Type",
    filterable: false,
    render: (_, row) => {
      const config = MOVEMENT_CONFIG[row?.movementType] || {
        label: row?.movementType,
        color: "default",
      };
      return (
        <Chip
          icon={config.icon}
          label={config.label}
          color={config.color}
          size="medium"
          variant="outlined"
        />
      );
    },
  },
  {
    id: "quantity",
    label: "Qty",
    align: "center",
    width: 100,
    render: (val) => (
      <Typography variant="body2" fontWeight={700}>
        {val?.toLocaleString("vi-VN")}
      </Typography>
    ),
  },
  {
    id: "from",
    label: "From Location",
    minWidth: 150,
    render: (_, row) => (
      <Typography variant="body2">{row.fromLocation?.name || "-"}</Typography>
    ),
  },
  {
    id: "to",
    label: "To Location",
    minWidth: 150,
    render: (_, row) => (
      <Typography variant="body2">{row.toLocation?.name || "-"}</Typography>
    ),
  },
  {
    id: "date",
    label: "Create Date",
    align: "center",
    width: 150,
    render: (_, row) => (
      <Typography variant="body2">{formatDate(row.createdAt)}</Typography>
    ),
  },
];
