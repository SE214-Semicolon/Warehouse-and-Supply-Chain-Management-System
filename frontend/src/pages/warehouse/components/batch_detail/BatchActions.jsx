import { Box, Button } from "@mui/material";
import {
  LocalShipping,
  Inventory2,
  SwapHoriz,
  BookmarkBorder,
  LockOpen,
} from "@mui/icons-material";

const BatchActions = ({ onAction }) => {
  const actions = [
    {
      type: "receive",
      label: "Receive",
      icon: <LocalShipping />,
      color: "success",
    },
    {
      type: "dispatch",
      label: "Dispatch",
      icon: <Inventory2 />,
      color: "error",
    },
    { type: "transfer", label: "Transfer", icon: <SwapHoriz />, color: "info" },
    {
      type: "reserve",
      label: "Reserve",
      icon: <BookmarkBorder />,
      color: "warning",
    },
    { type: "release", label: "Release", icon: <LockOpen />, color: "inherit" },
  ];

  return (
    <Box sx={{ mb: 3, display: "flex", justifyContent: "center", gap: 3, flexWrap: "wrap" }}>
      {actions.map((act) => (
        <Button
          key={act.type}
          variant="outlined"
          color={act.color === "inherit" ? "primary" : act.color}
          startIcon={act.icon}
          onClick={() => onAction(act.type)}
          sx={{
            borderColor:
              act.color === "inherit" ? undefined : `${act.color}.main`,
          }}
        >
          {act.label}
        </Button>
      ))}
    </Box>
  );
};

export default BatchActions;
