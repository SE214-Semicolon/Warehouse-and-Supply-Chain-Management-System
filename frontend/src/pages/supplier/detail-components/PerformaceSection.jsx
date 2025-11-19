import QueryStatsIcon from '@mui/icons-material/QueryStats';
import { Box, Typography, Rating, LinearProgress } from '@mui/material';
import InfoCard from './InfoCard';

export default function PerformaceSection({ performance }) {
  // Hàm này trả về màu hex hoặc tên màu theme MUI dựa trên phần trăm
  const getProgressColor = (percentage) => {
    // Sử dụng màu cố định tương đương với Tailwind 500
    if (percentage >= 90) return '#10b981'; // green-500
    if (percentage >= 80) return '#10b981'; // green-500 (giữ nguyên logic gốc)
    if (percentage >= 70) return '#f59e0b'; // yellow-500
    return '#f97316'; // orange-500
  };

  return (
    <InfoCard
      title="Đánh giá hiệu suất"
      icon={QueryStatsIcon}
      iconColor="green"
    >
      <Box
        sx={{
          textAlign: 'center', // text-center
          marginBottom: 3, // mb-6
        }}
      >
        <Typography
          variant="h3"
          component="div"
          sx={{
            fontWeight: 'bold', // font-bold
            color: 'primary.main', // text-blue-600 (sử dụng màu primary của theme)
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
            marginTop: 1, // mt-2 (tương đương 8px, 1 * 8 = 8px)
            color: '#f59e0b', // text-yellow-500 (màu vàng cố định cho Rating)
          }}
        />
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary', // text-gray-600
            marginTop: 0.5, // mt-1
          }}
        >
          trên {performance.totalReviews} đánh giá
        </Typography>
      </Box>

      <Box
        sx={{
          '& > div': {
            marginBottom: 1.5, // space-y-3 (1.5 * 8 = 12px)
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
                display: 'flex', // flex
                justifyContent: 'space-between', // justify-between
                fontSize: '0.875rem', // text-sm
                marginBottom: 0.5, // mb-1
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
                height: 12, // h-3 (12px)
                borderRadius: 9999, // rounded-full
                backgroundColor: 'grey.300', // bg-gray-200
                // Áp dụng màu động trực tiếp cho thanh tiến trình
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
