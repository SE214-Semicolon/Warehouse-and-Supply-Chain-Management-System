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

const headerCellSx = {
  fontWeight: 700,
};

const bodyCellSx = {
  fontWeight: 400,
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
          {/* header */}
          {tab === 0 ? (
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Location</TableCell>
                <TableCell align="center" sx={headerCellSx}>
                  Reserved
                </TableCell>
                <TableCell align="center" sx={headerCellSx}>
                  Available
                </TableCell>
                <TableCell align="center" sx={headerCellSx}>
                  Updated Date
                </TableCell>
              </TableRow>
            </TableHead>
          ) : (
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={headerCellSx}>
                  Type
                </TableCell>
                <TableCell align="center" sx={headerCellSx}>
                  Qty
                </TableCell>
                <TableCell sx={headerCellSx}>From</TableCell>
                <TableCell sx={headerCellSx}>To</TableCell>
                <TableCell align="center" sx={headerCellSx}>
                  User
                </TableCell>
                <TableCell align="center" sx={headerCellSx}>
                  Create Date
                </TableCell>
              </TableRow>
            </TableHead>
          )}

          {/* body */}
          <TableBody>
            {tab === 0 ? (
              inventory.length > 0 ? (
                inventory.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell sx={bodyCellSx}>{inv.location?.name}</TableCell>
                    <TableCell align="center" sx={bodyCellSx}>
                      {inv.reservedQty}
                    </TableCell>
                    <TableCell align="center" sx={bodyCellSx}>
                      {inv.availableQty}
                    </TableCell>
                    <TableCell align="center" sx={bodyCellSx}>
                      {formatDate(inv.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={bodyCellSx}>
                    No inventory found
                  </TableCell>
                </TableRow>
              )
            ) : movements.length > 0 ? (
              movements.map((mov) => (
                <TableRow key={mov.id} hover>
                  <TableCell align="center" sx={bodyCellSx}>
                    {renderMovementChip(mov.movementType)}
                  </TableCell>
                  <TableCell align="center" sx={bodyCellSx}>
                    {mov.quantity}
                  </TableCell>
                  <TableCell sx={bodyCellSx}>{mov.fromLocation?.name || "-"}</TableCell>
                  <TableCell sx={bodyCellSx}>{mov.toLocation?.name || "-"}</TableCell>
                  <TableCell align="center" sx={bodyCellSx}>
                    {mov.createdBy?.name || "-"}
                  </TableCell>
                  <TableCell align="center" sx={bodyCellSx}>
                    {formatDate(mov.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={bodyCellSx}>
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
