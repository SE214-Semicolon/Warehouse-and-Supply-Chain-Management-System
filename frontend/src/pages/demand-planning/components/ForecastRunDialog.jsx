import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, Box, Alert } from "@mui/material";
import ProductService from "@/services/product.service";
import FormInput from "@/components/FormInput";
import DialogButtons from "@/components/DialogButtons";

const ALGORITHMS = [
  { value: "SIMPLE_MOVING_AVERAGE", label: "Simple Moving Average (SMA)" },
];

const ForecastRunDialog = ({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    productId: "",
    algorithm: "SIMPLE_MOVING_AVERAGE",
    windowDays: 30,
    forecastDays: 30,
    startDate: new Date(),
  });

  const [products, setProducts] = useState([]);

  const [apiError, setApiError] = useState("");
  const [serverErrorField, setServerErrorField] = useState(null);

  const detectFieldFromError = (msg) => {
    if (!msg) return null;

    const msgStr = typeof msg === "string" ? msg : msg.message || String(msg);
    const lowerMsg = msgStr.toLowerCase();

    if (lowerMsg.includes("product")) return "productId";
    if (lowerMsg.includes("algorithm")) return "algorithm";
    if (lowerMsg.includes("window") || lowerMsg.includes("history")) return "windowDays";
    if (lowerMsg.includes("forecast") || lowerMsg.includes("future"))
      return "forecastDays";
    if (lowerMsg.includes("start") || lowerMsg.includes("date")) return "startDate";

    return null;
  };

  useEffect(() => {
    if (open) {
      setApiError("");
      setServerErrorField(null);

      setFormData({
        productId: "",
        algorithm: "SIMPLE_MOVING_AVERAGE",
        windowDays: 30,
        forecastDays: 30,
        startDate: new Date(),
      });

      const loadProducts = async () => {
        try {
          const res = await ProductService.getAll();
          const rawList = res?.data?.data || res?.data || [];
          const options = rawList.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.sku})`,
          }));
          setProducts(options);
        } catch (err) {
          console.error("Failed to load products", err);
        }
      };
      loadProducts();
    }
  }, [open]);

  const handleNumberKeyDown = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (serverErrorField === field) setServerErrorField(null);
  };

  const handleSubmit = async () => {
    setApiError("");
    setServerErrorField(null);

    if (!formData.productId) {
      setServerErrorField("productId");
      return;
    }
    if (!formData.windowDays || Number(formData.windowDays) <= 0) {
      setServerErrorField("windowDays");
      return;
    }
    if (!formData.forecastDays || Number(formData.forecastDays) <= 0) {
      setServerErrorField("forecastDays");
      return;
    }
    if (!formData.startDate) {
      setServerErrorField("startDate");
      return;
    }

    try {
      const dateObj = formData.startDate;
      const formattedDate = dateObj
        ? new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0]
        : "";

      const payload = {
        algorithm: formData.algorithm,
        windowDays: Number(formData.windowDays),
        forecastDays: Number(formData.forecastDays),
        startDate: formattedDate,
      };

      await onSubmit(formData.productId, payload);
      onClose();
    } catch (error) {
      const errorMsg = typeof error === "string" ? error : error.message || String(error);
      setApiError(errorMsg);
      setServerErrorField(detectFieldFromError(error));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { maxHeight: "90vh" } }}
    >
      <DialogTitle sx={{ bgcolor: "#7F408E", color: "white", fontWeight: 600 }}>
        Run Forecasting Algorithm
      </DialogTitle>

      <DialogContent dividers>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <FormInput
            type="select"
            label="Product"
            required
            options={products}
            value={formData.productId}
            onChange={(val) => handleChange("productId", val)}
            error={serverErrorField === "productId"}
            helperText={
              serverErrorField === "productId"
                ? "Product is required"
                : "Select a product to analyze"
            }
          />

          <FormInput
            type="select"
            label="Algorithm"
            required
            options={ALGORITHMS}
            value={formData.algorithm}
            onChange={(val) => handleChange("algorithm", val)}
            error={serverErrorField === "algorithm"}
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FormInput
                type="text"
                label="Window Days (History)"
                required
                value={formData.windowDays}
                onChange={(val) => handleChange("windowDays", val)}
                error={serverErrorField === "windowDays"}
                helperText={
                  serverErrorField === "windowDays"
                    ? "Invalid window days"
                    : "Days of history to analyze"
                }
                onKeyDown={handleNumberKeyDown}
                inputProps={{ type: "number", min: 1 }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormInput
                type="text"
                label="Forecast Days (Future)"
                required
                value={formData.forecastDays}
                onChange={(val) => handleChange("forecastDays", val)}
                error={serverErrorField === "forecastDays"}
                helperText={
                  serverErrorField === "forecastDays"
                    ? "Invalid forecast days"
                    : "Days to predict ahead"
                }
                onKeyDown={handleNumberKeyDown}
                inputProps={{ type: "number", min: 1 }}
              />
            </Box>
          </Box>

          <FormInput
            type="date"
            label="Start Date Prediction"
            required
            value={formData.startDate}
            onChange={(val) => handleChange("startDate", val)}
            error={serverErrorField === "startDate"}
            helperText={serverErrorField === "startDate" ? "Start Date is required" : ""}
          />
        </Box>
      </DialogContent>

      <DialogButtons
        onClose={onClose}
        onAction={handleSubmit}
        labelAction="Run"
        color="#7F408E"
      />
    </Dialog>
  );
};

export default ForecastRunDialog;
