import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

const workflow = readFileSync(resolve('.github/workflows/pdf-book-gate.yml'), 'utf8');
const selector = workflow
  .split('        id: select\n')[1]
  .split('        run: |\n')[1]
  .split('\n      - name:')[0]
  .split('\n')
  .map((line) => line.slice(10))
  .join('\n');
const known = [
  '.github/ci/README.md',
  '.github/ci/phase/zip-contents.sh',
  '.github/ci/zip-contents.test.mjs',
];
const book = 'material/30days-curriculum/day01-synthetic.md';

function runSelector(
  changes,
  { fontDiff = '', noMerge = false, diffFailure = false, bookText } = {},
) {
  const root = mkdtempSync(join(tmpdir(), 'task-pdf-selection-'));
  try {
    mkdirSync(join(root, 'bin'));
    mkdirSync(join(root, 'runner'));
    for (const change of changes.filter((item) => !item.deleted)) {
      mkdirSync(dirname(join(root, change.path)), { recursive: true });
      writeFileSync(join(root, change.path), 'synthetic fixture only');
    }
    if (bookText !== undefined) {
      mkdirSync(dirname(join(root, book)), { recursive: true });
      writeFileSync(join(root, book), bookText);
    }
    writeFileSync(join(root, 'all.z'), changes.map((item) => `${item.path}\0`).join(''));
    writeFileSync(
      join(root, 'active.z'),
      changes
        .filter((item) => !item.deleted)
        .map((item) => `${item.path}\0`)
        .join(''),
    );
    writeFileSync(join(root, 'fonts.diff'), fontDiff);
    writeFileSync(
      join(root, 'bin/git'),
      `#!/bin/bash
case "$*" in
  'rev-list --parents -n 1 HEAD')
    if [ "$NO_MERGE" = 1 ]; then echo head; else echo 'head base topic'; fi ;;
  'rev-parse HEAD^1') echo base ;;
  *--name-only*)
    [ "$DIFF_FAILURE" != 1 ] || exit 47
    if [[ "$*" == *--diff-filter=d* ]]; then cat "$FIXTURE/active.z"; else cat "$FIXTURE/all.z"; fi ;;
  *'package.json package-lock.json') cat "$FIXTURE/fonts.diff" ;;
  *) echo "unexpected git command" >&2; exit 90 ;;
esac
`,
      { mode: 0o755 },
    );
    const result = spawnSync('bash', ['-eo', 'pipefail', '-c', selector], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${join(root, 'bin')}:${process.env.PATH}`,
        RUNNER_TEMP: join(root, 'runner'),
        GITHUB_OUTPUT: join(root, 'output'),
        FIXTURE: root,
        NO_MERGE: noMerge ? '1' : '0',
        DIFF_FAILURE: diffFailure ? '1' : '0',
      },
    });
    const output = existsSync(join(root, 'output'))
      ? readFileSync(join(root, 'output'), 'utf8')
      : '';
    return { ...result, output, books: readFileSync(join(root, 'runner/books.txt'), 'utf8') };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

for (const path of known) {
  for (const deleted of [false, true]) {
    test(`known ZIP-only path keeps browser QA without PDF output: ${path} deleted=${deleted}`, () => {
      const result = runSelector([{ path, deleted }]);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.output, /^scope=none$/m);
      assert.match(result.output, /^browser_qa=1$/m);
    });
  }
}

for (const path of [
  '.github/ci/run.sh',
  '.github/ci/phase/zip-new.sh',
  '.github/ci/phase/zip-contents.sh.backup',
  '.github/ci/README.md.extra',
  '.github/ci/pdf-selection.test.mjs',
]) {
  for (const deleted of [false, true]) {
    test(`unknown shared CI change requires all PDF outputs: ${path} deleted=${deleted}`, () => {
      const result = runSelector([{ path, deleted }]);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.output, /^scope=all$/m);
      assert.match(result.output, /^browser_qa=1$/m);
    });
  }
}

test('known ZIP change mixed with a synthetic book retains full selection', () => {
  const result = runSelector([{ path: known[1] }, { path: book }]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.output, /^scope=all$/m);
  assert.equal(result.books, `${book}\n`);
  assert.match(result.output, /^browser_qa=1$/m);
});

test('the complete known ZIP-only change set skips PDF output but keeps browser QA', () => {
  const result = runSelector(known.map((path) => ({ path })));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.output, /^scope=none$/m);
  assert.match(result.output, /^browser_qa=1$/m);
});

for (const path of ['doc/synthetic.md', 'src/synthetic.ts', 'package.json', 'taskfile.yaml']) {
  test(`any additional path disables the ZIP-only exemption: ${path}`, () => {
    const result = runSelector([...known.map((item) => ({ path: item })), { path }]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.output, /^scope=all$/m);
    assert.match(result.output, /^browser_qa=1$/m);
  });
}

test('ZIP plus a referenced leading-dash screenshot cannot skip PDF verification', () => {
  const result = runSelector(
    [{ path: known[1] }, { path: 'material/30days-curriculum/screenshots/--synthetic.png' }],
    { bookText: 'synthetic image reference --synthetic.png\n' },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.output, /^scope=all$/m);
  assert.match(result.output, /^browser_qa=1$/m);
});

test('deleted synthetic book plus deleted unknown shared phase still selects all remaining books', () => {
  const result = runSelector([
    { path: book, deleted: true },
    { path: '.github/ci/phase/new.sh', deleted: true },
  ]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.output, /^scope=all$/m);
});

test('known ZIP change cannot hide a deleted book from remaining catalog verification', () => {
  const result = runSelector([{ path: known[1] }, { path: book, deleted: true }]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.output, /^scope=all$/m);
  assert.match(result.output, /^browser_qa=1$/m);
});

test('PDF workflow itself still requires all outputs', () => {
  const result = runSelector([{ path: '.github/workflows/pdf-book-gate.yml' }]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.output, /^scope=all$/m);
  assert.match(result.output, /^browser_qa=1$/m);
});

test('missing merge baseline keeps the full fallback', () => {
  const result = runSelector([{ path: known[0] }], { noMerge: true });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.output, /^scope=all$/m);
});

test('diff lookup failure cannot report an unaffected PDF set', () => {
  const result = runSelector([{ path: known[0] }], { diffFailure: true });
  assert.equal(result.status, 47, result.stdout + result.stderr);
  assert.doesNotMatch(result.output, /scope=none/);
});

test('large font dependency diff still requires all outputs', () => {
  const result = runSelector([{ path: known[0] }], {
    fontDiff: `${'x'.repeat(250000)}\n@fontsource/synthetic\n`,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.output, /^scope=all$/m);
});

for (const oldPath of ['.github/ci/phase/unknown.sh', book]) {
  test(`real Git rename cannot hide a removed input behind a known ZIP path: ${oldPath}`, () => {
    const root = mkdtempSync(join(tmpdir(), 'task-pdf-rename-'));
    const env = {
      ...process.env,
      GIT_AUTHOR_NAME: 'Synthetic CI fixture',
      GIT_AUTHOR_EMAIL: 'synthetic@example.invalid',
      GIT_COMMITTER_NAME: 'Synthetic CI fixture',
      GIT_COMMITTER_EMAIL: 'synthetic@example.invalid',
      RUNNER_TEMP: join(root, 'runner'),
      GITHUB_OUTPUT: join(root, 'output'),
    };
    const git = (...args) => {
      const result = spawnSync('git', args, { cwd: root, env, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      return result.stdout;
    };
    try {
      mkdirSync(join(root, 'runner'));
      mkdirSync(join(root, '.github/ci/phase'), { recursive: true });
      mkdirSync(dirname(join(root, oldPath)), { recursive: true });
      git('init', '-b', 'base');
      writeFileSync(join(root, oldPath), 'synthetic rename fixture\n');
      git('add', '.');
      git('commit', '-m', 'test fixture base');
      git('checkout', '-b', 'topic');
      renameSync(join(root, oldPath), join(root, known[1]));
      git('add', '.');
      git('commit', '-m', 'test fixture rename');
      git('checkout', 'base');
      writeFileSync(join(root, 'keep.txt'), 'synthetic merge fixture\n');
      git('add', '.');
      git('commit', '-m', 'test fixture second parent');
      git('merge', '--no-ff', '--no-edit', 'topic');
      assert.equal(git('diff', '-M', '--name-only', 'HEAD^1', 'HEAD').trim(), known[1]);
      const result = spawnSync('bash', ['-eo', 'pipefail', '-c', selector], {
        cwd: root,
        env,
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(readFileSync(join(root, 'output'), 'utf8'), /^scope=all$/m);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
