import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  Grid,
  Tab,
  Tabs,
  CircularProgress,
  Pagination,
} from '@mui/material';
import {
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  FileText,
  History,
  MoveHorizontal,
} from 'lucide-react';
import { DesktopDatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { InventoryReportService } from '../../../../services/report.service';
import { convertDate } from '../../../../utils/convertDate';
import StatsCard from '../../components/stats-card/StatsCard';
import ReportHeader from '../../components/header/ReportHeader';
import columns from './columns';

export default function MovementReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [movements, setMovements] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState(dayjs('2025-01-01'));
  const [endDate, setEndDate] = useState(dayjs('2025-12-31'));

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await InventoryReportService.getMovement({
        startDate: convertDate(startDate.toDate()),
        endDate: convertDate(endDate.toDate()),
        page,
        limit: 20,
      });
      setMovements(res.data.movements || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      setMovements([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page]);

  const handlePageChange = (_event, value) => {
    setPage(value);
  };

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, activeTab, startDate, endDate]);

  const stats = useMemo(() => {
    if (!movements.length) {
      return [
        {
          label: 'Total Movements',
          value: 0,
          icon: <History />,
          color: '#6366f1',
        },
        {
          label: 'Received Quantity',
          value: '0',
          icon: <ArrowDownLeft />,
          color: '#10b981',
        },
        {
          label: 'Issued Quantity',
          value: '0',
          icon: <ArrowUpRight />,
          color: '#ef4444',
        },
        {
          label: 'Unique Users',
          value: '0',
          icon: <User />,
          color: '#f59e0b',
        },
      ];
    }

    const { totalIn, totalOut, uniqueUsers } = movements.reduce(
      (acc, m) => {
        if (m.movementType === 'purchase_receipt') {
          acc.totalIn += m.quantity;
        } else if (m.movementType === 'sale_issue') {
          acc.totalOut += m.quantity;
        }
        const userKey =
          m.createdBy?.email || m.createdBy?.fullName || 'unknown';
        acc.uniqueUsers.add(userKey);
        return acc;
      },
      { totalIn: 0, totalOut: 0, uniqueUsers: new Set() }
    );

    return [
      {
        label: 'Total Movements',
        value: total || movements.length,
        icon: <History size={24} />,
        color: '#6366f1',
      },
      {
        label: 'Received Quantity',
        value: totalIn.toLocaleString(),
        icon: <ArrowDownLeft size={24} />,
        color: '#10b981',
      },
      {
        label: 'Issued Quantity',
        value: totalOut.toLocaleString(),
        icon: <ArrowUpRight size={24} />,
        color: '#ef4444',
      },
      {
        label: 'Unique Users',
        value: uniqueUsers.size.toString().padStart(2, '0'),
        icon: <User size={24} />,
        color: '#f59e0b',
      },
    ];
  }, [movements, total]);

  const movementTypeMap = {
    purchase_receipt: {
      label: 'Goods Receipt',
      color: 'success',
      icon: <ArrowDownLeft size={16} />,
      category: 'in',
    },
    sale_issue: {
      label: 'Sales Issue',
      color: 'error',
      icon: <ArrowUpRight size={16} />,
      category: 'out',
    },
    transfer_in: {
      label: 'Transfer In',
      color: 'info',
      icon: <MoveHorizontal size={16} />,
      category: 'internal',
    },
    transfer_out: {
      label: 'Transfer Out',
      color: 'warning',
      icon: <MoveHorizontal size={16} />,
      category: 'internal',
    },
    adjustment: {
      label: 'Adjustment',
      color: 'default',
      icon: <FileText size={16} />,
      category: 'other',
    },
  };

  const filteredMovements = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return movements.filter((m) => {
      const name = m.productBatch?.product?.name || '';
      const sku = m.productBatch?.product?.sku || '';
      const batch = m.productBatch?.batchNo || '';
      const matchSearch =
        name.toLowerCase().includes(lowerSearch) ||
        sku.toLowerCase().includes(lowerSearch) ||
        batch.toLowerCase().includes(lowerSearch);

      if (activeTab === 'all') return matchSearch;
      if (activeTab === 'in')
        return matchSearch && m.movementType === 'purchase_receipt';
      if (activeTab === 'out')
        return matchSearch && m.movementType === 'sale_issue';
      if (activeTab === 'internal')
        return matchSearch && m.movementType.includes('transfer');

      return matchSearch;
    });
  }, [movements, searchTerm, activeTab]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReportHeader
          title="Movement History"
          subtitle="Analyze inventory movements over time"
          icon={History}
          onRefresh={fetchMovements}
          onExport={() => console.log('Export CSV')}
        />

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.label}>
              <StatsCard
                title={stat.label}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            </Grid>
          ))}
        </Grid>

        <Paper
          sx={{
            borderRadius: 4,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: 'none',
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(_e, v) => setActiveTab(v)}
              sx={{ px: 2 }}
            >
              <Tab
                label="All"
                value="all"
                sx={{ textTransform: 'none', fontWeight: 700 }}
              />
              <Tab
                label="Goods Receipt"
                value="in"
                sx={{ textTransform: 'none', fontWeight: 700 }}
              />
              <Tab
                label="Sales Issue"
                value="out"
                sx={{ textTransform: 'none', fontWeight: 700 }}
              />
              <Tab
                label="Internal Transfers"
                value="internal"
                sx={{ textTransform: 'none', fontWeight: 700 }}
              />
            </Tabs>
          </Box>

          <Box
            sx={{
              p: 2,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <TextField
              placeholder="Search by product name, SKU or batch"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 },
              }}
            />

            <DesktopDatePicker
              label="From"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{
                textField: {
                  size: 'small',
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Calendar size={18} />
                      </InputAdornment>
                    ),
                  },
                  sx: { width: 180, borderRadius: 2 },
                },
              }}
            />

            <DesktopDatePicker
              label="To"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              slotProps={{
                textField: {
                  size: 'small',
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Calendar size={18} />
                      </InputAdornment>
                    ),
                  },
                  sx: { width: 180, borderRadius: 2 },
                },
              }}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: '60vh' }}>
                <Table stickyHeader sx={{ minWidth: 1000 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      {columns.map((col) => (
                        <TableCell
                          key={col.id}
                          align={col.align}
                          sx={{
                            fontWeight: 700,
                            color: '#64748b',
                            width: col.width,
                            maxWidth: col.width,
                          }}
                        >
                          {col.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMovements.map((movement) => {
                      const config = movementTypeMap[movement.movementType] || {
                        label: movement.movementType || 'Unknown',
                        color: 'default',
                        icon: null,
                        category: 'other',
                      };

                      return (
                        <TableRow key={movement.id} hover>
                          {columns.map((col) => (
                            <TableCell key={col.id} align={col.align}>
                              {col.render ? col.render(movement, config) : null}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {filteredMovements.length === 0 && (
                <Box sx={{ p: 10, textAlign: 'center' }}>
                  <FileText
                    size={48}
                    color="#cbd5e1"
                    style={{ marginBottom: 16 }}
                  />
                  <Typography variant="h6" color="text.secondary">
                    Không có dữ liệu biến động nào
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                  </Typography>
                </Box>
              )}

              {total > 20 && (
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={Math.ceil(total / 20)}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      </Box>
    </LocalizationProvider>
  );
}
