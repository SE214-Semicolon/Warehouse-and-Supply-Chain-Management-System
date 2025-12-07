import { useState, useEffect, useMemo } from "react";
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

const BARCODE_LENGTHS = 13;

const NUMERIC_ONLY = ["barcode", "quantity", "capacity"];
const NUMERIC_BLOCK = ["unit"];

const LIMIT_FIELDS = ["quantity", "capacity"];
const MAX_VALUE = 30000;

export default function FormFieldsRenderer({
  selectedMenu,
  selectedRow,
  mode,
  onSubmit,
  onCancel,
}) {
  const isEdit = mode === "edit";
  const baseFields = useMemo(() => {
    return fieldConfigs[selectedMenu] || [];
  }, [selectedMenu]);

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

      const max = MAX_LENGTHS[id];
      if (max && value.length > max) next.add(id);
      else next.delete(id);

      if (LIMIT_FIELDS.includes(id)) {
        const num = Number(value);
        if (num > MAX_VALUE) next.add(id);
        else next.delete(id);
      }

      if (id === "manufactureDate" || id === "expiryDate") {
        const dateErrors = validateDates(id, value, formData);

        ["manufactureDate", "expiryDate"].forEach((field) => {
          if (dateErrors.has(field)) next.add(field);
          else next.delete(field);
        });
      }

      return next;
    });
  };

  const validate = () => {
    const next = new Set();

    baseFields.forEach((f) => {
      if (f.required && !formData[f.id]?.toString().trim()) {
        next.add(f.id);
      }
    });

    Object.keys(MAX_LENGTHS).forEach((key) => {
      if (formData[key]?.length > MAX_LENGTHS[key]) {
        next.add(key);
      }
    });

    if (formData.barcode && formData.barcode.length !== BARCODE_LENGTHS) {
      next.add("barcode");
    }

    LIMIT_FIELDS.forEach((key) => {
      const val = Number(formData[key]);
      if (!isNaN(val) && val > MAX_VALUE) {
        next.add(key);
      }
    });

    const dateErrors = validateDates(null, null, formData);
    dateErrors.forEach((e) => next.add(e));

    return next;
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

  const validateDates = (id, value, formData) => {
    const nextErrors = new Set();

    const mfg = id === "manufactureDate" ? value : formData.manufactureDate;

    const exp = id === "expiryDate" ? value : formData.expiryDate;

    const manufactureDate = mfg ? new Date(mfg) : null;
    const expiryDate = exp ? new Date(exp) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (manufactureDate && manufactureDate > today) {
      nextErrors.add("manufactureDate");
    }

    if (expiryDate && expiryDate < today) {
      nextErrors.add("expiryDate");
    }

    if (manufactureDate && expiryDate && expiryDate <= manufactureDate) {
      nextErrors.add("expiryDate");
    }

    return nextErrors;
  };

  const handleKeyDown = (field, e) => {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
    ];
    const isNumber = /[0-9]/.test(e.key);

    if (
      NUMERIC_ONLY.includes(field.id) &&
      !isNumber &&
      !allowedKeys.includes(e.key)
    ) {
      e.preventDefault();
    }

    if (
      NUMERIC_BLOCK.includes(field.id) &&
      isNumber &&
      !allowedKeys.includes(e.key)
    ) {
      e.preventDefault();
    }
  };

  const getHelperText = (fieldId) => {
    if (fieldId !== "barcode" && !errors.has(fieldId)) return "";

    const label =
      fieldConfigs[selectedMenu].find((f) => f.id === fieldId)?.label ||
      fieldId;

    const max = MAX_LENGTHS[fieldId];
    if (max && formData[fieldId]?.length > max)
      return `${label} must not exceed ${max} characters`;

    if (LIMIT_FIELDS.includes(fieldId)) {
      const val = Number(formData[fieldId]);
      if (val > MAX_VALUE)
        return `${label} must not exceed ${MAX_VALUE.toLocaleString("en-US")}`;
    }

    if (fieldId === "manufactureDate")
      return `${label} must be today or earlier`;
    if (fieldId === "expiryDate")
      return `${label} must be after Manufacture Date and not earlier than today`;

    if (fieldId === "barcode") {
      const len = formData.barcode?.length || 0;
      if (errors.has("barcode")) {
        return `${label} must be exactly ${BARCODE_LENGTHS} digits`;
      }
      return `Barcode length: ${len} / ${BARCODE_LENGTHS} digits`;
    }

    return `${label} is required`;
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
          if (field.id === "productId" && selectedMenu === "batches") {
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
            />
          );
        })}
      </Box>

      <DialogButtons onClose={onCancel} onAction={handleSubmit} />
    </>
  );
}
