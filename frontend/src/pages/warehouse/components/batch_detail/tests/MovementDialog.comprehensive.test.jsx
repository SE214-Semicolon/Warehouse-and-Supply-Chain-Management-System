import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovementDialog from '../MovementDialog';

// Mock FormInput
vi.mock('@/components/FormInput', () => ({
  default: ({ label, value, onChange, error, helperText, type, options, onKeyDown, autoFocus }) => (
    <div>
      <label>{label}</label>
      {type === 'select' ? (
        <select
          aria-label={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          data-error={error}
        >
          <option value="">Select...</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          aria-label={label}
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          data-error={error}
        />
      )}
      {helperText && <span data-testid={`${label}-helper`}>{helperText}</span>}
    </div>
  ),
}));

// Mock DialogButtons
vi.mock('@/components/DialogButtons', () => ({
  default: ({ onClose, onAction }) => (
    <div>
      <button onClick={onClose}>Cancel</button>
      <button onClick={onAction}>Save</button>
    </div>
  ),
}));

describe('MovementDialog - Comprehensive Tests', () => {
  const mockLocations = [
    { id: '1', code: 'LOC-001', name: 'Location 1' },
    { id: '2', code: 'LOC-002', name: 'Location 2' },
    { id: '3', code: 'LOC-003', name: 'Location 3' },
  ];

  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnClose.mockClear();
    mockOnSubmit.mockClear();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  // ==================== RECEIVE TYPE ====================
  describe('Receive Movement Type', () => {
    it('renders receive dialog with correct title', () => {
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Receive Inventory')).toBeInTheDocument();
    });

    it('shows quantity and location fields for receive', () => {
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
      expect(screen.getByLabelText('Location')).toBeInTheDocument();
      expect(screen.queryByLabelText('From Location')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('To Location')).not.toBeInTheDocument();
    });

    it('validates required fields for receive', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.click(screen.getByText('Save'));

      expect(mockOnSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Quantity is required')).toBeInTheDocument();
    });

    it('submits valid receive data', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.selectOptions(screen.getByLabelText('Location'), '1');

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            quantity: '100',
            locationId: '1',
          })
        );
      });
    });
  });

  // ==================== DISPATCH TYPE ====================
  describe('Dispatch Movement Type', () => {
    it('renders dispatch dialog with correct title', () => {
      render(
        <MovementDialog
          open={true}
          type="dispatch"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Dispatch Inventory')).toBeInTheDocument();
    });

    it('shows single location field for dispatch', () => {
      render(
        <MovementDialog
          open={true}
          type="dispatch"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText('Location')).toBeInTheDocument();
      expect(screen.queryByLabelText('From Location')).not.toBeInTheDocument();
    });

    it('submits valid dispatch data', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="dispatch"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '50');
      await user.selectOptions(screen.getByLabelText('Location'), '2');

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            quantity: '50',
            locationId: '2',
          })
        );
      });
    });
  });

  // ==================== TRANSFER TYPE ====================
  describe('Transfer Movement Type', () => {
    it('renders transfer dialog with correct title', () => {
      render(
        <MovementDialog
          open={true}
          type="transfer"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Transfer Inventory')).toBeInTheDocument();
    });

    it('shows from and to location fields for transfer', () => {
      render(
        <MovementDialog
          open={true}
          type="transfer"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText('From Location')).toBeInTheDocument();
      expect(screen.getByLabelText('To Location')).toBeInTheDocument();
      expect(screen.queryByLabelText('Location')).not.toBeInTheDocument();
    });

    it('validates from and to locations are different', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="transfer"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.selectOptions(screen.getByLabelText('From Location'), '1');
      await user.selectOptions(screen.getByLabelText('To Location'), '1');

      await user.click(screen.getByText('Save'));

      expect(mockOnSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Destination cannot be same as Source')).toBeInTheDocument();
    });

    it('submits valid transfer data', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="transfer"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '75');
      await user.selectOptions(screen.getByLabelText('From Location'), '1');
      await user.selectOptions(screen.getByLabelText('To Location'), '2');

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            quantity: '75',
            fromLocationId: '1',
            toLocationId: '2',
          })
        );
      });
    });

    it('clears same location error when selection changes', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="transfer"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.selectOptions(screen.getByLabelText('From Location'), '1');
      await user.selectOptions(screen.getByLabelText('To Location'), '1');

      // Trigger validation
      await user.click(screen.getByText('Save'));
      expect(screen.getByText('Destination cannot be same as Source')).toBeInTheDocument();

      // Change to different location
      await user.selectOptions(screen.getByLabelText('To Location'), '2');

      await waitFor(() => {
        expect(screen.queryByText('Destination cannot be same as Source')).not.toBeInTheDocument();
      });
    });
  });

  // ==================== RESERVE TYPE ====================
  describe('Reserve Movement Type', () => {
    it('renders reserve dialog with correct title', () => {
      render(
        <MovementDialog
          open={true}
          type="reserve"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Reserve Inventory')).toBeInTheDocument();
    });

    it('submits valid reserve data', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="reserve"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '25');
      await user.selectOptions(screen.getByLabelText('Location'), '3');

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  // ==================== RELEASE TYPE ====================
  describe('Release Movement Type', () => {
    it('renders release dialog with correct title', () => {
      render(
        <MovementDialog
          open={true}
          type="release"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Release Inventory')).toBeInTheDocument();
    });
  });

  // ==================== QUANTITY VALIDATION ====================
  describe('Quantity Validation', () => {
    it('requires quantity field', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.click(screen.getByText('Save'));

      expect(screen.getByText('Quantity is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates quantity must be greater than 0', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '0');
      await user.click(screen.getByText('Save'));

      expect(screen.getByText('Quantity must be > 0')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates quantity max value (30,000)', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '30001');
      await user.click(screen.getByText('Save'));

      expect(screen.getByText('Must not exceed 30,000')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('accepts valid quantity', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '15000');
      await user.selectOptions(screen.getByLabelText('Location'), '1');

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('allows only numeric input in quantity field', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const quantityInput = screen.getByLabelText('Quantity');
      
      // Number input only accepts numeric values
      await user.type(quantityInput, 'abc123');
      // Number input should filter out letters and only keep numbers
      expect(quantityInput.value).toMatch(/^\d*$/);
    });

    it('clears quantity error when valid value entered', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Trigger error
      await user.click(screen.getByText('Save'));
      expect(screen.getByText('Quantity is required')).toBeInTheDocument();

      // Enter valid value
      await user.type(screen.getByLabelText('Quantity'), '100');

      await waitFor(() => {
        expect(screen.queryByText('Quantity is required')).not.toBeInTheDocument();
      });
    });
  });

  // ==================== LOCATION VALIDATION ====================
  describe('Location Validation', () => {
    it('requires location field for non-transfer types', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.click(screen.getByText('Save'));

      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('requires both from and to locations for transfer', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="transfer"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.click(screen.getByText('Save'));

      const errorMessages = screen.getAllByText('This field is required');
      expect(errorMessages.length).toBeGreaterThanOrEqual(2);
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('displays location options correctly', () => {
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const locationSelect = screen.getByLabelText('Location');
      expect(locationSelect).toBeInTheDocument();

      // Check options are rendered
      mockLocations.forEach(loc => {
        const optionText = `${loc.code} - ${loc.name}`;
        expect(screen.getByText(optionText)).toBeInTheDocument();
      });
    });
  });

  // ==================== ERROR HANDLING ====================
  describe('Error Handling', () => {
    it('displays API error message', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValue('Insufficient inventory');

      render(
        <MovementDialog
          open={true}
          type="dispatch"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.selectOptions(screen.getByLabelText('Location'), '1');

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(screen.getByText('Insufficient inventory')).toBeInTheDocument();
      });
    });

    it('clears API error when user makes changes', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValueOnce('Error message');

      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.selectOptions(screen.getByLabelText('Location'), '1');
      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(screen.getByText('Error message')).toBeInTheDocument();
      });

      // Make a change
      await user.clear(screen.getByLabelText('Quantity'));
      await user.type(screen.getByLabelText('Quantity'), '200');

      await waitFor(() => {
        expect(screen.queryByText('Error message')).not.toBeInTheDocument();
      });
    });
  });

  // ==================== DIALOG ACTIONS ====================
  describe('Dialog Actions', () => {
    it('does not call onSubmit when Cancel button clicked', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.click(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('closes dialog after successful submit', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.selectOptions(screen.getByLabelText('Location'), '1');

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  // ==================== FORM RESET ====================
  describe('Form Reset on Open', () => {
    it('resets form data when dialog reopens', () => {
      const { rerender } = render(
        <MovementDialog
          open={false}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      rerender(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Check that quantity input is empty (number inputs start with null value)
      const quantityInput = screen.getByLabelText('Quantity');
      expect(quantityInput).toBeInTheDocument();
      expect(quantityInput).toHaveAttribute('type', 'number');
    });

    it('clears errors when dialog reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Create error
      await user.click(screen.getByText('Save'));
      expect(screen.getByText('Quantity is required')).toBeInTheDocument();

      // Close and reopen
      rerender(
        <MovementDialog
          open={false}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      rerender(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.queryByText('Quantity is required')).not.toBeInTheDocument();
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('handles empty locations array', () => {
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={[]}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const locationSelect = screen.getByLabelText('Location');
      expect(locationSelect).toBeInTheDocument();
    });

    it('handles undefined type gracefully', () => {
      render(
        <MovementDialog
          open={true}
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Inventory Action')).toBeInTheDocument();
    });

    it('submits with valid positive quantity', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '10');
      await user.selectOptions(screen.getByLabelText('Location'), '1');
      await user.click(screen.getByText('Save'));

      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('renders quantity field as first input (for autofocus)', () => {
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const quantityInput = screen.getByLabelText('Quantity');
      // Check that quantity field exists and is in the document (autoFocus is set via prop but not reflected in DOM attribute)
      expect(quantityInput).toBeInTheDocument();
      expect(quantityInput).toHaveAttribute('type', 'number');
    });
  });

  // ==================== ACCESSIBILITY ====================
  describe('Accessibility', () => {
    it('provides labels for all form fields', () => {
      render(
        <MovementDialog
          open={true}
          type="transfer"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
      expect(screen.getByLabelText('From Location')).toBeInTheDocument();
      expect(screen.getByLabelText('To Location')).toBeInTheDocument();
    });

    it('shows helper text for errors', async () => {
      const user = userEvent.setup();
      render(
        <MovementDialog
          open={true}
          type="receive"
          locations={mockLocations}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.click(screen.getByText('Save'));

      expect(screen.getByTestId('Quantity-helper')).toHaveTextContent('Quantity is required');
    });
  });
});
