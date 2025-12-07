import { describe, expect, it } from 'vitest';
import { isNonNullable } from '../type-guards';

describe('Type Guards', () => {
  describe('isNonNullable', () => {
    it('should return true for non-null/undefined values', () => {
      expect(isNonNullable('string')).toBe(true);
      expect(isNonNullable(0)).toBe(true);
      expect(isNonNullable(false)).toBe(true);
      expect(isNonNullable([])).toBe(true);
      expect(isNonNullable({})).toBe(true);
    });

    it('should return false for null/undefined', () => {
      expect(isNonNullable(null)).toBe(false);
      expect(isNonNullable(undefined)).toBe(false);
    });
  });
});
