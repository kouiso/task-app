import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const [entry, mapPath, output, reportPath, variant = 'good'] = process.argv.slice(2);
const MuPDF = (await import(pathToFileURL(entry))).default;
const glyphMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const title = 'Day 28: タスク一括操作を実装しよう';
const scale = (17 / glyphMap.font.units_per_em) * 0.75;
const pathScale = 0.006225586868822575;
const color = [0.1451, 0.1882, 0.2275];
const rightEdge = 532.89404296875;
const domOffset = -0.017578125;
const pageHeightCss = 4800;
const fontAscent = 15;
const titleBaseline = 40.27001953125;
const folioBaseline = 811.27001953125;
const folioYOffset = -0.0234375;

function parse(source) {
  const tokens = source.match(/[A-Za-z]|-?(?:\d+(?:\.\d*)?|\.\d+)/gu) ?? [];
  const result = new MuPDF.Path();
  let i = 0;
  let command = '';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  while (i < tokens.length) {
    if (/^[A-Za-z]$/u.test(tokens[i])) command = tokens[i++];
    if (command === 'Z') {
      if (x !== startX || y !== startY) result.lineTo(startX, startY);
      result.closePath();
      command = '';
      continue;
    }
    let first = true;
    while (i < tokens.length && !/^[A-Za-z]$/u.test(tokens[i])) {
      if (command === 'M' || command === 'L') {
        x = Number(tokens[i++]);
        y = Number(tokens[i++]);
        if (command === 'M' && first) {
          result.moveTo(x, y);
          startX = x;
          startY = y;
        } else result.lineTo(x, y);
      } else if (command === 'H') {
        x = Number(tokens[i++]);
        result.lineTo(x, y);
      } else if (command === 'V') {
        y = Number(tokens[i++]);
        result.lineTo(x, y);
      } else if (command === 'Q') {
        const controlX = Number(tokens[i++]);
        const controlY = Number(tokens[i++]);
        const endX = Number(tokens[i++]);
        const endY = Number(tokens[i++]);
        result.curveTo(
          x + (2 * (controlX - x)) / 3,
          y + (2 * (controlY - y)) / 3,
          endX + (2 * (controlX - endX)) / 3,
          endY + (2 * (controlY - endY)) / 3,
          endX,
          endY,
        );
        x = endX;
        y = endY;
      } else throw new Error(command);
      first = false;
    }
  }
  return result;
}

function width(text) {
  return [...text].reduce((sum, character) => sum + glyphMap.glyphs[character].advance * scale, 0);
}

function receiptRect(left, top, width, height) {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

function drawText(device, text, startX, baseline, options = {}) {
  let x = startX;
  let visibleIndex = 0;
  for (const character of text) {
    const glyph = glyphMap.glyphs[character];
    if (glyph.path.length > 0) {
      if (visibleIndex !== options.skipIndex) {
        const glyphPath = parse(glyph.path);
        device.fillPath(
          glyphPath,
          false,
          [pathScale, 0, 0, -pathScale, x + visibleIndex * (options.drift ?? 0), baseline],
          MuPDF.ColorSpace.DeviceRGB,
          color,
          1,
        );
        glyphPath.destroy();
      }
      visibleIndex += 1;
    }
    x += glyph.advance * scale;
  }
}

const buffer = new MuPDF.Buffer();
const writer = new MuPDF.DocumentWriter(buffer, 'pdf', 'compress=no');
const inventory = [];

function receiptItem(pageIndex, role, text, startX) {
  let x = startX;
  const characterRects = [];
  const pageTop = pageIndex * pageHeightCss;
  const baseline = role === 'title' ? titleBaseline : folioBaseline;
  const pageLocalTop = (baseline - (role === 'folio' ? folioYOffset : 0)) / 0.75 - fontAscent;
  const top = pageTop + pageLocalTop;
  for (const character of text) {
    const glyph = glyphMap.glyphs[character];
    const pdfX = Math.fround(x);
    const left = (pdfX - domOffset) / 0.75;
    characterRects.push({
      character,
      global_rect: receiptRect(left, top, 10, 17),
      page_local_rect: receiptRect(left, pageLocalTop, 10, 17),
    });
    x += glyph.advance * scale;
  }
  const boxTop = role === 'folio' ? 1028.03125 : 0;
  return {
    page_index: pageIndex,
    role,
    text,
    coordinate_space: 'physical_page_css_px_v1',
    bounds: receiptRect(83.1484375, pageTop + boxTop, 627.400390625, 94.5),
    page_local_bounds: receiptRect(83.1484375, boxTop, 627.400390625, 94.5),
    character_rects: characterRects,
  };
}

for (let pageNumber = 1; pageNumber <= 3; pageNumber += 1) {
  const device = writer.beginPage([0, 0, 595, 842]);
  const expectedSide = pageNumber % 2 === 0 ? 'left' : 'right';
  const expectedTitleX = expectedSide === 'left' ? 62.34375 : rightEdge - width(title);
  const expectedFolioX = expectedSide === 'left' ? 62.34375 : rightEdge - width(String(pageNumber));
  inventory.push(receiptItem(pageNumber - 1, 'title', title, expectedTitleX));
  inventory.push(receiptItem(pageNumber - 1, 'folio', String(pageNumber), expectedFolioX));
  if (pageNumber === 1) {
    if (variant === 'cover-furniture') drawText(device, 'D', 62.34375, 40.27001953125);
  } else if (variant !== 'blank') {
    const side = variant === 'wrong-side' && pageNumber === 2 ? 'right' : expectedSide;
    let drawnTitle =
      variant === 'missing-space' && pageNumber === 2 ? title.replaceAll(' ', '') : title;
    if (variant === 'wrong-title' && pageNumber === 2)
      drawnTitle = drawnTitle.replace('Day', 'Dya');
    const titleX = side === 'left' ? 62.34375 : rightEdge - width(drawnTitle);
    const folioText = variant === 'wrong-folio' && pageNumber === 2 ? '3' : String(pageNumber);
    const folioX = side === 'left' ? 62.34375 : rightEdge - width(folioText);
    const drawnTitleBaseline =
      variant === 'band-edge-baseline'
        ? 18.1
        : variant === 'outside-baseline'
          ? 40.264
          : variant === 'quantized-baseline'
            ? 40.265625
            : titleBaseline;
    const drawnFolioBaseline =
      variant === 'band-edge-baseline'
        ? 785.1
        : variant === 'outside-baseline'
          ? 811.321
          : variant === 'quantized-baseline'
            ? 811.3125
            : folioBaseline;
    drawText(device, drawnTitle, titleX, drawnTitleBaseline, {
      skipIndex: variant === 'missing-title-glyph' && pageNumber === 2 ? 3 : -1,
      drift: variant === 'cumulative-drift' ? 1.5 : 0,
    });
    drawText(device, folioText, folioX, drawnFolioBaseline, {
      drift: variant === 'cumulative-drift' ? 1.5 : 0,
    });
    if (variant === 'duplicate-title' && pageNumber === 2)
      drawText(device, 'D', titleX, 40.27001953125);
    if (variant === 'arbitrary-ink' && pageNumber === 2) {
      const ink = new MuPDF.Path();
      ink.rect(300, 30, 310, 40);
      device.fillPath(ink, false, MuPDF.Matrix.identity, MuPDF.ColorSpace.DeviceRGB, [0, 0, 0], 1);
      ink.destroy();
    }
    if (variant === 'occluded-title' && pageNumber === 2) {
      const cover = new MuPDF.Path();
      cover.rect(50, 18, 300, 55);
      device.fillPath(
        cover,
        false,
        MuPDF.Matrix.identity,
        MuPDF.ColorSpace.DeviceRGB,
        [1, 1, 1],
        1,
      );
      cover.destroy();
    }
  }
  device.close();
  writer.endPage();
}
writer.close();
fs.writeFileSync(output, buffer.asUint8Array());
fs.writeFileSync(reportPath, JSON.stringify({ margin_outline: { conversion: { inventory } } }));
buffer.destroy();
