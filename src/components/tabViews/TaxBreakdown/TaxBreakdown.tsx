import React, { useState } from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import { formatWithSymbol, getCurrencySymbol } from '../../../utils/currency';
import { getPaychecksPerYear, convertToDisplayMode, getDisplayModeLabel, formatPayFrequencyLabel } from '../../../utils/payPeriod';
import { Button, InputWithPrefix, Modal, FormGroup, PageHeader, ViewModeSelector } from '../../_shared';
import { GlossaryTerm } from '../../modals/GlossaryModal';
import type { TaxLine } from '../../../types/payroll';
import type { ViewMode } from '../../../types/viewMode';
import './TaxBreakdown.css';

interface TaxBreakdownProps {
    displayMode: ViewMode;
    onDisplayModeChange: (mode: ViewMode) => void;
}

interface EditableTaxLine {
    id: string;
    label: string;
    rate: string; // string for controlled input
    error?: string;
}

const TaxBreakdown: React.FC<TaxBreakdownProps> = ({ displayMode, onDisplayModeChange }) => {
    const { budgetData, calculatePaycheckBreakdown, updateBudgetData } = useBudget();
    const [showEditModal, setShowEditModal] = useState(false);
    const [editLines, setEditLines] = useState<EditableTaxLine[]>([]);
    const [additionalWithholding, setAdditionalWithholding] = useState('0');
    const [additionalWithholdingError, setAdditionalWithholdingError] = useState<string | undefined>();

    if (!budgetData) return null;

    const currency = budgetData.settings?.currency || 'USD';
    const breakdown = calculatePaycheckBreakdown();
    const taxSettings = budgetData.taxSettings;
    const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
    const payFrequencyLabel = formatPayFrequencyLabel(budgetData.paySettings.payFrequency);

    const handleEditStart = () => {
        setEditLines(
            (taxSettings.taxLines || []).map(line => ({
                id: line.id,
                label: line.label,
                rate: String(line.rate),
            }))
        );
        setAdditionalWithholding(String(taxSettings.additionalWithholding ?? 0));
        setAdditionalWithholdingError(undefined);
        setShowEditModal(true);
    };

    const handleEditCancel = () => {
        setShowEditModal(false);
    };

    const handleLineChange = (id: string, field: 'label' | 'rate', value: string) => {
        setEditLines(prev => prev.map(line =>
            line.id === id ? { ...line, [field]: value, error: undefined } : line
        ));
    };

    const handleAddLine = () => {
        setEditLines(prev => [
            ...prev,
            { id: crypto.randomUUID(), label: '', rate: '0' },
        ]);
    };

    const handleRemoveLine = (id: string) => {
        setEditLines(prev => prev.filter(line => line.id !== id));
    };

    const handleEditSave = () => {
        let hasErrors = false;
        const validated = editLines.map(line => {
            const parsedRate = parseFloat(line.rate);
            if (line.label.trim() === '') {
                hasErrors = true;
                return { ...line, error: 'Label is required.' };
            }
            if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
                hasErrors = true;
                return { ...line, error: 'Rate must be between 0 and 100.' };
            }
            return { ...line, error: undefined };
        });

        const parsedWithholding = parseFloat(additionalWithholding);
        if (!Number.isFinite(parsedWithholding) || parsedWithholding < 0) {
            setAdditionalWithholdingError('Additional withholding must be zero or greater.');
            hasErrors = true;
        } else {
            setAdditionalWithholdingError(undefined);
        }

        setEditLines(validated);
        if (hasErrors) return;

        const newTaxLines: TaxLine[] = validated.map(line => ({
            id: line.id,
            label: line.label.trim(),
            rate: parseFloat(line.rate),
        }));

        updateBudgetData({
            taxSettings: {
                taxLines: newTaxLines,
                additionalWithholding: parsedWithholding,
            },
        });
        setShowEditModal(false);
    };

    return (
        <div className="tax-breakdown">
            <PageHeader
                title="Tax Breakdown"
                subtitle="View and manage your tax withholding information"
                actions={
                    <>
                                                <ViewModeSelector
                                                    mode={displayMode}
                                                    onChange={onDisplayModeChange}
                                                    hintText={`Current setting: ${payFrequencyLabel}`}
                                                    hintVisibleModes={['paycheck']}
                                                    reserveHintSpace
                                                />
                    </>
                }
            />
            <div className="tax-summary">
                <div className="summary-section">
                    <h3><GlossaryTerm termId="withholding">Tax Breakdown</GlossaryTerm> ({getDisplayModeLabel(displayMode)})</h3>
                    <div className="summary-table">
                        {breakdown.taxLineAmounts.map(line => (
                            <div key={line.id} className="summary-row">
                                <span className="label">{line.label} ({taxSettings.taxLines.find(l => l.id === line.id)?.rate ?? 0}%)</span>
                                <span className="amount">{formatWithSymbol(convertToDisplayMode(line.amount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                        {breakdown.additionalWithholding > 0 && (
                            <div className="summary-row">
                                <span className="label"><GlossaryTerm termId="withholding">Additional Withholding</GlossaryTerm></span>
                                <span className="amount">{formatWithSymbol(convertToDisplayMode(breakdown.additionalWithholding, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="summary-row total">
                            <span className="label"><GlossaryTerm termId="withholding">Total Taxes</GlossaryTerm></span>
                            <span className="amount">{formatWithSymbol(convertToDisplayMode(breakdown.totalTaxes, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <div className="summary-section">
                    <div className="settings-header">
                        <h3>Tax Rates & Settings</h3>
                        <Button variant="primary" onClick={handleEditStart}>
                            Edit
                        </Button>
                    </div>
                    <div className="settings-table">
                        {taxSettings.taxLines.map(line => (
                            <div key={line.id} className="settings-row">
                                <span className="label">{line.label}</span>
                                <span className="value">{line.rate}%</span>
                            </div>
                        ))}
                        <div className="settings-row">
                            <span className="label">Additional Withholding per Paycheck</span>
                            <span className="value">{formatWithSymbol(taxSettings.additionalWithholding, currency, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Tax Settings Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={handleEditCancel}
                contentClassName="tax-settings-modal"
                header="Edit Tax Settings"
                footer={
                    <>
                        <Button variant="secondary" onClick={handleEditCancel}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleEditSave}>
                            Save Changes
                        </Button>
                    </>
                }
            >
                <div className="tax-lines-editor">
                    <div className="tax-lines-header">
                        <span className="col-label">Name</span>
                        <span className="col-rate">Rate (%)</span>
                        <span className="col-actions" />
                    </div>
                    {editLines.map(line => (
                        <div key={line.id} className="tax-line-row">
                            <div className="tax-line-fields">
                                <input
                                    className={`tax-line-label-input${line.error === 'Label is required.' ? ' field-error' : ''}`}
                                    type="text"
                                    placeholder="e.g. Federal Tax"
                                    value={line.label}
                                    onChange={e => handleLineChange(line.id, 'label', e.target.value)}
                                />
                                <InputWithPrefix
                                    suffix="%"
                                    className={line.error && line.error !== 'Label is required.' ? 'field-error' : ''}
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={line.rate}
                                    onChange={e => handleLineChange(line.id, 'rate', e.target.value)}
                                />
                                <Button
                                    variant="remove"
                                    type="button"
                                    title="Remove tax line"
                                    onClick={() => handleRemoveLine(line.id)}
                                >
                                    ✕
                                </Button>
                            </div>
                            {line.error && <div className="tax-line-error">{line.error}</div>}
                        </div>
                    ))}
                    <Button variant="secondary" onClick={handleAddLine}>
                        + Add Tax Line
                    </Button>
                </div>

                <div className="tax-lines-divider" />

                <FormGroup label={<><GlossaryTerm termId="withholding">Additional Withholding per Paycheck</GlossaryTerm></>} error={additionalWithholdingError}>
                    <InputWithPrefix
                        className={additionalWithholdingError ? 'field-error' : ''}
                        prefix={getCurrencySymbol(currency)}
                        type="number"
                        min="0"
                        step="0.01"
                        value={additionalWithholding}
                        onChange={e => {
                            setAdditionalWithholding(e.target.value);
                            if (additionalWithholdingError) setAdditionalWithholdingError(undefined);
                        }}
                    />
                </FormGroup>
            </Modal>
        </div>
    );
};

export default TaxBreakdown;
