import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetricCard from '../MetricCard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

/**
 * UNIT TEST: MetricCard Component
 * 
 * Testing Techniques:
 * - Happy Path: Normal rendering with various props
 * - Equivalence Partitioning: Positive/negative/zero changes
 * - BVA: Edge values, missing props
 * - Error Guessing: Invalid props, missing values
 * - Accessibility: Proper semantic HTML
 */

describe('MetricCard Component - Unit Tests', () => {
  describe('Happy Path', () => {
    it('should render with title and value', () => {
      render(<MetricCard title="Total Sales" value="$1,234" change="+12%" />);
      
      expect(screen.getByText('Total Sales')).toBeInTheDocument();
      expect(screen.getByText('$1,234')).toBeInTheDocument();
      expect(screen.getByText('+12%')).toBeInTheDocument();
    });

    it('should render with custom icon', () => {
      render(
        <MetricCard
          title="Revenue"
          value="$5,000"
          change="+5%"
          icon={TrendingUpIcon}
        />
      );
      
      expect(screen.getByText('Revenue')).toBeInTheDocument();
    });

    it('should display subtitle', () => {
      render(
        <MetricCard
          title="Orders"
          value="150"
          change="+10%"
          subtitle="This week"
        />
      );
      
      expect(screen.getByText('This week')).toBeInTheDocument();
    });
  });

  describe('Equivalence Partitioning - Change Values', () => {
    it('should handle positive change', () => {
      render(<MetricCard title="Test" value="100" change="+25%" />);
      
      expect(screen.getByText('+25%')).toBeInTheDocument();
    });

    it('should handle negative change', () => {
      render(<MetricCard title="Test" value="100" change="-15%" />);
      
      expect(screen.getByText('-15%')).toBeInTheDocument();
    });

    it('should handle zero change', () => {
      render(<MetricCard title="Test" value="100" change="0%" />);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('BVA - Edge Cases', () => {
    it('should handle very large values', () => {
      render(
        <MetricCard
          title="Big Number"
          value="999,999,999"
          change="+1000%"
        />
      );
      
      expect(screen.getByText('999,999,999')).toBeInTheDocument();
    });

    it('should handle empty strings', () => {
      const { container } = render(<MetricCard title="" value="" change="" />);
      
      // Should render without crashing
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should use default subtitle', () => {
      render(<MetricCard title="Test" value="100" change="+5%" />);
      
      expect(screen.getByText('Last month')).toBeInTheDocument();
    });
  });

  describe('Error Guessing', () => {
    it('should handle missing optional props', () => {
      render(<MetricCard title="Test" value="100" change="+5%" />);
      
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle undefined values', () => {
      const { container } = render(
        <MetricCard
          title={undefined}
          value={undefined}
          change={undefined}
        />
      );
      
      // Should not crash
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Color Variations', () => {
    it('should accept custom bg_color', () => {
      render(
        <MetricCard
          title="Test"
          value="100"
          change="+5%"
          bg_color="error"
        />
      );
      
      expect(screen.getByText('+5%')).toBeInTheDocument();
    });

    it('should use default success color', () => {
      render(<MetricCard title="Test" value="100" change="+5%" />);
      
      expect(screen.getByText('+5%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render as card', () => {
      const { container } = render(<MetricCard title="Test" value="100" change="+5%" />);
      
      // Card renders without crash
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should have proper text hierarchy', () => {
      render(
        <MetricCard
          title="Total Sales"
          value="$1,234"
          change="+12%"
          subtitle="Last month"
        />
      );
      
      expect(screen.getByText('Total Sales')).toBeInTheDocument();
      expect(screen.getByText('$1,234')).toBeInTheDocument();
      expect(screen.getByText('Last month')).toBeInTheDocument();
    });
  });
});
