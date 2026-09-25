import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import test, { after, before } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  exactOccurrences,
  extractPdfModel,
  verifyAuditModel,
  verifyInlinePdf,
} from './verify-inline-pdf.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const DOM_WRAPPER = path.join(HERE, 'verify-inline-layout.mjs');
const PDF_VERIFIER = path.join(HERE, 'verify-inline-pdf.mjs');
const TOOLCHAIN = path.join(REPO, 'dist', '.pdf-book-toolchain');
const BROWSER = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(fs.existsSync);
const CAN_INTEGRATE = Boolean(BROWSER) && fs.existsSync(path.join(TOOLCHAIN, 'node_modules'));
// 個人の作業場所を決め打ちせん。置き場所を変えたい時だけ環境変数で渡す
const SCRATCH_ROOT = process.env.PDF_BOOK_TEST_SCRATCH_DIR ?? os.tmpdir();

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
      { id: 'p1-ascii', expected_text: 'ASCII-ALPHA-19', source_order: 0, context: 'flow' },
      { id: 'repeat-a', expected_text: 'REPEAT-CODE', source_order: 1, context: 'flow' },
      { id: 'repeat-b', expected_text: 'REPEAT-CODE', source_order: 2, context: 'flow' },
      { id: 'p2-japanese', expected_text: '日本語コード', source_order: 3, context: 'table' },
      { id: 'repeat-c', expected_text: 'REPEAT-CODE', source_order: 4, context: 'flow' },
      { id: 'p3-eight', expected_text: 'EIGHT-PT', source_order: 5, context: 'flow' },
      { id: 'repeat-d', expected_text: 'REPEAT-CODE', source_order: 6, context: 'flow' },
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

after(() => {
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
});

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

// 合字を MuPDF が分解すると 2 文字目は幅 0 で次の字と同じ x に置かれる。実 PDF(BIZ UDPGothic の
// "fi")では 1e-5pt の揺れで 'l' が 'i' の前に並び "Proflie" になった。ブラウザ不要の単体検査。
function syntheticLigatureLine(text, ligatureIndex, drift) {
  const top = 470;
  const bottom = 482.75;
  let x = 60;
  const characters = [];
  for (const [index, character] of [...text].entries()) {
    const width = index === ligatureIndex ? 0 : 6.5;
    const left = index === ligatureIndex + 1 ? x + drift : x;
    characters.push({
      character,
      origin: [left, bottom],
      font: 'BIZUDPGothic-Regular',
      size: 12,
      quad: [left, top, left + width, top, left, bottom, left + width, bottom],
      bbox: [left, top, left + width, bottom],
    });
    x += width;
  }
  return { bbox: [60, top, x, bottom], characters };
}

test('zero-width ligature glyph keeps source order when x differs below the box epsilon', () => {
  // ±0.00116 は Linux の Chromium で day25 の `refine` が実際に出したずれ
  for (const drift of [-0.005, -0.00116, -1e-5, 0, 1e-5, 0.00116, 0.005]) {
    const page = { page_index: 0, lines: [syntheticLigatureLine('updateProfile', 9, drift)] };
    const found = exactOccurrences(page, 'updateProfile');
    assert.equal(found.length, 1, `drift ${drift}`);
    assert.equal(found[0].characters.map((item) => item.character).join(''), 'updateProfile');
  }
});

test('a real horizontal gap beyond the box epsilon still orders by x, not by source order', () => {
  const line = syntheticLigatureLine('updateProfile', -1, 0);
  const reversed = { ...line, characters: [...line.characters].reverse() };
  const page = { page_index: 0, lines: [reversed] };
  assert.equal(exactOccurrences(page, 'updateProfile').length, 1);
  assert.equal(exactOccurrences(page, 'eliforPetadpu').length, 0);
});

// 字の持ち主検査: 2つの一致が列の一部だけ共有しても抽出文字の使い回しになる。
// ブラウザ不要の単体検査として、DOM/PDF を合成して verifyAuditModel を通す。
function syntheticReusePage(text) {
  const characters = [...text].map((character, index) => {
    const left = index * 10;
    return {
      character,
      origin: [left, 10],
      font: 'SyntheticMono',
      size: 12,
      quad: [left, 0, left + 8, 0, left, 10, left + 8, 10],
      bbox: [left, 0, left + 8, 10],
    };
  });
  return {
    page_index: 0,
    media_box: [0, 0, 300, 300],
    crop_box: [0, 0, 300, 300],
    rotation: 0,
    lines: [{ bbox: [0, 0, text.length * 10, 10], characters }],
  };
}

function reuseFixture(pageText, selections) {
  const pageRect = { left: 0, top: 0, right: 300, bottom: 300 };
  const checks = Object.fromEntries(
    [
      'renderer_ready',
      'page_content_selector',
      'manifest_coverage',
      'measurement_support',
      'physical_page_box_selector',
      'single_line',
      'minimum_font_size',
      'cell_content_bounds',
      'page_content_bounds',
      'sibling_cell_overlap',
      'clipping_ancestors',
    ].map((name) => [name, { status: 'pass' }]),
  );
  checks.post_pdf_text_and_geometry = { status: 'unsupported' };
  const manifest = {
    schema_version: 1,
    document_id: 'glyph-reuse-test',
    minimum_font_size_pt: 8,
    entries: selections.map(({ id, start, end }, order) => ({
      id,
      expected_text: pageText.slice(start, end),
      source_order: order,
      context: 'flow',
    })),
  };
  const domReport = {
    result: 'dom_pass_post_pdf_pending',
    document_id: 'glyph-reuse-test',
    dom_audit: {
      ready_state: 'complete',
      violations: [],
      checks,
      page_count: 1,
      page_geometry: [
        { status: 'observed_uncalibrated', page_index: 0, rect: pageRect },
      ],
      observed: selections.map(({ id, start, end }) => {
        const codeRect = {
          left: start * 10,
          top: 0,
          right: (end - 1) * 10 + 8,
          bottom: 10,
        };
        return {
          id,
          items: [
            {
              page_index: 0,
              text: pageText.slice(start, end),
              line_rects: [codeRect],
              font_size_pt: 12,
              code_rect: codeRect,
              code_box: {
                padding_left: 0,
                padding_right: 0,
                border_left: 0,
                border_right: 0,
                border_box_rect: codeRect,
              },
              page_content_rect: pageRect,
              physical_page_box: {
                status: 'observed_uncalibrated',
                page_index: 0,
                rect: pageRect,
              },
            },
          ],
        };
      }),
    },
  };
  return { manifest, domReport, pdfModel: { pages: [syntheticReusePage(pageText)] } };
}

test('two matches sharing only some glyphs fail as reused', () => {
  const { manifest, domReport, pdfModel } = reuseFixture('ABC', [
    { id: 'reuse-a', start: 0, end: 2 },
    { id: 'reuse-b', start: 1, end: 3 },
  ]);
  const result = verifyAuditModel(manifest, domReport, pdfModel);
  assert.equal(result.result, 'fail');
  const reuse = result.issues.find((entry) => entry.reason === 'glyph_sequence_reused');
  assert.deepEqual(reuse.ids, ['reuse-a', 'reuse-b']);
  assert.equal(reuse.key, '0:0:1');
});

test('two matches on disjoint glyph sequences pass', () => {
  const { manifest, domReport, pdfModel } = reuseFixture('ABCD', [
    { id: 'reuse-a', start: 0, end: 2 },
    { id: 'reuse-b', start: 2, end: 4 },
  ]);
  const result = verifyAuditModel(manifest, domReport, pdfModel);
  assert.equal(result.result, 'pass');
  assert.deepEqual(result.issues, []);
});

test('two matches on the identical glyph sequence still fail as reused', () => {
  const { manifest, domReport, pdfModel } = reuseFixture('AB', [
    { id: 'reuse-a', start: 0, end: 2 },
    { id: 'reuse-b', start: 0, end: 2 },
  ]);
  const result = verifyAuditModel(manifest, domReport, pdfModel);
  assert.equal(result.result, 'fail');
  const reuse = result.issues.find((entry) => entry.reason === 'glyph_sequence_reused');
  assert.deepEqual(reuse.ids, ['reuse-a', 'reuse-b']);
});
