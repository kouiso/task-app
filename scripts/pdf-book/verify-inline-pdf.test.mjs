import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import test, { before } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { extractPdfModel, verifyAuditModel, verifyInlinePdf } from './verify-inline-pdf.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const DOM_WRAPPER = path.join(HERE, 'verify-inline-layout.mjs');
const PDF_VERIFIER = path.join(HERE, 'verify-inline-pdf.mjs');
const TOOLCHAIN = path.join(REPO, 'dist', '.pdf-book-toolchain');
const BROWSER = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(fs.existsSync);
const CAN_INTEGRATE = Boolean(BROWSER) && fs.existsSync(path.join(TOOLCHAIN, 'node_modules'));
const SCRATCH_ROOT = fs.existsSync('/home/kouiso/.codex/scratch')
  ? '/home/kouiso/.codex/scratch'
  : os.tmpdir();

let directory;
let manifest;
let domReport;
let pdfModel;

function fixtureManifest() {
  return {
    schema_version: 1,
    document_id: 'post-pdf-test',
    minimum_font_size_pt: 8,
    page_content_selector: '[data-vivliostyle-page-area-container="true"]',
    entries: [
      {
        id: 'p1-ascii',
        expected_text: 'ASCII-ALPHA-19',
        source_order: 0,
        context: 'flow',
      },
      {
        id: 'repeat-a',
        expected_text: 'REPEAT-CODE',
        source_order: 1,
        context: 'flow',
      },
      {
        id: 'repeat-b',
        expected_text: 'REPEAT-CODE',
        source_order: 2,
        context: 'flow',
      },
      {
        id: 'p2-japanese',
        expected_text: '日本語コード',
        source_order: 3,
        context: 'table',
      },
      {
        id: 'repeat-c',
        expected_text: 'REPEAT-CODE',
        source_order: 4,
        context: 'flow',
      },
      {
        id: 'p3-eight',
        expected_text: 'EIGHT-PT',
        source_order: 5,
        context: 'flow',
      },
      {
        id: 'repeat-d',
        expected_text: 'REPEAT-CODE',
        source_order: 6,
        context: 'flow',
      },
    ],
  };
}

function item(report, id) {
  return report.dom_audit.observed.find((entry) => entry.id === id).items[0];
}

function lineContaining(model, pageIndex, text) {
  return model.pages[pageIndex].lines.find((line) =>
    line.characters
      .map((character) => character.character)
      .join('')
      .includes(text),
  );
}

function shiftCharacter(character, dx, dy) {
  character.origin = [character.origin[0] + dx, character.origin[1] + dy];
  character.bbox = [
    character.bbox[0] + dx,
    character.bbox[1] + dy,
    character.bbox[2] + dx,
    character.bbox[3] + dy,
  ];
  character.quad = character.quad.map((value, index) => value + (index % 2 === 0 ? dx : dy));
}

function splitRawLine(model, pageIndex, text, offset, fallbackFont = null) {
  const lines = model.pages[pageIndex].lines;
  const index = lines.findIndex(
    (line) => line.characters.map((character) => character.character).join('') === text,
  );
  assert.notEqual(index, -1, `line not found: ${text}`);
  const original = lines[index];
  const first = {
    ...structuredClone(original),
    characters: structuredClone(original.characters.slice(0, offset)),
  };
  const second = {
    ...structuredClone(original),
    characters: structuredClone(original.characters.slice(offset)),
  };
  if (fallbackFont) {
    for (const character of second.characters) character.font = fallbackFont;
  }
  lines.splice(index, 1, first, second);
}

function extendExpectedText(changedManifest, changedReport, id, suffix, addedCssWidth) {
  const entry = changedManifest.entries.find((candidate) => candidate.id === id);
  const changedItem = item(changedReport, id);
  entry.expected_text += suffix;
  changedItem.text += suffix;
  changedItem.code_rect.right += addedCssWidth;
  changedItem.code_rect.width += addedCssWidth;
  changedItem.code_box.border_box_rect.right += addedCssWidth;
  changedItem.code_box.border_box_rect.width += addedCssWidth;
  changedItem.code_box.content_width += addedCssWidth;
}

function syntheticSuffixLine(text, template, left, topShift = 0) {
  const width = template.bbox[2] - template.bbox[0];
  return {
    bbox: [
      left,
      template.bbox[1] + topShift,
      left + width * text.length,
      template.bbox[3] + topShift,
    ],
    characters: [...text].map((character, index) => {
      const copy = structuredClone(template);
      const dx = left + width * index - copy.bbox[0];
      shiftCharacter(copy, dx, topShift);
      copy.character = character;
      return copy;
    }),
  };
}

before(() => {
  if (!CAN_INTEGRATE) return;
  directory = fs.mkdtempSync(path.join(SCRATCH_ROOT, 'inline-pdf-verifier-test-'));
  manifest = fixtureManifest();
  fs.writeFileSync(
    path.join(directory, 'fixture.html'),
    `<!doctype html><html lang="ja"><body>
<section class="page"><h1>一頁</h1>
<p>前 <code class="padded" data-pdf-inline-id="p1-ascii">ASCII-ALPHA-19</code> 後</p>
<p>上 <code data-pdf-inline-id="repeat-a">REPEAT-CODE</code> 後</p><div class="gap"></div>
<p class="indent">下 <code data-pdf-inline-id="repeat-b">REPEAT-CODE</code> 後</p></section>
<section class="page"><h1>二頁</h1>
<table data-pdf-table-id="test-table"><tr><td>前 <code data-pdf-inline-id="p2-japanese">日本語コード</code> 後</td><td>隣</td></tr></table>
<p class="indent">外 <code data-pdf-inline-id="repeat-c">REPEAT-CODE</code> 後</p></section>
<section class="page"><h1>三頁</h1>
<p>小 <code class="eight" data-pdf-inline-id="p3-eight">EIGHT-PT</code> 後</p>
<p class="far">三 <code data-pdf-inline-id="repeat-d">REPEAT-CODE</code> 後</p></section>
</body></html>`,
  );
  fs.writeFileSync(
    path.join(directory, 'fixture.css'),
    `@page{size:A4;margin:17mm 23mm 29mm 31mm}html,body{margin:0;padding:0}body{font:12pt sans-serif}.page:not(:last-child){break-after:page}h1{font-size:15pt;margin:0 0 12mm}p{margin:0 0 9mm}code{font:12pt monospace;white-space:nowrap;padding:0;border:0}.padded{padding:0 3px;border-left:1px solid;border-right:1px solid}.eight{font-size:8pt}.gap{height:43mm}.indent{margin-left:27mm}.far{margin-left:61mm;margin-top:57mm}table{table-layout:fixed;width:100%}td{padding:5px;border:1px solid}`,
  );
  fs.writeFileSync(
    path.join(directory, 'fixture.config.cjs'),
    "module.exports={title:'post PDF test',language:'ja',entry:[{path:'fixture.html'}],theme:['./fixture.css'],workspaceDir:'.vivliostyle-test'};\n",
  );
  fs.writeFileSync(path.join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const build = spawnSync(
    process.execPath,
    [
      DOM_WRAPPER,
      'build',
      '-c',
      'fixture.config.cjs',
      '-s',
      'A4',
      '--executable-browser',
      BROWSER,
      '-o',
      'fixture.pdf',
    ],
    {
      cwd: directory,
      encoding: 'utf8',
      timeout: 120_000,
      env: {
        ...process.env,
        PDF_BOOK_INLINE_LAYOUT_MANIFEST: path.join(directory, 'manifest.json'),
        PDF_BOOK_INLINE_LAYOUT_REPORT: path.join(directory, 'dom-report.json'),
        PDF_BOOK_TOOLCHAIN_DIR: TOOLCHAIN,
      },
    },
  );
  assert.equal(build.status, 0, build.stderr || build.stdout);
  domReport = JSON.parse(fs.readFileSync(path.join(directory, 'dom-report.json'), 'utf8'));
});

before(async () => {
  if (!CAN_INTEGRATE) return;
  const mupdfEntry = path.join(TOOLCHAIN, 'node_modules', 'mupdf', 'dist', 'mupdf.js');
  const mupdf = await import(pathToFileURL(mupdfEntry));
  const document = mupdf.default.Document.openDocument(path.join(directory, 'fixture.pdf')).asPDF();
  pdfModel = extractPdfModel(document);
});

const integration = { skip: !CAN_INTEGRATE };

let punctuationFixturePromise;

function repeatedPunctuationFixture() {
  punctuationFixturePromise ??= (async () => {
    const fixtureDirectory = fs.mkdtempSync(
      path.join(SCRATCH_ROOT, 'inline-pdf-punctuation-order-test-'),
    );
    const tableId = 'pdf-table-2304a72f96b0-00000';
    const id = 'pdf-inline-2304a72f96b0-00000';
    const fixtureManifestData = {
      schema_version: 1,
      document_id: 'punctuation-order',
      minimum_font_size_pt: 8,
      page_content_selector: '[data-vivliostyle-page-area-container="true"]',
      entries: [
        {
          id,
          expected_text: '。',
          source_order: 0,
          context: 'table',
          pagination_role: 'repeating_table_header',
          table_cell: {
            table_id: tableId,
            section: 'thead',
            row_index: 0,
            cell_index: 0,
            column_index: 0,
            row_span: 1,
            column_span: 1,
            tag: 'TH',
            code_index: 0,
          },
        },
      ],
      tables: [{ id: tableId }],
    };
    const rows = Array.from(
      { length: 18 },
      (_, index) => `<tr><td>row ${index}</td><td>value ${index}</td></tr>`,
    ).join('');
    fs.writeFileSync(
      path.join(fixtureDirectory, 'fixture.html'),
      `<!doctype html><html lang="ja"><body><table data-pdf-table-id="${tableId}"><thead><tr><th>前<code data-pdf-inline-id="${id}">。</code>。。後</th><th>説明</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
    );
    fs.writeFileSync(
      path.join(fixtureDirectory, 'fixture.css'),
      '@page{size:A5;margin:15mm}body{font:11pt sans-serif}table{width:100%;border-spacing:0}th,td{height:18mm;padding:2mm;border:0}code{font:9pt monospace;white-space:nowrap}',
    );
    fs.writeFileSync(
      path.join(fixtureDirectory, 'fixture.config.cjs'),
      "module.exports={title:'punctuation order',language:'ja',entry:[{path:'fixture.html'}],theme:['./fixture.css'],workspaceDir:'.vivliostyle-test'};\n",
    );
    fs.writeFileSync(
      path.join(fixtureDirectory, 'manifest.json'),
      `${JSON.stringify(fixtureManifestData, null, 2)}\n`,
    );
    const build = spawnSync(
      process.execPath,
      [
        DOM_WRAPPER,
        'build',
        '-c',
        'fixture.config.cjs',
        '-s',
        'A5',
        '--executable-browser',
        BROWSER,
        '-o',
        'fixture.pdf',
      ],
      {
        cwd: fixtureDirectory,
        encoding: 'utf8',
        timeout: 120_000,
        env: {
          ...process.env,
          PDF_BOOK_INLINE_LAYOUT_MANIFEST: path.join(fixtureDirectory, 'manifest.json'),
          PDF_BOOK_INLINE_LAYOUT_REPORT: path.join(fixtureDirectory, 'dom-report.json'),
          PDF_BOOK_TOOLCHAIN_DIR: TOOLCHAIN,
        },
      },
    );
    assert.equal(build.status, 0, build.stderr || build.stdout);
    const fixtureReport = JSON.parse(
      fs.readFileSync(path.join(fixtureDirectory, 'dom-report.json'), 'utf8'),
    );
    const mupdf = await import(
      pathToFileURL(path.join(TOOLCHAIN, 'node_modules', 'mupdf', 'dist', 'mupdf.js'))
    );
    const document = mupdf.default.Document.openDocument(
      path.join(fixtureDirectory, 'fixture.pdf'),
    ).asPDF();
    const fixtureModel = extractPdfModel(document);
    const positive = verifyAuditModel(fixtureManifestData, fixtureReport, fixtureModel);
    assert.equal(positive.result, 'pass', JSON.stringify(positive.issues));
    return { manifest: fixtureManifestData, report: fixtureReport, model: fixtureModel };
  })();
  return punctuationFixturePromise;
}

function mutateRepeatedPunctuationProse(report, mutate) {
  for (const observed of report.dom_audit.observed) {
    for (const item of observed.items) {
      const cell = item.table_geometry.cells.find(
        (entry) => entry.row_index === 0 && entry.cell_index === 0,
      );
      assert.ok(cell);
      const periods = cell.prose_lines[0].characters.filter(
        (character) => character.character === '。',
      );
      assert.equal(periods.length, 2);
      mutate(periods);
    }
  }
}

test(
  'real three-page PDF uniquely matches exact text, repeated text, table and 8pt glyphs',
  integration,
  async () => {
    const outputPath = path.join(directory, 'post-pdf-report.json');
    const report = await verifyInlinePdf({
      manifestPath: path.join(directory, 'manifest.json'),
      domReportPath: path.join(directory, 'dom-report.json'),
      pdfPath: path.join(directory, 'fixture.pdf'),
      toolchainDir: TOOLCHAIN,
      outputPath,
    });
    assert.equal(report.result, 'pass');
    assert.equal(report.issues.length, 0);
    assert.equal(report.page_count.pdf, 3);
    assert.equal(
      report.observations.find((entry) => entry.id === 'repeat-a').exact_text_candidates_on_page,
      2,
    );
    assert.equal(
      report.observations.find((entry) => entry.id === 'repeat-a').geometry_candidates,
      1,
    );
    assert.ok(
      report.observations.find((entry) => entry.id === 'p3-eight').selected.min_font_pt >= 7.99,
    );
    assert.equal(report.product_release_gate.status, 'not_asserted');
    for (const input of [
      'manifest',
      'dom_report',
      'final_pdf',
      'mupdf_package',
      'mupdf_entry',
      'mupdf_wasm_loader',
      'mupdf_wasm_binary',
    ]) {
      assert.match(report.inputs[input].sha256, /^[0-9a-f]{64}$/);
    }
    assert.deepEqual(JSON.parse(fs.readFileSync(outputPath, 'utf8')), report);
  },
);

test(
  'real paginated table verifies every repeated THEAD clone in the PDF',
  integration,
  async () => {
    const repeatedDirectory = fs.mkdtempSync(path.join(SCRATCH_ROOT, 'inline-pdf-thead-test-'));
    const tableId = 'pdf-table-0123456789ab-00000';
    const ids = ['pdf-inline-0123456789ab-00000', 'pdf-inline-0123456789ab-00001'];
    const cell = (cellIndex, columnIndex) => ({
      table_id: tableId,
      section: 'thead',
      row_index: 0,
      cell_index: cellIndex,
      column_index: columnIndex,
      row_span: 1,
      column_span: 1,
      tag: 'TH',
      code_index: 0,
    });
    const repeatedManifest = {
      schema_version: 1,
      document_id: 'repeated-header-pdf',
      minimum_font_size_pt: 8,
      page_content_selector: '[data-vivliostyle-page-area-container="true"]',
      entries: [
        {
          id: ids[0],
          expected_text: 'HEADER-A',
          source_order: 0,
          context: 'table',
          pagination_role: 'repeating_table_header',
          table_cell: cell(0, 0),
        },
        {
          id: ids[1],
          expected_text: 'HEADER-B',
          source_order: 1,
          context: 'table',
          pagination_role: 'repeating_table_header',
          table_cell: cell(1, 1),
        },
      ],
      tables: [{ id: tableId }],
    };
    const rows = Array.from(
      { length: 18 },
      (_, index) => `<tr><td>row ${index}</td><td>value ${index}</td></tr>`,
    ).join('');
    fs.writeFileSync(
      path.join(repeatedDirectory, 'fixture.html'),
      `<!doctype html><html lang="ja"><body><table data-pdf-table-id="${tableId}"><thead><tr><th><code data-pdf-inline-id="${ids[0]}">HEADER-A</code></th><th><code data-pdf-inline-id="${ids[1]}">HEADER-B</code></th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
    );
    fs.writeFileSync(
      path.join(repeatedDirectory, 'fixture.css'),
      '@page{size:A5;margin:15mm}body{font:11pt sans-serif}table{width:100%;border-spacing:0}th,td{height:18mm;padding:2mm;border:0}code{font:9pt monospace;white-space:nowrap}',
    );
    fs.writeFileSync(
      path.join(repeatedDirectory, 'fixture.config.cjs'),
      "module.exports={title:'repeated header PDF',language:'ja',entry:[{path:'fixture.html'}],theme:['./fixture.css'],workspaceDir:'.vivliostyle-test'};\n",
    );
    fs.writeFileSync(
      path.join(repeatedDirectory, 'manifest.json'),
      `${JSON.stringify(repeatedManifest, null, 2)}\n`,
    );
    const build = spawnSync(
      process.execPath,
      [
        DOM_WRAPPER,
        'build',
        '-c',
        'fixture.config.cjs',
        '-s',
        'A5',
        '--executable-browser',
        BROWSER,
        '-o',
        'fixture.pdf',
      ],
      {
        cwd: repeatedDirectory,
        encoding: 'utf8',
        timeout: 120_000,
        env: {
          ...process.env,
          PDF_BOOK_INLINE_LAYOUT_MANIFEST: path.join(repeatedDirectory, 'manifest.json'),
          PDF_BOOK_INLINE_LAYOUT_REPORT: path.join(repeatedDirectory, 'dom-report.json'),
          PDF_BOOK_TOOLCHAIN_DIR: TOOLCHAIN,
        },
      },
    );
    assert.equal(build.status, 0, build.stderr || build.stdout);
    const repeatedReport = JSON.parse(
      fs.readFileSync(path.join(repeatedDirectory, 'dom-report.json'), 'utf8'),
    );
    const output = path.join(repeatedDirectory, 'post-pdf.json');
    const verified = await verifyInlinePdf({
      manifestPath: path.join(repeatedDirectory, 'manifest.json'),
      domReportPath: path.join(repeatedDirectory, 'dom-report.json'),
      pdfPath: path.join(repeatedDirectory, 'fixture.pdf'),
      toolchainDir: TOOLCHAIN,
      outputPath: output,
    });
    assert.equal(verified.result, 'pass', JSON.stringify(verified.issues));
    assert.ok(repeatedReport.dom_audit.observed.every((entry) => entry.items.length >= 2));
    assert.equal(
      verified.observations.length,
      repeatedReport.dom_audit.observed.reduce((sum, entry) => sum + entry.items.length, 0),
    );

    const originalModel = await import(
      pathToFileURL(path.join(TOOLCHAIN, 'node_modules', 'mupdf', 'dist', 'mupdf.js'))
    ).then((mupdf) => {
      const document = mupdf.default.Document.openDocument(
        path.join(repeatedDirectory, 'fixture.pdf'),
      ).asPDF();
      return extractPdfModel(document);
    });
    const mutations = [
      (report) => {
        report.dom_audit.observed[0].items[1].page_index =
          report.dom_audit.observed[0].items[0].page_index;
      },
      (report) => {
        report.dom_audit.observed[0].items[1].table_cell.column_index = 1;
      },
      (report) => {
        report.dom_audit.observed[0].items[1].table_cell.column_span = 2;
      },
      (report) => {
        report.dom_audit.observed[0].items[1].text = 'TAMPERED';
      },
      (report) => {
        report.dom_audit.observed[1].items.pop();
      },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(repeatedReport);
      mutate(changed);
      assert.notEqual(
        verifyAuditModel(repeatedManifest, changed, structuredClone(originalModel)).result,
        'pass',
      );
    }
    const incompleteInventory = structuredClone(repeatedReport);
    incompleteInventory.dom_audit.table_inventory.tables[0].fragments.pop();
    const incompleteInventoryResult = verifyAuditModel(
      repeatedManifest,
      incompleteInventory,
      structuredClone(originalModel),
    );
    assert.equal(incompleteInventoryResult.result, 'fail');
    assert.ok(
      incompleteInventoryResult.issues.some(
        (entry) => entry.reason === 'repeated_header_fragment_coverage_extra',
      ),
    );

    const extraInventory = structuredClone(repeatedReport);
    extraInventory.dom_audit.table_inventory.tables[0].fragments.push({
      ...structuredClone(extraInventory.dom_audit.table_inventory.tables[0].fragments.at(-1)),
      page_index: originalModel.pages.length,
    });
    const extraInventoryResult = verifyAuditModel(
      repeatedManifest,
      extraInventory,
      structuredClone(originalModel),
    );
    assert.equal(extraInventoryResult.result, 'fail');
    assert.ok(
      extraInventoryResult.issues.some(
        (entry) => entry.reason === 'repeated_header_fragment_coverage_missing',
      ),
    );

    const duplicateInventory = structuredClone(repeatedReport);
    duplicateInventory.dom_audit.table_inventory.tables.push(
      structuredClone(duplicateInventory.dom_audit.table_inventory.tables[0]),
    );
    const duplicateInventoryResult = verifyAuditModel(
      repeatedManifest,
      duplicateInventory,
      structuredClone(originalModel),
    );
    assert.equal(duplicateInventoryResult.result, 'fail');
    assert.ok(
      duplicateInventoryResult.issues.some(
        (entry) => entry.reason === 'repeated_header_table_inventory_duplicate',
      ),
    );
    const extraHeaderModel = structuredClone(originalModel);
    const firstHeaderPage = repeatedReport.dom_audit.observed[0].items[0].page_index;
    const extraHeaderLine = structuredClone(
      lineContaining(extraHeaderModel, firstHeaderPage, 'HEADER-A'),
    );
    for (const character of extraHeaderLine.characters) shiftCharacter(character, 5, 0);
    extraHeaderModel.pages[firstHeaderPage].lines.push(extraHeaderLine);
    const extraHeader = verifyAuditModel(repeatedManifest, repeatedReport, extraHeaderModel);
    assert.equal(extraHeader.result, 'fail');
    assert.ok(
      extraHeader.issues.some(
        (entry) => entry.reason === 'repeated_header_pdf_cell_bijection_failed',
      ),
    );
  },
);

test(
  'same-text code nodes in one repeated THEAD cell form a PDF bijection',
  integration,
  async () => {
    const repeatedDirectory = fs.mkdtempSync(
      path.join(SCRATCH_ROOT, 'inline-pdf-same-cell-text-test-'),
    );
    const tableId = 'pdf-table-2304a72f96b0-00000';
    const ids = ['pdf-inline-2304a72f96b0-00000', 'pdf-inline-2304a72f96b0-00001'];
    const cell = (codeIndex) => ({
      table_id: tableId,
      section: 'thead',
      row_index: 0,
      cell_index: 0,
      column_index: 0,
      row_span: 1,
      column_span: 1,
      tag: 'TH',
      code_index: codeIndex,
    });
    const repeatedManifest = {
      schema_version: 1,
      document_id: 'same-header-text',
      minimum_font_size_pt: 8,
      page_content_selector: '[data-vivliostyle-page-area-container="true"]',
      entries: ids.map((id, codeIndex) => ({
        id,
        expected_text: 'DUP-CODE',
        source_order: codeIndex,
        context: 'table',
        pagination_role: 'repeating_table_header',
        table_cell: cell(codeIndex),
      })),
      tables: [{ id: tableId }],
    };
    const rows = Array.from(
      { length: 18 },
      (_, index) => `<tr><td>row ${index}</td><td>value ${index}</td></tr>`,
    ).join('');
    fs.writeFileSync(
      path.join(repeatedDirectory, 'fixture.html'),
      `<!doctype html><html lang="ja"><body><table data-pdf-table-id="${tableId}"><thead><tr><th><code data-pdf-inline-id="${ids[0]}">DUP-CODE</code> / <code data-pdf-inline-id="${ids[1]}">DUP-CODE</code></th><th>説明</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
    );
    fs.writeFileSync(
      path.join(repeatedDirectory, 'fixture.css'),
      '@page{size:A5;margin:15mm}body{font:11pt sans-serif}table{width:100%;border-spacing:0}th,td{height:18mm;padding:2mm;border:0}code{font:9pt monospace;white-space:nowrap}',
    );
    fs.writeFileSync(
      path.join(repeatedDirectory, 'fixture.config.cjs'),
      "module.exports={title:'same header text',language:'ja',entry:[{path:'fixture.html'}],theme:['./fixture.css'],workspaceDir:'.vivliostyle-test'};\n",
    );
    fs.writeFileSync(
      path.join(repeatedDirectory, 'manifest.json'),
      `${JSON.stringify(repeatedManifest, null, 2)}\n`,
    );
    const build = spawnSync(
      process.execPath,
      [
        DOM_WRAPPER,
        'build',
        '-c',
        'fixture.config.cjs',
        '-s',
        'A5',
        '--executable-browser',
        BROWSER,
        '-o',
        'fixture.pdf',
      ],
      {
        cwd: repeatedDirectory,
        encoding: 'utf8',
        timeout: 120_000,
        env: {
          ...process.env,
          PDF_BOOK_INLINE_LAYOUT_MANIFEST: path.join(repeatedDirectory, 'manifest.json'),
          PDF_BOOK_INLINE_LAYOUT_REPORT: path.join(repeatedDirectory, 'dom-report.json'),
          PDF_BOOK_TOOLCHAIN_DIR: TOOLCHAIN,
        },
      },
    );
    assert.equal(build.status, 0, build.stderr || build.stdout);
    const repeatedReport = JSON.parse(
      fs.readFileSync(path.join(repeatedDirectory, 'dom-report.json'), 'utf8'),
    );
    const mupdf = await import(
      pathToFileURL(path.join(TOOLCHAIN, 'node_modules', 'mupdf', 'dist', 'mupdf.js'))
    );
    const document = mupdf.default.Document.openDocument(
      path.join(repeatedDirectory, 'fixture.pdf'),
    ).asPDF();
    const originalModel = extractPdfModel(document);
    const verified = verifyAuditModel(repeatedManifest, repeatedReport, originalModel);
    assert.equal(verified.result, 'pass', JSON.stringify(verified.issues));
    assert.ok(repeatedReport.dom_audit.observed.every((entry) => entry.items.length >= 2));
    assert.ok(
      verified.observations.every(
        (entry) => entry.geometry_candidates === 1 && entry.header_cell_exact_text_candidates === 2,
      ),
    );

    const extraOccurrenceModel = structuredClone(originalModel);
    const firstPage = repeatedReport.dom_audit.observed[0].items[0].page_index;
    const originalLine = lineContaining(extraOccurrenceModel, firstPage, 'DUP-CODE');
    const originalText = originalLine.characters.map((character) => character.character).join('');
    const start = originalText.indexOf('DUP-CODE');
    assert.notEqual(start, -1);
    const extraLine = {
      ...structuredClone(originalLine),
      characters: structuredClone(originalLine.characters.slice(start, start + 'DUP-CODE'.length)),
    };
    for (const character of extraLine.characters) shiftCharacter(character, 0, 4);
    extraOccurrenceModel.pages[firstPage].lines.push(extraLine);
    const extraOccurrence = verifyAuditModel(
      repeatedManifest,
      repeatedReport,
      extraOccurrenceModel,
    );
    assert.equal(extraOccurrence.result, 'fail');
    assert.ok(
      extraOccurrence.issues.some(
        (entry) =>
          entry.reason === 'repeated_header_pdf_cell_bijection_failed' &&
          entry.expected_count === 2 &&
          entry.unassigned_cell_glyph_count > 0,
      ),
    );
  },
);

test(
  'repeated THEAD distinguishes adjacent code glyphs from identical ordinary prose',
  integration,
  async () => {
    const tableId = 'pdf-table-2304a72f96b0-00000';
    const ids = ['pdf-inline-2304a72f96b0-00000', 'pdf-inline-2304a72f96b0-00001'];
    const rows = Array.from(
      { length: 18 },
      (_, index) => `<tr><td>row ${index}</td><td>value ${index}</td></tr>`,
    ).join('');
    const cell = (codeIndex) => ({
      table_id: tableId,
      section: 'thead',
      row_index: 0,
      cell_index: 0,
      column_index: 0,
      row_span: 1,
      column_span: 1,
      tag: 'TH',
      code_index: codeIndex,
    });
    const buildCase = async (
      name,
      header,
      entryCount,
      expectedPass,
      expectedTexts = Array.from({ length: entryCount }, () => 'AAA'),
    ) => {
      const caseDirectory = fs.mkdtempSync(path.join(SCRATCH_ROOT, `${name}-`));
      const caseManifest = {
        schema_version: 1,
        document_id: name,
        minimum_font_size_pt: 8,
        page_content_selector: '[data-vivliostyle-page-area-container="true"]',
        entries: ids.slice(0, entryCount).map((id, codeIndex) => ({
          id,
          expected_text: expectedTexts[codeIndex],
          source_order: codeIndex,
          context: 'table',
          pagination_role: 'repeating_table_header',
          table_cell: cell(codeIndex),
        })),
        tables: [{ id: tableId }],
      };
      fs.writeFileSync(
        path.join(caseDirectory, 'fixture.html'),
        `<!doctype html><html lang="ja"><body><table data-pdf-table-id="${tableId}"><thead><tr><th>${header}</th><th>説明</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
      );
      fs.writeFileSync(
        path.join(caseDirectory, 'fixture.css'),
        '@page{size:A5;margin:15mm}body{font:11pt sans-serif}table{width:100%;border-spacing:0}th,td{height:18mm;padding:2mm;border:0}code{font:9pt monospace;white-space:nowrap}',
      );
      fs.writeFileSync(
        path.join(caseDirectory, 'fixture.config.cjs'),
        `module.exports={title:${JSON.stringify(name)},language:'ja',entry:[{path:'fixture.html'}],theme:['./fixture.css'],workspaceDir:'.vivliostyle-test'};\n`,
      );
      fs.writeFileSync(
        path.join(caseDirectory, 'manifest.json'),
        `${JSON.stringify(caseManifest, null, 2)}\n`,
      );
      const build = spawnSync(
        process.execPath,
        [
          DOM_WRAPPER,
          'build',
          '-c',
          'fixture.config.cjs',
          '-s',
          'A5',
          '--executable-browser',
          BROWSER,
          '-o',
          'fixture.pdf',
        ],
        {
          cwd: caseDirectory,
          encoding: 'utf8',
          timeout: 120_000,
          env: {
            ...process.env,
            PDF_BOOK_INLINE_LAYOUT_MANIFEST: path.join(caseDirectory, 'manifest.json'),
            PDF_BOOK_INLINE_LAYOUT_REPORT: path.join(caseDirectory, 'dom-report.json'),
            PDF_BOOK_TOOLCHAIN_DIR: TOOLCHAIN,
          },
        },
      );
      if (!expectedPass) {
        assert.notEqual(build.status, 0, `${name} unexpectedly passed`);
        const failedReport = JSON.parse(
          fs.readFileSync(path.join(caseDirectory, 'dom-report.json'), 'utf8'),
        );
        assert.equal(failedReport.result, 'dom_fail');
        assert.match(
          JSON.stringify(failedReport.dom_audit.violations),
          /manifest|unexpected|coverage/,
        );
        assert.equal(fs.existsSync(path.join(caseDirectory, 'fixture.pdf')), false);
        return;
      }
      assert.equal(build.status, 0, build.stderr || build.stdout);
      const caseReport = JSON.parse(
        fs.readFileSync(path.join(caseDirectory, 'dom-report.json'), 'utf8'),
      );
      const mupdf = await import(
        pathToFileURL(path.join(TOOLCHAIN, 'node_modules', 'mupdf', 'dist', 'mupdf.js'))
      );
      const document = mupdf.default.Document.openDocument(
        path.join(caseDirectory, 'fixture.pdf'),
      ).asPDF();
      const result = verifyAuditModel(caseManifest, caseReport, extractPdfModel(document));
      assert.equal(result.result, 'pass', `${name}: ${JSON.stringify(result.issues)}`);
      assert.ok(result.observations.every((observation) => observation.geometry_candidates === 1));
    };

    await buildCase(
      'adjacent-identical-code',
      `<code data-pdf-inline-id="${ids[0]}">AAA</code><code data-pdf-inline-id="${ids[1]}">AAA</code>`,
      2,
      true,
    );
    await buildCase(
      'one-code-identical-prose',
      `<code data-pdf-inline-id="${ids[0]}">AAA</code> AAA`,
      1,
      true,
    );
    await buildCase(
      'two-code-identical-prose',
      `<code data-pdf-inline-id="${ids[0]}">AAA</code> AAA <code data-pdf-inline-id="${ids[1]}">AAA</code>`,
      2,
      true,
    );
    await buildCase(
      'different-code-substring',
      `<code data-pdf-inline-id="${ids[0]}">AAA</code> / <code data-pdf-inline-id="${ids[1]}">AAAA</code>`,
      2,
      true,
      ['AAA', 'AAAA'],
    );
    await buildCase(
      'shorter-code-substring',
      `<code data-pdf-inline-id="${ids[0]}">AA</code> / <code data-pdf-inline-id="${ids[1]}">AAAA</code>`,
      2,
      true,
      ['AA', 'AAAA'],
    );
    await buildCase(
      'code-with-internal-space',
      `<code data-pdf-inline-id="${ids[0]}">A A</code>`,
      1,
      true,
      ['A A'],
    );
    await buildCase(
      'japanese-closing-parenthesis',
      `前<code data-pdf-inline-id="${ids[0]}">x</code>（例：値）。後`,
      1,
      true,
      ['x'],
    );
    await buildCase(
      'japanese-closing-quote',
      `「<code data-pdf-inline-id="${ids[0]}">x</code>」。後`,
      1,
      true,
      ['x'],
    );
    await buildCase(
      'japanese-adjacent-periods',
      `前<code data-pdf-inline-id="${ids[0]}">。</code>。。後`,
      1,
      true,
      ['。'],
    );
    await buildCase(
      'unmanifested-third-code',
      `<code data-pdf-inline-id="${ids[0]}">AAA</code><code data-pdf-inline-id="${ids[1]}">AAA</code><code data-pdf-inline-id="unmanifested-code">AAA</code>`,
      2,
      false,
    );
  },
);

test(
  'repeated THEAD prose cannot alias one PDF glyph from two DOM characters',
  integration,
  async () => {
    const fixture = await repeatedPunctuationFixture();
    const changedReport = structuredClone(fixture.report);
    mutateRepeatedPunctuationProse(changedReport, (periods) => {
      periods[1].rect = structuredClone(periods[0].rect);
    });
    const result = verifyAuditModel(
      fixture.manifest,
      changedReport,
      structuredClone(fixture.model),
    );
    const mappingIssues = result.issues.filter(
      (issue) => issue.reason === 'repeated_header_prose_pdf_mapping_not_unique',
    );
    assert.equal(result.result, 'fail');
    assert.equal(mappingIssues.length, fixture.report.dom_audit.observed[0].items.length);
  },
);

test(
  'repeated THEAD prose must retain DOM source order in PDF glyph order',
  integration,
  async () => {
    const fixture = await repeatedPunctuationFixture();
    const changedReport = structuredClone(fixture.report);
    mutateRepeatedPunctuationProse(changedReport, (periods) => {
      const first = structuredClone(periods[0].rect);
      periods[0].rect = structuredClone(periods[1].rect);
      periods[1].rect = first;
    });
    const result = verifyAuditModel(
      fixture.manifest,
      changedReport,
      structuredClone(fixture.model),
    );
    const mappingIssues = result.issues.filter(
      (issue) => issue.reason === 'repeated_header_prose_pdf_mapping_not_unique',
    );
    assert.equal(result.result, 'fail');
    assert.equal(mappingIssues.length, fixture.report.dom_audit.observed[0].items.length);
  },
);

test('missing exact PDF text fails without normalization', integration, () => {
  const changedManifest = structuredClone(manifest);
  const changedReport = structuredClone(domReport);
  changedManifest.entries[0].expected_text = 'MISSING-TEXT';
  item(changedReport, 'p1-ascii').text = 'MISSING-TEXT';
  const result = verifyAuditModel(changedManifest, changedReport, structuredClone(pdfModel));
  assert.equal(result.result, 'fail');
  assert.ok(result.issues.some((entry) => entry.reason === 'matching_candidate_missing'));
  assert.equal(result.constants.text_normalization, 'none');
});

test('MuPDF glyph below 7.99pt fails even when DOM report claims pass', integration, () => {
  const changedModel = structuredClone(pdfModel);
  for (const character of lineContaining(changedModel, 2, 'EIGHT-PT').characters) {
    character.size = 7;
  }
  const result = verifyAuditModel(manifest, domReport, changedModel);
  assert.equal(result.result, 'fail');
  assert.ok(result.issues.some((entry) => entry.reason === 'glyph_font_below_minimum'));
});

test(
  'font and punctuation fragments on one physical glyph line are joined exactly',
  integration,
  () => {
    const changedModel = structuredClone(pdfModel);
    splitRawLine(changedModel, 0, 'ASCII-ALPHA-19', 6, 'SyntheticJapaneseFallback');
    splitRawLine(changedModel, 1, '日本語コード', 5);
    const result = verifyAuditModel(manifest, domReport, changedModel);
    assert.equal(result.result, 'pass');
    assert.deepEqual(result.issues, []);
    assert.equal(
      result.observations.find((entry) => entry.id === 'p1-ascii').selected.source_line_indices
        .length,
      2,
    );
    assert.equal(
      result.observations.find((entry) => entry.id === 'p2-japanese').selected.source_line_indices
        .length,
      2,
    );
  },
);

test(
  'vertical glyph metrics may exceed 2pt while horizontal edges and center stay local',
  integration,
  () => {
    const changedModel = structuredClone(pdfModel);
    for (const character of lineContaining(changedModel, 0, 'ASCII-ALPHA-19').characters) {
      character.bbox[1] -= 3;
      character.bbox[3] += 3;
      character.quad[1] -= 3;
      character.quad[3] -= 3;
      character.quad[5] += 3;
      character.quad[7] += 3;
    }
    const result = verifyAuditModel(manifest, domReport, changedModel);
    assert.equal(result.result, 'pass');
    const selected = result.observations.find((entry) => entry.id === 'p1-ascii').selected;
    assert.ok(Math.max(...Object.values(selected.edge_delta_pt).map(Math.abs)) > 2);
  },
);

test('shifted DOM geometry cannot claim a distant exact-text candidate', integration, () => {
  const changedReport = structuredClone(domReport);
  const changedItem = item(changedReport, 'p1-ascii');
  changedItem.code_rect.left += 20;
  changedItem.code_rect.right += 20;
  const result = verifyAuditModel(manifest, changedReport, structuredClone(pdfModel));
  assert.equal(result.result, 'fail');
  assert.ok(result.issues.some((entry) => entry.reason === 'matching_candidate_missing'));
});

test(
  'two exact-text candidates inside the 2pt association window fail as ambiguous',
  integration,
  () => {
    const changedModel = structuredClone(pdfModel);
    const original = lineContaining(changedModel, 0, 'REPEAT-CODE');
    const duplicate = structuredClone(original);
    for (const character of duplicate.characters) shiftCharacter(character, 1, 1);
    changedModel.pages[0].lines.push(duplicate);
    const result = verifyAuditModel(manifest, domReport, changedModel);
    assert.equal(result.result, 'fail');
    assert.ok(result.issues.some((entry) => entry.reason === 'matching_candidate_ambiguous'));
  },
);

test(
  'distant physical lines and adjacent-cell-like fragments cannot form false exact text',
  integration,
  () => {
    for (const scenario of [
      { gap: 2, topShift: 0 },
      { gap: 0, topShift: 30 },
    ]) {
      const changedManifest = structuredClone(manifest);
      const changedReport = structuredClone(domReport);
      const changedModel = structuredClone(pdfModel);
      const baseLine = lineContaining(changedModel, 0, 'ASCII-ALPHA-19');
      const last = baseLine.characters.at(-1);
      const suffix = 'TAIL';
      const width = last.bbox[2] - last.bbox[0];
      const left = last.bbox[2] + scenario.gap;
      changedModel.pages[0].lines.push(syntheticSuffixLine(suffix, last, left, scenario.topShift));
      extendExpectedText(
        changedManifest,
        changedReport,
        'p1-ascii',
        suffix,
        (scenario.gap + width * suffix.length) / 0.75,
      );
      const result = verifyAuditModel(changedManifest, changedReport, changedModel);
      assert.equal(result.result, 'fail');
      assert.equal(
        result.observations.find((entry) => entry.id === 'p1-ascii').exact_text_candidates_on_page,
        0,
      );
    }
  },
);

test('two IDs cannot reuse one glyph sequence', integration, () => {
  const changedReport = structuredClone(domReport);
  const first = item(changedReport, 'repeat-a');
  const second = item(changedReport, 'repeat-b');
  second.code_rect = structuredClone(first.code_rect);
  second.code_box = structuredClone(first.code_box);
  second.page_content_rect = structuredClone(first.page_content_rect);
  second.physical_page_box = structuredClone(first.physical_page_box);
  const result = verifyAuditModel(manifest, changedReport, structuredClone(pdfModel));
  assert.equal(result.result, 'fail');
  assert.ok(result.issues.some((entry) => entry.reason === 'glyph_sequence_reused'));
});

test(
  'actual glyph bounds use 0.2pt independently from the 2pt candidate window',
  integration,
  () => {
    const changedReport = structuredClone(domReport);
    const tableItem = item(changedReport, 'p2-japanese');
    tableItem.cell_content_rect.right = tableItem.cell_content_rect.left + 10;
    const result = verifyAuditModel(manifest, changedReport, structuredClone(pdfModel));
    assert.equal(result.result, 'fail');
    assert.equal(result.constants.bounds_tolerance_pt, 0.2);
    assert.equal(result.constants.match_tolerance_pt, 2);
    assert.ok(result.issues.some((entry) => entry.reason === 'glyph_outside_cell_content'));
  },
);

test(
  'CropBox changes, page rotation and mixed paper sizes are unsupported failures',
  integration,
  () => {
    for (const mutate of [
      (model) => {
        model.pages[0].crop_box[2] -= 10;
      },
      (model) => {
        model.pages[1].rotation = 90;
      },
      (model) => {
        model.pages[2].crop_box[2] -= 10;
        model.pages[2].media_box[2] -= 10;
      },
    ]) {
      const changedModel = structuredClone(pdfModel);
      mutate(changedModel);
      const result = verifyAuditModel(manifest, domReport, changedModel);
      assert.equal(result.result, 'unsupported');
      assert.ok(result.issues.some((entry) => entry.status === 'unsupported'));
    }
  },
);

test('non-passing or text-inconsistent DOM reports are rejected', integration, () => {
  const failedReport = structuredClone(domReport);
  failedReport.result = 'dom_fail';
  assert.ok(
    verifyAuditModel(manifest, failedReport, structuredClone(pdfModel)).issues.some(
      (entry) => entry.reason === 'dom_report_result_not_accepted',
    ),
  );
  const mismatchedReport = structuredClone(domReport);
  item(mismatchedReport, 'p1-ascii').text = 'ALTERED';
  assert.ok(
    verifyAuditModel(manifest, mismatchedReport, structuredClone(pdfModel)).issues.some(
      (entry) => entry.reason === 'manifest_dom_text_mismatch',
    ),
  );
});

test('receipt hashes are hashes of the actual files', integration, async () => {
  const outputPath = path.join(directory, 'receipt-hash-report.json');
  const report = await verifyInlinePdf({
    manifestPath: path.join(directory, 'manifest.json'),
    domReportPath: path.join(directory, 'dom-report.json'),
    pdfPath: path.join(directory, 'fixture.pdf'),
    toolchainDir: TOOLCHAIN,
    outputPath,
  });
  const hash = (filePath) =>
    crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  assert.equal(report.inputs.manifest.sha256, hash(path.join(directory, 'manifest.json')));
  assert.equal(report.inputs.dom_report.sha256, hash(path.join(directory, 'dom-report.json')));
  assert.equal(report.inputs.final_pdf.sha256, hash(path.join(directory, 'fixture.pdf')));
});

test('CLI uses the builder contract and exits zero only for pass', integration, () => {
  const passingOutput = path.join(directory, 'cli-pass.json');
  const baseArguments = [
    PDF_VERIFIER,
    '--manifest',
    path.join(directory, 'manifest.json'),
    '--dom-report',
    path.join(directory, 'dom-report.json'),
    '--pdf',
    path.join(directory, 'fixture.pdf'),
    '--toolchain',
    TOOLCHAIN,
    '--report',
  ];
  const passing = spawnSync(process.execPath, [...baseArguments, passingOutput], {
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(passing.status, 0, passing.stderr || passing.stdout);
  assert.equal(JSON.parse(fs.readFileSync(passingOutput, 'utf8')).result, 'pass');

  const failedDomPath = path.join(directory, 'dom-failed.json');
  const failedOutput = path.join(directory, 'cli-fail.json');
  fs.writeFileSync(
    failedDomPath,
    `${JSON.stringify({ ...domReport, result: 'dom_fail' }, null, 2)}\n`,
  );
  const failingArguments = [...baseArguments];
  failingArguments[failingArguments.indexOf(path.join(directory, 'dom-report.json'))] =
    failedDomPath;
  const failing = spawnSync(process.execPath, [...failingArguments, failedOutput], {
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.notEqual(failing.status, 0);
  assert.equal(JSON.parse(fs.readFileSync(failedOutput, 'utf8')).result, 'fail');
});
