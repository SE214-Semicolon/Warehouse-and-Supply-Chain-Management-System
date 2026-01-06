import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Grid,
  MenuItem,
  Button,
  Pagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Skeleton,
} from '@mui/material';
import { Search, Eye, RotateCcw, ClipboardList, Filter } from 'lucide-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AuditService } from '../../services/audit.service';
import ReportHeader from '../reports/components/header/ReportHeader';
import { columns } from './columns';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    startDate: null,
    endDate: null,
    page: 1,
    limit: 10,
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await AuditService.getLogs(filters);
      setLogs(res.data.results);
      setTotal(res.data.total);
    } catch (error) {
      console.error('Lỗi khi tải log:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters.page, filters.limit]);

  const handleReset = () => {
    setFilters({
      entityType: '',
      action: '',
      startDate: null,
      endDate: null,
      page: 1,
      limit: 10,
    });
    fetchLogs();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReportHeader
        title="Audit Logs"
        subtitle="Tracks all changes of system"
        icon={ClipboardList}
        iconBgColor="#6366f1"
        showExport={true}
      />

      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: 'none',
        }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <TextField
              fullWidth
              size="small"
              label="Loại Entity"
              value={filters.entityType}
              onChange={(e) =>
                setFilters({ ...filters, entityType: e.target.value })
              }
              placeholder="Ví dụ: Shipment..."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              select
              size="small"
              label="Hành động"
              value={filters.action}
              onChange={(e) =>
                setFilters({ ...filters, action: e.target.value })
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="CREATE">CREATE</MenuItem>
              <MenuItem value="UPDATE">UPDATE</MenuItem>
              <MenuItem value="DELETE">DELETE</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <DatePicker
              label="Start date"
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
              value={filters.startDate}
              onChange={(val) => setFilters({ ...filters, startDate: val })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <DatePicker
              label="End date"
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
              value={filters.endDate}
              onChange={(val) => setFilters({ ...filters, endDate: val })}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3.5 }} sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<Search size={18} />}
              onClick={fetchLogs}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Search
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<RotateCcw size={18} />}
              onClick={handleReset}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  bgcolor: '#f8fafc',
                  fontWeight: 700,
                  color: '#64748b',
                },
              }}
            >
              {columns.map((col) => (
                <TableCell key={col.id}>{col.label}</TableCell>
              ))}
              <TableCell align="center">Chi tiết</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton variant="text" />
                    </TableCell>
                  </TableRow>
                ))
              : logs.map((log) => (
                  <TableRow key={log._id} hover>
                    {columns.map((col) => (
                      <TableCell key={col.id}>{col.render(log)}</TableCell>
                    ))}
                    <TableCell align="center">
                      <IconButton
                        onClick={() => setSelectedLog(log)}
                        color="primary"
                        size="small"
                      >
                        <Eye size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>

        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Total: {total} records
          </Typography>
          <Pagination
            count={Math.ceil(total / filters.limit)}
            page={filters.page}
            onChange={(_, val) => setFilters({ ...filters, page: val })}
            color="primary"
            size="small"
          />
        </Box>
      </TableContainer>

      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Change details: {selectedLog?.entityType}
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#f1f5f9' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: '#dc2626', fontWeight: 700 }}
              >
                BEFORE
              </Typography>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: '#fff',
                  borderRadius: 2,
                  overflow: 'auto',
                  maxHeight: 500,
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {JSON.stringify(selectedLog?.before, null, 2)}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: '#16a34a', fontWeight: 700 }}
              >
                AFTER
              </Typography>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: '#fff',
                  borderRadius: 2,
                  overflow: 'auto',
                  maxHeight: 500,
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {JSON.stringify(selectedLog?.after, null, 2)}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setSelectedLog(null)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
