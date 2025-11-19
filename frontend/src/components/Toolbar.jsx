import { Stack, Button } from '@mui/material';

export default function Toolbar({ menuItems, selectedMenu, onSelect }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      flexWrap="wrap"
      gap={1}
      sx={{ background: '#f5f5f5', borderRadius: 1, p: 1 }}
    >
      {menuItems.map((item) => (
        <Button
          key={item.id}
          color={selectedMenu === item.id ? 'secondary' : 'inherit'}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </Stack>
  );
}
