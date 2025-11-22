import { Card, CardContent, Typography } from '@mui/material';

export default function InfoCard({
  title,
  icon: Icon,
  children,
  iconColor = 'primary',
}) {
  const iconColorMap = {
    primary: 'primary.main',
    blue: 'primary.main',
    green: '#059669',
    orange: '#ea580c',
  };

  const getIconColor = (color) => {
    return iconColorMap[color] || color;
  };

  return (
    <Card
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: '1rem',
        boxShadow: 2,
      }}
    >
      <CardContent
        sx={{
          padding: 3,
          '&:last-child': {
            paddingBottom: 3,
          },
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'semibold',
            marginBottom: 2,
            display: 'flex',
            alignItems: 'center',
            color: 'text.primary',
          }}
        >
          {Icon && (
            <Icon
              sx={{
                marginRight: 1.5,
                width: 20,
                height: 20,
                color: getIconColor(iconColor),
              }}
            />
          )}
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}
