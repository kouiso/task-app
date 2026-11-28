#!/usr/bin/env node
// deploy-r2.yml が、前の版の教材 PDF ZIP を再利用してよいかを判定する。
// 判定は pdf-book-gate.yml が全冊の組み直し対象にしている入力へ寄せる。
// 対象外と断定できない時は組み直す側（changed=true）へ倒す。

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) throw new Error(`unknown argument: ${key}`);
    const name = key.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${key}`);
    result[name] = value;
    index += 1;
  }
  for (const name of ['base', 'head']) {
    if (!result[name]) throw new Error(`--${name} is required`);
  }
  return result;
}

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}

const zipOnlyCiPaths = new Set([
  '.github/ci/README.md',
  '.github/ci/phase/zip-contents.sh',
  '.github/ci/zip-contents.test.mjs',
]);

const exactInputs = new Set([
  'material/style/book.css',
  'scripts/curriculum-qa/markdown_scan.py',
  'Makefile',
  '.github/workflows/pdf-book-gate.yml',
]);

function pathAffectsPdf(path, zipOnly) {
  if (exactInputs.has(path)) return true;
  if (/^material\/30days-curriculum\/[^/]+\.md$/.test(path)) return true;
  if (path.startsWith('scripts/pdf-book/')) return true;
  if (path.startsWith('.github/actions/pdf-book-env/')) return true;
  if (path.startsWith('.github/ci/')) return !zipOnly || !zipOnlyCiPaths.has(path);
  return false;
}

function screenshotHasReader(path) {
  const filename = path.split('/').pop();
  const result = spawnSync(
    'grep',
    ['-rl', '--fixed-strings', filename, 'material/30days-curriculum', '--include=*.md'],
    { encoding: 'utf8' },
  );
  if (result.error) throw result.error;
  if (result.status === 0) return result.stdout.trim().length > 0;
  if (result.status === 1) return false;
  return true;
}

function gitOrNull(args) {
  const result = git(args);
  return result.status === 0 ? result.stdout : null;
}

function decide(base, head) {
  const baseObject = gitOrNull(['rev-parse', '--verify', `${base}^{commit}`]);
  const headObject = gitOrNull(['rev-parse', '--verify', `${head}^{commit}`]);
  if (!baseObject || !headObject) {
    return {
      changed: true,
      reason: `base or head is unavailable (${base}..${head}); rebuilding PDFs`,
    };
  }

  const names = git([
    '-c',
    'core.quotePath=false',
    'diff',
    '--no-renames',
    '-z',
    '--name-only',
    base,
    head,
  ]);
  if (names.status !== 0) {
    return {
      changed: true,
      reason: `git diff failed for ${base}..${head}; rebuilding PDFs`,
    };
  }

  const paths = names.stdout.split('\0').filter(Boolean);
  const zipOnly = paths.every((path) => zipOnlyCiPaths.has(path));
  const screenshot = paths.find(
    (path) =>
      path.startsWith('material/30days-curriculum/screenshots/') && screenshotHasReader(path),
  );
  if (screenshot) {
    return {
      changed: true,
      reason: `PDF input changed: ${screenshot}`,
    };
  }
  const direct = paths.find((path) => pathAffectsPdf(path, zipOnly));
  if (direct) {
    return {
      changed: true,
      reason: `PDF input changed: ${direct}`,
    };
  }

  if (paths.includes('package.json') || paths.includes('package-lock.json')) {
    const dependencyDiff = git(['diff', base, head, '--', 'package.json', 'package-lock.json']);
    if (dependencyDiff.status !== 0) {
      return {
        changed: true,
        reason: `dependency diff failed for ${base}..${head}; rebuilding PDFs`,
      };
    }
    if (/@expo-google-fonts\/|@fontsource\//.test(dependencyDiff.stdout)) {
      return {
        changed: true,
        reason: 'font dependency changed',
      };
    }
  }

  return {
    changed: false,
    reason: `no PDF input changed in ${paths.length} path(s)`,
  };
}

function writeOutput(decision) {
  const lines = [
    `pdf_inputs_changed=${decision.changed ? 'true' : 'false'}`,
    `pdf_inputs_reason=${decision.reason.replaceAll('\n', ' ')}`,
  ];
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
  } else {
    process.stdout.write(`${lines.join('\n')}\n`);
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  const decision = decide(args.base, args.head);
  assert.equal(typeof decision.changed, 'boolean');
  writeOutput(decision);
} catch (error) {
  // 再利用の根拠が読めない時だけは、リリースを止めずに高い方の検査（組み直し）へ倒す。
  // ここで false を出す道は無い。
  writeOutput({
    changed: true,
    reason: `input decision failed (${error instanceof Error ? error.message : String(error)}); rebuilding PDFs`,
  });
}
