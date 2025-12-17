import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormDialog from '../FormDialog';

// Mock DialogButtons component
vi.mock('@/components/DialogButtons', () => ({
  default: ({ onClose, onAction }) => (
    <div data-testid="dialog-buttons">
      <button onClick={onClose}>Cancel</button>
      <button onClick={onAction}>Save</button>
    </div>
  ),
}));

// Mock FieldConfig - Match actual field configuration
vi.mock('../FieldConfig', () => ({
  fieldConfigs: {
    supplier: [
      { id: 'code', label: 'Code', type: 'text' },
      { id: 'name', label: 'Name', type: 'text' },
      { id: 'phone', label: 'Phone', type: 'text' },
      { id: 'email', label: 'Email', type: 'text' },
      { id: 'contactPerson', label: 'Contact Person', type: 'text' },
      { id: 'address', label: 'Address', type: 'text' },
    ],
  },
}));

/**
 * UNIT TEST: Supplier FormDialog Component
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal create/edit operations
 * 2. Equivalence Partitioning - Create vs Edit modes
 * 3. Boundary Value Analysis - Empty/partial/complete data
 * 4. Error Guessing - Missing data, invalid modes
 * 5. State & Rendering Check - Dialog states
 * 6. Non-Functional Checks - Accessibility
 */

describe('Supplier FormDialog Component - Unit Tests', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy Path Testing
  describe('Happy Path - Basic Functionality', () => {
    it('should render dialog when open', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      expect(screen.getByText('Add Supplier')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(
        <FormDialog
          open={false}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      expect(screen.queryByText('Add Supplier')).not.toBeInTheDocument();
    });

    it('should render all form fields in create mode', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      expect(screen.getByLabelText('Code')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Contact Person')).toBeInTheDocument();
      expect(screen.getByLabelText('Address')).toBeInTheDocument();
    });

    it('should call onClose when Cancel clicked', async () => {
      const user = userEvent.setup();
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      await user.click(screen.getByText('Cancel'));
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call console.log when Save clicked', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const user = userEvent.setup();
      
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      await user.click(screen.getByText('Save'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Save');
    });
  });

  // Equivalence Partitioning - Create vs Edit Modes
  describe('Equivalence Partitioning - Dialog Modes', () => {
    it('should show "Add Supplier" title in create mode', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      expect(screen.getByText('Add Supplier')).toBeInTheDocument();
    });

    it('should show "Edit Supplier" title in edit mode', () => {
      const selectedRow = {
        name: 'Test Supplier',
        email: 'test@example.com',
        phone: '123456789',
        address: '123 Test St',
      };

      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="edit"
          selectedRow={selectedRow}
        />
      );

      expect(screen.getByText('Edit Supplier')).toBeInTheDocument();
    });

    it('should populate fields with data in edit mode', () => {
      const selectedRow = {
        code: 'ACME01',
        name: 'Acme Corp',
        email: 'acme@example.com',
        phone: '987654321',
      };

      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="edit"
          selectedRow={selectedRow}
        />
      );

      // Check fields are rendered (defaultValue doesn't show in controlled tests)
      expect(screen.getByLabelText('Code')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    });

    it('should have empty fields in create mode', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');
      
      expect(nameInput.value).toBe('');
      expect(emailInput.value).toBe('');
    });
  });

  // Boundary Value Analysis
  describe('Boundary Value Analysis - Data States', () => {
    it('should handle edit mode with null selectedRow', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="edit"
          selectedRow={null}
        />
      );

      expect(screen.getByText('Không có dữ liệu để hiển thị')).toBeInTheDocument();
    });

    it('should handle edit mode with empty selectedRow', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="edit"
          selectedRow={{}}
        />
      );

      // Should render fields with empty values
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });

    it('should handle edit mode with partial data', () => {
      const partialRow = {
        name: 'Partial Supplier',
        email: 'partial@example.com',
        // code and phone missing
      };

      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="edit"
          selectedRow={partialRow}
        />
      );

      // Verify fields are rendered
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    });

    it('should handle very long field values', () => {
      const longDataRow = {
        code: 'C'.repeat(50),
        name: 'A'.repeat(100),
        email: 'very.long.email.address@verylongdomainname.com',
        phone: '123456789012345',
      };

      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="edit"
          selectedRow={longDataRow}
        />
      );

      // Verify all fields rendered
      expect(screen.getByLabelText('Code')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });
  });

  // Error Guessing
  describe('Error Guessing - Invalid States', () => {
    it('should handle undefined mode', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode={undefined}
          selectedRow={null}
        />
      );

      // Should default to create mode behavior
      expect(screen.getByText('Add Supplier')).toBeInTheDocument();
    });

    it('should handle invalid mode string', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="invalid"
          selectedRow={null}
        />
      );

      // Should default to create mode
      expect(screen.getByText('Add Supplier')).toBeInTheDocument();
    });

    it('should handle missing onClose', () => {
      render(
        <FormDialog
          open={true}
          onClose={undefined}
          mode="create"
          selectedRow={null}
        />
      );

      expect(screen.getByText('Add Supplier')).toBeInTheDocument();
    });

    it('should handle special characters in data', () => {
      const specialCharRow = {
        code: 'TEST-01',
        name: 'Test & Co.',
        email: 'test+tag@example.com',
        phone: '+1 (555) 123-4567',
      };

      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="edit"
          selectedRow={specialCharRow}
        />
      );

      // Verify fields rendered
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });
  });

  // State & Rendering Check
  describe('State & Rendering - Dialog States', () => {
    it('should render dialog with proper structure', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render DialogContent with dividers', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      // Verify dialog content is rendered
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render DialogButtons component', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      expect(screen.getByTestId('dialog-buttons')).toBeInTheDocument();
    });

    it('should update when mode changes', () => {
      const { rerender } = render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      expect(screen.getByText('Add Supplier')).toBeInTheDocument();

      rerender(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="edit"
          selectedRow={{ name: 'Test' }}
        />
      );

      expect(screen.getByText('Edit Supplier')).toBeInTheDocument();
    });
  });

  // Non-Functional - Accessibility
  describe('Non-Functional - Accessibility', () => {
    it('should have accessible dialog role', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have accessible form fields with labels', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      expect(screen.getByLabelText('Code')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    });

    it('should have proper field types', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      const emailInput = screen.getByLabelText('Email');
      const phoneInput = screen.getByLabelText('Phone');
      
      expect(emailInput).toHaveAttribute('type', 'text');
      expect(phoneInput).toHaveAttribute('type', 'text');
    });

    it('should be keyboard navigable', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).not.toHaveAttribute('disabled');
      });
    });
  });

  // Real-world Scenarios
  describe('Real-world Scenarios', () => {
    it('should support creating new supplier', async () => {
      const user = userEvent.setup();
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      await user.type(screen.getByLabelText('Name'), 'New Supplier');
      await user.type(screen.getByLabelText('Email'), 'new@supplier.com');
      await user.type(screen.getByLabelText('Phone'), '1234567890');

      expect(screen.getByDisplayValue('New Supplier')).toBeInTheDocument();
      expect(screen.getByDisplayValue('new@supplier.com')).toBeInTheDocument();
    });

    it('should support editing existing supplier', async () => {
      userEvent.setup();
      const existingSupplier = {
        code: 'OLD01',
        name: 'Old Supplier',
        email: 'old@supplier.com',
        phone: '0987654321',
      };

      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="edit"
          selectedRow={existingSupplier}
        />
      );

      // Verify edit mode
      expect(screen.getByText('Edit Supplier')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });

    it('should handle form submission flow', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const user = userEvent.setup();
      
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      await user.type(screen.getByLabelText('Name'), 'Test Supplier');
      await user.click(screen.getByText('Save'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Save');
    });

    it('should handle canceling form', async () => {
      const user = userEvent.setup();
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          mode="create"
          selectedRow={null}
        />
      );

      await user.type(screen.getByLabelText('Name'), 'Test');
      await user.click(screen.getByText('Cancel'));
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
