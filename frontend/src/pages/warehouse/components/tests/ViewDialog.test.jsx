import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewDialog from '../ViewDialog';

/**
 * UNIT TEST: Warehouse ViewDialog Component
 * 
 * Testing Techniques:
 * - Happy Path: Normal data viewing
 * - Equivalence Partitioning: With/without extra info
 * - BVA: Null/missing data, edge cases
 * - Error Guessing: Missing props, undefined values
 * - Accessibility: Dialog structure
 */

// Mock MenuConfig
vi.mock('../MenuConfig', () => ({
  menuItems: [
    {
      id: 'warehouse',
      label: 'Warehouse',
      columns: [
        { id: 'name', label: 'Tên kho' },
        { id: 'location', label: 'Vị trí' },
        { id: 'capacity', label: 'Sức chứa' },
      ],
    },
  ],
}));

describe('Warehouse ViewDialog Component - Unit Tests', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    selectedMenu: 'warehouse',
    selectedRow: {
      name: 'Central Warehouse',
      location: 'Ho Chi Minh City',
      capacity: '10000',
      extraInfo: 'Additional warehouse information',
    },
    getExtraInfo: null,
  };

  describe('Happy Path', () => {
    it('should render dialog with title', () => {
      render(<ViewDialog {...defaultProps} />);
      
      expect(screen.getByText('Xem chi tiết Warehouse')).toBeInTheDocument();
    });

    it('should display basic information section', () => {
      render(<ViewDialog {...defaultProps} />);
      
      expect(screen.getByText('Thông tin cơ bản')).toBeInTheDocument();
    });

    it('should display all column data', () => {
      render(<ViewDialog {...defaultProps} />);
      
      expect(screen.getByText(/Tên kho: Central Warehouse/)).toBeInTheDocument();
      expect(screen.getByText(/Vị trí: Ho Chi Minh City/)).toBeInTheDocument();
      expect(screen.getByText(/Sức chứa: 10000/)).toBeInTheDocument();
    });

    it('should display extra info when provided', () => {
      render(<ViewDialog {...defaultProps} />);
      
      expect(screen.getByText('Thông tin bổ sung')).toBeInTheDocument();
      expect(screen.getByText('Additional warehouse information')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<ViewDialog {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument();
    });
  });

  describe('Equivalence Partitioning - Data States', () => {
    it('should handle data with extra info', () => {
      render(<ViewDialog {...defaultProps} />);
      
      expect(screen.getByText('Thông tin bổ sung')).toBeInTheDocument();
    });

    it('should handle data without extra info', () => {
      const propsWithoutExtra = {
        ...defaultProps,
        selectedRow: {
          name: 'North Warehouse',
          location: 'Hanoi',
          capacity: '5000',
        },
      };

      render(<ViewDialog {...propsWithoutExtra} />);
      
      expect(screen.queryByText('Thông tin bổ sung')).not.toBeInTheDocument();
    });

    it('should use getExtraInfo function when provided', () => {
      const getExtraInfo = vi.fn(() => 'Custom extra info');
      
      render(
        <ViewDialog
          {...defaultProps}
          getExtraInfo={getExtraInfo}
        />
      );

      expect(getExtraInfo).toHaveBeenCalledWith(defaultProps.selectedRow);
      expect(screen.getByText('Custom extra info')).toBeInTheDocument();
    });
  });

  describe('BVA - Edge Cases', () => {
    it('should handle missing column values', () => {
      const incompleteRow = {
        name: 'Incomplete Warehouse',
        // missing location and capacity
      };

      render(<ViewDialog {...defaultProps} selectedRow={incompleteRow} />);
      
      expect(screen.getByText(/Tên kho: Incomplete Warehouse/)).toBeInTheDocument();
      expect(screen.getByText(/Vị trí: N\/A/)).toBeInTheDocument();
      expect(screen.getByText(/Sức chứa: N\/A/)).toBeInTheDocument();
    });

    it('should handle null selectedRow', () => {
      render(<ViewDialog {...defaultProps} selectedRow={null} />);
      
      expect(screen.getByText('Không có dữ liệu để hiển thị')).toBeInTheDocument();
    });

    it('should handle undefined selectedRow', () => {
      render(<ViewDialog {...defaultProps} selectedRow={undefined} />);
      
      expect(screen.getByText('Không có dữ liệu để hiển thị')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<ViewDialog {...defaultProps} open={false} />);
      
      expect(screen.queryByText('Xem chi tiết Warehouse')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<ViewDialog {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: 'Đóng' }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Error Guessing', () => {
    it('should handle missing currentMenu', () => {
      render(<ViewDialog {...defaultProps} selectedMenu="non-existent" />);
      
      expect(screen.getByText('Xem chi tiết dữ liệu')).toBeInTheDocument();
    });

    it('should handle undefined selectedMenu', () => {
      render(<ViewDialog {...defaultProps} selectedMenu={undefined} />);
      
      expect(screen.getByText('Xem chi tiết dữ liệu')).toBeInTheDocument();
    });

    it('should handle missing onClose', () => {
      render(<ViewDialog {...defaultProps} onClose={undefined} />);
      
      // Should render without crashing
      expect(screen.getByText('Xem chi tiết Warehouse')).toBeInTheDocument();
    });

    it('should handle getExtraInfo returning null', () => {
      const getExtraInfo = vi.fn(() => null);
      
      render(
        <ViewDialog
          {...defaultProps}
          selectedRow={{ ...defaultProps.selectedRow, extraInfo: undefined }}
          getExtraInfo={getExtraInfo}
        />
      );

      expect(screen.queryByText('Thông tin bổ sung')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<ViewDialog {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have accessible close button', () => {
      render(<ViewDialog {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: 'Đóng' });
      expect(closeButton).toBeEnabled();
    });

    it('should display sections with proper headings', () => {
      render(<ViewDialog {...defaultProps} />);
      
      expect(screen.getByText('Thông tin cơ bản')).toBeInTheDocument();
      expect(screen.getByText('Thông tin bổ sung')).toBeInTheDocument();
    });
  });
});
