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
  Link,
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';

export default function RecentPOs({ orders }) {
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
  return (
    <Card
      sx={{
        borderRadius: '1rem',
        boxShadow: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          paddingX: 3,
          paddingY: 2,
          borderBottom: 1,
          borderColor: 'grey.200',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'semibold',
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ArticleIcon
            sx={{
              color: 'orange.600',
              marginRight: 1.5,
              width: 20,
              height: 20,
            }}
          />
          Đơn hàng gần đây
        </Typography>
        <Link
          href="#"
          sx={{
            color: 'primary.main',
            '&:hover': {
              textDecoration: 'underline',
            },
            fontSize: '1rem',
            fontWeight: 'medium',
          }}
        >
          Xem tất cả &rarr;
        </Link>
      </Box>
      <TableContainer>
        <Table size="medium">
          <TableHead
            sx={{
              backgroundColor: 'grey.50',
            }}
          >
            <TableRow>
              {['Mã PO', 'Ngày đặt', 'Giá trị', 'Trạng thái', 'Hành động'].map(
                (head, index) => (
                  <TableCell
                    key={index}
                    sx={{
                      paddingX: 3,
                      paddingY: 1.5,
                      fontSize: '0.75rem',
                      fontWeight: 'medium',
                      color: 'grey.500',
                      textTransform: 'uppercase',
                      letterSpacing: 'wider',
                      borderBottom: 'none',
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
                    backgroundColor: 'grey.50',
                  },
                }}
              >
                <TableCell
                  sx={{
                    paddingX: 3,
                    paddingY: 2,
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem',
                    fontWeight: 'medium',
                    color: 'primary.main',
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
                    color: 'grey.600',
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
                    color: 'text.primary',
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
                      color: 'primary.main',
                      '&:hover': {
                        textDecoration: 'underline',
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
