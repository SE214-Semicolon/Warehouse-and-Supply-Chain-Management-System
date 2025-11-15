import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import { menuItems } from "./MenuConfig";

const ViewDialog = ({
  open,
  onClose,
  selectedMenu,
  selectedRow,
  getExtraInfo,
}) => {
  const currentMenu = menuItems.find((item) => item.id === selectedMenu);

  const renderFields = () => {
    if (!selectedRow) {
      return <Typography>Không có dữ liệu để hiển thị</Typography>;
    }

    const columns = currentMenu?.columns || [];
    const extraInfo = getExtraInfo
      ? getExtraInfo(selectedRow)
      : selectedRow.extraInfo;

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: "bold", color: "#3E468A", mb: 1.5 }}
          >
            Thông tin cơ bản
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {columns.map((col) => (
              <Box key={col.id}>
                <Typography sx={{ lineHeight: 1.7 }}>
                  {col.label}: {selectedRow[col.id] || "N/A"}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {extraInfo && (
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: "bold", color: "#3E468A", mb: 1.5 }}
            >
              Thông tin bổ sung
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography sx={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
              {extraInfo}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle sx={{ fontWeight: "bold", fontSize: "19px" }}>
        Xem chi tiết {currentMenu?.label || "dữ liệu"}
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {renderFields()}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button variant="contained" onClick={onClose} sx={{ minWidth: 100 }}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewDialog;
