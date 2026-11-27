import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const script = resolve('.github/ci/next-version.sh');

const git = (cwd, ...args) => {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  });
  assert.equal(result.status, 0, result.stderr);
};

// 一時リポジトリにタグ v1.2.4 を置き、その後ろに commits を積んで次の版を計算する
const nextVersion = (commits, { tag = 'v1.2.4' } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'next-version-'));
  try {
    git(dir, 'init', '-q');
    writeFileSync(join(dir, 'package.json'), '{\n  "name": "x",\n  "version": "1.0.0"\n}\n');
    git(dir, 'add', 'package.json');
    git(dir, 'commit', '-q', '-m', 'chore: init');
    if (tag) git(dir, 'tag', tag);
    for (const [subject, body] of commits) {
      const args = ['commit', '-q', '--allow-empty', '-m', subject];
      if (body) args.push('-m', body);
      git(dir, ...args);
    }
    const output = join(dir, 'github-output');
    const result = spawnSync('bash', [script], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_OUTPUT: output },
    });
    assert.equal(result.status, 0, result.stderr);
    return readFileSync(output, 'utf8').trim();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('本文の途中の BREAKING CHANGE という語では major にしない', () => {
  assert.equal(nextVersion([['fix(ci): something', 'BREAKING CHANGE の扱いは変えない。']]), 'version=1.2.5');
});

test('本文の行頭の type!: では major にしない', () => {
  assert.equal(nextVersion([['docs: list', 'fix!: 旧形式を消した件の説明']]), 'version=1.2.5');
});

test('本文の脚注の BREAKING CHANGE: では major にする', () => {
  assert.equal(nextVersion([['fix: drop old field', 'BREAKING CHANGE: field x is removed']]), 'version=2.0.0');
  assert.equal(nextVersion([['fix: drop old field', 'BREAKING-CHANGE: field x is removed']]), 'version=2.0.0');
});

test('件名の type!: と type(scope)!: では major にする', () => {
  assert.equal(nextVersion([['feat!: new api']]), 'version=2.0.0');
  assert.equal(nextVersion([['refactor(api)!: rename']]), 'version=2.0.0');
});

test('件名の feat: では minor、ほかは patch にする', () => {
  assert.equal(nextVersion([['feat(ui): add button'], ['fix: typo']]), 'version=1.3.0');
  assert.equal(nextVersion([['fix: typo'], ['docs: note']]), 'version=1.2.5');
});

test('タグが無い初回は package.json の版をそのまま使う', () => {
  assert.equal(nextVersion([['feat!: anything']], { tag: null }), 'version=1.0.0');
});

test('deploy-r2.yml の version ジョブはこのスクリプトで版を決める', () => {
  const workflow = readFileSync(resolve('.github/workflows/deploy-r2.yml'), 'utf8');
  assert.ok(workflow.includes('run: bash .github/ci/next-version.sh'));
  assert.ok(!workflow.includes("--format='%s%n%b'"));
});
