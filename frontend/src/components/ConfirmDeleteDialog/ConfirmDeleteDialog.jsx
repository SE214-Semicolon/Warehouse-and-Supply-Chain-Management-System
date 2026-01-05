import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Alert,
} from "@mui/material";
import DialogButtons from "@/components/DialogButtons";
import { useState, useEffect } from "react";

const ConfirmDeleteDialog = ({ open, onClose, onConfirm, selectedRow }) => {
  const [error, setError] = useState("");

  const itemName =
    selectedRow?.name || selectedRow?.code || selectedRow?.batchNo || "";

  const handleAction = async () => {
    setError("");
    try {
      await onConfirm();
    } catch (msg) {
      setError(msg);
    }
  };

  useEffect(() => {
    if (!open) setError("");
  }, [open]);

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
      <DialogTitle sx={{ bgcolor: "#D32F2F", color: "white", fontWeight: 600 }}>
        Delete Confirmation
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography>
          Are you sure you want to delete <strong>{itemName}</strong>?
        </Typography>
      </DialogContent>

      <DialogButtons
        onClose={onClose}
        onAction={handleAction}
        labelAction="Delete"
        colorAction="#D32F2F"
        colorCancel="#D32F2F"
      />
    </Dialog>
  );
};

export default ConfirmDeleteDialog;
