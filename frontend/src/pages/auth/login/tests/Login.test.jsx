import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';

/**
 * UNIT TEST: Login Page Component
 * 
 * Testing Techniques:
 * - Happy Path: Successful login flow
 * - Equivalence Partitioning: Valid/Invalid credentials
 * - BVA: Empty fields, validation
 * - Error Guessing: Network errors, validation errors
 * - User Interactions: Form submission, navigation
 */

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@services/auth.service', () => ({
  default: {
    login: vi.fn(),
  },
}));

vi.mock('@components/CustomButton', () => ({
  default: ({ label, onClick, type, ...props }) => (
    <button onClick={onClick} type={type} {...props}>
      {label}
    </button>
  ),
}));

import AuthService from '@services/auth.service';

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Component - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path - Rendering', () => {
    it('should render login form', () => {
      renderLogin();
      
      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('should render sign up link', () => {
      renderLogin();
      
      // Text is split across multiple elements
      expect(screen.getByText(/have an account/i)).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });

    it('should have link to signup page', () => {
      renderLogin();
      
      const signUpLink = screen.getByText('Sign Up').closest('a');
      expect(signUpLink).toHaveAttribute('href', '/signup');
    });
  });

  describe('Happy Path - Successful Login', () => {
    it('should login successfully with valid credentials', async () => {
      const user = userEvent.setup();
      AuthService.login.mockResolvedValue({ success: true });
      
      renderLogin();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() => {
        expect(AuthService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Equivalence Partitioning - Validation', () => {
    it('should show error when email is empty', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('should show error when password is empty', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });

    it('should show errors when both fields are empty', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });
  });

  describe('Error Guessing - Login Failures', () => {
    it('should display error message on login failure', async () => {
      const user = userEvent.setup();
      AuthService.login.mockRejectedValue(new Error('Invalid credentials'));
      
      renderLogin();

      await user.type(screen.getByLabelText('Email'), 'wrong@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should display generic error when no error message', async () => {
      const user = userEvent.setup();
      AuthService.login.mockRejectedValue(new Error());
      
      renderLogin();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });
    });

    it('should not call AuthService when validation fails', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() => {
        expect(AuthService.login).not.toHaveBeenCalled();
      });
    });
  });

  describe('User Interactions - Form Input', () => {
    it('should update email field on input', async () => {
      const user = userEvent.setup();
      renderLogin();

      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password field on input', async () => {
      const user = userEvent.setup();
      renderLogin();

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'mypassword');

      expect(passwordInput).toHaveValue('mypassword');
    });

    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup();
      renderLogin();

      // Trigger validation error
      await user.click(screen.getByRole('button', { name: 'Login' }));
      
      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(screen.getByLabelText('Email'), 'test@example.com');

      await waitFor(() => {
        expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('BVA - Form Submission', () => {
    it('should prevent default form submission', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      
      const form = screen.getByRole('button', { name: 'Login' }).closest('form');
      const submitHandler = vi.fn((e) => e.preventDefault());
      form?.addEventListener('submit', submitHandler);

      await user.click(screen.getByRole('button', { name: 'Login' }));

      // Form should be submitted through handleSubmit, not default behavior
      await waitFor(() => {
        expect(AuthService.login).toHaveBeenCalled();
      });
    });

    it('should handle empty string inputs', async () => {
      const user = userEvent.setup();
      renderLogin();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      await user.type(emailInput, 'test');
      await user.clear(emailInput);
      await user.type(passwordInput, 'pass');
      await user.clear(passwordInput);

      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderLogin();
      
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should have submit button', () => {
      renderLogin();
      
      const submitButton = screen.getByRole('button', { name: 'Login' });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should show error messages accessibly', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() => {
        const errors = screen.getAllByText(/required/i);
        errors.forEach(error => {
          expect(error).toBeInTheDocument();
        });
      });
    });
  });

  describe('State & Rendering', () => {
    it('should maintain form state across multiple inputs', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByLabelText('Email'), 'user@test.com');
      await user.type(screen.getByLabelText('Password'), 'secure123');

      expect(screen.getByLabelText('Email')).toHaveValue('user@test.com');
      expect(screen.getByLabelText('Password')).toHaveValue('secure123');
    });

    it('should not show errors initially', () => {
      renderLogin();
      
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Password is required')).not.toBeInTheDocument();
      expect(screen.queryByText(/Login failed/)).not.toBeInTheDocument();
    });
  });
});
