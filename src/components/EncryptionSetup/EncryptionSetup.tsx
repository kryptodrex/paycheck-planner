// Encryption Setup Component - Shown on first launch
// Allows users to configure encryption or skip it
import React, { useState } from 'react';
import { FileStorageService } from '../../services/fileStorage';
import { KeychainService } from '../../services/keychainService';
import EncryptionConfigPanel from './EncryptionConfigPanel';
import './EncryptionSetup.css';

interface EncryptionSetupProps {
  onComplete: (encryptionEnabled: boolean) => void;  // Called when setup is finished with selected state
  onCancel?: () => void;   // Called when user wants to exit without completing
  planId?: string;         // Plan ID to associate with the encryption key
}

const EncryptionSetup: React.FC<EncryptionSetupProps> = ({ onComplete, onCancel, planId }) => {
  const [encryptionEnabled, setEncryptionEnabled] = useState<boolean | null>(null);
  const [customKey, setCustomKey] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [showCustomKey, setShowCustomKey] = useState(false);
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Generate a new random encryption key
  const handleGenerateKey = () => {
    const key = FileStorageService.generateEncryptionKey();
    setGeneratedKey(key);
    setUseCustomKey(false);
  };

  // Save encryption settings and continue
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const settings = FileStorageService.getAppSettings();
      
      if (encryptionEnabled) {
        const keyToUse = useCustomKey ? customKey : generatedKey;
        
        if (!keyToUse) {
          alert('Please generate or enter an encryption key.');
          setIsSaving(false);
          return;
        }
        
        settings.encryptionEnabled = true;
        // Don't store the key in localStorage - it goes to keychain
        
        // If we have a plan ID, save the key to keychain for that plan
        if (planId) {
          await KeychainService.saveKey(planId, keyToUse);
        }
      } else {
        settings.encryptionEnabled = false;
        if (planId) {
          await KeychainService.deleteKey(planId);
        }
        // No key needed for unencrypted plans
      }
      
      FileStorageService.saveAppSettings(settings);
      onComplete(Boolean(encryptionEnabled));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save encryption settings: ${errorMsg}`);
      setIsSaving(false);
    }
  };

  // Reusable encryption config UI (used by SetupWizard too)
  return (
    <div className="encryption-setup">
      <div className="setup-card">
        <h1>{encryptionEnabled ? '🔐 Encryption Key Setup' : '🔐 Security Setup'}</h1>
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
          showKey={showCustomKey}
          setShowKey={setShowCustomKey}
          onGenerateKey={handleGenerateKey}
        />

        <div className="button-group">
          {encryptionEnabled === null ? (
            onCancel && (
              <button
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={isSaving}
              >
                ← Cancel
              </button>
            )
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => setEncryptionEnabled(null)}
              disabled={isSaving}
            >
              ← Back
            </button>
          )}
          <button 
            className="btn btn-primary" 
            onClick={handleSaveSettings}
            hidden={
              encryptionEnabled === null ||
              (encryptionEnabled === true && !useCustomKey && !generatedKey) ||
              isSaving
            }
          >
            {isSaving
              ? 'Saving...'
              : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncryptionSetup;
