import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import DataTable from '@/components/DataTable';
import SearchBar from '@/components/SearchBar';
import ActionButtons from '@/components/ActionButton';
import SupplierToolbar from './components/SupplierToolbar';
import FormDialog from './components/FormDialog';
import ViewDialog from './components/ViewDialog';
import { menuItems } from './components/MenuConfig';

export default function Supplier() {
  const [selectedMenu, setSelectedMenu] = useState('supplier');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  // const [formData, setFormData] = useState(selectedRow || {});

  // const handleChange = (fieldId, value) => {
  //   setFormData({ ...formData, [fieldId]: value });
  // };

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

  const handleView = (row) => {
    setDialogMode('view');
    setSelectedRow(row);
    setOpenDialog(true);
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

  const data = [
    {
      id: 1,
      code: 'SUP001',
      name: 'Công ty TNHH ABC',
      phone: '0123456789',
      email: 'abc.company@gmail.com',
      contactPerson: 'Nguyễn Văn A',
      address: '123 Đường Lê Lợi, Quận 1, TP.HCM',
    },
    {
      id: 2,
      code: 'SUP002',
      name: 'Công ty TNHH XYZ',
      phone: '0987654321',
      email: 'xyz.company@gmail.com',
      contactPerson: 'Trần Thị B',
      address: '456 Đường Trần Hưng Đạo, Quận 5, TP.HCM',
    },
  ];

  const dataWithNo = data.map((item, index) => ({ ...item, no: index + 1 }));

  const dataTables = {
    supplier: (
      <DataTable
        title="Supplier"
        columns={menuItems[0].columns}
        data={dataWithNo}
        {...commonProps}
      />
    ),
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SupplierToolbar
        menuItems={menuItems}
        selectedMenu={selectedMenu}
        onMenuChange={setSelectedMenu}
      />

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
          <Typography>Module khác đang phát triển...</Typography>
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

      {dialogMode === 'view' && selectedRow && (
        <ViewDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          selectedMenu={selectedMenu}
          selectedRow={selectedRow}
        />
      )}
    </Box>
  );
}
