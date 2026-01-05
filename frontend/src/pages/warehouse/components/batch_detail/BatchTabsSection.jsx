import { useState } from "react";
import {
  Paper,
  Tabs,
  Tab,
  Box,
  Chip,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  LocalShipping,
  Inventory2,
  SwapHoriz,
  BookmarkBorder,
  LockOpen,
  EditNote,
  AssignmentReturn,
  PrecisionManufacturing,
} from "@mui/icons-material";
import DataTable from "@/components/DataTable";
import { formatDate } from "@/utils/formatDate";

const MOVEMENT_CONFIG = {
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

const BatchTabsSection = ({ inventory, movements, onRowAction }) => {
  const [tab, setTab] = useState(0);

  const inventoryColumns = [
    {
      id: "location",
      label: "Location",
      minWidth: 150,
      render: (_, row) => row?.location?.name || "Unknown",
    },
    {
      id: "available",
      label: "Available",
      align: "center",
      filterable: false,
      render: (_, row) => (
        <Typography fontWeight={600} color="success.main">
          {row?.availableQty}
        </Typography>
      ),
    },
    {
      id: "reserved",
      label: "Reserved",
      align: "center",
      filterable: false,
      render: (_, row) => (
        <Typography fontWeight={600} color="warning.main">
          {row.reservedQty || 0}
        </Typography>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      align: "center",
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
          {/* <Tooltip title="Reserve">
            <IconButton
              size="small"
              color="warning"
              onClick={() => onRowAction("reserve", row)}
            >
              <BookmarkBorder fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Release">
            <IconButton
              size="small"
              color="default"
              onClick={() => onRowAction("release", row)}
            >
              <LockOpen fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Dispatch">
            <IconButton
              size="small"
              color="error"
              onClick={() => onRowAction("dispatch", row)}
            >
              <Inventory2 fontSize="small" />
            </IconButton>
          </Tooltip> */}
        </Box>
      ),
    },
  ];

  const movementColumns = [
    {
      id: "type",
      label: "Type",
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
      label: "Quantity",
      align: "center",
      filterable: false,
      render: (_, row) => <b>{row?.quantity}</b>,
    },
    {
      id: "from",
      label: "From Location",
      render: (_, row) => row?.fromLocation?.name || "-",
    },
    { id: "to", label: "To Location", render: (_, row) => row?.toLocation?.name || "-" },
    {
      id: "date",
      label: "Create Date",
      align: "center",
      render: (_, row) => (
        <Typography variant="body2">{formatDate(row?.createdAt)}</Typography>
      ),
    },
  ];

  return (
    <Paper sx={{ mb: 3, overflow: "hidden", borderRadius: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#fafafa" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`Inventory (${inventory.length})`} sx={{ fontWeight: 600 }} />
          <Tab label={`History (${movements.length})`} sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>
      <Box>
        {tab === 0 && <DataTable columns={inventoryColumns} data={inventory} />}
        {tab === 1 && <DataTable columns={movementColumns} data={movements} />}
      </Box>
    </Paper>
  );
};

export default BatchTabsSection;
