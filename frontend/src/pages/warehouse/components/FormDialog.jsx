import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import DialogButtons from "@/components/DialogButtons";
import { menuItems } from "./MenuConfig";
import { fieldConfigs } from "./FieldConfig";
import { useState, useEffect } from "react";

const renderField = (
  field,
  selectedRow,
  isEditMode,
  formData,
  setFormData,
  errors
) => {
  const value =
    formData[field.id] ?? (isEditMode ? selectedRow?.[field.id] ?? "" : "");

  const handleChange = (newValue) => {
    setFormData((prev) => ({ ...prev, [field.id]: newValue }));
  };

  const hasError = errors.includes(field.id);

  if (field.component) {
    const CustomComponent = field.component;
    return (
      <CustomComponent
        key={field.id}
        label={field.label}
        value={value}
        type={field.type}
        options={field.options}
        fullWidth
        required={field.required}
        onChange={(val) => handleChange(val)}
        error={hasError}
        helperText={hasError ? `${field.label} is require` : ""}
        {...field.componentProps}
      />
    );
  }

  return (
    <TextField
      key={field.id}
      label={field.label}
      value={value}
      fullWidth
      type={field.type}
      required={field.required}
      size="medium"
      onChange={(e) => handleChange(e.target.value)}
      error={hasError}
      helperText={hasError ? `${field.label} is require` : ""}
    />
  );
};

const FormDialog = ({
  open,
  onClose,
  onAction,
  mode,
  selectedMenu,
  selectedRow,
}) => {
  const currentMenu = menuItems.find((item) => item.id === selectedMenu);
  const isEditMode = mode === "edit";
  const fields = fieldConfigs[selectedMenu];

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState([]);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (open) {
      const initial = {};
      fields?.forEach((f) => {
        initial[f.id] = isEditMode ? selectedRow?.[f.id] ?? "" : "";
      });
      setFormData(initial);
      setErrors([]);
      setShowAlert(false);
    }
  }, [open, mode, selectedMenu, selectedRow]);

  const handleSubmit = () => {
    const requiredFields = fields?.filter((f) => f.required) || [];
    const emptyFields = [];

    for (const field of requiredFields) {
      const value = formData[field.id];
      if (!value || String(value).trim() === "") {
        emptyFields.push(field.id);
      }
    }

    if (emptyFields.length > 0) {
      setErrors(emptyFields);
      setShowAlert(true);
      return;
    }

    setErrors([]);
    setShowAlert(false);
    onAction(formData);
  };

  const renderFields = () => {
    if (isEditMode && !selectedRow) {
      return <Typography>No data</Typography>;
    }

    if (!fields) {
      return <Typography>Wrong tab</Typography>;
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {showAlert && (
          <Alert severity="error" onClose={() => setShowAlert(false)}>
            Please enter all required information
          </Alert>
        )}
        {fields.map((field) =>
          renderField(
            field,
            selectedRow,
            isEditMode,
            formData,
            setFormData,
            errors
          )
        )}
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
          background: "#7F408E",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textTransform: "capitalize",
          letterSpacing: 0.5,
        }}
      >
        {mode === "add" && `Add ${currentMenu?.label}`}
        {mode === "edit" && `Edit ${selectedRow?.name || ""}`}
      </DialogTitle>

      <DialogContent dividers>{renderFields()}</DialogContent>

      <DialogButtons onClose={onClose} onAction={handleSubmit} />
    </Dialog>
  );
};

export default FormDialog;
