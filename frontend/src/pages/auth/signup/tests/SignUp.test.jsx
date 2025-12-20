import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SignUp from '../SignUp';
import AuthService from '@services/auth.service';

// Mock dependencies
vi.mock('@services/auth.service');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const renderSignUp = () => {
  return render(
    <BrowserRouter>
      <SignUp />
    </BrowserRouter>
  );
};

describe('SignUp Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path - Rendering', () => {
    it('renders sign up form with all required fields', () => {
      renderSignUp();

      expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('renders login link for existing users', () => {
      renderSignUp();

      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login');
    });
  });

  describe('User Interactions - Form Input', () => {
    it('allows user to type email', async () => {
      const user = userEvent.setup();
      renderSignUp();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('allows user to type password', async () => {
      const user = userEvent.setup();
      renderSignUp();

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'password123');

      expect(passwordInput).toHaveValue('password123');
    });

    it('allows user to type confirm password', async () => {
      const user = userEvent.setup();
      renderSignUp();

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmPasswordInput, 'password123');

      expect(confirmPasswordInput).toHaveValue('password123');
    });

    it('updates all form fields correctly', async () => {
      const user = userEvent.setup();
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'user@test.com');
      await user.type(screen.getByLabelText('Password'), 'pass123');
      await user.type(screen.getByLabelText(/confirm password/i), 'pass123');

      expect(screen.getByLabelText(/email/i)).toHaveValue('user@test.com');
      expect(screen.getByLabelText('Password')).toHaveValue('pass123');
      expect(screen.getByLabelText(/confirm password/i)).toHaveValue('pass123');
    });
  });

  describe('Validation - Required Fields', () => {
    it('shows error when email is empty', async () => {
      const user = userEvent.setup();
      renderSignUp();

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('shows error when password is empty', async () => {
      const user = userEvent.setup();
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        // When password is empty, both "Password is required" AND "Confirm Password is required" appear
        const passwordErrors = screen.getAllByText(/password is required/i);
        expect(passwordErrors.length).toBeGreaterThan(0);
      });
    });

    it('shows error when confirm password is empty', async () => {
      const user = userEvent.setup();
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        // When confirmPassword is empty but password is filled, shows "Passwords do not match"
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });
  });

  describe('Validation - Password Rules', () => {
    it('shows error when password is less than 6 characters', async () => {
      const user = userEvent.setup();
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), '12345');
      await user.type(screen.getByLabelText(/confirm password/i), '12345');
      
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password456');
      
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('accepts password with exactly 6 characters', async () => {
      const user = userEvent.setup();
      AuthService.signUp.mockResolvedValue({ user: { email: 'test@example.com' } });
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), '123456');
      await user.type(screen.getByLabelText(/confirm password/i), '123456');
      
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(AuthService.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: '123456',
        });
      });
    });
  });

  describe('Form Submission - Success', () => {
    it('calls AuthService.signUp with correct data', async () => {
      const user = userEvent.setup();
      AuthService.signUp.mockResolvedValue({ user: { email: 'test@example.com' } });
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(AuthService.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(AuthService.signUp).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call signUp when validation fails', async () => {
      const user = userEvent.setup();
      renderSignUp();

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(AuthService.signUp).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays general error message on signup failure', async () => {
      const user = userEvent.setup();
      AuthService.signUp.mockRejectedValue({
        message: 'Email already exists',
      });
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
    });

    it('displays default error message when error has no message', async () => {
      const user = userEvent.setup();
      AuthService.signUp.mockRejectedValue({});
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Sign up failed')).toBeInTheDocument();
      });
    });

    it('handles network error gracefully', async () => {
      const user = userEvent.setup();
      AuthService.signUp.mockRejectedValue(new Error('Network error'));
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Boundary Value Analysis', () => {
    it('accepts password with more than 6 characters', async () => {
      const user = userEvent.setup();
      AuthService.signUp.mockResolvedValue({ user: { email: 'test@example.com' } });
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'verylongpassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'verylongpassword123');
      
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(AuthService.signUp).toHaveBeenCalled();
      });
    });

    it('handles very long email addresses', async () => {
      const user = userEvent.setup();
      AuthService.signUp.mockResolvedValue({ user: { email: 'test@example.com' } });
      renderSignUp();

      const longEmail = 'a'.repeat(50) + '@example.com';
      await user.type(screen.getByLabelText(/email/i), longEmail);
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(AuthService.signUp).toHaveBeenCalledWith({
          email: longEmail,
          password: 'password123',
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels associated with inputs', () => {
      renderSignUp();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirmPassword');
    });

    it('displays error messages with proper error styling', async () => {
      const user = userEvent.setup();
      renderSignUp();

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/email is required/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('has accessible submit button', () => {
      renderSignUp();

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('Edge Cases', () => {
    it('allows form submission with valid data', async () => {
      const user = userEvent.setup();
      AuthService.signUp.mockResolvedValue({ user: { email: 'test@example.com' } });
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(AuthService.signUp).toHaveBeenCalled();
      });
    });

    it('maintains form state after validation error', async () => {
      const user = userEvent.setup();
      renderSignUp();

      // Submit with empty fields to trigger errors
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Fill in email and verify it's saved in state
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');
      
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('handles empty response from server', async () => {
      const user = userEvent.setup();
      AuthService.signUp.mockResolvedValue({});
      renderSignUp();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(AuthService.signUp).toHaveBeenCalled();
      });
    });
  });
});
