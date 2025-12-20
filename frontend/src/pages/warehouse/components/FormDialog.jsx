import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, Box, Alert } from "@mui/material";
import { menuItems } from "./MenuConfig";
import FormFieldsRenderer from "./FormFieldsRenderer";

const FormDialog = ({ open, onClose, onAction, mode, selectedMenu, selectedRow }) => {
  const currentMenu = menuItems.find((item) => item.id === selectedMenu);

  const [apiError, setApiError] = useState("");
  const [serverErrorField, setServerErrorField] = useState(null);

  useEffect(() => {
    if (open) {
      setApiError("");
      setServerErrorField(null);
    }
  }, [open]);

  const detectFieldFromError = (msg) => {
    if (!msg) return null;
    // Convert msg to string in case it's an Error object
    const msgStr = typeof msg === 'string' ? msg : msg.message || String(msg);
    const lowerMsg = msgStr.toLowerCase();

    if (lowerMsg.includes("sku")) return "sku";
    if (lowerMsg.includes("barcode")) return "barcode";
    if (lowerMsg.includes("code")) return "code";
    if (lowerMsg.includes("name")) return "name";
    if (lowerMsg.includes("email")) return "email";

    return null;
  };

  const handleSubmit = async (payload) => {
    setApiError("");
    setServerErrorField(null);

    try {
      await onAction(payload);
      onClose();
    } catch (error) {
      // Convert error to string for display
      const errorMsg = typeof error === 'string' ? error : error.message || String(error);
      setApiError(errorMsg);
      setServerErrorField(detectFieldFromError(error));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: "520px", maxHeight: "90vh" } }}
    >
      <DialogTitle sx={{ bgcolor: "#7F408E", color: "white", fontWeight: 600 }}>
        {mode === "add"
          ? `Add ${currentMenu?.label || ""}`
          : `Edit ${selectedRow?.name || ""}`}
      </DialogTitle>

      <DialogContent dividers>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <Box sx={{ pt: apiError ? 0 : 1 }}>
          <FormFieldsRenderer
            selectedMenu={selectedMenu}
            selectedRow={selectedRow}
            mode={mode}
            onSubmit={handleSubmit}
            onCancel={onClose}
            serverErrorField={serverErrorField}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default FormDialog;
