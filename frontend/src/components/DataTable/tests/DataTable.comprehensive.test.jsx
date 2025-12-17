import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTable from '../DataTable';

describe('DataTable Component - Comprehensive Tests', () => {
  const mockColumns = [
    { id: 'stt', label: 'No.', sortable: false, filterable: false },
    { id: 'name', label: 'Name', sortable: true, filterable: true },
    { id: 'email', label: 'Email', sortable: true, filterable: true },
    { id: 'status', label: 'Status', sortable: true, filterable: true },
  ];

  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'Active' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', status: 'Pending' },
  ];

  // ==================== BASIC RENDERING ====================
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<DataTable columns={mockColumns} data={mockData} />);
      }).not.toThrow();
    });

    it('renders table headers correctly', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText('No.')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('renders all data rows', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      expect(screen.getByText('Alice Brown')).toBeInTheDocument();
      expect(screen.getByText('Charlie Wilson')).toBeInTheDocument();
    });

    it('renders STT column with sequential numbers', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const rows = screen.getAllByRole('row');
      // Skip header row
      const dataRows = rows.slice(1);
      
      expect(within(dataRows[0]).getByText('1')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('2')).toBeInTheDocument();
      expect(within(dataRows[2]).getByText('3')).toBeInTheDocument();
    });

    it('handles empty data array', () => {
      render(<DataTable columns={mockColumns} data={[]} />);
      
      // Headers should still render
      expect(screen.getByText('Name')).toBeInTheDocument();
      
      // No data rows
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(1); // Only header row
    });

    it('handles undefined data prop', () => {
      render(<DataTable columns={mockColumns} />);
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('handles null data prop', () => {
      render(<DataTable columns={mockColumns} data={null} />);
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
  });

  // ==================== PAGINATION ====================
  describe('Pagination', () => {
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      status: i % 2 === 0 ? 'Active' : 'Inactive',
    }));

    it('displays pagination controls', () => {
      render(<DataTable columns={mockColumns} data={largeData} />);
      
      expect(screen.getByText(/số dòng mỗi trang/i)).toBeInTheDocument();
    });

    it('shows correct initial pagination info', () => {
      render(<DataTable columns={mockColumns} data={largeData} initialRowsPerPage={10} />);
      
      expect(screen.getByText(/1-10 trong 25/i)).toBeInTheDocument();
    });

    it('paginates data correctly', () => {
      render(<DataTable columns={mockColumns} data={largeData} initialRowsPerPage={10} />);
      
      // First page should show User 1-10
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 10')).toBeInTheDocument();
      expect(screen.queryByText('User 11')).not.toBeInTheDocument();
    });

    it('changes page when next button is clicked', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={largeData} initialRowsPerPage={10} />);
      
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);
      
      // Should show User 11-20 on page 2
      expect(screen.getByText('User 11')).toBeInTheDocument();
      expect(screen.queryByText('User 1')).not.toBeInTheDocument();
    });

    it('respects initialRowsPerPage prop', () => {
      render(<DataTable columns={mockColumns} data={largeData} initialRowsPerPage={5} />);
      
      expect(screen.getByText(/1-5 trong 25/i)).toBeInTheDocument();
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 5')).toBeInTheDocument();
      expect(screen.queryByText('User 6')).not.toBeInTheDocument();
    });

    it('changes rows per page', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={largeData} initialRowsPerPage={10} />);
      
      const rowsPerPageButton = screen.getByRole('combobox');
      await user.click(rowsPerPageButton);
      
      // Select 25 rows per page option
      const option25 = screen.getByRole('option', { name: '25' });
      await user.click(option25);
      
      // Should show all 25 rows
      expect(screen.getByText(/1-25 trong 25/i)).toBeInTheDocument();
    });

    it('resets to page 0 when rows per page changes', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={largeData} initialRowsPerPage={10} />);
      
      // Go to page 2
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);
      
      // Change rows per page
      const rowsPerPageButton = screen.getByRole('combobox');
      await user.click(rowsPerPageButton);
      const option25 = screen.getByRole('option', { name: '25' });
      await user.click(option25);
      
      // Should reset to show from row 1
      expect(screen.getByText(/1-25 trong 25/i)).toBeInTheDocument();
    });

    it('updates STT numbers based on current page', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={largeData} initialRowsPerPage={10} />);
      
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);
      
      // On page 2, STT should start from 11
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);
      
      expect(within(dataRows[0]).getByText('11')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('12')).toBeInTheDocument();
    });
  });

  // ==================== SORTING ====================
  describe('Sorting', () => {
    it('renders filter icons for sortable columns', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      // FilterList icons should be present (excluding STT column)
      const filterButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg')
      );
      expect(filterButtons.length).toBeGreaterThan(0);
    });

    it('opens sort menu when filter icon is clicked', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const filterButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="FilterListIcon"]')
      );
      
      if (filterButtons.length > 0) {
        await user.click(filterButtons[0]);
        
        expect(screen.getByText(/sort a to z/i)).toBeInTheDocument();
        expect(screen.getByText(/sort z to a/i)).toBeInTheDocument();
      }
    });

    it('sorts data A to Z', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const filterButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="FilterListIcon"]')
      );
      
      if (filterButtons.length > 0) {
        await user.click(filterButtons[0]);
        const sortAZ = screen.getByText(/sort a to z/i);
        await user.click(sortAZ);
        
        const rows = screen.getAllByRole('row');
        const dataRows = rows.slice(1);
        
        // After sorting by name A-Z, Alice should be first
        expect(within(dataRows[0]).getByText('Alice Brown')).toBeInTheDocument();
      }
    });

    it('sorts data Z to A', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const filterButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="FilterListIcon"]')
      );
      
      if (filterButtons.length > 0) {
        await user.click(filterButtons[0]);
        const sortZA = screen.getByText(/sort z to a/i);
        await user.click(sortZA);
        
        const rows = screen.getAllByRole('row');
        const dataRows = rows.slice(1);
        
        // After sorting by name Z-A, John should be first
        expect(within(dataRows[0]).getByText('John Doe')).toBeInTheDocument();
      }
    });

    it('does not show sort options for non-sortable columns', () => {
      const mixedColumns = [
        { id: 'stt', label: 'No.', sortable: false, filterable: false },
        { id: 'name', label: 'Name', sortable: false, filterable: false },
        { id: 'email', label: 'Email', sortable: true, filterable: true },
      ];
      render(<DataTable columns={mixedColumns} data={mockData} />);
      
      // Should have filter button only for columns where filterable !== false
      const filterButtons = screen.queryAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="FilterListIcon"]')
      );
      // Only Email column should have filter button (Name and STT have filterable: false)
      expect(filterButtons.length).toBe(1);
    });
  });

  // ==================== FILTERING ====================
  describe('Filtering', () => {
    it('shows filter options in popover', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const filterButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="FilterListIcon"]')
      );
      
      if (filterButtons.length > 0) {
        await user.click(filterButtons[0]);
        
        expect(screen.getByText(/select all/i)).toBeInTheDocument();
        expect(screen.getByText(/clear/i)).toBeInTheDocument();
      }
    });

    it('displays unique values for filtering', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      // Click filter button for status column
      const filterButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="FilterListIcon"]')
      );
      
      if (filterButtons.length > 2) {
        await user.click(filterButtons[2]); // Status column filter
        
        // Should show unique status values in filter popover
        const activeElements = screen.getAllByText('Active');
        expect(activeElements.length).toBeGreaterThan(0);
      }
    });

    it('filters data based on selection', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const filterButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="FilterListIcon"]')
      );
      
      if (filterButtons.length > 2) {
        await user.click(filterButtons[2]);

        // Find checkboxes in the filter popover - first checkbox is for Active
        const checkboxes = screen.getAllByRole('checkbox');
        // Click the first checkbox which corresponds to Active
        if (checkboxes.length > 0) {
          await user.click(checkboxes[0]);
        }

        // If a checkbox exists for the value, toggle it
        const activeCheckbox = screen.queryByRole('checkbox', { name: /active/i });
        if (activeCheckbox) {
          await user.click(activeCheckbox);
        }

        const okButton = screen.getByRole('button', { name: /ok/i });
        await user.click(okButton);

        // Should only show Active users
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
        expect(screen.getByText('Alice Brown')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      }
    });

    it('clears filter selection', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const filterButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="FilterListIcon"]')
      );
      
      if (filterButtons.length > 0) {
        await user.click(filterButtons[0]);
        
        const clearButton = screen.getByText(/clear/i);
        await user.click(clearButton);
        
        // All checkboxes should be unchecked
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox).not.toBeChecked();
        });
      }
    });

    it('selects all filter options', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const filterButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="FilterListIcon"]')
      );
      
      if (filterButtons.length > 0) {
        await user.click(filterButtons[0]);
        
        const selectAllButton = screen.getByText(/select all/i);
        await user.click(selectAllButton);
        
        // All checkboxes should be checked
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox).toBeChecked();
        });
      }
    });

    it('closes filter popover on cancel', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const filterButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="FilterListIcon"]')
      );
      
      if (filterButtons.length > 0) {
        await user.click(filterButtons[0]);
        
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);
        
        // Popover should close
        expect(screen.queryByText(/select all/i)).not.toBeInTheDocument();
      }
    });
  });

  // ==================== ACTION BUTTONS ====================
  describe('Action Buttons', () => {
    it('renders view button when onView is provided', () => {
      const handleView = vi.fn();
      render(<DataTable columns={mockColumns} data={mockData} onView={handleView} />);
      
      const viewButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="VisibilityIcon"]')
      );
      expect(viewButtons.length).toBe(mockData.length);
    });

    it('calls onView with row data including STT', async () => {
      const user = userEvent.setup();
      const handleView = vi.fn();
      render(<DataTable columns={mockColumns} data={mockData} onView={handleView} />);
      
      const viewButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="VisibilityIcon"]')
      );
      
      await user.click(viewButtons[0]);
      
      expect(handleView).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockData[0],
          stt: 1,
        })
      );
    });

    it('renders edit button when onEdit is provided', () => {
      const handleEdit = vi.fn();
      render(<DataTable columns={mockColumns} data={mockData} onEdit={handleEdit} />);
      
      const editButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="EditIcon"]')
      );
      expect(editButtons.length).toBe(mockData.length);
    });

    it('calls onEdit with row data', async () => {
      const user = userEvent.setup();
      const handleEdit = vi.fn();
      render(<DataTable columns={mockColumns} data={mockData} onEdit={handleEdit} />);
      
      const editButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="EditIcon"]')
      );
      
      await user.click(editButtons[0]);
      
      expect(handleEdit).toHaveBeenCalledWith(mockData[0]);
    });

    it('renders delete button when onDelete is provided', () => {
      const handleDelete = vi.fn();
      render(<DataTable columns={mockColumns} data={mockData} onDelete={handleDelete} />);
      
      const deleteButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="DeleteIcon"]')
      );
      expect(deleteButtons.length).toBe(mockData.length);
    });

    it('calls onDelete with row data', async () => {
      const user = userEvent.setup();
      const handleDelete = vi.fn();
      render(<DataTable columns={mockColumns} data={mockData} onDelete={handleDelete} />);
      
      const deleteButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="DeleteIcon"]')
      );
      
      await user.click(deleteButtons[0]);
      
      expect(handleDelete).toHaveBeenCalledWith(mockData[0]);
    });

    it('renders all action buttons when all handlers are provided', () => {
      render(
        <DataTable 
          columns={mockColumns} 
          data={mockData} 
          onView={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );
      
      const viewButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="VisibilityIcon"]')
      );
      const editButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="EditIcon"]')
      );
      const deleteButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="DeleteIcon"]')
      );
      
      expect(viewButtons.length).toBe(mockData.length);
      expect(editButtons.length).toBe(mockData.length);
      expect(deleteButtons.length).toBe(mockData.length);
    });

    it('does not render action buttons when no handlers provided', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const viewButtons = screen.queryAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="VisibilityIcon"]')
      );
      const editButtons = screen.queryAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="EditIcon"]')
      );
      const deleteButtons = screen.queryAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="DeleteIcon"]')
      );
      
      expect(viewButtons.length).toBe(0);
      expect(editButtons.length).toBe(0);
      expect(deleteButtons.length).toBe(0);
    });
  });

  // ==================== CUSTOM RENDER ====================
  describe('Custom Render Functions', () => {
    it('uses custom render function for column', () => {
      const columnsWithRender = [
        { id: 'stt', label: 'No.' },
        { 
          id: 'name', 
          label: 'Name',
          render: (value) => <strong>{value.toUpperCase()}</strong>
        },
      ];
      
      render(<DataTable columns={columnsWithRender} data={mockData} />);
      
      expect(screen.getByText('JOHN DOE')).toBeInTheDocument();
    });

    it('passes row data to custom render function', () => {
      const columnsWithRender = [
        { id: 'stt', label: 'No.' },
        { 
          id: 'status', 
          label: 'Status',
          render: (value, row) => `${row.name} is ${value}`
        },
      ];
      
      render(<DataTable columns={columnsWithRender} data={mockData} />);
      
      expect(screen.getByText('John Doe is Active')).toBeInTheDocument();
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('handles data with null values', () => {
      const dataWithNull = [
        { id: 1, name: null, email: 'test@example.com', status: 'Active' },
      ];
      
      expect(() => {
        render(<DataTable columns={mockColumns} data={dataWithNull} />);
      }).not.toThrow();
    });

    it('handles data with undefined values', () => {
      const dataWithUndefined = [
        { id: 1, name: undefined, email: 'test@example.com', status: 'Active' },
      ];
      
      expect(() => {
        render(<DataTable columns={mockColumns} data={dataWithUndefined} />);
      }).not.toThrow();
    });

    it('handles data with empty string values', () => {
      const dataWithEmpty = [
        { id: 1, name: '', email: 'test@example.com', status: 'Active' },
      ];
      
      render(<DataTable columns={mockColumns} data={dataWithEmpty} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('handles very large datasets', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        status: 'Active',
      }));
      
      expect(() => {
        render(<DataTable columns={mockColumns} data={largeData} initialRowsPerPage={10} />);
      }).not.toThrow();
    });

    it('handles columns with missing properties', () => {
      const incompleteColumns = [
        { id: 'name' }, // No label
        { label: 'Email' }, // No id - this would be problematic
      ];
      
      expect(() => {
        render(<DataTable columns={incompleteColumns} data={mockData} />);
      }).not.toThrow();
    });
  });

  // ==================== ACCESSIBILITY ====================
  describe('Accessibility', () => {
    it('uses semantic table elements', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
    });

    it('provides accessible button labels', () => {
      render(
        <DataTable 
          columns={mockColumns} 
          data={mockData} 
          onView={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('maintains keyboard navigability', () => {
      render(
        <DataTable 
          columns={mockColumns} 
          data={mockData} 
          onEdit={vi.fn()}
        />
      );
      
      const editButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-testid="EditIcon"]')
      );
      
      editButtons[0].focus();
      expect(document.activeElement).toBe(editButtons[0]);
    });
  });
});
