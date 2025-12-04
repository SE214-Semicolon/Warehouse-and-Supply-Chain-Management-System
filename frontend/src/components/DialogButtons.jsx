import { Button, Box } from "@mui/material";

export default function DialogButtons({
  onClose,
  onAction,
  labelAction = "Save",
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        gap: 3,
        padding: "16px 24px",
      }}
    >
      <Button
        disableRipple
        onClick={onClose}
        variant="outlined"
        sx={{
          width: "90px",
          borderColor: "#7F408E",
          color: "#7F408E",
          "&:hover": {
            color: "#672f75ff",
          },
        }}
      >
        Cancel
      </Button>

      <Button
        variant="contained"
        onClick={onAction}
        sx={{
          width: "90px",
          background: "#7F408E",
          color: "#fff",
          "&:hover": {
            background: "#6a2f7d",
          },
        }}
      >
        {labelAction}
      </Button>
    </Box>
  );
}
