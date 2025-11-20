import QueryStatsIcon from '@mui/icons-material/QueryStats';
import { Box, Typography, Rating, LinearProgress } from '@mui/material';
import InfoCard from '@/components/InfoCard';

export default function PerformaceSection({ performance }) {
  const getProgressColor = (percentage) => {
    if (percentage >= 90) return '#10b981';
    if (percentage >= 80) return '#10b981';
    if (percentage >= 70) return '#f59e0b';
    return '#f97316';
  };

  return (
    <InfoCard
      title="Đánh giá hiệu suất"
      icon={QueryStatsIcon}
      iconColor="green"
    >
      <Box
        sx={{
          textAlign: 'center',
          marginBottom: 3,
        }}
      >
        <Typography
          variant="h3"
          component="div"
          sx={{
            fontWeight: 'bold',
            color: 'primary.main',
          }}
        >
          {performance.rating.toFixed(1)}
        </Typography>
        <Rating
          name="supplier-rating"
          value={performance.rating}
          precision={0.1}
          readOnly
          sx={{
            marginTop: 1,
            color: '#f59e0b',
          }}
        />
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            marginTop: 0.5,
          }}
        >
          trên {performance.totalReviews} đánh giá
        </Typography>
      </Box>

      <Box
        sx={{
          '& > div': {
            marginBottom: 1.5,
          },
          '& > div:last-child': {
            marginBottom: 0,
          },
        }}
      >
        {performance.metrics.map((metric, index) => (
          <Box key={index}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                marginBottom: 0.5,
              }}
            >
              <Typography variant="body2">{metric.name}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {metric.percentage}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={metric.percentage}
              sx={{
                height: 12,
                borderRadius: 9999,
                backgroundColor: 'grey.300',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getProgressColor(metric.percentage),
                },
              }}
            />
          </Box>
        ))}
      </Box>
    </InfoCard>
  );
}
