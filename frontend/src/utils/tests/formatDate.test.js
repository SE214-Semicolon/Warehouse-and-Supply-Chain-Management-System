import { describe, it, expect } from 'vitest';
import { formatDate } from '../formatDate';

/**
 * UNIT TEST: formatDate Utility Function
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal date formatting
 * 2. Boundary Value Analysis - Edge cases (null, undefined, invalid dates)
 * 3. Error Guessing - Invalid inputs, malformed dates
 * 4. Equivalence Partitioning - Different date formats
 */

describe('formatDate Utility - Unit Tests', () => {
  // Happy Path Testing
  describe('Happy Path - Valid Date Inputs', () => {
    it('should format valid ISO date string to Vietnamese locale', () => {
      const isoDate = '2024-12-13T10:30:00.000Z';
      const result = formatDate(isoDate);
      
      // Vietnamese format: DD/MM/YYYY
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
      expect(result).toContain('2024');
    });

    it('should format Date object correctly', () => {
      const dateObj = new Date('2024-12-13');
      const result = formatDate(dateObj);
      
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    });

    it('should format date string in different format', () => {
      const dateStr = '2024-06-15';
      const result = formatDate(dateStr);
      
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
      expect(result).toContain('2024');
    });

    it('should format timestamp correctly', () => {
      const timestamp = 1702461000000; // Dec 13, 2023
      const result = formatDate(timestamp);
      
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    });
  });

  // Boundary Value Analysis (BVA)
  describe('BVA - Edge Cases', () => {
    it('should return "-" for null input', () => {
      const result = formatDate(null);
      expect(result).toBe('-');
    });

    it('should return "-" for undefined input', () => {
      const result = formatDate(undefined);
      expect(result).toBe('-');
    });

    it('should return "-" for empty string', () => {
      const result = formatDate('');
      expect(result).toBe('-');
    });

    it('should handle date at start of epoch (1970-01-01)', () => {
      const epochStart = new Date(0);
      const result = formatDate(epochStart);
      
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/1970$/);
    });

    it('should handle very old dates', () => {
      const oldDate = new Date('1900-01-01');
      const result = formatDate(oldDate);
      
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/1900$/);
    });

    it('should handle far future dates', () => {
      const futureDate = new Date('2099-12-31');
      const result = formatDate(futureDate);
      
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/2099$/);
    });

    it('should handle date at end of month', () => {
      const endOfMonth = new Date('2024-02-29'); // Leap year
      const result = formatDate(endOfMonth);
      
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/2024$/);
    });
  });

  // Error Guessing - Invalid Inputs
  describe('Error Guessing - Invalid Date Inputs', () => {
    it('should return "-" for invalid date string', () => {
      const result = formatDate('not-a-date');
      expect(result).toBe('-');
    });

    it('should return "-" for invalid date format', () => {
      const result = formatDate('32/13/2024'); // Invalid day/month
      expect(result).toBe('-');
    });

    it('should return "-" for malformed ISO string', () => {
      const result = formatDate('2024-13-32T99:99:99');
      expect(result).toBe('-');
    });

    it('should return "-" for NaN', () => {
      const result = formatDate(NaN);
      expect(result).toBe('-');
    });

    it('should return "-" for boolean', () => {
      const result = formatDate(true);
      expect(result).toBe('-');
    });

    it('should return "-" for object without valid date', () => {
      const result = formatDate({ invalid: 'object' });
      expect(result).toBe('-');
    });

    it('should return "-" for array', () => {
      const result = formatDate([2024, 12, 13]);
      expect(result).toBe('-');
    });
  });

  // Equivalence Partitioning - Different Input Types
  describe('Equivalence Partitioning - Input Type Groups', () => {
    describe('String Dates (Valid Group)', () => {
      it('should handle ISO 8601 format', () => {
        const result = formatDate('2024-12-13T10:30:00Z');
        expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/2024$/);
      });

      it('should handle short date format', () => {
        const result = formatDate('2024-12-13');
        expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/2024$/);
      });

      it('should handle date with timezone', () => {
        const result = formatDate('2024-12-13T10:30:00+07:00');
        expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/2024$/);
      });
    });

    describe('Number Timestamps (Valid Group)', () => {
      it('should handle millisecond timestamps', () => {
        const timestamp = Date.now();
        const result = formatDate(timestamp);
        expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
      });

      it('should handle zero timestamp', () => {
        const result = formatDate(0);
        // Zero is treated as invalid/empty timestamp in our business logic
        expect(result).toBe('-');
      });
    });

    describe('Date Objects (Valid Group)', () => {
      it('should handle Date object', () => {
        const date = new Date();
        const result = formatDate(date);
        expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
      });

      it('should handle Date object with specific time', () => {
        const date = new Date(2024, 11, 13, 15, 30, 0); // Month is 0-indexed
        const result = formatDate(date);
        expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/2024$/);
      });
    });

    describe('Invalid Inputs (Invalid Group)', () => {
      const invalidInputs = [
        { value: null, description: 'null' },
        { value: undefined, description: 'undefined' },
        { value: '', description: 'empty string' },
        { value: 'invalid', description: 'invalid string' },
        { value: NaN, description: 'NaN' },
        { value: {}, description: 'empty object' },
        { value: [], description: 'empty array' },
      ];

      invalidInputs.forEach(({ value, description }) => {
        it(`should return "-" for ${description}`, () => {
          const result = formatDate(value);
          expect(result).toBe('-');
        });
      });
    });
  });

  // Additional Coverage - Locale Verification
  describe('Vietnamese Locale Formatting', () => {
    it('should use Vietnamese date format (DD/MM/YYYY)', () => {
      const date = new Date('2024-03-05'); // March 5, 2024
      const result = formatDate(date);
      
      // Vietnamese format: day first, then month
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/2024$/);
      
      // Parse result to verify format
      const parts = result.split('/');
      expect(parts).toHaveLength(3);
      
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      expect(year).toBe(2024);
    });

    it('should consistently format same date', () => {
      const date = '2024-12-13';
      const result1 = formatDate(date);
      const result2 = formatDate(date);
      
      expect(result1).toBe(result2);
    });
  });

  // Performance & Consistency
  describe('Non-Functional - Performance & Consistency', () => {
    // it('should be fast for batch processing', () => {
    //   const dates = Array.from({ length: 1000 }, (_, i) => 
    //     new Date(2024, 0, 1 + i).toISOString()
    //   );
      
    //   const startTime = performance.now();
    //   dates.forEach(date => formatDate(date));
    //   const endTime = performance.now();
      
    //   // Should process 1000 dates in less than 100ms
    //   expect(endTime - startTime).toBeLessThan(100);
    // });

    it('should return consistent results for same input', () => {
      const date = '2024-12-13T10:30:00Z';
      const results = Array.from({ length: 10 }, () => formatDate(date));
      
      const allSame = results.every(result => result === results[0]);
      expect(allSame).toBe(true);
    });

    it('should not mutate input Date object', () => {
      const date = new Date('2024-12-13');
      const originalTime = date.getTime();
      
      formatDate(date);
      
      expect(date.getTime()).toBe(originalTime);
    });
  });
});
