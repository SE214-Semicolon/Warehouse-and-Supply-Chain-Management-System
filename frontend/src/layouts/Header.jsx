import { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Avatar,
  Typography,
  Badge,
  Tooltip,
  Stack,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Logout } from '@mui/icons-material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AlertService from '@/services/alert.service';
import AuthService from '@/services/auth.service';
import UserService from '@/services/user.service';

export default function Header({ height = 60 }) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [user, setUser] = useState({ email: '', role: '' });

  useEffect(() => {
    const loadUser = async () => {
      const data = await UserService.getCurrentUser();
      if (data) setUser(data);
    };
    loadUser();
  }, []);

  const handleOpenMenu = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleCloseMenu();
    await AuthService.logout();
  };

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await AlertService.getUnreadCount();
        if (res && typeof res.unreadCount === 'number') {
          setUnreadCount(res.unreadCount);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchUnreadCount();

    // tự động cập nhật mỗi nửa phút
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      component="header"
      sx={{
        width: '100%',
        height: height,
        bgcolor: '#ffffff',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 3,
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography
          variant="h6"
          sx={{
            color: 'primary.main',
            fontWeight: 'bold',
            userSelect: 'none',
            cursor: 'pointer',
            lineHeight: 1,
          }}
          onClick={() => navigate('/warehouse')}
        >
          WSCMS
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} alignItems="center">
        <Tooltip title="Alerts">
          <IconButton onClick={() => navigate('/alerts')} size="large">
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <NotificationsIcon color="action" />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Account settings">
          <Avatar
            onClick={handleOpenMenu}
            sx={{
              width: 36,
              height: 36,
              cursor: 'pointer',
              border: '1px solid #e0e0e0',
            }}
          />
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          PaperProps={{
            elevation: 3,
            sx: { borderRadius: 2, mt: 1.5, minWidth: 200 },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
              {user.email || 'Guest'}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textTransform: 'capitalize' }}
            >
              Role: {user.role || 'N/A'}
            </Typography>
          </Box>

          <Divider />

          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Logout fontSize="small" color="error" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Stack>
    </Box>
  );
}
