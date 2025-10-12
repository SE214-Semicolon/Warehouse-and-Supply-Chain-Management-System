import React, { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Add, Upload, Download, Print, MoreVert } from "@mui/icons-material";

export default function ActionButtons({ onAdd, onImport, onExport, onPrint }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
      {onAdd && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={onAdd}
          sx={{
            textTransform: "none",
            background: "#3E468A",
            px: 1.5,
            py: 1,
          }}
        >
          Thêm
        </Button>
      )}

      {(onImport || onExport || onPrint) && (
        <>
          <IconButton onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
            {onImport && (
              <MenuItem
                onClick={() => {
                  onImport();
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <Upload fontSize="small" />
                </ListItemIcon>
                <ListItemText>Import</ListItemText>
              </MenuItem>
            )}
            {onExport && (
              <MenuItem
                onClick={() => {
                  onExport();
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <Download fontSize="small" />
                </ListItemIcon>
                <ListItemText>Export</ListItemText>
              </MenuItem>
            )}
            {onPrint && (
              <MenuItem
                onClick={() => {
                  onPrint();
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <Print fontSize="small" />
                </ListItemIcon>
                <ListItemText>Print</ListItemText>
              </MenuItem>
            )}
          </Menu>
        </>
      )}
    </Box>
  );
}
