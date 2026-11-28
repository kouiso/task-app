import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

const script = resolve('.github/ci/pdf-release-inputs.mjs');
const workflow = readFileSync(resolve('.github/workflows/deploy-r2.yml'), 'utf8');

function git(cwd, ...args) {
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
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}`);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'pdf-release-inputs-'));
  git(root, 'init', '-q', '-b', 'main');
  writeFileSync(join(root, 'README.md'), 'base\n');
  git(root, 'add', 'README.md');
  git(root, 'commit', '-q', '-m', 'chore: base');
  git(root, 'tag', 'v1.2.4');
  return root;
}

function commitFile(root, path, text = 'synthetic\n') {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
  git(root, 'add', path);
  git(root, 'commit', '-q', '-m', `test: ${path}`);
}

function decide(root, { base = 'v1.2.4', head = 'HEAD' } = {}) {
  const output = join(root, 'github-output');
  const result = spawnSync('node', [script, '--base', base, '--head', head], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_OUTPUT: output },
  });
  assert.equal(result.status, 0, result.stderr);
  return readFileSync(output, 'utf8');
}

function withFixture(run) {
  const root = fixture();
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('source-only change can reuse the previous textbook ZIP', () => {
  withFixture((root) => {
    commitFile(root, 'src/app.ts');
    const output = decide(root);
    assert.match(output, /^pdf_inputs_changed=false$/m);
    assert.match(output, /^pdf_inputs_reason=no PDF input changed in 1 path\(s\)$/m);
  });
});

for (const path of [
  'material/30days-curriculum/day01-synthetic.md',
  'material/style/book.css',
  'scripts/pdf-book/build_pdf_book.py',
  'scripts/pdf-book/toolchain/package-lock.json',
  'scripts/curriculum-qa/markdown_scan.py',
  'Makefile',
  '.github/workflows/pdf-book-gate.yml',
  '.github/actions/pdf-book-env/action.yml',
  '.github/ci/run.sh',
]) {
  test(`PDF input requires rebuild: ${path}`, () => {
    withFixture((root) => {
      commitFile(root, path);
      assert.match(decide(root), /^pdf_inputs_changed=true$/m);
    });
  });
}

for (const path of [
  '.github/ci/README.md',
  '.github/ci/phase/zip-contents.sh',
  '.github/ci/zip-contents.test.mjs',
]) {
  test(`known ZIP-only CI path can reuse: ${path}`, () => {
    withFixture((root) => {
      commitFile(root, path);
      assert.match(decide(root), /^pdf_inputs_changed=false$/m);
    });
  });
}

test('nested metadata that is not printed can reuse the previous textbook ZIP', () => {
  withFixture((root) => {
    commitFile(root, 'material/30days-curriculum/_meta/day01.json');
    assert.match(decide(root), /^pdf_inputs_changed=false$/m);
  });
});

test('referenced screenshot requires rebuild and orphan screenshot does not', () => {
  withFixture((root) => {
    commitFile(
      root,
      'material/30days-curriculum/day01-synthetic.md',
      '![shot](screenshots/screen.png)\n',
    );
    commitFile(root, 'material/30days-curriculum/screenshots/screen.png', 'png\n');
    assert.match(decide(root), /^pdf_inputs_changed=true$/m);
  });
  withFixture((root) => {
    commitFile(root, 'material/30days-curriculum/screenshots/orphan.png', 'png\n');
    assert.match(decide(root), /^pdf_inputs_changed=false$/m);
  });
});

test('ZIP-only CI file mixed with source follows the PDF gate blast boundary', () => {
  withFixture((root) => {
    commitFile(root, '.github/ci/README.md');
    commitFile(root, 'src/app.ts');
    assert.match(decide(root), /^pdf_inputs_changed=true$/m);
  });
});

test('font dependency diff requires rebuild, unrelated package diff does not', () => {
  withFixture((root) => {
    commitFile(
      root,
      'package-lock.json',
      '{"packages":{"node_modules/react":{"version":"19.0.0"}}}\n',
    );
    assert.match(decide(root), /^pdf_inputs_changed=false$/m);
  });
  withFixture((root) => {
    commitFile(
      root,
      'package-lock.json',
      '{"packages":{"node_modules/@fontsource/noto-sans-jp":{"version":"1.0.0"}}}\n',
    );
    const output = decide(root);
    assert.match(output, /^pdf_inputs_changed=true$/m);
    assert.match(output, /font dependency changed/);
  });
});

test('deleted textbook input cannot be hidden by rename detection', () => {
  withFixture((root) => {
    const path = 'material/30days-curriculum/day01-synthetic.md';
    commitFile(root, path);
    git(root, 'tag', 'v1.2.5');
    git(root, 'rm', '-q', path);
    git(root, 'commit', '-q', '-m', 'test: delete input');
    assert.match(decide(root, { base: 'v1.2.5' }), /^pdf_inputs_changed=true$/m);
  });
});

test('unreadable base or diff failure never reports reusable', () => {
  withFixture((root) => {
    commitFile(root, 'src/app.ts');
    assert.match(decide(root, { base: 'missing-tag' }), /^pdf_inputs_changed=true$/m);
  });
});

test('deploy workflow wires both textbook ZIP paths through one immutable release prefix', () => {
  assert.ok(workflow.includes('TEXTBOOK_ZIP_PATH: task-app-textbook.zip'));
  assert.ok(workflow.includes('textbook_object_key=' + '${PREFIX}${TEXTBOOK_ZIP_NAME}'));
  assert.ok(workflow.includes('node .github/ci/pdf-release-inputs.mjs'));
  assert.ok(workflow.includes('run.sh pdf-full-build'));
  assert.ok(workflow.includes('run.sh pdf-full-verify'));
  assert.ok(
    workflow.includes(
      'rclone copyto -v --stats-one-line "' +
        '${TEXTBOOK_ZIP_PATH}' +
        '" "r2:' +
        '${BUCKET}' +
        '/${textbook_object_key}"',
    ),
  );
  assert.ok(
    workflow.includes(
      'rclone copyto "r2:' +
        '${BUCKET}' +
        '/${previous_textbook_object_key}" "r2:' +
        '${BUCKET}' +
        '/${textbook_object_key}"',
    ),
  );
  assert.ok(workflow.indexOf('Upload sales ZIP to R2') < workflow.indexOf('Notify course-library'));
  assert.ok(
    workflow.indexOf('Upload textbook ZIP to R2') < workflow.indexOf('Notify course-library'),
  );

  const fullWorkflow = readFileSync(resolve('.github/workflows/pdf-book-full.yml'), 'utf8');
  assert.ok(
    fullWorkflow.indexOf('run.sh pdf-full-verify') <
      fullWorkflow.indexOf('package-textbook-zip.sh dist/pdf task-app-textbook.zip'),
  );
  assert.ok(fullWorkflow.includes('name: task-app-textbook-zip'));
});
