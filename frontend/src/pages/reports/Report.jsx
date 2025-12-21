import { menuItems } from './MenuConfig';
import Toolbar from '../../components/Toolbar';
import { Box } from '@mui/material';
import { useState } from 'react';

export default function Report() {
  const [selectedMenuId, setSelectedMenuId] = useState(menuItems[0].id);

  const selectedItem = menuItems.find((item) => item.id === selectedMenuId);

  const ReportComponent = selectedItem?.ReportComponent;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Toolbar
        menuItems={menuItems}
        selectedId={selectedMenuId}
        onSelect={setSelectedMenuId}
      />

      {ReportComponent ? <ReportComponent /> : null}
    </Box>
  );
}
