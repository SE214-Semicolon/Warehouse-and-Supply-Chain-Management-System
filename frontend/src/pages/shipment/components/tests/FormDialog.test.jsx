import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormDialog from '../FormDialog';

// Mock DialogButtons
vi.mock('@/components/DialogButtons', () => ({
  default: ({ onClose, onAction }) => (
    <div data-testid="dialog-buttons">
      <button onClick={onClose}>Cancel</button>
      <button onClick={onAction}>Save</button>
    </div>
  ),
}));

// Mock FormInput component
vi.mock('@/components/FormInput', () => ({
  default: ({ label, defaultValue, type, options, ...props }) => (
    type === 'select' ? (
      <select aria-label={label} defaultValue={defaultValue} {...props}>
        {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    ) : (
      <input aria-label={label} defaultValue={defaultValue} type={type} {...props} />
    )
  ),
}));

describe('Shipment FormDialog - Unit Tests', () => {
  let mockOnClose, mockOnAction;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnAction = vi.fn();
  });

  // Happy Path Tests
  describe('Happy Path', () => {
    it('should render dialog when open', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="create"
          selectedMenu="shipments"
          selectedRow={null}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add Shipments')).toBeInTheDocument();
    });

    it('should call onClose when cancel clicked', async () => {
      const user = userEvent.setup();
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="create"
          selectedMenu="shipments"
          selectedRow={null}
        />
      );

      await user.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onAction when save clicked', async () => {
      const user = userEvent.setup();
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="create"
          selectedMenu="shipments"
          selectedRow={null}
        />
      );

      await user.click(screen.getByText('Save'));
      expect(mockOnAction).toHaveBeenCalled();
    });

    it('should render shipment form fields', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="create"
          selectedMenu="shipments"
          selectedRow={null}
        />
      );

      expect(screen.getByLabelText('Shipment No.')).toBeInTheDocument();
      expect(screen.getByLabelText('Carrier')).toBeInTheDocument();
      expect(screen.getByLabelText('Track Code')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
    });
  });

  // Mode Tests
  describe('Mode Variations', () => {
    it('should handle create mode with correct title', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="create"
          selectedMenu="shipments"
          selectedRow={null}
        />
      );

      expect(screen.getByText('Add Shipments')).toBeInTheDocument();
    });

    it('should handle edit mode with data', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="edit"
          selectedMenu="shipments"
          selectedRow={{ 
            shipmentNo: 'SHIP001', 
            carrier: 'GHTK',
            trackingCode: 'TRK123',
            status: 'Shipped'
          }}
        />
      );

      expect(screen.getByText('Edit Shipments')).toBeInTheDocument();
      expect(screen.getByLabelText('Shipment No.')).toHaveValue('SHIP001');
    });

    it('should render shipment-items menu', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="create"
          selectedMenu="shipment-items"
          selectedRow={null}
        />
      );

      expect(screen.getByText('Add Shipment Items')).toBeInTheDocument();
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    it('should show error message when selectedRow is null in edit mode', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="edit"
          selectedMenu="shipments"
          selectedRow={null}
        />
      );

      expect(screen.getByText("Don't have data")).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(
        <FormDialog
          open={false}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="create"
          selectedMenu="shipments"
          selectedRow={null}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should show invalid message for unknown menu', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="create"
          selectedMenu="unknown-menu"
          selectedRow={null}
        />
      );

      expect(screen.getByText('Invalid')).toBeInTheDocument();
    });

    it('should handle empty selectedRow object in edit mode', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="edit"
          selectedMenu="shipments"
          selectedRow={{}}
        />
      );

      expect(screen.getByText('Edit Shipments')).toBeInTheDocument();
      expect(screen.getByLabelText('Shipment No.')).toHaveValue('');
    });
  });

  // Accessibility
  describe('Accessibility', () => {
    it('should have dialog role', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="create"
          selectedMenu="shipments"
          selectedRow={null}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have labeled form fields', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="create"
          selectedMenu="shipments"
          selectedRow={null}
        />
      );

      expect(screen.getByLabelText('Shipment No.')).toBeInTheDocument();
      expect(screen.getByLabelText('Carrier')).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      render(
        <FormDialog
          open={true}
          onClose={mockOnClose}
          onAction={mockOnAction}
          mode="create"
          selectedMenu="shipments"
          selectedRow={null}
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });
});
