import { Box, Chip, Typography } from '@mui/material';
import InfoCard from '@/components/InfoCard';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { formatDate } from '../../../utils/formatDate';

export default function BasicInfoSection({
  status,
  updatedAt,
  placedAt,
  supplier,
  expectedArrival,
}) {
  const getStatusChip = (status, color) => {
    const colorStyles = {
      success: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
      },
      warning: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
      },
      error: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
      },
      info: { backgroundColor: '#dbeafe', color: '#1e40af' },
    };

    const currentStyle = colorStyles[color] || colorStyles.success;

    return (
      <Chip
        label={status}
        size="small"
        sx={{
          paddingX: 1,
          paddingY: 0.5,
          fontSize: '0.825rem',
          borderRadius: 9999,
          fontWeight: 'medium',
          backgroundColor: currentStyle.backgroundColor,
          color: currentStyle.color,
          height: 'auto',
        }}
      />
    );
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'ordered':
        return { label: 'Ordered', color: 'success' };
      case 'draft':
        return { label: 'Draft', color: 'info' };
      case 'partial':
        return { label: 'Partial', color: 'warning' };
      case 'received':
        return { label: 'Recieved', color: 'success' };
      case 'cancelled':
        return { label: 'Canceled', color: 'error' };
      default:
        return { label: status, color: 'warning' };
    }
  };

  const fields = [
    { label: 'Supplier', value: supplier.name },
    { label: 'Supplier code', value: supplier.code },
    { label: 'Status', value: status, isChip: true },
    { label: 'Order date', value: formatDate(placedAt) },
    { label: 'Expected arrival', value: formatDate(expectedArrival) },
    { label: 'Last updated', value: formatDate(updatedAt) },
  ];

  return (
    <InfoCard
      title="Shipping Information"
      icon={LocalShippingIcon}
      iconColor="blue"
    >
      <Box
        sx={{
          '& > div': {
            marginBottom: 2,
          },
          '& > div:last-child': {
            marginBottom: 0,
          },
          color: 'text.secondary',
          fontSize: '0.825rem',
        }}
      >
        {fields.map((field, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              minHeight: { xs: 32, sm: 'auto' },
            }}
          >
            <Typography
              component="strong"
              sx={{
                width: { sm: 200 },
                fontWeight: 'medium',
                color: 'text.primary',
                marginRight: 1,
                marginBottom: { xs: 0.5, sm: 0 },
                flexShrink: { xs: 0, sm: 0 },
              }}
            >
              {field.label}:
            </Typography>
            {field.isChip ? (
              getStatusChip(
                getStatusInfo(field.value).label,
                getStatusInfo(field.value).color
              )
            ) : (
              <Typography
                sx={{
                  flexGrow: 1,
                  color: 'text.secondary',
                  overflowWrap: 'break-word',
                  wordBreak: 'normal',
                }}
              >
                {field.value}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </InfoCard>
  );
}
