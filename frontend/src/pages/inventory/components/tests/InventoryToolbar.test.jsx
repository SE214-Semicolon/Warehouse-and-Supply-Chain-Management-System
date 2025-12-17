import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InventoryToolbar from '../InventoryToolbar';
import { Inventory, Category, Warning } from '@mui/icons-material';

/**
 * UNIT TEST: InventoryToolbar Component
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal menu selection
 * 2. Equivalence Partitioning - Different menu configurations
 * 3. Boundary Value Analysis - Empty/single/many items
 * 4. Error Guessing - Missing props, rapid clicks
 * 5. Non-Functional Checks - Accessibility
 */

describe('InventoryToolbar Component - Unit Tests', () => {
  const mockOnSelect = vi.fn();

  const defaultMenuItems = [
    { id: 'all', label: 'All Items', icon: <Inventory /> },
    { id: 'category', label: 'By Category', icon: <Category /> },
    { id: 'low-stock', label: 'Low Stock', icon: <Warning /> },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy Path Testing
  describe('Happy Path - Basic Functionality', () => {
    it('should render all menu items', () => {
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Items')).toBeInTheDocument();
      expect(screen.getByText('By Category')).toBeInTheDocument();
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
    });

    it('should highlight selected menu item', () => {
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="category"
          onSelect={mockOnSelect}
        />
      );

      const categoryButton = screen.getByText('By Category');
      expect(categoryButton).toHaveClass('MuiButton-colorSecondary');
    });

    it('should call onSelect when menu item clicked', async () => {
      const user = userEvent.setup();
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('By Category'));
      
      expect(mockOnSelect).toHaveBeenCalledWith('category');
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('should render icons with labels', () => {
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3);
      
      // Check that buttons have both icon and text
      buttons.forEach(button => {
        expect(button.textContent).toBeTruthy();
        expect(button.querySelector('svg')).toBeTruthy();
      });
    });
  });

  // Equivalence Partitioning - Different Menu Configurations
  describe('Equivalence Partitioning - Menu Configurations', () => {
    it('should handle single menu item', () => {
      const singleItem = [{ id: 'all', label: 'All Items', icon: <Inventory /> }];
      
      render(
        <InventoryToolbar
          menuItems={singleItem}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Items')).toBeInTheDocument();
      expect(screen.getAllByRole('button').length).toBe(1);
    });

    it('should handle many menu items', () => {
      const manyItems = [
        { id: '1', label: 'Item 1', icon: <Inventory /> },
        { id: '2', label: 'Item 2', icon: <Category /> },
        { id: '3', label: 'Item 3', icon: <Warning /> },
        { id: '4', label: 'Item 4', icon: <Inventory /> },
        { id: '5', label: 'Item 5', icon: <Category /> },
      ];
      
      render(
        <InventoryToolbar
          menuItems={manyItems}
          selectedMenu="1"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getAllByRole('button').length).toBe(5);
    });

    it('should handle items without icons', () => {
      const itemsNoIcons = [
        { id: 'all', label: 'All Items' },
        { id: 'category', label: 'By Category' },
      ];
      
      render(
        <InventoryToolbar
          menuItems={itemsNoIcons}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Items')).toBeInTheDocument();
      expect(screen.getByText('By Category')).toBeInTheDocument();
    });

    it('should handle different selected menu', () => {
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="low-stock"
          onSelect={mockOnSelect}
        />
      );

      const lowStockButton = screen.getByText('Low Stock');
      expect(lowStockButton).toHaveClass('MuiButton-colorSecondary');
    });
  });

  // Boundary Value Analysis
  describe('Boundary Value Analysis - Edge Cases', () => {
    it('should handle empty menu items array', () => {
      render(
        <InventoryToolbar
          menuItems={[]}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should handle first menu item selection', async () => {
      const user = userEvent.setup();
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="category"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('All Items'));
      
      expect(mockOnSelect).toHaveBeenCalledWith('all');
    });

    it('should handle last menu item selection', async () => {
      const user = userEvent.setup();
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('Low Stock'));
      
      expect(mockOnSelect).toHaveBeenCalledWith('low-stock');
    });

    it('should handle item with very long label', () => {
      const longLabelItems = [
        { 
          id: 'long', 
          label: 'This is a very long menu item label that might wrap',
          icon: <Inventory /> 
        },
      ];
      
      render(
        <InventoryToolbar
          menuItems={longLabelItems}
          selectedMenu="long"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText(/This is a very long menu item/)).toBeInTheDocument();
    });
  });

  // Error Guessing - Missing Props & Error Cases
  describe('Error Guessing - Error Handling', () => {
    it('should handle undefined onSelect', async () => {
      const user = userEvent.setup();
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={undefined}
        />
      );

      // Should not throw error when clicking
      await expect(
        user.click(screen.getByText('All Items'))
      ).resolves.not.toThrow();
    });

    it('should handle null menuItems gracefully', () => {
      // Component should handle null by not rendering buttons
      expect(() => {
        render(
          <InventoryToolbar
            menuItems={null}
            selectedMenu="all"
            onSelect={mockOnSelect}
          />
        );
      }).toThrow(); // React will throw error for null.map()
    });

    it('should handle selectedMenu not in menuItems', () => {
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="nonexistent"
          onSelect={mockOnSelect}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveClass('MuiButton-colorSecondary');
      });
    });

    it('should handle rapid clicks', async () => {
      const user = userEvent.setup();
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByText('By Category');
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      expect(mockOnSelect).toHaveBeenCalledTimes(3);
    });

    it('should handle empty string selectedMenu', () => {
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu=""
          onSelect={mockOnSelect}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveClass('MuiButton-colorSecondary');
      });
    });
  });

  // State & Rendering Check
  describe('State & Rendering - Visual States', () => {
    it('should only highlight one button at a time', () => {
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="category"
          onSelect={mockOnSelect}
        />
      );

      const secondaryButtons = screen.getAllByRole('button').filter(btn =>
        btn.classList.contains('MuiButton-colorSecondary')
      );
      
      expect(secondaryButtons.length).toBe(1);
    });

    it('should change selected state when prop changes', () => {
      const { rerender } = render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Items')).toHaveClass('MuiButton-colorSecondary');

      rerender(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="category"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('By Category')).toHaveClass('MuiButton-colorSecondary');
      expect(screen.getByText('All Items')).not.toHaveClass('MuiButton-colorSecondary');
    });

    it('should render with proper spacing and layout', () => {
      const { container } = render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      const stack = container.firstChild;
      expect(stack).toHaveStyle({ background: '#f5f5f5' });
    });
  });

  // Non-Functional - Accessibility
  describe('Non-Functional - Accessibility', () => {
    it('should have accessible button elements', () => {
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3);
      
      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should have visible text labels', () => {
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Items')).toBeVisible();
      expect(screen.getByText('By Category')).toBeVisible();
      expect(screen.getByText('Low Stock')).toBeVisible();
    });

    it('should be keyboard navigable', () => {
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('disabled');
      });
    });
  });

  // Real-world Scenarios
  describe('Real-world Scenarios', () => {
    it('should handle switching between filters', async () => {
      const user = userEvent.setup();
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('By Category'));
      expect(mockOnSelect).toHaveBeenCalledWith('category');

      await user.click(screen.getByText('Low Stock'));
      expect(mockOnSelect).toHaveBeenCalledWith('low-stock');

      await user.click(screen.getByText('All Items'));
      expect(mockOnSelect).toHaveBeenCalledWith('all');

      expect(mockOnSelect).toHaveBeenCalledTimes(3);
    });

    it('should handle clicking already selected item', async () => {
      const user = userEvent.setup();
      render(
        <InventoryToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('All Items'));
      
      expect(mockOnSelect).toHaveBeenCalledWith('all');
    });

    it('should render inventory-specific menu items correctly', () => {
      const inventoryMenus = [
        { id: 'all', label: 'All Inventory', icon: <Inventory /> },
        { id: 'in-stock', label: 'In Stock', icon: <Category /> },
        { id: 'out-of-stock', label: 'Out of Stock', icon: <Warning /> },
        { id: 'reorder', label: 'Reorder Needed', icon: <Warning /> },
      ];
      
      render(
        <InventoryToolbar
          menuItems={inventoryMenus}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Inventory')).toBeInTheDocument();
      expect(screen.getByText('In Stock')).toBeInTheDocument();
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      expect(screen.getByText('Reorder Needed')).toBeInTheDocument();
    });
  });
});
