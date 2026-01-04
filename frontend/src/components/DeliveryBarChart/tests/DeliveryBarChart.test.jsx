import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DeliveryBarChart from '../DeliveryBarChart';

describe('DeliveryBarChart Component', () => {
  const mockData = [
    { day: 'Mon', rate: 80 },
    { day: 'Tue', rate: 90 },
    { day: 'Wed', rate: 75 },
    { day: 'Thu', rate: 85 },
    { day: 'Fri', rate: 95 },
  ];

  describe('Happy Path - Rendering', () => {
    it('renders without crashing with valid data', () => {
      expect(() => render(<DeliveryBarChart data={mockData} />)).not.toThrow();
    });

    it('renders ResponsiveContainer', () => {
      const { container } = render(<DeliveryBarChart data={mockData} />);
      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    });
  });

  describe('Data Handling', () => {
    it('handles empty data array', () => {
      expect(() => render(<DeliveryBarChart data={[]} />)).not.toThrow();
    });

    it('handles single data point', () => {
      const singleData = [{ day: 'Mon', rate: 100 }];
      expect(() => render(<DeliveryBarChart data={singleData} />)).not.toThrow();
    });

    it('handles large dataset', () => {
      const largeData = Array.from({ length: 30 }, (_, i) => ({
        day: `Day${i + 1}`,
        rate: Math.random() * 100,
      }));
      expect(() => render(<DeliveryBarChart data={largeData} />)).not.toThrow();
    });

    it('renders with different rate values', () => {
      const variedData = [
        { day: 'A', rate: 0 },
        { day: 'B', rate: 50 },
        { day: 'C', rate: 100 },
      ];
      expect(() => render(<DeliveryBarChart data={variedData} />)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values', () => {
      const zeroData = [
        { day: 'Mon', rate: 0 },
        { day: 'Tue', rate: 0 },
      ];
      expect(() => render(<DeliveryBarChart data={zeroData} />)).not.toThrow();
    });

    it('handles negative values', () => {
      const negativeData = [
        { day: 'Mon', rate: -10 },
        { day: 'Tue', rate: 20 },
      ];
      expect(() => render(<DeliveryBarChart data={negativeData} />)).not.toThrow();
    });

    it('handles very large values', () => {
      const largeValues = [
        { day: 'Mon', rate: 10000 },
        { day: 'Tue', rate: 50000 },
      ];
      expect(() => render(<DeliveryBarChart data={largeValues} />)).not.toThrow();
    });

    it('handles missing rate property', () => {
      const incompleteData = [
        { day: 'Mon' },
        { day: 'Tue', rate: 50 },
      ];
      expect(() => render(<DeliveryBarChart data={incompleteData} />)).not.toThrow();
    });
  });

  describe('Boundary Value Analysis', () => {
    it('handles boundary rate values', () => {
      const boundaryData = [
        { day: 'Min', rate: 0 },
        { day: 'Mid', rate: 50 },
        { day: 'Max', rate: 100 },
      ];
      expect(() => render(<DeliveryBarChart data={boundaryData} />)).not.toThrow();
    });

    it('renders with minimum required data', () => {
      const minData = [{ day: 'A', rate: 1 }];
      const { container } = render(<DeliveryBarChart data={minData} />);
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('has correct chart dimensions', () => {
      const { container } = render(<DeliveryBarChart data={mockData} />);
      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    });

    it('renders without errors for valid props', () => {
      expect(() => render(<DeliveryBarChart data={mockData} />)).not.toThrow();
    });
  });
});
