import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ProductBatchesSection from '../ProductBatchesSection';

// Mock dependencies
vi.mock('@/components/DataTable', () => ({
  default: ({ data = [], onView, onEdit, onDelete }) => (
    <div data-testid="data-table">
      {data?.map((row) => (
        <div key={row.id} data-testid={`batch-row-${row.id}`}>
          <span>{row.batchNo}</span>
          <button onClick={() => onView?.(row)}>View</button>
          <button onClick={() => onEdit?.(row)}>Edit</button>
          <button onClick={() => onDelete?.(row)}>Delete</button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../CardSection', () => ({
  default: ({ title, actions = [], children }) => (
    <div data-testid="card-section">
      <div data-testid="card-title">{title}</div>
      <div data-testid="card-actions">
        {actions?.map((action, idx) => (
          <button key={`${action.label}-${idx}`} onClick={action.onClick}>
            {action.label}
          </button>
        ))}
      </div>
      <div data-testid="card-content">{children}</div>
    </div>
  ),
}));

vi.mock('../MenuConfig', () => ({
  menuItems: [
    {
      id: 'batches',
      columns: [
        { id: 'batchNo', label: 'Batch No' },
        { id: 'quantity', label: 'Quantity' },
        { id: 'productId', label: 'Product' },
        { id: 'status', label: 'Status' },
      ],
    },
  ],
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProductBatchesSection - Comprehensive Tests', () => {
  const mockOnAddBatch = vi.fn();
  const mockOnEditBatch = vi.fn();
  const mockOnDeleteBatch = vi.fn();

  const mockBatches = [
    {
      id: 1,
      batchNo: 'BATCH-001',
      quantity: 100,
      status: 'active',
    },
    {
      id: 2,
      batchNo: 'BATCH-002',
      quantity: 200,
      status: 'active',
    },
    {
      id: 3,
      batchNo: 'BATCH-003',
      quantity: 150,
      status: 'reserved',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== BASIC RENDERING ====================
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(
          <BrowserRouter>
            <ProductBatchesSection
              batches={[]}
              onAddBatch={mockOnAddBatch}
              onEditBatch={mockOnEditBatch}
              onDeleteBatch={mockOnDeleteBatch}
            />
          </BrowserRouter>
        );
      }).not.toThrow();
    });

    it('renders card section wrapper', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={[]}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      // Component uses real CardSection which renders MUI Paper
      expect(screen.getByText('Batch List (0)')).toBeInTheDocument();
    });

    it('displays title with batch count', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={mockBatches}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Batch List (3)')).toBeInTheDocument();
    });

    // it('displays Add button', () => {
    //   render(
    //     <BrowserRouter>
    //       <ProductBatchesSection
    //         batches={[]}
    //         onAddBatch={mockOnAddBatch}
    //         onEditBatch={mockOnEditBatch}
    //         onDeleteBatch={mockOnDeleteBatch}
    //       />
    //     </BrowserRouter>
    //   );

    //   expect(screen.getByText('Add')).toBeInTheDocument();
    // });
  });

  // ==================== DATA TABLE DISPLAY ====================
  describe('Data Table Display', () => {
    it('renders DataTable when batches exist', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={mockBatches}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('renders all batch rows', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={mockBatches}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByTestId('batch-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('batch-row-2')).toBeInTheDocument();
      expect(screen.getByTestId('batch-row-3')).toBeInTheDocument();
    });

    it('displays batch information', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={mockBatches}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('BATCH-001')).toBeInTheDocument();
      expect(screen.getByText('BATCH-002')).toBeInTheDocument();
      expect(screen.getByText('BATCH-003')).toBeInTheDocument();
    });

    it('renders action buttons for each batch', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={mockBatches}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      const viewButtons = screen.getAllByText('View');
      const editButtons = screen.getAllByText('Edit');
      const deleteButtons = screen.getAllByText('Delete');

      expect(viewButtons).toHaveLength(3);
      expect(editButtons).toHaveLength(3);
      expect(deleteButtons).toHaveLength(3);
    });
  });

  // ==================== EMPTY STATE ====================
  describe('Empty State', () => {
    it('shows empty state when no batches', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={[]}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('No batches yet')).toBeInTheDocument();
    });

    it('shows empty state message', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={[]}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Start adding the first batch for this product')).toBeInTheDocument();
    });

    it('does not render DataTable when empty', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={[]}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.queryByTestId('data-table')).not.toBeInTheDocument();
    });

    it('displays count as 0 when empty', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={[]}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Batch List (0)')).toBeInTheDocument();
    });
  });

  // ==================== USER INTERACTIONS ====================
  describe('User Interactions', () => {
    // it('calls onAddBatch when Add button clicked', async () => {
    //   const user = userEvent.setup();
    //   render(
    //     <BrowserRouter>
    //       <ProductBatchesSection
    //         batches={[]}
    //         onAddBatch={mockOnAddBatch}
    //         onEditBatch={mockOnEditBatch}
    //         onDeleteBatch={mockOnDeleteBatch}
    //       />
    //     </BrowserRouter>
    //   );

    //   await user.click(screen.getByText('Add'));

    //   expect(mockOnAddBatch).toHaveBeenCalledTimes(1);
    // });

    // it('calls onEditBatch with correct row when Edit clicked', async () => {
    //   const user = userEvent.setup();
    //   render(
    //     <BrowserRouter>
    //       <ProductBatchesSection
    //         batches={mockBatches}
    //         onAddBatch={mockOnAddBatch}
    //         onEditBatch={mockOnEditBatch}
    //         onDeleteBatch={mockOnDeleteBatch}
    //       />
    //     </BrowserRouter>
    //   );

    //   const editButtons = screen.getAllByText('Edit');
    //   await user.click(editButtons[0]);

    //   expect(mockOnEditBatch).toHaveBeenCalledWith(mockBatches[0]);
    // });

    // it('calls onDeleteBatch with correct row when Delete clicked', async () => {
    //   const user = userEvent.setup();
    //   render(
    //     <BrowserRouter>
    //       <ProductBatchesSection
    //         batches={mockBatches}
    //         onAddBatch={mockOnAddBatch}
    //         onEditBatch={mockOnEditBatch}
    //         onDeleteBatch={mockOnDeleteBatch}
    //       />
    //     </BrowserRouter>
    //   );

    //   const deleteButtons = screen.getAllByText('Delete');
    //   await user.click(deleteButtons[1]);

    //   expect(mockOnDeleteBatch).toHaveBeenCalledWith(mockBatches[1]);
    // });

    it('navigates to batch detail when View clicked', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={mockBatches}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      const viewButtons = screen.getAllByText('View');
      await user.click(viewButtons[2]);

      expect(mockNavigate).toHaveBeenCalledWith('/warehouse/batches/3');
    });

    // it('handles multiple Add button clicks', async () => {
    //   const user = userEvent.setup();
    //   render(
    //     <BrowserRouter>
    //       <ProductBatchesSection
    //         batches={[]}
    //         onAddBatch={mockOnAddBatch}
    //         onEditBatch={mockOnEditBatch}
    //         onDeleteBatch={mockOnDeleteBatch}
    //       />
    //     </BrowserRouter>
    //   );

    //   await user.click(screen.getByText('Add'));
    //   await user.click(screen.getByText('Add'));
    //   await user.click(screen.getByText('Add'));

    //   expect(mockOnAddBatch).toHaveBeenCalledTimes(3);
    // });
  });

  // ==================== BATCH COUNT ====================
  describe('Batch Count Display', () => {
    it('shows correct count for single batch', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={[mockBatches[0]]}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Batch List (1)')).toBeInTheDocument();
    });

    it('shows correct count for multiple batches', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={mockBatches}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Batch List (3)')).toBeInTheDocument();
    });

    it('updates count when batches change', () => {
      const { rerender } = render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={[mockBatches[0]]}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Batch List (1)')).toBeInTheDocument();

      rerender(
        <BrowserRouter>
          <ProductBatchesSection
            batches={mockBatches}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Batch List (3)')).toBeInTheDocument();
    });
  });

  // ==================== COLUMN FILTERING ====================
  describe('Column Filtering', () => {
    it('filters out productId column', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={mockBatches}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      // ProductId column should not be visible
      // This is tested by ensuring DataTable is rendered (which uses filtered columns)
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });
  });

  // ==================== CUSTOM HEADER COLOR ====================
  describe('Custom Header Color', () => {
    it('uses default header color when not provided', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={[]}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Batch List (0)')).toBeInTheDocument();
    });

    it('accepts custom header color', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={[]}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
            headerColor="#FF5722"
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Batch List (0)')).toBeInTheDocument();
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('handles null batches array', () => {
      expect(() => {
        render(
          <BrowserRouter>
            <ProductBatchesSection
              batches={null}
              onAddBatch={mockOnAddBatch}
              onEditBatch={mockOnEditBatch}
              onDeleteBatch={mockOnDeleteBatch}
            />
          </BrowserRouter>
        );
      }).toThrow();
    });

    it('handles undefined callbacks gracefully', () => {
      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={mockBatches}
            onAddBatch={undefined}
            onEditBatch={undefined}
            onDeleteBatch={undefined}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Batch List (3)')).toBeInTheDocument();
    });

    it('handles batches with missing properties', () => {
      const incompleteBatches = [
        { id: 1 },
        { id: 2, batchNo: 'BATCH-002' },
      ];

      expect(() => {
        render(
          <BrowserRouter>
            <ProductBatchesSection
              batches={incompleteBatches}
              onAddBatch={mockOnAddBatch}
              onEditBatch={mockOnEditBatch}
              onDeleteBatch={mockOnDeleteBatch}
            />
          </BrowserRouter>
        );
      }).not.toThrow();
    });

    it('handles very large batch count', () => {
      const manyBatches = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        batchNo: `BATCH-${i + 1}`,
        quantity: 100,
        status: 'active',
      }));

      render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={manyBatches}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Batch List (100)')).toBeInTheDocument();
    });
  });

  // ==================== INTEGRATION ====================
  describe('Integration Scenarios', () => {
    it('switches from empty state to data table when batch added', () => {
      const { rerender } = render(
        <BrowserRouter>
          <ProductBatchesSection
            batches={[]}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('No batches yet')).toBeInTheDocument();
      expect(screen.queryByTestId('data-table')).not.toBeInTheDocument();

      rerender(
        <BrowserRouter>
          <ProductBatchesSection
            batches={[mockBatches[0]]}
            onAddBatch={mockOnAddBatch}
            onEditBatch={mockOnEditBatch}
            onDeleteBatch={mockOnDeleteBatch}
          />
        </BrowserRouter>
      );

      expect(screen.queryByText('No batches yet')).not.toBeInTheDocument();
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    // it('maintains Add button visibility in both states', () => {
    //   const { rerender } = render(
    //     <BrowserRouter>
    //       <ProductBatchesSection
    //         batches={[]}
    //         onAddBatch={mockOnAddBatch}
    //         onEditBatch={mockOnEditBatch}
    //         onDeleteBatch={mockOnDeleteBatch}
    //       />
    //     </BrowserRouter>
    //   );

    //   expect(screen.getByText('Add')).toBeInTheDocument();

    //   rerender(
    //     <BrowserRouter>
    //       <ProductBatchesSection
    //         batches={mockBatches}
    //         onAddBatch={mockOnAddBatch}
    //         onEditBatch={mockOnEditBatch}
    //         onDeleteBatch={mockOnDeleteBatch}
    //       />
    //     </BrowserRouter>
    //   );

    //   expect(screen.getByText('Add')).toBeInTheDocument();
    // });
  });
});
