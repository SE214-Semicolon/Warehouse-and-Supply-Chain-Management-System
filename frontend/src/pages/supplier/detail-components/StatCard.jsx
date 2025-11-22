import { Card, CardContent, Typography } from '@mui/material';

export default function StatCard({ stat }) {
  const colorStyles = {
    blue: {
      backgroundColor: 'primary.50',
      borderColor: 'primary.200',
      color: 'primary.700',
    },
    green: {
      backgroundColor: '#f0fdf4',
      borderColor: '#d9f99d',
      color: '#047857',
    },
    yellow: {
      backgroundColor: '#fefce8',
      borderColor: '#fde68a',
      color: '#a16207',
    },
    purple: {
      backgroundColor: '#f5f3ff',
      borderColor: '#ddd6fe',
      color: '#6d28d9',
    },
  };

  const currentStyles = colorStyles[stat.color] || colorStyles.blue;

  return (
    <Card
      sx={{
        border: 1,
        borderColor: currentStyles.borderColor,
        backgroundColor: currentStyles.backgroundColor,
        color: currentStyles.color,
        padding: 2,
        textAlign: 'center',
        transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <CardContent
        sx={{
          padding: 0,
          '&:last-child': {
            paddingBottom: 0,
          },
        }}
      >
        <Typography
          variant="h5"
          component="p"
          sx={{
            fontWeight: 'bold',
            color: currentStyles.color,
          }}
        >
          {stat.value}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.875rem',
            color: 'text.secondary',
            marginTop: 0.5,
          }}
        >
          {stat.label}
        </Typography>
      </CardContent>
    </Card>
  );
}
