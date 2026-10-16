import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const source = resolve('.github/ci');
function fixture() {
  assert.ok(readFileSync(join(source, 'run.sh'), 'utf8').includes('set -euo pipefail'));
  const root = mkdtempSync(join(tmpdir(), 'task-ci-'));
  mkdirSync(join(root, '.github'), { recursive: true });
  cpSync(source, join(root, '.github/ci'), { recursive: true });
  mkdirSync(join(root, 'bin'));
  for (const command of [
    'npm',
    'npx',
    'make',
    'python3',
    'pg_isready',
    'sleep',
    'license-checker',
    'semgrep',
    'docker',
  ]) {
    writeFileSync(
      join(root, 'bin', command),
      `#!/bin/bash\nprintf '%s\\n' '${command}'" $*" >> "$LOG"\nif [ "${command} $*" = "$FAIL_COMMAND" ]; then exit 17; fi\nif [ '${command}' = make ] && [ "$1" = snapshot-verify ]; then\n for n in $(seq -w 1 30); do [ "$n" = "$MISSING_DAY" ] || echo "day$n: PASS"; done\n [ "$SKIP_DAY" != yes ] || echo 'build を判定できんかった日'\nfi\nexit 0\n`,
      { mode: 0o755 },
    );
  }
  const run = (phase, extra = {}) =>
    spawnSync('bash', ['.github/ci/run.sh', phase], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${root}/bin:${process.env.PATH}`,
        LOG: join(root, 'log'),
        RUNNER_TEMP: root,
        SCOPE: 'all',
        PDF_BOOK_BUILD_LOG_DIR: join(root, 'pdf-log'),
        ...extra,
      },
    });
  return {
    root,
    run,
    log: () => readFileSync(join(root, 'log'), 'utf8').trim().split('\n'),
    close: () => rmSync(root, { recursive: true, force: true }),
  };
}
test('fast runs exactly the application cloud commands in order', () => {
  const f = fixture();
  try {
    assert.equal(f.run('fast').status, 0);
    assert.deepEqual(f.log(), [
      'npm run build:ci',
      'npm run lint',
      'npm run type-check',
      'npm test',
    ]);
  } finally {
    f.close();
  }
});
test('each application failure stops subsequent checks and retains its exit', () => {
  for (const command of ['npm run build:ci', 'npm run lint', 'npm run type-check', 'npm test']) {
    const f = fixture();
    try {
      assert.equal(f.run('fast', { FAIL_COMMAND: command }).status, 17);
      assert.equal(f.log().at(-1), command);
    } finally {
      f.close();
    }
  }
});
test('unknown phase fails without running tools', () => {
  const f = fixture();
  try {
    assert.equal(f.run('unknown').status, 2);
  } finally {
    f.close();
  }
});
for (const phase of ['snapshot-coverage', 'snapshot-no-skip']) {
  test(`${phase} rejects missing log`, () => {
    const f = fixture();
    try {
      assert.notEqual(f.run(phase).status, 0);
    } finally {
      f.close();
    }
  });
}
test('snapshot enforces all thirty days and no SKIP', () => {
  for (const extra of [
    {},
    { MISSING_DAY: '17' },
    { SKIP_DAY: 'yes' },
    { FAIL_COMMAND: 'make snapshot-verify' },
  ]) {
    const f = fixture();
    try {
      const result = f.run('snapshot', extra);
      assert.equal(result.status === 0, Object.keys(extra).length === 0, result.stderr);
    } finally {
      f.close();
    }
  }
});
test('PDF subset requires a nonempty selection and command failure is fatal', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.root, 'books.txt'), '');
    assert.notEqual(f.run('pdf-build', { SCOPE: 'subset' }).status, 0);
    assert.notEqual(f.run('pdf-build', { FAIL_COMMAND: 'make book-pdf' }).status, 0);
  } finally {
    f.close();
  }
});
test('license deny list is one literal argument, never evaluated', () => {
  const f = fixture();
  try {
    const deny = 'GPL;MIT;$(touch injected)';
    assert.equal(f.run('license', { DISALLOWED_LICENSES: deny }).status, 0);
    assert.deepEqual(f.log(), [`license-checker --production --json --failOn ${deny}`]);
    assert.throws(() => readFileSync(join(f.root, 'injected')));
  } finally {
    f.close();
  }
});
test('ZIP checks reject missing artifact and prohibited files', () => {
  const f = fixture();
  try {
    assert.notEqual(f.run('zip-exists').status, 0);
    writeFileSync(
      join(f.root, 'bin', 'unzip'),
      '#!/bin/bash\necho "package.json .env.example tsconfig.json node_modules/"\n',
      { mode: 0o755 },
    );
    assert.notEqual(f.run('zip-contents').status, 0);
  } finally {
    f.close();
  }
});
test('vendored integrity fails for missing directories', () => {
  const f = fixture();
  try {
    assert.notEqual(f.run('vendor-files').status, 0);
  } finally {
    f.close();
  }
});
test('material corpus checks continue after one failure and retain failure', () => {
  const f = fixture();
  try {
    const command = 'python3 scripts/curriculum-qa/test_sale_package.py';
    assert.notEqual(f.run('material-corpus', { FAIL_COMMAND: command }).status, 0);
    assert.ok(f.log().length > 30);
    assert.ok(
      f
        .log()
        .includes('python3 scripts/curriculum-qa/check_crossref.py material/30days-curriculum'),
    );
  } finally {
    f.close();
  }
});
test('PDF verification preserves full and subset command closures', () => {
  const f = fixture();
  try {
    assert.equal(f.run('pdf-verify', { SCOPE: 'all' }).status, 0);
    assert.deepEqual(f.log(), ['make book-pdf-verify']);
    assert.equal(f.run('pdf-verify', { SCOPE: 'subset' }).status, 0);
    assert.deepEqual(f.log().slice(1), [
      'make book-pdf-test',
      'python3 scripts/pdf-book/check_pdf_book.py --allow-gaps',
      'python3 scripts/pdf-book/check_page_layout.py',
      'python3 scripts/pdf-book/verify_pdf_copy.py --allow-missing',
    ]);
  } finally {
    f.close();
  }
});
test('full fails on incomplete checkout before tools, never degrades to fast', () => {
  const f = fixture();
  try {
    assert.notEqual(f.run('full').status, 0);
    assert.throws(() => f.log());
  } finally {
    f.close();
  }
});
test('ZIP extracted phases use extracted working directory and advisory type status', () => {
  const f = fixture();
  try {
    mkdirSync(join(f.root, 'extracted'));
    writeFileSync(join(f.root, 'extracted', '.env.example'), 'fixture');
    const result = spawnSync('bash', [join(f.root, '.github/ci/run.sh'), 'zip-env'], {
      cwd: join(f.root, 'extracted'),
      encoding: 'utf8',
      env: process.env,
    });
    assert.equal(result.status, 0);
    assert.equal(readFileSync(join(f.root, 'extracted', '.env'), 'utf8'), 'fixture');
    assert.equal(f.run('zip-type', { FAIL_COMMAND: 'npm run type-check' }).status, 0);
  } finally {
    f.close();
  }
});
test('license selection unknown baseline/API failure runs full gate', () => {
  for (const scenario of ['fetch-failure', 'diff-failure', 'package', 'entry', 'unrelated']) {
    const f = fixture();
    try {
      const script = `#!/bin/bash\nif [ "$1" = fetch ]; then ${scenario === 'fetch-failure' ? 'exit 7' : 'exit 0'}; fi\n${scenario === 'diff-failure' ? 'exit 8' : `echo '${scenario === 'package' ? 'package-lock.json' : scenario === 'entry' ? '.github/ci/run.sh' : 'README.md'}'`}\n`;
      writeFileSync(join(f.root, 'bin', 'git'), script, { mode: 0o755 });
      const output = join(f.root, 'output');
      assert.equal(
        f.run('license-changes', {
          EVENT_NAME: 'pull_request',
          BASE_REF: 'main',
          HEAD_SHA: 'abc',
          GITHUB_OUTPUT: output,
        }).status,
        0,
      );
      assert.equal(readFileSync(output, 'utf8').trim(), `changes=${scenario !== 'unrelated'}`);
    } finally {
      f.close();
    }
  }
});
function prepareFull(f) {
  for (const path of [
    'node_modules',
    'material/30days-curriculum/screenshots',
    'scripts',
    'scripts/curriculum-qa',
    'doc/review-handoff',
    '.claude/skills/material-writing/hana652-tech-writing-pack',
    '.claude/skills/material-writing/xamfonos-technical-writing-best-practices',
  ])
    mkdirSync(join(f.root, path), { recursive: true });
  for (const path of [
    '.env',
    'Makefile',
    '.claude/skills/material-writing/hana652-tech-writing-pack/fixture',
    '.claude/skills/material-writing/xamfonos-technical-writing-best-practices/fixture',
  ])
    writeFileSync(join(f.root, path), 'fixture');
  for (const script of [
    'sync-ai-rules.sh',
    'build-zip.sh',
    'check-naming-convention.sh',
    'curriculum-qa/check_quality.sh',
  ])
    writeFileSync(join(f.root, 'scripts', script), '#!/bin/bash\nexit 0\n');
  writeFileSync(join(f.root, 'bin', 'xargs'), '#!/bin/bash\nexit 0\n', { mode: 0o755 });
  writeFileSync(join(f.root, 'bin', 'git'), '#!/bin/bash\nexit 0\n', { mode: 0o755 });
  const make = join(f.root, 'bin', 'make');
  const original = readFileSync(make, 'utf8');
  writeFileSync(
    make,
    original.replace(
      'exit 0\n',
      `if [ "$1" = zip-export ]; then mkdir -p dist; touch dist/task-app.zip; fi\nif [ "$1" = book-pdf-verify ]; then echo '✅ 46 ケースすべて通過'; fi\nexit 0\n`,
    ),
  );
  writeFileSync(
    join(f.root, 'bin', 'unzip'),
    `#!/bin/bash\nif [ "$1" = -l ]; then echo 'package.json .env.example tsconfig.json'; else mkdir -p extracted; echo '{}' > extracted/package.json; echo fixture > extracted/.env.example; fi\n`,
    { mode: 0o755 },
  );
}
test('full traverses every gate family with one PDF self-test path and isolated ZIP', () => {
  const f = fixture();
  try {
    prepareFull(f);
    const r = f.run('full');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const log = f.log();
    for (const cmd of [
      'npm audit --omit=dev --audit-level=high',
      'npx textlint material/**/*.md',
      'make book-pdf',
      'make book-pdf-verify',
      'make snapshot-test',
      'make snapshot-verify',
      'make zip-export',
      'npx prisma generate',
    ])
      assert.ok(log.includes(cmd), cmd);
    assert.equal(log.filter((line) => line === 'make book-pdf-verify').length, 1);
    assert.ok(!log.includes('make book-pdf-test'));
    assert.ok(log.includes('npm ci'));
  } finally {
    f.close();
  }
});
test('full preserves first failure and does not enter later expensive families', () => {
  const f = fixture();
  try {
    prepareFull(f);
    assert.equal(
      f.run('full', { FAIL_COMMAND: 'npm audit --omit=dev --audit-level=high' }).status,
      17,
    );
    assert.equal(f.log().at(-1), 'npm audit --omit=dev --audit-level=high');
  } finally {
    f.close();
  }
});
test('local PDF keeps mandatory case-count guard even after successful verification', () => {
  const f = fixture();
  try {
    assert.notEqual(f.run('pdf-local-verify').status, 0);
  } finally {
    f.close();
  }
});
test('performance keeps separate ANALYZE build and stops before Lighthouse on failure', () => {
  const f = fixture();
  try {
    assert.equal(f.run('performance').status, 0);
    assert.deepEqual(f.log(), [
      'npm run lint',
      'npm run type-check',
      'npm run build',
      'npx lhci autorun',
    ]);
    assert.equal(f.run('performance', { FAIL_COMMAND: 'npm run build' }).status, 17);
    assert.equal(f.log().at(-1), 'npm run build');
  } finally {
    f.close();
  }
});
test('secrets full-history scan retains upstream fail and verified-only flags', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.root, 'bin', 'git'), '#!/bin/bash\nexit 0\n', { mode: 0o755 });
    assert.equal(f.run('secrets', { BASE: '', HEAD: '' }).status, 0);
    const cmd = f.log().at(-1);
    assert.ok(
      cmd.includes(
        'ghcr.io/trufflesecurity/trufflehog:latest git file:///tmp/ --since-commit  --branch  --fail --no-update --github-actions --only-verified',
      ),
    );
  } finally {
    f.close();
  }
});
test('secrets rejects same or unavailable commit range before container start', () => {
  for (const code of ['echo abc', 'exit 7']) {
    const f = fixture();
    try {
      writeFileSync(
        join(f.root, 'bin', 'git'),
        `#!/bin/bash\nif [ "$1" = status ]; then exit 0; fi\n${code}\n`,
        { mode: 0o755 },
      );
      assert.notEqual(f.run('secrets', { BASE: 'abc', HEAD: 'def' }).status, 0);
      assert.throws(() => f.log());
    } finally {
      f.close();
    }
  }
});
