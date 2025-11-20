import { Box, Chip, Typography } from '@mui/material';
import InfoCard from '@/components/InfoCard';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

export default function BasicInfoSection({
  status,
  statusColor,
  updatedAt,
  placedAt,
  supplier,
  expectedArrival,
}) {
  const statusColorMap = {
    success: { bg: '#d1fae5', text: '#065f46' },
    warning: { bg: '#fef3c7', text: '#92400e' },
    error: { bg: '#fee2e2', text: '#991b1b' },
  };

  const currentStatusStyle =
    statusColorMap[statusColor] || statusColorMap.warning;

  const fields = [
    { label: 'Nhà cung cấp', value: supplier.name },
    { label: 'Mã NCC', value: supplier.code },
    { label: 'Trạng thái', value: status, isChip: true },
    { label: 'Ngày đặt hàng', value: placedAt },
    { label: 'Ngày giao hàng dự kiến', value: expectedArrival },
    { label: 'Cập nhật lần cuối', value: updatedAt },
  ];

  return (
    <InfoCard
      title="Thông tin giao hàng"
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
              <Chip
                label={field.value}
                size="medium"
                sx={{
                  backgroundColor: currentStatusStyle.bg,
                  color: currentStatusStyle.text,
                  fontSize: '1rem',
                  fontWeight: 'medium',
                  height: 'auto',
                  borderRadius: '0px',
                }}
              />
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
