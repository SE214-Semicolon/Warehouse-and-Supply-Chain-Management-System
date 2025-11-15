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

export default function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
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
    if (!formData.confirmPassword)
      newErrors.confirmPassword = 'Confirm Password is required';
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    if (formData.password && formData.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    await AuthService.signUp({
      email: formData.email,
      password: formData.password,
    })
      .then(() => {
        navigate('/inventory');
      })
      .catch((error) => {
        setErrors({ general: error.message || 'Sign up failed' });
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
          Sign Up
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
          <FormControl
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
            error={!!errors.confirmPassword}
          >
            <InputLabel htmlFor="confirmPassword">Confirm Password</InputLabel>
            <OutlinedInput
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              label="Confirm Password"
            />
            <FormHelperText>{errors.confirmPassword}</FormHelperText>
          </FormControl>
          <CustomButton
            type="submit"
            variant="contained"
            color="primary"
            label="Sign Up"
            fullWidth
            sx={{ mt: 2 }}
          />
        </form>
        <Typography
          variant="body2"
          sx={{ mt: 2, color: '#3e468a', fontFamily: 'Roboto, sans-serif' }}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ color: '#ff7b47', textDecoration: 'none' }}
          >
            Login
          </Link>
        </Typography>
      </Box>
    </Container>
  );
}
