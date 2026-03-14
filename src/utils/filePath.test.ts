import { describe, expect, it } from 'vitest';
import { getBaseFileName, getPlanNameFromPath, stripFileExtension } from './filePath';

describe('filePath utilities', () => {
  it('gets the base file name for unix and windows paths', () => {
    expect(getBaseFileName('/plans/Paycheck Planner.budget')).toBe('Paycheck Planner.budget');
    expect(getBaseFileName('C:\\plans\\Paycheck Planner.budget')).toBe('Paycheck Planner.budget');
  });

  it('handles trailing separators and empty input', () => {
    expect(getBaseFileName('/plans/archive/')).toBe('archive');
    expect(getBaseFileName('')).toBeNull();
    expect(getBaseFileName(undefined)).toBeNull();
  });

  it('strips only the final file extension', () => {
    expect(stripFileExtension('plan.budget')).toBe('plan');
    expect(stripFileExtension('plan.backup.budget')).toBe('plan.backup');
    expect(stripFileExtension('.env')).toBe('.env');
  });

  it('derives plan names with trimming and extension removal', () => {
    expect(getPlanNameFromPath('/plans/  Household Budget.budget  ')).toBe('Household Budget');
    expect(getPlanNameFromPath('C:\\plans\\Quarterly Review')).toBe('Quarterly Review');
  });

  it('returns null for whitespace-only names', () => {
    expect(getPlanNameFromPath('/plans/   ')).toBeNull();
  });
});