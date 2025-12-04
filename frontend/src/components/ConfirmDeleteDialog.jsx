import { Dialog, DialogTitle, DialogContent, Typography } from "@mui/material";
import DialogButtons from "@/components/DialogButtons";

const ConfirmDeleteDialog = ({ open, onClose, onConfirm, selectedRow }) => {
  const itemName =
    selectedRow?.name || selectedRow?.code || selectedRow?.id || "";

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
        <Typography>
          Are you sure you want to delete <strong>{itemName}</strong>?
        </Typography>
      </DialogContent>

      <DialogButtons
        onClose={onClose}
        onAction={onConfirm}
        labelAction="Delete"
        colorAction="#D32F2F"
        colorCancel="#D32F2F"
      />
    </Dialog>
  );
};

export default ConfirmDeleteDialog;
