import { Stack, Button } from "@mui/material";

export default function ShipmentToolbar({ menuItems, selectedMenu, onSelect }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      flexWrap="wrap"
      gap={1}
      sx={{ background: "#f5f5f5", borderRadius: 1, p: 1 }}
    >
      {menuItems.map((item) => (
        <Button
          key={item.id}
          sx={{ fontWeight: 700 }}
          color={selectedMenu === item.id ? "secondary" : "inherit"}
          startIcon={item.icon}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </Stack>
  );
}
