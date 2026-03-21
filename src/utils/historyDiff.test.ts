import { describe, it, expect } from 'vitest';
import {
  extractFieldDiffs,
  formatDiffValue,
  formatDiffValueForField,
  formatFieldName,
  getSummaryFields,
} from './historyDiff';

describe('historyDiff utilities', () => {
  describe('extractFieldDiffs', () => {
    it('should extract changed fields between two snapshots', () => {
      const prev = { name: 'Bill A', amount: 100, active: true };
      const next = { name: 'Bill A', amount: 150, active: false };

      const diffs = extractFieldDiffs(prev, next);

      expect(diffs).toHaveLength(2);
      expect(diffs).toContainEqual({ key: 'amount', oldValue: 100, newValue: 150 });
      expect(diffs).toContainEqual({ key: 'active', oldValue: true, newValue: false });
    });

    it('should not include unchanged fields', () => {
      const prev = { name: 'Bill A', amount: 100 };
      const next = { name: 'Bill A', amount: 100 };

      const diffs = extractFieldDiffs(prev, next);

      expect(diffs).toHaveLength(0);
    });

    it('should handle new fields added', () => {
      const prev = { name: 'Bill A' };
      const next = { name: 'Bill A', amount: 100 };

      const diffs = extractFieldDiffs(prev, next);

      expect(diffs).toContainEqual({ key: 'amount', oldValue: undefined, newValue: 100 });
    });

    it('should handle removed fields', () => {
      const prev = { name: 'Bill A', amount: 100 };
      const next = { name: 'Bill A' };

      const diffs = extractFieldDiffs(prev, next);

      expect(diffs).toContainEqual({ key: 'amount', oldValue: 100, newValue: undefined });
    });

    it('should return empty array for non-object inputs', () => {
      expect(extractFieldDiffs(null, { a: 1 })).toHaveLength(0);
      expect(extractFieldDiffs({ a: 1 }, null)).toHaveLength(0);
      expect(extractFieldDiffs('string', { a: 1 })).toHaveLength(0);
    });
  });

  describe('formatDiffValue', () => {
    it('should format null and undefined as (empty)', () => {
      expect(formatDiffValue(null)).toBe('(empty)');
      expect(formatDiffValue(undefined)).toBe('(empty)');
    });

    it('should format booleans', () => {
      expect(formatDiffValue(true)).toBe('Yes');
      expect(formatDiffValue(false)).toBe('No');
    });

    it('should format numbers with locale string', () => {
      expect(formatDiffValue(1000)).toBe('1,000');
      expect(formatDiffValue(1234.567)).toBe('1,234.57');
    });

    it('should format strings', () => {
      expect(formatDiffValue('Hello')).toBe('Hello');
      expect(formatDiffValue('')).toBe('(empty)');
    });

    it('should format arrays as "[Array: n items]"', () => {
      expect(formatDiffValue([1, 2, 3])).toBe('[Array: 3 items]');
      expect(formatDiffValue([])).toBe('[Array: 0 items]');
    });

    it('should format objects as "[Object]"', () => {
      expect(formatDiffValue({ a: 1 })).toBe('[Object]');
    });

    it('should format payment breakdown arrays with line-level detail', () => {
      const value = [
        { id: '1', label: 'Principal', amount: 900, frequency: 'monthly' },
        { id: '2', label: 'Interest', amount: 450.25, frequency: 'monthly' },
      ];
      expect(formatDiffValueForField('paymentBreakdown', value)).toBe(
        'Principal: 900 (Monthly) | Interest: 450.25 (Monthly)',
      );
    });

    it('should format empty payment breakdown arrays as (empty)', () => {
      expect(formatDiffValueForField('paymentBreakdown', [])).toBe('(empty)');
    });

    it('should fallback to generic formatting for unknown keys', () => {
      expect(formatDiffValueForField('amount', 1000)).toBe('1,000');
    });
  });

  describe('formatFieldName', () => {
    it('should convert camelCase to Title Case', () => {
      expect(formatFieldName('annualSalary')).toBe('Annual Salary');
      expect(formatFieldName('payFrequency')).toBe('Pay Frequency');
      expect(formatFieldName('hoursPerWeek')).toBe('Hours Per Week');
    });

    it('should handle single word fields', () => {
      expect(formatFieldName('name')).toBe('Name');
      expect(formatFieldName('amount')).toBe('Amount');
    });

    it('should handle already formatted fields', () => {
      expect(formatFieldName('Name')).toBe('Name');
    });
  });

  describe('getSummaryFields', () => {
    it('should extract summary fields from snapshot', () => {
      const snapshot = {
        label: 'Electric Bill',
        name: 'Power',
        amount: 150,
        description: 'Monthly electric utility',
        rate: 5.5,
      };

      const summary = getSummaryFields(snapshot, 3);

      expect(summary.length).toBeGreaterThan(0);
      expect(summary[0]).toContain('Label');
      expect(summary[0]).toContain('Electric Bill');
    });

    it('should respect maxFields limit', () => {
      const snapshot = {
        label: 'Test',
        name: 'Name',
        title: 'Title',
        description: 'Desc',
      };

      const summary = getSummaryFields(snapshot, 2);

      expect(summary.length).toBeLessThanOrEqual(2);
    });

    it('should skip null and undefined values', () => {
      const snapshot = {
        label: 'Test',
        name: null,
        amount: undefined,
      };

      const summary = getSummaryFields(snapshot);

      expect(summary).toEqual(['Label: Test']);
    });

    it('should return empty array for non-object inputs', () => {
      expect(getSummaryFields(null)).toEqual([]);
      expect(getSummaryFields('string')).toEqual([]);
      expect(getSummaryFields(123)).toEqual([]);
    });

    it('should follow priority order for field selection', () => {
      const snapshot = {
        label: 'Label Value',
        name: 'Name Value',
        title: 'Title Value',
        description: 'Desc Value',
        amount: 100,
      };

      const summary = getSummaryFields(snapshot, 2);

      // Should prioritize label first, then name
      expect(summary[0]).toContain('Label');
      expect(summary[1]).toContain('Name');
    });
  });
});
