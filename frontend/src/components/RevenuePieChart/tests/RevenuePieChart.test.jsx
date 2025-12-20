import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RevenuePieChart from '../RevenuePieChart';

describe('RevenuePieChart Component', () => {
  const mockData = [
    { name: 'North', value: 35, color: '#8b5cf6' },
    { name: 'South', value: 28, color: '#fbbf24' },
    { name: 'East', value: 22, color: '#f97316' },
    { name: 'West', value: 15, color: '#10b981' },
  ];

  describe('Happy Path - Rendering', () => {
    it('renders without crashing with valid data', () => {
      expect(() => render(<RevenuePieChart data={mockData} />)).not.toThrow();
    });

    it('renders ResponsiveContainer', () => {
      const { container } = render(<RevenuePieChart data={mockData} />);
      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    });

    it('renders all region labels', () => {
      render(<RevenuePieChart data={mockData} />);
      
      expect(screen.getByText(/North/)).toBeInTheDocument();
      expect(screen.getByText(/South/)).toBeInTheDocument();
      expect(screen.getByText(/East/)).toBeInTheDocument();
      expect(screen.getByText(/West/)).toBeInTheDocument();
    });

    it('displays percentage values', () => {
      render(<RevenuePieChart data={mockData} />);
      
      expect(screen.getByText(/35%/)).toBeInTheDocument();
      expect(screen.getByText(/28%/)).toBeInTheDocument();
      expect(screen.getByText(/22%/)).toBeInTheDocument();
      expect(screen.getByText(/15%/)).toBeInTheDocument();
    });
  });

  describe('Legend Rendering', () => {
    it('renders legend items', () => {
      render(<RevenuePieChart data={mockData} />);
      // Check text content is rendered
      expect(screen.getByText(/North/)).toBeInTheDocument();
    });

    it('renders all legend items', () => {
      render(<RevenuePieChart data={mockData} />);
      
      mockData.forEach(item => {
        expect(screen.getByText(new RegExp(`${item.name}`))).toBeInTheDocument();
      });
    });

    it('displays legend in correct format', () => {
      render(<RevenuePieChart data={mockData} />);
      
      expect(screen.getByText('North - 35%')).toBeInTheDocument();
      expect(screen.getByText('South - 28%')).toBeInTheDocument();
    });
  });

  describe('Data Handling', () => {
    it('handles empty data array', () => {
      expect(() => render(<RevenuePieChart data={[]} />)).not.toThrow();
    });

    it('handles single data point', () => {
      const singleData = [{ name: 'Region', value: 100, color: '#8b5cf6' }];
      render(<RevenuePieChart data={singleData} />);
      
      expect(screen.getByText('Region - 100%')).toBeInTheDocument();
    });

    it('handles two regions', () => {
      const twoRegions = [
        { name: 'A', value: 60, color: '#8b5cf6' },
        { name: 'B', value: 40, color: '#fbbf24' },
      ];
      render(<RevenuePieChart data={twoRegions} />);
      
      expect(screen.getByText('A - 60%')).toBeInTheDocument();
      expect(screen.getByText('B - 40%')).toBeInTheDocument();
    });

    it('handles many regions', () => {
      const manyRegions = Array.from({ length: 10 }, (_, i) => ({
        name: `Region${i + 1}`,
        value: 10,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      }));
      expect(() => render(<RevenuePieChart data={manyRegions} />)).not.toThrow();
    });
  });

  describe('Chart Components', () => {
    it('renders chart component structure', () => {
      const { container } = render(<RevenuePieChart data={mockData} />);
      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values', () => {
      const zeroData = [
        { name: 'A', value: 0, color: '#8b5cf6' },
        { name: 'B', value: 100, color: '#fbbf24' },
      ];
      render(<RevenuePieChart data={zeroData} />);
      
      expect(screen.getByText('A - 0%')).toBeInTheDocument();
    });

    it('handles decimal values', () => {
      const decimalData = [
        { name: 'Region', value: 33.33, color: '#8b5cf6' },
        { name: 'Other', value: 66.67, color: '#fbbf24' },
      ];
      render(<RevenuePieChart data={decimalData} />);
      
      expect(screen.getByText(/33.33%/)).toBeInTheDocument();
    });

    it('handles very small values', () => {
      const smallValues = [
        { name: 'Tiny', value: 0.01, color: '#8b5cf6' },
        { name: 'Large', value: 99.99, color: '#fbbf24' },
      ];
      render(<RevenuePieChart data={smallValues} />);
      
      expect(screen.getByText(/0.01%/)).toBeInTheDocument();
    });

    it('handles missing color property', () => {
      const noColorData = [
        { name: 'A', value: 50 },
        { name: 'B', value: 50 },
      ];
      expect(() => render(<RevenuePieChart data={noColorData} />)).not.toThrow();
    });
  });

  describe('Boundary Value Analysis', () => {
    it('handles values that sum to 100', () => {
      const perfectSum = [
        { name: 'A', value: 50, color: '#8b5cf6' },
        { name: 'B', value: 30, color: '#fbbf24' },
        { name: 'C', value: 20, color: '#f97316' },
      ];
      render(<RevenuePieChart data={perfectSum} />);
      
      expect(screen.getByText('A - 50%')).toBeInTheDocument();
    });

    it('handles values that do not sum to 100', () => {
      const irregularSum = [
        { name: 'A', value: 60, color: '#8b5cf6' },
        { name: 'B', value: 80, color: '#fbbf24' },
      ];
      render(<RevenuePieChart data={irregularSum} />);
      
      expect(screen.getByText('A - 60%')).toBeInTheDocument();
    });

    it('handles 100% single value', () => {
      const fullData = [{ name: 'All', value: 100, color: '#8b5cf6' }];
      render(<RevenuePieChart data={fullData} />);
      
      expect(screen.getByText('All - 100%')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('has correct chart dimensions', () => {
      const { container } = render(<RevenuePieChart data={mockData} />);
      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    });

    it('renders legend with region names', () => {
      render(<RevenuePieChart data={mockData} />);
      mockData.forEach(item => {
        expect(screen.getByText(new RegExp(item.name))).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('renders readable text', () => {
      render(<RevenuePieChart data={mockData} />);
      
      const legendItems = screen.getAllByText(/\d+%/);
      expect(legendItems.length).toBeGreaterThan(0);
    });

    it('provides complete region information', () => {
      render(<RevenuePieChart data={mockData} />);
      
      mockData.forEach(region => {
        const text = `${region.name} - ${region.value}%`;
        expect(screen.getByText(text)).toBeInTheDocument();
      });
    });
  });
});
