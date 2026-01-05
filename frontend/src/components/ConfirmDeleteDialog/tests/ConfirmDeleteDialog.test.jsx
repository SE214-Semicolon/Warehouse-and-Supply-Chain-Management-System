import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDeleteDialog from '../ConfirmDeleteDialog';

/**
 * UNIT TEST: ConfirmDeleteDialog Component
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal dialog operations
 * 2. Equivalence Partitioning - Different row data types
 * 3. Error Guessing - Failed delete operations, missing data
 * 4. State & Rendering Check - Error state handling
 * 5. Non-Functional Checks - Accessibility
 */

describe('ConfirmDeleteDialog Component - Unit Tests', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy Path Testing
  describe('Happy Path - Basic Functionality', () => {
    it('should render dialog when open', () => {
      const selectedRow = { name: 'Test Item' };
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      expect(screen.getByText('Delete Confirmation')).toBeInTheDocument();
      expect(screen.getByText(/Test Item/)).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      const selectedRow = { name: 'Test Item' };
      
      render(
        <ConfirmDeleteDialog
          open={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      expect(screen.queryByText('Delete Confirmation')).not.toBeInTheDocument();
    });

    it('should call onConfirm when Delete button clicked', async () => {
      const user = userEvent.setup();
      const selectedRow = { name: 'Test Item' };
      mockOnConfirm.mockResolvedValue();
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      await user.click(screen.getByText('Delete'));
      
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Cancel button clicked', async () => {
      const user = userEvent.setup();
      const selectedRow = { name: 'Test Item' };
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      await user.click(screen.getByText('Cancel'));
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  // Equivalence Partitioning
  describe('Equivalence Partitioning - Different Row Data', () => {
    it('should display item name when provided', () => {
      const selectedRow = { name: 'Product ABC' };
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      expect(screen.getByText(/Product ABC/)).toBeInTheDocument();
    });

    it('should display code when name not available', () => {
      const selectedRow = { code: 'CODE123' };
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      expect(screen.getByText(/CODE123/)).toBeInTheDocument();
    });

    it('should display batchNo when name and code not available', () => {
      const selectedRow = { batchNo: 'BATCH456' };
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      expect(screen.getByText(/BATCH456/)).toBeInTheDocument();
    });

    it('should handle empty selectedRow', () => {
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={{}}
        />
      );

      expect(screen.getByText('Delete Confirmation')).toBeInTheDocument();
    });

    it('should handle null selectedRow', () => {
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={null}
        />
      );

      expect(screen.getByText('Delete Confirmation')).toBeInTheDocument();
    });
  });

  // Error Guessing - Error Handling
  describe('Error Guessing - Failed Delete Operations', () => {
    it('should display error when onConfirm throws error', async () => {
      const user = userEvent.setup();
      const selectedRow = { name: 'Test Item' };
      const errorMessage = 'Failed to delete item';
      mockOnConfirm.mockRejectedValue(errorMessage);
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      await user.click(screen.getByText('Delete'));
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should clear error when dialog reopened', async () => {
      const user = userEvent.setup();
      const selectedRow = { name: 'Test Item' };
      const errorMessage = 'Failed to delete item';
      mockOnConfirm.mockRejectedValue(errorMessage);
      
      const { rerender } = render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      await user.click(screen.getByText('Delete'));
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Close and reopen
      rerender(
        <ConfirmDeleteDialog
          open={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      rerender(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
      });
    });

    it('should handle multiple failed delete attempts', async () => {
      const user = userEvent.setup();
      const selectedRow = { name: 'Test Item' };
      mockOnConfirm.mockRejectedValue('Error 1');
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      await user.click(screen.getByText('Delete'));
      
      await waitFor(() => {
        expect(screen.getByText('Error 1')).toBeInTheDocument();
      });

      // Try again with different error
      mockOnConfirm.mockRejectedValue('Error 2');
      await user.click(screen.getByText('Delete'));
      
      await waitFor(() => {
        expect(screen.getByText('Error 2')).toBeInTheDocument();
        expect(screen.queryByText('Error 1')).not.toBeInTheDocument();
      });
    });

    it('should handle network error', async () => {
      const user = userEvent.setup();
      const selectedRow = { name: 'Test Item' };
      mockOnConfirm.mockRejectedValue('Network error occurred');
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      await user.click(screen.getByText('Delete'));
      
      await waitFor(() => {
        expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      });
    });
  });

  // State & Rendering Check
  describe('State & Rendering - Dialog States', () => {
    it('should show confirmation message with item name', () => {
      const selectedRow = { name: 'Important Item' };
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      expect(screen.getByText(/Important Item/)).toBeInTheDocument();
    });

    it('should have Delete and Cancel buttons', () => {
      const selectedRow = { name: 'Test Item' };
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should not show error initially', () => {
      const selectedRow = { name: 'Test Item' };
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // Non-Functional - Accessibility
  describe('Non-Functional - Accessibility', () => {
    it('should have accessible dialog structure', () => {
      const selectedRow = { name: 'Test Item' };
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      const selectedRow = { name: 'Test Item' };
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should show error with proper alert role', async () => {
      const user = userEvent.setup();
      const selectedRow = { name: 'Test Item' };
      mockOnConfirm.mockRejectedValue('Delete failed');
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      await user.click(screen.getByText('Delete'));
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  // Real-world Scenarios
  describe('Real-world Scenarios', () => {
    it('should handle successful delete flow', async () => {
      const user = userEvent.setup();
      const selectedRow = { name: 'Product to Delete' };
      mockOnConfirm.mockResolvedValue();
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      await user.click(screen.getByText('Delete'));
      
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });
    });

    it('should handle user canceling delete', async () => {
      const user = userEvent.setup();
      const selectedRow = { name: 'Product to Keep' };
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      await user.click(screen.getByText('Cancel'));
      
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should handle permission denied scenario', async () => {
      const user = userEvent.setup();
      const selectedRow = { name: 'Protected Item' };
      mockOnConfirm.mockRejectedValue('Permission denied');
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      await user.click(screen.getByText('Delete'));
      
      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument();
      });
    });

    it('should handle item with long name', () => {
      const selectedRow = { 
        name: 'This is a very long item name that should still be displayed correctly in the dialog' 
      };
      
      render(
        <ConfirmDeleteDialog
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          selectedRow={selectedRow}
        />
      );

      expect(screen.getByText(/This is a very long item name/)).toBeInTheDocument();
    });
  });
});
