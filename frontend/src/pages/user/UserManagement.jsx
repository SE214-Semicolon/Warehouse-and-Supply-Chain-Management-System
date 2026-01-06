import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Button,
  Pagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import { UserPlus, Edit, Trash2, RotateCcw, Users } from 'lucide-react';
import UserService from '@/services/user.service';
import ReportHeader from '../reports/components/header/ReportHeader';
import { showToast } from '../../utils/toast';

const ROLES = [
  'admin',
  'manager',
  'warehouse_staff',
  'procurement',
  'sales',
  'logistics',
  'analyst',
  'partner',
];

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  warehouse_staff: 'Warehouse Staff',
  procurement: 'Procurement',
  sales: 'Sales',
  logistics: 'Logistics',
  analyst: 'Analyst',
  partner: 'Partner',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'warehouse_staff',
    active: true,
  });

  const [filters, setFilters] = useState({
    role: '',
    active: '',
    search: '',
    page: 1,
    limit: 10,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const payload = {
      role: filters.role || undefined,
      active: filters.active || undefined,
      page: filters.page,
      pageSize: filters.limit,
      q: filters.search,
    };
    const res = await UserService.getUsers(payload);
    if (res) {
      console.log('res: ', res);
      setUsers(res.data);
      setTotal(res.total);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.fullName,
        role: user.role,
        active: user.active,
        email: user.email,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        fullName: '',
        role: 'warehouse_staff',
        active: true,
      });
    }
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        const { email, password, ...updatePayload } = formData;
        console.log('existing: ', editingUser);
        await UserService.updateUser(editingUser.id, updatePayload);
        showToast.success('User updated successfully', email, password);
      } else {
        await UserService.createUser(formData);
        showToast.success('User created successfully');
      }
      setOpenModal(false);
      fetchUsers();
    } catch (msg) {
      showToast.error(msg || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      await UserService.deleteUser(id);
      showToast.success('User has been deactivated');
      fetchUsers();
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReportHeader
        title="User Management"
        subtitle="Manage user list and permissions"
        icon={Users}
        extraActions={
          <Button
            variant="contained"
            startIcon={<UserPlus size={18} />}
            onClick={() => handleOpenModal()}
            sx={{ borderRadius: 2.5, textTransform: 'none' }}
          >
            Add New User
          </Button>
        }
      />

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Search name/email"
            size="small"
            value={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value, page: 1 })
            }
            sx={{ flexGrow: 1 }}
          />
          <TextField
            select
            label="Role"
            size="small"
            value={filters.role}
            onChange={(e) =>
              setFilters({ ...filters, role: e.target.value, page: 1 })
            }
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Roles</MenuItem>
            {ROLES.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            size="small"
            value={filters.active}
            onChange={(e) =>
              setFilters({ ...filters, active: e.target.value, page: 1 })
            }
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>
          <Button
            startIcon={<RotateCcw size={18} />}
            onClick={() =>
              setFilters({
                role: '',
                active: '',
                search: '',
                page: 1,
                limit: 10,
              })
            }
          >
            Reset
          </Button>
        </Stack>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}
      >
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Full Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id} hover>
                  <TableCell fontWeight={600}>{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={ROLE_LABELS[user.role] || user.role}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.active ? 'Active' : 'Inactive'}
                      color={user.active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      onClick={() => handleOpenModal(user)}
                      color="primary"
                    >
                      <Edit size={18} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(user.id)}
                      color="error"
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            count={Math.ceil(total / filters.limit)}
            page={filters.page}
            onChange={(e, v) => setFilters({ ...filters, page: v })}
          />
        </Box>
      </TableContainer>

      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Full Name"
              fullWidth
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
            />
            {!editingUser && (
              <>
                <TextField
                  label="Email"
                  fullWidth
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </>
            )}
            <TextField
              select
              label="Role"
              fullWidth
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
            >
              {ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              fullWidth
              value={formData.active}
              onChange={(e) =>
                setFormData({ ...formData, active: e.target.value === 'true' })
              }
            >
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
