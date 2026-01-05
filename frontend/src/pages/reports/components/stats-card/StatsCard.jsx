import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const StatsCard = ({
  title,
  value,
  icon,
  color = '#6366f1',
  bgColor = `${color}15`,
  iconColor = color,
  valueColor = 'text.primary',
  size = 'default',
}) => {
  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        },
      }}
    >
      <CardContent
        sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 3 }}
      >
        <Box
          sx={{
            p: 2,
            bgcolor: bgColor,
            borderRadius: 3,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 56,
            height: 56,
          }}
        >
          {React.cloneElement(icon, { size: 28 })}
        </Box>

        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            fontWeight="500"
            sx={{ mb: 0.5 }}
          >
            {title}
          </Typography>
          <Typography
            variant={size === 'large' ? 'h4' : 'h5'}
            fontWeight="800"
            color={valueColor}
          >
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
