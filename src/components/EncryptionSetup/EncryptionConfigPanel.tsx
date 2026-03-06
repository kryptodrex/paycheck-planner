import React from 'react';
import { RadioGroup } from '../shared';
import './EncryptionConfigPanel.css';

interface EncryptionConfigPanelProps {
    encryptionEnabled: boolean | null;
    setEncryptionEnabled: (value: boolean | null) => void;
    useCustomKey: boolean;
    setUseCustomKey: (value: boolean) => void;
    customKey: string;
    setCustomKey: (value: string) => void;
    generatedKey: string;
    onGenerateKey: () => void;
}

const EncryptionConfigPanel: React.FC<EncryptionConfigPanelProps> = ({
    encryptionEnabled,
    setEncryptionEnabled,
    useCustomKey,
    setUseCustomKey,
    customKey,
    setCustomKey,
    generatedKey,
    onGenerateKey,
}) => {
    const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, enabled: boolean) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleSetEncryption(enabled);
        }
    };

    const handleSetEncryption = (enabled: boolean) => {
        setEncryptionEnabled(enabled);
        if (enabled) {
            onGenerateKey();
        }
    };

    if (encryptionEnabled === null) {
        return (
            <div className="encryption-config-panel">
                <div className="encryption-selection-grid">
                    <div
                        className="encryption-option-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSetEncryption(true)}
                        onKeyDown={(event) => handleCardKeyDown(event, true)}
                        aria-label="Enable encryption"
                    >
                        <div className="encryption-option-icon">🔒</div>
                        <h3>Enable Encryption</h3>
                        <p>Your plan file is encrypted automatically and your key is stored securely in your computer keychain.</p>
                    </div>

                    <div
                        className="encryption-option-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSetEncryption(false)}
                        onKeyDown={(event) => handleCardKeyDown(event, false)}
                        aria-label="Disable encryption"
                    >
                        <div className="encryption-option-icon">📄</div>
                        <h3>No Encryption</h3>
                        <p>Your plan file is saved as plain text and can be read by anyone with file access.</p>
                    </div>
                </div>

                <p className="encryption-note">
                    💡 You can always change your encryption setting later.
                </p>
            </div>
        );
    }

    if (!encryptionEnabled) {
        return (
            <div className="encryption-config-panel">
                <h3>No Encryption</h3>
                <p>Your budget files will be saved without encryption.</p>
            </div>
        );
    }

    return (
        <div className="encryption-config-panel">
            <h3>Choose Your Encryption Key</h3>

            <RadioGroup
                name="encryptionKeyType"
                value={useCustomKey ? 'custom' : 'generated'}
                onChange={(value) => setUseCustomKey(value === 'custom')}
                layout="column"
                className="encryption-key-choice"
                options={[
                    {
                        value: 'generated',
                        label: 'Use Generated Key (Recommended)',
                        description: 'Auto-generate a strong key and store it securely in your keychain.',
                    },
                    {
                        value: 'custom',
                        label: 'Use Custom Key',
                        description: 'Enter your own passphrase or key.',
                    },
                ]}
            />

            <div className="encryption-key-radio">
                <h4 style={{marginTop: 0}}>Encryption Key Details</h4>
                {!useCustomKey && (
                    <>
                        <div className="encryption-key-display">
                            <div className="encryption-key-box">
                                <code onCopy={() => navigator.clipboard.writeText(generatedKey)}>{generatedKey}</code>
                            </div>
                        </div>
                        <div className="button-group">
                            <button className="btn encryption-btn-small" onClick={onGenerateKey}>
                                🔄 Generate New Key
                            </button>
                            <button 
                                className="btn encryption-btn-small"
                                onClick={() => navigator.clipboard.writeText(generatedKey)}
                                title="Copy to clipboard"
                            >
                                Copy to Clipboard
                            </button>
                        </div>
                    </>
                )}

                {useCustomKey && (
                    <div className="encryption-key-display">
                        <input
                            type="text"
                            className="encryption-key-input"
                            value={customKey}
                            onChange={(e) => setCustomKey(e.target.value)}
                            placeholder="Enter your custom encryption key"
                            autoFocus
                        />
                        <p className="encryption-help-text">
                            Use a strong, memorable passphrase or a randomly generated key
                        </p>
                    </div>
                )}
            </div>

            <p className="encryption-note">
                ❗️ Your encryption key is stored securely in your computer's keychain, but it is recommended to also keep a backup saved in another secure location.
            </p>
        </div>
    );
};

export default EncryptionConfigPanel;