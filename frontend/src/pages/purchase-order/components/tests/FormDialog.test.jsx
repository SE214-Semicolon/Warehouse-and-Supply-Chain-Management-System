// src/pages/purchase-order/components/tests/FormDialog.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FormDialog from '../FormDialog';

// Mock services and hooks
vi.mock('../../services/po.service', () => ({
  default: {
    createDraft: vi.fn(),
    update: vi.fn(),
    submitOrder: vi.fn(),
  },
}));

vi.mock('../../services/supplier.service', () => ({
  default: {
    getAll: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

vi.mock('../../services/product.service', () => ({
  default: {
    getAll: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

describe('Purchase Order FormDialog Component - Unit Tests', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    mode: 'add',
    onSuccess: mockOnSuccess,
    selectedRow: null,
  };

  const mockDraftPO = {
    id: 1,
    supplierId: 1,
    status: 'draft',
    expectedArrival: '2024-12-31',
    notes: 'Test notes',
    items: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should render dialog when open in add mode', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByText('Tạo Purchase Order mới')).toBeInTheDocument();
    });

    it('should show correct title in add mode', () => {
      render(<FormDialog {...defaultProps} mode="add" />);
      
      expect(screen.getByText('Tạo Purchase Order mới')).toBeInTheDocument();
    });

    it('should show correct title in edit mode', () => {
      render(
        <FormDialog
          {...defaultProps}
          mode="edit"
          selectedRow={mockDraftPO}
        />
      );
      
      expect(screen.getByText('Sửa Purchase Order')).toBeInTheDocument();
    });

    it('should render supplier autocomplete field', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByLabelText(/Nhà cung cấp/i)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /Hủy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lưu nháp/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Đặt hàng/i })).toBeInTheDocument();
    });
  });

  describe('Equivalence Partitioning - Modes', () => {
    it('should handle add mode with empty form', () => {
      render(<FormDialog {...defaultProps} mode="add" />);
      
      const supplierInput = screen.getByLabelText(/Nhà cung cấp/i);
      expect(supplierInput).toHaveValue('');
    });

    it('should handle edit mode with existing data', () => {
      render(
        <FormDialog
          {...defaultProps}
          mode="edit"
          selectedRow={mockDraftPO}
        />
      );
      
      expect(screen.getByText('Sửa Purchase Order')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(<FormDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Hủy/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should render product table', () => {
      render(<FormDialog {...defaultProps} />);

      expect(screen.getByText('Danh sách sản phẩm')).toBeInTheDocument();
      expect(screen.getByText('Sản phẩm *')).toBeInTheDocument();
      expect(screen.getByText('SL *')).toBeInTheDocument();
      expect(screen.getByText('Đơn giá *')).toBeInTheDocument();
    });

    it('should show add product button', () => {
      render(<FormDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Thêm sản phẩm/i })).toBeInTheDocument();
    });
  });

  describe('BVA - Edge Cases', () => {
    it('should not render when closed', () => {
      render(<FormDialog {...defaultProps} open={false} />);
      
      expect(screen.queryByText('Tạo Purchase Order mới')).not.toBeInTheDocument();
    });

    it('should handle edit mode without selectedRow gracefully', () => {
      render(
        <FormDialog
          {...defaultProps}
          mode="edit"
          selectedRow={null}
        />
      );
      
      // Should still render the form
      expect(screen.getByText('Sửa Purchase Order')).toBeInTheDocument();
    });

    it('should handle missing optional props', () => {
      render(
        <FormDialog
          open={true}
          mode="add"
          onClose={mockOnClose}
          selectedRow={null}
        />
      );
      
      expect(screen.getByText('Tạo Purchase Order mới')).toBeInTheDocument();
    });
  });

  describe('Error Guessing', () => {
    it('should handle undefined mode (defaults to add)', () => {
      render(<FormDialog {...defaultProps} mode={undefined} />);
      
      expect(screen.getByText('Tạo Purchase Order mới')).toBeInTheDocument();
    });

    it('should handle null selectedRow in add mode', () => {
      render(<FormDialog {...defaultProps} selectedRow={null} />);
      
      expect(screen.getByLabelText(/Nhà cung cấp/i)).toBeInTheDocument();
    });

    it('should handle missing onClose', () => {
      render(<FormDialog {...defaultProps} onClose={undefined} />);
      
      expect(screen.getByText('Tạo Purchase Order mới')).toBeInTheDocument();
    });
  });

  describe('Field Rendering', () => {
    it('should render expected arrival date field', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByLabelText(/Ngày giao hàng dự kiến/i)).toBeInTheDocument();
    });

    it('should render total amount display', () => {
      render(<FormDialog {...defaultProps} />);

      expect(screen.getByText(/Tổng tiền:/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have accessible supplier field', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByLabelText(/Nhà cung cấp/i)).toBeEnabled();
    });

    it('should have accessible buttons', () => {
      render(<FormDialog {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /Hủy/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Lưu nháp/i })).toBeEnabled();
    });
  });
});
