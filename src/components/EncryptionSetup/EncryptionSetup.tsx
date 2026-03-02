// Encryption Setup Component - Shown on first launch
// Allows users to configure encryption or skip it
import React, { useState } from 'react';
import { FileStorageService } from '../../services/fileStorage';
import { KeychainService } from '../../services/keychainService';
import './EncryptionSetup.css';

interface EncryptionSetupProps {
  onComplete: () => void;  // Called when setup is finished
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
        // No key needed for unencrypted plans
      }
      
      FileStorageService.saveAppSettings(settings);
      onComplete();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save encryption settings: ${errorMsg}`);
      setIsSaving(false);
    }
  };

  // User chose not to use encryption
  const handleSkipEncryption = () => {
    setEncryptionEnabled(false);
  };

  // User chose to use encryption
  const handleEnableEncryption = () => {
    setEncryptionEnabled(true);
    handleGenerateKey(); // Auto-generate a key
  };

  // First screen: Choose encryption or not
  if (encryptionEnabled === null) {
    return (
      <div className="encryption-setup">
        <div className="setup-card">
          <h1>🔐 Security Setup</h1>
          <p className="subtitle">Choose how you want to protect your budget files</p>
          
          <div className="setup-options">
            <div className="option-card">
              <div className="option-icon">🔒</div>
              <h3>Enable Encryption</h3>
              <p>Your budget files will be encrypted with AES-256 encryption. Recommended for sensitive financial data.</p>
              <ul className="feature-list">
                <li>✓ Maximum security</li>
                <li>✓ Files unreadable without key</li>
                <li>⚠️ Must remember your key</li>
              </ul>
              <button className="btn btn-primary" onClick={handleEnableEncryption}>
                Enable Encryption
              </button>
            </div>

            <div className="option-card">
              <div className="option-icon">📄</div>
              <h3>No Encryption</h3>
              <p>Your budget files will be saved as plain text JSON. Easier to backup and access, but not secure.</p>
              <ul className="feature-list">
                <li>✓ Simple and easy</li>
                <li>✓ No key to remember</li>
                <li>⚠️ Files are readable by anyone</li>
              </ul>
              <button className="btn btn-secondary" onClick={handleSkipEncryption}>
                Skip Encryption
              </button>
            </div>
          </div>

          <p className="note">
            💡 You can change this setting later in the app
          </p>

          {onCancel && (
            <div className="button-group" style={{ marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={onCancel}>
                ← Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not using encryption - confirm and continue
  if (!encryptionEnabled) {
    return (
      <div className="encryption-setup">
        <div className="setup-card">
          <h1>No Encryption</h1>
          <p>Your budget files will be saved without encryption.</p>
          <div className="warning-box">
            <strong>⚠️ Important:</strong> Your budget files will be readable by anyone who has access to them. 
            Only choose this option if you're comfortable with that.
          </div>
          <div className="button-group">
            <button 
              className="btn btn-primary" 
              onClick={handleSaveSettings}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Continue Without Encryption'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setEncryptionEnabled(null)}
              disabled={isSaving}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Using encryption - setup key
  return (
    <div className="encryption-setup">
      <div className="setup-card">
        <h1>🔐 Encryption Key Setup</h1>
        <p className="subtitle">This key will be used to encrypt and decrypt your budget files</p>

        <div className="key-section">
          <h3>Choose Your Encryption Key</h3>
          
          <div className="radio-option">
            <label>
              <input 
                type="radio" 
                checked={!useCustomKey}
                onChange={() => setUseCustomKey(false)}
              />
              <span>Use Generated Key (Recommended)</span>
            </label>
            {!useCustomKey && (
              <div className="key-display">
                {generatedKey ? (
                  <>
                    <div className="key-box">
                      <code>{showCustomKey ? generatedKey : '••••••••••••••••••••••••••••••••'}</code>
                      <button 
                        className="btn-icon"
                        onClick={() => setShowCustomKey(!showCustomKey)}
                        title={showCustomKey ? 'Hide key' : 'Show key'}
                      >
                        {showCustomKey ? '🙈' : '👁️'}
                      </button>
                      <button 
                        className="btn-icon"
                        onClick={() => navigator.clipboard.writeText(generatedKey)}
                        title="Copy to clipboard"
                      >
                        📋
                      </button>
                    </div>
                    <button className="btn btn-small" onClick={handleGenerateKey}>
                      🔄 Generate New Key
                    </button>
                    <div className="warning-box">
                      <strong>⚠️ Save This Key!</strong> Write it down or store it in a password manager. 
                      You'll need it to access your encrypted budget files.
                    </div>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={handleGenerateKey}>
                    Generate Secure Key
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="radio-option">
            <label>
              <input 
                type="radio" 
                checked={useCustomKey}
                onChange={() => setUseCustomKey(true)}
              />
              <span>Use Custom Key</span>
            </label>
            {useCustomKey && (
              <div className="key-display">
                <input
                  type="text"
                  className="key-input"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="Enter your custom encryption key"
                  autoFocus
                />
                <p className="help-text">
                  Use a strong, memorable passphrase or a randomly generated key
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="button-group">
          <button 
            className="btn btn-primary" 
            onClick={handleSaveSettings}
            disabled={(!useCustomKey && !generatedKey) || isSaving}
          >
            {isSaving ? 'Saving...' : 'Continue with Encryption'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setEncryptionEnabled(null)}
            disabled={isSaving}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncryptionSetup;
