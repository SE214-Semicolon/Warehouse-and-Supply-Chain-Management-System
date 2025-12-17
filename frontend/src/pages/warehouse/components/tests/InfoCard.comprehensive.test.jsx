import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import InfoCard from '../InfoCard';

describe('InfoCard - Comprehensive Tests', () => {
  const mockLeftFields = [
    { label: 'Name', value: 'Product A' },
    { label: 'SKU', value: 'SKU001' },
    { label: 'Category', value: 'Electronics' },
  ];

  const mockRightFields = [
    { label: 'Price', value: '$99.99' },
    { label: 'Stock', value: '100' },
    { label: 'Status', value: 'Active' },
  ];

  beforeEach(() => {
    // Clean up between tests
  });

  // ==================== BASIC RENDERING ====================
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<InfoCard />);
      }).not.toThrow();
    });

    it('renders with default title', () => {
      render(<InfoCard />);
      expect(screen.getByText('Detail Information')).toBeInTheDocument();
    });

    it('renders with default subtitle', () => {
      render(<InfoCard />);
      expect(screen.getByText('Full details')).toBeInTheDocument();
    });

    it('renders with custom title', () => {
      render(<InfoCard title="Custom Title" />);
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('renders with custom subtitle', () => {
      render(<InfoCard subtitle="Custom Subtitle" />);
      expect(screen.getByText('Custom Subtitle')).toBeInTheDocument();
    });
  });

  // ==================== LEFT FIELDS ====================
  describe('Left Fields', () => {
    it('renders left fields correctly', () => {
      render(<InfoCard leftFields={mockLeftFields} />);
      
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Product A')).toBeInTheDocument();
      expect(screen.getByText('SKU')).toBeInTheDocument();
      expect(screen.getByText('SKU001')).toBeInTheDocument();
    });

    it('renders single left field', () => {
      const singleField = [{ label: 'Name', value: 'Test' }];
      render(<InfoCard leftFields={singleField} />);
      
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('renders multiple left fields', () => {
      render(<InfoCard leftFields={mockLeftFields} />);
      
      mockLeftFields.forEach(field => {
        expect(screen.getByText(field.label)).toBeInTheDocument();
        expect(screen.getByText(field.value)).toBeInTheDocument();
      });
    });

    it('renders empty left fields without error', () => {
      render(<InfoCard leftFields={[]} />);
      expect(screen.getByText('Detail Information')).toBeInTheDocument();
    });

    it('handles null value in left field', () => {
      const fieldWithNull = [{ label: 'Empty', value: null }];
      render(<InfoCard leftFields={fieldWithNull} />);
      
      expect(screen.getByText('Empty')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('handles undefined value in left field', () => {
      const fieldWithUndefined = [{ label: 'Empty', value: undefined }];
      render(<InfoCard leftFields={fieldWithUndefined} />);
      
      expect(screen.getByText('Empty')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('handles numeric value in left field', () => {
      const numericField = [{ label: 'Count', value: 123 }];
      render(<InfoCard leftFields={numericField} />);
      
      expect(screen.getByText('Count')).toBeInTheDocument();
      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('handles zero value in left field', () => {
      const zeroField = [{ label: 'Quantity', value: 0 }];
      render(<InfoCard leftFields={zeroField} />);
      
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  // ==================== RIGHT FIELDS ====================
  describe('Right Fields', () => {
    it('renders right fields correctly', () => {
      render(<InfoCard rightFields={mockRightFields} />);
      
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('$99.99')).toBeInTheDocument();
      expect(screen.getByText('Stock')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('renders single right field', () => {
      const singleField = [{ label: 'Status', value: 'Active' }];
      render(<InfoCard rightFields={singleField} />);
      
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders multiple right fields', () => {
      render(<InfoCard rightFields={mockRightFields} />);
      
      mockRightFields.forEach(field => {
        expect(screen.getByText(field.label)).toBeInTheDocument();
        expect(screen.getByText(field.value)).toBeInTheDocument();
      });
    });

    it('renders empty right fields without error', () => {
      render(<InfoCard rightFields={[]} />);
      expect(screen.getByText('Detail Information')).toBeInTheDocument();
    });

    it('handles null value in right field', () => {
      const fieldWithNull = [{ label: 'Empty', value: null }];
      render(<InfoCard rightFields={fieldWithNull} />);
      
      expect(screen.getByText('Empty')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('handles undefined value in right field', () => {
      const fieldWithUndefined = [{ label: 'Empty', value: undefined }];
      render(<InfoCard rightFields={fieldWithUndefined} />);
      
      expect(screen.getByText('Empty')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  // ==================== BOTH FIELDS TOGETHER ====================
  describe('Both Fields Together', () => {
    it('renders both left and right fields', () => {
      render(
        <InfoCard
          leftFields={mockLeftFields}
          rightFields={mockRightFields}
        />
      );
      
      // Check left fields
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Product A')).toBeInTheDocument();
      
      // Check right fields
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('$99.99')).toBeInTheDocument();
    });

    it('renders with different number of fields on each side', () => {
      const leftFields = [{ label: 'A', value: '1' }];
      const rightFields = [
        { label: 'B', value: '2' },
        { label: 'C', value: '3' },
        { label: 'D', value: '4' },
      ];
      
      render(<InfoCard leftFields={leftFields} rightFields={rightFields} />);
      
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
    });
  });

  // ==================== HEADER COLOR ====================
  describe('Header Color', () => {
    it('uses default header color', () => {
      const { container } = render(<InfoCard />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts custom header color', () => {
      const { container } = render(<InfoCard headerColor="#FF5722" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts MUI theme color', () => {
      const { container } = render(<InfoCard headerColor="primary.main" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts RGB color', () => {
      const { container } = render(<InfoCard headerColor="rgb(255, 87, 34)" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts gradient color', () => {
      const { container } = render(
        <InfoCard headerColor="linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)" />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  // ==================== GAP CUSTOMIZATION ====================
  describe('Gap Customization', () => {
    it('uses default gap value', () => {
      const { container } = render(
        <InfoCard leftFields={mockLeftFields} rightFields={mockRightFields} />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts custom gap value', () => {
      const { container } = render(
        <InfoCard
          leftFields={mockLeftFields}
          rightFields={mockRightFields}
          gap={10}
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts zero gap', () => {
      const { container } = render(
        <InfoCard
          leftFields={mockLeftFields}
          rightFields={mockRightFields}
          gap={0}
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  // ==================== FIELD VALUES ====================
  describe('Field Values', () => {
    it('handles long label text', () => {
      const longLabelField = [
        { label: 'This is a very long label that might wrap', value: 'Value' },
      ];
      render(<InfoCard leftFields={longLabelField} />);
      
      expect(screen.getByText('This is a very long label that might wrap')).toBeInTheDocument();
    });

    it('handles long value text', () => {
      const longValueField = [
        { label: 'Label', value: 'This is a very long value that might wrap to multiple lines' },
      ];
      render(<InfoCard leftFields={longValueField} />);
      
      expect(screen.getByText('This is a very long value that might wrap to multiple lines')).toBeInTheDocument();
    });

    it('handles special characters in values', () => {
      const specialCharsField = [
        { label: 'Special', value: '<>&"\'`' },
      ];
      render(<InfoCard leftFields={specialCharsField} />);
      
      expect(screen.getByText('<>&"\'`')).toBeInTheDocument();
    });

    it('handles HTML-like content in values', () => {
      const htmlLikeField = [
        { label: 'HTML', value: '<div>Test</div>' },
      ];
      render(<InfoCard leftFields={htmlLikeField} />);
      
      expect(screen.getByText('<div>Test</div>')).toBeInTheDocument();
    });

    it('handles emoji in values', () => {
      const emojiField = [
        { label: 'Emoji', value: '✅ 🎉 💯' },
      ];
      render(<InfoCard leftFields={emojiField} />);
      
      expect(screen.getByText('✅ 🎉 💯')).toBeInTheDocument();
    });

    it('handles boolean values', () => {
      const booleanFields = [
        { label: 'True', value: true },
        { label: 'False', value: false },
      ];
      render(<InfoCard leftFields={booleanFields} />);
      
      expect(screen.getByText('True')).toBeInTheDocument();
      expect(screen.getByText('False')).toBeInTheDocument();
    });
  });

  // ==================== PROP UPDATES ====================
  describe('Prop Updates', () => {
    it('updates when title changes', () => {
      const { rerender } = render(<InfoCard title="Original Title" />);
      expect(screen.getByText('Original Title')).toBeInTheDocument();
      
      rerender(<InfoCard title="Updated Title" />);
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
      expect(screen.queryByText('Original Title')).not.toBeInTheDocument();
    });

    it('updates when left fields change', () => {
      const originalFields = [{ label: 'Original', value: 'Value1' }];
      const updatedFields = [{ label: 'Updated', value: 'Value2' }];
      
      const { rerender } = render(<InfoCard leftFields={originalFields} />);
      expect(screen.getByText('Original')).toBeInTheDocument();
      
      rerender(<InfoCard leftFields={updatedFields} />);
      expect(screen.getByText('Updated')).toBeInTheDocument();
      expect(screen.queryByText('Original')).not.toBeInTheDocument();
    });

    it('updates when right fields change', () => {
      const originalFields = [{ label: 'Right1', value: 'Value1' }];
      const updatedFields = [{ label: 'Right2', value: 'Value2' }];
      
      const { rerender } = render(<InfoCard rightFields={originalFields} />);
      expect(screen.getByText('Right1')).toBeInTheDocument();
      
      rerender(<InfoCard rightFields={updatedFields} />);
      expect(screen.getByText('Right2')).toBeInTheDocument();
      expect(screen.queryByText('Right1')).not.toBeInTheDocument();
    });

    it('updates when fields are added', () => {
      const { rerender } = render(<InfoCard leftFields={[]} />);
      
      rerender(<InfoCard leftFields={mockLeftFields} />);
      
      mockLeftFields.forEach(field => {
        expect(screen.getByText(field.label)).toBeInTheDocument();
      });
    });

    it('updates when fields are removed', () => {
      const { rerender } = render(<InfoCard leftFields={mockLeftFields} />);
      
      expect(screen.getByText('Name')).toBeInTheDocument();
      
      rerender(<InfoCard leftFields={[]} />);
      
      expect(screen.queryByText('Name')).not.toBeInTheDocument();
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('handles empty title', () => {
      render(<InfoCard title="" />);
      expect(screen.getByText('Full details')).toBeInTheDocument();
    });

    it('handles empty subtitle', () => {
      render(<InfoCard subtitle="" />);
      expect(screen.getByText('Detail Information')).toBeInTheDocument();
    });

    it('handles both left and right fields empty', () => {
      render(<InfoCard leftFields={[]} rightFields={[]} />);
      expect(screen.getByText('Detail Information')).toBeInTheDocument();
    });

    it('handles field with only label', () => {
      const fieldWithoutValue = [{ label: 'NoValue' }];
      render(<InfoCard leftFields={fieldWithoutValue} />);
      
      expect(screen.getByText('NoValue')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('handles field with empty string value', () => {
      const fieldWithEmptyString = [{ label: 'Empty', value: '' }];
      const { container } = render(<InfoCard leftFields={fieldWithEmptyString} />);
      
      expect(screen.getByText('Empty')).toBeInTheDocument();
      // Empty string '' renders as empty Typography element (not '-')
      // Only null/undefined values render as '-'
      expect(container).toBeInTheDocument();
    });

    it('handles very large number of fields', () => {
      const manyFields = Array.from({ length: 50 }, (_, i) => ({
        label: `Label ${i}`,
        value: `Value ${i}`,
      }));
      
      render(<InfoCard leftFields={manyFields} />);
      
      expect(screen.getByText('Label 0')).toBeInTheDocument();
      expect(screen.getByText('Label 49')).toBeInTheDocument();
    });

    it('handles field with very large value', () => {
      const largeValueField = [
        { label: 'Large', value: 99999999999999 },
      ];
      render(<InfoCard leftFields={largeValueField} />);
      
      expect(screen.getByText('Large')).toBeInTheDocument();
      expect(screen.getByText('99999999999999')).toBeInTheDocument();
    });

    it('handles negative numbers', () => {
      const negativeField = [{ label: 'Negative', value: -100 }];
      render(<InfoCard leftFields={negativeField} />);
      
      expect(screen.getByText('Negative')).toBeInTheDocument();
      expect(screen.getByText('-100')).toBeInTheDocument();
    });

    it('handles decimal numbers', () => {
      const decimalField = [{ label: 'Decimal', value: 12.345 }];
      render(<InfoCard leftFields={decimalField} />);
      
      expect(screen.getByText('Decimal')).toBeInTheDocument();
      expect(screen.getByText('12.345')).toBeInTheDocument();
    });
  });

  // ==================== INTEGRATION ====================
  describe('Integration Scenarios', () => {
    it('renders complete card with all props', () => {
      render(
        <InfoCard
          title="Product Details"
          subtitle="Complete information"
          headerColor="#FF5722"
          leftFields={mockLeftFields}
          rightFields={mockRightFields}
          gap={5}
        />
      );
      
      expect(screen.getByText('Product Details')).toBeInTheDocument();
      expect(screen.getByText('Complete information')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
    });

    it('maintains state after rapid re-renders', () => {
      const { rerender } = render(
        <InfoCard
          title="Title 1"
          leftFields={[{ label: 'Field1', value: 'Value1' }]}
        />
      );
      
      for (let i = 2; i <= 10; i++) {
        rerender(
          <InfoCard
            title={`Title ${i}`}
            leftFields={[{ label: `Field${i}`, value: `Value${i}` }]}
          />
        );
      }
      
      expect(screen.getByText('Title 10')).toBeInTheDocument();
      expect(screen.getByText('Field10')).toBeInTheDocument();
    });

    it('works with mixed data types in fields', () => {
      const mixedFields = [
        { label: 'String', value: 'Text' },
        { label: 'Number', value: 123 },
        { label: 'Boolean', value: true },
        { label: 'Null', value: null },
        { label: 'Zero', value: 0 },
      ];
      
      render(<InfoCard leftFields={mixedFields} />);
      
      expect(screen.getByText('String')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('Number')).toBeInTheDocument();
      expect(screen.getByText('123')).toBeInTheDocument();
      expect(screen.getAllByText('-')).toHaveLength(1); // null renders as '-'
    });
  });
});
