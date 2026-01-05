import React, { _useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import DataTable from '@/components/DataTable';
import SearchBar from '@/components/SearchBar';
import ActionButtons from '@/components/ActionButton';
import Toolbar from '../../components/Toolbar';
import { menuItems } from './components/MenuConfig';
import FormDialog from './components/FormDialog';
// import POService from '../../services/supplier.service';
import mockData from './mockData';
import { useNavigate } from 'react-router-dom';
export default function PurchaseOrder() {
  const selectedMenu = 'purchase-order';
  const [searchTerm, setSearchTerm] = useState('');

  const [dialogMode, setDialogMode] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  const handleAdd = () => {
    setDialogMode('add');
    setSelectedRow(null);
    setOpenDialog(true);
  };

  const handleEdit = (row) => {
    setDialogMode('edit');
    setSelectedRow(row);
    setOpenDialog(true);
  };

  const navigate = useNavigate();

  const handleView = (row) => {
    navigate('/purchase-order/detail', { state: { id: row.id, row } });
  };

  const handleDelete = (row) => {
    alert(`Xóa: ${row.name || row.code || row.batchNo || row.sku || row.id}`);
  };

  const handleImport = () => console.log('Import clicked');
  const handleExport = () => console.log('Export clicked');
  const handlePrint = () => console.log('Print clicked');

  const commonProps = {
    onEdit: handleEdit,
    onView: handleView,
    onDelete: handleDelete,
  };

  const [pos, _setPOs] = useState(mockData);
  const [loading, _setLoading] = useState(false);

  // useEffect(() => {
  //   setLoading(true);
  //   SupplierService.getSuppliers()
  //     .then((res) => {
  //       setSuppliers(res.data || mockData);
  //     })
  //     .catch(() => {
  //       setSuppliers(mockData);
  //     })
  //     .finally(() => setLoading(false));
  // }, []);

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (pos.length === 0) {
    return (
      <Box textAlign="center" py={5}>
        <Typography color="text.secondary">
          Không có purchase order nào.
        </Typography>
      </Box>
    );
  }

  const dataTables = {
    'purchase-order': (
      <DataTable
        title="Purchase Order"
        columns={menuItems[0].columns}
        data={pos}
        {...commonProps}
      />
    ),
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Toolbar menuItems={menuItems} selectedMenu={selectedMenu} />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          mt: 2,
        }}
      >
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <ActionButtons
          onAdd={handleAdd}
          onImport={handleImport}
          onExport={handleExport}
          onPrint={handlePrint}
        />
      </Box>

      <Box>
        {dataTables[selectedMenu] || (
          <Typography>Module đang phát triển...</Typography>
        )}
      </Box>

      {(dialogMode === 'add' || dialogMode === 'edit') && (
        <FormDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          mode={dialogMode}
          selectedRow={dialogMode === 'edit' ? selectedRow : null}
        />
      )}
    </Box>
  );
}
