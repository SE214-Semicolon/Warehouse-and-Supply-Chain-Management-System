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
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import { formatDate } from '../../../utils/formatDate';
import { Link as RouterLink } from 'react-router-dom';

const uri = '/purchase-order/detail';

export default function RecentPOs({ orders, isLoading }) {
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
          Purchase Order List
        </Typography>
      </Box>
      <TableContainer>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <Typography>Haven't order any POs yet</Typography>
          </Box>
        ) : (
          <Table size="medium">
            <TableHead
              sx={{
                backgroundColor: 'grey.50',
              }}
            >
              <TableRow>
                {['Code', 'Created At', 'Total', 'Status', 'Details'].map(
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
              {orders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                return (
                  <TableRow
                    key={order.id}
                    hover
                    sx={{ '&:hover': { backgroundColor: 'grey.50' } }}
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
                      {order.poNo}
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
                      {formatDate(order.createdAt)}
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
                      {Number(order.totalAmount).toLocaleString()}
                    </TableCell>
                    <TableCell
                      sx={{ paddingX: 3, paddingY: 2, whiteSpace: 'nowrap' }}
                    >
                      {getStatusChip(statusInfo.label, statusInfo.color)}
                    </TableCell>
                    <TableCell
                      sx={{
                        paddingX: 3,
                        paddingY: 2,
                        whiteSpace: 'nowrap',
                        fontSize: '0.875rem',
                      }}
                    >
                      <RouterLink
                        to={uri}
                        state={{ id: order.id, row: order }}
                        style={{
                          color: '#1976d2',
                          textDecoration: 'none',
                          fontWeight: 'medium',
                        }}
                        onMouseOver={(e) =>
                          (e.target.style.textDecoration = 'underline')
                        }
                        onMouseOut={(e) =>
                          (e.target.style.textDecoration = 'none')
                        }
                      >
                        View Details
                      </RouterLink>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Card>
  );
}
