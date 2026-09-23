import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertHookCount,
  validateManifest,
  verifyPinnedToolchain,
} from './verify-inline-layout.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const WRAPPER = path.join(HERE, 'verify-inline-layout.mjs');
const TOOLCHAIN =
  process.env.PDF_BOOK_TEST_TOOLCHAIN_DIR ?? path.join(REPO, 'dist', '.pdf-book-toolchain');
const BROWSER =
  process.env.PDF_BOOK_TEST_BROWSER ??
  ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(fs.existsSync);
// 個人の作業場所を決め打ちせん。置き場所を変えたい時だけ環境変数で渡す
const SCRATCH_ROOT = process.env.PDF_BOOK_TEST_SCRATCH_DIR ?? os.tmpdir();
const scratchDirectories = [];

function makeScratch(prefix) {
  const directory = fs.mkdtempSync(path.join(SCRATCH_ROOT, prefix));
  scratchDirectories.push(directory);
  return directory;
}

after(() => {
  for (const directory of scratchDirectories) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function manifest(entries, tables) {
  return {
    schema_version: 1,
    document_id: 'inline-layout-test',
    minimum_font_size_pt: 8,
    page_content_selector: '[data-vivliostyle-page-area-container="true"]',
    entries,
    ...(tables ? { tables } : {}),
  };
}

function writeFixture(directory, { html, css, expected }) {
  fs.writeFileSync(path.join(directory, 'fixture.html'), html);
  fs.writeFileSync(path.join(directory, 'fixture.css'), css);
  fs.writeFileSync(
    path.join(directory, 'fixture.config.cjs'),
    "module.exports={title:'inline layout test',language:'ja',entry:[{path:'fixture.html'}],theme:['./fixture.css'],workspaceDir:'.vivliostyle-test'};\n",
  );
  fs.writeFileSync(path.join(directory, 'manifest.json'), `${JSON.stringify(expected, null, 2)}\n`);
}

function runFixture(directory, output = 'output.pdf') {
  const report = path.join(directory, 'report.json');
  const result = spawnSync(
    process.execPath,
    [
      WRAPPER,
      'build',
      '-c',
      'fixture.config.cjs',
      '-s',
      'A4',
      '--executable-browser',
      BROWSER,
      '-o',
      output,
    ],
    {
      cwd: directory,
      encoding: 'utf8',
      timeout: 120_000,
      env: {
        ...process.env,
        PDF_BOOK_INLINE_LAYOUT_MANIFEST: path.join(directory, 'manifest.json'),
        PDF_BOOK_INLINE_LAYOUT_REPORT: report,
        PDF_BOOK_TOOLCHAIN_DIR: TOOLCHAIN,
      },
    },
  );
  return {
    ...result,
    report: JSON.parse(fs.readFileSync(report, 'utf8')),
    output: path.join(directory, output),
  };
}

function observedItem(report, id) {
  const observation = report.dom_audit.observed.find((candidate) => candidate.id === id);
  assert.ok(observation, `missing observation: ${id}`);
  assert.equal(observation.items.length, 1, `unexpected fragment count: ${id}`);
  return observation.items[0];
}

test('manifest schema rejects duplicate ids and weakened font floors', () => {
  assert.throws(
    () =>
      validateManifest(
        manifest([
          { id: 'same', expected_text: 'a', source_order: 0, context: 'flow' },
          { id: 'same', expected_text: 'b', source_order: 1, context: 'flow' },
        ]),
      ),
    /重複/,
  );
  assert.throws(() => validateManifest({ ...manifest([]), minimum_font_size_pt: 7 }), /8で固定/);
});

test('toolchain version and hash mismatches fail before browser launch', () => {
  const directory = makeScratch('inline-layout-pin-test-');
  fs.mkdirSync(path.join(directory, 'node_modules', 'example'), { recursive: true });
  const file = path.join(directory, 'node_modules', 'example', 'file.js');
  fs.writeFileSync(file, '{"version":"1.0.0"}\n');
  assert.throws(
    () =>
      verifyPinnedToolchain(directory, {
        'example/file.js': { sha256: '0'.repeat(64) },
      }),
    /hash不一致/,
  );
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.throws(
    () =>
      verifyPinnedToolchain(directory, {
        'example/file.js': { version: '2.0.0', sha256: actualHash },
      }),
    /version不一致/,
  );
});

test('zero or multiple page.pdf interceptions fail closed', () => {
  assert.throws(() => assertHookCount(0), /1回必要/);
  assert.throws(() => assertHookCount(2), /1回必要/);
});

const canIntegrate = Boolean(BROWSER) && fs.existsSync(path.join(TOOLCHAIN, 'node_modules'));

test('normal inline code passes DOM scope while release remains blocked for post-PDF audit', {
  skip: !canIntegrate,
}, () => {
  const directory = makeScratch('inline-layout-normal-test-');
  writeFixture(directory, {
    html: `<!doctype html><html lang="ja"><body>
      <section class="page">
        <p>前の日本語 <code data-pdf-inline-id="normal-flow">NORMAL-CODE</code> 後の日本語</p>
        <ul><li>項目の説明 <code data-pdf-inline-id="normal-list">LIST-CODE</code> 続きの日本語</li></ul>
      </section>
      <section class="page">
        <table data-pdf-table-id="normal-table-source">
          <tr><td>対象の説明 <code data-pdf-inline-id="normal-table">TABLE-CODE</code> 後続</td><td>隣の日本語</td></tr>
          <tr><td>二行目</td><td>確認文字</td></tr>
        </table>
        <table data-pdf-table-id="plain-table-source">
          <tr><th>用語</th><th>説明</th></tr>
          <tr><td>画面</td><td>コードを含まない表</td></tr>
        </table>
      </section>
    </body></html>`,
    css: `@page{size:A4;margin:20mm} body{font:12pt sans-serif}.page{break-after:page}code{font:12pt monospace;white-space:nowrap;padding:0 3px;border-left:1px solid #555;border-right:1px solid #555}table{table-layout:fixed;width:100%}td{padding:4px;border:1px solid #333}`,
    expected: manifest(
      [
        { id: 'normal-flow', expected_text: 'NORMAL-CODE', source_order: 0, context: 'flow' },
        { id: 'normal-list', expected_text: 'LIST-CODE', source_order: 1, context: 'flow' },
        { id: 'normal-table', expected_text: 'TABLE-CODE', source_order: 2, context: 'table' },
      ],
      [{ id: 'normal-table-source' }, { id: 'plain-table-source' }],
    ),
  });
  const result = runFixture(directory);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.report.result, 'dom_pass_post_pdf_pending');
  const inventory = result.report.dom_audit.table_inventory;
  assert.equal(inventory.expected_count, 2);
  assert.equal(inventory.observed_count, 2);
  assert.deepEqual(inventory.missing_ids, []);
  assert.deepEqual(inventory.unexpected_ids, []);
  const plainTable = inventory.tables.find((table) => table.id === 'plain-table-source');
  assert.equal(plainTable.fragments.length, 1);
  assert.equal(plainTable.fragments[0].geometry.status, 'supported');
  assert.ok(
    plainTable.fragments[0].geometry.cells.some(
      (cell) => cell.prose_lines.map((line) => line.text).join('') === 'コードを含まない表',
    ),
  );
  assert.equal(result.report.release_gate.status, 'blocked');
  assert.equal(result.report.dom_audit.checks.single_line.status, 'pass');
  assert.equal(result.report.dom_audit.checks.cell_content_bounds.status, 'pass');
  assert.equal(result.report.dom_audit.checks.page_content_bounds.status, 'pass');
  assert.equal(result.report.dom_audit.checks.measurement_support.status, 'pass');
  assert.equal(result.report.dom_audit.checks.physical_page_box_selector.status, 'pass');
  assert.equal(result.report.dom_audit.checks.post_pdf_text_and_geometry.status, 'unsupported');
  assert.ok(result.report.dom_audit.page_count >= 2);

  const flow = observedItem(result.report, 'normal-flow');
  assert.equal(flow.flow_geometry.status, 'supported');
  assert.equal(flow.flow_geometry.tag, 'P');
  assert.equal(
    flow.flow_geometry.basis,
    'full_containing_block_content_width_not_current_line_remainder',
  );
  assert.ok(flow.flow_geometry.available_width > flow.code_rect.width);
  assert.ok(flow.flow_geometry.prose_lines.some((line) => line.japanese_character_count > 0));
  assert.ok(flow.flow_geometry.prose_lines.every((line) => !line.text.includes('NORMAL-CODE')));
  assert.equal(flow.code_box.padding_left, 3);
  assert.equal(flow.code_box.padding_right, 3);
  assert.equal(flow.code_box.border_left, 1);
  assert.equal(flow.code_box.border_right, 1);
  assert.equal(flow.code_box.horizontal_fixed, 8);

  const list = observedItem(result.report, 'normal-list');
  assert.equal(list.flow_geometry.status, 'supported');
  assert.equal(list.flow_geometry.tag, 'LI');
  assert.ok(list.flow_geometry.prose_lines.some((line) => line.japanese_character_count > 0));

  const table = observedItem(result.report, 'normal-table');
  assert.equal(table.table_geometry.status, 'supported');
  assert.deepEqual(table.table_geometry.identity, {
    status: 'supported',
    kind: 'data-pdf-table-id',
    value: 'normal-table-source',
  });
  assert.deepEqual(table.table_geometry.target, {
    row_index: 0,
    cell_index: 0,
    column_index: 0,
    row_span: 1,
    column_span: 1,
  });
  assert.equal(table.table_geometry.cells.length, 4);
  assert.equal(table.table_geometry.columns.length, 2);
  assert.ok(table.table_geometry.columns.every((column) => column.width > 0));
  assert.ok(
    table.table_geometry.cells.some((cell) =>
      cell.prose_lines.some((line) => line.japanese_character_count > 0),
    ),
  );
  assert.equal(table.physical_page_box.status, 'observed_uncalibrated');
  assert.ok(table.physical_page_box.rect.width > 0);
  assert.ok(table.physical_page_box.rect.height > 0);
  assert.equal(fs.existsSync(result.output), true);
});

test('wrap, cell overflow, page-content overflow and sub-8pt text fail before PDF', {
  skip: !canIntegrate,
}, () => {
  const directory = makeScratch('inline-layout-adversarial-test-');
  writeFixture(directory, {
    html: `<!doctype html><html lang="ja"><body>
      <section class="page"><div class="narrow">before <code data-pdf-inline-id="wrapped">WRAP-ME-ABCDEFGHIJKLMN</code> after</div></section>
      <section class="page"><p class="small"><code data-pdf-inline-id="small">SMALL-SEVEN-PT</code></p></section>
      <section class="page"><table><tr><td><code data-pdf-inline-id="cell-overflow">CELL-OVERFLOW-ABCDEFGHIJKLMN</code></td><td>neighbor</td></tr></table></section>
      <section class="page"><div class="page-overflow"><code data-pdf-inline-id="page-overflow">PAGE-OVERFLOW-ABCDEFGHIJKLMNOPQRSTUVWXYZ</code></div></section>
      <section class="page"><div class="flex"><code data-pdf-inline-id="unsupported-flow">FLEX-CODE</code></div></section>
      <section class="page"><div class="hidden-overflow"><span><code data-pdf-inline-id="unsupported-overflow">OVERFLOW-CODE</code></span></div></section>
    </body></html>`,
    css: `@page{size:A4;margin:20mm} body{font:12pt sans-serif}.page{break-after:page}.narrow{width:85px}.small code{font:7pt monospace}code{font-family:monospace}.page table{table-layout:fixed;width:200px}.page td{width:100px;padding:2px}.page td code,.page-overflow code{white-space:nowrap}.page-overflow{margin-left:600px}.flex{display:flex}.hidden-overflow{overflow:hidden}`,
    expected: manifest([
      { id: 'wrapped', expected_text: 'WRAP-ME-ABCDEFGHIJKLMN', source_order: 0, context: 'flow' },
      { id: 'small', expected_text: 'SMALL-SEVEN-PT', source_order: 1, context: 'flow' },
      {
        id: 'cell-overflow',
        expected_text: 'CELL-OVERFLOW-ABCDEFGHIJKLMN',
        source_order: 2,
        context: 'table',
      },
      {
        id: 'page-overflow',
        expected_text: 'PAGE-OVERFLOW-ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        source_order: 3,
        context: 'flow',
      },
      {
        id: 'unsupported-flow',
        expected_text: 'FLEX-CODE',
        source_order: 4,
        context: 'flow',
      },
      {
        id: 'unsupported-overflow',
        expected_text: 'OVERFLOW-CODE',
        source_order: 5,
        context: 'flow',
      },
    ]),
  });
  const result = runFixture(directory);
  assert.notEqual(result.status, 0);
  assert.equal(result.report.result, 'dom_fail');
  assert.equal(result.report.dom_audit.checks.single_line.status, 'fail');
  assert.equal(result.report.dom_audit.checks.minimum_font_size.status, 'fail');
  assert.equal(result.report.dom_audit.checks.cell_content_bounds.status, 'fail');
  assert.equal(result.report.dom_audit.checks.page_content_bounds.status, 'fail');
  assert.equal(result.report.dom_audit.checks.measurement_support.status, 'unsupported');
  assert.match(JSON.stringify(result.report.dom_audit.violations), /anonymous_flex_or_grid_item/);
  assert.match(
    JSON.stringify(result.report.dom_audit.violations),
    /non_visible_overflow_in_flow_chain/,
  );
  assert.match(JSON.stringify(result.report.dom_audit.violations), /stable_table_identity_missing/);
  assert.equal(fs.existsSync(result.output), false);
});

test('reordered inline entries fail before PDF despite matching ids and text', {
  skip: !canIntegrate,
}, () => {
  const directory = makeScratch('inline-layout-order-test-');
  writeFixture(directory, {
    html: '<!doctype html><html lang="ja"><body><p><code data-pdf-inline-id="second">SECOND</code> <code data-pdf-inline-id="first">FIRST</code></p></body></html>',
    css: '@page{size:A4;margin:20mm} code{font:12pt monospace;white-space:nowrap}',
    expected: manifest([
      { id: 'first', expected_text: 'FIRST', source_order: 0, context: 'flow' },
      { id: 'second', expected_text: 'SECOND', source_order: 1, context: 'flow' },
    ]),
  });
  const result = runFixture(directory);
  assert.notEqual(result.status, 0);
  assert.match(JSON.stringify(result.report.dom_audit.violations), /source_order_mismatch/);
  assert.equal(fs.existsSync(result.output), false);
});

test('fixed letter spacing cannot bypass the final flow width gate after font shrink', {
  skip: !canIntegrate,
}, () => {
  const directory = makeScratch('inline-layout-spacing-test-');
  writeFixture(directory, {
    html: '<!doctype html><html lang="ja"><body><p class="flow">before<br><code data-pdf-inline-id="spacing">ABCDEFGHIJKLMNOPQRST</code><br>after</p></body></html>',
    css: '@page{size:A4;margin:20mm}html,body{margin:0;padding:0}body{font:12pt sans-serif}.flow{width:200px;margin:0;padding:0;overflow:visible}code{display:inline-block;box-sizing:content-box;white-space:nowrap;font:10.834pt monospace;letter-spacing:1px;padding:0 4px}',
    expected: manifest([
      { id: 'spacing', expected_text: 'ABCDEFGHIJKLMNOPQRST', source_order: 0, context: 'flow' },
    ]),
  });
  const result = runFixture(directory);
  assert.notEqual(result.status, 0);
  assert.equal(result.report.dom_audit.checks.flow_content_bounds.status, 'fail');
  assert.equal(result.report.dom_audit.checks.page_content_bounds.status, 'pass');
  assert.equal(fs.existsSync(result.output), false);
});

test('missing expected id fails before PDF', { skip: !canIntegrate }, () => {
  const directory = makeScratch('inline-layout-missing-test-');
  writeFixture(directory, {
    html: '<!doctype html><html lang="ja"><body><p>no marked inline code</p></body></html>',
    css: '@page{size:A4;margin:20mm}',
    expected: manifest([
      { id: 'missing', expected_text: 'MISSING', source_order: 0, context: 'flow' },
    ]),
  });
  const result = runFixture(directory);
  assert.notEqual(result.status, 0);
  assert.equal(result.report.result, 'dom_fail');
  assert.equal(result.report.dom_audit.checks.manifest_coverage.status, 'fail');
  assert.match(JSON.stringify(result.report.dom_audit.violations), /missing_id/);
  assert.equal(fs.existsSync(result.output), false);
});

test('unmarked inline code fails before PDF even with an otherwise complete manifest', {
  skip: !canIntegrate,
}, () => {
  const directory = makeScratch('inline-layout-unmarked-test-');
  writeFixture(directory, {
    html: `<!doctype html><html lang="ja"><body>
      <p><code data-pdf-inline-id="marked">MARKED</code> <code>UNMARKED</code></p>
      <pre><code>PRE-IS-EXCLUDED</code></pre>
    </body></html>`,
    css: '@page{size:A4;margin:20mm} code{font:12pt monospace;white-space:nowrap}',
    expected: manifest([
      { id: 'marked', expected_text: 'MARKED', source_order: 0, context: 'flow' },
    ]),
  });
  const result = runFixture(directory);
  assert.notEqual(result.status, 0);
  assert.equal(result.report.result, 'dom_fail');
  assert.equal(result.report.dom_audit.checks.manifest_coverage.status, 'fail');
  assert.match(JSON.stringify(result.report.dom_audit.violations), /inline_code_missing_id/);
  assert.doesNotMatch(JSON.stringify(result.report.dom_audit.violations), /PRE-IS-EXCLUDED/);
  assert.equal(fs.existsSync(result.output), false);
});
