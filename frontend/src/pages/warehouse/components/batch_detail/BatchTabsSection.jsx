import { useState } from "react";
import { Paper, Tabs, Tab, Box, Chip, Typography } from "@mui/material";
import {
  LocalShipping,
  Inventory2,
  SwapHoriz,
  BookmarkBorder,
  LockOpen,
} from "@mui/icons-material";
import DataTable from "@/components/DataTable";
import { formatDate } from "@/utils/formatDate";

const MOVEMENT_CONFIG = {
  purchase_receipt: {
    label: "Purchase Receipt",
    color: "success",
    icon: <LocalShipping />,
  },
  sale_issue: { label: "Sale Issue", color: "error", icon: <Inventory2 /> },
  transfer: { label: "Transfer", color: "info", icon: <SwapHoriz /> },
  reserve: { label: "Reserve", color: "warning", icon: <BookmarkBorder /> },
  release: { label: "Release", color: "default", icon: <LockOpen /> },
  receive: { label: "Receive", color: "success", icon: <LocalShipping /> },
  dispatch: { label: "Dispatch", color: "error", icon: <Inventory2 /> },
};

const BatchTabsSection = ({ inventory, movements }) => {
  const [tab, setTab] = useState(0);

  const inventoryColumns = [
    {
      id: "location",
      label: "Location",
      minWidth: 200,
      render: (_value, row) => (
        <Typography variant="body2" fontWeight={600}>
          {row?.location?.name || "Unknown"}
        </Typography>
      ),
    },
    {
      id: "reserved",
      label: "Reserved",
      align: "center",
      render: (_value, row) =>
        row?.reservedQty > 0 ? (
          <Typography fontWeight={700} color="warning.main">
            {row.reservedQty}
          </Typography>
        ) : (
          "-"
        ),
    },
    {
      id: "available",
      label: "Available",
      align: "center",
      render: (_value, row) => (
        <Typography fontWeight={700} color="success.main">
          {row?.availableQty}
        </Typography>
      ),
    },
    {
      id: "updatedAt",
      label: "Last Updated",
      align: "center",
      render: (_value, row) => formatDate(row?.updatedAt),
    },
  ];

  const movementColumns = [
    {
      id: "type",
      label: "Type",
      minWidth: 160,
      render: (_value, row) => {
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
      render: (_value, row) => <Typography fontWeight={600}>{row?.quantity}</Typography>,
    },
    {
      id: "from",
      label: "From Location",
      render: (_value, row) => row?.fromLocation?.name || "-",
    },
    {
      id: "to",
      label: "To Location",
      render: (_value, row) => row?.toLocation?.name || "-",
    },
    {
      id: "date",
      label: "Create Date",
      align: "center",
      minWidth: 150,
      render: (_value, row) => formatDate(row?.createdAt),
    },
  ];

  return (
    <Paper sx={{ mb: 3, overflow: "hidden" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#f5f5f5" }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
          }}
        >
          <Tab label={`Inventory (${inventory.length})`} />
          <Tab label={`History (${movements.length})`} />
        </Tabs>
      </Box>

      <Box>
        {tab === 0 && <DataTable title="" columns={inventoryColumns} data={inventory} />}
        {tab === 1 && <DataTable title="" columns={movementColumns} data={movements} />}
      </Box>
    </Paper>
  );
};

export default BatchTabsSection;
