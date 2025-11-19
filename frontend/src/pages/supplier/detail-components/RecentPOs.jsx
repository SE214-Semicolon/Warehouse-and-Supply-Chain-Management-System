import {
  Chip,
  Card,
  Box,
  Typography,
  TableContainer,
  TableHead,
  TableRow,
  Table,
  TableBody,
  TableCell,
  Link, // Đã thêm Link vào import
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';

export default function RecentPOs({ orders }) {
  const getStatusChip = (status, color) => {
    const colorStyles = {
      success: {
        backgroundColor: '#d1fae5', // bg-green-100
        color: '#065f46', // text-green-800
      },
      warning: {
        backgroundColor: '#fef3c7', // bg-yellow-100
        color: '#92400e', // text-yellow-800
      },
      error: {
        backgroundColor: '#fee2e2', // bg-red-100
        color: '#991b1b', // text-red-800
      },
    };
    const currentStyle = colorStyles[color] || colorStyles.success;

    return (
      <Chip
        label={status}
        size="small"
        sx={{
          paddingX: 1, // px-1
          paddingY: 0.5, // py-1
          fontSize: '0.75rem', // text-xs
          borderRadius: 9999, // rounded-full
          fontWeight: 'medium', // font-medium
          backgroundColor: currentStyle.backgroundColor,
          color: currentStyle.color,
          height: 'auto', // Đảm bảo Chip có thể co giãn theo padding
        }}
      />
    );
  };
  return (
    <Card
      sx={{
        borderRadius: '1rem', // rounded-xl
        boxShadow: 2, // shadow-md
        overflow: 'hidden', // overflow-hidden
      }}
    >
      <Box
        sx={{
          paddingX: 3, // px-6
          paddingY: 2, // py-4
          borderBottom: 1,
          borderColor: 'grey.200', // border-gray-200
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white', // bg-white
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'semibold', // font-semibold
            color: 'text.primary', // text-gray-800
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ArticleIcon
            sx={{
              color: 'orange.600', // text-orange-600
              marginRight: 1.5, // mr-3
              width: 20, // w-5
              height: 20, // h-5
            }}
          />
          Đơn hàng gần đây
        </Typography>
        <Link
          href="#"
          sx={{
            color: 'primary.main', // text-blue-600
            '&:hover': {
              textDecoration: 'underline', // hover:underline
            },
            fontSize: '0.875rem', // text-sm
            fontWeight: 'medium', // font-medium
          }}
        >
          Xem tất cả &rarr;
        </Link>
      </Box>
      <TableContainer>
        <Table size="medium">
          <TableHead
            sx={{
              backgroundColor: 'grey.50', // bg-gray-50
            }}
          >
            <TableRow>
              {['Mã PO', 'Ngày đặt', 'Giá trị', 'Trạng thái', 'Hành động'].map(
                (head, index) => (
                  <TableCell
                    key={index}
                    sx={{
                      paddingX: 3, // px-6
                      paddingY: 1.5, // py-3
                      fontSize: '0.75rem', // text-xs
                      fontWeight: 'medium', // font-medium
                      color: 'grey.500', // text-gray-500
                      textTransform: 'uppercase', // uppercase
                      letterSpacing: 'wider', // tracking-wider
                      borderBottom: 'none', // Bỏ border bottom mặc định của Cell
                    }}
                  >
                    {head}
                  </TableCell>
                )
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order, index) => (
              <TableRow
                key={index}
                hover
                sx={{
                  '&:hover': {
                    backgroundColor: 'grey.50', // hover:bg-gray-50
                  },
                }}
              >
                <TableCell
                  sx={{
                    paddingX: 3,
                    paddingY: 2,
                    whiteSpace: 'nowrap', // whitespace-nowrap
                    fontSize: '0.875rem', // text-sm
                    fontWeight: 'medium',
                    color: 'primary.main', // text-blue-600
                  }}
                >
                  {order.id}
                </TableCell>
                <TableCell
                  sx={{
                    paddingX: 3,
                    paddingY: 2,
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem',
                    color: 'grey.600', // text-gray-600
                  }}
                >
                  {order.date}
                </TableCell>
                <TableCell
                  sx={{
                    paddingX: 3,
                    paddingY: 2,
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem',
                    color: 'text.primary', // text-gray-800
                  }}
                >
                  {order.value}
                </TableCell>
                <TableCell
                  sx={{
                    paddingX: 3,
                    paddingY: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getStatusChip(order.status, order.statusColor)}
                </TableCell>
                <TableCell
                  sx={{
                    paddingX: 3,
                    paddingY: 2,
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem',
                  }}
                >
                  <Link
                    href="#"
                    sx={{
                      color: 'primary.main', // text-blue-600
                      '&:hover': {
                        textDecoration: 'underline', // hover:underline
                      },
                    }}
                  >
                    Xem chi tiết
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
