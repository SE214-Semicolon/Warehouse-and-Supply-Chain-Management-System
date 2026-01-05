import { menuItems } from './MenuConfig';
import Toolbar from '../../components/Toolbar';
import { Box } from '@mui/material';
import { useState } from 'react';
import ProcurementContent from './ProcurementContent';

export default function Procurement() {
  const [selectedMenuId, setSelectedMenuId] = useState(menuItems[0].id);

  // const currentMenu = menuItems.find((item) => item.id === selectedMenuId);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Toolbar
        menuItems={menuItems}
        selectedId={selectedMenuId}
        onSelect={(id) => setSelectedMenuId(id)}
      />

      <ProcurementContent menuId={selectedMenuId} />
    </Box>
  );
}
