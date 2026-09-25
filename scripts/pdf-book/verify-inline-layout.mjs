#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCHEMA_VERSION = 1;
const FONT_EPSILON_PT = 0.01;
const GEOMETRY_EPSILON_PX = 0.25;
const PAGE_CONTENT_SELECTOR = '[data-vivliostyle-page-area-container="true"]';
const PAGE_CONTAINER_SELECTOR = '[data-vivliostyle-page-container="true"]';
const PAGE_BOX_SELECTOR = '[data-vivliostyle-page-box="true"]';

/* manifest schema_version 1:
   document_id: 冊子を一意に表す文字列
   minimum_font_size_pt: 8（固定）
   page_content_selector: 上の固定セレクタ
   entries[]: { id, expected_text, source_order, context: "flow" | "table" }
   data-pdf-inline-id は pre 外の inline code だけへ付け、entries と1対1にする。 */

const PINNED_FILES = Object.freeze({
  '@vivliostyle/cli/package.json': {
    version: '11.1.0',
    sha256: '00c644ffa052469bfaed408f52952ae78941834461850ed39616f5136bb14c9f',
  },
  '@vivliostyle/cli/dist/cli.js': {
    sha256: '309fa9206bb8272626683b59ce5de460e05a67022dd087a3a0313ae4a86c308a',
  },
  '@vivliostyle/cli/dist/build-re0kdc5z.js': {
    sha256: '62ee1fc4a6cd5d21bf208a09194fb5e2c91c1bd7570e4a8644bc416633925ce5',
  },
  '@vivliostyle/cli/dist/build.runner-D2aPDESZ.js': {
    sha256: '2c2b83dc15f12ace37bc0b0dae4d099f69e640dd52905430e94dbc9386556b1d',
  },
  '@vivliostyle/viewer/package.json': {
    version: '2.44.1',
    sha256: 'a71f4777831d171790e153d3f22cde826ac55668fe4b402f056b1a5371150a86',
  },
  'puppeteer-core/package.json': {
    version: '25.1.0',
    sha256: 'bec8026b31f4b9c525d9acad63aae17d8d9058a9fc071ea1df033e15f6b8ec48',
  },
  'puppeteer-core/lib/puppeteer/cdp/Page.js': {
    sha256: 'c60a6a1e2fc0f8e91ee5fa54766c9aa6bc2ccdfe8da391cd3a0caadd02cc4859',
  },
});

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label}を読めません: ${filePath}: ${error.message}`);
  }
}

function atomicWriteJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, filePath);
}

export function validateManifest(manifest) {
  if (!manifest || manifest.schema_version !== SCHEMA_VERSION) {
    throw new Error(`manifest schema_versionは${SCHEMA_VERSION}が必要です`);
  }
  if (typeof manifest.document_id !== 'string' || manifest.document_id.length === 0) {
    throw new Error('manifest document_idが必要です');
  }
  if (manifest.minimum_font_size_pt !== 8) {
    throw new Error('manifest minimum_font_size_ptは8で固定です');
  }
  if (manifest.page_content_selector !== PAGE_CONTENT_SELECTOR) {
    throw new Error(`manifest page_content_selectorは${PAGE_CONTENT_SELECTOR}で固定です`);
  }
  if (!Array.isArray(manifest.entries)) {
    throw new Error('manifest entriesは配列が必要です');
  }
  const ids = new Set();
  const orders = new Set();
  for (const entry of manifest.entries) {
    if (!entry || typeof entry.id !== 'string' || entry.id.length === 0) {
      throw new Error('manifest entry.idが必要です');
    }
    if (ids.has(entry.id)) throw new Error(`manifest idが重複しています: ${entry.id}`);
    ids.add(entry.id);
    if (typeof entry.expected_text !== 'string') {
      throw new Error(`manifest expected_textが必要です: ${entry.id}`);
    }
    if (!Number.isInteger(entry.source_order) || entry.source_order < 0) {
      throw new Error(`manifest source_orderが不正です: ${entry.id}`);
    }
    if (orders.has(entry.source_order)) {
      throw new Error(`manifest source_orderが重複しています: ${entry.source_order}`);
    }
    orders.add(entry.source_order);
    if (entry.context !== 'flow' && entry.context !== 'table') {
      throw new Error(`manifest contextはflow/tableのみです: ${entry.id}`);
    }
  }
  return manifest;
}

export function verifyPinnedToolchain(toolchainDir, pins = PINNED_FILES) {
  const modules = path.join(toolchainDir, 'node_modules');
  const verified = [];
  for (const [relative, expected] of Object.entries(pins)) {
    const filePath = path.join(modules, relative);
    if (!fs.existsSync(filePath)) throw new Error(`固定toolchainファイルがありません: ${relative}`);
    const actualSha = sha256(filePath);
    if (actualSha !== expected.sha256) {
      throw new Error(`固定toolchain hash不一致: ${relative}: ${actualSha}`);
    }
    if (expected.version) {
      const actualVersion = readJson(filePath, relative).version;
      if (actualVersion !== expected.version) {
        throw new Error(`固定toolchain version不一致: ${relative}: ${actualVersion}`);
      }
    }
    verified.push({ path: relative, sha256: actualSha, version: expected.version ?? null });
  }
  return { modules, verified };
}

function auditPaginatedDom(manifest, constants) {
  const {
    fontEpsilonPt,
    geometryEpsilonPx,
    pageBoxSelector,
    pageContainerSelector,
    pageContentSelector,
  } = constants;
  const px = (value) => Number.parseFloat(value) || 0;
  const round = (value) => Math.round(value * 1000) / 1000;
  const rectJson = (rect) => ({
    left: round(rect.left),
    top: round(rect.top),
    right: round(rect.right),
    bottom: round(rect.bottom),
    width: round(rect.width ?? rect.right - rect.left),
    height: round(rect.height ?? rect.bottom - rect.top),
  });
  const contentRect = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      left: rect.left + px(style.borderLeftWidth) + px(style.paddingLeft),
      top: rect.top + px(style.borderTopWidth) + px(style.paddingTop),
      right: rect.right - px(style.borderRightWidth) - px(style.paddingRight),
      bottom: rect.bottom - px(style.borderBottomWidth) - px(style.paddingBottom),
    };
  };
  const boxMetrics = (element) => {
    const style = getComputedStyle(element);
    const paddingLeft = px(style.paddingLeft);
    const paddingRight = px(style.paddingRight);
    const borderLeft = px(style.borderLeftWidth);
    const borderRight = px(style.borderRightWidth);
    const rect = element.getBoundingClientRect();
    return {
      border_box_rect: rectJson(rect),
      content_width: round(
        Math.max(0, rect.width - paddingLeft - paddingRight - borderLeft - borderRight),
      ),
      padding_left: round(paddingLeft),
      padding_right: round(paddingRight),
      border_left: round(borderLeft),
      border_right: round(borderRight),
      horizontal_padding: round(paddingLeft + paddingRight),
      horizontal_border: round(borderLeft + borderRight),
      horizontal_fixed: round(paddingLeft + paddingRight + borderLeft + borderRight),
    };
  };
  const domPath = (element, stop) => {
    const parts = [];
    for (let current = element; current && current !== stop; current = current.parentElement) {
      const siblings = [...(current.parentElement?.children ?? [])].filter(
        (candidate) => candidate.tagName === current.tagName,
      );
      parts.unshift(
        `${current.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(current) + 1})`,
      );
    }
    return parts.join(' > ');
  };
  const unionRects = (rects) => {
    if (rects.length === 0) return null;
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  };
  const proseLayout = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const characters = [];
    let nodeIndex = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      const currentNodeIndex = nodeIndex;
      nodeIndex += 1;
      if (!parent || parent.closest('code,pre,script,style')) continue;
      let offset = 0;
      for (const character of [...node.data]) {
        const startOffset = offset;
        offset += character.length;
        if (/\s/u.test(character)) continue;
        const range = document.createRange();
        range.setStart(node, startOffset);
        range.setEnd(node, offset);
        const rect = unionRects(
          [...range.getClientRects()].filter((item) => item.width > 0 && item.height > 0),
        );
        if (!rect) continue;
        characters.push({
          character,
          japanese: /[\u3040-\u30ff\u3400-\u9fff々〆ヵヶー]/u.test(character),
          node_index: currentNodeIndex,
          node_path: domPath(parent, root),
          start_offset: startOffset,
          end_offset: offset,
          rect,
        });
      }
    }
    const lines = [];
    for (const character of characters) {
      let line = lines.find(
        (candidate) =>
          Math.abs(candidate.baseline_bottom - character.rect.bottom) <= 0.75 &&
          Math.min(candidate.bottom, character.rect.bottom) -
            Math.max(candidate.top, character.rect.top) >
            0,
      );
      if (!line) {
        line = {
          baseline_bottom: character.rect.bottom,
          top: character.rect.top,
          bottom: character.rect.bottom,
          characters: [],
        };
        lines.push(line);
      }
      line.top = Math.min(line.top, character.rect.top);
      line.bottom = Math.max(line.bottom, character.rect.bottom);
      line.characters.push(character);
    }
    return lines
      .sort((a, b) => a.top - b.top)
      .map((line, lineIndex) => {
        const ordered = [...line.characters].sort(
          (a, b) => a.rect.left - b.rect.left || a.start_offset - b.start_offset,
        );
        const ranges = [];
        for (const character of ordered) {
          const previous = ranges.at(-1);
          if (
            previous &&
            previous.node_index === character.node_index &&
            previous.end_offset === character.start_offset
          ) {
            previous.end_offset = character.end_offset;
          } else {
            ranges.push({
              node_index: character.node_index,
              node_path: character.node_path,
              start_offset: character.start_offset,
              end_offset: character.end_offset,
            });
          }
        }
        return {
          line_index: lineIndex,
          text: ordered.map((item) => item.character).join(''),
          character_count: ordered.length,
          japanese_character_count: ordered.filter((item) => item.japanese).length,
          rect: rectJson(unionRects(ordered.map((item) => item.rect))),
          dom_text_ranges: ranges,
          characters: ordered.map((item) => ({
            character: item.character,
            japanese: item.japanese,
            node_index: item.node_index,
            start_offset: item.start_offset,
            end_offset: item.end_offset,
            rect: rectJson(item.rect),
          })),
        };
      });
  };
  const flowMeasurement = (code, pageArea) => {
    const trail = [];
    for (let current = code.parentElement; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      const overflow = { x: style.overflowX, y: style.overflowY };
      const item = {
        tag: current.tagName,
        display: style.display,
        overflow_x: overflow.x,
        overflow_y: overflow.y,
        dom_path: domPath(current, pageArea),
      };
      trail.push(item);
      if (overflow.x !== 'visible' || overflow.y !== 'visible') {
        return { status: 'unsupported', reason: 'non_visible_overflow_in_flow_chain', trail };
      }
      if (/^(inline-)?(flex|grid)$/.test(style.display)) {
        return { status: 'unsupported', reason: 'anonymous_flex_or_grid_item', trail };
      }
      if (['block', 'flow-root', 'list-item', 'inline-block'].includes(style.display)) {
        if (!style.writingMode.startsWith('horizontal')) {
          return { status: 'unsupported', reason: 'non_horizontal_writing_mode', trail };
        }
        const measured = contentRect(current);
        if (measured.right - measured.left <= 0) {
          return { status: 'unsupported', reason: 'non_positive_flow_content_width', trail };
        }
        return {
          status: 'supported',
          basis: 'full_containing_block_content_width_not_current_line_remainder',
          tag: current.tagName,
          display: style.display,
          writing_mode: style.writingMode,
          dom_path: domPath(current, pageArea),
          rect: rectJson(current.getBoundingClientRect()),
          content_rect: rectJson(measured),
          available_width: round(measured.right - measured.left),
          prose_lines: proseLayout(current),
          trail,
        };
      }
      if (current === pageArea) break;
    }
    return { status: 'unsupported', reason: 'flow_containing_block_not_proven', trail };
  };
  const tableMeasurement = (cell, pageArea) => {
    const table = cell?.closest('table');
    if (!table) return { status: 'unsupported', reason: 'table_ancestor_missing' };

    const identity = table.dataset.pdfTableId
      ? { status: 'supported', kind: 'data-pdf-table-id', value: table.dataset.pdfTableId }
      : table.id
        ? { status: 'supported', kind: 'source-id', value: table.id }
        : { status: 'unsupported', reason: 'stable_table_identity_missing' };
    const cells = [];
    const occupied = [];
    let columnCount = 0;
    for (const [rowIndex, row] of [...table.rows].entries()) {
      occupied[rowIndex] ??= [];
      let columnIndex = 0;
      for (const [cellIndex, currentCell] of [...row.cells].entries()) {
        while (occupied[rowIndex][columnIndex]) columnIndex += 1;
        const rowSpan = Math.max(1, currentCell.rowSpan || 1);
        const columnSpan = Math.max(1, currentCell.colSpan || 1);
        for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
          occupied[rowIndex + rowOffset] ??= [];
          for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
            occupied[rowIndex + rowOffset][columnIndex + columnOffset] = true;
          }
        }
        columnCount = Math.max(columnCount, columnIndex + columnSpan);
        cells.push({
          row_index: rowIndex,
          cell_index: cellIndex,
          column_index: columnIndex,
          row_span: rowSpan,
          column_span: columnSpan,
          tag: currentCell.tagName,
          dom_path: domPath(currentCell, pageArea),
          rect: rectJson(currentCell.getBoundingClientRect()),
          content_rect: rectJson(contentRect(currentCell)),
          box: boxMetrics(currentCell),
          text: currentCell.textContent,
          font_size_px: px(getComputedStyle(currentCell).fontSize),
          has_prose: (() => {
            const prose = currentCell.cloneNode(true);
            for (const node of prose.querySelectorAll('code,pre')) {
              node.remove();
            }
            return Boolean(prose.textContent.trim());
          })(),
          prose_lines: proseLayout(currentCell),
        });
        columnIndex += columnSpan;
      }
    }
    const target = cells.find(
      (candidate) => table.rows[candidate.row_index]?.cells[candidate.cell_index] === cell,
    );
    const columns = [];
    const unsupportedColumns = [];
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const evidence = cells.filter(
        (candidate) => candidate.column_index === columnIndex && candidate.column_span === 1,
      );
      if (evidence.length === 0) {
        unsupportedColumns.push({ column_index: columnIndex, reason: 'single_span_cell_missing' });
        continue;
      }
      const left = evidence[0].rect.left;
      const right = evidence[0].rect.right;
      if (
        evidence.some(
          (candidate) =>
            Math.abs(candidate.rect.left - left) > geometryEpsilonPx ||
            Math.abs(candidate.rect.right - right) > geometryEpsilonPx,
        )
      ) {
        unsupportedColumns.push({
          column_index: columnIndex,
          reason: 'inconsistent_column_edges',
          evidence: evidence.map((candidate) => ({
            row_index: candidate.row_index,
            cell_index: candidate.cell_index,
            rect: candidate.rect,
          })),
        });
        continue;
      }
      columns.push({
        column_index: columnIndex,
        left: round(left),
        right: round(right),
        width: round(right - left),
        evidence_cells: evidence.map((candidate) => ({
          row_index: candidate.row_index,
          cell_index: candidate.cell_index,
        })),
      });
    }
    const reasons = [];
    if (identity.status !== 'supported') reasons.push(identity.reason);
    if (!target) reasons.push('target_cell_grid_position_not_proven');
    if (unsupportedColumns.length > 0) reasons.push('column_geometry_not_proven');
    return {
      status: reasons.length === 0 ? 'supported' : 'unsupported',
      reasons,
      identity,
      dom_path: domPath(table, pageArea),
      rect: rectJson(table.getBoundingClientRect()),
      content_rect: rectJson(contentRect(table)),
      box: boxMetrics(table),
      row_count: table.rows.length,
      column_count: columnCount,
      rows: [...table.rows].map((row, rowIndex) => ({
        row_index: rowIndex,
        rect: rectJson(row.getBoundingClientRect()),
      })),
      columns,
      unsupported_columns: unsupportedColumns,
      cells,
      target: target
        ? {
            row_index: target.row_index,
            cell_index: target.cell_index,
            column_index: target.column_index,
            row_span: target.row_span,
            column_span: target.column_span,
          }
        : null,
    };
  };
  const outside = (inner, outer, epsilon) =>
    inner.left < outer.left - epsilon ||
    inner.top < outer.top - epsilon ||
    inner.right > outer.right + epsilon ||
    inner.bottom > outer.bottom + epsilon;
  const intersects = (a, b, epsilon) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > epsilon &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > epsilon;
  const clippedByAncestor = (code, codeRect, stop, epsilon) => {
    for (
      let current = code.parentElement;
      current && current !== stop;
      current = current.parentElement
    ) {
      const style = getComputedStyle(current);
      const clipsX = ['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowX);
      const clipsY = ['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowY);
      if (!clipsX && !clipsY) continue;
      const bound = current.getBoundingClientRect();
      if (
        (clipsX &&
          (codeRect.left < bound.left - epsilon || codeRect.right > bound.right + epsilon)) ||
        (clipsY && (codeRect.top < bound.top - epsilon || codeRect.bottom > bound.bottom + epsilon))
      ) {
        return {
          tag: current.tagName,
          rect: rectJson(bound),
          overflowX: style.overflowX,
          overflowY: style.overflowY,
        };
      }
    }
    return null;
  };

  const expected = new Map(manifest.entries.map((entry) => [entry.id, entry]));
  const observed = new Map();
  const violations = [];
  const pages = [
    ...document.querySelectorAll(`#vivliostyle-viewer-viewport ${pageContainerSelector}`),
  ];
  const contentAreas = document.querySelectorAll(
    `#vivliostyle-viewer-viewport ${pageContentSelector}`,
  );
  const pageGeometry = pages.map((page, pageIndex) => {
    const candidates = [
      page.matches(pageBoxSelector) ? page : null,
      page.closest(pageBoxSelector),
      ...page.querySelectorAll(pageBoxSelector),
    ].filter((candidate, index, all) => candidate && all.indexOf(candidate) === index);
    if (candidates.length !== 1) {
      return {
        status: 'unsupported',
        page_index: pageIndex,
        selector: pageBoxSelector,
        candidate_count: candidates.length,
        reason: 'unique_physical_page_box_not_proven',
      };
    }
    const pageBox = candidates[0];
    const rect = pageBox.getBoundingClientRect();
    return {
      status: 'observed_uncalibrated',
      page_index: pageIndex,
      selector: pageBoxSelector,
      origin: { x: round(rect.left), y: round(rect.top) },
      rect: rectJson(rect),
      box: boxMetrics(pageBox),
    };
  });
  const checks = {
    renderer_ready: { status: globalThis.coreViewer?.readyState === 'complete' ? 'pass' : 'fail' },
    page_content_selector: {
      status: pages.length > 0 && contentAreas.length >= pages.length ? 'pass' : 'unsupported',
      page_containers: pages.length,
      content_areas: contentAreas.length,
      selector: pageContentSelector,
    },
    manifest_coverage: { status: 'pass' },
    measurement_support: { status: 'pass' },
    physical_page_box_selector: {
      status:
        pageGeometry.length > 0 &&
        pageGeometry.every((geometry) => geometry.status === 'observed_uncalibrated')
          ? 'pass'
          : 'unsupported',
      selector: pageBoxSelector,
      calibration: 'not_performed',
    },
    single_line: { status: 'pass' },
    minimum_font_size: {
      status: 'pass',
      minimum_pt: manifest.minimum_font_size_pt,
      epsilon_pt: fontEpsilonPt,
    },
    flow_content_bounds: { status: 'pass', dimensions: 'horizontal' },
    cell_content_bounds: { status: 'pass' },
    page_content_bounds: { status: 'pass' },
    sibling_cell_overlap: { status: 'pass' },
    clipping_ancestors: { status: 'pass' },
    post_pdf_text_and_geometry: {
      status: 'unsupported',
      reason: 'MuPDFによる生成PDF再照合は別工程で実行します',
    },
  };

  for (const [pageIndex, page] of pages.entries()) {
    for (const code of page.querySelectorAll('code,span.pdf-table-latin')) {
      if (code.closest('pre')) {
        if (code.hasAttribute('data-pdf-inline-id')) {
          violations.push({
            check: 'manifest_coverage',
            id: code.dataset.pdfInlineId,
            reason: 'pre_must_not_have_inline_id',
          });
        }
        continue;
      }
      const id = code.dataset.pdfInlineId;
      if (!id) {
        violations.push({
          check: 'manifest_coverage',
          id: null,
          reason: 'inline_code_missing_id',
          page_index: pageIndex,
          text: code.textContent,
        });
        continue;
      }
      const entry = expected.get(id);
      const pageArea = code.closest(pageContentSelector);
      const cell = code.closest('td,th');
      const codeRect = code.getBoundingClientRect();
      const lineRects = [...code.getClientRects()];
      const fontSizePx = px(getComputedStyle(code).fontSize);
      const fontSizePt = (fontSizePx * 72) / 96;
      const flowGeometry =
        entry?.context === 'flow' && pageArea ? flowMeasurement(code, pageArea) : null;
      const tableGeometry = entry?.context === 'table' ? tableMeasurement(cell, pageArea) : null;
      const item = {
        id,
        page_index: pageIndex,
        text: code.textContent,
        line_rects: lineRects.map(rectJson),
        code_rect: rectJson(codeRect),
        code_box: boxMetrics(code),
        font_size_pt: round(fontSizePt),
        cell_content_rect: cell ? rectJson(contentRect(cell)) : null,
        page_content_rect: pageArea ? rectJson(contentRect(pageArea)) : null,
        physical_page_box: pageGeometry[pageIndex] ?? null,
        flow_geometry: flowGeometry,
        table_geometry: tableGeometry,
      };
      const items = observed.get(id) ?? [];
      items.push(item);
      observed.set(id, items);

      if (!entry) violations.push({ check: 'manifest_coverage', id, reason: 'unknown_id' });
      if (entry && code.textContent !== entry.expected_text) {
        violations.push({
          check: 'manifest_coverage',
          id,
          reason: 'text_mismatch',
          expected: entry.expected_text,
          actual: code.textContent,
        });
      }
      if (lineRects.length !== 1) {
        violations.push({
          check: 'single_line',
          id,
          reason: 'multiple_line_rects',
          count: lineRects.length,
        });
      }
      if (fontSizePt < manifest.minimum_font_size_pt - fontEpsilonPt) {
        violations.push({ check: 'minimum_font_size', id, actual_pt: round(fontSizePt) });
      }
      if (entry?.context === 'table' && !cell) {
        violations.push({
          check: 'cell_content_bounds',
          id,
          reason: 'expected_table_cell_missing',
        });
      }
      if (entry?.context === 'flow' && cell) {
        violations.push({ check: 'manifest_coverage', id, reason: 'unexpected_table_cell' });
      }
      const contextGeometry = entry?.context === 'flow' ? flowGeometry : tableGeometry;
      if (entry && contextGeometry?.status !== 'supported') {
        checks.measurement_support.status = 'unsupported';
        violations.push({
          check: 'measurement_support',
          id,
          context: entry.context,
          reason: contextGeometry?.reason ?? contextGeometry?.reasons ?? 'measurement_missing',
        });
      }
      if (
        entry?.context === 'flow' &&
        flowGeometry?.status === 'supported' &&
        (codeRect.left < flowGeometry.content_rect.left - geometryEpsilonPx ||
          codeRect.right > flowGeometry.content_rect.right + geometryEpsilonPx)
      ) {
        violations.push({
          check: 'flow_content_bounds',
          id,
          code_rect: rectJson(codeRect),
          flow_content_rect: flowGeometry.content_rect,
        });
      }
      if (cell && outside(codeRect, contentRect(cell), geometryEpsilonPx)) {
        violations.push({
          check: 'cell_content_bounds',
          id,
          code_rect: rectJson(codeRect),
          cell_content_rect: rectJson(contentRect(cell)),
        });
      }
      if (!pageArea) {
        checks.page_content_bounds.status = 'unsupported';
        violations.push({
          check: 'page_content_bounds',
          id,
          reason: 'page_content_ancestor_missing',
        });
      } else if (outside(codeRect, contentRect(pageArea), geometryEpsilonPx)) {
        violations.push({
          check: 'page_content_bounds',
          id,
          code_rect: rectJson(codeRect),
          page_content_rect: rectJson(contentRect(pageArea)),
        });
      }
      if (cell) {
        const row = cell.parentElement;
        for (const sibling of row?.children ?? []) {
          if (sibling === cell || !sibling.matches('td,th')) continue;
          if (intersects(codeRect, sibling.getBoundingClientRect(), geometryEpsilonPx)) {
            violations.push({
              check: 'sibling_cell_overlap',
              id,
              sibling_rect: rectJson(sibling.getBoundingClientRect()),
            });
          }
        }
      }
      const clip = pageArea ? clippedByAncestor(code, codeRect, pageArea, geometryEpsilonPx) : null;
      if (clip) violations.push({ check: 'clipping_ancestors', id, ancestor: clip });
    }
  }

  for (const entry of manifest.entries) {
    const items = observed.get(entry.id) ?? [];
    if (items.length === 0)
      violations.push({ check: 'manifest_coverage', id: entry.id, reason: 'missing_id' });
    if (items.length > 1) {
      violations.push({
        check: 'single_line',
        id: entry.id,
        reason: 'multiple_paginated_fragments',
        count: items.length,
      });
    }
  }
  const expectedOrder = [...manifest.entries]
    .sort((a, b) => a.source_order - b.source_order)
    .map((entry) => entry.id);
  const actualOrder = [...observed.keys()];
  if (
    expectedOrder.length !== actualOrder.length ||
    expectedOrder.some((id, index) => id !== actualOrder[index])
  ) {
    violations.push({
      check: 'manifest_coverage',
      reason: 'source_order_mismatch',
      expected: expectedOrder,
      actual: actualOrder,
    });
  }
  for (const violation of violations) {
    if (checks[violation.check]?.status !== 'unsupported' && checks[violation.check]) {
      checks[violation.check].status = 'fail';
    }
  }
  if (checks.renderer_ready.status !== 'pass')
    violations.push({ check: 'renderer_ready', reason: 'ready_state_not_complete' });
  if (checks.page_content_selector.status !== 'pass') {
    violations.push({
      check: 'page_content_selector',
      reason: 'selector_not_proven_for_every_page',
    });
  }
  // コードを含まない表も目視対象に残す。計測件数だけで表の可読性を合格にしない。
  const tableInventory = new Map();
  for (const [pageIndex, page] of pages.entries()) {
    for (const table of page.querySelectorAll('table[data-pdf-table-id]')) {
      const id = table.dataset.pdfTableId;
      const cell = table.rows[0]?.cells[0];
      const pageArea = table.closest(pageContentSelector);
      const geometry =
        cell && pageArea
          ? tableMeasurement(cell, pageArea)
          : { status: 'unsupported', reason: 'table_cell_or_page_area_missing' };
      const fragments = tableInventory.get(id) ?? [];
      fragments.push({
        page_index: pageIndex,
        page_content_rect: pageArea ? rectJson(contentRect(pageArea)) : null,
        geometry,
      });
      tableInventory.set(id, fragments);
    }
  }
  const expectedTableIds = Array.isArray(manifest.tables)
    ? manifest.tables.map((table) => table.id)
    : null;
  const stackedInventory = new Map();
  for (const [pageIndex, page] of pages.entries()) {
    for (const section of page.querySelectorAll('section[data-pdf-source-table]')) {
      const sourceOrder = Number(section.dataset.pdfSourceTable);
      const fragments = stackedInventory.get(sourceOrder) ?? [];
      fragments.push({
        page_index: pageIndex,
        cells: [...section.querySelectorAll('dt,dd')].map((cell) => ({
          role: cell.tagName.toLowerCase(),
          content_rect: rectJson(contentRect(cell)),
          font_size_px: px(getComputedStyle(cell).fontSize),
          text: cell.textContent,
        })),
      });
      stackedInventory.set(sourceOrder, fragments);
    }
  }
  return {
    ready_state: globalThis.coreViewer?.readyState ?? null,
    page_count: pages.length,
    page_geometry: pageGeometry,
    checks,
    observed: [...observed.entries()].map(([id, items]) => ({ id, items })),
    stacked_inventory: [...stackedInventory.entries()].map(([source_order, fragments]) => ({
      source_order,
      fragments,
    })),
    table_inventory: {
      scope: 'measurement_only_requires_layout_and_readability_review',
      expected_count: expectedTableIds?.length ?? null,
      observed_count: tableInventory.size,
      missing_ids: expectedTableIds?.filter((id) => !tableInventory.has(id)) ?? null,
      unexpected_ids: expectedTableIds
        ? [...tableInventory.keys()].filter((id) => !expectedTableIds.includes(id))
        : null,
      tables: [...tableInventory.entries()].map(([id, fragments]) => ({ id, fragments })),
    },
    violations,
  };
}

export function assertHookCount(count) {
  if (count !== 1) throw new Error(`page.pdf hookは1回必要です: ${count}`);
}

function baseReport(manifestPath, reportPath) {
  return {
    schema_version: SCHEMA_VERSION,
    result: 'not_run',
    manifest_path: manifestPath,
    report_path: reportPath,
    hook: { status: 'not_run', interceptions: 0 },
    release_gate: {
      status: 'blocked',
      reason: '生成PDFの別工程での再照合が必要なため、DOM監査だけではrelease gateになりません',
    },
  };
}

export async function main(argv = process.argv, environment = process.env) {
  const manifestPath = environment.PDF_BOOK_INLINE_LAYOUT_MANIFEST;
  const reportPath = environment.PDF_BOOK_INLINE_LAYOUT_REPORT;
  const toolchainDir = environment.PDF_BOOK_TOOLCHAIN_DIR;
  if (!manifestPath || !reportPath || !toolchainDir) {
    throw new Error('PDF_BOOK_INLINE_LAYOUT_MANIFEST/REPORT/TOOLCHAIN_DIRが必要です');
  }
  let report = baseReport(manifestPath, reportPath);
  try {
    const manifest = validateManifest(readJson(manifestPath, 'inline layout manifest'));
    const toolchain = verifyPinnedToolchain(toolchainDir);
    report.document_id = manifest.document_id;
    report.toolchain = { status: 'pass', files: toolchain.verified };
    const resolver = createRequire(path.join(toolchain.modules, '.inline-layout-resolver.cjs'));
    const puppeteerEntry = resolver.resolve('puppeteer-core');
    const puppeteer = await import(pathToFileURL(puppeteerEntry));
    if (
      !Object.hasOwn(puppeteer.CdpPage.prototype, 'pdf') ||
      typeof puppeteer.CdpPage.prototype.pdf !== 'function'
    ) {
      throw new Error('固定CdpPage.prototype.pdfが見つかりません');
    }
    const originalPdf = puppeteer.CdpPage.prototype.pdf;
    let interceptions = 0;
    let domFailed = false;
    puppeteer.CdpPage.prototype.pdf = async function verifiedPdf(options = {}) {
      interceptions += 1;
      if (interceptions > 1) {
        report = {
          ...report,
          result: 'hook_fail',
          hook: {
            status: 'fail',
            interceptions,
            reason: 'page.pdf hook was reached more than once',
          },
        };
        atomicWriteJson(reportPath, report);
        throw new Error(`page.pdf hookは1回必要です: ${interceptions}`);
      }
      const dom = await this.evaluate(auditPaginatedDom, manifest, {
        fontEpsilonPt: FONT_EPSILON_PT,
        geometryEpsilonPx: GEOMETRY_EPSILON_PX,
        pageBoxSelector: PAGE_BOX_SELECTOR,
        pageContainerSelector: PAGE_CONTAINER_SELECTOR,
        pageContentSelector: PAGE_CONTENT_SELECTOR,
      });
      const failedChecks = Object.values(dom.checks).filter(
        (check) => check.status === 'fail',
      ).length;
      const unsupportedChecks = Object.values(dom.checks).filter(
        (check) => check.status === 'unsupported',
      ).length;
      domFailed = failedChecks > 0 || dom.violations.length > 0;
      report = {
        ...report,
        result: domFailed ? 'dom_fail' : 'dom_pass_post_pdf_pending',
        hook: { status: 'pass', interceptions },
        dom_audit: dom,
        summary: {
          failed_checks: failedChecks,
          unsupported_checks: unsupportedChecks,
          violations: dom.violations.length,
        },
      };
      atomicWriteJson(reportPath, report);
      if (domFailed)
        throw new Error(`inline layout DOM監査に失敗しました: ${dom.violations.length}件`);
      return originalPdf.call(this, options);
    };
    const cliEntry = path.join(toolchain.modules, '@vivliostyle', 'cli', 'dist', 'cli.js');
    const cli = await import(pathToFileURL(cliEntry));
    try {
      await cli.dispatchCli(argv);
    } finally {
      puppeteer.CdpPage.prototype.pdf = originalPdf;
    }
    assertHookCount(interceptions);
    if (domFailed || process.exitCode)
      throw new Error('Vivliostyle buildまたはinline layout監査に失敗しました');
    return report;
  } catch (error) {
    if (report.hook.status === 'not_run') {
      report.result = 'setup_or_hook_fail';
      report.error = error.message;
    }
    if (report.result === 'dom_pass_post_pdf_pending') {
      report.result = 'build_fail';
      report.error = error.message;
    }
    if (report.hook.interceptions === 0 && /hookは1回/.test(error.message)) {
      report.hook = { status: 'fail', interceptions: 0, reason: 'page.pdf hook was not reached' };
      report.result = 'hook_fail';
    }
    atomicWriteJson(reportPath, report);
    throw error;
  }
}

const isMain =
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((error) => {
    console.error(`inline layout audit: ${error.message}`);
    process.exitCode = 1;
  });
}
