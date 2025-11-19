import { Card, CardContent, Typography } from '@mui/material';

export default function StatCard({ stat }) {
  // Định nghĩa màu sắc nền, border và chữ sử dụng các giá trị từ theme MUI hoặc mã hex/tên màu cố định
  const colorStyles = {
    blue: {
      backgroundColor: 'primary.50', // Tương đương bg-blue-50 (Giả định theme có màu sắc tùy chỉnh)
      borderColor: 'primary.200', // Tương đương border-blue-200
      color: 'primary.700', // Tương đương text-blue-700
    },
    green: {
      backgroundColor: '#f0fdf4', // Tương đương bg-green-50
      borderColor: '#d9f99d', // Tương đương border-green-200
      color: '#047857', // Tương đương text-green-700
    },
    yellow: {
      backgroundColor: '#fefce8', // Tương đương bg-yellow-50
      borderColor: '#fde68a', // Tương đương border-yellow-200
      color: '#a16207', // Tương đương text-yellow-700
    },
    purple: {
      backgroundColor: '#f5f3ff', // Tương đương bg-purple-50
      borderColor: '#ddd6fe', // Tương đương border-purple-200
      color: '#6d28d9', // Tương đương text-purple-700
    },
  };

  // Lấy style cho màu sắc hiện tại
  const currentStyles = colorStyles[stat.color] || colorStyles.blue; // Mặc định là blue nếu không tìm thấy

  return (
    <Card
      sx={{
        border: 1, // border
        borderColor: currentStyles.borderColor,
        backgroundColor: currentStyles.backgroundColor,
        color: currentStyles.color,
        padding: 2, // p-4
        textAlign: 'center', // text-center
        transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms', // transition
        '&:hover': {
          boxShadow: 3, // hover:shadow-lg (Sử dụng shadow level 3 của MUI)
        },
      }}
    >
      <CardContent
        sx={{
          padding: 0, // p-0
          '&:last-child': {
            paddingBottom: 0, // Đảm bảo không có padding bottom mặc định của CardContent
          },
        }}
      >
        <Typography
          variant="h5"
          component="p"
          sx={{
            fontWeight: 'bold', // font-bold
            color: currentStyles.color, // Đảm bảo màu chữ khớp với style
          }}
        >
          {stat.value}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.875rem', // text-sm
            color: 'text.secondary', // text-gray-600
            marginTop: 0.5, // mt-1
          }}
        >
          {stat.label}
        </Typography>
      </CardContent>
    </Card>
  );
}
