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
  CircularProgress,
  Pagination,
  LinearProgress,
  styled,
} from '@mui/material';
import {
  Search,
  Warehouse,
  AlertTriangle,
  Package,
  Layers,
  BarChart3,
} from 'lucide-react';
import { WarehouseReportService } from '../../../../services/report.service';
import ReportHeader from '../../components/header/ReportHeader';
import StatsCard from '../../components/stats-card/StatsCard';

const StyledProgress = styled(LinearProgress)(() => ({
  height: 10,
  borderRadius: 5,
  backgroundColor: '#e2e8f0',
  '& .MuiLinearProgress-bar': {
    borderRadius: 5,
    transition: 'transform 0.3s ease',
  },
}));

export default function WarehouseUtilizationReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [utilizationData, setUtilizationData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUtilization = useCallback(async () => {
    setLoading(true);
    try {
      const res = await WarehouseReportService.getUtilization({
        page,
        limit: 20,
      });
      setUtilizationData(res.data.utilizationData || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      setUtilizationData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUtilization();
  }, [fetchUtilization]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return utilizationData;
    const lower = searchTerm.toLowerCase();
    return utilizationData.filter(
      (w) =>
        w.warehouseName?.toLowerCase().includes(lower) ||
        w.warehouseCode?.toLowerCase().includes(lower)
    );
  }, [utilizationData, searchTerm]);

  const stats = useMemo(() => {
    const avgUtil = utilizationData.length
      ? (
          utilizationData.reduce((sum, w) => sum + w.utilizationRate, 0) /
          utilizationData.length
        ).toFixed(2)
      : 0;
    const overUtilized = utilizationData.filter(
      (w) => w.utilizationRate > 100
    ).length;
    const totalCap = utilizationData.reduce(
      (sum, w) => sum + w.totalCapacity,
      0
    );
    const usedCap = utilizationData.reduce((sum, w) => sum + w.usedCapacity, 0);

    return { avgUtil, overUtilized, totalCap, usedCap };
  }, [utilizationData]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReportHeader
        title="Warehouse Utilization"
        subtitle="Monitor space efficiency across warehouses"
        icon={Warehouse}
        onRefresh={fetchUtilization}
        onExport={() => console.log('Export CSV')}
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatsCard
            title="Avg Utilization Rate"
            value={`${stats.avgUtil}%`}
            icon={<BarChart3 />}
            color="#2563eb"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatsCard
            title="Over-utilized"
            value={stats.overUtilized}
            icon={<AlertTriangle />}
            color="#dc2626"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatsCard
            title="Total Used Capacity"
            value={stats.usedCap.toLocaleString()}
            icon={<Package />}
            color="#16a34a"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatsCard
            title="Total Capacity"
            value={stats.totalCap.toLocaleString()}
            icon={<Layers />}
            color="#f59e0b"
          />
        </Grid>
      </Grid>

      <Paper
        sx={{
          borderRadius: 4,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: 'none',
        }}
      >
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search by warehouse name or code..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
              sx: { borderRadius: 2 },
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
                    <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                      Warehouse / Code
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                      Utilization Rate
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Used Capacity
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Total Capacity
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Available Capacity
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Occupancy Rate (%)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.warehouseId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {item.warehouseName || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.warehouseCode || '---'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StyledProgress
                          variant="determinate"
                          value={Math.min(item.utilizationRate, 100)}
                          sx={{
                            '& .MuiLinearProgress-bar': {
                              backgroundColor:
                                item.utilizationRate > 100
                                  ? '#dc2626'
                                  : item.utilizationRate > 80
                                  ? '#f59e0b'
                                  : '#10b981',
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', textAlign: 'center' }}
                        >
                          {item.utilizationRate.toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.usedCapacity.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {item.totalCapacity.toLocaleString()}
                      </TableCell>
                      <TableCell
                        align="right"
                        color={
                          item.availableCapacity < 0
                            ? 'error.main'
                            : 'success.main'
                        }
                      >
                        {item.availableCapacity.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">{item.occupancyRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {filteredData.length === 0 && (
              <Box sx={{ p: 10, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No utilization data
                </Typography>
              </Box>
            )}

            {total > 20 && (
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                  count={Math.ceil(total / 20)}
                  page={page}
                  onChange={(_e, v) => setPage(v)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
}
