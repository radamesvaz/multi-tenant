#!/usr/bin/env node
/**
 * Local AI architecture review (Ollama).
 * Loads .ai/prompts + .ai/memory, reviews a git diff, prints/saves markdown.
 *
 * Usage:
 *   node scripts/ai-review.mjs
 *   node scripts/ai-review.mjs --staged
 *   node scripts/ai-review.mjs --base main
 *   node scripts/ai-review.mjs --dry-run
 *   node scripts/ai-review.mjs --no-save
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://localhost:11434').replace(
  /\/+$/,
  '',
);
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';

function parseArgs(argv) {
  const opts = {
    staged: false,
    base: null,
    dryRun: false,
    save: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--staged' || arg === '-staged') {
      opts.staged = true;
    } else if (arg === '--dry-run' || arg === '-dry-run') {
      opts.dryRun = true;
    } else if (arg === '--no-save' || arg === '-no-save') {
      opts.save = false;
    } else if (arg === '--base' || arg === '-base') {
      const next = argv[++i];
      if (!next || next.startsWith('-')) {
        throw new Error('Missing value for --base <branch>');
      }
      opts.base = next;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }

  if (opts.staged && opts.base) {
    throw new Error('Use either --staged or --base, not both');
  }

  return opts;
}

function printHelp() {
  console.log(`AI local architecture review (Vue/TS frontend)

Usage:
  npm run ai:review -- [flags]

Flags:
  (default)       Review working tree vs HEAD + untracked
  --staged        Review staged changes only
  --base <branch> Review merge-base...HEAD against branch (e.g. main)
  --dry-run       Print assembled prompt; do not call Ollama or save
  --no-save       Print review but do not write .ai/reviews/

Env:
  OLLAMA_HOST     default http://localhost:11434
  OLLAMA_MODEL    default qwen3:8b
`);
}

function findRepoRoot(startDir) {
  let dir = resolve(startDir);
  for (;;) {
    if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, '.ai'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error('Could not find repo root (package.json + .ai/)');
    }
    dir = parent;
  }
}

function runGit(repoRoot, args, { allowFail = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !allowFail) {
    const err = (result.stderr || result.stdout || '').trim();
    throw new Error(`git ${args.join(' ')} failed: ${err}`);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function readRequired(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing required file: ${path}`);
  }
  return readFileSync(path, 'utf8');
}

function collectDiff(repoRoot, opts) {
  if (opts.staged) {
    const { stdout } = runGit(repoRoot, ['diff', '--cached', '--no-ext-diff']);
    return stdout;
  }

  if (opts.base) {
    const mergeBase = runGit(repoRoot, ['merge-base', opts.base, 'HEAD']);
    const baseSha = mergeBase.stdout.trim();
    if (!baseSha) {
      throw new Error(`Could not resolve merge-base with ${opts.base}`);
    }
    const { stdout } = runGit(repoRoot, [
      'diff',
      '--no-ext-diff',
      `${baseSha}...HEAD`,
    ]);
    return stdout;
  }

  const tracked = runGit(repoRoot, ['diff', 'HEAD', '--no-ext-diff']).stdout;
  const untrackedList = runGit(repoRoot, [
    'ls-files',
    '--others',
    '--exclude-standard',
  ]).stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    // Skip generated reviews and heavy dirs if somehow untracked
    .filter((p) => !p.startsWith('.ai/reviews/') || p.endsWith('.gitkeep'));

  let untrackedDiff = '';
  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';

  for (const file of untrackedList) {
    const abs = join(repoRoot, file);
    if (!existsSync(abs)) continue;

    try {
      const size = statSync(abs).size;
      if (size > 1_500_000) {
        untrackedDiff += `\ndiff --git a/${file} b/${file}\n--- /dev/null\n+++ b/${file}\n@@ skipped @@\n+<untracked file too large to include>\n`;
        continue;
      }
    } catch {
      /* include anyway */
    }

    const diff = runGit(
      repoRoot,
      ['diff', '--no-index', '--no-ext-diff', '--', nullDevice, file],
      { allowFail: true },
    );
    // git diff --no-index exits 1 when files differ
    if (diff.stdout) {
      // Normalize Windows NUL paths in headers for ALLOWED PATHS extraction
      const normalized = diff.stdout
        .replaceAll('a/NUL', '/dev/null')
        .replaceAll('b/NUL', file);
      untrackedDiff += normalized;
      if (!untrackedDiff.endsWith('\n')) untrackedDiff += '\n';
    }
  }

  return `${tracked}${untrackedDiff}`;
}

function extractAllowedPaths(diffText) {
  const paths = new Set();
  const patterns = [
    /^diff --git a\/(.+?) b\/(.+)$/gm,
    /^\+\+\+ b\/(.+)$/gm,
    /^--- a\/(.+)$/gm,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(diffText)) !== null) {
      for (let i = 1; i < m.length; i++) {
        const p = m[i];
        if (p && p !== '/dev/null') {
          paths.add(p.replace(/\\/g, '/'));
        }
      }
    }
  }

  return [...paths].sort();
}

function buildUserPrompt({ architecture, checklist, diff, allowedPaths }) {
  const pathsBlock =
    allowedPaths.length > 0
      ? allowedPaths.map((p) => `- ${p}`).join('\n')
      : '- (none)';

  return `## Project guidelines (architecture)

${architecture}

## Checklist

${checklist}

## ALLOWED PATHS
You may only cite these paths in Findings and Cursor action list:

${pathsBlock}

## Git diff

\`\`\`diff
${diff || '(empty diff)'}
\`\`\`

## Required output format

## Verdict
OK | WARN | BLOCK

## Summary
One or two sentences on guideline compliance.

## Findings
- [SEVERITY] path — issue — guideline — fix
or
- none

## Cursor action list
1. Concrete fix for a finding (must reference an ALLOWED PATH)
or
none

Severity values: BLOCK / WARN / NOTE.
`;
}

function lineCitesAllowedPath(line, allowed) {
  return [...allowed].some((p) => line.includes(p));
}

function sanitizeReview(text, allowedPaths) {
  const allowed = new Set(allowedPaths.map((p) => p.replace(/\\/g, '/')));
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  /** @type {null | 'findings' | 'actions'} */
  let section = null;
  let findingsKept = 0;
  let actionsKept = 0;

  const flushEmptySection = (kind, kept) => {
    if (kept > 0) return;
    const placeholder = kind === 'findings' ? '- none' : 'none';
    const last = out[out.length - 1];
    if (last && new RegExp(`^##\\s+${kind === 'findings' ? 'Findings' : 'Cursor action list'}`, 'i').test(last)) {
      out.push(placeholder);
    }
  };

  for (const line of lines) {
    if (/^##\s+Findings\s*$/i.test(line)) {
      if (section === 'actions') flushEmptySection('actions', actionsKept);
      section = 'findings';
      out.push(line);
      continue;
    }
    if (/^##\s+Cursor action list\s*$/i.test(line)) {
      if (section === 'findings') flushEmptySection('findings', findingsKept);
      section = 'actions';
      out.push(line);
      continue;
    }
    if (/^##\s+/.test(line)) {
      if (section === 'findings') flushEmptySection('findings', findingsKept);
      if (section === 'actions') flushEmptySection('actions', actionsKept);
      section = null;
      out.push(line);
      continue;
    }

    if (section === 'findings') {
      const trimmed = line.trim();
      if (trimmed === '' || /^-\s*none\s*$/i.test(trimmed)) {
        out.push(line);
        if (/none/i.test(trimmed)) findingsKept++;
        continue;
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        if (lineCitesAllowedPath(trimmed, allowed)) {
          out.push(line);
          findingsKept++;
        }
        continue;
      }
      out.push(line);
      continue;
    }

    if (section === 'actions') {
      const trimmed = line.trim();
      if (trimmed === '' || /^none\s*$/i.test(trimmed)) {
        out.push(line);
        if (/^none$/i.test(trimmed)) actionsKept++;
        continue;
      }
      if (/^\d+[).\]]\s+/.test(trimmed) || trimmed.startsWith('-')) {
        if (lineCitesAllowedPath(trimmed, allowed)) {
          out.push(line);
          actionsKept++;
        }
        continue;
      }
      out.push(line);
      continue;
    }

    out.push(line);
  }

  if (section === 'findings') flushEmptySection('findings', findingsKept);
  if (section === 'actions') flushEmptySection('actions', actionsKept);

  // If every finding was dropped, action list must not keep orphaned invented steps
  if (findingsKept === 0) {
    const joined = out.join('\n');
    const fixed = joined.replace(
      /(##\s+Cursor action list\s*\n)([\s\S]*?)$/i,
      '$1none\n',
    );
    return fixed.trim() + '\n';
  }

  return out.join('\n').trim() + '\n';
}

async function callOllama({ system, user }) {
  const url = `${OLLAMA_HOST}/api/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Ollama request failed (${res.status}) at ${url}: ${body.slice(0, 500)}`,
    );
  }

  const data = await res.json();
  const content = data?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Ollama response missing message.content');
  }
  return content.trim() + '\n';
}

function timestampName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `review-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.md`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const repoRoot = findRepoRoot(join(__dirname, '..'));

  const system = readRequired(join(repoRoot, '.ai/prompts/reviewer.md'));
  const architecture = readRequired(join(repoRoot, '.ai/memory/architecture.md'));
  const checklist = readRequired(join(repoRoot, '.ai/memory/checklist.md'));

  const diff = collectDiff(repoRoot, opts);
  const allowedPaths = extractAllowedPaths(diff);
  const user = buildUserPrompt({
    architecture,
    checklist,
    diff,
    allowedPaths,
  });

  if (opts.dryRun) {
    console.log('=== SYSTEM ===\n');
    console.log(system);
    console.log('\n=== USER ===\n');
    console.log(user);
    console.log(
      `\n(dry-run) model=${OLLAMA_MODEL} host=${OLLAMA_HOST} paths=${allowedPaths.length} diffChars=${diff.length}`,
    );
    return;
  }

  if (!diff.trim()) {
    const empty = `## Verdict
OK

## Summary
No git changes to review.

## Findings
- none

## Cursor action list
none
`;
    console.log(empty);
    if (opts.save) {
      const reviewsDir = join(repoRoot, '.ai/reviews');
      mkdirSync(reviewsDir, { recursive: true });
      const outPath = join(reviewsDir, timestampName());
      writeFileSync(outPath, empty, 'utf8');
      console.error(`Saved ${relative(repoRoot, outPath)}`);
    }
    return;
  }

  console.error(
    `Reviewing ${allowedPaths.length} path(s) with ${OLLAMA_MODEL} @ ${OLLAMA_HOST} …`,
  );

  const raw = await callOllama({ system, user });
  const review = sanitizeReview(raw, allowedPaths);
  console.log(review);

  if (opts.save) {
    const reviewsDir = join(repoRoot, '.ai/reviews');
    mkdirSync(reviewsDir, { recursive: true });
    const outPath = join(reviewsDir, timestampName());
    writeFileSync(outPath, review, 'utf8');
    console.error(`Saved ${relative(repoRoot, outPath)}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
