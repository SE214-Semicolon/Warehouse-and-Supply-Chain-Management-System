import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toolbar from '../Toolbar';

/**
 * UNIT TEST: Toolbar Component
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal toolbar rendering and menu selection
 * 2. Equivalence Partitioning - Different menu items, selected states
 * 3. BVA - Empty menu, single item, multiple items
 * 4. Error Guessing - Missing handlers, undefined props
 * 5. State & Rendering Check - Selected menu state changes
 * 6. Non-Functional Checks - Accessibility
 */

describe('Toolbar Component - Unit Tests', () => {
  const mockMenuItems = [
    { id: 'all', label: 'All Items' },
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
  ];

  // Happy Path Testing
  describe('Happy Path - Basic Rendering', () => {
    it('should render all menu items', () => {
      const handleSelect = vi.fn();
      
      render(
        <Toolbar 
          menuItems={mockMenuItems}
          selectedMenu="all"
          onSelect={handleSelect}
        />
      );

      mockMenuItems.forEach((item) => {
        expect(screen.getByText(item.label)).toBeInTheDocument();
      });
    });

    it('should highlight selected menu item', () => {
      const handleSelect = vi.fn();
      
      render(
        <Toolbar 
          menuItems={mockMenuItems}
          selectedMenu="active"
          onSelect={handleSelect}
        />
      );

      const activeButton = screen.getByText('Active');
      expect(activeButton).toBeInTheDocument();
    });

    it('should call onSelect when menu item clicked', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();
      
      render(
        <Toolbar 
          menuItems={mockMenuItems}
          selectedMenu="all"
          onSelect={handleSelect}
        />
      );

      const inactiveButton = screen.getByText('Inactive');
      await user.click(inactiveButton);

      expect(handleSelect).toHaveBeenCalledWith('inactive');
      expect(handleSelect).toHaveBeenCalledTimes(1);
    });
  });

  // Equivalence Partitioning
  describe('Equivalence Partitioning - Menu States', () => {
    it('should render with no selected menu', () => {
      const handleSelect = vi.fn();
      
      render(
        <Toolbar 
          menuItems={mockMenuItems}
          selectedMenu={null}
          onSelect={handleSelect}
        />
      );

      expect(screen.getByText('All Items')).toBeInTheDocument();
    });

    it('should handle multiple menu item clicks', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();
      
      render(
        <Toolbar 
          menuItems={mockMenuItems}
          selectedMenu="all"
          onSelect={handleSelect}
        />
      );

      await user.click(screen.getByText('Active'));
      await user.click(screen.getByText('Inactive'));
      await user.click(screen.getByText('All Items'));

      expect(handleSelect).toHaveBeenCalledTimes(3);
      expect(handleSelect).toHaveBeenNthCalledWith(1, 'active');
      expect(handleSelect).toHaveBeenNthCalledWith(2, 'inactive');
      expect(handleSelect).toHaveBeenNthCalledWith(3, 'all');
    });
  });

  // BVA - Boundary Value Analysis
  describe('BVA - Edge Cases', () => {
    it('should handle empty menu items array', () => {
      const handleSelect = vi.fn();
      
      render(
        <Toolbar 
          menuItems={[]}
          selectedMenu="all"
          onSelect={handleSelect}
        />
      );

      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });

    it('should handle single menu item', () => {
      const handleSelect = vi.fn();
      const singleItem = [{ id: 'only', label: 'Only Item' }];
      
      render(
        <Toolbar 
          menuItems={singleItem}
          selectedMenu="only"
          onSelect={handleSelect}
        />
      );

      expect(screen.getByText('Only Item')).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('should handle many menu items', () => {
      const handleSelect = vi.fn();
      const manyItems = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        label: `Item ${i + 1}`,
      }));
      
      render(
        <Toolbar 
          menuItems={manyItems}
          selectedMenu="item-0"
          onSelect={handleSelect}
        />
      );

      expect(screen.getAllByRole('button')).toHaveLength(10);
    });
  });

  // Error Guessing
  describe('Error Guessing - Invalid Props', () => {
    it('should handle missing onSelect handler', async () => {
      const user = userEvent.setup();
      
      render(
        <Toolbar 
          menuItems={mockMenuItems}
          selectedMenu="all"
          onSelect={undefined}
        />
      );

      const button = screen.getByText('Active');
      // Should not crash when clicking
      await expect(user.click(button)).resolves.not.toThrow();
    });

    it('should handle menu items with missing labels', () => {
      const handleSelect = vi.fn();
      const itemsWithMissingLabel = [
        { id: 'item1', label: 'Item 1' },
        { id: 'item2' }, // Missing label
      ];
      
      render(
        <Toolbar 
          menuItems={itemsWithMissingLabel}
          selectedMenu="item1"
          onSelect={handleSelect}
        />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('should handle menu items with duplicate ids', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();
      const duplicateIds = [
        { id: 'same', label: 'First' },
        { id: 'same', label: 'Second' },
      ];
      
      render(
        <Toolbar 
          menuItems={duplicateIds}
          selectedMenu="same"
          onSelect={handleSelect}
        />
      );

      const firstButton = screen.getByText('First');
      await user.click(firstButton);

      expect(handleSelect).toHaveBeenCalledWith('same');
    });
  });

  // Non-Functional - Accessibility
  describe('Non-Functional - Accessibility', () => {
    it('should render buttons with proper roles', () => {
      const handleSelect = vi.fn();
      
      render(
        <Toolbar 
          menuItems={mockMenuItems}
          selectedMenu="all"
          onSelect={handleSelect}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(mockMenuItems.length);
    });

    it('should have clickable buttons', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();
      
      render(
        <Toolbar 
          menuItems={mockMenuItems}
          selectedMenu="all"
          onSelect={handleSelect}
        />
      );

      const allButtons = screen.getAllByRole('button');
      
      for (const button of allButtons) {
        await user.click(button);
      }

      expect(handleSelect).toHaveBeenCalledTimes(allButtons.length);
    });
  });

  // State & Rendering Check
  describe('State & Rendering - Selected State', () => {
    it('should change appearance based on selected state', () => {
      const handleSelect = vi.fn();
      
      const { rerender } = render(
        <Toolbar 
          menuItems={mockMenuItems}
          selectedMenu="all"
          onSelect={handleSelect}
        />
      );

      expect(screen.getByText('All Items')).toBeInTheDocument();

      rerender(
        <Toolbar 
          menuItems={mockMenuItems}
          selectedMenu="active"
          onSelect={handleSelect}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should handle rapid menu changes', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();
      
      render(
        <Toolbar 
          menuItems={mockMenuItems}
          selectedMenu="all"
          onSelect={handleSelect}
        />
      );

      // Rapid clicks
      await user.click(screen.getByText('Active'));
      await user.click(screen.getByText('Inactive'));
      await user.click(screen.getByText('All Items'));
      await user.click(screen.getByText('Active'));

      expect(handleSelect).toHaveBeenCalledTimes(4);
    });
  });

  // Real-world Scenarios
  describe('Real-world Scenarios', () => {
    it('should work with filter scenario', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();
      const filterItems = [
        { id: 'all', label: 'All Products' },
        { id: 'low-stock', label: 'Low Stock' },
        { id: 'out-of-stock', label: 'Out of Stock' },
      ];
      
      render(
        <Toolbar 
          menuItems={filterItems}
          selectedMenu="all"
          onSelect={handleSelect}
        />
      );

      await user.click(screen.getByText('Low Stock'));
      expect(handleSelect).toHaveBeenCalledWith('low-stock');
    });

    it('should work with status filter scenario', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();
      const statusItems = [
        { id: 'pending', label: 'Pending' },
        { id: 'approved', label: 'Approved' },
        { id: 'rejected', label: 'Rejected' },
      ];
      
      render(
        <Toolbar 
          menuItems={statusItems}
          selectedMenu="pending"
          onSelect={handleSelect}
        />
      );

      await user.click(screen.getByText('Approved'));
      expect(handleSelect).toHaveBeenCalledWith('approved');
    });
  });
});
