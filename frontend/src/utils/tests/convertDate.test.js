import { describe, it, expect } from 'vitest';
import { convertDate } from '../convertDate';

/**
 * UNIT TEST: convertDate Utility Function
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal date conversion
 * 2. Boundary Value Analysis - Edge cases (null, undefined, epoch)
 * 3. Error Guessing - Invalid inputs
 * 4. Equivalence Partitioning - Different input types
 */

describe('convertDate Utility - Unit Tests', () => {
  // Happy Path Testing
  describe('Happy Path - Valid Date Conversions', () => {
    it('should convert valid date string to ISO format', () => {
      const input = '2024-12-13';
      const result = convertDate(input);
      
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result).toContain('2024');
    });

    it('should convert Date object to ISO string', () => {
      const date = new Date('2024-12-13T10:30:00Z');
      const result = convertDate(date);
      
      expect(result).toBe(date.toISOString());
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should convert timestamp to ISO string', () => {
      const timestamp = 1702461000000;
      const result = convertDate(timestamp);
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(result).getTime()).toBe(timestamp);
    });

    it('should handle ISO string with timezone', () => {
      const input = '2024-12-13T10:30:00+07:00';
      const result = convertDate(input);
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result).toContain('Z'); // UTC timezone
    });

    it('should preserve milliseconds in conversion', () => {
      const date = new Date('2024-12-13T10:30:45.123Z');
      const result = convertDate(date);
      
      expect(result).toContain('.123Z');
    });
  });

  // Boundary Value Analysis (BVA)
  describe('BVA - Edge Cases', () => {
    it('should return null for null input', () => {
      const result = convertDate(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = convertDate(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = convertDate('');
      expect(result).toBeNull();
    });

    it('should return null for 0 (falsy but valid timestamp)', () => {
      const result = convertDate(0);
      // 0 is falsy, function should return null based on logic
      expect(result).toBeNull();
    });

    it('should handle epoch start (if passed as Date object)', () => {
      const epoch = new Date(0);
      const result = convertDate(epoch);
      
      expect(result).toBe('1970-01-01T00:00:00.000Z');
    });

    it('should handle very old dates', () => {
      const oldDate = new Date('1900-01-01');
      const result = convertDate(oldDate);
      
      expect(result).toMatch(/^1900-01-01/);
    });

    it('should handle far future dates', () => {
      const futureDate = new Date('2099-12-31T23:59:59.999Z');
      const result = convertDate(futureDate);
      
      expect(result).toMatch(/^2099-12-31/);
    });

    it('should handle leap year date', () => {
      const leapDate = new Date('2024-02-29');
      const result = convertDate(leapDate);
      
      expect(result).toMatch(/^2024-02-29/);
    });

    it('should handle end of year', () => {
      const endOfYear = new Date('2024-12-31T23:59:59.999Z');
      const result = convertDate(endOfYear);
      
      expect(result).toBe('2024-12-31T23:59:59.999Z');
    });
  });

  // Error Guessing - Invalid Inputs
  describe('Error Guessing - Invalid Date Inputs', () => {
    it('should convert invalid date string to null', () => {
      const result = convertDate('not-a-date');

      // Invalid date strings now return null (improved implementation)
      expect(result).toBeNull();
    });    it('should handle malformed date gracefully', () => {
      const result = convertDate('2024-13-32'); // Invalid month/day

      // Malformed dates now return null (improved implementation)
      expect(result).toBeNull();
    });    it('should return null for false boolean', () => {
      const result = convertDate(false);
      expect(result).toBeNull();
    });

    it('should handle true boolean (converts to timestamp 1)', () => {
      const result = convertDate(true);
      
      // true is truthy, will convert to Date(true) -> Date(1)
      expect(result).toBe('1970-01-01T00:00:00.001Z');
    });

    it('should handle empty object', () => {
      const result = convertDate({});

      // Empty object produces Invalid Date, now returns null
      expect(result).toBeNull();
    });    it('should handle empty array', () => {
      const result = convertDate([]);

      // Empty array produces Invalid Date, now returns null
      expect(result).toBeNull();
    });
  });

  // Equivalence Partitioning - Input Type Groups
  describe('Equivalence Partitioning - Input Types', () => {
    describe('String Dates (Valid Group)', () => {
      it('should handle ISO 8601 full format', () => {
        const result = convertDate('2024-12-13T10:30:00.000Z');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it('should handle date-only string', () => {
        const result = convertDate('2024-12-13');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}/);
      });

      it('should handle datetime without timezone', () => {
        const result = convertDate('2024-12-13T10:30:00');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });

    describe('Date Objects (Valid Group)', () => {
      it('should handle new Date()', () => {
        const date = new Date();
        const result = convertDate(date);
        
        expect(result).toBe(date.toISOString());
      });

      it('should handle Date with specific values', () => {
        const date = new Date(2024, 11, 13, 10, 30, 45, 123);
        const result = convertDate(date);
        
        expect(result).toBe(date.toISOString());
      });
    });

    describe('Timestamps (Valid Group)', () => {
      it('should handle positive timestamp', () => {
        const timestamp = Date.now();
        const result = convertDate(timestamp);
        
        expect(result).toBe(new Date(timestamp).toISOString());
      });

      it('should handle large timestamp', () => {
        const largeTimestamp = 2524608000000; // Year 2050
        const result = convertDate(largeTimestamp);
        
        expect(result).toMatch(/^205/);
      });
    });

    describe('Falsy Values (Invalid Group)', () => {
      const falsyValues = [
        { value: null, description: 'null' },
        { value: undefined, description: 'undefined' },
        { value: '', description: 'empty string' },
        { value: 0, description: 'zero' },
        { value: false, description: 'false' },
      ];

      falsyValues.forEach(({ value, description }) => {
        it(`should return null for ${description}`, () => {
          const result = convertDate(value);
          expect(result).toBeNull();
        });
      });
    });
  });

  // Additional Coverage - Format Validation
  describe('ISO Format Validation', () => {
    it('should always return ISO 8601 format with Z timezone', () => {
      const inputs = [
        '2024-01-01',
        '2024-06-15T10:30:00',
        new Date('2024-12-13'),
        1702461000000,
      ];

      inputs.forEach(input => {
        const result = convertDate(input);
        if (result) {
          expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          expect(result).toContain('Z');
        }
      });
    });

    it('should produce parseable ISO strings', () => {
      const date = new Date('2024-12-13T10:30:00Z');
      const result = convertDate(date);
      
      const parsed = new Date(result);
      expect(parsed.getTime()).toBe(date.getTime());
    });

    it('should maintain date equality through conversion', () => {
      const original = new Date('2024-12-13T10:30:45.123Z');
      const converted = convertDate(original);
      const parsed = new Date(converted);
      
      expect(parsed.getTime()).toBe(original.getTime());
    });
  });

  // Non-Functional - Performance & Consistency
  describe('Non-Functional - Performance & Consistency', () => {
    it('should be fast for batch processing', () => {
      const dates = Array.from({ length: 1000 }, (_, i) => 
        new Date(2024, 0, 1 + i)
      );
      
      const startTime = performance.now();
      dates.forEach(date => convertDate(date));
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should return consistent results for same input', () => {
      const date = new Date('2024-12-13T10:30:00Z');
      const results = Array.from({ length: 10 }, () => convertDate(date));
      
      const allSame = results.every(result => result === results[0]);
      expect(allSame).toBe(true);
    });

    it('should handle rapid successive calls', () => {
      const date = new Date();
      const result1 = convertDate(date);
      const result2 = convertDate(date);
      const result3 = convertDate(date);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should not mutate input Date object', () => {
      const date = new Date('2024-12-13');
      const originalTime = date.getTime();
      
      convertDate(date);
      
      expect(date.getTime()).toBe(originalTime);
    });
  });

  // Integration with formatDate
  describe('Integration - Compatibility', () => {
    it('should produce output compatible with Date constructor', () => {
      const original = '2024-12-13T10:30:00Z';
      const converted = convertDate(original);
      const reconstructed = new Date(converted);
      
      expect(reconstructed).toBeInstanceOf(Date);
      expect(reconstructed.toISOString()).toBe(converted);
    });

    it('should work in round-trip conversion', () => {
      const original = new Date('2024-12-13T10:30:45.678Z');
      const isoString = convertDate(original);
      const backToDate = new Date(isoString);
      const isoStringAgain = convertDate(backToDate);
      
      expect(isoString).toBe(isoStringAgain);
      expect(backToDate.getTime()).toBe(original.getTime());
    });
  });
});
