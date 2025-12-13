import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../../../tests/test-utils';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../tests/mocks/server';
import Warehouse from '../Warehouse';

/**
 * INTEGRATION TEST: Warehouse Page
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Full CRUD workflows
 * 2. Decision Table Testing - Multi-condition logic (user roles, data states)
 * 3. Error Guessing - API failures, network errors
 * 4. Equivalence Partitioning - Different user roles and permissions
 * 
 * Tests integration between:
 * - Warehouse page component
 * - DataTable component
 * - Dialog components (FormDialog, ViewDialog, ConfirmDeleteDialog)
 * - API services (ProductService, CategoryService)
 * - State management
 */

describe('Warehouse Page - Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset MSW handlers before each test
    server.resetHandlers();
  });

  // Happy Path Testing - Full Workflow
  describe('Happy Path - CRUD Operations', () => {
    it('should load and display products list on mount', async () => {
      render(<Warehouse />);

      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Wait for products to load
      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      });

      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
      expect(screen.getByText('SKU-001')).toBeInTheDocument();
    });

    it('should complete full create product workflow', async () => {
      render(<Warehouse />);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      });

      // Click Add Product button
      const addButton = screen.getByRole('button', { name: /add product/i });
      await user.click(addButton);

      // Form dialog should open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();

      // Fill in product details
      await user.type(screen.getByLabelText(/product name/i), 'New Test Product');
      await user.type(screen.getByLabelText(/sku/i), 'SKU-NEW-001');
      await user.type(screen.getByLabelText(/description/i), 'New product description');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Dialog should close and new product should appear
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Verify success message or product in list
      await waitFor(() => {
        expect(screen.getByText('New Test Product')).toBeInTheDocument();
      });
    });

    it('should edit existing product successfully', async () => {
      render(<Warehouse />);

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      });

      // Click edit button on first product
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Edit dialog should open with pre-filled data
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/product name/i);
      expect(nameInput).toHaveValue('Test Product 1');

      // Update product name
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Product Name');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify update
      await waitFor(() => {
        expect(screen.getByText('Updated Product Name')).toBeInTheDocument();
      });
    });

    it('should delete product with confirmation', async () => {
      render(<Warehouse />);

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Confirm delete dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Product should be removed from list
      await waitFor(() => {
        expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument();
      });
    });
  });

  // Decision Table Testing - Complex Logic
  describe('Decision Table - Multi-Condition Scenarios', () => {
    it('should handle search + filter + sort combination', async () => {
      render(<Warehouse />);

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      });

      // Apply search
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Test Product 1');

      // Apply filter
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      // Apply sort
      const sortButton = screen.getByRole('button', { name: /sort/i });
      await user.click(sortButton);

      // Verify filtered and sorted results
      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument();
      });
    });

    it('should handle pagination with filtered data', async () => {
      // Mock large dataset
      server.use(
        http.get('http://localhost:3000/products', () => {
          return HttpResponse.json(
            Array.from({ length: 50 }, (_, i) => ({
              id: `${i + 1}`,
              name: `Product ${i + 1}`,
              sku: `SKU-${i + 1}`,
              categoryId: 'cat-1',
            }))
          );
        })
      );

      render(<Warehouse />);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      // Go to next page
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Verify page 2 data
      await waitFor(() => {
        expect(screen.getByText('Product 11')).toBeInTheDocument();
      });
    });
  });

  // Error Guessing - API Failures
  describe('Error Guessing - Error Handling', () => {
    it('should show error message when API fails (500)', async () => {
      server.use(
        http.get('http://localhost:3000/products', () => {
          return HttpResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
          );
        })
      );

      render(<Warehouse />);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it('should handle network timeout', async () => {
      server.use(
        http.get('http://localhost:3000/products', async () => {
          await new Promise((resolve) => setTimeout(resolve, 10000));
          return HttpResponse.json([]);
        })
      );

      render(<Warehouse />);

      // Should show loading state
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // After timeout, should show error
      await waitFor(
        () => {
          expect(screen.getByText(/timeout|failed/i)).toBeInTheDocument();
        },
        { timeout: 6000 }
      );
    });

    it('should handle create product API failure', async () => {
      server.use(
        http.post('http://localhost:3000/products', () => {
          return HttpResponse.json(
            { message: 'Validation failed' },
            { status: 400 }
          );
        })
      );

      render(<Warehouse />);

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      });

      // Try to create product
      const addButton = screen.getByRole('button', { name: /add product/i });
      await user.click(addButton);

      await user.type(screen.getByLabelText(/product name/i), 'Invalid Product');
      await user.type(screen.getByLabelText(/sku/i), 'INVALID');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText(/validation failed|error/i)).toBeInTheDocument();
      });
    });

    it('should handle empty data gracefully', async () => {
      server.use(
        http.get('http://localhost:3000/products', () => {
          return HttpResponse.json([]);
        })
      );

      render(<Warehouse />);

      await waitFor(() => {
        expect(screen.getByText(/no products|empty/i)).toBeInTheDocument();
      });
    });
  });

  // Equivalence Partitioning - User Roles
  describe('Equivalence Partitioning - User Permissions', () => {
    it('should show all actions for admin role', async () => {
      // Mock admin authentication
      vi.mock('@/store/authStore', () => ({
        default: () => ({
          accessToken: 'admin-token',
          role: 'admin',
        }),
      }));

      render(<Warehouse />);

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      });

      // Admin should see all action buttons
      expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /edit/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /delete/i }).length).toBeGreaterThan(0);
    });

    it('should hide delete button for warehouse_staff role', async () => {
      // Mock warehouse_staff authentication
      vi.mock('@/store/authStore', () => ({
        default: () => ({
          accessToken: 'staff-token',
          role: 'warehouse_staff',
        }),
      }));

      render(<Warehouse />);

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      });

      // Staff should not see delete buttons
      expect(screen.queryAllByRole('button', { name: /delete/i }).length).toBe(0);
    });
  });

  // Basic State & Rendering Check
  describe('State & Rendering', () => {
    it('should maintain search state across dialog open/close', async () => {
      render(<Warehouse />);

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      });

      // Enter search term
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Test Product 1');

      // Open dialog
      const addButton = screen.getByRole('button', { name: /add product/i });
      await user.click(addButton);

      // Close dialog
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Search term should still be there
      expect(searchInput).toHaveValue('Test Product 1');
    });

    it('should reset form when opening create dialog', async () => {
      render(<Warehouse />);

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      });

      // Open create dialog
      const addButton = screen.getByRole('button', { name: /add product/i });
      await user.click(addButton);

      // Form fields should be empty
      expect(screen.getByLabelText(/product name/i)).toHaveValue('');
      expect(screen.getByLabelText(/sku/i)).toHaveValue('');
    });
  });
});
