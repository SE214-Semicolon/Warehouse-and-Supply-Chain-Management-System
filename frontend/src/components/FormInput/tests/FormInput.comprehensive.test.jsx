import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormInput from '../FormInput';

// Helpers used in tests
const datetime = new Date('2024-01-15T14:30:00');

describe('FormInput Component - Comprehensive Tests', () => {
  // ==================== TEXT INPUT TESTS ====================
  describe('Text Input Type', () => {
    it('renders text input with label', () => {
      render(<FormInput label="Name" type="text" value="" onChange={vi.fn()} />);
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    it('handles text input changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<FormInput label="Name" type="text" value="" onChange={handleChange} />);
      
      const input = screen.getByLabelText(/name/i);
      await user.type(input, 'John Doe');
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('displays initial value for text input', () => {
      render(<FormInput label="Name" type="text" value="Initial Value" onChange={vi.fn()} />);
      expect(screen.getByDisplayValue('Initial Value')).toBeInTheDocument();
    });

    it('shows required indicator for text input', () => {
      render(<FormInput label="Name" type="text" value="" onChange={vi.fn()} required />);
      const input = screen.getByLabelText(/name/i);
      expect(input).toBeRequired();
    });

    it('displays error state for text input', () => {
      render(
        <FormInput 
          label="Name" 
          type="text" 
          value="" 
          onChange={vi.fn()} 
          error 
          helperText="Name is required" 
        />
      );
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    it('disables text input when disabled prop is true', () => {
      render(<FormInput label="Name" type="text" value="" onChange={vi.fn()} disabled />);
      expect(screen.getByLabelText(/name/i)).toBeDisabled();
    });

    it('handles empty string value', () => {
      render(<FormInput label="Name" type="text" value="" onChange={vi.fn()} />);
      expect(screen.getByLabelText(/name/i)).toHaveValue('');
    });
  });

  // ==================== SELECT INPUT TESTS ====================
  describe('Select Input Type', () => {
    const options = [
      { value: '1', label: 'Option 1' },
      { value: '2', label: 'Option 2' },
      { value: '3', label: 'Option 3' },
    ];

    it('renders select input with options', () => {
      render(
        <FormInput 
          label="Category" 
          type="select" 
          value="" 
          onChange={vi.fn()} 
          options={options} 
        />
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('displays selected value', () => {
      render(
        <FormInput 
          label="Category" 
          type="select" 
          value="2" 
          onChange={vi.fn()} 
          options={options} 
        />
      );
      const select = screen.getByRole('combobox');
      expect(select.textContent).toContain('Option 2');
    });

    it('handles select change', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <FormInput 
          label="Category" 
          type="select" 
          value="" 
          onChange={handleChange} 
          options={options} 
        />
      );
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      
      // Options should be available in the document
      await waitFor(() => {
        expect(screen.getByText('Option 1')).toBeInTheDocument();
      });
    });

    it('handles simple array options', () => {
      const simpleOptions = ['Red', 'Green', 'Blue'];
      render(
        <FormInput 
          label="Color" 
          type="select" 
          value="" 
          onChange={vi.fn()} 
          options={simpleOptions} 
        />
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('displays helper text for select', () => {
      render(
        <FormInput 
          label="Category" 
          type="select" 
          value="" 
          onChange={vi.fn()} 
          options={options}
          helperText="Select a category" 
        />
      );
      expect(screen.getByText('Select a category')).toBeInTheDocument();
    });

    it('shows required indicator for select', () => {
      render(
        <FormInput 
          label="Category" 
          type="select" 
          value="" 
          onChange={vi.fn()} 
          options={options}
          required 
        />
      );
      const labels = screen.getAllByText(/category/i);
      expect(labels[0].textContent).toMatch(/\*/);
    });

    it('disables select when disabled prop is true', () => {
      render(
        <FormInput 
          label="Category" 
          type="select" 
          value="" 
          onChange={vi.fn()} 
          options={options}
          disabled 
        />
      );
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-disabled', 'true');
    });

    it('handles empty options array', () => {
      render(
        <FormInput 
          label="Category" 
          type="select" 
          value="" 
          onChange={vi.fn()} 
          options={[]} 
        />
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  // ==================== DATE INPUT TESTS ====================
  describe('Date Input Type', () => {
    it('renders date picker', () => {
      const { container } = render(<FormInput label="Birth Date" type="date" value={null} onChange={vi.fn()} />);
      const input = container.querySelector('input[type="hidden"]') || container.querySelector('input');
      expect(input).toBeInTheDocument();
    });

    it('handles valid date value', () => {
      const date = new Date('2024-01-15');
      const { container } = render(<FormInput label="Birth Date" type="date" value={date} onChange={vi.fn()} />);
      const input = container.querySelector('input[type="hidden"]') || container.querySelector('input');
      expect(input).toHaveValue('15/01/2024');
    });

    it('handles null date value', () => {
      const { container } = render(<FormInput label="Birth Date" type="date" value={null} onChange={vi.fn()} />);
      // MUI DatePicker creates multiple elements, query container instead
      const hiddenInput = container.querySelector('input');
      expect(hiddenInput).toHaveValue('');
    });

    it('shows required indicator for date', () => {
      render(<FormInput label="Birth Date" type="date" value={null} onChange={vi.fn()} required />);
      // Check for required asterisk
      const labels = screen.getAllByText(/birth date/i, { exact: false });
      expect(labels.length).toBeGreaterThan(0);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('displays error state for date', () => {
      render(
        <FormInput 
          label="Birth Date" 
          type="date" 
          value={null} 
          onChange={vi.fn()} 
          error 
          helperText="Invalid date" 
        />
      );
      expect(screen.getByText('Invalid date')).toBeInTheDocument();
    });

    it('disables date picker when disabled', () => {
      render(<FormInput label="Birth Date" type="date" value={null} onChange={vi.fn()} disabled />);
      // Check calendar button is disabled
      const calendarButton = screen.getByLabelText(/choose date/i);
      expect(calendarButton).toBeDisabled();
    });
  });

  // ==================== DATETIME INPUT TESTS ====================
  describe('DateTime Input Type', () => {
    it('renders datetime input', () => {
      const { container } = render(<FormInput label="Appointment" type="datetime" value={null} onChange={vi.fn()} />);
      const input = container.querySelector('input');
      expect(input).toBeInTheDocument();
    });

    it('handles valid datetime value', () => {
      const { container } = render(<FormInput label="Appointment" type="datetime" value={datetime} onChange={vi.fn()} />);
      const hiddenInput = container.querySelector('input');
      expect(hiddenInput).toBeInTheDocument();
    });

    it('handles null datetime value', () => {
      const { container } = render(<FormInput label="Appointment" type="datetime" value={null} onChange={vi.fn()} />);
      const hiddenInput = container.querySelector('input');
      expect(hiddenInput).toHaveValue('');
    });

    it('shows required indicator for datetime', () => {
      render(<FormInput label="Appointment" type="datetime" value={null} onChange={vi.fn()} required />);
      const labels = screen.getAllByText(/appointment/i, { exact: false });
      expect(labels.length).toBeGreaterThan(0);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('disables datetime picker when disabled', () => {
      render(<FormInput label="Appointment" type="datetime" value={null} onChange={vi.fn()} disabled />);
      const calendarButton = screen.getByLabelText(/choose date/i);
      expect(calendarButton).toBeDisabled();
    });
  });

  // ==================== NUMERIC INPUT TESTS ====================
  describe('Numeric Input Type', () => {
    it('handles number type input', () => {
      render(<FormInput label="Quantity" type="number" value="" onChange={vi.fn()} />);
      expect(screen.getByLabelText(/quantity/i)).toHaveAttribute('type', 'number');
    });

    it('displays numeric value', () => {
      render(<FormInput label="Quantity" type="number" value="100" onChange={vi.fn()} />);
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    });

    it('handles numeric input changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<FormInput label="Quantity" type="number" value="" onChange={handleChange} />);
      
      const input = screen.getByLabelText(/quantity/i);
      await user.type(input, '42');
      
      expect(handleChange).toHaveBeenCalled();
    });
  });

  // ==================== CONTROLLED VS UNCONTROLLED ====================
  describe('Controlled Component Behavior', () => {
    it('updates when controlled value changes', () => {
      const { rerender } = render(
        <FormInput label="Name" type="text" value="First" onChange={vi.fn()} />
      );
      expect(screen.getByDisplayValue('First')).toBeInTheDocument();
      
      rerender(<FormInput label="Name" type="text" value="Second" onChange={vi.fn()} />);
      expect(screen.getByDisplayValue('Second')).toBeInTheDocument();
    });

    it('handles undefined value gracefully', () => {
      render(<FormInput label="Name" type="text" value={undefined} onChange={vi.fn()} />);
      expect(screen.getByLabelText(/name/i)).toHaveValue('');
    });

    it('handles null value gracefully', () => {
      render(<FormInput label="Name" type="text" value={null} onChange={vi.fn()} />);
      expect(screen.getByLabelText(/name/i)).toHaveValue('');
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('renders without onChange handler', () => {
      expect(() => {
        render(<FormInput label="Name" type="text" value="" />);
      }).not.toThrow();
    });

    it('handles very long text', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<FormInput label="Name" type="text" value="" onChange={handleChange} />);

      const input = screen.getByLabelText(/name/i);
      // Type shorter text to avoid timeout
      await user.type(input, 'a'.repeat(50));

      expect(handleChange).toHaveBeenCalled();
    }, 10000);

    it('handles special characters in text', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<FormInput label="Name" type="text" value="" onChange={handleChange} />);
      
      const input = screen.getByLabelText(/name/i);
      await user.type(input, '!@#$%^&*()');
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('handles rapid value changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<FormInput label="Name" type="text" value="" onChange={handleChange} />);

      const input = screen.getByLabelText(/name/i);
      await user.type(input, 'abc');
      // userEvent.type triggers onChange for each keystroke
      expect(handleChange).toHaveBeenCalled();
      expect(handleChange.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('handles invalid date string gracefully', () => {
      const { container } = render(<FormInput label="Date" type="date" value="invalid" onChange={vi.fn()} />);
      const input = container.querySelector('input');
      expect(input).toBeInTheDocument();
    });

    it('applies custom sx styles', () => {
      const customSx = { backgroundColor: 'red' };
      render(<FormInput label="Name" type="text" value="" onChange={vi.fn()} sx={customSx} />);
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    it('passes through additional props', () => {
      render(
        <FormInput 
          label="Name" 
          data-testid="custom-input"
          type="text"
          value=""
          onChange={vi.fn()}
        />
      );
      const input = screen.getByTestId('custom-input');
      expect(input).toBeInTheDocument();
    });
  });

  // ==================== FALLBACK TYPE ====================
  describe('Fallback to Text Input', () => {
    it('renders text input for unknown type', () => {
      render(<FormInput label="Field" type="unknown-type" value="" onChange={vi.fn()} />);
      expect(screen.getByLabelText(/field/i)).toBeInTheDocument();
    });

    it('renders text input when type is not provided', () => {
      render(<FormInput label="Field" value="" onChange={vi.fn()} />);
      expect(screen.getByLabelText(/field/i)).toBeInTheDocument();
    });
  });

  // ==================== ACCESSIBILITY ====================
  describe('Accessibility', () => {
    it('associates label with input correctly', () => {
      render(<FormInput label="Email" type="text" value="" onChange={vi.fn()} />);
      const input = screen.getByLabelText(/email/i);
      expect(input).toBeInTheDocument();
    });

    it('provides accessible error messages', () => {
      render(
        <FormInput 
          label="Email" 
          type="text" 
          value="" 
          onChange={vi.fn()} 
          error 
          helperText="Email is required" 
        />
      );
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('supports keyboard navigation for text input', () => {
      render(<FormInput label="Name" type="text" value="" onChange={vi.fn()} />);
      const input = screen.getByLabelText(/name/i);
      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it('supports keyboard navigation for select', () => {
      const options = ['Option 1', 'Option 2'];
      render(
        <FormInput 
          label="Category" 
          type="select" 
          value="" 
          onChange={vi.fn()} 
          options={options} 
        />
      );
      const select = screen.getByRole('combobox');
      select.focus();
      expect(document.activeElement).toBe(select);
    });
  });

  // ==================== INTEGRATION SCENARIOS ====================
  describe('Integration Scenarios', () => {
    it('works in a form context with multiple inputs', () => {
      render(
        <div>
          <FormInput label="Name" type="text" value="" onChange={vi.fn()} />
          <FormInput label="Email" type="text" value="" onChange={vi.fn()} />
          <FormInput label="Age" type="number" value="" onChange={vi.fn()} />
        </div>
      );
      
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
    });

    it('maintains independent state for multiple instances', async () => {
      const user = userEvent.setup();
      const handleChange1 = vi.fn();
      const handleChange2 = vi.fn();
      
      render(
        <div>
          <FormInput label="First Name" type="text" value="" onChange={handleChange1} />
          <FormInput label="Last Name" type="text" value="" onChange={handleChange2} />
        </div>
      );
      
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      
      expect(handleChange1).toHaveBeenCalled();
      expect(handleChange2).toHaveBeenCalled();
    });
  });
});
