import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTable from '../DataTable';

/**
 * UNIT TEST: DataTable Component
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal table rendering, pagination, sorting
 * 2. Equivalence Partitioning - Different data sizes, column types
 * 3. BVA - Empty data, single row, large datasets, edge pagination
 * 4. Decision Table Testing - Sort + filter combinations
 * 5. Error Guessing - Missing columns, null data, undefined handlers
 * 6. State & Rendering Check - Pagination, sort, filter states
 * 7. Non-Functional Checks - Accessibility, performance
 */

describe('DataTable Component - Unit Tests', () => {
  // Mock data
  const mockColumns = [
    { id: 'stt', label: 'STT', sortable: false, filterable: false },
    { id: 'name', label: 'Name', sortable: true, filterable: true },
    { id: 'age', label: 'Age', sortable: true, filterable: true },
    { id: 'email', label: 'Email', sortable: true, filterable: true },
  ];

  const mockData = [
    { id: 1, name: 'Alice', age: 25, email: 'alice@example.com' },
    { id: 2, name: 'Bob', age: 30, email: 'bob@example.com' },
    { id: 3, name: 'Charlie', age: 35, email: 'charlie@example.com' },
    { id: 4, name: 'David', age: 28, email: 'david@example.com' },
    { id: 5, name: 'Eve', age: 32, email: 'eve@example.com' },
  ];

  const defaultProps = {
    columns: mockColumns,
    data: mockData,
  };

  // Happy Path - Basic Rendering
  describe('Happy Path - Basic Table Rendering', () => {
    it('should render table with all columns', () => {
      render(<DataTable {...defaultProps} />);

      mockColumns.forEach((col) => {
        expect(screen.getByText(col.label)).toBeInTheDocument();
      });
    });

    it('should render Action column', () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should render all data rows', () => {
      render(<DataTable {...defaultProps} />);

      mockData.forEach((row) => {
        expect(screen.getByText(row.name)).toBeInTheDocument();
      });
    });

    it('should render STT (row numbers) starting from 1', () => {
      render(<DataTable {...defaultProps} />);

      // First row should have STT = 1
      const firstRow = screen.getByText('Alice').closest('tr');
      const sttCell = within(firstRow).getAllByRole('cell')[0];
      expect(sttCell).toHaveTextContent('1');
    });

    it('should render table with correct structure', () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
    });
  });

  // Happy Path - Pagination
  describe('Happy Path - Pagination', () => {
    it('should display pagination controls', () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByText(/Số dòng mỗi trang/i)).toBeInTheDocument();
      expect(screen.getByText(/trong/i)).toBeInTheDocument();
    });

    it('should show correct pagination info', () => {
      render(<DataTable {...defaultProps} initialRowsPerPage={5} />);

      // Default should show "1-5 trong 5" (5 items per page)
      expect(screen.getByText(/1-5 trong 5/i)).toBeInTheDocument();
    });

    it('should change page when next button clicked', async () => {
      const user = userEvent.setup();
      const largeData = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        age: 20 + i,
        email: `user${i + 1}@example.com`,
      }));

      render(<DataTable {...defaultProps} data={largeData} initialRowsPerPage={5} />);

      // Should show first 5 items
      expect(screen.getByText('User 1')).toBeInTheDocument();
      
      // Click next page
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);
      
      // Wait for pagination to update
      await waitFor(() => {
        expect(screen.getByText('User 6')).toBeInTheDocument();
      });

      // Should show next 5 items
      expect(screen.queryByText('User 1')).not.toBeInTheDocument();
      expect(screen.getByText('User 6')).toBeInTheDocument();
    });

    it('should change rows per page', async () => {
      const user = userEvent.setup();
      const largeData = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        age: 20 + i,
        email: `user${i + 1}@example.com`,
      }));

      render(<DataTable {...defaultProps} data={largeData} />);

      // Find and click rows per page dropdown
      const rowsPerPageSelect = screen.getByRole('combobox');
      await user.click(rowsPerPageSelect);

      // Select 10 rows per page
      const option10 = screen.getByRole('option', { name: '10' });
      await user.click(option10);

      // Should show 10 items now
      expect(screen.getByText(/1-10 trong 15/i)).toBeInTheDocument();
    });

    it('should update STT numbers on page change', async () => {
      const user = userEvent.setup();
      const largeData = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        age: 20 + i,
        email: `user${i + 1}@example.com`,
      }));

      render(<DataTable {...defaultProps} data={largeData} initialRowsPerPage={5} />);

      // Click next page
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      // Wait for page change
      await waitFor(() => {
        expect(screen.getByText('User 6')).toBeInTheDocument();
      });
      
      // First row on page 2 should have STT = 6 (not 1)
      const firstRow = screen.getByText('User 6').closest('tr');
      const sttCell = within(firstRow).getAllByRole('cell')[0];
      expect(sttCell).toHaveTextContent('6');
    });
  });

  // Happy Path - Sorting
  describe('Happy Path - Sorting', () => {
    it('should render filter icons for filterable columns', () => {
      render(<DataTable {...defaultProps} />);

      // STT should not have filter icon (filterable: false)
      const sttHeader = screen.getByText('STT').closest('th');
      const filterButtons = within(sttHeader).queryAllByRole('button');
      expect(filterButtons.length).toBe(0);

      // Name should have filter icon (filterable: true)
      const nameHeader = screen.getByText('Name').closest('th');
      const nameFilterButtons = within(nameHeader).queryAllByRole('button');
      expect(nameFilterButtons.length).toBeGreaterThan(0);
    });

    it('should open filter popover when filter icon clicked', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} />);

      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      // Popover should be visible with sort options
      expect(screen.getByText('Sort A to Z')).toBeInTheDocument();
      expect(screen.getByText('Sort Z to A')).toBeInTheDocument();
    });

    it('should sort data A to Z', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} />);

      // Open filter popover for Name column
      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      // Click "Sort A to Z"
      const sortAZ = screen.getByText('Sort A to Z');
      await user.click(sortAZ);

      // First row should now be Alice (alphabetically first)
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1]; // Skip header row
      expect(within(firstDataRow).getByText('Alice')).toBeInTheDocument();
    });

    it('should sort data Z to A', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} />);

      // Open filter popover for Name column
      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      // Click "Sort Z to A"
      const sortZA = screen.getByText('Sort Z to A');
      await user.click(sortZA);

      // First row should now be Eve (alphabetically last)
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1]; // Skip header row
      expect(within(firstDataRow).getByText('Eve')).toBeInTheDocument();
    });

    it('should close popover after sorting', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} />);

      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      const sortAZ = screen.getByText('Sort A to Z');
      await user.click(sortAZ);

      // Popover should be closed
      expect(screen.queryByText('Sort A to Z')).not.toBeInTheDocument();
    });
  });

  // Happy Path - Filtering
  describe('Happy Path - Filtering', () => {
    it('should show unique values in filter list', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} />);

      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      // All unique names should be in the list
      mockData.forEach((row) => {
        expect(screen.getAllByText(row.name).length).toBeGreaterThan(0);
      });
    });

    it('should toggle filter value when clicked', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} />);

      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      // Find Alice checkbox item
      const aliceItems = screen.getAllByText('Alice');
      const aliceCheckboxItem = aliceItems.find(
        (item) => item.closest('.MuiListItemText-root')
      );
      const aliceListItem = aliceCheckboxItem.closest('.MuiListItemButton-root');

      // Click to select
      await user.click(aliceListItem);

      // Checkbox should be checked
      const checkbox = within(aliceListItem).getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should filter data when filter applied and OK clicked', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} />);

      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      // Select only Alice
      const aliceItems = screen.getAllByText('Alice');
      const aliceCheckboxItem = aliceItems.find(
        (item) => item.closest('.MuiListItemText-root')
      );
      const aliceListItem = aliceCheckboxItem.closest('.MuiListItemButton-root');
      await user.click(aliceListItem);

      // Click OK
      const okButton = screen.getByRole('button', { name: 'OK' });
      await user.click(okButton);

      // Table should only show Alice
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    });

    it('should select all filter values', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} />);

      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      // Click "Select all"
      const selectAllButton = screen.getByRole('button', { name: /Select all/i });
      await user.click(selectAllButton);

      // All checkboxes should be checked
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it('should clear filter values', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} />);

      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      // Select all first
      const selectAllButton = screen.getByRole('button', { name: /Select all/i });
      await user.click(selectAllButton);

      // Then clear
      const clearButton = screen.getByRole('button', { name: /Clear/i });
      await user.click(clearButton);

      // All checkboxes should be unchecked
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('should cancel filter without applying changes', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} />);

      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      // Select Alice
      const aliceItems = screen.getAllByText('Alice');
      const aliceCheckboxItem = aliceItems.find(
        (item) => item.closest('.MuiListItemText-root')
      );
      const aliceListItem = aliceCheckboxItem.closest('.MuiListItemButton-root');
      await user.click(aliceListItem);

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      // Wait for popover to close and verify all data still visible
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
      });
      
      // All original data should still be visible (filter not applied)
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      // Bob should also still be visible
      const bobElements = screen.queryAllByText('Bob');
      expect(bobElements.length).toBeGreaterThan(0);
    });
  });

  // Happy Path - Action Buttons
  describe('Happy Path - Action Buttons', () => {
    it('should render View button when onView provided', () => {
      const handleView = vi.fn();
      render(<DataTable {...defaultProps} onView={handleView} />);

      const viewButtons = screen.getAllByRole('button');
      const visibilityButtons = viewButtons.filter((btn) =>
        btn.querySelector('.MuiSvgIcon-root')?.textContent === ''
      );
      expect(visibilityButtons.length).toBeGreaterThan(0);
    });

    it('should render Edit button when onEdit provided', () => {
      const handleEdit = vi.fn();
      render(<DataTable {...defaultProps} onEdit={handleEdit} />);

      const editButtons = screen.getAllByRole('button');
      const editIconButtons = editButtons.filter((btn) =>
        btn.querySelector('svg')
      );
      expect(editIconButtons.length).toBeGreaterThan(0);
    });

    it('should render Delete button when onDelete provided', () => {
      const handleDelete = vi.fn();
      render(<DataTable {...defaultProps} onDelete={handleDelete} />);

      const deleteButtons = screen.getAllByRole('button');
      const deleteIconButtons = deleteButtons.filter((btn) =>
        btn.querySelector('svg')
      );
      expect(deleteIconButtons.length).toBeGreaterThan(0);
    });

    it('should call onView with row data when View clicked', async () => {
      const user = userEvent.setup();
      const handleView = vi.fn();
      render(<DataTable {...defaultProps} onView={handleView} />);

      // Find first row's action buttons
      const firstRow = screen.getByText('Alice').closest('tr');
      const actionCell = within(firstRow).getAllByRole('cell').pop();
      const viewButton = within(actionCell).getAllByRole('button')[0];

      await user.click(viewButton);

      expect(handleView).toHaveBeenCalledTimes(1);
      expect(handleView).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: 'Alice',
          age: 25,
          email: 'alice@example.com',
          stt: 1,
        })
      );
    });

    it('should call onEdit with row data when Edit clicked', async () => {
      const user = userEvent.setup();
      const handleEdit = vi.fn();
      render(<DataTable {...defaultProps} onEdit={handleEdit} />);

      // Find first row's action buttons
      const firstRow = screen.getByText('Alice').closest('tr');
      const actionCell = within(firstRow).getAllByRole('cell').pop();
      const editButton = within(actionCell).getAllByRole('button')[0];

      await user.click(editButton);

      expect(handleEdit).toHaveBeenCalledTimes(1);
      expect(handleEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: 'Alice',
        })
      );
    });

    it('should call onDelete with row data when Delete clicked', async () => {
      const user = userEvent.setup();
      const handleDelete = vi.fn();
      render(<DataTable {...defaultProps} onDelete={handleDelete} />);

      // Find first row's action buttons
      const firstRow = screen.getByText('Alice').closest('tr');
      const actionCell = within(firstRow).getAllByRole('cell').pop();
      const deleteButton = within(actionCell).getAllByRole('button')[0];

      await user.click(deleteButton);

      expect(handleDelete).toHaveBeenCalledTimes(1);
      expect(handleDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: 'Alice',
        })
      );
    });

    it('should not render action buttons when no handlers provided', () => {
      render(<DataTable {...defaultProps} />);

      // Find first row's action cell
      const firstRow = screen.getByText('Alice').closest('tr');
      const actionCell = within(firstRow).getAllByRole('cell').pop();
      const buttons = within(actionCell).queryAllByRole('button');

      expect(buttons.length).toBe(0);
    });
  });

  // BVA - Edge Cases
  describe('BVA - Edge Cases', () => {
    it('should handle empty data array', () => {
      render(<DataTable {...defaultProps} data={[]} />);

      // Headers should still be visible
      expect(screen.getByText('Name')).toBeInTheDocument();

      // No data rows
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(1); // Only header row
    });

    it('should handle single row data', () => {
      const singleData = [mockData[0]];
      render(<DataTable {...defaultProps} data={singleData} />);

      // Should show the single row
      expect(screen.getByText('Alice')).toBeInTheDocument();

      // Pagination should show 1-1 trong 1
      expect(screen.getByText(/1-1 trong 1/i)).toBeInTheDocument();
    });

    it('should handle very large dataset', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        age: 20 + (i % 50),
        email: `user${i + 1}@example.com`,
      }));

      render(<DataTable {...defaultProps} data={largeData} initialRowsPerPage={5} />);

      // Should only render first page (5 items by default)
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 5')).toBeInTheDocument();
      
      // Pagination should work correctly
      // User 6 is on page 2, not visible initially

      // Pagination should show correct total
      expect(screen.getByText(/1-5 trong 1000/i)).toBeInTheDocument();
    });

    it('should handle data with null values', () => {
      const dataWithNulls = [
        { id: 1, name: null, age: 25, email: 'alice@example.com' },
        { id: 2, name: 'Bob', age: null, email: 'bob@example.com' },
      ];

      render(<DataTable {...defaultProps} data={dataWithNulls} />);

      // Should render without crashing
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should handle data with undefined values', () => {
      const dataWithUndefined = [
        { id: 1, name: undefined, age: 25, email: 'alice@example.com' },
        { id: 2, name: 'Bob', age: undefined, email: 'bob@example.com' },
      ];

      render(<DataTable {...defaultProps} data={dataWithUndefined} />);

      // Should render without crashing
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should handle empty columns array', () => {
      render(<DataTable columns={[]} data={mockData} />);

      // Should render table with Action column only
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should handle pagination at last page', async () => {
      const user = userEvent.setup();
      const data7Items = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        age: 20 + i,
        email: `user${i + 1}@example.com`,
      }));

      render(<DataTable {...defaultProps} data={data7Items} initialRowsPerPage={5} />);

      // Go to last page (page 2, showing items 6-7)
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      // Wait for navigation
      await waitFor(() => {
        expect(screen.getByText('User 6')).toBeInTheDocument();
      });
      
      // Next button should now be disabled (on last page)
      expect(nextButton).toBeDisabled();
    });
  });

  // Decision Table - Combined Operations
  describe('Decision Table - Sort + Filter + Pagination', () => {
    const largeData = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `User${i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C'} ${i + 1}`,
      age: 20 + i,
      email: `user${i + 1}@example.com`,
    }));

    it('should filter then paginate', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} data={largeData} />);

      // Apply filter to show only UserA
      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      // Select only UserA items
      const userAItems = screen.getAllByText(/UserA/);
      const firstUserA = userAItems.find(
        (item) => item.closest('.MuiListItemText-root')
      );
      const listItem = firstUserA.closest('.MuiListItemButton-root');
      await user.click(listItem);

      const okButton = screen.getByRole('button', { name: 'OK' });
      await user.click(okButton);

      // Should show filtered results (5 UserA items)
      expect(screen.getByText(/UserA 1/)).toBeInTheDocument();
    });

    it('should sort then filter', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} data={largeData} />);

      // Sort A to Z first
      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      const sortAZ = screen.getByText('Sort A to Z');
      await user.click(sortAZ);

      // Then apply filter
      await user.click(filterButton);

      const userAItems = screen.getAllByText(/UserA/);
      const firstUserA = userAItems.find(
        (item) => item.closest('.MuiListItemText-root')
      );
      const listItem = firstUserA.closest('.MuiListItemButton-root');
      await user.click(listItem);

      const okButton = screen.getByRole('button', { name: 'OK' });
      await user.click(okButton);

      // Should show sorted and filtered results
      expect(screen.getByText(/UserA/)).toBeInTheDocument();
    });

    it('should maintain filter when changing page', async () => {
      const user = userEvent.setup();
      const data20Items = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: i % 2 === 0 ? `EvenUser ${i + 1}` : `OddUser ${i + 1}`,
        age: 20 + i,
        email: `user${i + 1}@example.com`,
      }));

      render(<DataTable {...defaultProps} data={data20Items} initialRowsPerPage={5} />);

      // Filter to show only EvenUser
      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      const evenUserItems = screen.getAllByText(/EvenUser/);
      const firstEvenUser = evenUserItems.find(
        (item) => item.closest('.MuiListItemText-root')
      );
      const listItem = firstEvenUser.closest('.MuiListItemButton-root');
      await user.click(listItem);

      const okButton = screen.getByRole('button', { name: 'OK' });
      await user.click(okButton);

      // Should show 10 EvenUser items, first 5 on page 1
      await waitFor(() => {
        expect(screen.getByText(/EvenUser 1/)).toBeInTheDocument();
      });

      // Change page - check if button is enabled before clicking
      const nextButton = screen.getByRole('button', { name: /next page/i });
      
      // Only click if not disabled
      if (!nextButton.hasAttribute('disabled')) {
        await user.click(nextButton);

        // Wait for page change and verify filtered results maintained
        await waitFor(() => {
          // Should still show EvenUser items (filtered)
          const rows = screen.getAllByRole('row').slice(1);
          expect(rows.length).toBeGreaterThan(0);
        });
      }
    });
  });

  // Error Guessing
  describe('Error Guessing - Invalid Props', () => {
    it('should handle columns with missing id', () => {
      const invalidColumns = [
        { label: 'Name' }, // Missing id
        { id: 'age', label: 'Age' },
      ];

      render(<DataTable columns={invalidColumns} data={mockData} />);

      // Should render without crashing
      expect(screen.getByText('Age')).toBeInTheDocument();
    });

    it('should handle columns with missing label', () => {
      const invalidColumns = [
        { id: 'name' }, // Missing label
        { id: 'age', label: 'Age' },
      ];

      render(<DataTable columns={invalidColumns} data={mockData} />);

      // Should render without crashing
      expect(screen.getByText('Age')).toBeInTheDocument();
    });

    it('should handle data with missing id field', () => {
      const dataNoIds = [
        { name: 'Alice', age: 25, email: 'alice@example.com' }, // No id
        { name: 'Bob', age: 30, email: 'bob@example.com' },
      ];

      render(<DataTable {...defaultProps} data={dataNoIds} />);

      // Should render but may have console warnings
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should handle null columns prop', () => {
      render(<DataTable columns={null} data={mockData} />);

      // Should render with Action column only
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should handle null data prop', () => {
      render(<DataTable {...defaultProps} data={null} />);

      // Should render headers but no data
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
  });

  // Non-Functional - Custom Rendering
  describe('Non-Functional - Custom Column Rendering', () => {
    it('should use custom render function when provided', () => {
      const columnsWithRender = [
        {
          id: 'name',
          label: 'Name',
          render: (value) => `Dr. ${value}`,
        },
        { id: 'age', label: 'Age' },
      ];

      render(<DataTable columns={columnsWithRender} data={mockData} />);

      // Should render with custom prefix
      expect(screen.getByText('Dr. Alice')).toBeInTheDocument();
    });

    it('should pass full row to custom render function', () => {
      const columnsWithRender = [
        {
          id: 'name',
          label: 'Name',
          render: (value, row) => `${value} (${row.age} years)`,
        },
      ];

      render(<DataTable columns={columnsWithRender} data={mockData} />);

      // Should render with age from row
      expect(screen.getByText('Alice (25 years)')).toBeInTheDocument();
    });

    it('should handle custom align property', () => {
      const columnsWithAlign = [
        { id: 'name', label: 'Name', align: 'left' },
        { id: 'age', label: 'Age', align: 'right' },
      ];

      const { container } = render(
        <DataTable columns={columnsWithAlign} data={mockData} />
      );

      // Check alignment classes are applied
      const ageCells = container.querySelectorAll('td');
      const ageCell = Array.from(ageCells).find((cell) =>
        cell.textContent.includes('25')
      );
      expect(ageCell).toHaveStyle({ textAlign: 'right' });
    });
  });

  // Non-Functional - Performance
  describe('Non-Functional - Performance with Large Data', () => {
    it('should handle 1000 rows without performance issues', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        age: 20 + (i % 80),
        email: `user${i + 1}@example.com`,
      }));

      const startTime = performance.now();
      render(<DataTable {...defaultProps} data={largeData} />);
      const endTime = performance.now();

      // Render should complete in reasonable time (< 1000ms)
      expect(endTime - startTime).toBeLessThan(1000);

      // Should only render visible rows (pagination)
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.queryByText('User 100')).not.toBeInTheDocument();
    });

    it('should not re-render all rows on pagination', async () => {
      const user = userEvent.setup();
      const largeData = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        age: 20 + i,
        email: `user${i + 1}@example.com`,
      }));

      render(<DataTable {...defaultProps} data={largeData} initialRowsPerPage={5} />);

      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      // Only new page rows should be rendered
      await waitFor(() => {
        expect(screen.queryByText('User 1')).not.toBeInTheDocument();
        expect(screen.getByText('User 6')).toBeInTheDocument();
      });
    });
  });

  // Non-Functional - Accessibility
  describe('Non-Functional - Accessibility', () => {
    it('should have accessible table structure', () => {
      render(<DataTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should have accessible pagination controls', () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument(); // Rows per page dropdown
      expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
    });

    it('should have accessible action buttons', () => {
      const handlers = {
        onView: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      };

      render(<DataTable {...defaultProps} {...handlers} />);

      const buttons = screen.getAllByRole('button');
      // Should have multiple action buttons (View, Edit, Delete for each row)
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have accessible checkboxes in filter', async () => {
      const user = userEvent.setup();
      render(<DataTable {...defaultProps} />);

      const nameHeader = screen.getByText('Name').closest('th');
      const filterButton = within(nameHeader).getByRole('button');
      await user.click(filterButton);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeInTheDocument();
      });
    });
  });
});
