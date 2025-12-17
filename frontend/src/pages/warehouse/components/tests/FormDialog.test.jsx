import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormDialog from '../FormDialog';

/**
 * UNIT TEST: Warehouse FormDialog Component
 * 
 * Testing Techniques:
 * - Happy Path: Normal creation and editing flows
 * - Equivalence Partitioning: Add vs Edit modes
 * - BVA: Null/undefined values, edge cases
 * - Error Guessing: Missing props, invalid data
 * - State & Rendering: Dialog open/close states
 */

// Mock FormFieldsRenderer
vi.mock('../FormFieldsRenderer', () => ({
  default: ({ onSubmit, onCancel, mode, selectedRow }) => (
    <div data-testid="form-fields-renderer">
      <div>Mode: {mode}</div>
      {selectedRow && <div>Row: {selectedRow.name}</div>}
      <button onClick={() => onSubmit({ test: 'data' })}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock MenuConfig
vi.mock('../MenuConfig', () => ({
  menuItems: [
    {
      id: 'warehouse',
      label: 'Warehouse',
      columns: [
        { id: 'name', label: 'Name' },
        { id: 'location', label: 'Location' },
      ],
    },
  ],
}));

describe('Warehouse FormDialog Component - Unit Tests', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onAction: vi.fn(),
    mode: 'add',
    selectedMenu: 'warehouse',
    selectedRow: null,
  };

  describe('Happy Path', () => {
    it('should render dialog when open', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByText('Add Warehouse')).toBeInTheDocument();
      expect(screen.getByTestId('form-fields-renderer')).toBeInTheDocument();
    });

    it('should show add title in add mode', () => {
      render(<FormDialog {...defaultProps} mode="add" />);
      
      expect(screen.getByText('Add Warehouse')).toBeInTheDocument();
    });

    it('should show edit title with row name in edit mode', () => {
      const editProps = {
        ...defaultProps,
        mode: 'edit',
        selectedRow: { name: 'Central Warehouse', location: 'HCM' },
      };

      render(<FormDialog {...editProps} />);
      
      expect(screen.getByText('Edit Central Warehouse')).toBeInTheDocument();
    });
  });

  describe('Equivalence Partitioning - Modes', () => {
    it('should handle add mode correctly', () => {
      render(<FormDialog {...defaultProps} mode="add" />);
      
      expect(screen.getByText('Mode: add')).toBeInTheDocument();
      expect(screen.getByText('Add Warehouse')).toBeInTheDocument();
    });

    it('should handle edit mode correctly', () => {
      const editProps = {
        ...defaultProps,
        mode: 'edit',
        selectedRow: { name: 'North Warehouse' },
      };

      render(<FormDialog {...editProps} />);
      
      expect(screen.getByText('Mode: edit')).toBeInTheDocument();
      expect(screen.getByText('Row: North Warehouse')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onAction and onClose when submitting', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const onClose = vi.fn();

      render(
        <FormDialog
          {...defaultProps}
          onAction={onAction}
          onClose={onClose}
        />
      );

      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(onAction).toHaveBeenCalledWith({ test: 'data' });
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should call onClose when canceling', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<FormDialog {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('BVA - Edge Cases', () => {
    it('should handle missing currentMenu label', () => {
      render(<FormDialog {...defaultProps} selectedMenu="non-existent" />);
      
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('should handle edit mode without selectedRow name', () => {
      render(
        <FormDialog
          {...defaultProps}
          mode="edit"
          selectedRow={{}}
        />
      );
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<FormDialog {...defaultProps} open={false} />);
      
      expect(screen.queryByText('Add Warehouse')).not.toBeInTheDocument();
    });
  });

  describe('Error Guessing', () => {
    it('should handle null selectedRow in add mode', () => {
      render(<FormDialog {...defaultProps} selectedRow={null} />);
      
      expect(screen.getByTestId('form-fields-renderer')).toBeInTheDocument();
    });

    it('should handle undefined selectedMenu', () => {
      render(<FormDialog {...defaultProps} selectedMenu={undefined} />);
      
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('should handle missing onAction', async () => {
      const user = userEvent.setup();
      
      render(<FormDialog {...defaultProps} onAction={undefined} />);

      // Should not crash when submitting
      await user.click(screen.getByText('Submit'));
    });
  });

  describe('State & Rendering', () => {
    it('should render FormFieldsRenderer with correct props', () => {
      const selectedRow = { name: 'Test Warehouse' };
      
      render(
        <FormDialog
          {...defaultProps}
          mode="edit"
          selectedRow={selectedRow}
        />
      );

      expect(screen.getByTestId('form-fields-renderer')).toBeInTheDocument();
      expect(screen.getByText('Mode: edit')).toBeInTheDocument();
      expect(screen.getByText('Row: Test Warehouse')).toBeInTheDocument();
    });

    it('should pass correct selectedMenu to FormFieldsRenderer', () => {
      render(<FormDialog {...defaultProps} selectedMenu="warehouse" />);
      
      expect(screen.getByTestId('form-fields-renderer')).toBeInTheDocument();
    });
  });
});
