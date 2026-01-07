import { menuItems } from './MenuConfig';
import Toolbar from '../../components/Toolbar';
import { Box } from '@mui/material';
import { useState } from 'react';
import SalesContent from './SalesContent';

export default function Sales() {
  const [selectedMenuId, setSelectedMenuId] = useState(menuItems[0].id);

  const handleSelectMenu = (menuId) => {
    setSelectedMenuId(menuId);
    localStorage.setItem('selectedMenu', menuId);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Toolbar
        menuItems={menuItems}
        selectedId={selectedMenuId}
        onSelect={(id) => handleSelectMenu(id)}
      />

      <SalesContent menuId={selectedMenuId} />
    </Box>
  );
}
