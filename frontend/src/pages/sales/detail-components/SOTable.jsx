import {
  Card,
  Box,
  Typography,
  TableContainer,
  TableHead,
  TableRow,
  Table,
  TableBody,
  TableCell,
  Button,
  Chip,
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import FulfillDialog from './FulfillDialog';
import { useState } from 'react';

export default function SOTable({
  items = [],
  onSOUpdated,
  canFulfill = true,
}) {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleOpenFulfill = (item) => {
    setSelectedItem(item);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
  };

  const handleFulfillSuccess = (updatedSO) => {
    onSOUpdated(updatedSO);
  };

  if (!items || items.length === 0) {
    return (
      <Card
        sx={{ borderRadius: '1rem', boxShadow: 2, p: 4, textAlign: 'center' }}
      >
        <Typography color="text.secondary">No order items.</Typography>
      </Card>
    );
  }

  return (
    <>
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
            Order Items
          </Typography>
        </Box>
        <TableContainer>
          <Table size="medium">
            <TableHead
              sx={{
                backgroundColor: 'grey.50',
              }}
            >
              <TableRow>
                {[
                  'No',
                  'Product Code',
                  'Product Name',
                  'Order Quantity',
                  'Fulfilled Quantity',
                  'Remaining',
                  'Status',
                  'Unit Price',
                  'Total',
                  'Action',
                ].map((head, index) => (
                  <TableCell
                    key={index}
                    sx={{
                      paddingX: 3,
                      paddingY: 1.5,
                      fontSize: '0.825rem',
                      fontWeight: 'medium',
                      color: 'grey.500',
                      textTransform: 'uppercase',
                      letterSpacing: 'wider',
                      borderBottom: 'none',
                    }}
                  >
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, index) => {
                const remaining = item.qty - item.qtyFulfilled;
                const fullyFulfilled = remaining <= 0;
                return (
                  <TableRow
                    key={item.id}
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
                      }}
                    >
                      {index + 1}
                    </TableCell>
                    <TableCell
                      sx={{
                        paddingX: 3,
                        paddingY: 2,
                        whiteSpace: 'nowrap',
                        fontSize: '0.875rem',
                        color: 'primary.main',
                      }}
                    >
                      {item?.product?.code || item.productId}
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
                      {item?.product?.name || 'N/A'}
                    </TableCell>
                    <TableCell
                      sx={{
                        paddingX: 3,
                        paddingY: 2,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {Number(item.qty).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell
                      sx={{
                        paddingX: 3,
                        paddingY: 2,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {Number(item.qtyFulfilled).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 'medium',
                        color: remaining > 0 ? 'error.main' : 'success.main',
                      }}
                    >
                      {Number(remaining).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={fullyFulfilled ? 'Full' : 'Not Full'}
                        color={fullyFulfilled ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        paddingX: 3,
                        paddingY: 2,
                        whiteSpace: 'nowrap',
                        fontSize: '0.875rem',
                      }}
                    >
                      {Number(item.unitPrice).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell
                      sx={{
                        paddingX: 3,
                        paddingY: 2,
                        whiteSpace: 'nowrap',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {Number(item.lineTotal).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell
                      sx={{
                        paddingX: 3,
                        paddingY: 2,
                        whiteSpace: 'nowrap',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                      }}
                    >
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleOpenFulfill(item)}
                        disabled={fullyFulfilled || !canFulfill}
                      >
                        {fullyFulfilled ? 'Fully Fulfilled' : 'Fulfill'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      {selectedItem && (
        <FulfillDialog
          open={openDialog}
          onClose={handleCloseDialog}
          item={{
            ...selectedItem,
          }}
          onSuccess={handleFulfillSuccess}
        />
      )}
    </>
  );
}
