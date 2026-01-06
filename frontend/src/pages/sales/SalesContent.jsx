import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import DataTable from '@/components/DataTable';
import SearchBar from '@/components/SearchBar';
import ActionButtons from '@/components/ActionButton';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

import { customerConfig } from './tabs/customer.config';
import { soConfig } from './tabs/so.config';
import { useNavigate } from 'react-router-dom';
import { showToast } from '@/utils/toast';

const configMap = {
  customer: customerConfig,
  'sales-order': soConfig,
};

export default function ProcurementContent({ menuId }) {
  const config = configMap[menuId];

  const {
    columns,
    service,
    FormComponent,
    canView = true,
    canEdit = true,
    canDelete = true,
    uri,
  } = config;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [selectedRow, setSelectedRow] = useState(null);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const res = await service.getAll();
      setData(res.data?.data || res.data || []);
    } catch (msg) {
      showToast.error(msg || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    setLoading(true);
    setOpenDialog(false);
    setOpenDeleteDialog(false);
    setSearchTerm('');

    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    setDialogMode('add');
    setSelectedRow(null);
    setOpenDialog(true);
  };

  const handleView = (row) => {
    navigate(uri, { state: { id: row.id, row } });
    return;
  };

  const handleEdit = (row) => {
    setDialogMode('edit');
    setSelectedRow(row);
    setOpenDialog(true);
  };

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedRow?.id) return;

    try {
      await config.service.delete(selectedRow.id);
      showToast.success('Deleted successfully');
      const res = await config.service.getAll();
      setData(res.data?.data || res.data || []);
    } catch (msg) {
      showToast.error(msg || 'Error deleting item');
    }

    setOpenDeleteDialog(false);
  };

  // const filteredData = data.filter((item) =>
  //   searchFields.some((field) =>
  //     (item[field] || '')
  //       .toString()
  //       .toLowerCase()
  //       .includes(searchTerm.toLowerCase())
  //   )
  // );

  if (!config) {
    return <Typography>Tab đang phát triển...</Typography>;
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          mt: 2,
        }}
      >
        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search..."
        />
        <ActionButtons
          onAdd={handleAdd}
          //   onImport={handleImport}
          //   onExport={handleExport}
          //   onPrint={handlePrint}
        />
      </Box>

      <DataTable
        columns={columns}
        data={data}
        onEdit={canEdit ? handleEdit : null}
        onView={canView ? handleView : null}
        onDelete={canDelete ? handleDelete : null}
      />

      {FormComponent && (
        <FormComponent
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          mode={dialogMode}
          selectedRow={selectedRow}
          onSuccess={() => {
            fetchData();
            setOpenDialog(false);
          }}
        />
      )}

      {canDelete && (
        <ConfirmDeleteDialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
          onConfirm={confirmDelete}
          selectedRow={selectedRow}
        />
      )}
    </>
  );
}
