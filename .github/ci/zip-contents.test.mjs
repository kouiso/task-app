import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const source = resolve('.github/ci');
test('cloud and local CI include ZIP regression tests', () => {
  const workflow = readFileSync(resolve('.github/workflows/reusable-ci.yml'), 'utf8');
  const taskfile = readFileSync(resolve('taskfile.yaml'), 'utf8');
  const command = 'node --test .github/ci/*.test.mjs';
  assert.ok(workflow.includes(`run: ${command}`));
  assert.ok(taskfile.includes(`- ${command}`));
  for (const name of ['ci:fast', 'ci']) {
    const task = taskfile.split(`  ${name}:\n`)[1].split(/\n {2}[^ ]/)[0];
    assert.ok(task.includes('- task: ci:contracts'));
  }
});
const fixtureCode = `import sys, zipfile
names = ['package.json', '.env.example', 'tsconfig.json']
mode = sys.argv[2]
if mode.startswith('missing-'):
    names.remove(mode.removeprefix('missing-'))
forbidden = {'node_modules': 'node_modules/leak.txt', 'git': '.git/config'}
if mode.startswith('first-'):
    names.insert(0, forbidden[mode.removeprefix('first-')])
names += ['padding/' + str(i) + '-' + 'x' * 100 for i in range(5000)]
if mode.startswith('last-'):
    names.append(forbidden[mode.removeprefix('last-')])
with zipfile.ZipFile(sys.argv[1], 'w') as archive:
    for name in names:
        archive.writestr(name, 'synthetic')
`;

function fixture(mode) {
  const root = mkdtempSync(join(tmpdir(), 'task-zip-ci-'));
  mkdirSync(join(root, '.github'));
  cpSync(source, join(root, '.github/ci'), { recursive: true });
  mkdirSync(join(root, 'dist'));
  mkdirSync(join(root, 'temp'));
  if (mode === 'corrupt') {
    writeFileSync(join(root, 'dist/task-app.zip'), 'not a ZIP');
  } else {
    const created = spawnSync('python3', [
      '-c',
      fixtureCode,
      join(root, 'dist/task-app.zip'),
      mode,
    ]);
    assert.equal(created.status, 0, created.stderr?.toString());
  }
  return {
    root,
    run(extra = {}) {
      return spawnSync('bash', ['.github/ci/run.sh', 'zip-contents'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, TMPDIR: join(root, 'temp'), ...extra },
        maxBuffer: 4 * 1024 * 1024,
      });
    },
    close() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

for (const mode of [
  'valid',
  'missing-package.json',
  'missing-.env.example',
  'missing-tsconfig.json',
  'first-node_modules',
  'last-node_modules',
  'first-git',
  'last-git',
  'corrupt',
]) {
  test(`real ZIP listing: ${mode}`, () => {
    const f = fixture(mode);
    try {
      const result = f.run();
      if (mode === 'valid') {
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /All required files present/);
        assert.match(result.stdout, /Excluded files properly excluded/);
      } else {
        assert.notEqual(result.status, 0, result.stdout + result.stderr);
        assert.doesNotMatch(result.stdout, /Excluded files properly excluded/);
        if (mode.startsWith('missing-')) {
          assert.ok(result.stdout.includes(`${mode.slice(8)} missing`));
        } else if (mode !== 'corrupt') {
          assert.match(result.stdout, /All required files present/);
          assert.ok(
            result.stdout.includes(
              mode.endsWith('node_modules')
                ? 'node_modules should be excluded'
                : '.git should be excluded',
            ),
          );
        }
      }
      assert.deepEqual(readdirSync(join(f.root, 'temp')), []);
    } finally {
      f.close();
    }
  });
}

test('failed unzip cannot pass using its partial listing', () => {
  const f = fixture('valid');
  try {
    mkdirSync(join(f.root, 'bin'));
    writeFileSync(
      join(f.root, 'bin/unzip'),
      '#!/bin/bash\nprintf "package.json\\n.env.example\\ntsconfig.json\\n"\nexit 23\n',
      { mode: 0o755 },
    );
    const result = f.run({ PATH: `${join(f.root, 'bin')}:${process.env.PATH}` });
    assert.equal(result.status, 23, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /All required files present/);
    assert.deepEqual(readdirSync(join(f.root, 'temp')), []);
  } finally {
    f.close();
  }
});
