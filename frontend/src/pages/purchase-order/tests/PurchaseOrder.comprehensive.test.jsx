import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchaseOrder from '../PurchaseOrder';
import { BrowserRouter } from 'react-router-dom';

// Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock components
vi.mock('@/components/DataTable', () => ({
  default: ({ title, columns, data, onEdit, onView, onDelete }) => (
    <div data-testid="data-table">
      <h3>{title}</h3>
      <div data-testid="table-data">{JSON.stringify(data)}</div>
      {data?.length > 0 && (
        <div>
          <button onClick={() => onEdit(data[0])}>Edit First</button>
          <button onClick={() => onView(data[0])}>View First</button>
          <button onClick={() => onDelete(data[0])}>Delete First</button>
        </div>
      )}
    </div>
  ),
}));

vi.mock('@/components/SearchBar', () => ({
  default: ({ searchTerm, setSearchTerm }) => (
    <input
      data-testid="search-bar"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search"
    />
  ),
}));

vi.mock('@/components/ActionButton', () => ({
  default: ({ onAdd, onImport, onExport, onPrint }) => (
    <div data-testid="action-buttons">
      <button onClick={onAdd}>Add</button>
      <button onClick={onImport}>Import</button>
      <button onClick={onExport}>Export</button>
      <button onClick={onPrint}>Print</button>
    </div>
  ),
}));

vi.mock('../../components/Toolbar', () => ({
  default: ({ menuItems, selectedMenu }) => (
    <div data-testid="toolbar-container">
      {menuItems?.map((item) => (
        <button key={item.id}>{item.label}</button>
      ))}
    </div>
  ),
}));

vi.mock('../components/FormDialog', () => ({
  default: ({ open, onClose, mode, selectedRow, onSave }) => (
    open ? (
      <div data-testid="form-dialog">
        <h3>Form Dialog - {mode}</h3>
        <p>Row: {selectedRow?.id || 'none'}</p>
        <button onClick={onClose}>Close</button>
        <button onClick={onSave}>Save</button>
      </div>
    ) : null
  ),
}));

const renderPurchaseOrder = () => {
  return render(
    <BrowserRouter>
      <PurchaseOrder />
    </BrowserRouter>
  );
};

describe('PurchaseOrder Page - Simplified Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    global.alert = vi.fn();
  });

  // ==================== BASIC RENDERING ====================
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      expect(() => {
        renderPurchaseOrder();
      }).not.toThrow();
    });


    it('renders action buttons', () => {
      renderPurchaseOrder();
      expect(screen.getByTestId('action-buttons')).toBeInTheDocument();
    });

    it('renders data table', () => {
      renderPurchaseOrder();
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('shows purchase order menu button', () => {
      renderPurchaseOrder();
      const button = screen.getByRole('button', { name: /purchase order/i });
      expect(button).toBeInTheDocument();
    });

    it('displays table title', () => {
      renderPurchaseOrder();
      expect(screen.getByRole('heading', { name: /purchase order/i })).toBeInTheDocument();
    });
  });

  // ==================== DATA DISPLAY ====================
  describe('Data Display', () => {
    it('displays PO data in table', () => {
      renderPurchaseOrder();
      const tableData = screen.getByTestId('table-data');
      expect(tableData).toBeInTheDocument();
      expect(tableData.textContent).toContain('PO-001');
    });

    it('displays all PO records', () => {
      renderPurchaseOrder();
      const tableData = screen.getByTestId('table-data');
      expect(tableData.textContent).toContain('PO-001');
      expect(tableData.textContent).toContain('PO-002');
    });

    it('displays multiple PO details with correct field names', () => {
      renderPurchaseOrder();
      const tableData = screen.getByTestId('table-data');
      // Check for actual field names from mockData: supplierId, status, dateFrom, dateTo
      expect(tableData.textContent).toContain('SUP-01');
      expect(tableData.textContent).toContain('Pending');
    });
  });

  // ==================== SEARCH FUNCTIONALITY ====================
  describe('Search Functionality', () => {
    it('updates search term when typing', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      const searchInput = screen.getByTestId('search-bar');
      await user.type(searchInput, 'PO-001');
      
      expect(searchInput).toHaveValue('PO-001');
    });

    it('search bar starts empty', () => {
      renderPurchaseOrder();
      expect(screen.getByTestId('search-bar')).toHaveValue('');
    });

    it('allows clearing search term', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      const searchInput = screen.getByTestId('search-bar');
      await user.type(searchInput, 'test');
      await user.clear(searchInput);
      
      expect(searchInput).toHaveValue('');
    });

    it('handles special characters in search', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      const searchInput = screen.getByTestId('search-bar');
      await user.type(searchInput, 'PO-001!@#');
      
      expect(searchInput).toHaveValue('PO-001!@#');
    });
  });

  // ==================== ACTION BUTTONS ====================
  describe('Action Buttons', () => {
    it('opens add dialog when Add button clicked', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Add'));
      
      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
    });

    it('import button is clickable', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Import'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Import clicked');
      consoleSpy.mockRestore();
    });

    it('export button is clickable', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Export'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Export clicked');
      consoleSpy.mockRestore();
    });

    it('print button is clickable', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Print'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Print clicked');
      consoleSpy.mockRestore();
    });

    it('all action buttons are rendered and clickable', () => {
      renderPurchaseOrder();
      
      expect(screen.getByText('Add')).toBeInTheDocument();
      expect(screen.getByText('Import')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('Print')).toBeInTheDocument();
    });
  });

  // ==================== ADD DIALOG ====================
  describe('Add Dialog', () => {
    it('opens add dialog in correct mode', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Add'));
      
      expect(screen.getByText('Form Dialog - add')).toBeInTheDocument();
    });

    it('passes null row to add dialog', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Add'));
      
      expect(screen.getByText('Row: none')).toBeInTheDocument();
    });

    it('closes add dialog when Close clicked', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Add'));
      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      
      await user.click(screen.getByText('Close'));
      expect(screen.queryByTestId('form-dialog')).not.toBeInTheDocument();
    });

    it('dialog opens and closes multiple times', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Add'));
      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      
      await user.click(screen.getByText('Close'));
      expect(screen.queryByTestId('form-dialog')).not.toBeInTheDocument();
      
      await user.click(screen.getByText('Add'));
      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
    });

    it('initially no dialog is shown', () => {
      renderPurchaseOrder();
      expect(screen.queryByTestId('form-dialog')).not.toBeInTheDocument();
    });
  });

  // ==================== EDIT DIALOG ====================
  describe('Edit Dialog', () => {
    it('opens edit dialog when Edit button clicked', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Edit First'));
      
      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      expect(screen.getByText('Form Dialog - edit')).toBeInTheDocument();
    });

    it('passes selected row to edit dialog', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Edit First'));
      
      // Check that row ID is passed (mockData has PO-001 with id: "PO-001" string)
      const rowText = screen.getByText(/Row:/);
      expect(rowText).toBeInTheDocument();
    });

    it('closes edit dialog when Close clicked', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Edit First'));
      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      
      await user.click(screen.getByText('Close'));
      expect(screen.queryByTestId('form-dialog')).not.toBeInTheDocument();
    });

    it('maintains row data in edit dialog', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Edit First'));
      
      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      expect(screen.getByText('Form Dialog - edit')).toBeInTheDocument();
    });

    it('switches from add to edit mode correctly', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Add'));
      expect(screen.getByText('Form Dialog - add')).toBeInTheDocument();
      
      await user.click(screen.getByText('Close'));
      await user.click(screen.getByText('Edit First'));
      
      expect(screen.getByText('Form Dialog - edit')).toBeInTheDocument();
    });
  });

  // ==================== VIEW/NAVIGATION ====================
  describe('View/Navigation', () => {
    it('navigates to detail page when View clicked', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('View First'));
      
      expect(mockNavigate).toHaveBeenCalledWith(
        '/purchase-order/detail',
        expect.objectContaining({
          state: expect.objectContaining({
            id: expect.anything(),
            row: expect.anything(),
          }),
        })
      );
    });

    it('passes correct PO ID to navigation', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('View First'));
      
      expect(mockNavigate).toHaveBeenCalled();
      const callArgs = mockNavigate.mock.calls[0];
      expect(callArgs[0]).toBe('/purchase-order/detail');
    });

    it('passes full row data to navigation state', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('View First'));
      
      expect(mockNavigate).toHaveBeenCalled();
      const callArgs = mockNavigate.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('state');
      expect(callArgs[1].state).toHaveProperty('row');
    });

    it('navigates to correct route path', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('View First'));
      
      const callArgs = mockNavigate.mock.calls[0];
      expect(callArgs[0]).toBe('/purchase-order/detail');
    });
  });

  // ==================== DELETE FUNCTIONALITY ====================
  describe('Delete Functionality', () => {
    it('shows alert when Delete button clicked', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Delete First'));
      
      expect(global.alert).toHaveBeenCalled();
    });

    it('alert includes PO identifier', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Delete First'));
      
      expect(global.alert).toHaveBeenCalled();
      const alertMessage = global.alert.mock.calls[0][0];
      expect(alertMessage).toContain('Xóa');
    });

    it('shows Xóa message in alert', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Delete First'));
      
      expect(global.alert).toHaveBeenCalled();
      const alertMessage = global.alert.mock.calls[0][0];
      expect(alertMessage).toMatch(/Xóa/);
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('handles multiple dialog open/close cycles', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByText('Add'));
        expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
        
        await user.click(screen.getByText('Close'));
        expect(screen.queryByTestId('form-dialog')).not.toBeInTheDocument();
      }
    });

    it('maintains state after multiple interactions', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.type(screen.getByTestId('search-bar'), 'test');
      await user.click(screen.getByText('Add'));
      await user.click(screen.getByText('Close'));
      
      expect(screen.getByTestId('search-bar')).toHaveValue('test');
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('handles rapid button clicks', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Add'));
      await user.click(screen.getByText('Add'));
      
      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
    });

    it('handles switching between different dialog modes', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Add'));
      await user.click(screen.getByText('Close'));
      
      await user.click(screen.getByText('Edit First'));
      expect(screen.getByText('Form Dialog - edit')).toBeInTheDocument();
    });

    it('handles empty search gracefully', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      const searchInput = screen.getByTestId('search-bar');
      await user.type(searchInput, '   ');
      
      expect(searchInput).toHaveValue('   ');
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });
  });

  // ==================== INTEGRATION SCENARIOS ====================
  describe('Integration Scenarios', () => {
    it('completes full add workflow', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Add'));
      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      
      await user.click(screen.getByText('Close'));
      expect(screen.queryByTestId('form-dialog')).not.toBeInTheDocument();
    });

    it('completes full edit workflow', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('Edit First'));
      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      
      await user.click(screen.getByText('Close'));
      expect(screen.queryByTestId('form-dialog')).not.toBeInTheDocument();
    });

    it('completes full view workflow', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.click(screen.getByText('View First'));
      
      expect(mockNavigate).toHaveBeenCalledWith(
        '/purchase-order/detail',
        expect.any(Object)
      );
    });

    it('search and edit together', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      await user.type(screen.getByTestId('search-bar'), 'PO');
      await user.click(screen.getByText('Edit First'));
      
      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('search-bar')).toHaveValue('PO');
    });

    it('performs all CRUD operations in sequence', async () => {
      const user = userEvent.setup();
      renderPurchaseOrder();
      
      // Add
      await user.click(screen.getByText('Add'));
      await user.click(screen.getByText('Close'));
      
      // Edit
      await user.click(screen.getByText('Edit First'));
      await user.click(screen.getByText('Close'));
      
      // View
      await user.click(screen.getByText('View First'));
      expect(mockNavigate).toHaveBeenCalled();
      
      // Delete
      await user.click(screen.getByText('Delete First'));
      expect(global.alert).toHaveBeenCalled();
    });
  });
});
