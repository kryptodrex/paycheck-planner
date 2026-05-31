import { describe, expect, it } from 'vitest';
import {
  calculateOtherIncomeAutoWithholdingDetail,
  getOtherIncomeWithholdingProfiles,
  resolveOtherIncomeWithholdingProfile,
} from './otherIncomeWithholding';

describe('otherIncomeWithholding', () => {
  it('exposes default withholding profiles', () => {
    const profiles = getOtherIncomeWithholdingProfiles();
    expect(profiles.map((profile) => profile.id)).toEqual([
      'supplemental-bonus',
      'self-employed-estimated',
      'rental-income-estimated',
      'retirement-withdrawal-estimated',
      'general-supplemental',
    ]);
  });

  it('resolves a default profile from income type when no explicit profile is set', () => {
    const profile = resolveOtherIncomeWithholdingProfile({
      id: 'entry-1',
      name: 'Annual Bonus',
      incomeType: 'bonus',
      amountMode: 'fixed',
      amount: 5000,
      frequency: 'yearly',
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'auto',
    });

    expect(profile.id).toBe('supplemental-bonus');
    expect(profile.rate).toBe(22);
  });

  it('prefers an explicit profile id when provided', () => {
    const profile = resolveOtherIncomeWithholdingProfile({
      id: 'entry-2',
      name: 'Rental Income',
      incomeType: 'rental-income',
      amountMode: 'fixed',
      amount: 1200,
      frequency: 'monthly',
      isTaxable: true,
      payTreatment: 'taxable',
      withholdingMode: 'auto',
      withholdingProfileId: 'general-supplemental',
    });

    expect(profile.id).toBe('general-supplemental');
    expect(profile.rate).toBe(22);
  });

  it('builds auto withholding details for taxable/gross auto entries', () => {
    const detail = calculateOtherIncomeAutoWithholdingDetail({
      id: 'entry-3',
      name: 'Side Business',
      incomeType: 'personal-business',
      amountMode: 'fixed',
      amount: 1000,
      frequency: 'monthly',
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'auto',
    }, 120);

    expect(detail).toEqual({
      entryId: 'entry-3',
      entryName: 'Side Business',
      payTreatment: 'gross',
      profileId: 'self-employed-estimated',
      profileLabel: 'Self-Employed Estimated',
      rate: 24,
      taxableBase: 120,
      amount: 28.8,
    });
  });

  it('returns null for net or non-auto entries', () => {
    expect(calculateOtherIncomeAutoWithholdingDetail({
      id: 'entry-4',
      name: 'Reimbursement',
      incomeType: 'other',
      amountMode: 'fixed',
      amount: 250,
      frequency: 'monthly',
      isTaxable: false,
      payTreatment: 'net',
      withholdingMode: 'auto',
    }, 250)).toBeNull();

    expect(calculateOtherIncomeAutoWithholdingDetail({
      id: 'entry-5',
      name: 'Bonus',
      incomeType: 'bonus',
      amountMode: 'fixed',
      amount: 500,
      frequency: 'yearly',
      isTaxable: true,
      payTreatment: 'gross',
      withholdingMode: 'manual',
    }, 50)).toBeNull();
  });
});
