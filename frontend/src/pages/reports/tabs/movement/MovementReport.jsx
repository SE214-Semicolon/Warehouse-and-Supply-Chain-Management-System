import React, { useState, useMemo, useEffect } from 'react';
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
  Button,
  TextField,
  InputAdornment,
  Grid,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  FileText,
  Filter,
  History,
  MoveHorizontal,
} from 'lucide-react';
import { InventoryReportService } from '../../../../services/report.service';
import StatsCard from '../../components/stats-card/StatsCard';
import ReportHeader from '../../components/header/ReportHeader';
import columns from './columns';

export default function MovementReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [movements, setMovements] = useState([]);
  const [total, setTotal] = useState(0);

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
  };

  const filteredMovements = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return movements.filter((m) => {
      const matchSearch =
        m.productBatch.product.name.toLowerCase().includes(lowerSearch) ||
        m.productBatch.product.sku.toLowerCase().includes(lowerSearch);

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

  useEffect(() => {
    const getMovement = async () => {
      const res = await InventoryReportService.getMovement();
      console.log(res);
      setMovements(res.data.movements);
      setTotal(res.data.total);
    };

    getMovement();
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReportHeader
        title="Movement History"
        subtitle="Analyze inventory movements over time"
        icon={History}
        onRefresh={() => window.location.reload()}
        onExport={() => console.log('Export CSV')}
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
          }}
        >
          <TextField
            placeholder="Search by product name or SKU"
            size="small"
            fullWidth
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
          <Button
            variant="outlined"
            startIcon={<Calendar size={18} />}
            sx={{
              borderRadius: 2.5,
              borderColor: '#e2e8f0',
              color: 'text.primary',
              textTransform: 'none',
            }}
          >
            This Month
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Filter size={18} />
          </IconButton>
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 1000 }}>
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
                  label: movement.movementType,
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
            <FileText size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
            <Typography variant="h6" color="text.secondary">
              Không có dữ liệu biến động nào
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
