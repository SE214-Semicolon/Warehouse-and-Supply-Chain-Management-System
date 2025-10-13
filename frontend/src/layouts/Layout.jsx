import Header from './Header';
import Footer from './Footer';
import Sidebar from '@components/Sidebar';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

export default function Layout() {
  const sidebarWidth = 208;
  const headerHeight = 48;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header height={headerHeight} />

      <Box
        sx={{
          display: 'flex',
          flex: 1,
          marginTop: `${headerHeight}px`,
          height: `calc(100vh - ${headerHeight}px)`,
        }}
      >
        <Sidebar width={sidebarWidth} headerHeight={headerHeight + 1} />
        <Box
          component="main"
          sx={{
            flex: 1,
            marginLeft: `${sidebarWidth}px`,
            overflowY: 'auto',
            backgroundColor: '#fafafa',
            p: 3,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
