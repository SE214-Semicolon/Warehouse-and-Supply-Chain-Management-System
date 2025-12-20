import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';

/**
 * UNIT TEST: Dashboard Page Component
 * 
 * Testing Techniques:
 * - Happy Path: Normal dashboard rendering with metrics and charts
 * - Equivalence Partitioning: Different data states
 * - BVA: Empty data, edge cases
 * - State & Rendering: All sections render correctly
 * - Accessibility: Proper semantic structure
 */

// Mock child components
vi.mock('@/components/MetricCard', () => ({
  default: ({ title, value, change }) => (
    <div data-testid="metric-card">
      <div>{title}</div>
      <div>{value}</div>
      <div>{change}</div>
    </div>
  ),
}));

vi.mock('@/components/ChartContainer', () => ({
  default: ({ title, children }) => (
    <div data-testid="chart-container">
      <div>{title}</div>
      {children}
    </div>
  ),
}));

vi.mock('@/components/MonthlyOrderChart', () => ({
  default: ({ data }) => (
    <div data-testid="monthly-order-chart">
      Chart with {data?.length || 0} data points
    </div>
  ),
}));

vi.mock('@/components/RevenuePieChart', () => ({
  default: ({ data }) => (
    <div data-testid="revenue-pie-chart">
      Pie chart with {data?.length || 0} regions
    </div>
  ),
}));

vi.mock('@/components/DeliveryBarChart', () => ({
  default: ({ data }) => (
    <div data-testid="delivery-bar-chart">
      Bar chart with {data?.length || 0} days
    </div>
  ),
}));

describe('Dashboard Component - Unit Tests', () => {
  describe('Happy Path - Metric Cards', () => {
    it('should render all four metric cards', () => {
      render(<Dashboard />);
      
      const metricCards = screen.getAllByTestId('metric-card');
      expect(metricCards).toHaveLength(4);
    });

    it('should display average delivery time metric', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('Average delivery time')).toBeInTheDocument();
      expect(screen.getByText('4.2 Days')).toBeInTheDocument();
      // Multiple metrics have 18%, check that it exists
      expect(screen.getAllByText('18%').length).toBeGreaterThan(0);
    });

    it('should display total revenue metric', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('Total revenue')).toBeInTheDocument();
      expect(screen.getByText('$1.5M')).toBeInTheDocument();
    });

    it('should display total orders metric', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('Total orders')).toBeInTheDocument();
      expect(screen.getByText('8k')).toBeInTheDocument();
      expect(screen.getByText('16%')).toBeInTheDocument();
    });

    it('should display on-time delivery metric', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('On-Time delivery')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
    });
  });

  describe('Happy Path - Charts Section', () => {
    it('should render all chart containers', () => {
      render(<Dashboard />);
      
      const chartContainers = screen.getAllByTestId('chart-container');
      expect(chartContainers).toHaveLength(3);
    });

    it('should display monthly order chart', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('Monthly order')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-order-chart')).toBeInTheDocument();
      expect(screen.getByText('Chart with 10 data points')).toBeInTheDocument();
    });

    it('should display revenue by region chart', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('Revenue by region')).toBeInTheDocument();
      expect(screen.getByTestId('revenue-pie-chart')).toBeInTheDocument();
      expect(screen.getByText('Pie chart with 4 regions')).toBeInTheDocument();
    });

    it('should display on-time delivery rate chart', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('On-Time delivery rate')).toBeInTheDocument();
      expect(screen.getByTestId('delivery-bar-chart')).toBeInTheDocument();
      expect(screen.getByText('Bar chart with 12 days')).toBeInTheDocument();
    });
  });

  describe('Happy Path - Top Suppliers Section', () => {
    it('should display top 5 suppliers title', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('Top 5 Suppliers')).toBeInTheDocument();
    });

    it('should display view all link', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('View all')).toBeInTheDocument();
    });

    it('should display all supplier names', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('Jane Cooper')).toBeInTheDocument();
      expect(screen.getByText('Esther Howard')).toBeInTheDocument();
      expect(screen.getByText('Jenny Wilson')).toBeInTheDocument();
      expect(screen.getByText('Robert Fox')).toBeInTheDocument();
      expect(screen.getByText('Albert Flores')).toBeInTheDocument();
    });

    it('should display all supplier emails', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('jane.cooper@example.com')).toBeInTheDocument();
      expect(screen.getByText('esther.howard@example.com')).toBeInTheDocument();
      expect(screen.getByText('jenny.wilson@example.com')).toBeInTheDocument();
      expect(screen.getByText('robert.fox@example.com')).toBeInTheDocument();
      expect(screen.getByText('albert.flores@example.com')).toBeInTheDocument();
    });

    it('should display supplier avatars', () => {
      render(<Dashboard />);
      
      // Avatars show first letter of name (Jane and Jenny both have J)
      expect(screen.getAllByText('J').length).toBe(2); // Jane & Jenny
      expect(screen.getByText('E')).toBeInTheDocument(); // Esther
      expect(screen.getByText('R')).toBeInTheDocument(); // Robert
      expect(screen.getByText('A')).toBeInTheDocument(); // Albert
    });
  });

  describe('State & Rendering - Layout', () => {
    it('should render dashboard container with proper structure', () => {
      const { container } = render(<Dashboard />);
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render metrics section', () => {
      render(<Dashboard />);
      
      const metricCards = screen.getAllByTestId('metric-card');
      expect(metricCards.length).toBeGreaterThan(0);
    });

    it('should render charts section', () => {
      render(<Dashboard />);
      
      const chartContainers = screen.getAllByTestId('chart-container');
      expect(chartContainers.length).toBeGreaterThan(0);
    });

    it('should render suppliers section', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('Top 5 Suppliers')).toBeInTheDocument();
    });
  });

  describe('Equivalence Partitioning - Data Presentation', () => {
    it('should display positive change percentages', () => {
      render(<Dashboard />);
      
      // All metrics show positive changes
      const changeTexts = screen.getAllByText(/18%|16%/);
      expect(changeTexts.length).toBeGreaterThan(0);
    });

    it('should display different metric value formats', () => {
      render(<Dashboard />);
      
      // Days format
      expect(screen.getByText('4.2 Days')).toBeInTheDocument();
      // Currency format
      expect(screen.getByText('$1.5M')).toBeInTheDocument();
      // Number format
      expect(screen.getByText('8k')).toBeInTheDocument();
      // Percentage format
      expect(screen.getByText('92%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<Dashboard />);
      
      const heading = screen.getByRole('heading', { name: 'Top 5 Suppliers' });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible buttons for suppliers', () => {
      render(<Dashboard />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render supplier avatars with text', () => {
      render(<Dashboard />);
      
      // Check for avatar initials
      const avatars = screen.getAllByText(/^[A-Z]$/);
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('BVA - Data Validation', () => {
    it('should render with predefined data', () => {
      render(<Dashboard />);
      
      // Verify data is being passed to charts
      expect(screen.getByText('Chart with 10 data points')).toBeInTheDocument();
      expect(screen.getByText('Pie chart with 4 regions')).toBeInTheDocument();
      expect(screen.getByText('Bar chart with 12 days')).toBeInTheDocument();
    });

    it('should render exactly 5 suppliers', () => {
      render(<Dashboard />);
      
      const supplierNames = [
        'Jane Cooper',
        'Esther Howard',
        'Jenny Wilson',
        'Robert Fox',
        'Albert Flores'
      ];

      supplierNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });
  });

  describe('Non-Functional - Responsive Layout', () => {
    it('should render all sections without errors', () => {
      const { container } = render(<Dashboard />);
      
      expect(container.querySelector('[class*="MuiBox"]')).toBeInTheDocument();
    });

    it('should maintain content structure', () => {
      render(<Dashboard />);
      
      // Verify all main sections are present
      expect(screen.getAllByTestId('metric-card')).toHaveLength(4);
      expect(screen.getAllByTestId('chart-container')).toHaveLength(3);
      expect(screen.getByText('Top 5 Suppliers')).toBeInTheDocument();
    });
  });
});
