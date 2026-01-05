import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Alert,
  Autocomplete,
  TextField,
} from "@mui/material";
import ProductService from "@/services/product.service";
import FormInput from "@/components/FormInput";
import DialogButtons from "@/components/DialogButtons";

const ALGORITHM_OPTIONS = [
  "MANUAL_ENTRY",
  "SIMPLE_MOVING_AVERAGE",
  "EXPONENTIAL_SMOOTHING",
  "LINEAR_REGRESSION",
];

const ForecastFormDialog = ({ open, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    productId: "",
    forecastDate: null,
    forecastedQuantity: "",
    algorithmUsed: "",
  });

  const [products, setProducts] = useState([]);
  const [apiError, setApiError] = useState("");

  const [serverErrorField, setServerErrorField] = useState(null);

  const detectFieldFromError = (msg) => {
    if (!msg) return null;
    const msgStr = typeof msg === "string" ? msg : msg.message || String(msg);
    const lowerMsg = msgStr.toLowerCase();
    if (lowerMsg.includes("product")) return "productId";
    if (lowerMsg.includes("date")) return "forecastDate";
    if (lowerMsg.includes("quantity")) return "forecastedQuantity";
    if (lowerMsg.includes("algorithm")) return "algorithmUsed";
    return null;
  };

  useEffect(() => {
    if (open) {
      setApiError("");
      setServerErrorField(null);

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

      if (initialData) {
        setFormData({
          productId: initialData.product?.id || initialData.productId || "",
          forecastDate: initialData.forecastDate
            ? new Date(initialData.forecastDate)
            : null,
          forecastedQuantity: initialData.forecastedQuantity,
          algorithmUsed: initialData.algorithmUsed || "MANUAL_ENTRY",
        });
      } else {
        setFormData({
          productId: "",
          forecastDate: new Date(),
          forecastedQuantity: "",
          algorithmUsed: "MANUAL_ENTRY",
        });
      }
    }
  }, [open, initialData]);

  // chặn ký tự
  const handleNumberKeyDown = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async () => {
    setApiError("");
    setServerErrorField(null);

    if (!formData.productId) {
      setServerErrorField("productId");
      return;
    }
    if (!formData.forecastDate) {
      setServerErrorField("forecastDate");
      return;
    }

    if (formData.forecastedQuantity === "" || Number(formData.forecastedQuantity) < 0) {
      setServerErrorField("forecastedQuantity");
      return;
    }

    if (!formData.algorithmUsed) {
      setServerErrorField("algorithmUsed");
      return;
    }

    try {
      const dateObj = formData.forecastDate;
      const formattedDate = dateObj
        ? new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0]
        : "";

      const payload = {
        productId: formData.productId,
        forecastDate: formattedDate,
        forecastedQuantity: Number(formData.forecastedQuantity),
        algorithmUsed: formData.algorithmUsed,
      };

      await onSubmit(payload);
      onClose();
    } catch (error) {
      const errorMsg = typeof error === "string" ? error : error.message || String(error);
      setApiError(errorMsg);
      setServerErrorField(detectFieldFromError(error));
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (serverErrorField === field) setServerErrorField(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: "520px", maxHeight: "90vh" } }}
    >
      <DialogTitle sx={{ bgcolor: "#7F408E", color: "white", fontWeight: 600 }}>
        {initialData ? "Edit Forecast" : "Add Manual Forecast"}
      </DialogTitle>

      <DialogContent dividers>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Box sx={{ flex: 1 }}>
            <FormInput
              type="select"
              label="Product"
              required
              options={products}
              value={formData.productId}
              onChange={(val) => handleChange("productId", val)}
              error={serverErrorField === "productId"}
              helperText={serverErrorField === "productId" ? "Product is required" : ""}
              disabled={!!initialData}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FormInput
                type="date"
                label="Forecast Date"
                required
                value={formData.forecastDate}
                onChange={(val) => handleChange("forecastDate", val)}
                error={serverErrorField === "forecastDate"}
                helperText={serverErrorField === "forecastDate" ? "Date is required" : ""}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormInput
                type="text"
                label="Quantity"
                required
                value={formData.forecastedQuantity}
                onChange={(val) => handleChange("forecastedQuantity", val)}
                error={serverErrorField === "forecastedQuantity"}
                helperText={
                  serverErrorField === "forecastedQuantity"
                    ? "Required & positive number"
                    : ""
                }
                // --- CHẶN KÝ TỰ & CHẶN SỐ ÂM ---
                onKeyDown={handleNumberKeyDown}
                inputProps={{
                  type: "number",
                  min: 0,
                  step: "1",
                }}
              />
            </Box>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Autocomplete
              freeSolo
              options={ALGORITHM_OPTIONS}
              value={formData.algorithmUsed}
              onInputChange={(_, newInputValue) => {
                handleChange("algorithmUsed", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Algorithm Used"
                  required
                  error={serverErrorField === "algorithmUsed"}
                  helperText={
                    serverErrorField === "algorithmUsed"
                      ? "Algorithm is required"
                      : "Select or type custom algorithm"
                  }
                  sx={{
                    "& label.Mui-focused": { color: "#7F408E" },
                    "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                      borderColor: "#7F408E",
                    },
                  }}
                />
              )}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogButtons
        onClose={onClose}
        onAction={handleSubmit}
        labelAction="Save"
        color="#7F408E"
      />
    </Dialog>
  );
};

export default ForecastFormDialog;
