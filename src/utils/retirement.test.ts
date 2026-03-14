import { describe, expect, it } from 'vitest';
import { getRetirementPlanDisplayLabel, RETIREMENT_PLAN_OPTIONS } from './retirement';

describe('retirement utils', () => {
  it('returns canonical labels for known retirement plan types', () => {
    expect(getRetirementPlanDisplayLabel({ type: '401k', customLabel: '' })).toBe('401(k)');
    expect(getRetirementPlanDisplayLabel({ type: '403b', customLabel: '' })).toBe('403(b)');
    expect(getRetirementPlanDisplayLabel({ type: 'roth-ira', customLabel: '' })).toBe('Roth IRA');
    expect(getRetirementPlanDisplayLabel({ type: 'traditional-ira', customLabel: '' })).toBe('Traditional IRA');
    expect(getRetirementPlanDisplayLabel({ type: 'pension', customLabel: '' })).toBe('Pension');
  });

  it('uses trimmed custom label for other type when provided', () => {
    expect(getRetirementPlanDisplayLabel({ type: 'other', customLabel: '  Mega Backdoor Roth  ' })).toBe(
      'Mega Backdoor Roth'
    );
  });

  it('falls back to Other label when custom label is empty for other type', () => {
    expect(getRetirementPlanDisplayLabel({ type: 'other', customLabel: '   ' })).toBe('Other');
  });

  it('exports supported retirement options for UI selectors', () => {
    expect(RETIREMENT_PLAN_OPTIONS.map((option) => option.value)).toEqual([
      '401k',
      '403b',
      'roth-ira',
      'traditional-ira',
      'pension',
      'other',
    ]);
  });
});
