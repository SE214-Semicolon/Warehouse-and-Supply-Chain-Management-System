import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { menuItems } from './MenuConfig';

const ViewDialog = ({ open, onClose, selectedMenu, selectedRow }) => {
  const currentMenu = menuItems.find((item) => item.id === selectedMenu);

  const renderFields = () => {
    if (!selectedRow)
      return <Typography>Không có dữ liệu để hiển thị</Typography>;

    const columns = currentMenu?.columns || [];
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {columns.map((col) => (
          <Typography key={col.id}>
            {col.label}: {selectedRow[col.id] || 'N/A'}
          </Typography>
        ))}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Xem chi tiết {currentMenu?.label}</DialogTitle>
      <DialogContent dividers>{renderFields()}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewDialog;
