import fs from 'fs';
import path from 'path';

/**
 * Load local .env files for Electron main/preload processes.
 * Priority: existing process.env > .env.local > .env
 */
export const loadLocalEnvForElectron = () => {
  const envCandidates = ['.env.local', '.env'];

  for (const fileName of envCandidates) {
    const envPath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(envPath)) continue;

    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) continue;

      const key = line.slice(0, separatorIndex).trim();
      if (!key || process.env[key] !== undefined) continue;

      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
};
