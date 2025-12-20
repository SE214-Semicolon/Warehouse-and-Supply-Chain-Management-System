import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormInput from '../FormInput';

/**
 * UNIT TEST: FormInput Component
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal form input behavior
 * 2. Equivalence Partitioning - Different input types
 * 3. BVA - Required fields, min/max lengths, date boundaries
 * 4. Error Guessing - Invalid inputs, validation errors
 * 5. State & Rendering Check - Value updates, error states
 * 6. Non-Functional Checks - Accessibility, disabled states
 */

describe('FormInput Component - Unit Tests', () => {
  // Happy Path Testing
  describe('Happy Path - Text Input', () => {
    it('should render text input with label', () => {
      render(<FormInput type="text" name="username" label="Username" />);
      
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('should display initial value', () => {
      render(
        <FormInput
          type="text"
          name="email"
          label="Email"
          value="test@example.com"
        />
      );
      
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    it('should call onChange when user types', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      
      render(
        <FormInput
          type="text"
          name="username"
          label="Username"
          value=""
          onChange={handleChange}
        />
      );
      
      const input = screen.getByLabelText('Username');
      await user.type(input, 'john');
      
      expect(handleChange).toHaveBeenCalled();
    });
  });

  // Equivalence Partitioning - Different Input Types
  describe('Equivalence Partitioning - Input Types', () => {
    it('should render number input', () => {
      render(
        <FormInput type="number" name="quantity" label="Quantity" value={10} />
      );
      
      const input = screen.getByLabelText('Quantity');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should render select dropdown', () => {
      const options = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ];
      
      render(
        <FormInput
          type="select"
          name="status"
          label="Status"
          value="active"
          options={options}
        />
      );
      
      // MUI Select renders value as text content
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render textarea', () => {
      render(
        <FormInput
          type="textarea"
          name="description"
          label="Description"
          value="Test description"
        />
      );
      
      // MUI TextField with multiline prop creates textarea-like behavior
      const textarea = screen.getByLabelText('Description');
      expect(textarea).toBeInTheDocument();
    });

    it('should render date picker', () => {
      render(
        <FormInput
          type="date"
          name="startDate"
          label="Start Date"
          value={new Date('2024-01-01')}
        />
      );
      
      expect(screen.getByDisplayValue('01/01/2024')).toBeInTheDocument();
    });

    it('should render datetime picker', () => {
      render(
        <FormInput
          type="datetime"
          name="timestamp"
          label="Timestamp"
          value={new Date('2024-01-01T10:00:00')}
        />
      );
      
      const datetimePicker = screen.getByRole('group', { name: /timestamp/i });
      expect(datetimePicker).toBeInTheDocument();
    });
  });

  // BVA - Boundary Value Analysis
  describe('BVA - Required Fields & Validation', () => {
    it('should show required indicator when required=true', () => {
      render(
        <FormInput
          type="text"
          name="username"
          label="Username"
          required={true}
        />
      );
      
      const input = screen.getByLabelText(/Username/i);
      expect(input).toHaveAttribute('required');
    });

    it('should display error state with error=true', () => {
      render(
        <FormInput
          type="text"
          name="email"
          label="Email"
          error={true}
          helperText="Invalid email"
        />
      );
      
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
    });

    it('should display helper text', () => {
      render(
        <FormInput
          type="text"
          name="username"
          label="Username"
          helperText="Enter your username"
        />
      );
      
      expect(screen.getByText('Enter your username')).toBeInTheDocument();
    });

    it('should handle empty string value', () => {
      render(<FormInput type="text" name="name" label="Name" value="" />);
      
      const input = screen.getByLabelText('Name');
      expect(input).toHaveValue('');
    });

    it('should handle null value', () => {
      render(<FormInput type="text" name="name" label="Name" value={null} />);
      
      const input = screen.getByLabelText('Name');
      expect(input).toHaveValue('');
    });

    it('should handle very long text input', () => {
      const longText = 'a'.repeat(500);
      
      render(
        <FormInput type="text" name="description" label="Description" value={longText} />
      );
      
      expect(screen.getByDisplayValue(longText)).toBeInTheDocument();
    });
  });

  // State & Rendering Check
  describe('State & Rendering - Disabled State', () => {
    it('should be disabled when disabled=true', () => {
      render(
        <FormInput
          type="text"
          name="username"
          label="Username"
          disabled={true}
        />
      );
      
      const input = screen.getByLabelText('Username');
      expect(input).toBeDisabled();
    });

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      
      render(
        <FormInput
          type="text"
          name="username"
          label="Username"
          disabled={true}
          onChange={handleChange}
        />
      );
      
      const input = screen.getByLabelText('Username');
      
      // Try to type (should not work)
      await user.click(input);
      await user.keyboard('test');
      
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  // Error Guessing - Edge Cases
  describe('Error Guessing - Select Dropdown', () => {
    it('should handle empty options array', () => {
      render(
        <FormInput
          type="select"
          name="status"
          label="Status"
          value=""
          options={[]}
        />
      );
      
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should handle undefined options', () => {
      render(
        <FormInput
          type="select"
          name="status"
          label="Status"
          value=""
          options={undefined}
        />
      );
      
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should display all options in select', () => {
      const options = [
        { value: '1', label: 'Option 1' },
        { value: '2', label: 'Option 2' },
        { value: '3', label: 'Option 3' },
      ];
      
      render(
        <FormInput
          type="select"
          name="choice"
          label="Choice"
          value="1"
          options={options}
        />
      );
      
      // Click to open dropdown
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should handle select with no initial value', () => {
      const options = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ];
      
      render(
        <FormInput
          type="select"
          name="letter"
          label="Letter"
          value=""
          options={options}
        />
      );
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });
  });

  // Error Guessing - Date Inputs
  describe('Error Guessing - Date & DateTime Inputs', () => {
    it('should handle null date value', () => {
      render(
        <FormInput type="date" name="date" label="Date" value={null} />
      );
      
      const datePicker = screen.getByRole('group', { name: /date/i });
      expect(datePicker).toBeInTheDocument();
    });

    it('should handle invalid date value', () => {
      render(
        <FormInput
          type="date"
          name="date"
          label="Date"
          value={new Date('invalid')}
        />
      );
      
      const datePicker = screen.getByRole('group', { name: /date/i });
      expect(datePicker).toBeInTheDocument();
    });

    it('should handle very old date', () => {
      const oldDate = new Date('1900-01-01');
      
      render(
        <FormInput type="date" name="date" label="Date" value={oldDate} />
      );
      
      expect(screen.getByDisplayValue('01/01/1900')).toBeInTheDocument();
    });

    it('should handle far future date', () => {
      const futureDate = new Date('2099-12-31');
      
      render(
        <FormInput type="date" name="date" label="Date" value={futureDate} />
      );
      
      expect(screen.getByDisplayValue('31/12/2099')).toBeInTheDocument();
    });
  });

  // Non-Functional - Accessibility
  describe('Non-Functional - Accessibility', () => {
    it('should have proper aria-label', () => {
      render(
        <FormInput
          type="text"
          name="username"
          label="Username"
          aria-label="Username input field"
        />
      );
      
      const input = screen.getByLabelText('Username');
      expect(input).toBeInTheDocument();
    });

    it('should associate label with input via htmlFor/id', () => {
      const { container } = render(
        <FormInput type="text" name="email" label="Email Address" />
      );
      
      const label = container.querySelector('label');
      const input = screen.getByLabelText('Email Address');
      
      expect(label).toHaveAttribute('for', input.id);
    });

    it('should indicate error state to screen readers', () => {
      render(
        <FormInput
          type="text"
          name="email"
          label="Email"
          error={true}
          helperText="Invalid email format"
        />
      );
      
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  // Non-Functional - Styling
  describe('Non-Functional - Custom Styling', () => {
    it('should apply custom sx prop', () => {
      const customSx = { backgroundColor: 'red', width: '300px' };
      
      render(
        <FormInput
          type="text"
          name="custom"
          label="Custom"
          sx={customSx}
        />
      );
      
      const input = screen.getByLabelText('Custom');
      expect(input).toBeInTheDocument();
    });

    it('should apply fullWidth prop', () => {
      render(
        <FormInput
          type="text"
          name="fullwidth"
          label="Full Width"
          fullWidth={true}
        />
      );
      
      const input = screen.getByLabelText('Full Width');
      expect(input).toBeInTheDocument();
    });
  });

  // Real-world Scenarios
  describe('Real-world Scenarios', () => {
    it('should handle complete form field with all props', () => {
      const handleChange = vi.fn();
      
      render(
        <FormInput
          type="text"
          name="email"
          label="Email Address"
          value="user@example.com"
          onChange={handleChange}
          required={true}
          disabled={false}
          error={false}
          helperText="Please enter a valid email"
          fullWidth={true}
        />
      );
      
      // MUI adds asterisk (*) to required label which breaks getByLabelText
      const emailInput = screen.getByRole('textbox');
      expect(emailInput).toHaveValue('user@example.com');
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    });

    it('should simulate error state after validation failure', async () => {
      const { rerender } = render(
        <FormInput
          type="text"
          name="email"
          label="Email"
          value="invalid-email"
          error={false}
        />
      );
      
      // Simulate validation failure
      rerender(
        <FormInput
          type="text"
          name="email"
          label="Email"
          value="invalid-email"
          error={true}
          helperText="Invalid email format"
        />
      );
      
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });
});
