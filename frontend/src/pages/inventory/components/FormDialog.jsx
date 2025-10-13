import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import DialogButtons from "@/components/DialogButtons";
import { menuItems } from "./MenuConfig";
import { fieldConfigs } from "./FieldConfig";

const renderField = (field, selectedRow, isEditMode) => {
  const defaultValue = isEditMode ? selectedRow?.[field.id] || "" : "";

  if (field.component) {
    const CustomComponent = field.component;
    return (
      <CustomComponent
        key={field.id}
        label={field.label}
        defaultValue={defaultValue}
        type={field.type}
        options={field.options}
        fullWidth
        {...field.componentProps}
      />
    );
  }

  return (
    <TextField
      key={field.id}
      label={field.label}
      defaultValue={defaultValue}
      fullWidth
      type={field.type}
      size="medium"
    />
  );
};

const FormDialog = ({ open, onClose, mode, selectedMenu, selectedRow }) => {
  const currentMenu = menuItems.find((item) => item.id === selectedMenu);
  const isEditMode = mode === "edit";

  const renderFields = () => {
    if (isEditMode && !selectedRow) {
      return <Typography>Không có dữ liệu để hiển thị</Typography>;
    }

    const fields = fieldConfigs[selectedMenu];

    if (!fields) {
      return <Typography>Menu không hợp lệ</Typography>;
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {fields.map((field) => renderField(field, selectedRow, isEditMode))}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "450px",
          height: "auto",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          background: "linear-gradient(90deg, #7F408E, #3A7BD5)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textTransform: "capitalize",
          letterSpacing: 0.5,
        }}
      >
        {isEditMode
          ? `Chỉnh sửa ${currentMenu?.label}`
          : `Thêm ${currentMenu?.label} mới`}
      </DialogTitle>

      <DialogContent dividers>{renderFields()}</DialogContent>

      <DialogButtons onClose={onClose} onAction={() => console.log("Lưu")} />
    </Dialog>
  );
};

export default FormDialog;
