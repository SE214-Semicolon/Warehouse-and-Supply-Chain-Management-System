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
  serverErrorField,
  hiddenFields = [],
}) {
  const isEdit = mode === "edit";

  const baseFields = useMemo(() => {
    return fieldConfigs[selectedMenu] || [];
  }, [selectedMenu]);

  const { options: dynamicOptions, initialValue: dynamicInitial } = useDynamicOptions(
    selectedMenu,
    true,
    selectedRow
  );

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState(new Set());

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

  const isFieldDisabled = (fieldId) => {
    if (!isEdit) return false;
    if (selectedMenu === "locations" && fieldId === "warehouseId") return true;
    if (selectedMenu === "batches" && fieldId === "productId") return true;
    return false;
  };

  const handleChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));

    setErrors((prev) => {
      const next = new Set(prev);

      if (id === "barcode") {
        if (value.length > BARCODE_LENGTHS) next.add("barcode");
        else next.delete("barcode");
      } else {
        const max = MAX_LENGTHS[id];
        if (max && value.length > max) next.add(id);
        else next.delete(id);
      }

      if (LIMIT_FIELDS.includes(id)) {
        const num = Number(value);

        if (num < 0 || num > MAX_VALUE) next.add(id);
        else next.delete(id);
      }

      if (id === "manufactureDate" || id === "expiryDate") {
        const tempData = { ...formData, [id]: value };
        const dateErrors = validateDates(id, value, tempData);
        ["manufactureDate", "expiryDate"].forEach((f) =>
          dateErrors.has(f) ? next.add(f) : next.delete(f)
        );
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
      if (!isNaN(val) && (val < 0 || val > MAX_VALUE)) {
        next.add(key);
      }
    });

    validateDates(null, null, formData).forEach((e) => next.add(e));

    return next;
  };

  const handleSubmit = () => {
    const errorSet = validate();
    if (errorSet.size > 0) {
      setErrors(errorSet);
      return;
    }

    const payload = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (!isFieldDisabled(key)) {
        payload[key] = value;
      }
    });

    if (selectedMenu === "warehouses") {
      payload.metadata = {
        ...(selectedRow?.metadata || {}),
        totalArea: formData.totalArea || null,
      };
    }

    onSubmit(payload);
  };

  const validateDates = (_id, _value, data) => {
    const errors = new Set();
    const mfg = data.manufactureDate;
    const exp = data.expiryDate;

    const mfgDate = mfg ? new Date(mfg) : null;
    const expDate = exp ? new Date(exp) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (mfgDate && mfgDate > today) errors.add("manufactureDate");
    if (expDate && expDate < today) errors.add("expiryDate");
    if (mfgDate && expDate && expDate <= mfgDate) errors.add("expiryDate");

    return errors;
  };

  const handleKeyDown = (field, e) => {
    const allowedKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
    const isNumber = /[0-9]/.test(e.key);

    if (NUMERIC_ONLY.includes(field.id) && !isNumber && !allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
    if (NUMERIC_BLOCK.includes(field.id) && isNumber && !allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  const getHelperText = (fieldId) => {
    if (fieldId === "barcode") {
      const len = formData.barcode?.length || 0;
      const countText = `${len}/${BARCODE_LENGTHS}`;

      if (errors.has("barcode")) {
        if (len > BARCODE_LENGTHS) {
          return `Limit exceeded (${countText})`;
        }
        return `Must be exactly 13 digits (${countText})`;
      }

      return `Length: ${countText}`;
    }

    if (serverErrorField === fieldId) return "";

    if (!errors.has(fieldId)) return "";

    const label =
      fieldConfigs[selectedMenu]?.find((f) => f.id === fieldId)?.label || fieldId;
    const max = MAX_LENGTHS[fieldId];

    if (max && formData[fieldId]?.length > max)
      return `${label} must not exceed ${max} characters`;

    if (LIMIT_FIELDS.includes(fieldId)) {
      const val = Number(formData[fieldId]);

      if (val < 0) return `${label} must be greater than or equal to 0`;
      if (val > MAX_VALUE)
        return `${label} must not exceed ${MAX_VALUE.toLocaleString()}`;
    }

    if (fieldId === "manufactureDate") return `${label} must be today or earlier`;
    if (fieldId === "expiryDate") return `${label} invalid range`;

    return `${label} is required`;
  };

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 1 }}>
        {baseFields
          .filter((field) => !hiddenFields.includes(field.id))
          .map((field) => {
            let options = field.options || [];

            if (field.id === "categoryId" && selectedMenu === "products")
              options = dynamicOptions;
            if (field.id === "warehouseId" && selectedMenu === "locations")
              options = dynamicOptions;
            if (field.id === "productId" && selectedMenu === "batches")
              options = dynamicOptions;

            const isServerError = serverErrorField === field.id;

            return (
              <FormInput
                key={field.id}
                label={field.label}
                type={field.type || "text"}
                value={formData[field.id] ?? ""}
                onChange={(val) => handleChange(field.id, val)}
                onKeyDown={(e) => handleKeyDown(field, e)}
                options={options}
                required={field.required}
                error={errors.has(field.id) || isServerError}
                helperText={getHelperText(field.id)}
                disabled={isFieldDisabled(field.id)}
              />
            );
          })}
      </Box>

      <DialogButtons onClose={onCancel} onAction={handleSubmit} />
    </>
  );
}
