import { Stack, Button } from '@mui/material';

export default function Toolbar({ menuItems, selectedId, onSelect }) {
  return (
    <Stack
      direction="row"
      justifyContent="flex-start"
      flexWrap="wrap"
      gap={4}
      sx={{ background: '#f5f5f5', borderRadius: 1, p: 1 }}
    >
      {menuItems.map((item) => (
        <Button
          key={item.id}
          color={selectedId === item.id ? 'secondary' : 'inherit'}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </Stack>
  );
}
