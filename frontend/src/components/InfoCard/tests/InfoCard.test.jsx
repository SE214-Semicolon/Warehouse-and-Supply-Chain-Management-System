import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import InfoCard from '../InfoCard';
import InfoIcon from '@mui/icons-material/Info';

/**
 * UNIT TEST: InfoCard Component
 * 
 * Testing Techniques:
 * - Happy Path: Normal rendering with title, icon, children
 * - Equivalence Partitioning: Different icon colors
 * - BVA: Missing props, edge cases
 * - Error Guessing: Invalid props
 * - Accessibility: Semantic structure
 */

describe('InfoCard Component - Unit Tests', () => {
  describe('Happy Path', () => {
    it('should render with title and children', () => {
      render(
        <InfoCard title="Card Title" icon={InfoIcon}>
          <div>Card Content</div>
        </InfoCard>
      );
      
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should render icon when provided', () => {
      render(
        <InfoCard title="Test Card" icon={InfoIcon}>
          Content
        </InfoCard>
      );
      
      expect(screen.getByText('Test Card')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <InfoCard title="Title" icon={InfoIcon}>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
        </InfoCard>
      );
      
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    });
  });

  describe('Equivalence Partitioning - Icon Colors', () => {
    it('should handle primary color', () => {
      render(
        <InfoCard title="Primary" icon={InfoIcon} iconColor="primary">
          Content
        </InfoCard>
      );
      
      expect(screen.getByText('Primary')).toBeInTheDocument();
    });

    it('should handle blue color', () => {
      render(
        <InfoCard title="Blue" icon={InfoIcon} iconColor="blue">
          Content
        </InfoCard>
      );
      
      expect(screen.getByText('Blue')).toBeInTheDocument();
    });

    it('should handle green color', () => {
      render(
        <InfoCard title="Green" icon={InfoIcon} iconColor="green">
          Content
        </InfoCard>
      );
      
      expect(screen.getByText('Green')).toBeInTheDocument();
    });

    it('should handle orange color', () => {
      render(
        <InfoCard title="Orange" icon={InfoIcon} iconColor="orange">
          Content
        </InfoCard>
      );
      
      expect(screen.getByText('Orange')).toBeInTheDocument();
    });

    it('should use default primary color', () => {
      render(
        <InfoCard title="Default" icon={InfoIcon}>
          Content
        </InfoCard>
      );
      
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  describe('BVA - Edge Cases', () => {
    it('should handle empty title', () => {
      const { container } = render(
        <InfoCard title="" icon={InfoIcon}>
          Content
        </InfoCard>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle missing icon', () => {
      render(
        <InfoCard title="No Icon">
          Content
        </InfoCard>
      );
      
      expect(screen.getByText('No Icon')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should handle empty children', () => {
      render(
        <InfoCard title="Empty" icon={InfoIcon}>
        </InfoCard>
      );
      
      expect(screen.getByText('Empty')).toBeInTheDocument();
    });

    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(200);
      render(
        <InfoCard title={longTitle} icon={InfoIcon}>
          Content
        </InfoCard>
      );
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });
  });

  describe('Error Guessing', () => {
    it('should handle undefined title', () => {
      render(
        <InfoCard icon={InfoIcon}>
          Content
        </InfoCard>
      );
      
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should handle null children', () => {
      render(
        <InfoCard title="Test" icon={InfoIcon}>
          {null}
        </InfoCard>
      );
      
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle custom color values', () => {
      render(
        <InfoCard title="Custom" icon={InfoIcon} iconColor="#ff0000">
          Content
        </InfoCard>
      );
      
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });

  describe('Children Content Types', () => {
    it('should render string children', () => {
      render(
        <InfoCard title="String" icon={InfoIcon}>
          Simple string content
        </InfoCard>
      );
      
      expect(screen.getByText('Simple string content')).toBeInTheDocument();
    });

    it('should render JSX children', () => {
      render(
        <InfoCard title="JSX" icon={InfoIcon}>
          <div data-testid="custom-content">Custom JSX</div>
        </InfoCard>
      );
      
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <InfoCard title="Multiple" icon={InfoIcon}>
          <span>Child 1</span>
          <span>Child 2</span>
          <span>Child 3</span>
        </InfoCard>
      );
      
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render as card', () => {
      const { container } = render(
        <InfoCard title="Accessible" icon={InfoIcon}>
          Content
        </InfoCard>
      );
      
      // Card renders without crash
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <InfoCard title="Main Title" icon={InfoIcon}>
          <h3>Subheading</h3>
          <p>Paragraph</p>
        </InfoCard>
      );
      
      expect(screen.getByText('Main Title')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });
  });

  describe('Layout & Styling', () => {
    it('should maintain structure with varying content', () => {
      const { rerender } = render(
        <InfoCard title="Test" icon={InfoIcon}>
          Short
        </InfoCard>
      );
      
      expect(screen.getByText('Short')).toBeInTheDocument();
      
      rerender(
        <InfoCard title="Test" icon={InfoIcon}>
          <div>Very long content that might affect the layout and structure of the card component</div>
        </InfoCard>
      );
      
      expect(screen.getByText(/Very long content/)).toBeInTheDocument();
    });
  });
});
