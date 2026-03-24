import React, { useState } from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import { exportToPDF, type PDFExportOptions } from '../../../services/pdfExport';
import { Modal, Button, FormGroup } from '../../_shared';
import './ExportModal.css';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { budgetData } = useBudget();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includePayBreakdown, setIncludePayBreakdown] = useState(true);
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [includeBills, setIncludeBills] = useState(true);
  const [includeBenefits, setIncludeBenefits] = useState(true);
  const [includeRetirement, setIncludeRetirement] = useState(true);
  const [includeTaxes, setIncludeTaxes] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (!budgetData) return;

    // Validate passwords match if password is provided
    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      // Open save dialog
      const filePath = await window.electronAPI.savePdfDialog(budgetData.name);
      if (!filePath) {
        setIsExporting(false);
        return; // User canceled
      }

      // Prepare export options
      const options: PDFExportOptions = {
        password: password || undefined,
        includeMetrics,
        includePayBreakdown,
        includeAccounts,
        includeBills,
        includeBenefits,
        includeRetirement,
        includeTaxes,
      };

      // Generate PDF
      const pdfData = await exportToPDF(budgetData, options);

      // Save PDF file
      const result = await window.electronAPI.exportPdf(filePath, pdfData);

      if (result.success) {
        // Success - close modal
        onClose();
        // Reset form
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(result.error || 'Failed to save PDF');
      }
    } catch (err: unknown) {
      console.error('Error exporting PDF:', err);
      const message = err instanceof Error ? err.message : 'An error occurred while exporting PDF';
      setError(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      contentClassName="export-modal-content"
      header="Export to PDF"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </>
      }
    >
      <div className="export-modal-body">
        <FormGroup 
          label="Sections to Include" 
          helperText="Select which sections to include in the PDF export"
        >
          <div className="export-sections">
            <label className="export-checkbox">
              <input
                type="checkbox"
                checked={includeMetrics}
                onChange={(e) => setIncludeMetrics(e.target.checked)}
              />
              <span>Key Metrics</span>
            </label>
            <label className="export-checkbox">
              <input
                type="checkbox"
                checked={includePayBreakdown}
                onChange={(e) => setIncludePayBreakdown(e.target.checked)}
              />
              <span>Pay Breakdown</span>
            </label>
            <label className="export-checkbox">
              <input
                type="checkbox"
                checked={includeTaxes}
                onChange={(e) => setIncludeTaxes(e.target.checked)}
              />
              <span>Tax Settings</span>
            </label>
            <label className="export-checkbox">
              <input
                type="checkbox"
                checked={includeBenefits}
                onChange={(e) => setIncludeBenefits(e.target.checked)}
              />
              <span>Deductions</span>
            </label>
            <label className="export-checkbox">
              <input
                type="checkbox"
                checked={includeRetirement}
                onChange={(e) => setIncludeRetirement(e.target.checked)}
              />
              <span>Retirement</span>
            </label>
            <label className="export-checkbox">
              <input
                type="checkbox"
                checked={includeAccounts}
                onChange={(e) => setIncludeAccounts(e.target.checked)}
              />
              <span>Accounts</span>
            </label>
            <label className="export-checkbox">
              <input
                type="checkbox"
                checked={includeBills}
                onChange={(e) => setIncludeBills(e.target.checked)}
              />
              <span>Bills</span>
            </label>
          </div>
        </FormGroup>

        <FormGroup 
          label="Password Protection (Optional)" 
          helperText="Add a password to protect the PDF. Leave blank for no protection."
        >
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error === 'Passwords do not match') setError('');
            }}
            placeholder="Enter password"
          />
        </FormGroup>

        {password && (
          <FormGroup label="Confirm Password">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error === 'Passwords do not match') setError('');
              }}
              placeholder="Confirm password"
              className={error === 'Passwords do not match' ? 'field-error' : ''}
            />
          </FormGroup>
        )}

        {error && (
          <div className="export-error">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExportModal;
