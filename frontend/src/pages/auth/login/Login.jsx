import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  OutlinedInput,
  Typography,
  Container,
  FormHelperText,
} from '@mui/material';
import CustomButton from '@components/CustomButton';
import { useNavigate, Link } from 'react-router-dom';
import AuthService from '@services/auth.service';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    await AuthService.login(formData)
      .then(() => {
        navigate('/inventory');
      })
      .catch((error) => {
        setErrors({ general: error.message || 'Login failed' });
      });
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          bgcolor: '#ffffff',
          p: 4,
          borderRadius: 2,
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Typography
          variant="h4"
          sx={{ color: '#7f408e', mb: 4, fontFamily: 'Roboto, sans-serif' }}
        >
          Login
        </Typography>
        {errors.general && (
          <FormHelperText error sx={{ mb: 2 }}>
            {errors.general}
          </FormHelperText>
        )}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <FormControl
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
            error={!!errors.email}
          >
            <InputLabel htmlFor="email">Email</InputLabel>
            <OutlinedInput
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              label="Email"
            />
            <FormHelperText>{errors.email}</FormHelperText>
          </FormControl>
          <FormControl
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
            error={!!errors.password}
          >
            <InputLabel htmlFor="password">Password</InputLabel>
            <OutlinedInput
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              label="Password"
            />
            <FormHelperText>{errors.password}</FormHelperText>
          </FormControl>
          <CustomButton
            type="submit"
            variant="contained"
            color="primary"
            label="Login"
            fullWidth
            sx={{ mt: 2 }}
          />
        </form>
        <Typography
          variant="body2"
          sx={{ mt: 2, color: '#3e468a', fontFamily: 'Roboto, sans-serif' }}
        >
          Don’t have an account?{' '}
          <Link
            to="/signup"
            style={{ color: '#ff7b47', textDecoration: 'none' }}
          >
            Sign Up
          </Link>
        </Typography>
      </Box>
    </Container>
  );
}
