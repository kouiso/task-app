#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const SUPPORTED_MUPDF_VERSION = '1.28.0';
const CSS_FONT_SIZE_PX = 17;
const CSS_TO_PDF = 0.75;
const CSS_AUTOSPACE_PX = CSS_FONT_SIZE_PX / 8;
const PATH_TOLERANCE = 0.001;
const CONTRACT_POSITION_TOLERANCE_PT = 0.03;
const OUTPUT_POSITION_TOLERANCE_PT = 0.002;
const TOP_BASELINE_TOLERANCE_PT = 0.005;
const BOTTOM_BASELINE_TOLERANCE_PT = 0.05;
const SCALE_TOLERANCE = 0.0000001;
const TARGET_COLOR = [37 / 255, 48 / 255, 58 / 255];
const PDF_COLOR = [0.1451, 0.1882, 0.2275];
const COLOR_TOLERANCE = 0.00005;
const TOP_BAND = [18, 55];
const BOTTOM_BAND = [785, 830];
const LEFT_ORIGIN_PT = 62.34375;
const RIGHT_EDGE_PT = 532.89404296875;
const TOP_BASELINE_PT = 40.27001953125;
const BOTTOM_BASELINE_PT = 811.27001953125;
const DOM_X_TO_PDF_OFFSET_PT = -0.017578125;
const FONT_ASCENT_PX = 15;
const FOLIO_DOM_Y_TO_PDF_OFFSET_PT = -0.0234375;
const PDF_PATH_SCALE = 0.006225586868822575;
const RASTER_SCALE = 2;
const RASTER_CHANNEL_TOLERANCE = 1;
const RECEIPT_GEOMETRY_TOLERANCE = 1e-9;
const RECEIPT_GLOBAL_LOCAL_TOLERANCE = 0.13;

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error('引数が不正です');
    values[key.slice(2)] = value;
  }
  for (const required of ['pdf', 'title', 'source', 'glyph-map', 'dom-report', 'toolchain']) {
    if (!values[required]) throw new Error(`--${required} が必要です`);
  }
  return values;
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label}を読めません: ${error.message}`);
  }
}

function parseSvgPath(source) {
  const tokens = source.match(/[A-Za-z]|-?(?:\d+(?:\.\d*)?|\.\d+)/gu) ?? [];
  const commands = [];
  let index = 0;
  let command = '';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const number = () => Number(tokens[index++]);
  while (index < tokens.length) {
    if (/^[A-Za-z]$/u.test(tokens[index])) command = tokens[index++];
    const upper = command.toUpperCase();
    const relative = command !== upper;
    if (upper === 'Z') {
      if (x !== startX || y !== startY) commands.push(['L', startX, startY]);
      commands.push(['Z']);
      x = startX;
      y = startY;
      command = '';
      continue;
    }
    let first = true;
    while (index < tokens.length && !/^[A-Za-z]$/u.test(tokens[index])) {
      if (upper === 'M' || upper === 'L') {
        let nextX = number();
        let nextY = number();
        if (relative) {
          nextX += x;
          nextY += y;
        }
        x = nextX;
        y = nextY;
        const operation = upper === 'M' && first ? 'M' : 'L';
        commands.push([operation, x, y]);
        if (operation === 'M') {
          startX = x;
          startY = y;
        }
      } else if (upper === 'H') {
        let nextX = number();
        if (relative) nextX += x;
        x = nextX;
        commands.push(['L', x, y]);
      } else if (upper === 'V') {
        let nextY = number();
        if (relative) nextY += y;
        y = nextY;
        commands.push(['L', x, y]);
      } else if (upper === 'Q') {
        let controlX = number();
        let controlY = number();
        let endX = number();
        let endY = number();
        if (relative) {
          controlX += x;
          controlY += y;
          endX += x;
          endY += y;
        }
        commands.push([
          'C',
          x + (2 * (controlX - x)) / 3,
          y + (2 * (controlY - y)) / 3,
          endX + (2 * (controlX - endX)) / 3,
          endY + (2 * (controlY - endY)) / 3,
          endX,
          endY,
        ]);
        x = endX;
        y = endY;
      } else {
        throw new Error(`未対応のglyph path commandです: ${command}`);
      }
      first = false;
    }
  }
  return commands;
}

function commandsEqual(actual, expected) {
  if (actual.length !== expected.length) return false;
  return actual.every((command, index) => {
    const other = expected[index];
    return (
      command.length === other.length &&
      command[0] === other[0] &&
      command
        .slice(1)
        .every((value, valueIndex) => Math.abs(value - other[valueIndex + 1]) <= PATH_TOLERANCE)
    );
  });
}

function commandsFromPath(pdfPath) {
  const commands = [];
  pdfPath.walk({
    moveTo(x, y) {
      commands.push(['M', x, y]);
    },
    lineTo(x, y) {
      commands.push(['L', x, y]);
    },
    curveTo(...values) {
      commands.push(['C', ...values]);
    },
    closePath() {
      commands.push(['Z']);
    },
  });
  return commands;
}

function pathFromCommands(MuPDF, commands) {
  const result = new MuPDF.Path();
  for (const command of commands) {
    if (command[0] === 'M') result.moveTo(command[1], command[2]);
    else if (command[0] === 'L') result.lineTo(command[1], command[2]);
    else if (command[0] === 'C') result.curveTo(...command.slice(1));
    else if (command[0] === 'Z') result.closePath();
  }
  return result;
}

function approximately(actual, expected, tolerance) {
  return Math.abs(actual - expected) <= tolerance;
}

function validReceiptRect(rect) {
  const fields = ['x', 'y', 'left', 'top', 'right', 'bottom', 'width', 'height'];
  return (
    rect !== null &&
    typeof rect === 'object' &&
    fields.every((field) => Number.isFinite(rect[field])) &&
    rect.right > rect.left &&
    rect.bottom > rect.top &&
    rect.width > 0 &&
    rect.height > 0 &&
    approximately(rect.x, rect.left, RECEIPT_GEOMETRY_TOLERANCE) &&
    approximately(rect.y, rect.top, RECEIPT_GEOMETRY_TOLERANCE) &&
    approximately(rect.width, rect.right - rect.left, RECEIPT_GEOMETRY_TOLERANCE) &&
    approximately(rect.height, rect.bottom - rect.top, RECEIPT_GEOMETRY_TOLERANCE)
  );
}

function targetColor(color) {
  return (
    color.length === 3 &&
    color.every((value, index) => approximately(value, TARGET_COLOR[index], COLOR_TOLERANCE))
  );
}

function needsTextAutospace(left, right) {
  const cjk = (character) =>
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(character);
  const alphaNumeric = (character) => /[\p{Script=Latin}\p{Number}]/u.test(character);
  return (cjk(left) && alphaNumeric(right)) || (alphaNumeric(left) && cjk(right));
}

function sequenceModel(text, glyphs, scale) {
  let advance = 0;
  const visible = [];
  const characters = [...text];
  for (const [index, character] of characters.entries()) {
    const glyph = glyphs[character];
    if (!glyph)
      throw new Error(`glyph mapに無い文字です: U+${character.codePointAt(0).toString(16)}`);
    if (glyph.path.length > 0) visible.push({ character, sourceIndex: index, x: advance });
    advance += glyph.advance * scale;
    if (characters[index + 1] && needsTextAutospace(character, characters[index + 1])) {
      advance += CSS_AUTOSPACE_PX * CSS_TO_PDF;
    }
  }
  return { visible, advance };
}

function expectedSequence(domReport, pageIndex, role, text, glyphs, paths, scale, side) {
  const inventory = domReport?.margin_outline?.conversion?.inventory;
  if (!Array.isArray(inventory)) throw new Error('DOM証跡のmargin outline inventoryが無い');
  const matches = inventory.filter((item) => item?.page_index === pageIndex && item?.role === role);
  if (matches.length !== 1 || matches[0].text !== text) {
    throw new Error(`p${pageIndex + 1}: ${role} DOM証跡が一意でないか文字列が不正`);
  }
  const item = matches[0];
  if (item.coordinate_space !== 'physical_page_css_px_v1') {
    throw new Error(`p${pageIndex + 1}: ${role} DOM証跡の座標系が不正`);
  }
  const characterRects = item.character_rects;
  const bounds = item.bounds;
  const pageLocalBounds = item.page_local_bounds;
  const characters = [...text];
  if (
    !Array.isArray(characterRects) ||
    characterRects.length !== characters.length ||
    characterRects.some((entry, index) => entry?.character !== characters[index]) ||
    !validReceiptRect(bounds) ||
    !validReceiptRect(pageLocalBounds)
  ) {
    throw new Error(`p${pageIndex + 1}: ${role} DOM証跡のcharacter rect文字列が不正`);
  }
  const globalOffsetX = bounds.left - pageLocalBounds.left;
  const globalOffsetY = bounds.top - pageLocalBounds.top;
  for (const receipt of characterRects) {
    const characterRect = receipt?.page_local_rect;
    const globalRect = receipt?.global_rect;
    if (
      Object.hasOwn(receipt ?? {}, 'rect') ||
      !validReceiptRect(characterRect) ||
      !validReceiptRect(globalRect) ||
      characterRect.left < pageLocalBounds.left - 0.01 ||
      characterRect.right > pageLocalBounds.right + 0.01 ||
      characterRect.top < pageLocalBounds.top - 0.01 ||
      characterRect.bottom > pageLocalBounds.bottom + 0.01 ||
      !approximately(
        globalRect.left - characterRect.left,
        globalOffsetX,
        RECEIPT_GLOBAL_LOCAL_TOLERANCE,
      ) ||
      !approximately(
        globalRect.right - characterRect.right,
        globalOffsetX,
        RECEIPT_GLOBAL_LOCAL_TOLERANCE,
      ) ||
      !approximately(
        globalRect.top - characterRect.top,
        globalOffsetY,
        RECEIPT_GLOBAL_LOCAL_TOLERANCE,
      ) ||
      !approximately(
        globalRect.bottom - characterRect.bottom,
        globalOffsetY,
        RECEIPT_GLOBAL_LOCAL_TOLERANCE,
      ) ||
      !approximately(globalRect.width, characterRect.width, RECEIPT_GEOMETRY_TOLERANCE) ||
      !approximately(globalRect.height, characterRect.height, RECEIPT_GEOMETRY_TOLERANCE)
    ) {
      throw new Error(`p${pageIndex + 1}: ${role} DOM証跡のcharacter rect座標が不正`);
    }
  }
  const model = sequenceModel(text, glyphs, scale);
  const origin = side === 'left' ? LEFT_ORIGIN_PT : RIGHT_EDGE_PT - model.advance;
  return model.visible.map((expected) => {
    const receipt = characterRects[expected.sourceIndex];
    const left = receipt.page_local_rect.left;
    const top = receipt.page_local_rect.top;
    const receiptX = left * CSS_TO_PDF + DOM_X_TO_PDF_OFFSET_PT;
    const receiptY =
      (top + FONT_ASCENT_PX) * CSS_TO_PDF + (role === 'folio' ? FOLIO_DOM_Y_TO_PDF_OFFSET_PT : 0);
    const contractX = origin + expected.x;
    const contractY = role === 'title' ? TOP_BASELINE_PT : BOTTOM_BASELINE_PT;
    if (!approximately(receiptX, contractX, CONTRACT_POSITION_TOLERANCE_PT)) {
      throw new Error(`p${pageIndex + 1}: ${role} DOM証跡が固定layout契約から外れている`);
    }
    const baselineTolerance =
      role === 'title' ? TOP_BASELINE_TOLERANCE_PT : BOTTOM_BASELINE_TOLERANCE_PT;
    if (!approximately(receiptY, contractY, baselineTolerance)) {
      throw new Error(`p${pageIndex + 1}: ${role} DOM証跡の基線が固定layout契約から外れている`);
    }
    return {
      character: expected.character,
      commands: paths.get(expected.character),
      ctm: [PDF_PATH_SCALE, 0, 0, -PDF_PATH_SCALE, receiptX, contractY],
      evenOdd: false,
      color: PDF_COLOR,
    };
  });
}

function validateSequence(operations, expectedOperations, role, pageNumber) {
  const problems = [];
  if (operations.length !== expectedOperations.length) {
    problems.push(
      `p${pageNumber}: ${role} path数が不正（期待${expectedOperations.length}、実際${operations.length}）`,
    );
    return problems;
  }
  let reportedCharacter = false;
  let reportedPosition = false;
  const baselineTolerance =
    role === '柱' ? TOP_BASELINE_TOLERANCE_PT : BOTTOM_BASELINE_TOLERANCE_PT;
  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index];
    const expected = expectedOperations[index];
    if (operation.character !== expected.character && !reportedCharacter) {
      problems.push(
        `p${pageNumber}: ${role}文字列が不正（${index + 1}文字目: 期待${expected.character}、実際${operation.character ?? 'unknown'}）`,
      );
      reportedCharacter = true;
    }
    if (
      !reportedPosition &&
      (!approximately(operation.ctm[4], expected.ctm[4], OUTPUT_POSITION_TOLERANCE_PT) ||
        !approximately(operation.ctm[5], expected.ctm[5], baselineTolerance))
    ) {
      problems.push(`p${pageNumber}: ${role} glyph位置が不正（${index + 1}文字目）`);
      reportedPosition = true;
    }
  }
  return problems;
}

function replayOperations(expectedOperations, actualOperations, baselineTolerance) {
  return expectedOperations.map((operation, index) => {
    const actualY = actualOperations[index]?.ctm?.[5];
    if (!Number.isFinite(actualY) || !approximately(actualY, operation.ctm[5], baselineTolerance)) {
      return operation;
    }
    const ctm = [...operation.ctm];
    ctm[5] = actualY;
    return { ...operation, ctm };
  });
}

function rasterBand(MuPDF, page, operations, band, width, actual) {
  const bbox = [
    0,
    Math.floor(band[0] * RASTER_SCALE),
    Math.ceil(width * RASTER_SCALE),
    Math.ceil(band[1] * RASTER_SCALE),
  ];
  const pixmap = new MuPDF.Pixmap(MuPDF.ColorSpace.DeviceRGB, bbox, false);
  pixmap.clear(255);
  const device = new MuPDF.DrawDevice([RASTER_SCALE, 0, 0, RASTER_SCALE, 0, 0], pixmap);
  if (actual) {
    page.runPageContents(device, MuPDF.Matrix.identity);
  } else {
    for (const operation of operations) {
      const glyphPath = pathFromCommands(MuPDF, operation.commands);
      device.fillPath(
        glyphPath,
        operation.evenOdd,
        operation.ctm,
        MuPDF.ColorSpace.DeviceRGB,
        operation.color,
        1,
      );
      glyphPath.destroy();
    }
  }
  device.close();
  const pixels = Uint8Array.from(pixmap.getPixels());
  pixmap.destroy();
  return pixels;
}

function validateRaster(MuPDF, page, operations, band, width, label, pageNumber) {
  const actual = rasterBand(MuPDF, page, operations, band, width, true);
  const expected = rasterBand(MuPDF, page, operations, band, width, false);
  if (actual.length !== expected.length)
    return [`p${pageNumber}: ${label} raster sizeが一致しない`];
  for (let index = 0; index < actual.length; index += 1) {
    if (Math.abs(actual[index] - expected[index]) > RASTER_CHANNEL_TOLERANCE) {
      return [`p${pageNumber}: ${label}最終rasterが期待するoutlineと一致しない`];
    }
  }
  return [];
}

function verifyDocument(MuPDF, document, title, sourcePath, glyphMap, domReport) {
  const problems = [];
  // glyph map は生成環境の正規化形で記録されている（クラウド/NFC と
  // macOS/NFD でズレる）。照合は Unicode 等価（NFC）で行い、
  // sha256 の実体結合はそのままにする。
  const normalizedTitle = title.normalize('NFC');
  const matchingTitle = glyphMap.supported_titles?.filter(
    (entry) => entry.title.normalize('NFC') === normalizedTitle,
  ) ?? [];
  if (matchingTitle.length !== 1)
    problems.push('タイトルがglyph mapのsource-pinned一覧に一意に存在しない');
  else {
    const expectedTail = path.normalize(matchingTitle[0].path).normalize('NFC');
    if (!path.resolve(sourcePath).normalize('NFC').endsWith(expectedTail)) {
      problems.push('原稿pathがglyph mapのsource-pinned一覧と一致しない');
    }
    if (matchingTitle[0].sha256 !== sha256(sourcePath)) {
      problems.push('原稿SHA256がglyph mapのsource-pinned一覧と一致しない');
    }
  }
  const scale = (CSS_FONT_SIZE_PX / glyphMap.font.units_per_em) * CSS_TO_PDF;
  const expectedPaths = new Map(
    Object.entries(glyphMap.glyphs)
      .filter(([, glyph]) => glyph.path.length > 0)
      .map(([character, glyph]) => [character, parseSvgPath(glyph.path)]),
  );
  const pageCount = document.countPages();
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pageNumber = pageIndex + 1;
    const page = document.loadPage(pageIndex);
    const bounds = page.getBounds('MediaBox');
    const width = bounds[2] - bounds[0];
    const height = bounds[3] - bounds[1];
    const operations = [];
    const device = new MuPDF.Device({
      fillPath(pdfPath, evenOdd, ctm, _colorSpace, color, alpha) {
        const inBand =
          (ctm[5] >= TOP_BAND[0] && ctm[5] <= TOP_BAND[1]) ||
          (ctm[5] >= BOTTOM_BAND[0] && ctm[5] <= BOTTOM_BAND[1]);
        if (!inBand || alpha !== 1 || !targetColor(color)) return;
        if (
          !approximately(ctm[0], scale, SCALE_TOLERANCE) ||
          !approximately(ctm[3], -scale, SCALE_TOLERANCE) ||
          Math.abs(ctm[1]) > SCALE_TOLERANCE ||
          Math.abs(ctm[2]) > SCALE_TOLERANCE
        )
          return;
        const commands = commandsFromPath(pdfPath);
        const matches = [...expectedPaths.entries()]
          .filter(([, expected]) => commandsEqual(commands, expected))
          .map(([character]) => character);
        operations.push({
          character: matches.length === 1 ? matches[0] : null,
          matches,
          commands,
          evenOdd,
          color: [...color],
          ctm: [...ctm],
          band: ctm[5] <= TOP_BAND[1] ? 'top' : 'bottom',
        });
      },
    });
    page.runPageContents(device, MuPDF.Matrix.identity);
    device.close();
    if (pageIndex === 0) {
      if (operations.length !== 0) problems.push('表紙にoutline柱またはノンブルがある');
      problems.push(
        ...validateRaster(MuPDF, page, [], TOP_BAND, width, '表紙上margin', pageNumber),
      );
      problems.push(
        ...validateRaster(MuPDF, page, [], BOTTOM_BAND, width, '表紙下margin', pageNumber),
      );
      page.destroy();
      continue;
    }
    if (width < 590 || width > 600 || height < 835 || height > 845) {
      problems.push(`p${pageNumber}: MediaBoxがA4ではない`);
    }
    if (operations.some((operation) => operation.matches.length !== 1)) {
      problems.push(`p${pageNumber}: margin outline glyphをglyph mapに一意に対応付けられない`);
    }
    const top = operations
      .filter((operation) => operation.band === 'top')
      .sort((a, b) => a.ctm[4] - b.ctm[4]);
    const bottom = operations
      .filter((operation) => operation.band === 'bottom')
      .sort((a, b) => a.ctm[4] - b.ctm[4]);
    const side = pageIndex % 2 === 0 ? 'right' : 'left';
    const expectedTop = expectedSequence(
      domReport,
      pageIndex,
      'title',
      normalizedTitle,
      glyphMap.glyphs,
      expectedPaths,
      scale,
      side,
    );
    const expectedBottom = expectedSequence(
      domReport,
      pageIndex,
      'folio',
      String(pageNumber),
      glyphMap.glyphs,
      expectedPaths,
      scale,
      side,
    );
    problems.push(...validateSequence(top, expectedTop, '柱', pageNumber));
    problems.push(...validateSequence(bottom, expectedBottom, 'ノンブル', pageNumber));
    const rasterTop = replayOperations(expectedTop, top, TOP_BASELINE_TOLERANCE_PT);
    const rasterBottom = replayOperations(expectedBottom, bottom, BOTTOM_BASELINE_TOLERANCE_PT);
    problems.push(
      ...validateRaster(MuPDF, page, rasterTop, TOP_BAND, width, '上margin', pageNumber),
    );
    problems.push(
      ...validateRaster(MuPDF, page, rasterBottom, BOTTOM_BAND, width, '下margin', pageNumber),
    );
    page.destroy();
  }
  return problems;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const toolchain = path.resolve(args.toolchain);
  const packagePath = path.join(toolchain, 'node_modules', 'mupdf', 'package.json');
  const entryPath = path.join(toolchain, 'node_modules', 'mupdf', 'dist', 'mupdf.js');
  const packageJson = readJson(packagePath, 'MuPDF package');
  if (packageJson.version !== SUPPORTED_MUPDF_VERSION) {
    throw new Error(`MuPDF versionが未対応です: ${packageJson.version}`);
  }
  const glyphMap = readJson(args['glyph-map'], 'glyph map');
  const domReport = readJson(args['dom-report'], 'margin outline DOM証跡');
  if (glyphMap.schema_version !== 1) throw new Error('glyph map schemaが未対応です');
  const MuPDF = (await import(pathToFileURL(entryPath))).default;
  const document = MuPDF.Document.openDocument(args.pdf).asPDF();
  const problems = verifyDocument(MuPDF, document, args.title, args.source, glyphMap, domReport);
  const result = {
    schema_version: 1,
    result: problems.length === 0 ? 'pass' : 'fail',
    problems,
    inputs: {
      pdf_sha256: sha256(args.pdf),
      source_sha256: sha256(args.source),
      glyph_map_sha256: sha256(args['glyph-map']),
      dom_report_sha256: sha256(args['dom-report']),
      mupdf_version: packageJson.version,
      mupdf_entry_sha256: sha256(entryPath),
      page_count: document.countPages(),
      title: args.title,
    },
  };
  document.destroy();
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = problems.length === 0 ? 0 : 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 2;
});
