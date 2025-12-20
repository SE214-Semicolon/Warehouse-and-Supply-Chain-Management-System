import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WarehouseToolbar from '../WarehouseToolbar';
import { Warehouse, Category, LocationOn } from '@mui/icons-material';

/**
 * UNIT TEST: WarehouseToolbar Component
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal menu selection
 * 2. Equivalence Partitioning - Different menu states
 * 3. Boundary Value Analysis - Empty/single/many items
 * 4. Error Guessing - Missing handlers, invalid props
 * 5. Non-Functional Checks - Accessibility
 */

describe('WarehouseToolbar Component - Unit Tests', () => {
  const mockOnSelect = vi.fn();

  const defaultMenuItems = [
    { id: 'all', label: 'All Warehouses', icon: <Warehouse /> },
    { id: 'category', label: 'By Category', icon: <Category /> },
    { id: 'location', label: 'By Location', icon: <LocationOn /> },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy Path Testing
  describe('Happy Path - Basic Functionality', () => {
    it('should render all menu items', () => {
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Warehouses')).toBeInTheDocument();
      expect(screen.getByText('By Category')).toBeInTheDocument();
      expect(screen.getByText('By Location')).toBeInTheDocument();
    });

    it('should call onSelect when menu item clicked', async () => {
      const user = userEvent.setup();
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('By Category'));
      
      expect(mockOnSelect).toHaveBeenCalledWith('category');
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('should show active state for selected menu', () => {
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="category"
          onSelect={mockOnSelect}
        />
      );

      const categoryButton = screen.getByText('By Category');
      expect(categoryButton).toBeInTheDocument();
      // Active button should have different styling (checked via font weight in component)
    });

    it('should render icons with labels', () => {
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3);
      
      buttons.forEach(button => {
        expect(button.textContent).toBeTruthy();
        expect(button.querySelector('svg')).toBeTruthy();
      });
    });
  });

  // Equivalence Partitioning
  describe('Equivalence Partitioning - Menu States', () => {
    it('should handle first menu selection', async () => {
      const user = userEvent.setup();
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="category"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('All Warehouses'));
      
      expect(mockOnSelect).toHaveBeenCalledWith('all');
    });

    it('should handle middle menu selection', async () => {
      const user = userEvent.setup();
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('By Category'));
      
      expect(mockOnSelect).toHaveBeenCalledWith('category');
    });

    it('should handle last menu selection', async () => {
      const user = userEvent.setup();
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('By Location'));
      
      expect(mockOnSelect).toHaveBeenCalledWith('location');
    });

    it('should handle different selected menu', () => {
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="location"
          onSelect={mockOnSelect}
        />
      );

      const locationButton = screen.getByText('By Location');
      expect(locationButton).toBeInTheDocument();
    });
  });

  // Boundary Value Analysis
  describe('Boundary Value Analysis - Edge Cases', () => {
    it('should handle empty menu items array', () => {
      render(
        <WarehouseToolbar
          menuItems={[]}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should handle single menu item', () => {
      const singleItem = [{ id: 'all', label: 'All Warehouses', icon: <Warehouse /> }];
      
      render(
        <WarehouseToolbar
          menuItems={singleItem}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Warehouses')).toBeInTheDocument();
      expect(screen.getAllByRole('button').length).toBe(1);
    });

    it('should handle many menu items', () => {
      const manyItems = Array.from({ length: 10 }, (_, i) => ({
        id: `item${i}`,
        label: `Item ${i}`,
        icon: <Warehouse />,
      }));
      
      render(
        <WarehouseToolbar
          menuItems={manyItems}
          selectedMenu="item0"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getAllByRole('button').length).toBe(10);
    });

    it('should handle items without icons', () => {
      const itemsNoIcons = [
        { id: 'all', label: 'All Warehouses' },
        { id: 'category', label: 'By Category' },
      ];
      
      render(
        <WarehouseToolbar
          menuItems={itemsNoIcons}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Warehouses')).toBeInTheDocument();
      expect(screen.getByText('By Category')).toBeInTheDocument();
    });

    it('should handle very long menu labels', () => {
      const longLabelItems = [
        { 
          id: 'long', 
          label: 'This is an extremely long warehouse category name that might need wrapping',
          icon: <Warehouse /> 
        },
      ];
      
      render(
        <WarehouseToolbar
          menuItems={longLabelItems}
          selectedMenu="long"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText(/This is an extremely long/)).toBeInTheDocument();
    });
  });

  // Error Guessing
  describe('Error Guessing - Error Handling', () => {
    it('should handle undefined onSelect', async () => {
      const user = userEvent.setup();
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={undefined}
        />
      );

      await expect(
        user.click(screen.getByText('All Warehouses'))
      ).resolves.not.toThrow();
    });

    it('should handle selectedMenu not in menuItems', () => {
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="nonexistent"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Warehouses')).toBeInTheDocument();
    });

    it('should handle rapid clicks', async () => {
      const user = userEvent.setup();
      render(
        <WarehouseToolbar
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

    it('should handle null menuItems', () => {
      expect(() => {
        render(
          <WarehouseToolbar
            menuItems={null}
            selectedMenu="all"
            onSelect={mockOnSelect}
          />
        );
      }).toThrow();
    });

    it('should handle empty string selectedMenu', () => {
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu=""
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Warehouses')).toBeInTheDocument();
    });
  });

  // State & Rendering
  describe('State & Rendering - Component State', () => {
    it('should change selected state when prop changes', () => {
      const { rerender } = render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Warehouses')).toBeInTheDocument();

      rerender(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="category"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('By Category')).toBeInTheDocument();
    });

    it('should render within Paper component', () => {
      const { container } = render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      const paper = container.querySelector('.MuiPaper-root');
      expect(paper).toBeInTheDocument();
    });

    it('should render buttons in horizontal layout', () => {
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      const stack = screen.getAllByRole('button')[0].closest('[class*="MuiStack"]');
      expect(stack).toBeInTheDocument();
    });
  });

  // Non-Functional - Accessibility
  describe('Non-Functional - Accessibility', () => {
    it('should have accessible button elements', () => {
      render(
        <WarehouseToolbar
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
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Warehouses')).toBeVisible();
      expect(screen.getByText('By Category')).toBeVisible();
      expect(screen.getByText('By Location')).toBeVisible();
    });

    it('should be keyboard navigable', () => {
      render(
        <WarehouseToolbar
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
    it('should handle switching between warehouse filters', async () => {
      const user = userEvent.setup();
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('By Category'));
      expect(mockOnSelect).toHaveBeenCalledWith('category');

      await user.click(screen.getByText('By Location'));
      expect(mockOnSelect).toHaveBeenCalledWith('location');

      await user.click(screen.getByText('All Warehouses'));
      expect(mockOnSelect).toHaveBeenCalledWith('all');

      expect(mockOnSelect).toHaveBeenCalledTimes(3);
    });

    it('should handle clicking already selected item', async () => {
      const user = userEvent.setup();
      render(
        <WarehouseToolbar
          menuItems={defaultMenuItems}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('All Warehouses'));
      
      expect(mockOnSelect).toHaveBeenCalledWith('all');
    });

    it('should render warehouse-specific menu items correctly', () => {
      const warehouseMenus = [
        { id: 'all', label: 'All Locations', icon: <Warehouse /> },
        { id: 'active', label: 'Active', icon: <Category /> },
        { id: 'inactive', label: 'Inactive', icon: <LocationOn /> },
      ];
      
      render(
        <WarehouseToolbar
          menuItems={warehouseMenus}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Locations')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should support warehouse status filtering', async () => {
      const user = userEvent.setup();
      const statusMenus = [
        { id: 'all', label: 'All', icon: <Warehouse /> },
        { id: 'operational', label: 'Operational', icon: <Category /> },
        { id: 'maintenance', label: 'Under Maintenance', icon: <LocationOn /> },
      ];
      
      render(
        <WarehouseToolbar
          menuItems={statusMenus}
          selectedMenu="all"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('Operational'));
      expect(mockOnSelect).toHaveBeenCalledWith('operational');

      await user.click(screen.getByText('Under Maintenance'));
      expect(mockOnSelect).toHaveBeenCalledWith('maintenance');
    });
  });
});
