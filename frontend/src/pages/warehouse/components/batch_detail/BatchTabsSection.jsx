import { useState } from "react";
import {
  Paper,
  Tabs,
  Tab,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
} from "@mui/material";
import { formatDate } from "@/utils/formatDate";
import {
  LocalShipping,
  Inventory2,
  SwapHoriz,
  BookmarkBorder,
  LockOpen,
} from "@mui/icons-material";

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
};

const BatchTabsSection = ({ inventory, movements }) => {
  const [tab, setTab] = useState(0);

  const renderMovementChip = (type) => {
    const config = MOVEMENT_CONFIG[type] || { label: type, color: "default" };
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
      />
    );
  };

  return (
    <Paper sx={{ mb: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label={`Inventory (${inventory.length})`} />
          <Tab label={`History (${movements.length})`} />
        </Tabs>
      </Box>

      <TableContainer>
        <Table>
          {tab === 0 ? (
            <TableHead>
              <TableRow>
                <TableCell>Location</TableCell>
                <TableCell align="center">Reserved</TableCell>
                <TableCell align="center">Available</TableCell>
                <TableCell align="center">Updated Date</TableCell>
              </TableRow>
            </TableHead>
          ) : (
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Time</TableCell>
              </TableRow>
            </TableHead>
          )}

          <TableBody>
            {tab === 0 ? (
              inventory.length > 0 ? (
                inventory.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {inv.location?.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{inv.reservedQty}</TableCell>
                    <TableCell align="center">{inv.availableQty}</TableCell>
                    <TableCell align="center">
                      {formatDate(inv.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No inventory found
                  </TableCell>
                </TableRow>
              )
            ) : movements.length > 0 ? (
              movements.map((mov) => (
                <TableRow key={mov.id} hover>
                  <TableCell>{renderMovementChip(mov.movementType)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {mov.quantity}
                  </TableCell>
                  <TableCell>{mov.fromLocation?.code || "-"}</TableCell>
                  <TableCell>{mov.toLocation?.code || "-"}</TableCell>
                  <TableCell>{mov.createdBy?.name || "System"}</TableCell>
                  <TableCell>{formatDate(mov.createdAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No movement history
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default BatchTabsSection;
