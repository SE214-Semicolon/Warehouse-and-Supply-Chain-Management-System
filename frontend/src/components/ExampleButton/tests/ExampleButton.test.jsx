import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExampleButton from '../ExampleButton';

describe('ExampleButton Component', () => {
  describe('Happy Path - Rendering', () => {
    it('renders with provided text', () => {
      render(<ExampleButton text="Click Me" />);
      
      expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
    });

    it('renders as MUI contained button', () => {
      render(<ExampleButton text="Test" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-contained');
    });

    it('displays button text correctly', () => {
      render(<ExampleButton text="Submit" />);
      
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });

  describe('Props Variations', () => {
    it('renders with different text values', () => {
      const { rerender } = render(<ExampleButton text="Text 1" />);
      expect(screen.getByText('Text 1')).toBeInTheDocument();

      rerender(<ExampleButton text="Text 2" />);
      expect(screen.getByText('Text 2')).toBeInTheDocument();
    });

    it('renders with short text', () => {
      render(<ExampleButton text="OK" />);
      
      expect(screen.getByText('OK')).toBeInTheDocument();
    });

    it('renders with long text', () => {
      const longText = 'This is a very long button text';
      render(<ExampleButton text={longText} />);
      
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('renders with special characters', () => {
      render(<ExampleButton text="Save & Continue →" />);
      
      expect(screen.getByText('Save & Continue →')).toBeInTheDocument();
    });

    it('renders with numbers', () => {
      render(<ExampleButton text="123" />);
      
      expect(screen.getByText('123')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('renders with empty string', () => {
      render(<ExampleButton text="" />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.textContent).toBe('');
    });

    it('renders with whitespace text', () => {
      render(<ExampleButton text="   " />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders without crashing when text prop is provided', () => {
      expect(() => render(<ExampleButton text="Test" />)).not.toThrow();
    });

    it('handles text with line breaks', () => {
      const textWithBreaks = 'Line 1\nLine 2';
      render(<ExampleButton text={textWithBreaks} />);
      
      // Line breaks are rendered as spaces in HTML
      expect(screen.getByRole('button')).toHaveTextContent('Line 1 Line 2');
    });
  });

  describe('Component Structure', () => {
    it('renders as a button element', () => {
      render(<ExampleButton text="Test" />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has MUI Button base class', () => {
      render(<ExampleButton text="Test" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-root');
    });

    it('has contained variant styling', () => {
      render(<ExampleButton text="Test" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-contained');
    });
  });

  describe('Accessibility', () => {
    it('has button role', () => {
      render(<ExampleButton text="Accessible" />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has accessible text content', () => {
      render(<ExampleButton text="Submit Form" />);
      
      const button = screen.getByRole('button', { name: 'Submit Form' });
      expect(button).toBeInTheDocument();
    });

    it('is keyboard accessible', () => {
      render(<ExampleButton text="Click" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('tabIndex', 0);
    });
  });

  describe('Boundary Value Analysis', () => {
    it('handles single character text', () => {
      render(<ExampleButton text="X" />);
      
      expect(screen.getByText('X')).toBeInTheDocument();
    });

    it('handles very long text', () => {
      const veryLongText = 'A'.repeat(100);
      render(<ExampleButton text={veryLongText} />);
      
      expect(screen.getByRole('button')).toHaveTextContent(veryLongText);
    });

    it('handles text with unicode characters', () => {
      render(<ExampleButton text="Hello 世界 🌍" />);
      
      expect(screen.getByText('Hello 世界 🌍')).toBeInTheDocument();
    });
  });

  describe('Visual Rendering', () => {
    it('maintains consistent structure across renders', () => {
      const { container, rerender } = render(<ExampleButton text="First" />);
      const firstRender = container.innerHTML;

      rerender(<ExampleButton text="Second" />);
      const secondRender = container.innerHTML;

      // Structure should be similar (classes remain the same)
      expect(firstRender).toContain('MuiButton-contained');
      expect(secondRender).toContain('MuiButton-contained');
    });

    it('renders MUI Button structure', () => {
      const { container } = render(<ExampleButton text="Test" />);
      
      const button = container.querySelector('.MuiButton-root');
      expect(button).toBeInTheDocument();
    });
  });
});
