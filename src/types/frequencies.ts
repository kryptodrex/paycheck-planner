import type { AnyFrequency } from '../constants/frequencies';

/** Weekly through yearly — does not include semi-annual or custom. */
export type PayFrequency = Exclude<AnyFrequency, 'semi-annual' | 'custom'>;

/** Alias kept for backwards compatibility — equivalent to PayFrequency. */
export type CoreFrequency = PayFrequency;

/** All frequencies including semi-annual and custom. */
export type BillFrequency = AnyFrequency;

/** All frequencies except custom (used by loan payments and savings). */
export type LoanPaymentFrequency = Exclude<AnyFrequency, 'custom'>;

/** Same set as LoanPaymentFrequency — named separately for domain clarity. */
export type SavingsFrequency = Exclude<AnyFrequency, 'custom'>;
