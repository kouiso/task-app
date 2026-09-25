#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCHEMA_VERSION = 1;
const MATCH_TOLERANCE_PT = 2;
const BOUNDS_TOLERANCE_PT = 0.2;
const MINIMUM_GLYPH_FONT_PT = 7.99;
const BOX_EPSILON_PT = 0.001;
// 合字を分解した幅0の字と次の字の x のずれ。Linux の Chromium では実測で最大 0.00116pt
// (day25 の見出し `refine` の fi)、macOS では 0.0004pt。紙面で最も細い字でも幅は約1pt
// あるので、0.01pt 未満の差を同じ位置とみなしても別の字を取り違えることはない
const CHARACTER_ORDER_EPSILON_PT = 0.01;
const DOM_EPSILON_PX = 0.01;
const SUPPORTED_MUPDF_VERSION = '1.28.0';
const MAX_VISUAL_FRAGMENT_GAP_PT = 1;

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

const round = (value) => Math.round(value * 1_000_000) / 1_000_000;
const finite = (...values) => values.every(Number.isFinite);
const rectJson = ([left, top, right, bottom]) => ({
  left: round(left),
  top: round(top),
  right: round(right),
  bottom: round(bottom),
  width: round(right - left),
  height: round(bottom - top),
});
const rectArray = (rect) => [rect.left, rect.top, rect.right, rect.bottom];
const rectEqual = (a, b, epsilon) =>
  a.every((value, index) => Math.abs(value - b[index]) <= epsilon);
const contains = (outer, inner, epsilon) =>
  inner[0] >= outer[0] - epsilon &&
  inner[1] >= outer[1] - epsilon &&
  inner[2] <= outer[2] + epsilon &&
  inner[3] <= outer[3] + epsilon;
const union = (rects) => [
  Math.min(...rects.map((rect) => rect[0])),
  Math.min(...rects.map((rect) => rect[1])),
  Math.max(...rects.map((rect) => rect[2])),
  Math.max(...rects.map((rect) => rect[3])),
];

function validateRect(rect, label) {
  if (
    !rect ||
    !finite(rect.left, rect.top, rect.right, rect.bottom) ||
    rect.right <= rect.left ||
    rect.bottom <= rect.top
  ) {
    throw new Error(`${label}が不正です`);
  }
  return rect;
}

function rotationOf(page) {
  const rotate = page.getObject().getInheritable('Rotate');
  if (rotate.isNull()) return 0;
  if (!rotate.isNumber()) return Number.NaN;
  return ((rotate.asNumber() % 360) + 360) % 360;
}

export function extractPdfModel(document) {
  const pages = [];
  for (let pageIndex = 0; pageIndex < document.countPages(); pageIndex += 1) {
    const page = document.loadPage(pageIndex);
    const lines = [];
    let line = null;
    page.toStructuredText('preserve-spans').walk({
      beginLine(bbox) {
        line = { bbox, characters: [] };
      },
      onChar(character, origin, font, size, quad) {
        if (!line) throw new Error('MuPDF character outside line');
        line.characters.push({
          character,
          origin,
          font: font.getName(),
          size,
          quad,
          bbox: [quad[0], quad[1], quad[6], quad[7]],
        });
      },
      endLine() {
        if (line) lines.push(line);
        line = null;
      },
    });
    pages.push({
      page_index: pageIndex,
      media_box: page.getBounds('MediaBox'),
      crop_box: page.getBounds('CropBox'),
      rotation: rotationOf(page),
      lines,
    });
  }
  return { pages };
}

// 同じ視覚行の文字順は x 座標で決めるが、合字(fi 等)を MuPDF が分解すると 2 文字目は幅 0 で
// 次の字と同じ x に置かれ、浮動小数の揺れで前後が入れ替わって完全一致に落ちる。
// そこで CHARACTER_ORDER_EPSILON_PT 未満の差は同座標とみなし、PDF 内の文字順(出典順)を保つ。
function compareCharacterOrder(a, b) {
  const dx = a.bbox[0] - b.bbox[0];
  if (Math.abs(dx) > CHARACTER_ORDER_EPSILON_PT) return dx;
  const dy = a.bbox[1] - b.bbox[1];
  if (Math.abs(dy) > CHARACTER_ORDER_EPSILON_PT) return dy;
  return (
    a.source_line_index - b.source_line_index || a.source_character_index - b.source_character_index
  );
}

export function exactOccurrences(page, expectedText) {
  const expected = [...expectedText];
  const occurrences = [];
  if (expected.length === 0) return occurrences;
  const fragments = page.lines
    .map((line, sourceLineIndex) => {
      const characters = line.characters.map((character, sourceCharacterIndex) => ({
        ...character,
        glyph_key: `${sourceLineIndex}:${sourceCharacterIndex}`,
        source_line_index: sourceLineIndex,
        source_character_index: sourceCharacterIndex,
      }));
      return characters.length === 0
        ? null
        : {
            source_line_index: sourceLineIndex,
            characters,
            bbox: union(characters.map((item) => item.bbox)),
          };
    })
    .filter(Boolean)
    .sort((a, b) => a.bbox[0] - b.bbox[0] || a.bbox[1] - b.bbox[1]);
  const groups = [];
  for (const fragment of fragments) {
    const fragmentCenter = (fragment.bbox[1] + fragment.bbox[3]) / 2;
    const group = groups.find((candidate) => {
      const candidateCenter = (candidate.bbox[1] + candidate.bbox[3]) / 2;
      const verticalOverlap =
        Math.min(candidate.bbox[3], fragment.bbox[3]) -
        Math.max(candidate.bbox[1], fragment.bbox[1]);
      const minimumHeight = Math.min(
        candidate.bbox[3] - candidate.bbox[1],
        fragment.bbox[3] - fragment.bbox[1],
      );
      const excessiveHorizontalOverlap = candidate.fragments.some((existing) => {
        const overlap =
          Math.min(existing.bbox[2], fragment.bbox[2]) -
          Math.max(existing.bbox[0], fragment.bbox[0]);
        return overlap > 1;
      });
      const nearestHorizontalGap = Math.min(
        ...candidate.fragments.map((existing) =>
          Math.max(0, fragment.bbox[0] - existing.bbox[2], existing.bbox[0] - fragment.bbox[2]),
        ),
      );
      return (
        Math.abs(candidateCenter - fragmentCenter) <= MATCH_TOLERANCE_PT &&
        verticalOverlap / minimumHeight >= 0.5 &&
        !excessiveHorizontalOverlap &&
        nearestHorizontalGap <= MAX_VISUAL_FRAGMENT_GAP_PT
      );
    });
    if (group) {
      group.fragments.push(fragment);
      group.bbox = union(group.fragments.map((item) => item.bbox));
    } else {
      groups.push({ fragments: [fragment], bbox: fragment.bbox });
    }
  }
  const visualLines = groups
    .map((group) => ({
      source_line_indices: group.fragments.map((item) => item.source_line_index),
      bbox: group.bbox,
      characters: group.fragments.flatMap((item) => item.characters).sort(compareCharacterOrder),
    }))
    .sort((a, b) => Math.min(...a.source_line_indices) - Math.min(...b.source_line_indices));
  for (const [lineIndex, line] of visualLines.entries()) {
    for (let start = 0; start + expected.length <= line.characters.length; start += 1) {
      const selected = line.characters.slice(start, start + expected.length);
      if (selected.some((item, index) => item.character !== expected[index])) continue;
      const bbox = union(selected.map((item) => item.bbox));
      occurrences.push({
        key: `${page.page_index}:${selected.map((item) => item.glyph_key).join('|')}`,
        page_index: page.page_index,
        line_index: lineIndex,
        source_line_indices: [...new Set(selected.map((item) => item.source_line_index))],
        character_start: start,
        character_end: start + expected.length,
        bbox,
        characters: selected,
      });
    }
  }
  return occurrences;
}

function transformRect(domRect, domPageRect, pdfBox, horizontalInset = null) {
  validateRect(domRect, 'DOM rect');
  validateRect(domPageRect, 'DOM page rect');
  const scaleX = (pdfBox[2] - pdfBox[0]) / (domPageRect.right - domPageRect.left);
  const scaleY = (pdfBox[3] - pdfBox[1]) / (domPageRect.bottom - domPageRect.top);
  const leftInset = horizontalInset?.left ?? 0;
  const rightInset = horizontalInset?.right ?? 0;
  return [
    pdfBox[0] + (domRect.left + leftInset - domPageRect.left) * scaleX,
    pdfBox[1] + (domRect.top - domPageRect.top) * scaleY,
    pdfBox[0] + (domRect.right - rightInset - domPageRect.left) * scaleX,
    pdfBox[1] + (domRect.bottom - domPageRect.top) * scaleY,
  ];
}

function compareCandidate(candidate, predicted) {
  const names = ['left', 'top', 'right', 'bottom'];
  const edgeDelta = Object.fromEntries(
    names.map((name, index) => [name, round(candidate.bbox[index] - predicted[index])]),
  );
  return {
    ...candidate,
    edge_delta_pt: edgeDelta,
    max_abs_edge_delta_pt: round(Math.max(...Object.values(edgeDelta).map(Math.abs))),
    max_abs_horizontal_edge_delta_pt: round(
      Math.max(Math.abs(edgeDelta.left), Math.abs(edgeDelta.right)),
    ),
    vertical_center_delta_pt: round(
      (candidate.bbox[1] + candidate.bbox[3]) / 2 - (predicted[1] + predicted[3]) / 2,
    ),
  };
}

function issue(check, reason, details = {}, status = 'fail') {
  return { check, status, reason, ...details };
}

function validateInputs(manifest, domReport) {
  const issues = [];
  const requiredDomChecks = [
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
  ];
  if (manifest?.schema_version !== 1 || !Array.isArray(manifest.entries)) {
    issues.push(issue('input_contract', 'manifest_schema_invalid'));
    return issues;
  }
  if (manifest.minimum_font_size_pt !== 8) {
    issues.push(issue('input_contract', 'manifest_minimum_font_must_be_8'));
  }
  if (domReport?.result !== 'dom_pass_post_pdf_pending') {
    issues.push(issue('dom_report', 'dom_report_result_not_accepted'));
  }
  if (domReport?.document_id !== manifest.document_id) {
    issues.push(issue('input_contract', 'document_id_mismatch'));
  }
  if (domReport?.dom_audit?.ready_state !== 'complete') {
    issues.push(issue('dom_report', 'renderer_not_complete'));
  }
  if ((domReport?.dom_audit?.violations?.length ?? -1) !== 0) {
    issues.push(issue('dom_report', 'dom_violations_present'));
  }
  const domChecks = domReport?.dom_audit?.checks ?? {};
  for (const name of requiredDomChecks) {
    if (domChecks[name]?.status !== 'pass') {
      issues.push(issue('dom_report', 'dom_check_not_pass', { name }));
    }
  }
  if (domChecks.post_pdf_text_and_geometry?.status !== 'unsupported') {
    issues.push(issue('dom_report', 'preexisting_post_pdf_check_state_invalid'));
  }
  const ids = new Set();
  const orders = new Set();
  for (const entry of manifest.entries) {
    if (!entry || typeof entry.id !== 'string' || typeof entry.expected_text !== 'string') {
      issues.push(issue('input_contract', 'manifest_entry_invalid'));
      continue;
    }
    if (ids.has(entry.id))
      issues.push(issue('input_contract', 'manifest_id_duplicate', { id: entry.id }));
    if (!Number.isInteger(entry.source_order) || orders.has(entry.source_order)) {
      issues.push(issue('source_order', 'manifest_source_order_invalid', { id: entry.id }));
    }
    if (!['flow', 'table'].includes(entry.context)) {
      issues.push(issue('input_contract', 'manifest_context_invalid', { id: entry.id }));
    }
    ids.add(entry.id);
    orders.add(entry.source_order);
  }
  const expectedOrder = [...manifest.entries]
    .sort((a, b) => a.source_order - b.source_order)
    .map((entry) => entry.id);
  const observed = domReport?.dom_audit?.observed ?? [];
  const actualOrder = observed.map((entry) => entry.id);
  if (
    actualOrder.length !== expectedOrder.length ||
    expectedOrder.some((id, index) => actualOrder[index] !== id)
  ) {
    issues.push(issue('source_order', 'dom_manifest_source_order_mismatch'));
  }
  const observedById = new Map(observed.map((entry) => [entry.id, entry]));
  for (const entry of manifest.entries) {
    const observation = observedById.get(entry.id);
    if (!observation || observation.items?.length !== 1) {
      issues.push(issue('input_contract', 'dom_item_not_unique', { id: entry.id }));
      continue;
    }
    const item = observation.items[0];
    if (item.text !== entry.expected_text) {
      issues.push(issue('exact_text', 'manifest_dom_text_mismatch', { id: entry.id }));
    }
    if (item.line_rects?.length !== 1) {
      issues.push(issue('single_glyph_line', 'dom_item_not_single_line', { id: entry.id }));
    }
    if (!Number.isFinite(item.font_size_pt) || item.font_size_pt < MINIMUM_GLYPH_FONT_PT) {
      issues.push(issue('minimum_glyph_font', 'dom_font_below_minimum', { id: entry.id }));
    }
    const box = item.code_box;
    if (
      !box ||
      !finite(box.padding_left, box.padding_right, box.border_left, box.border_right) ||
      [box.padding_left, box.padding_right, box.border_left, box.border_right].some(
        (value) => value < 0,
      ) ||
      !item.code_rect ||
      !box.border_box_rect ||
      !rectEqual(rectArray(box.border_box_rect), rectArray(item.code_rect), DOM_EPSILON_PX)
    ) {
      issues.push(issue('input_contract', 'code_box_measurement_invalid', { id: entry.id }));
    }
    if (entry.context === 'table' && !item.cell_content_rect) {
      issues.push(issue('input_contract', 'table_cell_rect_missing', { id: entry.id }));
    }
    if (entry.context === 'flow' && item.cell_content_rect) {
      issues.push(issue('input_contract', 'unexpected_flow_cell_rect', { id: entry.id }));
    }
  }
  return issues;
}

export function verifyAuditModel(manifest, domReport, pdfModel) {
  const issues = validateInputs(manifest, domReport);
  const observations = [];
  const pages = pdfModel?.pages ?? [];
  const domPages = domReport?.dom_audit?.page_geometry ?? [];
  const domPageCount = domReport?.dom_audit?.page_count;
  if (pages.length !== domPageCount || domPages.length !== domPageCount) {
    issues.push(
      issue('page_count', 'dom_pdf_page_count_mismatch', {
        pdf_pages: pages.length,
        dom_pages: domPageCount,
        geometry_pages: domPages.length,
      }),
    );
  }

  const firstPaper = pages[0]?.crop_box;
  for (const page of pages) {
    if (!rectEqual(page.crop_box, page.media_box, BOX_EPSILON_PT)) {
      issues.push(
        issue(
          'page_boxes',
          'crop_box_differs_from_media_box',
          { page_index: page.page_index },
          'unsupported',
        ),
      );
    }
    if (page.rotation !== 0) {
      issues.push(
        issue(
          'page_boxes',
          'rotated_page',
          { page_index: page.page_index, rotation: page.rotation },
          'unsupported',
        ),
      );
    }
    if (firstPaper && !rectEqual(page.crop_box, firstPaper, BOX_EPSILON_PT)) {
      issues.push(
        issue('page_boxes', 'mixed_paper_sizes', { page_index: page.page_index }, 'unsupported'),
      );
    }
  }

  const observedById = new Map(
    (domReport?.dom_audit?.observed ?? []).map((entry) => [entry.id, entry]),
  );
  const selected = [];
  for (const entry of [...(manifest?.entries ?? [])].sort(
    (a, b) => a.source_order - b.source_order,
  )) {
    const item = observedById.get(entry.id)?.items?.[0];
    const page = item && pages[item.page_index];
    const domPage = item && domPages[item.page_index];
    if (!item || !page || !domPage) continue;
    if (
      domPage.status !== 'observed_uncalibrated' ||
      domPage.page_index !== item.page_index ||
      item.physical_page_box?.status !== 'observed_uncalibrated' ||
      item.physical_page_box?.page_index !== item.page_index ||
      !item.physical_page_box?.rect ||
      !rectEqual(rectArray(item.physical_page_box.rect), rectArray(domPage.rect), DOM_EPSILON_PX)
    ) {
      issues.push(
        issue(
          'coordinate_transform',
          'physical_page_measurement_inconsistent',
          { id: entry.id },
          'unsupported',
        ),
      );
      continue;
    }
    let domPageRect;
    try {
      domPageRect = validateRect(domPage.rect, `page geometry ${item.page_index}`);
      validateRect(item.code_rect, `code rect ${entry.id}`);
      validateRect(item.page_content_rect, `page content rect ${entry.id}`);
      if (item.cell_content_rect) validateRect(item.cell_content_rect, `cell rect ${entry.id}`);
    } catch (error) {
      issues.push(
        issue(
          'coordinate_transform',
          'invalid_dom_rect',
          { id: entry.id, message: error.message },
          'unsupported',
        ),
      );
      continue;
    }
    const domPhysical = rectArray(domPageRect);
    for (const [name, value] of [
      ['code', item.code_rect],
      ['page_content', item.page_content_rect],
      ...(item.cell_content_rect ? [['cell_content', item.cell_content_rect]] : []),
    ]) {
      if (!contains(domPhysical, rectArray(value), DOM_EPSILON_PX)) {
        issues.push(
          issue(
            'coordinate_transform',
            'dom_rect_outside_physical_page',
            { id: entry.id, rect: name },
            'unsupported',
          ),
        );
      }
    }
    const inset = {
      left: (item.code_box?.border_left ?? 0) + (item.code_box?.padding_left ?? 0),
      right: (item.code_box?.border_right ?? 0) + (item.code_box?.padding_right ?? 0),
    };
    let predicted;
    let pageContent;
    let cellContent = null;
    try {
      predicted = transformRect(item.code_rect, domPageRect, page.crop_box, inset);
      pageContent = transformRect(item.page_content_rect, domPageRect, page.crop_box);
      if (item.cell_content_rect) {
        cellContent = transformRect(item.cell_content_rect, domPageRect, page.crop_box);
      }
    } catch (error) {
      issues.push(
        issue(
          'coordinate_transform',
          'transform_failed',
          { id: entry.id, message: error.message },
          'unsupported',
        ),
      );
      continue;
    }
    if (
      ![predicted, pageContent, ...(cellContent ? [cellContent] : [])].every((rect) =>
        contains(page.crop_box, rect, BOX_EPSILON_PT),
      )
    ) {
      issues.push(
        issue(
          'coordinate_transform',
          'transformed_dom_rect_outside_pdf_page',
          { id: entry.id },
          'unsupported',
        ),
      );
      continue;
    }
    const candidates = exactOccurrences(page, entry.expected_text).map((candidate) =>
      compareCandidate(candidate, predicted),
    );
    const local = candidates.filter(
      (candidate) =>
        candidate.max_abs_horizontal_edge_delta_pt <= MATCH_TOLERANCE_PT &&
        Math.abs(candidate.vertical_center_delta_pt) <= MATCH_TOLERANCE_PT,
    );
    const observation = {
      id: entry.id,
      source_order: entry.source_order,
      expected_text: entry.expected_text,
      page_index: item.page_index,
      predicted_pdf_text_rect: rectJson(predicted),
      exact_text_candidates_on_page: candidates.length,
      geometry_candidates: local.length,
      candidates: candidates.map((candidate) => ({
        key: candidate.key,
        line_index: candidate.line_index,
        character_start: candidate.character_start,
        source_line_indices: candidate.source_line_indices,
        bbox: rectJson(candidate.bbox),
        max_abs_edge_delta_pt: candidate.max_abs_edge_delta_pt,
        max_abs_horizontal_edge_delta_pt: candidate.max_abs_horizontal_edge_delta_pt,
        vertical_center_delta_pt: candidate.vertical_center_delta_pt,
      })),
      selected: null,
    };
    observations.push(observation);
    if (local.length === 0) {
      issues.push(issue('exact_text_geometry', 'matching_candidate_missing', { id: entry.id }));
      continue;
    }
    if (local.length > 1) {
      issues.push(
        issue('exact_text_geometry', 'matching_candidate_ambiguous', {
          id: entry.id,
          count: local.length,
        }),
      );
      continue;
    }
    const candidate = local[0];
    observation.selected = {
      key: candidate.key,
      line_index: candidate.line_index,
      character_start: candidate.character_start,
      source_line_indices: candidate.source_line_indices,
      bbox: rectJson(candidate.bbox),
      edge_delta_pt: candidate.edge_delta_pt,
      max_abs_horizontal_edge_delta_pt: candidate.max_abs_horizontal_edge_delta_pt,
      vertical_center_delta_pt: candidate.vertical_center_delta_pt,
      min_font_pt: round(Math.min(...candidate.characters.map((character) => character.size))),
      max_font_pt: round(Math.max(...candidate.characters.map((character) => character.size))),
      fonts: [...new Set(candidate.characters.map((character) => character.font))],
    };
    selected.push({ entry, item, candidate });
    if (candidate.characters.some((character) => character.size < MINIMUM_GLYPH_FONT_PT)) {
      issues.push(
        issue('minimum_glyph_font', 'glyph_font_below_minimum', {
          id: entry.id,
          actual_min_pt: observation.selected.min_font_pt,
          minimum_pt: MINIMUM_GLYPH_FONT_PT,
        }),
      );
    }
    if (!contains(page.crop_box, candidate.bbox, BOUNDS_TOLERANCE_PT)) {
      issues.push(issue('pdf_page_bounds', 'glyph_outside_pdf_page', { id: entry.id }));
    }
    if (!contains(pageContent, candidate.bbox, BOUNDS_TOLERANCE_PT)) {
      issues.push(issue('page_content_bounds', 'glyph_outside_page_content', { id: entry.id }));
    }
    if (cellContent && !contains(cellContent, candidate.bbox, BOUNDS_TOLERANCE_PT)) {
      issues.push(issue('cell_content_bounds', 'glyph_outside_cell_content', { id: entry.id }));
    }
  }

  // 2つの一致が列の一部だけ共有しても抽出文字の使い回しになるため、
  // 列全体のキーではなく字1つずつへ持ち主を記録する。
  const owners = new Map();
  for (const match of selected) {
    let overlap = null;
    for (const character of match.candidate.characters) {
      const glyphKey = `${match.candidate.page_index}:${character.glyph_key}`;
      const prior = owners.get(glyphKey);
      if (prior) {
        // 共有が続く列でも報告は最初の1件。持ち主の記録は最後まで続けて、
        // 後ろの字だけを共有する別の一致も見逃さない。
        overlap ??= { prior, glyphKey };
      } else {
        owners.set(glyphKey, match);
      }
    }
    if (overlap) {
      issues.push(
        issue('glyph_reuse', 'glyph_sequence_reused', {
          ids: [overlap.prior.entry.id, match.entry.id],
          key: overlap.glyphKey,
        }),
      );
    }
  }
  const selectedOrder = selected.map((match) => ({
    id: match.entry.id,
    source_order: match.entry.source_order,
    pdf_order: [
      match.candidate.page_index,
      match.candidate.line_index,
      match.candidate.character_start,
    ],
  }));
  const sortedPdfOrder = [...selectedOrder].sort((a, b) => {
    for (let index = 0; index < a.pdf_order.length; index += 1) {
      if (a.pdf_order[index] !== b.pdf_order[index]) {
        return a.pdf_order[index] - b.pdf_order[index];
      }
    }
    return 0;
  });
  if (
    selectedOrder.length === manifest?.entries?.length &&
    selectedOrder.some((entry, index) => entry.id !== sortedPdfOrder[index].id)
  ) {
    issues.push(issue('source_order', 'pdf_source_order_mismatch'));
  }

  const unsupported = issues.filter((entry) => entry.status === 'unsupported');
  return {
    result: unsupported.length > 0 ? 'unsupported' : issues.length > 0 ? 'fail' : 'pass',
    constants: {
      match_tolerance_pt: MATCH_TOLERANCE_PT,
      bounds_tolerance_pt: BOUNDS_TOLERANCE_PT,
      minimum_glyph_font_pt: MINIMUM_GLYPH_FONT_PT,
      text_normalization: 'none',
      maximum_visual_fragment_gap_pt: MAX_VISUAL_FRAGMENT_GAP_PT,
    },
    page_count: { dom: domPageCount ?? null, pdf: pages.length },
    observations,
    issues,
    product_release_gate: {
      status: 'not_asserted',
      reason: 'この検証器単体は配布入力全体や製品出荷を承認しません',
    },
  };
}

function parseArguments(argv) {
  const values = {};
  for (let index = 2; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith('--') || value === undefined)
      throw new Error('引数は--name value形式が必要です');
    values[name.slice(2)] = value;
  }
  const required = ['manifest', 'dom-report', 'pdf', 'toolchain', 'report'];
  for (const name of required) if (!values[name]) throw new Error(`--${name}が必要です`);
  return values;
}

export async function verifyInlinePdf(options) {
  const manifestPath = path.resolve(options.manifestPath);
  const domReportPath = path.resolve(options.domReportPath);
  const pdfPath = path.resolve(options.pdfPath);
  const toolchainDir = path.resolve(options.toolchainDir);
  const outputPath = path.resolve(options.outputPath);
  const packageJsonPath = path.join(toolchainDir, 'node_modules', 'mupdf', 'package.json');
  const mupdfEntryPath = path.join(toolchainDir, 'node_modules', 'mupdf', 'dist', 'mupdf.js');
  const mupdfWasmLoaderPath = path.join(
    toolchainDir,
    'node_modules',
    'mupdf',
    'dist',
    'mupdf-wasm.js',
  );
  const mupdfWasmBinaryPath = path.join(
    toolchainDir,
    'node_modules',
    'mupdf',
    'dist',
    'mupdf-wasm.wasm',
  );
  let report = {
    schema_version: SCHEMA_VERSION,
    result: 'setup_fail',
    inputs: {},
    product_release_gate: { status: 'not_asserted' },
  };
  try {
    for (const [label, filePath] of [
      ['manifest', manifestPath],
      ['dom_report', domReportPath],
      ['pdf', pdfPath],
      ['mupdf_package', packageJsonPath],
      ['mupdf_entry', mupdfEntryPath],
      ['mupdf_wasm_loader', mupdfWasmLoaderPath],
      ['mupdf_wasm_binary', mupdfWasmBinaryPath],
    ]) {
      if (!fs.existsSync(filePath)) throw new Error(`${label}がありません: ${filePath}`);
    }
    const manifest = readJson(manifestPath, 'manifest');
    const domReport = readJson(domReportPath, 'DOM report');
    const packageJson = readJson(packageJsonPath, 'MuPDF package');
    if (packageJson.version !== SUPPORTED_MUPDF_VERSION) {
      throw new Error(
        `MuPDF versionは${SUPPORTED_MUPDF_VERSION}が必要です: ${packageJson.version ?? 'missing'}`,
      );
    }
    const mupdf = await import(pathToFileURL(mupdfEntryPath));
    const document = mupdf.default.Document.openDocument(pdfPath).asPDF();
    const audit = verifyAuditModel(manifest, domReport, extractPdfModel(document));
    report = {
      schema_version: SCHEMA_VERSION,
      ...audit,
      document_id: manifest.document_id ?? null,
      inputs: {
        manifest: { path: manifestPath, sha256: sha256(manifestPath) },
        dom_report: { path: domReportPath, sha256: sha256(domReportPath) },
        final_pdf: { path: pdfPath, sha256: sha256(pdfPath) },
        mupdf_package: {
          path: packageJsonPath,
          version: packageJson.version ?? null,
          sha256: sha256(packageJsonPath),
        },
        mupdf_entry: { path: mupdfEntryPath, sha256: sha256(mupdfEntryPath) },
        mupdf_wasm_loader: {
          path: mupdfWasmLoaderPath,
          sha256: sha256(mupdfWasmLoaderPath),
        },
        mupdf_wasm_binary: {
          path: mupdfWasmBinaryPath,
          sha256: sha256(mupdfWasmBinaryPath),
        },
      },
    };
    atomicWriteJson(outputPath, report);
    return report;
  } catch (error) {
    report.error = error.message;
    atomicWriteJson(outputPath, report);
    return report;
  }
}

async function main(argv = process.argv) {
  const args = parseArguments(argv);
  const report = await verifyInlinePdf({
    manifestPath: args.manifest,
    domReportPath: args['dom-report'],
    pdfPath: args.pdf,
    toolchainDir: args.toolchain,
    outputPath: args.report,
  });
  if (report.result !== 'pass') process.exitCode = 1;
}

const isMain =
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((error) => {
    console.error(`inline PDF audit: ${error.message}`);
    process.exitCode = 1;
  });
}
