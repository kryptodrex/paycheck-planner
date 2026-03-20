import type { Account } from './accounts';
import type { BudgetData } from './budget';
import type { Bill, Loan, SavingsContribution } from './obligations';
import type { Benefit, Deduction, PaySettings, PaycheckBreakdown, RetirementElection, TaxSettings } from './payroll';
import type { BudgetSettings } from './settings';

export interface BudgetContextType {
  budgetData: BudgetData | null;
  loading: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveBudget: (activeTab?: string, budgetOverride?: Partial<BudgetData>) => Promise<boolean>;
  saveWindowState: (width: number, height: number, x: number, y: number, activeTab?: string) => Promise<void>;
  loadBudget: (filePath?: string) => Promise<void>;
  createNewBudget: (year: number) => void;
  createDemoBudget: () => void;
  closeBudget: () => void;
  selectSaveLocation: () => Promise<void>;
  copyPlanToNewYear: (newYear: number) => Promise<void>;
  updateBudgetData: (
    data: Partial<BudgetData>,
    options?: { trackHistory?: boolean; description?: string }
  ) => void;
  updatePaySettings: (settings: PaySettings) => void;
  addDeduction: (deduction: Omit<Deduction, 'id'>) => void;
  updateDeduction: (id: string, deduction: Partial<Deduction>) => void;
  deleteDeduction: (id: string) => void;
  updateTaxSettings: (settings: TaxSettings) => void;
  updateBudgetSettings: (settings: BudgetSettings) => void;
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (id: string, bill: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  addLoan: (loan: Omit<Loan, 'id'>) => void;
  updateLoan: (id: string, loan: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  addBenefit: (benefit: Omit<Benefit, 'id'>) => void;
  updateBenefit: (id: string, benefit: Partial<Benefit>) => void;
  deleteBenefit: (id: string) => void;
  addSavingsContribution: (contribution: Omit<SavingsContribution, 'id'>) => void;
  updateSavingsContribution: (id: string, contribution: Partial<SavingsContribution>) => void;
  deleteSavingsContribution: (id: string) => void;
  addRetirementElection: (election: Omit<RetirementElection, 'id'>) => void;
  updateRetirementElection: (id: string, election: Partial<RetirementElection>) => void;
  deleteRetirementElection: (id: string) => void;
  calculatePaycheckBreakdown: () => PaycheckBreakdown;
  calculateRetirementContributions: (election: RetirementElection) => { employeeAmount: number; employerAmount: number };
}