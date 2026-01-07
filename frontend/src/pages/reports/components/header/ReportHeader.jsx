import React from 'react';
import { Box, Typography, Stack, Button } from '@mui/material';
import { RefreshCcw } from 'lucide-react';

const ReportHeader = ({
  title,
  subtitle,
  icon: IconComponent,
  iconColor = '#fff',
  iconBgColor = '#2563eb',
  showRefresh = true,
  onRefresh,
  extraActions,
}) => {
  return (
    <Box
      sx={{
        mb: 4,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            p: 1.5,
            bgcolor: iconBgColor,
            borderRadius: 3,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {IconComponent && <IconComponent size={28} />}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight="900" color="#1e293b">
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center">
        {extraActions}

        {showRefresh && (
          <Button
            variant="contained"
            startIcon={<RefreshCcw size={18} />}
            onClick={onRefresh}
            sx={{
              borderRadius: 2.5,
              bgcolor: '#2563eb',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#1d4ed8' },
            }}
          >
            Refresh
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default ReportHeader;
