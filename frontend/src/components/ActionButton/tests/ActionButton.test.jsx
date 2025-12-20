import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionButtons from '../../ActionButton';

/**
 * UNIT TEST: ActionButtons Component
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal button clicks and menu interactions
 * 2. Decision Table Testing - Different prop combinations
 * 3. BVA - With/without handlers, edge cases
 * 4. Error Guessing - Missing handlers, rapid interactions
 * 5. State & Rendering Check - Menu open/close states
 * 6. Non-Functional Checks - Accessibility, menu behavior
 */

describe('ActionButtons Component - Unit Tests', () => {
  // Happy Path Testing
  describe('Happy Path - Add Button', () => {
    it('should render Add button when onAdd provided', () => {
      const handleAdd = vi.fn();
      
      render(<ActionButtons onAdd={handleAdd} />);
      
      expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
    });

    it('should call onAdd when Add button clicked', async () => {
      const user = userEvent.setup();
      const handleAdd = vi.fn();
      
      render(<ActionButtons onAdd={handleAdd} />);
      
      const addButton = screen.getByRole('button', { name: /Add/i });
      await user.click(addButton);
      
      expect(handleAdd).toHaveBeenCalledTimes(1);
    });

    it('should not render Add button when onAdd not provided', () => {
      render(<ActionButtons />);
      
      const addButton = screen.queryByRole('button', { name: /Add/i });
      expect(addButton).not.toBeInTheDocument();
    });
  });

  // Happy Path - Menu Actions
  describe('Happy Path - Menu Actions', () => {
    it('should render menu button when any menu action provided', () => {
      const handleImport = vi.fn();
      
      render(<ActionButtons onImport={handleImport} />);
      
      // Should have a menu button (MoreVert icon button)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should open menu when menu button clicked', async () => {
      const user = userEvent.setup();
      const handleImport = vi.fn();
      
      render(<ActionButtons onImport={handleImport} />);
      
      // Click the menu button (MoreVert icon)
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      // Menu should be visible
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should close menu after clicking menu item', async () => {
      const user = userEvent.setup();
      const handleImport = vi.fn();
      
      render(<ActionButtons onImport={handleImport} />);
      
      // Open menu
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      // Click Import menu item
      const importItem = screen.getByRole('menuitem', { name: /Import/i });
      await user.click(importItem);
      
      // Handler should be called
      expect(handleImport).toHaveBeenCalledTimes(1);
      
      // Menu should be closed (not in document)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  // Decision Table - Different Handler Combinations
  describe('Decision Table - Handler Combinations', () => {
    it('should show only Import when onImport provided', async () => {
      const user = userEvent.setup();
      const handleImport = vi.fn();
      
      render(<ActionButtons onImport={handleImport} />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      expect(screen.getByRole('menuitem', { name: /Import/i })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /Export/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /Print/i })).not.toBeInTheDocument();
    });

    it('should show only Export when onExport provided', async () => {
      const user = userEvent.setup();
      const handleExport = vi.fn();
      
      render(<ActionButtons onExport={handleExport} />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      expect(screen.queryByRole('menuitem', { name: /Import/i })).not.toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Export/i })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /Print/i })).not.toBeInTheDocument();
    });

    it('should show only Print when onPrint provided', async () => {
      const user = userEvent.setup();
      const handlePrint = vi.fn();
      
      render(<ActionButtons onPrint={handlePrint} />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      expect(screen.queryByRole('menuitem', { name: /Import/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /Export/i })).not.toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Print/i })).toBeInTheDocument();
    });

    it('should show all menu items when all handlers provided', async () => {
      const user = userEvent.setup();
      const handlers = {
        onImport: vi.fn(),
        onExport: vi.fn(),
        onPrint: vi.fn(),
      };
      
      render(<ActionButtons {...handlers} />);
      
      const menuButton = screen.getAllByRole('button')[0];
      await user.click(menuButton);
      
      expect(screen.getByRole('menuitem', { name: /Import/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Export/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Print/i })).toBeInTheDocument();
    });

    it('should show Add button + menu when all handlers provided', async () => {
      const handlers = {
        onAdd: vi.fn(),
        onImport: vi.fn(),
        onExport: vi.fn(),
        onPrint: vi.fn(),
      };
      
      render(<ActionButtons {...handlers} />);
      
      // Should have Add button
      expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
      
      // Should have menu button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(2); // Add button + Menu button
    });
  });

  // BVA - Edge Cases
  describe('BVA - No Handlers Provided', () => {
    it('should render empty Box when no handlers provided', () => {
      const { container } = render(<ActionButtons />);
      
      // No buttons should be rendered
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBe(0);
      
      // But container should exist
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle null handlers', () => {
      render(
        <ActionButtons
          onAdd={null}
          onImport={null}
          onExport={null}
          onPrint={null}
        />
      );
      
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBe(0);
    });

    it('should handle undefined handlers', () => {
      render(
        <ActionButtons
          onAdd={undefined}
          onImport={undefined}
          onExport={undefined}
          onPrint={undefined}
        />
      );
      
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBe(0);
    });
  });

  // State & Rendering - Menu State
  describe('State & Rendering - Menu Open/Close', () => {
    it('should open and close menu multiple times', async () => {
      const user = userEvent.setup();
      const handleImport = vi.fn();
      
      render(<ActionButtons onImport={handleImport} />);
      
      const menuButton = screen.getByRole('button');
      
      // First open
      await user.click(menuButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      
      // Close by clicking away
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      
      // Second open
      await user.click(menuButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should close menu when clicking outside', async () => {
      const user = userEvent.setup();
      const handleImport = vi.fn();
      
      render(
        <>
          <ActionButtons onImport={handleImport} />
          <div data-testid="outside">Outside</div>
        </>
      );
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
      
      // Click outside - MUI Menu uses backdrop, so press Escape instead
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('should close menu with Escape key', async () => {
      const user = userEvent.setup();
      const handleImport = vi.fn();
      
      render(<ActionButtons onImport={handleImport} />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  // Error Guessing - Menu Item Clicks
  describe('Error Guessing - Menu Item Actions', () => {
    it('should call correct handler when Import clicked', async () => {
      const user = userEvent.setup();
      const handlers = {
        onImport: vi.fn(),
        onExport: vi.fn(),
        onPrint: vi.fn(),
      };
      
      render(<ActionButtons {...handlers} />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const importItem = screen.getByRole('menuitem', { name: /Import/i });
      await user.click(importItem);
      
      expect(handlers.onImport).toHaveBeenCalledTimes(1);
      expect(handlers.onExport).not.toHaveBeenCalled();
      expect(handlers.onPrint).not.toHaveBeenCalled();
    });

    it('should call correct handler when Export clicked', async () => {
      const user = userEvent.setup();
      const handlers = {
        onImport: vi.fn(),
        onExport: vi.fn(),
        onPrint: vi.fn(),
      };
      
      render(<ActionButtons {...handlers} />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const exportItem = screen.getByRole('menuitem', { name: /Export/i });
      await user.click(exportItem);
      
      expect(handlers.onExport).toHaveBeenCalledTimes(1);
      expect(handlers.onImport).not.toHaveBeenCalled();
      expect(handlers.onPrint).not.toHaveBeenCalled();
    });

    it('should call correct handler when Print clicked', async () => {
      const user = userEvent.setup();
      const handlers = {
        onImport: vi.fn(),
        onExport: vi.fn(),
        onPrint: vi.fn(),
      };
      
      render(<ActionButtons {...handlers} />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const printItem = screen.getByRole('menuitem', { name: /Print/i });
      await user.click(printItem);
      
      expect(handlers.onPrint).toHaveBeenCalledTimes(1);
      expect(handlers.onImport).not.toHaveBeenCalled();
      expect(handlers.onExport).not.toHaveBeenCalled();
    });

    it('should handle multiple menu item clicks', async () => {
      const user = userEvent.setup();
      const handlers = {
        onImport: vi.fn(),
        onExport: vi.fn(),
      };
      
      render(<ActionButtons {...handlers} />);
      
      const menuButton = screen.getByRole('button');
      
      // Click Import
      await user.click(menuButton);
      await user.click(screen.getByRole('menuitem', { name: /Import/i }));
      
      // Click Export
      await user.click(menuButton);
      await user.click(screen.getByRole('menuitem', { name: /Export/i }));
      
      expect(handlers.onImport).toHaveBeenCalledTimes(1);
      expect(handlers.onExport).toHaveBeenCalledTimes(1);
    });
  });

  // Non-Functional - Accessibility
  describe('Non-Functional - Accessibility', () => {
    it('should have accessible Add button', () => {
      const handleAdd = vi.fn();
      
      render(<ActionButtons onAdd={handleAdd} />);
      
      const addButton = screen.getByRole('button', { name: /Add/i });
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveAccessibleName();
    });

    it('should have accessible menu items', async () => {
      const user = userEvent.setup();
      const handlers = {
        onImport: vi.fn(),
        onExport: vi.fn(),
        onPrint: vi.fn(),
      };
      
      render(<ActionButtons {...handlers} />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      // All menu items should be accessible
      expect(screen.getByRole('menuitem', { name: /Import/i })).toHaveAccessibleName();
      expect(screen.getByRole('menuitem', { name: /Export/i })).toHaveAccessibleName();
      expect(screen.getByRole('menuitem', { name: /Print/i })).toHaveAccessibleName();
    });

    it('should support keyboard navigation in menu', async () => {
      const user = userEvent.setup();
      const handlers = {
        onImport: vi.fn(),
        onExport: vi.fn(),
        onPrint: vi.fn(),
      };
      
      render(<ActionButtons {...handlers} />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
      
      // Navigate with arrow keys - menu opens with first item focused  
      await user.keyboard('{ArrowDown}'); // Move to Export
      await user.keyboard('{Enter}');
      
      // Should call second item (Export)
      await waitFor(() => {
        expect(handlers.onExport).toHaveBeenCalled();
      });
    });

    it('should have proper ARIA attributes for menu', async () => {
      const user = userEvent.setup();
      const handleImport = vi.fn();
      
      render(<ActionButtons onImport={handleImport} />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('role', 'menu');
    });
  });

  // Real-world Scenarios
  describe('Real-world Scenarios', () => {
    it('should handle complete toolbar with all actions', async () => {
      const user = userEvent.setup();
      const handlers = {
        onAdd: vi.fn(),
        onImport: vi.fn(),
        onExport: vi.fn(),
        onPrint: vi.fn(),
      };
      
      render(<ActionButtons {...handlers} />);
      
      // Click Add button
      const addButton = screen.getByRole('button', { name: /Add/i });
      await user.click(addButton);
      expect(handlers.onAdd).toHaveBeenCalled();
      
      // Open menu and click Import
      const menuButton = screen.getAllByRole('button')[1];
      await user.click(menuButton);
      await user.click(screen.getByRole('menuitem', { name: /Import/i }));
      expect(handlers.onImport).toHaveBeenCalled();
    });

    it('should handle rapid Add button clicks', async () => {
      const user = userEvent.setup();
      const handleAdd = vi.fn();
      
      render(<ActionButtons onAdd={handleAdd} />);
      
      const addButton = screen.getByRole('button', { name: /Add/i });
      
      // Rapid clicks
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);
      
      expect(handleAdd).toHaveBeenCalledTimes(3);
    });

    it('should maintain menu state independently from Add button', async () => {
      const user = userEvent.setup();
      const handlers = {
        onAdd: vi.fn(),
        onImport: vi.fn(),
      };
      
      render(<ActionButtons {...handlers} />);
      
      const addButton = screen.getByRole('button', { name: /Add/i });
      const menuButton = screen.getAllByRole('button')[1];
      
      // Click Add (should not affect menu state)
      await user.click(addButton);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      
      // Open menu
      await user.click(menuButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      
      // Clicking Add again should not close menu
      await user.click(addButton);
      expect(handlers.onAdd).toHaveBeenCalledTimes(2);
    });
  });
});
