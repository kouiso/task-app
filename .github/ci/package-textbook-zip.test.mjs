import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const packager = resolve('.github/ci/package-textbook-zip.sh');
const checker = resolve('.github/ci/check-textbook-zip.sh');

function run(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: 'utf8' });
}

function fixture(count) {
  const root = mkdtempSync(join(tmpdir(), 'textbook-zip-'));
  const pdfDir = join(root, 'pdf');
  mkdirSync(pdfDir);
  for (let index = 1; index <= count; index += 1) {
    writeFileSync(
      join(pdfDir, `day${String(index).padStart(2, '0')}-synthetic.pdf`),
      `%PDF-synthetic-${index}\n`,
    );
  }
  return { root, pdfDir };
}

test('packages exactly 36 PDFs under task-app-textbook/', () => {
  const { root, pdfDir } = fixture(36);
  try {
    const result = run('bash', [packager, pdfDir, 'task-app-textbook.zip'], root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(join(root, 'task-app-textbook.zip')), true);
    const list = run('unzip', ['-Z1', 'task-app-textbook.zip'], root);
    assert.equal(list.status, 0, list.stderr);
    const entries = list.stdout.trim().split('\n');
    assert.equal(entries.filter((entry) => entry.endsWith('.pdf')).length, 36);
    assert.ok(
      entries.every(
        (entry) => entry === 'task-app-textbook/' || /^task-app-textbook\/[^/]+\.pdf$/.test(entry),
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects missing 36th PDF before writing output ZIP', () => {
  const { root, pdfDir } = fixture(35);
  try {
    const result = run('bash', [packager, pdfDir, 'task-app-textbook.zip'], root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expected 36 PDFs/);
    assert.equal(existsSync(join(root, 'task-app-textbook.zip')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects unexpected entries in textbook ZIP', () => {
  const root = mkdtempSync(join(tmpdir(), 'textbook-zip-check-'));
  try {
    mkdirSync(join(root, 'task-app-textbook'));
    writeFileSync(join(root, 'task-app-textbook', 'not-a-pdf.txt'), 'bad\n');
    run('zip', ['-qr', 'bad.zip', 'task-app-textbook'], root);
    const result = run('bash', [checker, 'bad.zip'], root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /36 PDFs|unexpected entries/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
