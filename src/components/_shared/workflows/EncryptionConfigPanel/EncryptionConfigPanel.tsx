import React from 'react';
import { Check, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { Alert, RadioGroup, Button, InfoBox } from '../../';
import '../../sharedPathDisplay.css';
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
    /** Rendering mode. 'setup' (default) shows the standard new-plan flow; 'manage'
     *  shows a context-aware view for changing encryption on an existing plan. */
    mode?: 'setup' | 'manage';
    /** Current encryption state of the existing plan. Required when mode === 'manage'. */
    currentlyEncrypted?: boolean;
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
    mode = 'setup',
    currentlyEncrypted,
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
        // --- Manage mode: plan is currently unencrypted ---
        if (mode === 'manage' && currentlyEncrypted === false) {
            return (
                <div className="encryption-config-panel">
                    <div className="encryption-selection-grid encryption-single-option">
                        <div
                            className="encryption-option-card"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSetEncryption(true)}
                            onKeyDown={(event) => handleCardKeyDown(event, true)}
                            aria-label="Enable encryption"
                        >
                            <div className="encryption-option-icon" aria-hidden="true"><ShieldCheck className="ui-icon" /></div>
                            <h3>Enable Encryption</h3>
                            <p>Encrypt your plan file automatically. Your key is stored securely in your computer's keychain.</p>
                        </div>
                    </div>
                    <InfoBox>
                        Enabling encryption will re-save your plan with the new key.
                    </InfoBox>
                </div>
            );
        }

        // --- Manage mode: plan is currently encrypted ---
        if (mode === 'manage' && currentlyEncrypted === true) {
            return (
                <div className="encryption-config-panel">
                    <div className="encryption-selection-grid">
                        <div
                            className="encryption-option-card"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSetEncryption(true)}
                            onKeyDown={(event) => handleCardKeyDown(event, true)}
                            aria-label="Change encryption key"
                        >
                            <div className="encryption-option-icon" aria-hidden="true"><KeyRound className="ui-icon" /></div>
                            <h3>Change Encryption Key</h3>
                            <p>Replace your current key with a new one. Your plan will be re-saved with the new key.</p>
                        </div>
                        <div
                            className="encryption-option-card encryption-option-card--danger"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSetEncryption(false)}
                            onKeyDown={(event) => handleCardKeyDown(event, false)}
                            aria-label="Disable encryption"
                        >
                            <div className="encryption-option-icon" aria-hidden="true"><ShieldOff className="ui-icon" /></div>
                            <h3>Disable Encryption</h3>
                            <p>Remove encryption from your plan. Your plan will be saved as plain text.</p>
                        </div>
                    </div>
                </div>
            );
        }

        // --- Setup mode: initial selection ---
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
                        <div className="encryption-option-icon" aria-hidden="true"><ShieldCheck className="ui-icon" /></div>
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
                        <div className="encryption-option-icon" aria-hidden="true"><ShieldOff className="ui-icon" /></div>
                        <h3>No Encryption</h3>
                        <p>Your plan file is saved as plain text and can be read by anyone with file access.</p>
                    </div>
                </div>

                <InfoBox>
                    You can always change your encryption setting later.
                </InfoBox>
            </div>
        );
    }

    if (!encryptionEnabled) {
        if (mode === 'manage') {
            return (
                <div className="encryption-config-panel">
                    <Alert type="warning">
                        <strong>Warning:</strong> Your plan file will be saved as plain text and can be read by anyone with file access.
                    </Alert>
                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                        Click <strong>Continue</strong> to disable encryption and re-save your plan file.
                    </p>
                </div>
            );
        }
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
                        label: 'Use Auto-Generated Key (Recommended)',
                        description: 'Auto-generate a strong key and store it securely in your keychain.',
                    },
                    {
                        value: 'custom',
                        label: 'Use Custom Key',
                        description: 'Enter your own passphrase or key.',
                    },
                ]}
            />

            <Alert type="error">
                <strong>Important:</strong> Save a backup of your encryption key in a secure location.
                If this key is lost then your encrypted plan files cannot be recovered.
            </Alert>

            <div className="encryption-key-radio">
                <h4 style={{marginTop: 0}}>Your Encryption Key</h4>
                {!useCustomKey && (
                    <>
                        <div className="encryption-key-box">
                            <code className="shared-path-display shared-path-display--primary encryption-key-code" onCopy={() => navigator.clipboard.writeText(generatedKey)}>{generatedKey}</code>
                        </div>
                        <div className="button-group">
                            <Button
                                variant="utility"
                                size="small"
                                onClick={() => onGenerateKey()}
                                title="Generate New Key"
                            >
                                Generate New Key
                            </Button>
                            <Button
                                variant="utility"
                                size="small"
                                onClick={() => navigator.clipboard.writeText(generatedKey)}
                                successText="Copied!"
                                title="Copy to clipboard"
                            >
                                <Check className="ui-icon ui-icon-sm" aria-hidden="true" />
                                Copy to Clipboard
                            </Button>
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
        </div>
    );
};

export default EncryptionConfigPanel;