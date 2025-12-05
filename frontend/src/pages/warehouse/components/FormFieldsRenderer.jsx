import { useState, useEffect } from "react";
import { Box } from "@mui/material";
import FormInput from "@/components/FormInput";
import DialogButtons from "@/components/DialogButtons";
import { useDynamicOptions } from "@/hooks/useDynamicOptions";
import { fieldConfigs } from "./FieldConfig";

const MAX_LENGTHS = {
  name: 200,
  sku: 100,
  code: 50,
};

export default function FormFieldsRenderer({
  selectedMenu,
  selectedRow,
  mode,
  onSubmit,
  onCancel,
}) {
  const isEdit = mode === "edit";
  const baseFields = fieldConfigs[selectedMenu] || [];

  const { options: dynamicOptions, initialValue: dynamicInitial } =
    useDynamicOptions(selectedMenu, true, selectedRow);

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState(new Set());

  // Init form data
  useEffect(() => {
    const initial = {};
    baseFields.forEach((field) => {
      initial[field.id] = selectedRow?.[field.id] ?? "";
    });

    if (selectedMenu === "warehouses") {
      initial.totalArea = selectedRow?.metadata?.totalArea ?? "";
    }

    if (dynamicInitial) {
      Object.assign(initial, dynamicInitial);
    }

    setFormData(initial);
    setErrors(new Set());
  }, [selectedRow, selectedMenu, baseFields, dynamicInitial]);

  const handleChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const validate = () => {
    const missing = baseFields
      .filter((f) => f.required && !formData[f.id]?.toString().trim())
      .map((f) => f.id);

    const tooLong = Object.keys(MAX_LENGTHS)
      .filter((key) => formData[key]?.length > MAX_LENGTHS[key])
      .map((key) => key);

    return new Set([...missing, ...tooLong]);
  };

  const handleSubmit = () => {
    const errorSet = validate();
    if (errorSet.size > 0) {
      setErrors(errorSet);
      return;
    }

    const payload = { ...formData };
    delete payload.totalArea;

    if (selectedMenu === "warehouses") {
      payload.metadata = {
        ...(selectedRow?.metadata || {}),
        totalArea: formData.totalArea || null,
      };
    }

    onSubmit(payload);
  };

  const handleKeyDown = (field, e) => {
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
    if (
      field.id === "unit" &&
      /[0-9]/.test(e.key) &&
      !allowed.includes(e.key)
    ) {
      e.preventDefault();
    }
    if (
      field.id === "barcode" &&
      !/[0-9]/.test(e.key) &&
      !allowed.includes(e.key)
    ) {
      e.preventDefault();
    }
  };

  const getHelperText = (fieldId) => {
    if (!errors.has(fieldId)) return "";

    const value = formData[fieldId] || "";
    const max = MAX_LENGTHS[fieldId];

    if (max && value.length > max) {
      return `${
        fieldConfigs[selectedMenu].find((f) => f.id === fieldId)?.label ||
        fieldId
      } must not exceed ${max} characters`;
    }
    return "This field is required";
  };

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 1 }}>
        {baseFields.map((field) => {
          const value = formData[field.id] ?? "";
          const hasError = errors.has(field.id);

          let fieldOptions = field.options || [];
          if (field.id === "categoryId" && selectedMenu === "products") {
            fieldOptions = dynamicOptions;
          }
          if (field.id === "warehouseId" && selectedMenu === "locations") {
            fieldOptions = dynamicOptions;
          }

          const disabled =
            selectedMenu === "locations" &&
            field.id === "warehouseId" &&
            isEdit;

          return (
            <FormInput
              key={field.id}
              label={field.label}
              type={field.type || "text"}
              value={value}
              onChange={(val) => handleChange(field.id, val)}
              onKeyDown={(e) => handleKeyDown(field, e)}
              options={fieldOptions}
              required={field.required}
              error={hasError}
              helperText={getHelperText(field.id)}
              disabled={disabled}
              autoFocus={field.id === "name"} // bonus UX nhỏ
            />
          );
        })}
      </Box>

      <DialogButtons onClose={onCancel} onAction={handleSubmit} />
    </>
  );
}
