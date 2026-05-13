/**
 * bootstrap.ts — rename `@ethos-app/*` placeholders to the new product scope
 * when a developer clones the starter to begin a new product.
 *
 * Only Node builtins are used (no inquirer/commander/prompts). Run via:
 *   pnpm tsx tools/bootstrap.ts [--name <slug>] [--dry-run]
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const PLACEHOLDER_SCOPE = '@ethos-app/';
const SLUG_REGEX = /^[a-z][a-z0-9-]{1,30}$/;
const RESERVED_SLUGS = new Set(['ethos-app', 'ethos', 'node', 'pnpm']);
const MAX_PROMPT_ATTEMPTS = 3;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

const TARGET_FILES: readonly string[] = [
  resolve(REPO_ROOT, 'templates/starter/package.json'),
  resolve(REPO_ROOT, 'templates/starter/apps/api/package.json'),
  resolve(REPO_ROOT, 'templates/starter/apps/web/package.json'),
];

interface CliArgs {
  name?: string;
  dryRun: boolean;
  help: boolean;
}

interface FilePlan {
  path: string;
  current: string;
  next: string | null;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const out: CliArgs = { dryRun: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.help = true;
    } else if (arg === '--dry-run') {
      out.dryRun = true;
    } else if (arg === '--name') {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new CliError(`--name requires a value (e.g. --name acme)`, 2);
      }
      out.name = next;
      i++;
    } else if (arg.startsWith('--name=')) {
      out.name = arg.slice('--name='.length);
    } else {
      throw new CliError(`Unknown argument: ${arg}`, 2);
    }
  }
  return out;
}

class CliError extends Error {
  readonly exitCode: number;
  constructor(message: string, exitCode: number) {
    super(message);
    this.exitCode = exitCode;
  }
}

function validateSlug(s: string): { ok: true } | { ok: false; reason: string } {
  if (!SLUG_REGEX.test(s)) {
    return {
      ok: false,
      reason:
        'must be lowercase, start with a letter, and contain only letters, digits, or dashes (2-31 chars)',
    };
  }
  if (RESERVED_SLUGS.has(s)) {
    return { ok: false, reason: `'${s}' is reserved` };
  }
  return { ok: true };
}

function printHelp(): void {
  console.log(
    [
      'Usage: bootstrap.ts [options]',
      '  --name <slug>    Product slug (lowercase, alphanum + dash, 2-31 chars)',
      '  --dry-run        Print planned changes without writing',
      '  --help, -h       Show this help',
      '',
      'Examples:',
      '  pnpm tsx tools/bootstrap.ts --name acme',
      '  pnpm tsx tools/bootstrap.ts --name petshop --dry-run',
      '  pnpm tsx tools/bootstrap.ts    # interactive',
    ].join('\n'),
  );
}

async function promptSlug(): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new CliError('No TTY available and --name not provided. Re-run with --name <slug>.', 1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (let attempt = 1; attempt <= MAX_PROMPT_ATTEMPTS; attempt++) {
      const raw = (await rl.question('Product slug (lowercase, e.g. "acme"): ')).trim();
      if (raw.length === 0) {
        console.error('[bootstrap] Slug cannot be empty.');
        continue;
      }
      const check = validateSlug(raw);
      if (check.ok) return raw;
      console.error(`[bootstrap] Invalid slug: ${check.reason}.`);
    }
    throw new CliError(`Too many invalid attempts (${MAX_PROMPT_ATTEMPTS}). Aborting.`, 1);
  } finally {
    rl.close();
  }
}

function planRewrite(content: string, productSlug: string): string | null {
  const target = `@${productSlug}/`;
  if (!content.includes(PLACEHOLDER_SCOPE)) return null;
  const next = content.replaceAll(PLACEHOLDER_SCOPE, target);
  return next === content ? null : next;
}

async function findPackageJsons(productSlug: string): Promise<FilePlan[]> {
  const plans: FilePlan[] = [];
  for (const absPath of TARGET_FILES) {
    let current: string;
    try {
      current = await readFile(absPath, 'utf8');
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new CliError(`Cannot read ${absPath}: ${reason}`, 1);
    }
    plans.push({ path: absPath, current, next: planRewrite(current, productSlug) });
  }
  return plans;
}

function relativeToRoot(absPath: string): string {
  const rel = absPath.slice(REPO_ROOT.length + 1);
  return rel.split('\\').join('/');
}

function summarizePlanned(plan: FilePlan, productSlug: string): string {
  return [
    `  ${relativeToRoot(plan.path)}:`,
    `    "${PLACEHOLDER_SCOPE}*" → "@${productSlug}/*"`,
  ].join('\n');
}

async function applyChanges(
  plans: readonly FilePlan[],
  dryRun: boolean,
  productSlug: string,
): Promise<number> {
  const changed = plans.filter((p): p is FilePlan & { next: string } => p.next !== null);
  if (changed.length === 0) return 0;

  if (dryRun) {
    console.log('[bootstrap] Planned changes:');
    for (const plan of changed) {
      console.log(summarizePlanned(plan, productSlug));
    }
    return changed.length;
  }

  for (const plan of changed) {
    console.log(`[bootstrap] Writing: ${relativeToRoot(plan.path)}`);
    await writeFile(plan.path, plan.next, 'utf8');
  }
  return changed.length;
}

async function main(): Promise<number> {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    if (err instanceof CliError) {
      console.error(`[bootstrap] ${err.message}`);
      return err.exitCode;
    }
    throw err;
  }

  if (args.help) {
    printHelp();
    return 0;
  }

  let slug: string;
  if (args.name !== undefined) {
    const check = validateSlug(args.name);
    if (!check.ok) {
      console.error(`[bootstrap] Invalid --name '${args.name}': ${check.reason}.`);
      return 2;
    }
    slug = args.name;
  } else {
    slug = await promptSlug();
  }

  console.log(`[bootstrap] Product slug: ${slug}`);
  if (args.dryRun) {
    console.log('[bootstrap] Dry run — no files will be modified.');
  }

  const plans = await findPackageJsons(slug);
  const changedCount = await applyChanges(plans, args.dryRun, slug);

  if (changedCount === 0) {
    console.log(
      `[bootstrap] No changes — already bootstrapped (or no '${PLACEHOLDER_SCOPE}' references found). Exit 0.`,
    );
    return 0;
  }

  if (args.dryRun) {
    console.log(`[bootstrap] ${changedCount} file(s) would be changed. Exit 0.`);
  } else {
    console.log(
      `[bootstrap] Done. ${changedCount} file(s) changed. Run pnpm install to refresh the workspace.`,
    );
  }
  return 0;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err: unknown) => {
    if (err instanceof CliError) {
      console.error(`[bootstrap] ${err.message}`);
      process.exit(err.exitCode);
    }
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    console.error(`[bootstrap] Unexpected error: ${message}`);
    process.exit(1);
  });
