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
      <DialogTitle
        sx={{
          fontWeight: 700,
          background: "#7F408E",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textTransform: "capitalize",
          letterSpacing: 0.5,
        }}
      >
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
      />
    </Dialog>
  );
};

export default ConfirmDeleteDialog;
