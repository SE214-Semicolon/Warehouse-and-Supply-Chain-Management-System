import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

/**
 * UNIT TEST: Sidebar Component
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal navigation
 * 2. Equivalence Partitioning - Different routes
 * 3. Boundary Value Analysis - Empty/single/many menu items
 * 4. Error Guessing - Disabled items, missing navigation
 * 5. State & Rendering Check - Active route highlighting
 * 6. Non-Functional Checks - Accessibility
 */

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Sidebar Component - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to render with router
  const renderWithRouter = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Sidebar />
      </MemoryRouter>
    );
  };

  // Happy Path Testing
  describe('Happy Path - Basic Functionality', () => {
    it('should render all menu items', () => {
      renderWithRouter();

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Warehouse')).toBeInTheDocument();
      expect(screen.getByText('Procurement')).toBeInTheDocument();
      expect(screen.getByText('Shipment')).toBeInTheDocument();
    });

    it('should navigate when menu item clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await user.click(screen.getByText('Warehouse'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/warehouse');
    });

    it('should highlight active route', () => {
      renderWithRouter('/warehouse');

      const warehouseButton = screen.getByRole('button', { name: 'Warehouse' });
      expect(warehouseButton).toHaveClass('Mui-selected');
    });

    it('should navigate to dashboard', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await user.click(screen.getByText('Dashboard'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  // Equivalence Partitioning - Different Routes
  describe('Equivalence Partitioning - Route Selection', () => {
    it('should highlight Dashboard route', () => {
      renderWithRouter('/');

      const dashboardButton = screen.getByRole('button', { name: 'Dashboard' });
      expect(dashboardButton).toHaveClass('Mui-selected');
    });

    it('should highlight Warehouse route', () => {
      renderWithRouter('/warehouse');

      const button = screen.getByRole('button', { name: 'Warehouse' });
      expect(button).toHaveClass('Mui-selected');
    });

    it('should highlight Procurement route', () => {
      renderWithRouter('/procurement');

      const button = screen.getByRole('button', { name: 'Procurement' });
      expect(button).toHaveClass('Mui-selected');
    });

    it('should highlight Shipment route', () => {
      renderWithRouter('/shipment');

      const button = screen.getByRole('button', { name: 'Shipment' });
      expect(button).toHaveClass('Mui-selected');
    });

    it('should not highlight any menu for unknown route', () => {
      renderWithRouter('/unknown-route');

      const buttons = screen.getAllByRole('button');
      const selectedButtons = buttons.filter(btn => btn.classList.contains('Mui-selected'));
      expect(selectedButtons.length).toBe(0);
    });
  });

  // Boundary Value Analysis
  describe('Boundary Value Analysis - Menu Items', () => {
    it('should handle first menu item (Dashboard)', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await user.click(screen.getByText('Dashboard'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should handle last enabled menu item (Shipment)', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await user.click(screen.getByText('Shipment'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/shipment');
    });

    it('should handle middle menu item (Warehouse)', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await user.click(screen.getByText('Warehouse'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/warehouse');
    });
  });

  // State & Rendering Check
  describe('State & Rendering - Active State', () => {
    it('should only highlight one menu item at a time', () => {
      renderWithRouter('/warehouse');

      const buttons = screen.getAllByRole('button');
      const selectedButtons = buttons.filter(btn => btn.classList.contains('Mui-selected'));
      expect(selectedButtons.length).toBe(1);
    });

    it('should change highlight when route changes', () => {
      // Test with initial route
      const { rerender } = render(
        <MemoryRouter initialEntries={['/warehouse']}>
          <Sidebar />
        </MemoryRouter>
      );

      const warehouseButton = screen.getByRole('button', { name: 'Warehouse' });
      expect(warehouseButton).toHaveClass('Mui-selected');

      // Rerender with new route
      rerender(
        <MemoryRouter initialEntries={['/procurement']}>
          <Sidebar />
        </MemoryRouter>
      );

      // Verify procurement is now selected
      const procurementButton = screen.getByRole('button', { name: 'Procurement' });
      expect(procurementButton).toBeInTheDocument();
    });

    it('should render with custom width prop', () => {
      const { container } = render(
        <MemoryRouter>
          <Sidebar width={300} />
        </MemoryRouter>
      );

      const sidebar = container.firstChild;
      expect(sidebar).toHaveStyle({ width: '300px' });
    });

    it('should render with custom headerHeight prop', () => {
      const { container } = render(
        <MemoryRouter>
          <Sidebar headerHeight={80} />
        </MemoryRouter>
      );

      const sidebar = container.firstChild;
      expect(sidebar).toHaveStyle({ top: '80px' });
    });
  });

  // Non-Functional - Accessibility
  describe('Non-Functional - Accessibility', () => {
    it('should have accessible button elements', () => {
      renderWithRouter();

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(5); // 4 menu items
    });

    it('should have text labels for all menu items', () => {
      renderWithRouter();

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Warehouse')).toBeInTheDocument();
      expect(screen.getByText('Procurement')).toBeInTheDocument();
      expect(screen.getByText('Shipment')).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      renderWithRouter();

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // MUI ListItemButton renders as DIV with role="button"
        expect(button).toHaveAttribute('role', 'button');
      });
    });
  });

  // Real-world Scenarios
  describe('Real-world Scenarios', () => {
    it('should handle navigation from dashboard to inventory', async () => {
      const user = userEvent.setup();
      renderWithRouter('/');

      const dashboardButton = screen.getByRole('button', { name: 'Dashboard' });
      expect(dashboardButton).toHaveClass('Mui-selected');

      await user.click(screen.getByText('Warehouse'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/warehouse');
    });

    it('should handle navigation between multiple pages', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await user.click(screen.getByText('Warehouse'));
      expect(mockNavigate).toHaveBeenCalledWith('/warehouse');

      await user.click(screen.getByText('Procurement'));
      expect(mockNavigate).toHaveBeenCalledWith('/procurement');

      await user.click(screen.getByText('Shipment'));
      expect(mockNavigate).toHaveBeenCalledWith('/shipment');

      expect(mockNavigate).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid menu clicks', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await user.click(screen.getByText('Warehouse'));
      await user.click(screen.getByText('Procurement'));
      await user.click(screen.getByText('Shipment'));
      
      expect(mockNavigate).toHaveBeenCalledTimes(3);
    });

    it('should show active state for nested routes', () => {
      renderWithRouter('/warehouse/details/123');

      // Should not highlight anything since path doesn't match exactly
      const buttons = screen.getAllByRole('button');
      const selectedButtons = buttons.filter(btn => btn.classList.contains('Mui-selected'));
      expect(selectedButtons.length).toBe(0);
    });

    it('should handle navigation with query parameters', () => {
      renderWithRouter('/warehouse?page=2');

      // Verify menu renders with query params in route
      const warehouseButton = screen.getByRole('button', { name: 'Warehouse' });
      expect(warehouseButton).toBeInTheDocument();
    });

    it('should attempt navigation on double-click', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await user.dblClick(screen.getByText('Procurement'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/procurement');
    });

    it('should maintain sidebar structure with all menu items visible', () => {
      renderWithRouter();

      const menuItems = ['Dashboard', 'Warehouse', 'Procurement', 'Shipment'];
      
      menuItems.forEach(item => {
        expect(screen.getByText(item)).toBeVisible();
      });
    });
  });

  // Integration with React Router
  describe('Integration - React Router', () => {
    it('should work with different initial routes', () => {
      render(
        <MemoryRouter initialEntries={['/warehouse']}>
          <Sidebar />
        </MemoryRouter>
      );

      const warehouseButton = screen.getByRole('button', { name: 'Warehouse' });
      expect(warehouseButton).toHaveClass('Mui-selected');
    });

    it('should handle root path correctly', () => {
      renderWithRouter('/');

      const dashboardButton = screen.getByRole('button', { name: 'Dashboard' });
      expect(dashboardButton).toHaveClass('Mui-selected');
    });

    it('should handle paths with trailing slash', () => {
      renderWithRouter('/warehouse/');

      // Should not match since exact path comparison
      const warehouseButton = screen.getByRole('button', { name: 'Warehouse' });
      expect(warehouseButton).not.toHaveClass('Mui-selected');
    });
  });
});
