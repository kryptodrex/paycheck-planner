import type { OtherIncome, OtherIncomeType } from '../types/payroll';
import { roundUpToCent } from './money';

export interface OtherIncomeWithholdingProfile {
  id: string;
  label: string;
  rate: number;
}

export interface OtherIncomeAutoWithholdingDetail {
  entryId: string;
  entryName: string;
  payTreatment: OtherIncome['payTreatment'];
  profileId: string;
  profileLabel: string;
  rate: number;
  taxableBase: number;
  amount: number;
}

const OTHER_INCOME_WITHHOLDING_PROFILES: ReadonlyArray<OtherIncomeWithholdingProfile> = [
  { id: 'supplemental-bonus', label: 'Supplemental Bonus', rate: 22 },
  { id: 'self-employed-estimated', label: 'Self-Employed Estimated', rate: 24 },
  { id: 'rental-income-estimated', label: 'Rental Income Estimated', rate: 18 },
  { id: 'retirement-withdrawal-estimated', label: 'Retirement Withdrawal Estimated', rate: 20 },
  { id: 'general-supplemental', label: 'General Supplemental Income', rate: 22 },
];

const DEFAULT_PROFILE_BY_INCOME_TYPE: Readonly<Record<OtherIncomeType, string>> = {
  bonus: 'supplemental-bonus',
  'personal-business': 'self-employed-estimated',
  'rental-income': 'rental-income-estimated',
  'retirement-withdrawal': 'retirement-withdrawal-estimated',
  other: 'general-supplemental',
};

const profilesById = new Map<string, OtherIncomeWithholdingProfile>(
  OTHER_INCOME_WITHHOLDING_PROFILES.map((profile) => [profile.id, profile]),
);

export function getOtherIncomeWithholdingProfiles(): ReadonlyArray<OtherIncomeWithholdingProfile> {
  return OTHER_INCOME_WITHHOLDING_PROFILES;
}

function getDefaultProfileIdForIncomeType(incomeType: OtherIncome['incomeType']): string {
  return DEFAULT_PROFILE_BY_INCOME_TYPE[incomeType] || DEFAULT_PROFILE_BY_INCOME_TYPE.other;
}

export function resolveOtherIncomeWithholdingProfile(entry: OtherIncome): OtherIncomeWithholdingProfile {
  const explicitProfile = entry.withholdingProfileId ? profilesById.get(entry.withholdingProfileId) : undefined;
  if (explicitProfile) {
    return explicitProfile;
  }

  const defaultProfileId = getDefaultProfileIdForIncomeType(entry.incomeType);
  return profilesById.get(defaultProfileId) || OTHER_INCOME_WITHHOLDING_PROFILES[0];
}

export function calculateOtherIncomeAutoWithholdingDetail(
  entry: OtherIncome,
  taxableBase: number,
): OtherIncomeAutoWithholdingDetail | null {
  if (entry.enabled === false || entry.withholdingMode !== 'auto' || entry.payTreatment === 'net') {
    return null;
  }

  const normalizedTaxableBase = Math.max(0, taxableBase);
  if (normalizedTaxableBase <= 0) {
    return null;
  }

  const profile = resolveOtherIncomeWithholdingProfile(entry);
  const normalizedRate = Math.max(0, profile.rate);
  const amount = roundUpToCent((normalizedTaxableBase * normalizedRate) / 100);

  if (amount <= 0) {
    return null;
  }

  return {
    entryId: entry.id,
    entryName: entry.name,
    payTreatment: entry.payTreatment,
    profileId: profile.id,
    profileLabel: profile.label,
    rate: normalizedRate,
    taxableBase: roundUpToCent(normalizedTaxableBase),
    amount,
  };
}
