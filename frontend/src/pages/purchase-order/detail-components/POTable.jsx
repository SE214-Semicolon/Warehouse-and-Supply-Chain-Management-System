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
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';

export default function POTable({ products }) {
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
          Chi tiết đơn hàng
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
                'STT',
                'Mã sản phẩm',
                'Tên sản phẩm',
                'SL',
                'Đơn giá',
                'Thành tiền',
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
            {products.map((product, index) => (
              <TableRow
                key={product.code}
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
                  {product.code}
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
                  {product.name}
                </TableCell>
                <TableCell
                  sx={{
                    paddingX: 3,
                    paddingY: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {product.quantity}
                </TableCell>
                <TableCell
                  sx={{
                    paddingX: 3,
                    paddingY: 2,
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem',
                  }}
                >
                  {product.unitPrice}
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
                  {product.total}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
