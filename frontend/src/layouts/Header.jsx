import { Box, IconButton, Avatar, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Header({ height = 60 }) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        width: '100%',
        height,
        bgcolor: '#ffffff',
        position: 'fixed',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
        top: '0',
      }}
    >
      <Typography
        sx={{
          marginLeft: '5px',
          color: 'primary.main',
          fontWeight: 'bold',
          fontSize: '18px',
          userSelect: 'none',
        }}
      >
        WSCMS
      </Typography>
      <Avatar
        alt="User Avatar"
        src="/path/to/avatar.jpg"
        sx={{
          width: '32px',
          height: '32px',
          '&:hover': {
            cursor: 'pointer',
            border: 'solid black 0.1px',
          },
          marginRight: '20px',
        }}
        onClick={() => navigate('/profile')}
      />
    </Box>
  );
}
