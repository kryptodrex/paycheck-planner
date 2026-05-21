// Agent IPC Handlers — Ollama integration for the AI financial assistant.
// All agent operations live in the main process so the renderer never opens
// raw shell processes or network connections to the local Ollama server.

import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { spawn } from 'child_process';
import { Ollama } from 'ollama';

const OLLAMA_HOST = 'http://127.0.0.1:11434';

function createOllamaClient(): Ollama {
  return new Ollama({ host: OLLAMA_HOST });
}

/** Returns the platform-specific shell command args to install Ollama. */
function getInstallCommand(): { command: string; args: string[] } {
  if (process.platform === 'win32') {
    return {
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        'irm https://ollama.com/install.ps1 | iex',
      ],
    };
  }
  // macOS and Linux
  return {
    command: 'sh',
    args: ['-c', 'curl -fsSL https://ollama.com/install.sh | sh'],
  };
}

export function registerAgentIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  // ── Check Status ────────────────────────────────────────────────────────────
  // Returns whether the Ollama server is reachable and lists pulled models.
  ipcMain.handle('agent:check-status', async () => {
    try {
      const client = createOllamaClient();
      const list = await client.list();
      return {
        serverRunning: true,
        models: list.models.map((m) => ({ name: m.name, size: m.size })),
      };
    } catch {
      return { serverRunning: false, models: [] };
    }
  });

  // ── Start Server ─────────────────────────────────────────────────────────────
  // Spawns `ollama serve` detached so it persists after the app exits.
  ipcMain.handle('agent:start-server', async () => {
    try {
      const proc = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore',
        // Extend PATH so the ollama binary is found on macOS/Linux
        env: {
          ...process.env,
          PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin`,
        },
      });
      proc.unref();

      // Give the server a moment to start accepting connections
      await new Promise<void>((resolve) => setTimeout(resolve, 2500));

      // Verify it came up
      try {
        const client = createOllamaClient();
        await client.list();
        return { success: true };
      } catch {
        return { success: false, error: 'Server did not respond after start. Try launching the Ollama app manually.' };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  });

  // ── Install ───────────────────────────────────────────────────────────────────
  // Runs the platform install script and streams stdout/stderr back to the
  // renderer via `agent:install-output` events.
  ipcMain.handle('agent:install', async (event) => {
    const { command, args } = getInstallCommand();

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      const proc = spawn(command, args, {
        env: {
          ...process.env,
          PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin`,
        },
      });

      const send = (text: string) => {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          event.sender.send('agent:install-output', text);
        }
      };

      proc.stdout?.on('data', (chunk: Buffer) => send(chunk.toString()));
      proc.stderr?.on('data', (chunk: Buffer) => send(chunk.toString()));

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `Installer exited with code ${code ?? 'unknown'}` });
        }
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  });

  // ── List Models ───────────────────────────────────────────────────────────────
  ipcMain.handle('agent:list-models', async () => {
    try {
      const client = createOllamaClient();
      const list = await client.list();
      return {
        success: true,
        models: list.models.map((m) => ({ name: m.name, size: m.size })),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, models: [], error: message };
    }
  });

  // ── Pull Model ────────────────────────────────────────────────────────────────
  // Downloads a model and streams progress objects back via `agent:pull-progress`.
  ipcMain.handle('agent:pull-model', async (event, model: string) => {
    try {
      const client = createOllamaClient();
      const stream = await client.pull({ model, stream: true });

      for await (const chunk of stream) {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          event.sender.send('agent:pull-progress', {
            status: chunk.status,
            completed: chunk.completed,
            total: chunk.total,
          });
        }
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  });

  // ── Query ─────────────────────────────────────────────────────────────────────
  // Sends a chat request to Ollama and streams response tokens back via
  // `agent:query-chunk`. The caller must listen for `agent:query-chunk` events
  // and `agent:query-done` / `agent:query-error` to know when it completes.
  ipcMain.handle(
    'agent:query',
    async (
      event,
      payload: {
        model: string;
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
      },
    ) => {
      try {
        const client = createOllamaClient();
        const stream = await client.chat({ model: payload.model, messages: payload.messages, stream: true });

        for await (const chunk of stream) {
          const token = chunk.message?.content;
          if (token) {
            const win = getMainWindow();
            if (win && !win.isDestroyed()) {
              event.sender.send('agent:query-chunk', token);
            }
          }
        }

        event.sender.send('agent:query-done');
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        event.sender.send('agent:query-error', message);
        return { success: false, error: message };
      }
    },
  );
}
