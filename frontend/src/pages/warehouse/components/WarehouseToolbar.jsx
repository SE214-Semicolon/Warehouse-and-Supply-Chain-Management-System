import { Stack, Button, Paper } from "@mui/material"; // Nhớ import Paper

export default function WarehouseToolbar({
  menuItems,
  selectedMenu,
  onSelect,
}) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 1,
        borderRadius: 2,
        bgcolor: "background.paper",
        mb: 2,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        // gap={7}
      >
        {menuItems.map((item) => {
          const isActive = selectedMenu === item.id;

          return (
            <Button
              key={item.id}
              startIcon={item.icon}
              onClick={() => onSelect(item.id)}
              sx={{
                color: isActive ? "primary.main" : "text.secondary",
                fontWeight: isActive ? 600 : 500,
                fontSize: "14.5px",
                position: "relative",
                borderRadius: 1,
                px: 2,
                py: 1,
                "&:hover": {
                  backgroundColor: "action.hover",
                },
                "::after": {
                  content: '""',
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: 4,
                  height: "3px",
                  borderRadius: "3px",
                  backgroundColor: isActive ? "primary.main" : "transparent",
                  transition: "0.2s scaleX",
                  transform: isActive ? "scaleX(1)" : "scaleX(0)",
                },
              }}
            >
              {item.label}
            </Button>
          );
        })}
      </Stack>
    </Paper>
  );
}
