import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

const Sidebar = ({ width = 264, headerHeight = 60 }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { text: 'Dashboard', path: '/' },
    { text: 'Warehouse', path: '/warehouse' },
    { text: 'Procurement', path: '/procurement' },
    { text: 'Shipment', path: '/shipment' },
    { text: 'Inventory', path: '/inventory'},
    { text: 'Reports', path: '/reports' },
    { text: 'DemandPlanning', path: '/demand-planning' },
  ];

  return (
    <Box
      sx={{
        width,
        height: `calc(100vh - ${headerHeight}px)`,
        background: 'white',
        position: 'fixed',
        top: `${headerHeight}px`,
        left: 0,
        overflowY: 'auto', // Cuộn nếu nội dung vượt quá 1024px
        borderRight: '1px solid #e0e0e0',
        zIndex: 1000,
      }}
    >
      <List
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          mt: 1,
        }}
      >
        {menuItems.map((item) => (
          <React.Fragment key={item.text}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => !item.disabled && navigate(item.path)}
                disabled={item.disabled}
                sx={{
                  borderRadius: '8px',
                  mx: 1, // margin x để cách 2 bên
                  '&.Mui-selected': {
                    '& .MuiListItemText-primary': {
                      fontWeight: 600,
                      color: 'black',
                    },
                    '&:hover': {
                      backgroundColor: '#f2f2f2',
                    },
                    backgroundColor: '#f2f2f2',
                  },
                  '&:hover': {
                    backgroundColor: item.disabled ? 'inherit' : '#f2f2f2',
                  },
                  color: item.disabled ? '#757575' : '#616161',
                }}
                selected={location.pathname === item.path}
              >
                <ListItemText
                  primary={item.text}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '14px',
                      fontWeight: 500,
                      fontFamily: 'Roboto, sans-serif',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
            {(item.text === 'Suppliers' || item.text === 'Purchase Orders') && (
              <Divider />
            )}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;
