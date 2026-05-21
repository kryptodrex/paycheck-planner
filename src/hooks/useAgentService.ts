// useAgentService — React hook for all AI assistant IPC operations.
// Manages setup state, streaming chat, and pull progress.

import { useState, useCallback, useRef, useEffect } from 'react';

export interface AgentModel {
  name: string;
  size: number;
}

export interface OllamaStatus {
  serverRunning: boolean;
  models: AgentModel[];
}

export interface PullProgress {
  status: string;
  completed?: number;
  total?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseAgentServiceReturn {
  // Status
  status: OllamaStatus | null;
  checkStatus: () => Promise<OllamaStatus>;
  startServer: () => Promise<{ success: boolean; error?: string }>;

  // Installation
  installOllama: (onOutput: (text: string) => void) => Promise<{ success: boolean; error?: string }>;

  // Model management
  listModels: () => Promise<AgentModel[]>;
  pullModel: (model: string, onProgress: (p: PullProgress) => void) => Promise<{ success: boolean; error?: string }>;
  isPulling: boolean;

  // Chat
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (
    userText: string,
    model: string,
    systemPrompt: string,
  ) => Promise<void>;
  clearMessages: () => void;
}

export function useAgentService(): UseAgentServiceReturn {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Keep a ref to cleanup functions for IPC listeners
  const cleanupRef = useRef<Array<() => void>>([]);

  // Remove all registered listeners on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];
    };
  }, []);

  const checkStatus = useCallback(async (): Promise<OllamaStatus> => {
    const result = await window.electronAPI.agentCheckStatus();
    setStatus(result);
    return result;
  }, []);

  const startServer = useCallback(async () => {
    return window.electronAPI.agentStartServer();
  }, []);

  const installOllama = useCallback(
    async (onOutput: (text: string) => void): Promise<{ success: boolean; error?: string }> => {
      const unsub = window.electronAPI.onAgentInstallOutput(onOutput);
      cleanupRef.current.push(unsub);
      const result = await window.electronAPI.agentInstall();
      unsub();
      cleanupRef.current = cleanupRef.current.filter((fn) => fn !== unsub);
      return result;
    },
    [],
  );

  const listModels = useCallback(async (): Promise<AgentModel[]> => {
    const result = await window.electronAPI.agentListModels();
    return result.models ?? [];
  }, []);

  const pullModel = useCallback(
    async (
      model: string,
      onProgress: (p: PullProgress) => void,
    ): Promise<{ success: boolean; error?: string }> => {
      setIsPulling(true);
      const unsub = window.electronAPI.onAgentPullProgress(onProgress);
      cleanupRef.current.push(unsub);
      try {
        return await window.electronAPI.agentPullModel(model);
      } finally {
        unsub();
        cleanupRef.current = cleanupRef.current.filter((fn) => fn !== unsub);
        setIsPulling(false);
      }
    },
    [],
  );

  const sendMessage = useCallback(
    async (userText: string, model: string, systemPrompt: string): Promise<void> => {
      if (isStreaming) return;

      const userMessage: ChatMessage = { role: 'user', content: userText };
      const assistantMessage: ChatMessage = { role: 'assistant', content: '' };

      // Optimistically add user message and an empty assistant placeholder
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      // Build the full messages array for Ollama (system + history + new user message)
      const ollamaMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userText },
      ];

      // Listen for streamed tokens
      const chunkUnsub = window.electronAPI.onAgentQueryChunk((token: string) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + token };
          }
          return updated;
        });
      });

      const cleanupListeners = () => {
        chunkUnsub();
        doneUnsub();
        errUnsub();
      };

      const doneUnsub = window.electronAPI.onAgentQueryDone(() => {
        setIsStreaming(false);
        cleanupListeners();
      });

      const errUnsub = window.electronAPI.onAgentQueryError((err: string) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant' && last.content === '') {
            updated[updated.length - 1] = {
              ...last,
              content: `Error: ${err}`,
            };
          }
          return updated;
        });
        setIsStreaming(false);
        cleanupListeners();
      });

      // Fire the query (result just confirms success; actual content streams via events)
      await window.electronAPI.agentQuery({ model, messages: ollamaMessages });
    },
    [isStreaming, messages],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    status,
    checkStatus,
    startServer,
    installOllama,
    listModels,
    pullModel,
    isPulling,
    messages,
    isStreaming,
    sendMessage,
    clearMessages,
  };
}
