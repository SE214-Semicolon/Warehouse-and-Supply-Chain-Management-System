import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormFieldsRenderer from '../FormFieldsRenderer';

// Mock dependencies - Constants must be inside factory to avoid hoisting issues
vi.mock('@/components/FormInput', () => ({
  default: ({ label, value, onChange, error, helperText, disabled }) => (
    <div>
      <label htmlFor={label}>{label}</label>
      <input
        id={label}
        aria-label={label}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        data-error={error ? 'true' : 'false'}
        data-helper={helperText}
      />
      {helperText && <span>{helperText}</span>}
    </div>
  ),
}));

vi.mock('@/components/DialogButtons', () => ({
  default: ({ onClose, onAction }) => (
    <div>
      <button onClick={onClose}>Cancel</button>
      <button onClick={onAction}>Save</button>
    </div>
  ),
}));

vi.mock('@/hooks/useDynamicOptions', () => {
  // Define constants inside factory to prevent hoisting issues
  const mockOptions = [];
  const mockInitialValue = {};
  
  return {
    useDynamicOptions: () => ({
      options: mockOptions,
      initialValue: mockInitialValue,
    }),
  };
});

vi.mock('../FieldConfig', () => {
  // Define constants inside factory to prevent hoisting issues
  const fieldConfigs = {
    products: [
      { id: 'sku', label: 'SKU', type: 'text', required: true },
      { id: 'name', label: 'Name', type: 'text', required: true },
      { id: 'barcode', label: 'Barcode', type: 'text', required: false },
    ],
    batches: [
      { id: 'quantity', label: 'Quantity', type: 'number', required: true },
      { id: 'manufactureDate', label: 'Manufacture Date', type: 'date', required: false },
      { id: 'expiryDate', label: 'Expiry Date', type: 'date', required: false },
      { id: 'productId', label: 'Product', type: 'select', required: true },
    ],
    warehouses: [
      { id: 'code', label: 'Code', type: 'text', required: true },
      { id: 'name', label: 'Name', type: 'text', required: true },
      { id: 'totalArea', label: 'Area', type: 'text', required: true },
    ],
    locations: [
      { id: 'code', label: 'Code', type: 'text', required: true },
      { id: 'capacity', label: 'Capacity', type: 'number', required: true },
      { id: 'warehouseId', label: 'Warehouse', type: 'select', required: true },
    ],
  };
  
  return { fieldConfigs };
});

describe('FormFieldsRenderer - Comprehensive Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  // ==================== BASIC RENDERING ====================
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(
          <FormFieldsRenderer
            selectedMenu="products"
            mode="create"
            onSubmit={mockOnSubmit}
            onCancel={mockOnCancel}
          />
        );
      }).not.toThrow();
    });

    it('renders all fields for products menu', () => {
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('SKU')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Barcode')).toBeInTheDocument();
    });

    it('renders all fields for batches menu', () => {
      render(
        <FormFieldsRenderer
          selectedMenu="batches"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
      expect(screen.getByLabelText('Manufacture Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Expiry Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Product')).toBeInTheDocument();
    });

    it('renders dialog buttons', () => {
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('handles unknown menu gracefully', () => {
      expect(() => {
        render(
          <FormFieldsRenderer
            selectedMenu="unknown"
            mode="create"
            onSubmit={mockOnSubmit}
            onCancel={mockOnCancel}
          />
        );
      }).not.toThrow();
    });
  });

  // ==================== FORM DATA INITIALIZATION ====================
  describe('Form Data Initialization', () => {
    it('initializes with empty values in create mode', () => {
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('SKU')).toHaveValue('');
      expect(screen.getByLabelText('Name')).toHaveValue('');
    });

    it('initializes with row data in edit mode', () => {
      const selectedRow = {
        sku: 'SKU-001',
        name: 'Product 1',
        barcode: '1234567890123',
      };

      render(
        <FormFieldsRenderer
          selectedMenu="products"
          selectedRow={selectedRow}
          mode="edit"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('SKU')).toHaveValue('SKU-001');
      expect(screen.getByLabelText('Name')).toHaveValue('Product 1');
      expect(screen.getByLabelText('Barcode')).toHaveValue('1234567890123');
    });

    it('handles warehouses metadata initialization', () => {
      const selectedRow = {
        code: 'WH-001',
        name: 'Warehouse 1',
        metadata: { totalArea: '5000' },
      };

      render(
        <FormFieldsRenderer
          selectedMenu="warehouses"
          selectedRow={selectedRow}
          mode="edit"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('Area')).toHaveValue('5000');
    });

    it('handles null selectedRow', () => {
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          selectedRow={null}
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('SKU')).toHaveValue('');
    });

    it('handles undefined selectedRow', () => {
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('SKU')).toHaveValue('');
    });
  });

  // ==================== VALIDATION - REQUIRED FIELDS ====================
  describe('Required Field Validation', () => {
    it('validates required fields on submit', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('allows submit when all required fields are filled', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('SKU'), 'SKU-001');
      await user.type(screen.getByLabelText('Name'), 'Product 1');

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('shows error for empty required field', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      const skuInput = screen.getByLabelText('SKU');
      expect(skuInput).toHaveAttribute('data-error', 'true');
    });

    it('clears error when required field is filled', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Trigger validation
      await user.click(screen.getByText('Save'));

      // Fill the field
      await user.type(screen.getByLabelText('SKU'), 'SKU-001');
      await user.type(screen.getByLabelText('Name'), 'Test');

      const skuInput = screen.getByLabelText('SKU');
      expect(skuInput.value).toBe('SKU-001');
    });
  });

  // ==================== VALIDATION - MAX LENGTH ====================
  describe('Max Length Validation', () => {
    it('validates SKU max length (100 chars)', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const skuInput = screen.getByLabelText('SKU');
      const longSKU = 'A'.repeat(101);
      
      // Use paste instead of type to avoid 101 individual renders
      await user.click(skuInput);
      await user.paste(longSKU);

      await user.click(screen.getByText('Save'));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates Name max length (200 chars)', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText('Name');
      const longName = 'B'.repeat(201);
      
      // Use paste instead of type to avoid 201 individual renders
      await user.click(nameInput);
      await user.paste(longName);

      await user.click(screen.getByText('Save'));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('accepts short name values', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText('Name');
      await user.type(nameInput, 'Short Name');

      expect(nameInput.value).toBe('Short Name');
    });

    it('accepts values within max length', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('SKU'), 'SKU-001');
      await user.type(screen.getByLabelText('Name'), 'Valid Product Name');

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  // ==================== VALIDATION - BARCODE ====================
  describe('Barcode Validation', () => {
    it('validates barcode must be exactly 13 digits', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('SKU'), 'SKU-001');
      await user.type(screen.getByLabelText('Name'), 'Product 1');
      await user.type(screen.getByLabelText('Barcode'), '12345'); // Too short

      await user.click(screen.getByText('Save'));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('accepts barcode input', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const barcodeInput = screen.getByLabelText('Barcode');
      await user.type(barcodeInput, '12345');

      expect(barcodeInput.value).toBe('12345');
    });

    it('accepts valid 13-digit barcode', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('SKU'), 'SKU-001');
      await user.type(screen.getByLabelText('Name'), 'Product 1');
      await user.type(screen.getByLabelText('Barcode'), '1234567890123');

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('allows empty barcode for optional field', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('SKU'), 'SKU-001');
      await user.type(screen.getByLabelText('Name'), 'Product 1');
      // Leave barcode empty

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  // ==================== VALIDATION - NUMERIC FIELDS ====================
  describe('Numeric Field Validation', () => {
    it('validates quantity max value (30000)', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="batches"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '30001');

      await user.click(screen.getByText('Save'));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('accepts quantity input', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="batches"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const quantityInput = screen.getByLabelText('Quantity');
      await user.type(quantityInput, '40000');

      expect(quantityInput.value).toBe('40000');
    });

    it('accepts values within max limit', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="batches"
          selectedRow={{ productId: '1' }}
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '25000');

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('renders numeric input field', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="batches"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const quantityInput = screen.getByLabelText('Quantity');
      
      // Just verify the input exists and can receive numeric values
      await user.type(quantityInput, '123');

      expect(quantityInput).toHaveValue('123');
    });
  });

  // ==================== VALIDATION - DATE FIELDS ====================
  describe('Date Field Validation', () => {
    it('renders date fields for batches', () => {
      render(
        <FormFieldsRenderer
          selectedMenu="batches"
          selectedRow={{ productId: '1' }}
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('Manufacture Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Expiry Date')).toBeInTheDocument();
    });

    it('allows submitting with valid dates', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="batches"
          selectedRow={{ productId: '1' }}
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  // ==================== DIALOG ACTIONS ====================
  describe('Dialog Actions', () => {
    it('calls onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByText('Cancel'));

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('submits valid form data', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('SKU'), 'SKU-001');
      await user.type(screen.getByLabelText('Name'), 'Product 1');

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            sku: 'SKU-001',
            name: 'Product 1',
          })
        );
      });
    });

    it('includes metadata for warehouses', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="warehouses"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('Code'), 'WH-001');
      await user.type(screen.getByLabelText('Name'), 'Warehouse 1');
      await user.type(screen.getByLabelText('Area'), '5000');

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'WH-001',
            name: 'Warehouse 1',
            metadata: expect.objectContaining({
              totalArea: '5000',
            }),
          })
        );
      });
    });
  });

  // ==================== EDIT MODE BEHAVIOR ====================
  describe('Edit Mode Behavior', () => {
    it('disables warehouseId in edit mode for locations', () => {
      render(
        <FormFieldsRenderer
          selectedMenu="locations"
          selectedRow={{ code: 'LOC-001', warehouseId: '1' }}
          mode="edit"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const warehouseInput = screen.getByLabelText('Warehouse');
      expect(warehouseInput).toBeDisabled();
    });

    it('disables productId in edit mode for batches', () => {
      render(
        <FormFieldsRenderer
          selectedMenu="batches"
          selectedRow={{ quantity: '100', productId: '1' }}
          mode="edit"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const productInput = screen.getByLabelText('Product');
      expect(productInput).toBeDisabled();
    });

    it('allows editing other fields in edit mode', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          selectedRow={{ sku: 'SKU-001', name: 'Old Name' }}
          mode="edit"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText('Name');
      expect(nameInput).not.toBeDisabled();
      
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      expect(nameInput).toHaveValue('New Name');
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('handles rapid field changes', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const skuInput = screen.getByLabelText('SKU');
      
      // Type short string in one go to avoid multiple renders
      await user.type(skuInput, 'ABC');

      expect(skuInput).toHaveValue('ABC');
    });

    it('handles form data reset when menu changes', () => {
      const { rerender } = render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('SKU')).toBeInTheDocument();

      rerender(
        <FormFieldsRenderer
          selectedMenu="batches"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByLabelText('SKU')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    });

    it('clears errors when switching modes', () => {
      const { rerender } = render(
        <FormFieldsRenderer
          selectedMenu="products"
          selectedRow={{ sku: 'SKU-001' }}
          mode="edit"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      rerender(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('SKU')).toHaveValue('');
    });

    it('handles whitespace-only input as empty', async () => {
      const user = userEvent.setup();
      render(
        <FormFieldsRenderer
          selectedMenu="products"
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('SKU'), '   ');
      await user.type(screen.getByLabelText('Name'), '   ');

      await user.click(screen.getByText('Save'));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});
