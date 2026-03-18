import React from 'react';
import { getCurrencySymbol } from '../../../../utils/currency';
import type { EditableTaxLineValues } from '../../../../utils/taxLines';
import { Button, Dropdown, FormGroup, InputWithPrefix } from '../../';
import './TaxLinesEditor.css';

interface TaxLinesEditorProps {
  lines: EditableTaxLineValues[];
  currency: string;
  onLineChange: (id: string, field: 'label' | 'rate' | 'amount' | 'taxableIncome' | 'calculationType', value: string) => void;
  onLineBlur: (id: string, field: 'rate' | 'amount' | 'taxableIncome') => void;
  onAddLine: () => void;
  onRemoveLine: (id: string) => void;
  introContent?: React.ReactNode;
  addButtonLabel?: string;
}

const TaxLinesEditor: React.FC<TaxLinesEditorProps> = ({
  lines,
  currency,
  onLineChange,
  onLineBlur,
  onAddLine,
  onRemoveLine,
  introContent,
  addButtonLabel = '+ Add Tax Line',
}) => {
  return (
    <div className="tax-lines-editor">
      {introContent}
      {lines.map((line) => {
        const labelError = line.error === 'Label is required.' ? line.error : undefined;
        const rateError = line.error === 'Rate must be between 0 and 100.' || line.error === 'Rate can have at most 2 decimal places.'
          ? line.error
          : undefined;
        const taxableIncomeError = line.error === 'Taxable income must be zero or greater.' || line.error === 'Taxable income can have at most 2 decimal places.'
          ? line.error
          : undefined;
        const amountError = line.error === 'Amount must be zero or greater.' || line.error === 'Amount can have at most 2 decimal places.'
          ? line.error
          : undefined;

        return (
          <div key={line.id} className="tax-line-card">
            <div className="tax-line-card-row-1">
              <FormGroup label="Name" error={labelError}>
                <input
                  className={`tax-line-card-name${labelError ? ' field-error' : ''}`}
                  type="text"
                  placeholder="Tax Line Name"
                  value={line.label}
                  onChange={(e) => onLineChange(line.id, 'label', e.target.value)}
                />
              </FormGroup>
              <FormGroup label="Calculation Mode">
                <Dropdown
                  className="tax-mode-select"
                  value={line.calculationType === 'fixed' ? 'fixed' : 'rate'}
                  onChange={(e) => onLineChange(line.id, 'calculationType', e.target.value === 'fixed' ? 'fixed' : 'percentage')}
                >
                  <option value="rate">Rate (%)</option>
                  <option value="fixed">Fixed Amount</option>
                </Dropdown>
              </FormGroup>
            </div>

            {line.calculationType === 'fixed' ? (
              <div className="tax-line-card-row-2 tax-line-card-row-2-single">
                <FormGroup label="Amount" error={amountError}>
                  <InputWithPrefix
                    prefix={getCurrencySymbol(currency)}
                    className={amountError ? 'field-error' : ''}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.amount}
                    onChange={(e) => onLineChange(line.id, 'amount', e.target.value)}
                    onBlur={() => onLineBlur(line.id, 'amount')}
                  />
                </FormGroup>
              </div>
            ) : (
              <div className="tax-line-card-row-2">
                <FormGroup label="Rate (%)" error={rateError}>
                  <InputWithPrefix
                    suffix="%"
                    className={rateError ? 'field-error' : ''}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={line.rate}
                    onChange={(e) => onLineChange(line.id, 'rate', e.target.value)}
                    onBlur={() => onLineBlur(line.id, 'rate')}
                  />
                </FormGroup>
                <FormGroup label="Taxable Income" error={taxableIncomeError}>
                  <InputWithPrefix
                    prefix={getCurrencySymbol(currency)}
                    className={taxableIncomeError ? 'field-error' : ''}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.taxableIncome}
                    onChange={(e) => onLineChange(line.id, 'taxableIncome', e.target.value)}
                    onBlur={() => onLineBlur(line.id, 'taxableIncome')}
                  />
                </FormGroup>
              </div>
            )}

            <div className="tax-line-card-actions">
              <Button
                variant="utility"
                className="tax-line-card-delete"
                type="button"
                title="Delete tax line"
                onClick={() => onRemoveLine(line.id)}
              >
                Delete Line
              </Button>
            </div>
          </div>
        );
      })}
      <Button variant="secondary" onClick={onAddLine}>
        {addButtonLabel}
      </Button>
    </div>
  );
};

export default TaxLinesEditor;
