#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.PDF_BOOK_TEST_REPO ?? path.resolve(scriptDir, '..', '..');
const toolchain =
  process.env.PDF_BOOK_TEST_TOOLCHAIN_DIR ?? path.join(repoRoot, 'dist', '.pdf-book-toolchain');
const entry = path.join(toolchain, 'node_modules', 'mupdf', 'dist', 'mupdf.js');
const glyphMap = path.join(scriptDir, 'decorative-margin-glyph-map.json');
const generator = path.join(scriptDir, 'margin-outline-fixture.mjs');
const verifier = path.join(scriptDir, 'verify-margin-outline-pdf.mjs');
const title = 'Day 28: タスク一括操作を実装しよう';
const source = path.join(
  repoRoot,
  'material',
  '30days-curriculum',
  'day28_タスク一括操作を実装しよう.md',
);
const receipts = new Map();

function run(command, args) {
  return spawnSync(command, args, { encoding: 'utf8' });
}

function makeFixture(directory, variant) {
  const output = path.join(directory, `${variant}.pdf`);
  const report = path.join(directory, `${variant}.inline-layout.json`);
  const result = run(process.execPath, [generator, entry, glyphMap, output, report, variant]);
  assert.equal(result.status, 0, result.stderr);
  receipts.set(output, report);
  return output;
}

function verify(pdf, overrides = {}) {
  const result = run(process.execPath, [
    verifier,
    '--pdf',
    pdf,
    '--title',
    overrides.title ?? title,
    '--source',
    overrides.source ?? source,
    '--glyph-map',
    overrides.glyphMap ?? glyphMap,
    '--dom-report',
    overrides.domReport ?? receipts.get(pdf),
    '--toolchain',
    overrides.toolchain ?? toolchain,
  ]);
  const report = result.stdout ? JSON.parse(result.stdout) : null;
  return { ...result, report };
}

test('final PDFの柱・ノンブルをsource-pinned glyph pathとrasterで検査する', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'margin-outline-pdf-'));
  try {
    const good = verify(makeFixture(directory, 'good'));
    assert.equal(good.status, 0, good.stderr);
    assert.equal(good.report.result, 'pass');

    const quantizedBaseline = verify(makeFixture(directory, 'quantized-baseline'));
    assert.equal(quantizedBaseline.status, 0, quantizedBaseline.stderr);
    assert.equal(quantizedBaseline.report.result, 'pass');

    const expectedFailures = new Map([
      ['blank', '柱 path数が不正'],
      ['missing-space', 'glyph位置が不正'],
      ['missing-title-glyph', '柱 path数が不正'],
      ['wrong-title', '柱文字列が不正'],
      ['wrong-folio', 'ノンブル文字列が不正'],
      ['wrong-side', 'glyph位置が不正'],
      ['band-edge-baseline', 'glyph位置が不正'],
      ['outside-baseline', 'glyph位置が不正'],
      ['cumulative-drift', 'glyph位置が不正'],
      ['duplicate-title', '柱 path数が不正'],
      ['arbitrary-ink', '最終rasterが期待するoutlineと一致しない'],
      ['occluded-title', '最終rasterが期待するoutlineと一致しない'],
      ['cover-furniture', '表紙にoutline柱またはノンブルがある'],
    ]);
    for (const [variant, expected] of expectedFailures) {
      const result = verify(makeFixture(directory, variant));
      assert.equal(result.status, 1, `${variant}: ${result.stderr}`);
      assert.equal(result.report.result, 'fail');
      assert.ok(
        result.report.problems.some((problem) => problem.includes(expected)),
        `${variant}: ${JSON.stringify(result.report.problems)}`,
      );
    }

    const staleSourcePath = path.join(directory, 'day28_タスク一括操作を実装しよう.md');
    fs.writeFileSync(staleSourcePath, `${fs.readFileSync(source, 'utf8')}\nstale\n`);
    const staleSource = verify(path.join(directory, 'good.pdf'), {
      source: staleSourcePath,
    });
    assert.equal(staleSource.status, 1);
    assert.ok(staleSource.report.problems.some((problem) => problem.includes('原稿SHA256')));

    const staleMapPath = path.join(directory, 'stale-glyph-map.json');
    const staleMap = JSON.parse(fs.readFileSync(glyphMap, 'utf8'));
    staleMap.glyphs.D.path = staleMap.glyphs.a.path;
    fs.writeFileSync(staleMapPath, JSON.stringify(staleMap));
    const staleMapResult = verify(path.join(directory, 'good.pdf'), {
      glyphMap: staleMapPath,
    });
    assert.equal(staleMapResult.status, 1);
    assert.ok(staleMapResult.report.problems.length > 0);

    const goodReportPath = receipts.get(path.join(directory, 'good.pdf'));
    const staleCoordinateSpacePath = path.join(directory, 'legacy-coordinate-space.json');
    const staleCoordinateSpace = JSON.parse(fs.readFileSync(goodReportPath, 'utf8'));
    const staleTitle = staleCoordinateSpace.margin_outline.conversion.inventory.find(
      (item) => item.page_index === 1 && item.role === 'title',
    );
    delete staleTitle.coordinate_space;
    fs.writeFileSync(staleCoordinateSpacePath, JSON.stringify(staleCoordinateSpace));
    const staleCoordinateSpaceResult = verify(path.join(directory, 'good.pdf'), {
      domReport: staleCoordinateSpacePath,
    });
    assert.equal(staleCoordinateSpaceResult.status, 2);
    assert.match(staleCoordinateSpaceResult.stderr, /DOM証跡の座標系が不正/u);

    const shiftedReceiptPath = path.join(directory, 'shifted-local-receipt.json');
    const shiftedReceipt = JSON.parse(fs.readFileSync(goodReportPath, 'utf8'));
    const shiftedTitle = shiftedReceipt.margin_outline.conversion.inventory.find(
      (item) => item.page_index === 1 && item.role === 'title',
    );
    const physicalShiftCssPx = 1 / 64;
    shiftedTitle.character_rects[0].page_local_rect.top += physicalShiftCssPx;
    shiftedTitle.character_rects[0].page_local_rect.bottom += physicalShiftCssPx;
    shiftedTitle.character_rects[0].page_local_rect.y += physicalShiftCssPx;
    shiftedTitle.character_rects[0].global_rect.top += physicalShiftCssPx;
    shiftedTitle.character_rects[0].global_rect.bottom += physicalShiftCssPx;
    shiftedTitle.character_rects[0].global_rect.y += physicalShiftCssPx;
    fs.writeFileSync(shiftedReceiptPath, JSON.stringify(shiftedReceipt));
    const shiftedReceiptResult = verify(path.join(directory, 'good.pdf'), {
      domReport: shiftedReceiptPath,
    });
    assert.equal(shiftedReceiptResult.status, 2);
    assert.match(shiftedReceiptResult.stderr, /DOM証跡の基線が固定layout契約から外れている/u);

    const malformedCases = [
      [
        'legacy-rect',
        (item) => {
          item.character_rects[0].rect = item.character_rects[0].page_local_rect;
          delete item.character_rects[0].page_local_rect;
        },
      ],
      [
        'boolean-coordinate',
        (item) => {
          item.character_rects[0].page_local_rect.top = true;
        },
      ],
      [
        'global-local-mismatch',
        (item) => {
          item.character_rects[0].global_rect.x += 1;
          item.character_rects[0].global_rect.left += 1;
          item.character_rects[0].global_rect.right += 1;
        },
      ],
      [
        'wrong-cardinality',
        (item) => {
          item.character_rects.pop();
        },
      ],
      [
        'wrong-character-order',
        (item) => {
          item.character_rects[0].character = 'x';
        },
      ],
      [
        'whitespace-legacy-rect',
        (item) => {
          const receipt = item.character_rects.find((entry) => entry.character === ' ');
          receipt.rect = receipt.page_local_rect;
          delete receipt.page_local_rect;
        },
      ],
      [
        'whitespace-boolean-coordinate',
        (item) => {
          item.character_rects.find((entry) => entry.character === ' ').page_local_rect.top = true;
        },
      ],
      [
        'whitespace-nonfinite-coordinate',
        (item) => {
          item.character_rects.find((entry) => entry.character === ' ').global_rect.bottom =
            Number.POSITIVE_INFINITY;
        },
      ],
      [
        'whitespace-horizontal-order',
        (item) => {
          const rect = item.character_rects.find(
            (entry) => entry.character === ' ',
          ).page_local_rect;
          rect.right = rect.left;
        },
      ],
      [
        'whitespace-global-local-mismatch',
        (item) => {
          const rect = item.character_rects.find((entry) => entry.character === ' ').global_rect;
          rect.x += 1;
          rect.left += 1;
          rect.right += 1;
        },
      ],
    ];
    for (const [rectName, rectGetter] of [
      ['bounds', (item) => item.bounds],
      ['page-local-bounds', (item) => item.page_local_bounds],
      ['global-rect', (item) => item.character_rects[0].global_rect],
      ['page-local-rect', (item) => item.character_rects[0].page_local_rect],
    ]) {
      for (const field of ['x', 'y', 'left', 'top', 'right', 'bottom', 'width', 'height']) {
        malformedCases.push([
          `${rectName}-${field}-boolean`,
          (item) => {
            rectGetter(item)[field] = true;
          },
        ]);
        malformedCases.push([
          `${rectName}-${field}-nonfinite`,
          (item) => {
            rectGetter(item)[field] = Number.POSITIVE_INFINITY;
          },
        ]);
      }
      malformedCases.push([
        `${rectName}-order`,
        (item) => {
          const rect = rectGetter(item);
          rect.right = rect.left;
        },
      ]);
      malformedCases.push([
        `${rectName}-positive-width`,
        (item) => {
          rectGetter(item).width = 0;
        },
      ]);
      malformedCases.push([
        `${rectName}-vertical-order`,
        (item) => {
          const rect = rectGetter(item);
          rect.bottom = rect.top;
        },
      ]);
      malformedCases.push([
        `${rectName}-positive-height`,
        (item) => {
          rectGetter(item).height = 0;
        },
      ]);
    }

    for (const [name, mutate] of malformedCases) {
      const malformedPath = path.join(directory, `${name}.json`);
      const malformed = JSON.parse(fs.readFileSync(goodReportPath, 'utf8'));
      const item = malformed.margin_outline.conversion.inventory.find(
        (entry) => entry.page_index === 1 && entry.role === 'title',
      );
      mutate(item);
      fs.writeFileSync(malformedPath, JSON.stringify(malformed));
      const malformedResult = verify(path.join(directory, 'good.pdf'), {
        domReport: malformedPath,
      });
      assert.equal(malformedResult.status, 2, name);
      assert.match(malformedResult.stderr, /DOM証跡/u, name);
      assert.doesNotMatch(malformedResult.stderr, /path数が不正/u, name);
    }

    const staleToolchain = path.join(directory, 'toolchain');
    fs.mkdirSync(path.join(staleToolchain, 'node_modules', 'mupdf'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(staleToolchain, 'node_modules', 'mupdf', 'package.json'),
      JSON.stringify({ version: '1.27.0' }),
    );
    const staleToolResult = verify(path.join(directory, 'good.pdf'), {
      toolchain: staleToolchain,
    });
    assert.equal(staleToolResult.status, 2);
    assert.match(staleToolResult.stderr, /MuPDF versionが未対応/u);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
