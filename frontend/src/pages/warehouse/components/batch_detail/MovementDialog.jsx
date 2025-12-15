import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, Box, Alert } from "@mui/material";
import FormInput from "@/components/FormInput";
import DialogButtons from "@/components/DialogButtons";

const MAX_QTY = 30000;

const MovementDialog = ({ open, type, locations, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    quantity: "",
    locationId: "",
    fromLocationId: "",
    toLocationId: "",
  });

  const [errors, setErrors] = useState(new Set());
  const [apiError, setApiError] = useState("");

  const isTransfer = type === "transfer";

  useEffect(() => {
    if (open) {
      setFormData({
        quantity: "",
        locationId: "",
        fromLocationId: "",
        toLocationId: "",
      });
      setErrors(new Set());
      setApiError("");
    }
  }, [open]);

  const locationOptions = useMemo(() => {
    return locations.map((loc) => ({
      value: loc.id,
      label: `${loc.code} - ${loc.name}`,
    }));
  }, [locations]);

  const validateField = (field, value, currentData, currentErrors) => {
    const nextErrors = new Set(currentErrors);

    if (field === "quantity") {
      nextErrors.delete("quantity_required");
      nextErrors.delete("quantity_invalid");
      nextErrors.delete("quantity_exceed");

      const qty = Number(value);
      if (!value) nextErrors.add("quantity_required");
      else if (qty <= 0) nextErrors.add("quantity_invalid");
      else if (qty > MAX_QTY) nextErrors.add("quantity_exceed");
    }

    if (field === "locationId") {
      nextErrors.delete("locationId");
      if (!value) nextErrors.add("locationId");
    }

    if (field === "fromLocationId" || field === "toLocationId") {
      nextErrors.delete(field);
      if (!value) nextErrors.add(field);

      const from =
        field === "fromLocationId" ? value : currentData.fromLocationId;
      const to = field === "toLocationId" ? value : currentData.toLocationId;

      nextErrors.delete("same_location");
      if (from && to && from === to) {
        nextErrors.add("same_location");
      }
    }

    return nextErrors;
  };

  const validateAll = () => {
    const nextErrors = new Set();
    const qty = Number(formData.quantity);

    if (!formData.quantity) nextErrors.add("quantity_required");
    else if (qty <= 0) nextErrors.add("quantity_invalid");
    else if (qty > MAX_QTY) nextErrors.add("quantity_exceed");

    if (isTransfer) {
      if (!formData.fromLocationId) nextErrors.add("fromLocationId");
      if (!formData.toLocationId) nextErrors.add("toLocationId");
      if (
        formData.fromLocationId &&
        formData.toLocationId &&
        formData.fromLocationId === formData.toLocationId
      ) {
        nextErrors.add("same_location");
      }
    } else {
      if (!formData.locationId) nextErrors.add("locationId");
    }
    return nextErrors;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => validateField(field, value, formData, prev));
    if (apiError) setApiError("");
  };

  const handleKeyDown = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  const handleSubmit = async () => {
    const allErrors = validateAll();
    if (allErrors.size > 0) {
      setErrors(allErrors);
      return;
    }

    setApiError("");

    try {
      await onSubmit(formData);
    } catch (msg) {
      setApiError(msg);
    }
  };

  const getHelperText = (field) => {
    if (field === "quantity") {
      if (errors.has("quantity_required")) return "Quantity is required";
      if (errors.has("quantity_invalid")) return "Quantity must be > 0";
      if (errors.has("quantity_exceed"))
        return `Must not exceed ${MAX_QTY.toLocaleString()}`;
    }
    if (field === "toLocationId" && errors.has("same_location")) {
      return "Destination cannot be same as Source";
    }
    if (errors.has(field)) return "This field is required";
    return "";
  };

  const getTitle = () => {
    const titles = {
      receive: "Receive Inventory",
      dispatch: "Dispatch Inventory",
      transfer: "Transfer Inventory",
      reserve: "Reserve Inventory",
      release: "Release Inventory",
    };
    return titles[type] || "Inventory Action";
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: "520px", maxHeight: "90vh" } }}
    >
      <DialogTitle sx={{ bgcolor: "#7F408E", color: "white", fontWeight: 600 }}>
        {getTitle()}
      </DialogTitle>

      <DialogContent dividers>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <Box
          sx={{
            pt: apiError ? 0 : 2,
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          <FormInput
            label="Quantity"
            type="number"
            value={formData.quantity}
            onChange={(val) => handleChange("quantity", val)}
            onKeyDown={handleKeyDown}
            required
            autoFocus
            error={
              errors.has("quantity_required") ||
              errors.has("quantity_invalid") ||
              errors.has("quantity_exceed")
            }
            helperText={getHelperText("quantity")}
          />

          {isTransfer ? (
            <>
              <FormInput
                label="From Location"
                type="select"
                options={locationOptions}
                value={formData.fromLocationId}
                onChange={(val) => handleChange("fromLocationId", val)}
                required
                error={errors.has("fromLocationId")}
                helperText={getHelperText("fromLocationId")}
              />
              <FormInput
                label="To Location"
                type="select"
                options={locationOptions}
                value={formData.toLocationId}
                onChange={(val) => handleChange("toLocationId", val)}
                required
                error={
                  errors.has("toLocationId") || errors.has("same_location")
                }
                helperText={getHelperText("toLocationId")}
              />
            </>
          ) : (
            <FormInput
              label="Location"
              type="select"
              options={locationOptions}
              value={formData.locationId}
              onChange={(val) => handleChange("locationId", val)}
              required
              error={errors.has("locationId")}
              helperText={getHelperText("locationId")}
            />
          )}
        </Box>
      </DialogContent>

      <DialogButtons
        onClose={onClose}
        onAction={handleSubmit}
        labelAction="Save"
      />
    </Dialog>
  );
};

export default MovementDialog;
