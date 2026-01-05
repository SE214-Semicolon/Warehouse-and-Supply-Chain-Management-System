import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, Box, Alert } from "@mui/material";
import FormInput from "@/components/FormInput";
import DialogButtons from "@/components/DialogButtons";

const MAX_QTY = 30000;

const MovementDialog = ({
  open,
  type,
  locations,
  selectedInventory,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    quantity: "",
    locationId: "",
    fromLocationId: "",
    toLocationId: "",
    reason: "",
    note: "",
  });

  const [errors, setErrors] = useState(new Set());
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (open) {
      setFormData({
        quantity: "",
        locationId: selectedInventory?.locationId || "",
        fromLocationId: selectedInventory?.locationId || "",
        toLocationId: "",
        reason: "",
        note: "",
      });
      setErrors(new Set());
      setApiError("");
    }
  }, [open, selectedInventory]);

  const locationOptions = useMemo(
    () => locations.map((loc) => ({ value: loc.id, label: `${loc.code} - ${loc.name}` })),
    [locations]
  );

  const getTitle = () => {
    const titles = {
      receive: "Receive Into Inventory",
      dispatch: "Dispatch Stock",
      transfer: "Transfer Stock",
      reserve: "Reserve Stock",
      release: "Release Reserved Stock",
      adjust: "Adjust Stock Quantity",
    };
    return titles[type] || "Inventory Action";
  };

  const validateField = (name, value, currentData) => {
    const nextErrors = new Set(errors);

    if (name === "quantity") {
      nextErrors.delete("qty_req");
      nextErrors.delete("qty_inv");
      nextErrors.delete("qty_max");

      const qty = Number(value);
      if (!value || value === "") nextErrors.add("qty_req");
      else if (qty <= 0) nextErrors.add("qty_inv");
      else if (qty > MAX_QTY) nextErrors.add("qty_max");
    }

    if (name === "locationId") {
      nextErrors.delete("loc_req");
      if (!value) nextErrors.add("loc_req");
    }

    if (name === "toLocationId") {
      nextErrors.delete("to_loc_req");
      nextErrors.delete("same_loc");
      if (!value) nextErrors.add("to_loc_req");
      if (value && value === currentData.fromLocationId) nextErrors.add("same_loc");
    }

    if (name === "reason") {
      nextErrors.delete("reason_req");
      if (!value && type === "adjust") nextErrors.add("reason_req");
    }

    return nextErrors;
  };

  const handleChange = (name, value) => {
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    setErrors(validateField(name, value, updatedData));

    if (apiError) setApiError("");
  };

  const getHelperText = (name) => {
    if (name === "quantity") {
      if (errors.has("qty_req")) return "Quantity is required";
      if (errors.has("qty_inv")) return "Must be greater than 0";
      if (errors.has("qty_max"))
        return `Maximum allowed is ${MAX_QTY.toLocaleString("vi-VN")}`;
    }
    if (name === "locationId" && errors.has("loc_req")) return "Location is required";
    if (name === "toLocationId") {
      if (errors.has("to_loc_req")) return "Destination is required";
      if (errors.has("same_loc")) return "Cannot transfer to the same location";
    }
    if (name === "reason" && errors.has("reason_req"))
      return "Reason is required for adjustment";
    return "";
  };

  const handleSubmit = async () => {
    const finalErrors = new Set();
    if (!formData.quantity) finalErrors.add("qty_req");
    else if (Number(formData.quantity) > MAX_QTY) finalErrors.add("qty_max");

    if (type === "receive" && !formData.locationId) finalErrors.add("loc_req");
    if (type === "transfer") {
      if (!formData.toLocationId) finalErrors.add("to_loc_req");
      if (formData.toLocationId === formData.fromLocationId) finalErrors.add("same_loc");
    }
    if (type === "adjust" && !formData.reason) finalErrors.add("reason_req");

    if (finalErrors.size > 0) {
      setErrors(finalErrors);
      return;
    }

    let payload = {};
    if (type === "transfer") {
      payload = {
        fromLocationId: formData.fromLocationId,
        toLocationId: formData.toLocationId,
        quantity: Number(formData.quantity),
        note: formData.note || undefined,
      };
    } else if (type === "adjust") {
      payload = {
        locationId: formData.locationId,
        adjustmentQuantity: Number(formData.quantity),
        reason: formData.reason,
        note: formData.note || undefined,
      };
    } else {
      payload = {
        locationId: formData.locationId,
        quantity: Number(formData.quantity),
      };
    }

    try {
      await onSubmit(payload);
    } catch (msg) {
      setApiError(msg);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { width: "480px" } }}>
      <DialogTitle sx={{ bgcolor: "#7F408E", color: "white", fontWeight: 600 }}>
        {getTitle()}
      </DialogTitle>
      <DialogContent dividers>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
          {selectedInventory && (
            <Alert severity="info" icon={false}>
              <b>Current Location:</b> {selectedInventory.location?.name}
              <br />
              <b>Available:</b> {selectedInventory.availableQty}
            </Alert>
          )}

          <FormInput
            label={type === "adjust" ? "Adjustment Quantity" : "Quantity"}
            type="number"
            value={formData.quantity}
            onChange={(val) => handleChange("quantity", val)}
            required
            error={
              errors.has("qty_req") || errors.has("qty_inv") || errors.has("qty_max")
            }
            helperText={getHelperText("quantity")}
          />

          {type === "receive" && (
            <FormInput
              label="Destination Location"
              type="select"
              options={locationOptions}
              value={formData.locationId}
              onChange={(val) => handleChange("locationId", val)}
              required
              error={errors.has("loc_req")}
              helperText={getHelperText("locationId")}
            />
          )}

          {type === "transfer" && (
            <>
              <FormInput
                label="From Location"
                type="select"
                options={locationOptions}
                value={formData.fromLocationId}
                disabled
              />
              <FormInput
                label="To Location"
                type="select"
                options={locationOptions}
                value={formData.toLocationId}
                onChange={(val) => handleChange("toLocationId", val)}
                required
                error={errors.has("to_loc_req") || errors.has("same_loc")}
                helperText={getHelperText("toLocationId")}
              />
            </>
          )}

          {(type === "adjust" || type === "transfer") && (
            <FormInput
              label="Note"
              value={formData.note}
              onChange={(val) => handleChange("note", val)}
              placeholder="Internal reference or description"
            />
          )}

          {type === "adjust" && (
            <FormInput
              label="Reason for Adjustment"
              value={formData.reason}
              onChange={(val) => handleChange("reason", val)}
              required
              error={errors.has("reason_req")}
              helperText={getHelperText("reason")}
              placeholder="e.g. Damage, Count error"
            />
          )}
        </Box>
      </DialogContent>
      <DialogButtons onClose={onClose} onAction={handleSubmit} labelAction="Save" />
    </Dialog>
  );
};

export default MovementDialog;
