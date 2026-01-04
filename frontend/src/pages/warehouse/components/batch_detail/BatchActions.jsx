import { Box, Button } from "@mui/material";
import { LocalShipping } from "@mui/icons-material";

const BatchActions = ({ onAction }) => {
  return (
    <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
      <Button
        variant="contained"
        color="success"
        startIcon={<LocalShipping />}
        onClick={() => onAction("receive")}
        sx={{ px: 3, fontWeight: 600, borderRadius: 2 }}
      >
        Receive Into Warehouse
      </Button>
    </Box>
  );
};

export default BatchActions;
