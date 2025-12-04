import { Button, Box } from "@mui/material";

export default function DialogButtons({
  onClose,
  onAction,
  labelAction = "Save",
  color = "#7F408E",
  colorAction,
  colorCancel,
}) {
  const primary = colorAction || color;
  const secondary = colorCancel || color;

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
          borderColor: secondary,
          color: secondary,
          "&:hover": {
            color: secondary + "cc",
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
          background: primary,
          color: "#fff",
          "&:hover": {
            background: primary + "cc",
          },
        }}
      >
        {labelAction}
      </Button>
    </Box>
  );
}
