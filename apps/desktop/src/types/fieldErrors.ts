export type PaySettingsFieldErrors = {
  annualSalary?: string;
  hourlyRate?: string;
  hoursPerWeek?: string;
  minLeftover?: string;
};

export type BillFieldErrors = {
  name?: string;
  amount?: string;
  accountId?: string;
};

export type BenefitFieldErrors = {
  name?: string;
  amount?: string;
  sourceAccountId?: string;
};

export type LoanFieldErrors = {
  name?: string;
  accountId?: string;
  paymentLines?: string;
};

export type SavingsFieldErrors = {
  name?: string;
  amount?: string;
  accountId?: string;
};

export type RetirementFieldErrors = {
  employeeAmount?: string;
  sourceAccountId?: string;
  yearlyLimit?: string;
  customLabel?: string;
};

export type OtherIncomeFieldErrors = {
  name?: string;
  amount?: string;
  percentOfGross?: string;
};
