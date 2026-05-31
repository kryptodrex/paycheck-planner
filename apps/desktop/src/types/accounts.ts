export interface AccountAllocationCategory {
  id: string;
  name: string;
  amount: number;
  isBill?: boolean;
  billCount?: number;
  isBenefit?: boolean;
  benefitCount?: number;
  isRetirement?: boolean;
  retirementCount?: number;
  isLoan?: boolean;
  loanCount?: number;
  isSavings?: boolean;
  savingsCount?: number;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'other';
  allocation?: number;
  isRemainder?: boolean;
  priority?: number;
  allocationCategories?: AccountAllocationCategory[];
  color: string;
  icon?: string;
}