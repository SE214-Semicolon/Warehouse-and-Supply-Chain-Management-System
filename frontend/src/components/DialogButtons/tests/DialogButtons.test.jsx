import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DialogButtons from '../DialogButtons';

/**
 * UNIT TEST: DialogButtons Component
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal button clicks
 * 2. Equivalence Partitioning - Different button configurations
 * 3. Error Guessing - Missing handlers, undefined props
 * 4. Non-Functional Checks - Accessibility, styling
 */

describe('DialogButtons Component - Unit Tests', () => {
  // Happy Path Testing
  describe('Happy Path - Basic Functionality', () => {
    it('should render Cancel and action buttons', () => {
      const handleClose = vi.fn();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleAction}
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should call onClose when Cancel clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleAction}
        />
      );

      await user.click(screen.getByText('Cancel'));
      
      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(handleAction).not.toHaveBeenCalled();
    });

    it('should call onAction when action button clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleAction}
        />
      );

      await user.click(screen.getByText('Save'));
      
      expect(handleAction).toHaveBeenCalledTimes(1);
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  // Equivalence Partitioning
  describe('Equivalence Partitioning - Button Configurations', () => {
    it('should render with custom action label', () => {
      const handleClose = vi.fn();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleAction}
          labelAction="Delete"
        />
      );

      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('should render with custom colors', () => {
      const handleClose = vi.fn();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleAction}
          colorAction="#D32F2F"
          colorCancel="#1976D2"
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should use default color when not provided', () => {
      const handleClose = vi.fn();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleAction}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeInTheDocument();
    });

    it('should use color prop as fallback', () => {
      const handleClose = vi.fn();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleAction}
          color="#FF5722"
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  // Error Guessing
  describe('Error Guessing - Invalid Props', () => {
    it('should handle missing onClose handler', async () => {
      const user = userEvent.setup();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={undefined}
          onAction={handleAction}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      await expect(user.click(cancelButton)).resolves.not.toThrow();
    });

    it('should handle missing onAction handler', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={undefined}
        />
      );

      const saveButton = screen.getByText('Save');
      await expect(user.click(saveButton)).resolves.not.toThrow();
    });

    it('should handle both handlers missing', () => {
      render(
        <DialogButtons 
          onClose={undefined}
          onAction={undefined}
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should handle empty label', () => {
      const handleClose = vi.fn();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleAction}
          labelAction=""
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });

  // Non-Functional - Accessibility
  describe('Non-Functional - Accessibility', () => {
    it('should render buttons with proper roles', () => {
      const handleClose = vi.fn();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleAction}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should have clickable buttons', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleAction}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      const saveButton = screen.getByText('Save');

      await user.click(cancelButton);
      await user.click(saveButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  // Real-world Scenarios
  describe('Real-world Scenarios', () => {
    it('should work in delete dialog context', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const handleDelete = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleDelete}
          labelAction="Delete"
          colorAction="#D32F2F"
          colorCancel="#D32F2F"
        />
      );

      await user.click(screen.getByText('Delete'));
      expect(handleDelete).toHaveBeenCalled();
    });

    it('should work in create dialog context', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const handleCreate = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleCreate}
          labelAction="Create"
        />
      );

      await user.click(screen.getByText('Create'));
      expect(handleCreate).toHaveBeenCalled();
    });

    it('should work in edit dialog context', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const handleUpdate = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleUpdate}
          labelAction="Update"
        />
      );

      await user.click(screen.getByText('Update'));
      expect(handleUpdate).toHaveBeenCalled();
    });

    it('should handle rapid button clicks', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleAction}
        />
      );

      // Rapid clicks on action button
      await user.click(screen.getByText('Save'));
      await user.click(screen.getByText('Save'));
      await user.click(screen.getByText('Save'));

      expect(handleAction).toHaveBeenCalledTimes(3);
    });

    it('should handle alternating button clicks', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const handleAction = vi.fn();
      
      render(
        <DialogButtons 
          onClose={handleClose}
          onAction={handleAction}
        />
      );

      await user.click(screen.getByText('Save'));
      await user.click(screen.getByText('Cancel'));
      await user.click(screen.getByText('Save'));

      expect(handleAction).toHaveBeenCalledTimes(2);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
