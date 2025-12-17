import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormDialog from '../FormDialog';

/**
 * UNIT TEST: Purchase Order FormDialog Component
 * 
 * Testing Techniques:
 * - Happy Path: Normal creation and editing flows
 * - Equivalence Partitioning: Add vs Edit modes
 * - BVA: Null/undefined values, edge cases
 * - Error Guessing: Missing props, invalid data
 * - State & Rendering: Dialog open/close states
 */

// Mock DialogButtons
vi.mock('@/components/DialogButtons', () => ({
  default: ({ onClose, onAction }) => (
    <div data-testid="dialog-buttons">
      <button onClick={onClose}>Hủy</button>
      <button onClick={onAction}>Lưu</button>
    </div>
  ),
}));

// Mock FieldConfig
vi.mock('../FieldConfig', () => ({
  fieldConfigs: {
    supplier: [
      {
        id: 'name',
        label: 'Tên nhà cung cấp',
        type: 'text',
      },
      {
        id: 'contact',
        label: 'Liên hệ',
        type: 'text',
      },
      {
        id: 'email',
        label: 'Email',
        type: 'email',
      },
    ],
  },
}));

describe('Purchase Order FormDialog Component - Unit Tests', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    mode: 'add',
    selectedRow: null,
  };

  describe('Happy Path', () => {
    it('should render dialog when open', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByText('Add Supplier')).toBeInTheDocument();
    });

    it('should show add title in add mode', () => {
      render(<FormDialog {...defaultProps} mode="add" />);
      
      expect(screen.getByText('Add Supplier')).toBeInTheDocument();
    });

    it('should show edit title in edit mode', () => {
      render(
        <FormDialog
          {...defaultProps}
          mode="edit"
          selectedRow={{ name: 'ABC Corp' }}
        />
      );
      
      expect(screen.getByText('Edit Supplier')).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByLabelText('Tên nhà cung cấp')).toBeInTheDocument();
      expect(screen.getByLabelText('Liên hệ')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('should render DialogButtons', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByTestId('dialog-buttons')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Hủy' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Lưu' })).toBeInTheDocument();
    });
  });

  describe('Equivalence Partitioning - Modes', () => {
    it('should handle add mode with empty fields', () => {
      render(<FormDialog {...defaultProps} mode="add" />);
      
      const nameInput = screen.getByLabelText('Tên nhà cung cấp');
      expect(nameInput).toHaveValue('');
    });

    it('should handle edit mode with populated fields', () => {
      const selectedRow = {
        name: 'Test Supplier',
        contact: '0123456789',
        email: 'test@example.com',
      };

      render(
        <FormDialog
          {...defaultProps}
          mode="edit"
          selectedRow={selectedRow}
        />
      );
      
      expect(screen.getByLabelText('Tên nhà cung cấp')).toHaveValue('Test Supplier');
      expect(screen.getByLabelText('Liên hệ')).toHaveValue('0123456789');
      expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<FormDialog {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: 'Hủy' }));

      expect(onClose).toHaveBeenCalled();
    });

    it('should handle save action when save button is clicked', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'log');

      render(<FormDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Lưu' }));

      expect(consoleSpy).toHaveBeenCalledWith('Save');
      
      consoleSpy.mockRestore();
    });

    it('should allow typing in text fields', async () => {
      const user = userEvent.setup();

      render(<FormDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText('Tên nhà cung cấp');
      await user.type(nameInput, 'New Supplier');

      expect(nameInput).toHaveValue('New Supplier');
    });
  });

  describe('BVA - Edge Cases', () => {
    it('should not render when closed', () => {
      render(<FormDialog {...defaultProps} open={false} />);
      
      expect(screen.queryByText('Add Supplier')).not.toBeInTheDocument();
    });

    it('should show error message when edit mode without selectedRow', () => {
      render(
        <FormDialog
          {...defaultProps}
          mode="edit"
          selectedRow={null}
        />
      );
      
      expect(screen.getByText('Không có dữ liệu để hiển thị')).toBeInTheDocument();
    });

    it('should handle selectedRow with missing fields', () => {
      render(
        <FormDialog
          {...defaultProps}
          mode="edit"
          selectedRow={{ name: 'Only Name' }}
        />
      );
      
      expect(screen.getByLabelText('Tên nhà cung cấp')).toHaveValue('Only Name');
      expect(screen.getByLabelText('Liên hệ')).toHaveValue('');
    });
  });

  describe('Error Guessing', () => {
    it('should handle undefined mode', () => {
      render(<FormDialog {...defaultProps} mode={undefined} />);
      
      expect(screen.getByText('Add Supplier')).toBeInTheDocument();
    });

    it('should handle null selectedRow in add mode', () => {
      render(<FormDialog {...defaultProps} selectedRow={null} />);
      
      expect(screen.getByLabelText('Tên nhà cung cấp')).toBeInTheDocument();
    });

    it('should handle missing onClose', () => {
      render(<FormDialog {...defaultProps} onClose={undefined} />);
      
      expect(screen.getByText('Add Supplier')).toBeInTheDocument();
    });
  });

  describe('Field Rendering', () => {
    it('should render text fields with correct type', () => {
      render(<FormDialog {...defaultProps} />);
      
      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should render all fields in correct order', () => {
      render(<FormDialog {...defaultProps} />);
      
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have accessible form fields', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByLabelText('Tên nhà cung cấp')).toBeEnabled();
      expect(screen.getByLabelText('Liên hệ')).toBeEnabled();
      expect(screen.getByLabelText('Email')).toBeEnabled();
    });

    it('should have accessible buttons', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Hủy' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Lưu' })).toBeEnabled();
    });
  });
});
