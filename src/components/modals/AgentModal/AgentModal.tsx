import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, ChevronRight, Download, Loader2, RefreshCw, Send, Sparkles, Terminal, Trash2 } from 'lucide-react';
import { useBudget } from '../../../contexts/BudgetContext';
import { useAgentService } from '../../../hooks/useAgentService';
import type { AgentModel, PullProgress } from '../../../hooks/useAgentService';
import { FileStorageService } from '../../../services/fileStorage';
import { buildAgentContext, buildSystemPrompt } from '../../../services/agentContextService';
import { Button, Modal } from '../../_shared';
import './AgentModal.css';

// ── Curated model list ────────────────────────────────────────────────────────

interface CuratedModel {
  id: string;
  label: string;
  description: string;
  recommended?: boolean;
}

const CURATED_MODELS: CuratedModel[] = [
  {
    id: 'llama3.2:3b',
    label: 'Llama 3.2 (3B)',
    description: 'Fast · ~2 GB · Great for most machines',
    recommended: true,
  },
  {
    id: 'llama3.1:8b',
    label: 'Llama 3.1 (8B)',
    description: 'Better quality · ~5 GB · Slower on older hardware',
  },
  {
    id: 'mistral:7b',
    label: 'Mistral (7B)',
    description: 'Strong reasoning · ~4 GB',
  },
  {
    id: 'phi4-mini:3.8b',
    label: 'Phi-4 Mini (3.8B)',
    description: 'Microsoft · ~2.5 GB · Strong at numbers',
  },
  {
    id: 'gemma3:4b',
    label: 'Gemma 3 (4B)',
    description: 'Google · ~2.5 GB · Well-rounded',
  },
];

// ── Setup steps ───────────────────────────────────────────────────────────────

type SetupStep =
  | 'checking'
  | 'needs-install'
  | 'installing'
  | 'needs-start'
  | 'starting'
  | 'select-model'
  | 'pulling'
  | 'chat';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${bytes} B`;
}

function getInstallPlatformNote(): string {
  // Use navigator.userAgent since process is not available in the renderer
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'PowerShell (Windows)';
  if (ua.includes('mac')) return 'shell script (macOS)';
  return 'shell script (Linux)';
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const AgentModal: React.FC<AgentModalProps> = ({ isOpen, onClose }) => {
  const { budgetData, calculatePaycheckBreakdown } = useBudget();
  const agent = useAgentService();

  // ── Wizard state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<SetupStep>('checking');
  const [installOutput, setInstallOutput] = useState('');
  const [installError, setInstallError] = useState('');
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null);
  const [pullError, setPullError] = useState('');
  const [startError, setStartError] = useState('');
  const [availableModels, setAvailableModels] = useState<AgentModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return FileStorageService.getAppSettings().agentModel ?? CURATED_MODELS[0].id;
  });

  // ── Chat state ───────────────────────────────────────────────────────────────
  const [input, setInput] = useState('');
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const installOutputRef = useRef<HTMLPreElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agent.messages]);

  // Auto-scroll install output
  useEffect(() => {
    if (installOutputRef.current) {
      installOutputRef.current.scrollTop = installOutputRef.current.scrollHeight;
    }
  }, [installOutput]);

  // ── Status check on open ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting modal state on open before async check begins.
    setStep('checking');
    setInstallOutput('');
    setInstallError('');
    setPullError('');
    setStartError('');

    const savedModel = FileStorageService.getAppSettings().agentModel;

    agent.checkStatus().then((status) => {
      if (!status.serverRunning) {
        setStep('needs-install');
        return;
      }
      setAvailableModels(status.models);

      // If user already has a configured model that's pulled, go straight to chat
      const pulled = status.models.map((m) => m.name);
      if (savedModel && pulled.includes(savedModel)) {
        setSelectedModel(savedModel);
        setStep('chat');
        return;
      }

      setStep('select-model');
    });
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleInstall = useCallback(async () => {
    setStep('installing');
    setInstallOutput('');
    setInstallError('');

    const result = await agent.installOllama((text) => {
      setInstallOutput((prev) => prev + text);
    });

    if (!result.success) {
      setInstallError(result.error ?? 'Installation failed.');
      return;
    }

    // After install, try to start the server
    setStep('starting');
    const startResult = await agent.startServer();
    if (!startResult.success) {
      setStartError(startResult.error ?? 'Could not start Ollama server after install.');
      setStep('needs-start');
      return;
    }

    const status = await agent.checkStatus();
    setAvailableModels(status.models);
    setStep('select-model');
  }, [agent]);

  const handleStartServer = useCallback(async () => {
    setStep('starting');
    setStartError('');

    const result = await agent.startServer();
    if (!result.success) {
      setStartError(result.error ?? 'Could not start Ollama server.');
      setStep('needs-start');
      return;
    }

    const status = await agent.checkStatus();
    setAvailableModels(status.models);
    setStep('select-model');
  }, [agent]);

  const handleSelectModel = useCallback(
    async (modelId: string) => {
      setSelectedModel(modelId);

      const alreadyPulled = availableModels.some((m) => m.name === modelId);
      if (alreadyPulled) {
        // Persist and go to chat
        const existing = FileStorageService.getAppSettings();
        FileStorageService.saveAppSettings({ ...existing, agentModel: modelId });
        setStep('chat');
        return;
      }

      // Need to pull first
      setStep('pulling');
      setPullProgress(null);
      setPullError('');

      const result = await agent.pullModel(modelId, (p) => setPullProgress(p));

      if (!result.success) {
        setPullError(result.error ?? 'Pull failed.');
        setStep('select-model');
        return;
      }

      const existing = FileStorageService.getAppSettings();
      FileStorageService.saveAppSettings({ ...existing, agentModel: modelId });
      setStep('chat');
    },
    [agent, availableModels],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || agent.isStreaming || !budgetData) return;

    setInput('');

    const breakdown = calculatePaycheckBreakdown();
    const context = buildAgentContext(budgetData, breakdown);
    const systemPrompt = buildSystemPrompt(context);

    await agent.sendMessage(text, selectedModel, systemPrompt);

    setTimeout(() => inputRef.current?.focus(), 50);
  }, [input, agent, budgetData, calculatePaycheckBreakdown, selectedModel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ── Context preview ───────────────────────────────────────────────────────────
  const contextPreview = (() => {
    if (!budgetData) return '';
    try {
      return buildAgentContext(budgetData, calculatePaycheckBreakdown());
    } catch {
      return '';
    }
  })();

  // ── Pull progress percentage ──────────────────────────────────────────────────
  const pullPercent =
    pullProgress?.total && pullProgress.completed
      ? Math.round((pullProgress.completed / pullProgress.total) * 100)
      : null;

  // ── Render ────────────────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 'checking':
        return (
          <div className="agent-setup-center">
            <Loader2 className="agent-spinner ui-icon" aria-hidden="true" />
            <p className="agent-setup-subtitle">Checking for Ollama…</p>
          </div>
        );

      case 'needs-install':
        return (
          <div className="agent-setup-card">
            <Bot className="agent-setup-hero-icon ui-icon" aria-hidden="true" />
            <h3 className="agent-setup-title">AI Financial Assistant</h3>
            <p className="agent-setup-subtitle">
              This feature uses <strong>Ollama</strong> to run an AI model locally on your machine.
              Your financial data never leaves your computer.
            </p>
            <div className="agent-install-command">
              <Terminal size={14} aria-hidden="true" />
              <span className="agent-install-command-label">Install via {getInstallPlatformNote()}</span>
            </div>
            <Button variant="primary" onClick={handleInstall}>
              Install Ollama
            </Button>
            <p className="agent-setup-note">
              Requires an internet connection. The installer runs a script from{' '}
              <strong>ollama.com</strong> — the same command shown in their official docs.
            </p>
          </div>
        );

      case 'installing':
        return (
          <div className="agent-setup-card agent-setup-card--wide">
            <Loader2 className="agent-spinner ui-icon" aria-hidden="true" />
            <h3 className="agent-setup-title">Installing Ollama…</h3>
            {installError ? (
              <p className="agent-setup-error">{installError}</p>
            ) : null}
            <pre ref={installOutputRef} className="agent-install-output">
              {installOutput || 'Starting installer…'}
            </pre>
          </div>
        );

      case 'needs-start':
        return (
          <div className="agent-setup-card">
            <RefreshCw className="agent-setup-hero-icon ui-icon" aria-hidden="true" />
            <h3 className="agent-setup-title">Ollama Not Running</h3>
            <p className="agent-setup-subtitle">
              Ollama is installed but the server isn&apos;t running. Click below to start it, or
              launch the Ollama app manually.
            </p>
            {startError && <p className="agent-setup-error">{startError}</p>}
            <Button variant="primary" onClick={handleStartServer}>
              Start Ollama Server
            </Button>
          </div>
        );

      case 'starting':
        return (
          <div className="agent-setup-center">
            <Loader2 className="agent-spinner ui-icon" aria-hidden="true" />
            <p className="agent-setup-subtitle">Starting Ollama server…</p>
          </div>
        );

      case 'select-model': {
        const pulledNames = new Set(availableModels.map((m) => m.name));
        return (
          <div className="agent-setup-card agent-setup-card--wide">
            <Sparkles className="agent-setup-hero-icon ui-icon" aria-hidden="true" />
            <h3 className="agent-setup-title">Choose a Model</h3>
            <p className="agent-setup-subtitle">
              Select a model to power your assistant. Smaller models are faster; larger ones give
              better answers.
            </p>

            <div className="agent-model-list">
              {CURATED_MODELS.map((m) => {
                const isPulled = pulledNames.has(m.id);
                return (
                  <button
                    key={m.id}
                    className={`agent-model-option${selectedModel === m.id ? ' agent-model-option--selected' : ''}`}
                    onClick={() => setSelectedModel(m.id)}
                    type="button"
                  >
                    <div className="agent-model-option-main">
                      <span className="agent-model-option-label">
                        {m.label}
                        {m.recommended && (
                          <span className="agent-model-badge agent-model-badge--recommended">
                            Recommended
                          </span>
                        )}
                        {isPulled && (
                          <span className="agent-model-badge agent-model-badge--pulled">
                            Downloaded
                          </span>
                        )}
                      </span>
                      <span className="agent-model-option-desc">{m.description}</span>
                    </div>
                    <ChevronRight size={16} className="agent-model-option-arrow ui-icon" aria-hidden="true" />
                  </button>
                );
              })}

              {availableModels
                .filter((m) => !CURATED_MODELS.some((c) => c.id === m.name))
                .map((m) => (
                  <button
                    key={m.name}
                    className={`agent-model-option${selectedModel === m.name ? ' agent-model-option--selected' : ''}`}
                    onClick={() => setSelectedModel(m.name)}
                    type="button"
                  >
                    <div className="agent-model-option-main">
                      <span className="agent-model-option-label">
                        {m.name}
                        <span className="agent-model-badge agent-model-badge--pulled">Downloaded</span>
                      </span>
                      <span className="agent-model-option-desc">{formatBytes(m.size)}</span>
                    </div>
                    <ChevronRight size={16} className="agent-model-option-arrow ui-icon" aria-hidden="true" />
                  </button>
                ))}
            </div>

            {pullError && <p className="agent-setup-error">{pullError}</p>}

            <Button
              variant="primary"
              onClick={() => handleSelectModel(selectedModel)}
              disabled={!selectedModel}
            >
              {pulledNames.has(selectedModel) ? (
                'Use This Model'
              ) : (
                <>
                  <Download size={16} aria-hidden="true" />
                  Download &amp; Use
                </>
              )}
            </Button>
          </div>
        );
      }

      case 'pulling':
        return (
          <div className="agent-setup-card">
            <Download className="agent-setup-hero-icon ui-icon" aria-hidden="true" />
            <h3 className="agent-setup-title">Downloading {selectedModel}…</h3>
            <p className="agent-setup-subtitle">
              {pullProgress?.status ?? 'Starting download…'}
            </p>
            {pullPercent !== null ? (
              <div className="agent-pull-progress-bar">
                <div
                  className="agent-pull-progress-fill"
                  style={{ width: `${pullPercent}%` }}
                />
              </div>
            ) : (
              <Loader2 className="agent-spinner ui-icon" aria-hidden="true" />
            )}
            {pullPercent !== null && (
              <p className="agent-pull-percent">{pullPercent}%</p>
            )}
          </div>
        );

      case 'chat':
        return (
          <div className="agent-chat-layout">
            {/* Top bar: model + actions */}
            <div className="agent-chat-toolbar">
              <span className="agent-chat-model-label">{selectedModel}</span>
              <div className="agent-chat-toolbar-actions">
                <button
                  className="agent-chat-toolbar-btn"
                  onClick={() => setShowContext((v) => !v)}
                  type="button"
                >
                  {showContext ? 'Hide context' : 'Plan context'}
                </button>
                <button
                  className="agent-chat-toolbar-btn"
                  onClick={() => setStep('select-model')}
                  type="button"
                >
                  Change model
                </button>
                {agent.messages.length > 0 && (
                  <button
                    className="agent-chat-toolbar-btn agent-chat-toolbar-btn--danger"
                    onClick={agent.clearMessages}
                    type="button"
                    title="Clear conversation"
                  >
                    <Trash2 size={12} aria-hidden="true" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {showContext && (
              <pre className="agent-chat-context-preview">{contextPreview}</pre>
            )}

            {/* Thread */}
            <div className="agent-chat-messages">
              {agent.messages.length === 0 && (
                <div className="agent-chat-empty">
                  <Bot size={28} aria-hidden="true" />
                  <p>Ask me anything about your paycheck plan.</p>
                  <ul className="agent-chat-empty-examples">
                    <li>How much more can I contribute to my 401k?</li>
                    <li>What would happen if I added a $250/mo car payment?</li>
                    <li>How much do I have left each paycheck after bills?</li>
                  </ul>
                </div>
              )}

              {agent.messages.map((msg, i) =>
                msg.role === 'user' ? (
                  <div key={i} className="agent-thread-user">
                    <span className="agent-thread-user-label">You</span>
                    <span className="agent-thread-user-text">{msg.content}</span>
                  </div>
                ) : (
                  <div key={i} className="agent-thread-response">
                    <div className="agent-thread-response-avatar" aria-hidden="true">
                      <Bot size={13} />
                    </div>
                    <div className="agent-thread-response-body">
                      {msg.content || (agent.isStreaming && i === agent.messages.length - 1 ? (
                        <span className="agent-typing-indicator">
                          <span /><span /><span />
                        </span>
                      ) : null)}
                    </div>
                  </div>
                ),
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="agent-chat-input-row">
              <textarea
                ref={inputRef}
                className="agent-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your finances…"
                rows={2}
                disabled={agent.isStreaming}
                aria-label="Chat input"
              />
              <Button
                variant="primary"
                onClick={handleSend}
                disabled={!input.trim() || agent.isStreaming}
                aria-label="Send message"
              >
                <Send size={15} className="ui-icon" aria-hidden="true" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const modalTitle = step === 'chat' ? 'AI Financial Assistant' : 'Set Up AI Assistant';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={modalTitle}
      headerIcon={<Bot size={20} className="ui-icon" aria-hidden="true" />}
      contentClassName={`agent-modal-content${step === 'chat' ? ' agent-modal-content--chat' : ''}`}
    >
      {renderStep()}
    </Modal>
  );
};

export default AgentModal;
