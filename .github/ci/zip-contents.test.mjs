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
import { createRequire } from 'node:module';
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

const require = createRequire(import.meta.url);

async function loadGoogleFont(t, url, bytes) {
  const cssFetcher = require('next/dist/compiled/@next/font/dist/google/fetch-css-from-google-fonts');
  const fontFetcher = require('next/dist/compiled/@next/font/dist/google/fetch-font-file');
  t.mock.method(
    cssFetcher,
    'fetchCSSFromGoogleFonts',
    async () => `@font-face {\nfont-family: 'Inter';\nsrc: url(${url});\n}`,
  );
  t.mock.method(fontFetcher, 'fetchFontFile', async () => bytes);
  const loaderPath = require.resolve('next/dist/compiled/@next/font/dist/google/loader');
  delete require.cache[loaderPath];
  const extensions = [];
  const result = await require(loaderPath).default({
    functionName: 'Inter',
    data: [{ subsets: ['latin'] }],
    isDev: false,
    isServer: true,
    emitFontFile(buffer, extension) {
      assert.equal(buffer, bytes);
      extensions.push(extension);
      return `/media/font.${extension}`;
    },
  });
  return { extensions, css: result.css };
}

for (const extension of ['woff2', 'woff', 'ttf', 'otf', 'eot']) {
  test(`Google font URLs with a ${extension} suffix keep their format`, async (t) => {
    const result = await loadGoogleFont(
      t,
      `https://fonts.gstatic.com/font.${extension}`,
      Buffer.from('legacy'),
    );
    assert.deepEqual(result.extensions, [extension]);
    assert.ok(result.css.includes(`/media/font.${extension}`));
  });
}

for (const [signature, extension] of [
  ['774f4632', 'woff2'],
  ['774f4646', 'woff'],
  ['00010000', 'ttf'],
  ['74727565', 'ttf'],
  ['4f54544f', 'otf'],
]) {
  test(`extensionless Google font URLs use the ${signature} binary signature`, async (t) => {
    const result = await loadGoogleFont(
      t,
      'https://fonts.gstatic.com/l/font?kit=fixture',
      Buffer.from(signature, 'hex'),
    );
    assert.deepEqual(result.extensions, [extension]);
    assert.ok(result.css.includes(`/media/font.${extension}`));
  });
}

test('font URL query strings do not hide an existing extension', async (t) => {
  const result = await loadGoogleFont(
    t,
    'https://fonts.gstatic.com/font.eot?version=1#font',
    Buffer.from('legacy'),
  );
  assert.deepEqual(result.extensions, ['eot']);
});

for (const bytes of [Buffer.from('<html>upstream error</html>'), Buffer.from([0])]) {
  test(`extensionless non-font responses fail explicitly (${bytes.length} bytes)`, async (t) => {
    await assert.rejects(loadGoogleFont(t, 'https://fonts.gstatic.com/l/font?kit=fixture', bytes), {
      name: 'NextFontError',
      message: /Unsupported font file format/,
    });
  });
}

test('sale ZIP and reader setup carry the same pinned Next font patch', () => {
  const built = spawnSync('bash', ['scripts/build-zip.sh'], { encoding: 'utf8' });
  assert.equal(built.status, 0, built.stdout + built.stderr);
  const patch = 'patches/next+15.5.24.patch';
  const extracted = spawnSync(
    'unzip',
    ['-p', 'task-app-curriculum-v1.1.zip', `task-app/${patch}`],
    { encoding: 'utf8' },
  );
  assert.equal(extracted.status, 0, extracted.stderr);
  assert.equal(extracted.stdout, readFileSync(patch, 'utf8'));
  const scaffold = readFileSync('scripts/scaffold-from-scratch.sh', 'utf8');
  assert.ok(scaffold.includes('patch-package@8.0.1'));
  assert.ok(scaffold.includes('scripts.postinstall="prisma generate && npx patch-package"'));
  assert.ok(scaffold.includes('npx patch-package'));
});
