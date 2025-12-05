import { Dialog, DialogTitle, DialogContent, Box } from "@mui/material";
import { menuItems } from "./MenuConfig";
import FormFieldsRenderer from "./FormFieldsRenderer";

const FormDialog = ({
  open,
  onClose,
  onAction,
  mode,
  selectedMenu,
  selectedRow,
}) => {
  const currentMenu = menuItems.find((item) => item.id === selectedMenu);

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
        <Box sx={{ pt: 1 }}>
          <FormFieldsRenderer
            selectedMenu={selectedMenu}
            selectedRow={selectedRow}
            mode={mode}
            onSubmit={(payload) => {
              onAction(payload);
              onClose();
            }}
            onCancel={onClose}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default FormDialog;
