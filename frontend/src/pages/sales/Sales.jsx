import { menuItems } from './MenuConfig';
import Toolbar from '../../components/Toolbar';
import { Box } from '@mui/material';
import { useState } from 'react';
import SalesContent from './SalesContent';

export default function Sales() {
  const [selectedMenuId, setSelectedMenuId] = useState(menuItems[0].id);

  // const currentMenu = menuItems.find((item) => item.id === selectedMenuId);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Toolbar
        menuItems={menuItems}
        selectedId={selectedMenuId}
        onSelect={(id) => setSelectedMenuId(id)}
      />

      <SalesContent menuId={selectedMenuId} />
    </Box>
  );
}
