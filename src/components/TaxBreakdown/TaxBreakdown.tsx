import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { getPaychecksPerYear, convertToDisplayMode, getDisplayModeLabel } from '../../utils/payPeriod';
import { Button, InputWithPrefix, Modal, FormGroup, PageHeader, ViewModeSelector } from '../shared';
import './TaxBreakdown.css';

const TaxBreakdown: React.FC = () => {
    const { budgetData, calculatePaycheckBreakdown, updateBudgetData } = useBudget();
    const [showEditModal, setShowEditModal] = useState(false);
    const [displayMode, setDisplayMode] = useState<'paycheck' | 'monthly' | 'yearly'>('paycheck');
    const [editForm, setEditForm] = useState({
        federalTaxRate: 0,
        stateTaxRate: 0,
        additionalWithholding: 0,
    });
    const [fieldErrors, setFieldErrors] = useState<{
        federalTaxRate?: string;
        stateTaxRate?: string;
        additionalWithholding?: string;
    }>({});

    if (!budgetData) return null;

    const currency = budgetData.settings?.currency || 'USD';
    const breakdown = calculatePaycheckBreakdown();
    const taxSettings = budgetData.taxSettings;

    const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);

    const handleEditStart = () => {
        setEditForm({
            federalTaxRate: taxSettings.federalTaxRate,
            stateTaxRate: taxSettings.stateTaxRate,
            additionalWithholding: taxSettings.additionalWithholding,
        });
        setFieldErrors({});
        setShowEditModal(true);
    };

    const handleEditCancel = () => {
        setShowEditModal(false);
        setFieldErrors({});
    };

    const handleEditSave = () => {
        const errors: {
            federalTaxRate?: string;
            stateTaxRate?: string;
            additionalWithholding?: string;
        } = {};

        if (!Number.isFinite(editForm.federalTaxRate) || editForm.federalTaxRate < 0 || editForm.federalTaxRate > 100) {
            errors.federalTaxRate = 'Federal tax rate must be between 0 and 100.';
        }

        if (!Number.isFinite(editForm.stateTaxRate) || editForm.stateTaxRate < 0 || editForm.stateTaxRate > 100) {
            errors.stateTaxRate = 'State tax rate must be between 0 and 100.';
        }

        if (!Number.isFinite(editForm.additionalWithholding) || editForm.additionalWithholding < 0) {
            errors.additionalWithholding = 'Additional withholding must be zero or greater.';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        updateBudgetData({
            taxSettings: {
                ...taxSettings,
                federalTaxRate: editForm.federalTaxRate,
                stateTaxRate: editForm.stateTaxRate,
                additionalWithholding: editForm.additionalWithholding,
            },
        });
        setShowEditModal(false);
        setFieldErrors({});
    };

    const handleFieldChange = (field: string, value: number) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div className="tax-breakdown">
            <PageHeader
                title="Tax Breakdown"
                subtitle="View and manage your tax withholding information"
                actions={
                    <>
                        <ViewModeSelector mode={displayMode} onChange={setDisplayMode} />
                        <Button variant="secondary" onClick={handleEditStart}>
                            ⚙️ Edit Tax Settings
                        </Button>
                    </>
                }
            />
            <div className="tax-summary">
                <div className="summary-section">
                    <h3>Gross vs. Net Pay ({getDisplayModeLabel(displayMode)})</h3>
                    <div className="summary-table">
                        <div className="summary-row">
                            <span className="label">Gross Pay</span>
                            <span className="amount">{formatWithSymbol(convertToDisplayMode(breakdown.grossPay, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="summary-row">
                            <span className="label">Total Taxes</span>
                            <span className="amount negative">-{formatWithSymbol(convertToDisplayMode(breakdown.totalTaxes, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="summary-row total">
                            <span className="label">Net Pay</span>
                            <span className="amount">{formatWithSymbol(convertToDisplayMode(breakdown.netPay, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <div className="summary-section">
                    <h3>Tax Breakdown ({getDisplayModeLabel(displayMode)})</h3>
                    <div className="summary-table">
                        <div className="summary-row">
                            <span className="label">Federal Tax ({taxSettings.federalTaxRate}%)</span>
                            <span className="amount">{formatWithSymbol(convertToDisplayMode(breakdown.federalTax, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="summary-row">
                            <span className="label">State Tax ({taxSettings.stateTaxRate}%)</span>
                            <span className="amount">{formatWithSymbol(convertToDisplayMode(breakdown.stateTax, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="summary-row">
                            <span className="label">Social Security (6.2%)</span>
                            <span className="amount">{formatWithSymbol(convertToDisplayMode(breakdown.socialSecurity, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="summary-row">
                            <span className="label">Medicare (1.45%)</span>
                            <span className="amount">{formatWithSymbol(convertToDisplayMode(breakdown.medicare, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {breakdown.additionalWithholding > 0 && (
                            <div className="summary-row">
                                <span className="label">Additional Withholding</span>
                                <span className="amount">{formatWithSymbol(convertToDisplayMode(breakdown.additionalWithholding, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="summary-row total">
                            <span className="label">Total Taxes</span>
                            <span className="amount">{formatWithSymbol(convertToDisplayMode(breakdown.totalTaxes, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <div className="summary-section">
                    <h3>Tax Rates & Settings</h3>
                    <div className="settings-table">
                        <div className="settings-row">
                            <span className="label">Federal Tax Rate</span>
                            <span className="value">{taxSettings.federalTaxRate}%</span>
                        </div>
                        <div className="settings-row">
                            <span className="label">State Tax Rate</span>
                            <span className="value">{taxSettings.stateTaxRate}%</span>
                        </div>
                        <div className="settings-row">
                            <span className="label">Social Security Rate</span>
                            <span className="value">{taxSettings.socialSecurityRate}%</span>
                        </div>
                        <div className="settings-row">
                            <span className="label">Medicare Rate</span>
                            <span className="value">{taxSettings.medicareRate}%</span>
                        </div>
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
                <FormGroup label="Federal Tax Rate (%)" required error={fieldErrors.federalTaxRate}>
                    <input
                        className={fieldErrors.federalTaxRate ? 'field-error' : ''}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={Number.isFinite(editForm.federalTaxRate) ? editForm.federalTaxRate : ''}
                        onChange={(e) => {
                            handleFieldChange('federalTaxRate', parseFloat(e.target.value));
                            if (fieldErrors.federalTaxRate) {
                                setFieldErrors((prev) => ({ ...prev, federalTaxRate: undefined }));
                            }
                        }}
                    />
                </FormGroup>

                <FormGroup label="State Tax Rate (%)" required error={fieldErrors.stateTaxRate}>
                    <input
                        className={fieldErrors.stateTaxRate ? 'field-error' : ''}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={Number.isFinite(editForm.stateTaxRate) ? editForm.stateTaxRate : ''}
                        onChange={(e) => {
                            handleFieldChange('stateTaxRate', parseFloat(e.target.value));
                            if (fieldErrors.stateTaxRate) {
                                setFieldErrors((prev) => ({ ...prev, stateTaxRate: undefined }));
                            }
                        }}
                    />
                </FormGroup>

                <FormGroup label="Additional Withholding per Paycheck" error={fieldErrors.additionalWithholding}>
                    <InputWithPrefix
                        className={fieldErrors.additionalWithholding ? 'field-error' : ''}
                        prefix={getCurrencySymbol(currency)}
                        type="number"
                        min="0"
                        step="0.01"
                        value={Number.isFinite(editForm.additionalWithholding) ? editForm.additionalWithholding : ''}
                        onChange={(e) => {
                            handleFieldChange('additionalWithholding', parseFloat(e.target.value));
                            if (fieldErrors.additionalWithholding) {
                                setFieldErrors((prev) => ({ ...prev, additionalWithholding: undefined }));
                            }
                        }}
                    />
                </FormGroup>
            </Modal>
        </div>
    );
};

export default TaxBreakdown;
