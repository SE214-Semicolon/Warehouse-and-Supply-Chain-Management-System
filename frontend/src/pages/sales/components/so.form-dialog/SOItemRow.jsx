import {
  TableRow,
  TableCell,
  TextField,
  Typography,
  IconButton,
  Autocomplete,
} from '@mui/material';
import { Delete } from '@mui/icons-material';

export default function SOItemRow({
  item,
  products,
  loadingProducts,
  error,
  disabled,
  onProductSelect,
  onQtyChange,
  onPriceChange,
  onRemove,
}) {
  const selectedProduct =
    products.find((p) => (p.id ?? p._id) === item.productId) || null;

  return (
    <TableRow>
      <TableCell width="30%">
        <Autocomplete
          options={products}
          loading={loadingProducts}
          getOptionLabel={(o) => o?.name || ''}
          value={selectedProduct}
          disabled={disabled}
          onChange={(_, newValue) => onProductSelect(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Select Product"
              size="small"
              error={!!error}
              helperText={error}
            />
          )}
        />
      </TableCell>

      <TableCell width="15%">
        <Typography>{item.sku || '—'}</Typography>
      </TableCell>

      <TableCell width="15%">
        <TextField
          type="number"
          size="small"
          value={item.qtyOrdered}
          disabled={disabled}
          onChange={(e) => onQtyChange(Number(e.target.value) || 1)}
        />
      </TableCell>

      <TableCell width="10%">{item.unit || '—'}</TableCell>

      <TableCell width="15%">
        <TextField
          type="number"
          size="small"
          value={item.unitPrice}
          disabled={disabled}
          onChange={(e) => onPriceChange(Number(e.target.value) || 0)}
        />
      </TableCell>

      <TableCell width="15%">{item.total.toLocaleString()}</TableCell>

      <TableCell width="5%">
        {!disabled && (
          <IconButton onClick={onRemove}>
            <Delete color="error" />
          </IconButton>
        )}
      </TableCell>
    </TableRow>
  );
}
