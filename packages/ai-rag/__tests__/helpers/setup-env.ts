import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * setup-env.ts — jest setupFiles handler.
 *
 * Carrega .env do monorepo root (resolvido relative ao package) e injeta no
 * process.env. Evita dep externa (dotenv) — parser minimal de KEY=VALUE.
 *
 * NAO sobrescreve variaveis ja definidas (ex.: CI/CD).
 */
function loadDotenv(path: string): void {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// __dirname = packages/ai-rag/__tests__/helpers/
// raiz = ../../../../
loadDotenv(resolve(__dirname, '../../../../.env'));
