import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartContainer from '../ChartContainer';

describe('ChartContainer Component', () => {
  describe('Happy Path - Rendering', () => {
    it('renders with title and children', () => {
      render(
        <ChartContainer title="Test Chart">
          <div>Chart Content</div>
        </ChartContainer>
      );

      expect(screen.getByText('Test Chart')).toBeInTheDocument();
      expect(screen.getByText('Chart Content')).toBeInTheDocument();
    });

    it('renders with dropdown by default', () => {
      render(
        <ChartContainer title="Sales Chart" dropdown="Jun 2024">
          <div>Content</div>
        </ChartContainer>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Jun 2024')).toBeInTheDocument();
    });

    it('hides dropdown when showDropdown is false', () => {
      render(
        <ChartContainer title="Report" showDropdown={false}>
          <div>Content</div>
        </ChartContainer>
      );

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  describe('Props Variations', () => {
    it('renders with custom dropdown value', () => {
      render(
        <ChartContainer title="Revenue" dropdown="Dec 2024">
          <div>Data</div>
        </ChartContainer>
      );

      expect(screen.getByText('Dec 2024')).toBeInTheDocument();
    });

    it('renders with showDropdown true', () => {
      render(
        <ChartContainer title="Stats" showDropdown={true} dropdown="Jan 2024">
          <div>Stats</div>
        </ChartContainer>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders different titles', () => {
      const { rerender } = render(
        <ChartContainer title="Title 1">
          <div>Content</div>
        </ChartContainer>
      );

      expect(screen.getByText('Title 1')).toBeInTheDocument();

      rerender(
        <ChartContainer title="Title 2">
          <div>Content</div>
        </ChartContainer>
      );

      expect(screen.getByText('Title 2')).toBeInTheDocument();
    });
  });

  describe('Children Rendering', () => {
    it('renders complex children', () => {
      render(
        <ChartContainer title="Chart">
          <div>
            <p>Line 1</p>
            <p>Line 2</p>
          </div>
        </ChartContainer>
      );

      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
    });

    it('renders multiple child elements', () => {
      render(
        <ChartContainer title="Multi">
          <div>Element 1</div>
          <div>Element 2</div>
        </ChartContainer>
      );

      expect(screen.getByText('Element 1')).toBeInTheDocument();
      expect(screen.getByText('Element 2')).toBeInTheDocument();
    });

    it('renders empty children', () => {
      render(
        <ChartContainer title="Empty">
          <div></div>
        </ChartContainer>
      );

      expect(screen.getByText('Empty')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty title', () => {
      render(
        <ChartContainer title="">
          <div>Content</div>
        </ChartContainer>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('handles long title', () => {
      const longTitle = 'Very Long Chart Title That Might Wrap';
      render(
        <ChartContainer title={longTitle}>
          <div>Content</div>
        </ChartContainer>
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles null children gracefully', () => {
      render(
        <ChartContainer title="Test">
          {null}
        </ChartContainer>
      );

      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('renders without crashing when all props provided', () => {
      expect(() =>
        render(
          <ChartContainer title="Full Props" showDropdown={true} dropdown="Jul 2024">
            <div>Content</div>
          </ChartContainer>
        )
      ).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading for title', () => {
      render(
        <ChartContainer title="Accessible Chart">
          <div>Content</div>
        </ChartContainer>
      );

      expect(screen.getByText('Accessible Chart')).toBeInTheDocument();
    });

    it('dropdown has combobox role when visible', () => {
      render(
        <ChartContainer title="Chart" showDropdown={true}>
          <div>Content</div>
        </ChartContainer>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('maintains accessibility without dropdown', () => {
      render(
        <ChartContainer title="Chart" showDropdown={false}>
          <div>Content</div>
        </ChartContainer>
      );

      expect(screen.getByText('Chart')).toBeInTheDocument();
    });
  });
});
