import React, { useState, useEffect, useRef } from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import { useAppDialogs } from '../../../hooks';
import type { BudgetData } from '../../../types/budget';
import type { PayFrequency } from '../../../types/frequencies';
import type { PaySettings } from '../../../types/payroll';
import type { AuditHistoryTarget } from '../../../types/audit';
import { convertBudgetAmounts } from '../../../services/budgetCurrencyConversion';
import { CURRENCIES, getCurrencySymbol } from '../../../utils/currency';
import { getDisplayModeLabel, getPaychecksPerYear, getPayFrequencyViewMode } from '../../../utils/payPeriod';
import { normalizeStoredAllocationAmount } from '../../../utils/allocationEditor';
import { APP_CUSTOM_EVENTS } from '../../../constants/events';
import { formatSuggestedLeftover, getSuggestedLeftoverPerPaycheck } from '../../../utils/paySuggestions';
import { Modal, Button, ErrorDialog, Dropdown, FormGroup, InputWithPrefix, FormattedNumberInput, RadioGroup } from '../../_shared';
import '../../_shared/payEditorShared.css';
import './PaySettingsModal.css';

interface PaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchFieldHighlight?: string;
  onViewHistory?: (target: AuditHistoryTarget) => void;
}

type PaySettingsFieldErrors = {
  annualSalary?: string;
  hourlyRate?: string;
  hoursPerWeek?: string;
  minLeftover?: string;
};

const SEARCH_FOCUS_INITIAL_DELAY_MS = 80;
const SEARCH_FOCUS_RETRY_DELAY_MS = 120;
const SEARCH_FOCUS_MAX_RETRIES = 6;
const SEARCH_HIGHLIGHT_DURATION_MS = 1800;

const PaySettingsModal: React.FC<PaySettingsModalProps> = ({ isOpen, onClose, searchFieldHighlight, onViewHistory }) => {
  const { budgetData, updateBudgetData } = useBudget();
  const { errorDialog, openErrorDialog, closeErrorDialog } = useAppDialogs();
  
  // Form state
  const [editPayType, setEditPayType] = useState<'salary' | 'hourly'>('salary');
  const [editAnnualSalary, setEditAnnualSalary] = useState('');
  const [editHourlyRate, setEditHourlyRate] = useState('');
  const [editHoursPerWeek, setEditHoursPerWeek] = useState('');
  const [editPayFrequency, setEditPayFrequency] = useState<PayFrequency>('bi-weekly');
  const [editMinLeftover, setEditMinLeftover] = useState('0');
  // Track previous frequency to scale minLeftover proportionally on change
  const prevEditPayFrequencyRef = useRef<PayFrequency>('bi-weekly');
  const [editCurrency, setEditCurrency] = useState('USD');
  const [originalCurrency, setOriginalCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<PaySettingsFieldErrors>({});
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  // Pre-fill form when modal opens
  useEffect(() => {
    if (isOpen && budgetData) {
      const currentCurrency = budgetData.settings.currency || 'USD';
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditPayType(budgetData.paySettings.payType);
      setEditPayFrequency(budgetData.paySettings.payFrequency);
      prevEditPayFrequencyRef.current = budgetData.paySettings.payFrequency;
      setEditMinLeftover(budgetData.paySettings.minLeftover?.toString() || '0');
      setEditCurrency(currentCurrency);
      setOriginalCurrency(currentCurrency);
      setExchangeRate('');
      setEditAnnualSalary(budgetData.paySettings.annualSalary?.toString() || '');
      setEditHourlyRate(budgetData.paySettings.hourlyRate?.toString() || '');
      const currentPaychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
      const storedHoursPerWeek = (budgetData.paySettings.hoursPerPayPeriod || 0) * (currentPaychecksPerYear / 52);
      setEditHoursPerWeek(storedHoursPerWeek > 0 ? storedHoursPerWeek.toString() : '');
      setFieldErrors({});
    }
  }, [isOpen, budgetData]);

  // Handle Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !searchFieldHighlight) {
      return;
    }

    let attemptsLeft = SEARCH_FOCUS_MAX_RETRIES;

    const focusSearchTarget = () => {
      const container = formContainerRef.current;
      if (!container) {
        return;
      }

      const targetGroup = container.querySelector<HTMLElement>(
        `[data-pay-setting-field="${searchFieldHighlight}"]`,
      );

      if (!targetGroup) {
        if (attemptsLeft > 0) {
          attemptsLeft -= 1;
          window.setTimeout(focusSearchTarget, SEARCH_FOCUS_RETRY_DELAY_MS);
        }
        return;
      }

      const selectedRadio = targetGroup.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]');
      const firstFocusable = targetGroup.querySelector<HTMLElement>('input, select, button, [role="radio"]');
      const focusTarget = selectedRadio || firstFocusable;
      if (!focusTarget) {
        return;
      }

      targetGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
      focusTarget.classList.add('pay-settings-search-field-highlight');
      window.setTimeout(() => {
        focusTarget.classList.remove('pay-settings-search-field-highlight');
      }, SEARCH_HIGHLIGHT_DURATION_MS);

      focusTarget.focus({ preventScroll: true });
    };

    window.setTimeout(focusSearchTarget, SEARCH_FOCUS_INITIAL_DELAY_MS);
  }, [editPayType, isOpen, searchFieldHighlight]);

  if (!budgetData) return null;

  const estimateGrossPerPaycheck = () => {
    const paychecksPerYear = getPaychecksPerYear(editPayFrequency);
    if (paychecksPerYear <= 0) return 0;

    if (editPayType === 'salary') {
      return (parseFloat(editAnnualSalary) || 0) / paychecksPerYear;
    }

    const hoursPerPayPeriod = ((parseFloat(editHoursPerWeek) || 0) * 52) / paychecksPerYear;
    return (parseFloat(editHourlyRate) || 0) * hoursPerPayPeriod;
  };

  const suggestedLeftoverPerPaycheck = getSuggestedLeftoverPerPaycheck(estimateGrossPerPaycheck());

  const formattedSuggestedLeftover = formatSuggestedLeftover(suggestedLeftoverPerPaycheck, editCurrency);

  const handleSaveSettings = () => {
    const parsedAnnualSalary = parseFloat(editAnnualSalary);
    const parsedHourlyRate = parseFloat(editHourlyRate);
    const parsedHoursPerWeek = parseFloat(editHoursPerWeek);
    const paychecksPerYear = getPaychecksPerYear(editPayFrequency);
    const computedHoursPerPayPeriod = Number.isFinite(parsedHoursPerWeek) && paychecksPerYear > 0
      ? (parsedHoursPerWeek * 52) / paychecksPerYear
      : 0;
    const parsedMinLeftover = parseFloat(editMinLeftover);
    const errors: PaySettingsFieldErrors = {};

    if (editPayType === 'salary' && (!Number.isFinite(parsedAnnualSalary) || parsedAnnualSalary <= 0)) {
      errors.annualSalary = 'Please enter a valid annual salary greater than zero.';
    }

    if (editPayType === 'hourly' && (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate <= 0)) {
      errors.hourlyRate = 'Please enter a valid hourly rate greater than zero.';
    }

    if (editPayType === 'hourly' && (!Number.isFinite(parsedHoursPerWeek) || parsedHoursPerWeek <= 0)) {
      errors.hoursPerWeek = 'Please enter valid hours per week greater than zero.';
    }

    if (!Number.isFinite(parsedMinLeftover) || parsedMinLeftover < 0) {
      errors.minLeftover = 'Please enter a valid target leftover amount (zero or greater).';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const paySettings: PaySettings = {
      ...budgetData.paySettings,
      payType: editPayType,
      payFrequency: editPayFrequency,
      minLeftover: parsedMinLeftover,
      ...(editPayType === 'salary'
        ? { annualSalary: parsedAnnualSalary }
        : {
            hourlyRate: parsedHourlyRate,
            hoursPerPayPeriod: computedHoursPerPayPeriod
          }
      ),
    };

    const currencyChanged = editCurrency !== originalCurrency;

    let updatedBudget: BudgetData = {
      ...budgetData,
      paySettings,
      settings: {
        ...budgetData.settings,
        currency: editCurrency,
      },
    };

    // If currency changed and exchange rate provided, convert amounts
    if (currencyChanged && exchangeRate.trim() !== '') {
      const parsedExchangeRate = parseFloat(exchangeRate);
      if (!Number.isFinite(parsedExchangeRate) || parsedExchangeRate <= 0) {
        openErrorDialog({
          title: 'Invalid Exchange Rate',
          message: 'Please enter a valid exchange rate greater than zero, or leave it blank to skip conversion.',
        });
        return;
      }
      updatedBudget = convertBudgetAmounts(updatedBudget, parsedExchangeRate);
    }

    // Migrate custom allocation amounts proportionally when pay frequency changes
    const oldPaychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
    const newPaychecksPerYear = getPaychecksPerYear(editPayFrequency);
    if (oldPaychecksPerYear !== newPaychecksPerYear && oldPaychecksPerYear > 0 && newPaychecksPerYear > 0) {
      const scaleFactor = oldPaychecksPerYear / newPaychecksPerYear;
      updatedBudget = {
        ...updatedBudget,
        accounts: updatedBudget.accounts.map((account) => ({
          ...account,
          allocationCategories: (account.allocationCategories || []).map((category) => {
            // Skip auto-generated categories (bills, benefits, retirement, loans, savings)
            if (
              category.id.startsWith('__bills_') ||
              category.id.startsWith('__benefits_') ||
              category.id.startsWith('__retirement_') ||
              category.id.startsWith('__loans_') ||
              category.id.startsWith('__savings_')
            ) {
              return category;
            }
            return {
              ...category,
              amount: normalizeStoredAllocationAmount(category.amount * scaleFactor),
            };
          }),
        })),
      };
    }

    if (editPayFrequency !== budgetData.paySettings.payFrequency) {
      const cadenceMode = getPayFrequencyViewMode(editPayFrequency);
      updatedBudget = {
        ...updatedBudget,
        settings: {
          ...updatedBudget.settings,
          displayMode: cadenceMode,
        },
      };

      window.dispatchEvent(
        new CustomEvent(APP_CUSTOM_EVENTS.viewModeAutoSwitched, {
          detail: {
            message: `View mode switched to ${getDisplayModeLabel(cadenceMode)}`,
          },
        }),
      );
    }

    updateBudgetData(updatedBudget);

    setFieldErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="pay-settings-modal-content"
      header="Your Pay Details"
      footer={
        <>
          {onViewHistory && (
            <Button 
              variant="secondary" 
              onClick={() => onViewHistory({ entityType: 'pay-settings', entityId: 'pay-settings', title: 'Pay Details' })}
            >
              View History
            </Button>
          )}
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={() => {
            setFieldErrors({});
            setExchangeRate('');
            onClose();
          }}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveSettings}>Save Changes</Button>
        </>
      }
    >
      <div ref={formContainerRef}>
        <FormGroup label="Pay Type">
          <RadioGroup
            name="editPayType"
            value={editPayType}
            onChange={(value) => setEditPayType(value as 'salary' | 'hourly')}
            layout="row"
            options={[
              { value: 'salary', label: 'Annual Salary' },
              { value: 'hourly', label: 'Hourly Wage' },
            ]}
          />
        </FormGroup>

        <FormGroup label="Currency" helperText="Select the currency for this plan.">
          <Dropdown value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)}>
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.name} ({currency.symbol})
              </option>
            ))}
          </Dropdown>
        </FormGroup>

        {editCurrency !== originalCurrency && (
          <FormGroup 
            label="Exchange Rate (Optional)" 
            helperText={`Enter the exchange rate from ${originalCurrency} to ${editCurrency} to convert all existing amounts. Example: if 1 ${originalCurrency} = 0.92 ${editCurrency}, enter 0.92. To convert back, calculate the inverse rate (1 ÷ original_rate) for best precision instead of rounding. Leave blank to only change the currency symbol without converting amounts.`}
          >
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder="e.g., 0.92"
              min="0"
              step="0.00000001"
            />
          </FormGroup>
        )}

        {editPayType === 'salary' ? (
          <div data-pay-setting-field="annualSalary">
            <FormGroup label="Annual Salary" required error={fieldErrors.annualSalary}>
              <FormattedNumberInput
                className={fieldErrors.annualSalary ? 'field-error' : ''}
                prefix={getCurrencySymbol(editCurrency)}
                value={editAnnualSalary}
                decimals={0}
                onChange={(e) => {
                  setEditAnnualSalary(e.target.value);
                  if (fieldErrors.annualSalary) {
                    setFieldErrors((prev) => ({ ...prev, annualSalary: undefined }));
                  }
                }}
                placeholder="65000"
              />
            </FormGroup>
          </div>
        ) : (
          <>
            <div data-pay-setting-field="hourlyRate">
              <FormGroup label="Hourly Rate" required error={fieldErrors.hourlyRate}>
                <InputWithPrefix
                  className={fieldErrors.hourlyRate ? 'field-error' : ''}
                  prefix={getCurrencySymbol(editCurrency)}
                  type="number"
                  value={editHourlyRate}
                  onChange={(e) => {
                    setEditHourlyRate(e.target.value);
                    if (fieldErrors.hourlyRate) {
                      setFieldErrors((prev) => ({ ...prev, hourlyRate: undefined }));
                    }
                  }}
                  min="0"
                  step="0.50"
                />
              </FormGroup>
            </div>
            <FormGroup label="Hours per Week" required error={fieldErrors.hoursPerWeek}>
              <input
                className={fieldErrors.hoursPerWeek ? 'field-error' : ''}
                type="number"
                value={editHoursPerWeek}
                onChange={(e) => {
                  setEditHoursPerWeek(e.target.value);
                  if (fieldErrors.hoursPerWeek) {
                    setFieldErrors((prev) => ({ ...prev, hoursPerWeek: undefined }));
                  }
                }}
                min="0"
                step="1"
              />
            </FormGroup>
          </>
        )}

        <div data-pay-setting-field="payFrequency">
          <FormGroup label="Pay Frequency">
            <RadioGroup
              name="editPayFrequency"
              value={editPayFrequency}
              onChange={(value) => {
                const newFrequency = value as PayFrequency;
                const newOccurrences = getPaychecksPerYear(newFrequency);
                if (newOccurrences > 0 && newFrequency !== prevEditPayFrequencyRef.current) {
                  // Compute gross per new pay period and derive suggestion using the same
                  // 20%-rounded-to-$10 formula as the suggestion banner
                  const newGrossPerPaycheck =
                    editPayType === 'salary'
                      ? (parseFloat(editAnnualSalary) || 0) / newOccurrences
                      : (parseFloat(editHourlyRate) || 0) * (((parseFloat(editHoursPerWeek) || 0) * 52) / newOccurrences);
                  const suggested = getSuggestedLeftoverPerPaycheck(newGrossPerPaycheck);
                  if (suggested > 0) {
                    setEditMinLeftover(String(suggested));
                  }
                }
                prevEditPayFrequencyRef.current = newFrequency;
                setEditPayFrequency(newFrequency);
              }}
              layout="column"
              options={[
                { value: 'weekly', label: 'Weekly', description: '52 per year' },
                { value: 'bi-weekly', label: 'Bi-weekly', description: '26 per year' },
                { value: 'semi-monthly', label: 'Semi-monthly', description: '24 per year' },
                { value: 'monthly', label: 'Monthly', description: '12 per year' },
                { value: 'quarterly', label: 'Quarterly', description: '4 per year' },
                { value: 'yearly', label: 'Yearly', description: '1 per year' },
              ]}
            />
          </FormGroup>
        </div>

        {/* Paycheck scheduling inputs intentionally disabled for now.
            Keep this location reserved for re-enabling first-paycheck/semi-monthly date UX later. */}

        <FormGroup
          label="Target Leftover Per Pay Period"
          helperText="The target amount you want to keep unallocated for spending each time you are paid. If you go below this amount, the app will alert you that you may be over-budget."
          error={fieldErrors.minLeftover}
        >
          <InputWithPrefix
            className={fieldErrors.minLeftover ? 'field-error' : ''}
            prefix={getCurrencySymbol(editCurrency)}
            type="number"
            value={editMinLeftover}
            onChange={(e) => {
              setEditMinLeftover(e.target.value);
              if (fieldErrors.minLeftover) {
                setFieldErrors((prev) => ({ ...prev, minLeftover: undefined }));
              }
            }}
            placeholder="0"
            min="0"
            step="10"
          />
        </FormGroup>

        {formattedSuggestedLeftover && parseInt(formattedSuggestedLeftover.replace(/[^0-9]/g, ''), 10) > parseInt(editMinLeftover || '0', 10) && (
          <div className="leftover-suggestion">
            <div className="leftover-suggestion-copy">
              <strong>Suggested leftover: {formattedSuggestedLeftover} per pay period</strong>
              <span>
                Based on your pay details, this is about 20% of estimated gross pay to leave room for variable spending.
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="small"
              title="Use Suggested Amount"
              onClick={() => {
                setEditMinLeftover(String(suggestedLeftoverPerPaycheck));
                if (fieldErrors.minLeftover) {
                  setFieldErrors((prev) => ({ ...prev, minLeftover: undefined }));
                }
              }}
            >
              Use Suggested Amount
            </Button>
          </div>
        )}
      </div>
      <ErrorDialog
        isOpen={!!errorDialog}
        onClose={closeErrorDialog}
        title={errorDialog?.title || 'Error'}
        message={errorDialog?.message || ''}
        actionLabel={errorDialog?.actionLabel}
      />
    </Modal>
  );
};

export default PaySettingsModal;
