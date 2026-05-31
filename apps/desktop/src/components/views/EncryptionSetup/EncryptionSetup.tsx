// Encryption Setup Component - Shown on first launch
// Allows users to configure encryption or skip it
import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAppDialogs, useEncryptionSetupFlow } from '../../../hooks';
import { Button, EncryptionConfigPanel, ErrorDialog } from '../../_shared';
import '../views.shared.css';
import './EncryptionSetup.css';

interface EncryptionSetupProps {
  onComplete: (encryptionEnabled: boolean) => void;  // Called when setup is finished with selected state
  onCancel?: () => void;   // Called when user wants to exit without completing
  planId?: string;         // Plan ID to associate with the encryption key
}

const EncryptionSetup: React.FC<EncryptionSetupProps> = ({ onComplete, onCancel, planId }) => {
  const { errorDialog, openErrorDialog, closeErrorDialog } = useAppDialogs();
  const {
    encryptionEnabled,
    setEncryptionEnabled,
    customKey,
    setCustomKey,
    generatedKey,
    useCustomKey,
    setUseCustomKey,
    isSaving,
    canSaveSelection,
    generateKey,
    goBackToSelection,
    saveSelection,
  } = useEncryptionSetupFlow();

  // Save encryption settings and continue
  const handleSaveSettings = async () => {
    const result = await saveSelection({
      planId,
      persistAppSettings: true,
      deleteStoredKeyWhenDisabled: true,
    });

    if (!result.success) {
      openErrorDialog(result.errorDialog);
      return;
    }

    onComplete(result.encryptionEnabled);
  };

  // Reusable encryption config UI (used by SetupWizard too)
  return (
    <div className="view-screen encryption-setup">
      <div className="view-screen-card setup-card">
        <h1 className="encryption-title-with-icon">
          <ShieldCheck className="ui-icon" aria-hidden="true" />
          {encryptionEnabled ? 'Encryption Key Setup' : 'Security Setup'}
        </h1>
        <p className="subtitle">
          {encryptionEnabled ? 'This key will be used to encrypt and decrypt your budget files' : 'Choose how you want to protect your budget files'}
        </p>

        <EncryptionConfigPanel
          encryptionEnabled={encryptionEnabled}
          setEncryptionEnabled={setEncryptionEnabled}
          useCustomKey={useCustomKey}
          setUseCustomKey={setUseCustomKey}
          customKey={customKey}
          setCustomKey={setCustomKey}
          generatedKey={generatedKey}
          onGenerateKey={generateKey}
        />

        <div className="button-group">
          {encryptionEnabled === null ? (
            onCancel && (
              <Button
                variant="secondary"
                onClick={onCancel}
                disabled={isSaving}
              >
                <ArrowLeft className="ui-icon ui-icon-sm" aria-hidden="true" />
                Cancel
              </Button>
            )
          ) : (
            <Button
              variant="secondary"
              onClick={goBackToSelection}
              disabled={isSaving}
            >
              <ArrowLeft className="ui-icon ui-icon-sm" aria-hidden="true" />
              Back
            </Button>
          )}
          <Button 
            variant="primary" 
            onClick={handleSaveSettings}
            disabled={!canSaveSelection || isSaving}
            loadingText="Saving..."
            isLoading={isSaving}
          >
            Continue
          </Button>
        </div>

        <ErrorDialog
          isOpen={!!errorDialog}
          onClose={closeErrorDialog}
          title={errorDialog?.title || 'Error'}
          message={errorDialog?.message || ''}
          actionLabel={errorDialog?.actionLabel}
        />
      </div>
    </div>
  );
};

export default EncryptionSetup;
