import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, Box, Alert } from "@mui/material";
import DialogButtons from "@/components/DialogButtons";
import { menuItems } from "./MenuConfig";
import { fieldConfigs } from "./FieldConfig";
import FormInput from "@/components/FormInput";
import ProductCategories from "@/services/category.service";

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
  const baseFields = useMemo(
    () => fieldConfigs[selectedMenu] || [],
    [selectedMenu]
  );

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);

  useEffect(() => {
    if (selectedMenu === "products" && open) {
      const loadCategories = async () => {
        try {
          const res = await ProductCategories.getAll();
          const dataArray = Array.isArray(res.data.data) ? res.data.data : [];
          const options = dataArray.map((cat) => ({
            label: cat.name,
            value: cat.id,
          }));
          setCategoryOptions(options);

          if (isEditMode && selectedRow) {
            setFormData((prev) => ({
              ...prev,
              categoryId: selectedRow.category?.id || "",
            }));
          }
        } catch (err) {
          console.error("Failed to load categories", err);
        }
      };
      loadCategories();
    }
  }, [selectedMenu, open, isEditMode, selectedRow]);

  useEffect(() => {
    if (open) {
      const initial = {};
      baseFields.forEach((f) => {
        initial[f.id] = isEditMode ? selectedRow?.[f.id] ?? "" : "";
      });
      setFormData(initial);
      setErrors([]);
      setShowAlert(false);
    }
  }, [open, baseFields, isEditMode, selectedRow]);

  const fields = baseFields.map((field) => {
    if (field.id === "categoryId" && selectedMenu === "products") {
      return {
        ...field,
        options: categoryOptions,
      };
    }
    return field;
  });

  const handleSubmit = () => {
    const requiredFields = fields.filter((f) => f.required);
    const emptyFields = requiredFields
      .filter((f) => !formData[f.id] || String(formData[f.id]).trim() === "")
      .map((f) => f.id);

    if (emptyFields.length > 0) {
      setErrors(emptyFields);
      setShowAlert(true);
      return;
    }

    setErrors([]);
    setShowAlert(false);
    onAction(formData);
  };

  const renderField = (field) => {
    let value =
      formData[field.id] ?? (isEditMode ? selectedRow?.[field.id] ?? "" : "");
    const hasError = errors.includes(field.id);
    const helperText = hasError ? `${field.label} is required` : "";

    const handleChange = (val) => {
      setFormData((prev) => ({ ...prev, [field.id]: val }));
    };

    const handleKeyDown = (e) => {
      const allowedKeys = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "Tab",
      ];

      if (field.id === "unit") {
        if (/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
          e.preventDefault();
        }
      }

      if (field.id === "barcode") {
        if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
          e.preventDefault();
        }
      }
    };

    return (
      <FormInput
        key={field.id}
        label={field.label}
        type={field.type || "text"}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        options={field.options || []}
        required={field.required}
        error={hasError}
        helperText={helperText}
      />
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: "500px", maxHeight: "90vh" } }}
    >
      <DialogTitle sx={{ bgcolor: "#7F408E", color: "white", fontWeight: 600 }}>
        {mode === "add"
          ? `Add ${currentMenu?.label}`
          : `Edit ${selectedRow?.name || ""}`}
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {showAlert && (
            <Alert severity="error" onClose={() => setShowAlert(false)}>
              Please enter all required information!
            </Alert>
          )}
          {fields.map(renderField)}
        </Box>
      </DialogContent>

      <DialogButtons onClose={onClose} onAction={handleSubmit} />
    </Dialog>
  );
};

export default FormDialog;
