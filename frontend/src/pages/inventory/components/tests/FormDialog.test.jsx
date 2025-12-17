// import { describe, it, expect, vi, beforeEach } from 'vitest';
// import { render, screen } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
// import FormDialog from '../FormDialog';

// // Mock DialogButtons component
// vi.mock('@/components/DialogButtons', () => ({
//   default: ({ onClose, onAction }) => (
//     <div data-testid="dialog-buttons">
//       <button onClick={onClose}>Cancel</button>
//       <button onClick={onAction}>Save</button>
//     </div>
//   ),
// }));

// // Mock MenuConfig
// vi.mock('../MenuConfig', () => ({
//   menuItems: [
//     {
//       id: 'inventory',
//       label: 'Inventory',
//       columns: [
//         { id: 'sku', label: 'SKU' },
//         { id: 'product', label: 'Sản phẩm' },
//       ],
//     },
//   ],
// }));

// // Mock FieldConfig - Match actual field configuration
// vi.mock('../FieldConfig', () => ({
//   fieldConfigs: {
//     inventory: [
//       { id: 'sku', label: 'SKU', type: 'text' },
//       { id: 'product', label: 'Sản phẩm', type: 'text' },
//       { id: 'batch', label: 'Batch', type: 'text' },
//       { id: 'warehouse', label: 'Kho', type: 'text' },
//       { id: 'location', label: 'Location', type: 'text' },
//       { id: 'available', label: 'Available Qty', type: 'number' },
//     ],
//   },
// }));

// /**
//  * UNIT TEST: Inventory FormDialog Component
//  * 
//  * Testing Techniques Applied:
//  * 1. Happy Path - Normal usage scenarios
//  * 2. Equivalence Partitioning - Different data states (create/edit, with/without data)
//  * 3. Boundary Value Analysis (BVA) - Empty data, null values, edge cases
//  * 4. Error Guessing - Missing handlers, invalid props
//  * 5. State & Rendering - Dialog states, mode changes
//  * 6. Non-Functional - Accessibility checks
//  */

// describe('Inventory FormDialog Component - Unit Tests', () => {
//   let mockOnClose;
//   let mockOnAction;

//   beforeEach(() => {
//     mockOnClose = vi.fn();
//     mockOnAction = vi.fn();
//   });

//   // ============================================================
//   // HAPPY PATH - Basic Functionality
//   // ============================================================
//   describe('Happy Path - Basic Functionality', () => {
//     it('should render dialog when open', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       expect(screen.getByText('Add Inventory')).toBeInTheDocument();
//     });

//     it('should not render dialog when closed', () => {
//       render(
//         <FormDialog
//           open={false}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       expect(screen.queryByText('Add Inventory')).not.toBeInTheDocument();
//     });

//     it('should render all form fields in create mode', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       expect(screen.getByLabelText('SKU')).toBeInTheDocument();
//       expect(screen.getByLabelText('Sản phẩm')).toBeInTheDocument();
//       expect(screen.getByLabelText('Batch')).toBeInTheDocument();
//       expect(screen.getByLabelText('Kho')).toBeInTheDocument();
//       expect(screen.getByLabelText('Location')).toBeInTheDocument();
//       expect(screen.getByLabelText('Available Qty')).toBeInTheDocument();
//     });

//     it('should call onClose when Cancel clicked', async () => {
//       const user = userEvent.setup();
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       await user.click(screen.getByText('Cancel'));
//       expect(mockOnClose).toHaveBeenCalledTimes(1);
//     });

//     it('should call onAction when Save clicked', async () => {
//       const user = userEvent.setup();
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       await user.click(screen.getByText('Save'));
//       expect(mockOnAction).toHaveBeenCalledTimes(1);
//     });
//   });

//   // ============================================================
//   // EQUIVALENCE PARTITIONING - Mode Variations
//   // ============================================================
//   describe('Equivalence Partitioning - Mode Variations', () => {
//     it('should show "Add Inventory" title in create mode', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       expect(screen.getByText('Add Inventory')).toBeInTheDocument();
//     });

//     it('should show "Edit Inventory" title in edit mode', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="edit"
//           selectedMenu="inventory"
//           selectedRow={{ sku: 'SKU001', product: 'Product A' }}
//         />
//       );

//       expect(screen.getByText('Edit Inventory')).toBeInTheDocument();
//     });

//     it('should populate fields with data in edit mode', () => {
//       const selectedRow = {
//         sku: 'SKU001',
//         product: 'Product A',
//         batch: 'BATCH001',
//         warehouse: 'Main Warehouse',
//         location: 'A-01-01',
//         available: 100,
//       };

//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="edit"
//           selectedMenu="inventory"
//           selectedRow={selectedRow}
//         />
//       );

//       // Check fields are rendered (defaultValue doesn't show in controlled tests)
//       expect(screen.getByLabelText('SKU')).toBeInTheDocument();
//       expect(screen.getByLabelText('Sản phẩm')).toBeInTheDocument();
//       expect(screen.getByLabelText('Available Qty')).toBeInTheDocument();
//     });

//     it('should have empty fields in create mode', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       const skuInput = screen.getByLabelText('SKU');
//       const productInput = screen.getByLabelText('Sản phẩm');

//       expect(skuInput.value).toBe('');
//       expect(productInput.value).toBe('');
//     });
//   });

//   // ============================================================
//   // BOUNDARY VALUE ANALYSIS - Data States
//   // ============================================================
//   describe('Boundary Value Analysis - Data States', () => {
//     it('should show message when edit mode with null selectedRow', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="edit"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       expect(screen.getByText('Không có dữ liệu để hiển thị')).toBeInTheDocument();
//     });

//     it('should handle edit mode with empty selectedRow', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="edit"
//           selectedMenu="inventory"
//           selectedRow={{}}
//         />
//       );

//       // Should render fields
//       expect(screen.getByLabelText('SKU')).toBeInTheDocument();
//     });

//     it('should handle edit mode with partial data', () => {
//       const partialRow = {
//         sku: 'SKU001',
//         product: 'Partial Product',
//         // Other fields missing
//       };

//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="edit"
//           selectedMenu="inventory"
//           selectedRow={partialRow}
//         />
//       );

//       // Verify fields are rendered
//       expect(screen.getByLabelText('SKU')).toBeInTheDocument();
//       expect(screen.getByLabelText('Sản phẩm')).toBeInTheDocument();
//       expect(screen.getByLabelText('Batch')).toBeInTheDocument();
//     });

//     it('should handle very long field values', () => {
//       const longDataRow = {
//         sku: 'S'.repeat(100),
//         product: 'P'.repeat(200),
//         batch: 'B'.repeat(50),
//         warehouse: 'W'.repeat(100),
//         location: 'L'.repeat(50),
//         available: 999999,
//       };

//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="edit"
//           selectedMenu="inventory"
//           selectedRow={longDataRow}
//         />
//       );

//       // Verify all fields rendered
//       expect(screen.getByLabelText('SKU')).toBeInTheDocument();
//       expect(screen.getByLabelText('Sản phẩm')).toBeInTheDocument();
//     });

//     it('should handle special characters in data', () => {
//       const specialCharRow = {
//         sku: 'SKU-001',
//         product: 'Product & Item <Special>',
//         batch: 'BATCH#001',
//         warehouse: "O'Brien's Warehouse",
//         location: 'A-01/02',
//         available: 50,
//       };

//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="edit"
//           selectedMenu="inventory"
//           selectedRow={specialCharRow}
//         />
//       );

//       // Verify fields rendered
//       expect(screen.getByLabelText('SKU')).toBeInTheDocument();
//       expect(screen.getByLabelText('Sản phẩm')).toBeInTheDocument();
//     });
//   });

//   // ============================================================
//   // ERROR GUESSING - Invalid Props & Edge Cases
//   // ============================================================
//   describe('Error Guessing - Invalid Props & Edge Cases', () => {
//     it('should handle missing onClose handler', () => {
//       render(
//         <FormDialog
//           open={true}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       expect(screen.getByText('Add Inventory')).toBeInTheDocument();
//     });

//     it('should handle missing onAction handler', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       expect(screen.getByText('Add Inventory')).toBeInTheDocument();
//     });

//     it('should handle undefined selectedMenu', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu={undefined}
//           selectedRow={null}
//         />
//       );

//       // Should not crash
//       expect(screen.getByRole('dialog')).toBeInTheDocument();
//     });

//     it('should handle invalid mode value', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="invalid-mode"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       // Should render without crashing
//       expect(screen.getByRole('dialog')).toBeInTheDocument();
//     });
//   });

//   // ============================================================
//   // STATE & RENDERING - Dialog States
//   // ============================================================
//   describe('State & Rendering - Dialog States', () => {
//     it('should render dialog with proper structure', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       expect(screen.getByRole('dialog')).toBeInTheDocument();
//     });

//     it('should render DialogButtons component', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       expect(screen.getByTestId('dialog-buttons')).toBeInTheDocument();
//       expect(screen.getByText('Cancel')).toBeInTheDocument();
//       expect(screen.getByText('Save')).toBeInTheDocument();
//     });

//     it('should update when mode changes', () => {
//       const { rerender } = render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       expect(screen.getByText('Add Inventory')).toBeInTheDocument();

//       rerender(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="edit"
//           selectedMenu="inventory"
//           selectedRow={{ sku: 'SKU001' }}
//         />
//       );

//       expect(screen.getByText('Edit Inventory')).toBeInTheDocument();
//     });
//   });

//   // ============================================================
//   // NON-FUNCTIONAL - Accessibility
//   // ============================================================
//   describe('Non-Functional - Accessibility', () => {
//     it('should have accessible dialog role', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       expect(screen.getByRole('dialog')).toBeInTheDocument();
//     });

//     it('should have accessible form fields with labels', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       expect(screen.getByLabelText('SKU')).toBeInTheDocument();
//       expect(screen.getByLabelText('Sản phẩm')).toBeInTheDocument();
//       expect(screen.getByLabelText('Batch')).toBeInTheDocument();
//       expect(screen.getByLabelText('Kho')).toBeInTheDocument();
//     });

//     it('should have proper field types', () => {
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       const skuInput = screen.getByLabelText('SKU');
//       const qtyInput = screen.getByLabelText('Available Qty');

//       expect(skuInput).toHaveAttribute('type', 'text');
//       expect(qtyInput).toHaveAttribute('type', 'number');
//     });
//   });

//   // ============================================================
//   // REAL-WORLD SCENARIOS
//   // ============================================================
//   describe('Real-world Scenarios', () => {
//     it('should support creating new inventory item', async () => {
//       const user = userEvent.setup();
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       await user.type(screen.getByLabelText('SKU'), 'SKU-NEW-001');
//       await user.type(screen.getByLabelText('Sản phẩm'), 'New Product');
//       await user.type(screen.getByLabelText('Available Qty'), '100');

//       expect(screen.getByDisplayValue('SKU-NEW-001')).toBeInTheDocument();
//       expect(screen.getByDisplayValue('New Product')).toBeInTheDocument();
//       expect(screen.getByDisplayValue('100')).toBeInTheDocument();
//     });

//     it('should support editing existing inventory item', async () => {
//       const existingItem = {
//         sku: 'SKU001',
//         product: 'Old Product',
//         batch: 'BATCH001',
//         warehouse: 'Warehouse A',
//         location: 'A-01-01',
//         available: 50,
//       };

//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="edit"
//           selectedMenu="inventory"
//           selectedRow={existingItem}
//         />
//       );

//       // Verify edit mode
//       expect(screen.getByText('Edit Inventory')).toBeInTheDocument();
//       expect(screen.getByLabelText('SKU')).toBeInTheDocument();
//     });

//     it('should handle form submission flow', async () => {
//       const user = userEvent.setup();

//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       await user.type(screen.getByLabelText('SKU'), 'TEST-SKU');
//       await user.click(screen.getByText('Save'));

//       expect(mockOnAction).toHaveBeenCalledTimes(1);
//     });

//     it('should handle canceling form', async () => {
//       const user = userEvent.setup();
//       render(
//         <FormDialog
//           open={true}
//           onClose={mockOnClose}
//           onAction={mockOnAction}
//           mode="create"
//           selectedMenu="inventory"
//           selectedRow={null}
//         />
//       );

//       await user.type(screen.getByLabelText('SKU'), 'TEST');
//       await user.click(screen.getByText('Cancel'));

//       expect(mockOnClose).toHaveBeenCalled();
//     });
//   });
// });
