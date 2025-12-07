import { Stack, Button } from "@mui/material";

export default function WarehouseToolbar({
  menuItems,
  selectedMenu,
  onSelect,
}) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      // gap={7}
      sx={{
        background: "#fafafa",
        borderRadius: 1,
        p: 1.5,
        border: "1px solid #eee",
      }}
    >
      {menuItems.map((item) => {
        const isActive = selectedMenu === item.id;

        return (
          <Button
            key={item.id}
            startIcon={item.icon}
            onClick={() => onSelect(item.id)}
            sx={{
              color: isActive ? "primary.main" : "text.primary",
              fontWeight: isActive ? 600 : 400,
              fontSize: "14.5px",
              position: "relative",
              borderRadius: 0,
              px: 2,
              py: 1,
              "&:hover": {
                backgroundColor: "rgba(25,118,210,0.08)",
              },
              "&::after": {
                content: '""',
                position: "absolute",
                left: 8,
                right: 8,
                bottom: 0,
                height: "3px",
                borderRadius: "3px",
                backgroundColor: isActive ? "primary.main" : "transparent",
                transition: "0.2s",
              },
            }}
          >
            {item.label}
          </Button>
        );
      })}
    </Stack>
  );
}
