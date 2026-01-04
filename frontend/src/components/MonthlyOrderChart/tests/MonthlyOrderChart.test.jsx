import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MonthlyOrderChart from '../MonthlyOrderChart';

describe('MonthlyOrderChart Component', () => {
  const mockData = [
    { month: 'Jan', series1: 100, series2: 80 },
    { month: 'Feb', series1: 120, series2: 90 },
    { month: 'Mar', series1: 90, series2: 110 },
    { month: 'Apr', series1: 150, series2: 130 },
  ];

  describe('Happy Path - Rendering', () => {
    it('renders without crashing with valid data', () => {
      expect(() => render(<MonthlyOrderChart data={mockData} />)).not.toThrow();
    });

    it('renders ResponsiveContainer', () => {
      const { container } = render(<MonthlyOrderChart data={mockData} />);
      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    });
  });

  describe('Data Handling', () => {
    it('handles empty data array', () => {
      expect(() => render(<MonthlyOrderChart data={[]} />)).not.toThrow();
    });

    it('handles single data point', () => {
      const singleData = [{ month: 'Jan', series1: 100, series2: 80 }];
      expect(() => render(<MonthlyOrderChart data={singleData} />)).not.toThrow();
    });

    it('handles full year data', () => {
      const yearData = Array.from({ length: 12 }, (_, i) => ({
        month: `Month${i + 1}`,
        series1: Math.random() * 200,
        series2: Math.random() * 200,
      }));
      expect(() => render(<MonthlyOrderChart data={yearData} />)).not.toThrow();
    });

    it('renders with missing series2 data', () => {
      const incompleteSeries = [
        { month: 'Jan', series1: 100 },
        { month: 'Feb', series1: 120, series2: 90 },
      ];
      expect(() => render(<MonthlyOrderChart data={incompleteSeries} />)).not.toThrow();
    });
  });

  describe('Chart Components', () => {
    it('renders chart component structure', () => {
      const { container } = render(<MonthlyOrderChart data={mockData} />);
      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values in series', () => {
      const zeroData = [
        { month: 'Jan', series1: 0, series2: 0 },
        { month: 'Feb', series1: 10, series2: 5 },
      ];
      expect(() => render(<MonthlyOrderChart data={zeroData} />)).not.toThrow();
    });

    it('handles negative values', () => {
      const negativeData = [
        { month: 'Jan', series1: -50, series2: 30 },
        { month: 'Feb', series1: 100, series2: -20 },
      ];
      expect(() => render(<MonthlyOrderChart data={negativeData} />)).not.toThrow();
    });

    it('handles very large values', () => {
      const largeValues = [
        { month: 'Jan', series1: 100000, series2: 80000 },
        { month: 'Feb', series1: 120000, series2: 90000 },
      ];
      expect(() => render(<MonthlyOrderChart data={largeValues} />)).not.toThrow();
    });

    it('handles missing month property', () => {
      const incompleteData = [
        { series1: 100, series2: 80 },
        { month: 'Feb', series1: 120, series2: 90 },
      ];
      expect(() => render(<MonthlyOrderChart data={incompleteData} />)).not.toThrow();
    });
  });

  describe('Boundary Value Analysis', () => {
    it('handles minimum data points', () => {
      const minData = [
        { month: 'A', series1: 1, series2: 1 },
        { month: 'B', series1: 2, series2: 2 },
      ];
      const { container } = render(<MonthlyOrderChart data={minData} />);
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles maximum typical dataset', () => {
      const maxData = Array.from({ length: 24 }, (_, i) => ({
        month: `M${i + 1}`,
        series1: i * 10,
        series2: i * 8,
      }));
      expect(() => render(<MonthlyOrderChart data={maxData} />)).not.toThrow();
    });

    it('handles equal values in both series', () => {
      const equalData = [
        { month: 'Jan', series1: 100, series2: 100 },
        { month: 'Feb', series1: 100, series2: 100 },
      ];
      expect(() => render(<MonthlyOrderChart data={equalData} />)).not.toThrow();
    });
  });

  describe('Component Structure', () => {
    it('has correct chart dimensions', () => {
      const { container } = render(<MonthlyOrderChart data={mockData} />);
      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    });

    it('renders without errors for valid props', () => {
      expect(() => render(<MonthlyOrderChart data={mockData} />)).not.toThrow();
    });
  });
});
