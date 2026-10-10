import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const GLYPH_MAP_SHA256 = '35799ee1832c8c36712516174abc7902fa910c14e41ad9c9037b6dd1e1e5dc77';

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function validateGlyphMap(map) {
  if (!map || map.schema_version !== 1)
    throw new Error('margin glyph map schema_versionは1が必要です');
  const font = map.font;
  if (
    !font ||
    font.family !== 'BIZ UDPGothic' ||
    font.weight !== '400' ||
    font.style !== 'normal' ||
    font.writing_mode !== 'horizontal-tb' ||
    font.filename !== 'BIZUDPGothic_400Regular.ttf' ||
    font.sha256 !== '22f41ce68f1ce62477ca4ec1e2c0c400cc545ddff31d713e8edf87808614aeb2' ||
    !Number.isInteger(font.units_per_em) ||
    font.units_per_em <= 0
  ) {
    throw new Error('margin glyph map font contractが不正です');
  }
  if (!Array.isArray(map.supported_titles) || map.supported_titles.length !== 36) {
    throw new Error('margin glyph mapは36冊のtitle sourceが必要です');
  }
  const titles = new Set();
  for (const source of map.supported_titles) {
    if (
      !source ||
      typeof source.path !== 'string' ||
      !source.path.startsWith('material/30days-curriculum/') ||
      !/^[0-9a-f]{64}$/.test(source.sha256 ?? '') ||
      typeof source.title !== 'string' ||
      source.title.length === 0 ||
      titles.has(source.title)
    ) {
      throw new Error('margin glyph map title sourceが不正または重複しています');
    }
    titles.add(source.title);
  }
  if (
    typeof map.supported_characters !== 'string' ||
    crypto.createHash('sha256').update(map.supported_characters).digest('hex') !==
      map.supported_characters_sha256
  ) {
    throw new Error('margin glyph map character inventory hashが不正です');
  }
  const expectedCharacters = [...new Set(`0123456789 ${[...titles].join('')}`)].sort().join('');
  if (map.supported_characters !== expectedCharacters) {
    throw new Error('margin glyph map character inventoryがtitle/folioと一致しません');
  }
  if (!map.glyphs || Object.keys(map.glyphs).sort().join('') !== expectedCharacters) {
    throw new Error('margin glyph map glyph inventoryが不正です');
  }
  for (const character of expectedCharacters) {
    const glyph = map.glyphs[character];
    if (
      !glyph ||
      typeof glyph.path !== 'string' ||
      !Number.isFinite(glyph.advance) ||
      glyph.advance < 0 ||
      (character !== ' ' && glyph.path.length === 0)
    ) {
      throw new Error(`margin glyphが不正です: U+${character.codePointAt(0).toString(16)}`);
    }
  }
  return { titles };
}

export function loadMarginOutlineAssets(glyphMapPath, fontPath, sourcePath, expectedTitle) {
  if (
    !path.isAbsolute(glyphMapPath) ||
    !path.isAbsolute(fontPath) ||
    !path.isAbsolute(sourcePath)
  ) {
    throw new Error('margin outline asset pathは絶対パスが必要です');
  }
  if (
    !fs.statSync(glyphMapPath).isFile() ||
    !fs.statSync(fontPath).isFile() ||
    !fs.statSync(sourcePath).isFile()
  ) {
    throw new Error('margin outline assetは通常ファイルが必要です');
  }
  const glyphMapSha256 = sha256(glyphMapPath);
  if (glyphMapSha256 !== GLYPH_MAP_SHA256) {
    throw new Error(`margin glyph map hash不一致: ${glyphMapSha256}`);
  }
  const map = JSON.parse(fs.readFileSync(glyphMapPath, 'utf8'));
  validateGlyphMap(map);
  const fontSha256 = sha256(fontPath);
  if (path.basename(fontPath) !== map.font.filename || fontSha256 !== map.font.sha256) {
    throw new Error(`margin source font不一致: ${fontSha256}`);
  }
  const source = map.supported_titles.find((entry) => entry.title === expectedTitle);
  const sourceSha256 = sha256(sourcePath);
  const normalizedSourcePath = path.normalize(sourcePath);
  const normalizedRelativePath = path.normalize(source?.path ?? '');
  if (
    !source ||
    !normalizedSourcePath.endsWith(`${path.sep}${normalizedRelativePath}`) ||
    sourceSha256 !== source.sha256
  ) {
    throw new Error(`margin title source不一致: ${sourceSha256}`);
  }
  return {
    map,
    provenance: {
      glyph_map_path: glyphMapPath,
      glyph_map_sha256: glyphMapSha256,
      font_path: fontPath,
      font_sha256: fontSha256,
      source_path: sourcePath,
      source_sha256: sourceSha256,
      source_title: expectedTitle,
      supported_title_count: map.supported_titles.length,
      glyph_count: Object.keys(map.glyphs).length,
    },
  };
}

export function titleFromVivliostyleArgs(argv) {
  const indexes = argv.flatMap((value, index) => (value === '--title' ? [index] : []));
  if (indexes.length !== 1 || indexes[0] + 1 >= argv.length) {
    throw new Error('margin outlineには単一の--titleが必要です');
  }
  const title = argv[indexes[0] + 1];
  if (typeof title !== 'string' || title.length === 0 || title.startsWith('-')) {
    throw new Error('margin outline --titleが不正です');
  }
  return title;
}

export async function outlineDecorativeMargins(map, expectedTitle) {
  const PAGE_BOX = '[data-vivliostyle-page-box="true"]';
  const PAGE_CONTENT = '[data-vivliostyle-page-area-container="true"]';
  const MARGIN_BOX = '[data-vivliostyle-page-margin-box]';
  const TOP = new Set(['top-left', 'top-right']);
  const BOTTOM = new Set(['bottom-left', 'bottom-right']);
  const rectJson = (rect) => ({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
  });
  const localizedRectJson = (rect, origin) => ({
    x: rect.x - origin.left,
    y: rect.y - origin.top,
    width: rect.width,
    height: rect.height,
    top: rect.top - origin.top,
    right: rect.right - origin.left,
    bottom: rect.bottom - origin.top,
    left: rect.left - origin.left,
  });
  const geometry = (selector) =>
    [...document.querySelectorAll(selector)].map((element) =>
      rectJson(element.getBoundingClientRect()),
    );
  const contentText = () =>
    [...document.querySelectorAll(PAGE_CONTENT)].map((element) => element.innerText);
  const translateComponents = (element) => {
    const value = getComputedStyle(element).translate;
    if (value === 'none') return [0, 0];
    const parts = value.split(/\s+/u);
    const numbers = parts.map((part) => {
      const match = /^(-?(?:\d+(?:\.\d*)?|\.\d+))px$/u.exec(part);
      if (!match) throw new Error(`margin box translateがpxではありません: ${value}`);
      return Number(match[1]);
    });
    if (numbers.length < 1 || numbers.length > 3 || (numbers[2] ?? 0) !== 0) {
      throw new Error(`margin box translateが2Dではありません: ${value}`);
    }
    return [numbers[0], numbers[1] ?? 0];
  };
  const nonzeroTime = (value) =>
    value
      .split(',')
      .map((part) => part.trim())
      .some((part) => part !== '0s' && part !== '0ms');
  const assertStableStyle = (element, label, page) => {
    const style = getComputedStyle(element);
    const hasActiveAnimation = element.getAnimations().length > 0;
    if (
      hasActiveAnimation ||
      style.animationName !== 'none' ||
      nonzeroTime(style.animationDuration) ||
      nonzeroTime(style.transitionDuration)
    ) {
      throw new Error(`${label}のanimation/transitionは未対応です`);
    }
    const pageContainer = page.closest('[data-vivliostyle-page-container]');
    const spreadContainer = pageContainer?.parentElement;
    const outerZoomBox = spreadContainer?.parentElement;
    const viewerViewport = outerZoomBox?.parentElement;
    const siblingLayoutBox = outerZoomBox?.nextElementSibling;
    const siblingLayoutStyle = siblingLayoutBox ? getComputedStyle(siblingLayoutBox) : null;
    const siblingLayoutMatrix =
      siblingLayoutStyle?.transform && siblingLayoutStyle.transform !== 'none'
        ? new DOMMatrixReadOnly(siblingLayoutStyle.transform)
        : null;
    const hasPinnedPrintWrapperChain =
      spreadContainer?.hasAttribute('data-vivliostyle-spread-container') === true &&
      outerZoomBox?.hasAttribute('data-vivliostyle-outer-zoom-box') === true &&
      viewerViewport?.hasAttribute('data-vivliostyle-viewer-viewport') === true &&
      siblingLayoutBox?.hasAttribute('data-vivliostyle-layout-box') === true &&
      siblingLayoutBox.parentElement === viewerViewport &&
      siblingLayoutStyle.zoom === '8' &&
      siblingLayoutStyle.transformOrigin === '0px 0px' &&
      siblingLayoutMatrix?.is2D === true &&
      siblingLayoutMatrix.a === 0.125 &&
      siblingLayoutMatrix.b === 0 &&
      siblingLayoutMatrix.c === 0 &&
      siblingLayoutMatrix.d === 0.125 &&
      siblingLayoutMatrix.e === 0 &&
      siblingLayoutMatrix.f === 0;
    const isPageContainer = element === pageContainer;
    let compensatedVivliostylePixelRatio = false;
    if (isPageContainer && hasPinnedPrintWrapperChain && style.transform !== 'none') {
      const matrix = new DOMMatrixReadOnly(style.transform);
      compensatedVivliostylePixelRatio =
        style.zoom === '8' &&
        style.transformOrigin === '0px 0px' &&
        matrix.is2D &&
        matrix.a === 0.125 &&
        matrix.b === 0 &&
        matrix.c === Number.MIN_VALUE &&
        matrix.d === 0.125 &&
        matrix.e === 0 &&
        matrix.f === 0;
    }
    if (
      style.rotate !== 'none' ||
      style.scale !== 'none' ||
      style.perspective !== 'none' ||
      (!compensatedVivliostylePixelRatio && (style.transform !== 'none' || style.zoom !== '1'))
    ) {
      throw new Error(`${label}のtransform/zoomは未対応です`);
    }
    if (style.position === 'fixed' || style.position === 'sticky') {
      throw new Error(`${label}のfixed/sticky要素は未対応です`);
    }
  };
  const assertLocalizablePage = (page, itemBox, pageIndex, role) => {
    const label = `page ${pageIndex + 1} margin ${role}`;
    for (let element = page; element; element = element.parentElement) {
      assertStableStyle(element, `${label} page/ancestor`, page);
    }
    for (const element of [itemBox, ...itemBox.querySelectorAll('*')]) {
      assertStableStyle(element, `${label} target subtree`, page);
    }
    if (
      [...page.querySelectorAll('*')].some(
        (element) => getComputedStyle(element).position === 'fixed',
      )
    )
      throw new Error(`${label}のfixed descendantは未対応です`);
  };

  if (!map?.font || !Array.isArray(map.supported_titles) || !map.glyphs) {
    throw new Error('margin glyph map browser payloadが不正です');
  }
  const supportedTitles = new Set(map.supported_titles.map((source) => source.title));
  if (!supportedTitles.has(expectedTitle))
    throw new Error(`未登録のmargin titleです: ${expectedTitle}`);
  await document.fonts.ready;
  const matchingFontFaces = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      throw new Error('margin source font stylesheetを検査できません');
    }
    for (const rule of rules) {
      if (
        rule.type === CSSRule.FONT_FACE_RULE &&
        rule.style.src.includes(map.font.filename) &&
        rule.style.fontWeight === map.font.weight &&
        rule.style.fontStyle === map.font.style
      ) {
        matchingFontFaces.push(rule.style.fontFamily.replaceAll(/["']/gu, '').trim());
      }
    }
  }
  if (matchingFontFaces.length !== 1) {
    throw new Error(`margin source font-faceは1件必要です: ${matchingFontFaces.length}`);
  }
  const sourceFontFamily = matchingFontFaces[0];
  if (!document.fonts.check(`17px "${sourceFontFamily}"`)) {
    throw new Error(`margin source fontが読み込まれていません: ${sourceFontFamily}`);
  }

  const pages = [...document.querySelectorAll(PAGE_BOX)];
  if (pages.length === 0) throw new Error('physical page boxがありません');
  const canonicalPageBounds = pages[0].getBoundingClientRect();
  const before = {
    page_boxes: geometry(PAGE_BOX),
    page_content: geometry(PAGE_CONTENT),
    body_text: contentText(),
  };
  if (before.page_content.length !== pages.length) {
    throw new Error('physical pageとpage contentが1対1ではありません');
  }
  const inventory = [];
  for (const [pageIndex, page] of pages.entries()) {
    const pageBounds = page.getBoundingClientRect();
    const pageSize = {
      width: getComputedStyle(page).width,
      height: getComputedStyle(page).height,
    };
    if (pageBounds.width <= 0 || pageBounds.height <= 0) {
      throw new Error(`page ${pageIndex + 1} boundsが不正です`);
    }
    const boxes = [...page.querySelectorAll(MARGIN_BOX)].filter(
      (box) => box.textContent.trim().length > 0,
    );
    if (boxes.length !== 2) {
      throw new Error(`page ${pageIndex + 1}のnonempty margin boxは2件必要です: ${boxes.length}`);
    }
    const expectedSide = pageIndex % 2 === 0 ? 'right' : 'left';
    const topBoxes = boxes.filter((box) =>
      TOP.has(box.getAttribute('data-vivliostyle-page-margin-box')),
    );
    const bottomBoxes = boxes.filter((box) =>
      BOTTOM.has(box.getAttribute('data-vivliostyle-page-margin-box')),
    );
    if (topBoxes.length !== 1 || bottomBoxes.length !== 1) {
      throw new Error(`page ${pageIndex + 1}のtitle/folio margin boxが一意ではありません`);
    }
    const expected = [
      {
        box: topBoxes[0],
        role: 'title',
        text: expectedTitle,
        name: `top-${expectedSide}`,
      },
      {
        box: bottomBoxes[0],
        role: 'folio',
        text: String(pageIndex + 1),
        name: `bottom-${expectedSide}`,
      },
    ];
    for (const item of expected) {
      const name = item.box.getAttribute('data-vivliostyle-page-margin-box');
      const actualText = item.box.textContent.trim();
      if (name !== item.name || actualText !== item.text) {
        throw new Error(
          `page ${pageIndex + 1} margin ${item.role}不一致: ${name}:${JSON.stringify(actualText)}`,
        );
      }
      const directChildren = [...item.box.childNodes];
      const outer = directChildren.length === 1 ? directChildren[0] : null;
      if (
        !(outer instanceof HTMLElement) ||
        outer.tagName !== 'SPAN' ||
        [...outer.attributes].some(
          (attribute) => attribute.name !== 'style' || attribute.value !== '',
        )
      ) {
        throw new Error(`page ${pageIndex + 1} margin ${item.role}のsource node構造が不正です`);
      }
      const bounds = item.box.getBoundingClientRect();
      if (item.role === 'title') {
        const titleParts = [];
        const titleRects = [];
        let parenthesisDepth = 0;
        const failTitleNode = () => {
          throw new Error(`page ${pageIndex + 1} title marginに未知の装飾nodeがあります`);
        };
        const exactMainStyle = (element) => {
          const style = getComputedStyle(element);
          const primaryFontFamily = style.fontFamily.split(',')[0].replaceAll(/["']/gu, '').trim();
          return (
            style.display === 'inline' &&
            style.position === 'static' &&
            primaryFontFamily === sourceFontFamily &&
            style.fontWeight === map.font.weight &&
            style.fontStyle === map.font.style &&
            style.writingMode === map.font.writing_mode &&
            style.fontSize === '17px' &&
            style.color === 'rgb(37, 48, 58)' &&
            style.textDecorationLine === 'none'
          );
        };
        const exactRect = (element, expectedWidth) => {
          const rects = [...element.getClientRects()];
          if (rects.length !== 1) failTitleNode();
          const rect = rects[0];
          if (
            Math.abs(rect.width - expectedWidth) > 0.01 ||
            Math.abs(rect.height - 17) > 0.01 ||
            rect.left < bounds.left - 0.01 ||
            rect.right > bounds.right + 0.01 ||
            rect.top < bounds.top - 0.01 ||
            rect.bottom > bounds.bottom + 0.01
          ) {
            failTitleNode();
          }
          titleRects.push(rect);
        };
        for (const [nodeIndex, node] of [...outer.childNodes].entries()) {
          if (node.nodeType === Node.TEXT_NODE) {
            if (!node.textContent) failTitleNode();
            const range = document.createRange();
            range.selectNodeContents(node);
            const rects = [...range.getClientRects()];
            if (rects.length !== 1) failTitleNode();
            titleRects.push(rects[0]);
            titleParts.push(node.textContent);
            continue;
          }
          if (!(node instanceof HTMLElement) || node.attributes.length !== 0 || node.shadowRoot) {
            failTitleNode();
          }
          if (node.tagName === 'VIV-TS-THIN-SP') {
            const previous = outer.childNodes[nodeIndex - 1];
            const next = outer.childNodes[nodeIndex + 1];
            const previousText = previous?.nodeType === Node.TEXT_NODE ? previous.textContent : '';
            const nextText = next?.nodeType === Node.TEXT_NODE ? next.textContent : '';
            const left = [...previousText].at(-1);
            const right = [...nextText][0];
            const japanese = (character) =>
              typeof character === 'string' &&
              /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(character);
            const latinOrDigit = (character) =>
              typeof character === 'string' && /[A-Za-z0-9]/u.test(character);
            const before = getComputedStyle(node, '::before');
            const after = getComputedStyle(node, '::after');
            if (
              node.childNodes.length !== 0 ||
              node.textContent !== '' ||
              !exactMainStyle(node) ||
              !(
                (japanese(left) && latinOrDigit(right)) ||
                (latinOrDigit(left) && japanese(right))
              ) ||
              before.content !== 'none' ||
              after.content !== '" "' ||
              after.fontFamily.replaceAll(/["']/gu, '').trim() !== '-viv-ts-sp' ||
              after.fontSize !== '17px' ||
              after.lineHeight !== '0px' ||
              after.letterSpacing !== '-6.375px' ||
              after.wordSpacing !== '0px' ||
              after.textOrientation !== 'mixed' ||
              after.textRendering.toLowerCase() !== 'geometricprecision'
            ) {
              failTitleNode();
            }
            exactRect(node, 2.125);
            continue;
          }
          const punctuation = node.tagName === 'VIV-TS-OPEN' ? '（' : '）';
          const isOpen = node.tagName === 'VIV-TS-OPEN';
          if (!isOpen && node.tagName !== 'VIV-TS-CLOSE') failTitleNode();
          const inner = node.childNodes.length === 1 ? node.firstChild : null;
          const punctuationNode = inner?.childNodes.length === 1 ? inner.firstChild : null;
          if (
            !(inner instanceof HTMLElement) ||
            inner.tagName !== 'VIV-TS-INNER' ||
            inner.attributes.length !== 0 ||
            inner.shadowRoot ||
            punctuationNode?.nodeType !== Node.TEXT_NODE ||
            punctuationNode.textContent !== punctuation ||
            !exactMainStyle(node) ||
            getComputedStyle(node, '::before').content !== 'none' ||
            getComputedStyle(node, '::after').content !== 'none' ||
            getComputedStyle(inner, '::before').content !== 'none' ||
            getComputedStyle(inner, '::after').content !== 'none' ||
            (isOpen ? parenthesisDepth !== 0 : parenthesisDepth !== 1)
          ) {
            failTitleNode();
          }
          parenthesisDepth += isOpen ? 1 : -1;
          exactRect(node, 8.5);
          titleParts.push(punctuation);
        }
        if (parenthesisDepth !== 0 || titleParts.join('') !== item.text) failTitleNode();
        const lineTop = titleRects[0]?.top;
        const lineBottom = titleRects[0]?.bottom;
        if (
          !Number.isFinite(lineTop) ||
          titleRects.some(
            (rect) =>
              Math.abs(rect.top - lineTop) > 0.01 || Math.abs(rect.bottom - lineBottom) > 0.01,
          )
        ) {
          failTitleNode();
        }
      } else {
        const counter = outer.childNodes.length === 1 ? outer.firstChild : null;
        const counterAttributes = counter instanceof HTMLElement ? [...counter.attributes] : [];
        if (
          !(counter instanceof HTMLElement) ||
          counter.tagName !== 'SPAN' ||
          counter.childNodes.length !== 1 ||
          counter.firstChild?.nodeType !== Node.TEXT_NODE ||
          counter.textContent !== item.text ||
          counterAttributes.length !== 1 ||
          counterAttributes[0].name !== 'data-vivliostyle-page-counter' ||
          !/^_\d+$/u.test(counterAttributes[0].value)
        ) {
          throw new Error(`page ${pageIndex + 1} folio marginに未知の装飾nodeがあります`);
        }
      }
      const walker = document.createTreeWalker(item.box, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.textContent.length > 0) textNodes.push(node);
      }
      if (
        textNodes
          .map((textNode) => textNode.textContent)
          .join('')
          .trim() !== item.text
      ) {
        throw new Error(`page ${pageIndex + 1} margin text node inventory不一致`);
      }
      const drawing = [];
      const measureCharacters = (containerBounds, createDrawing, localOrigin = null) => {
        const measured = [];
        for (const textNode of textNodes) {
          if (textNode.textContent.trim().length === 0) continue;
          const style = getComputedStyle(textNode.parentElement);
          const primaryFontFamily = style.fontFamily.split(',')[0].replaceAll(/["']/gu, '').trim();
          if (
            primaryFontFamily !== sourceFontFamily ||
            style.fontWeight !== map.font.weight ||
            style.fontStyle !== map.font.style ||
            style.writingMode !== map.font.writing_mode ||
            style.fontSize !== '17px' ||
            style.color !== 'rgb(37, 48, 58)'
          ) {
            throw new Error(
              `page ${pageIndex + 1}のunsupported margin font: ${JSON.stringify({
                family: style.fontFamily,
                weight: style.fontWeight,
                style: style.fontStyle,
                writing_mode: style.writingMode,
                size: style.fontSize,
                color: style.color,
              })}`,
            );
          }
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const ascent = context.measureText(textNode.textContent).fontBoundingBoxAscent;
          if (!Number.isFinite(ascent) || ascent <= 0)
            throw new Error('margin font ascentを測れません');
          let offset = 0;
          for (const character of textNode.textContent) {
            const glyph = map.glyphs[character];
            if (!glyph)
              throw new Error(
                `未登録のmargin glyphです: U+${character.codePointAt(0).toString(16)}`,
              );
            const range = document.createRange();
            range.setStart(textNode, offset);
            offset += character.length;
            range.setEnd(textNode, offset);
            const rects = [...range.getClientRects()];
            if (rects.length !== 1)
              throw new Error(`margin glyphが単一行ではありません: ${character}`);
            const rect = rects[0];
            if (
              rect.width <= 0 ||
              rect.height <= 0 ||
              rect.left < containerBounds.left - 0.01 ||
              rect.right > containerBounds.right + 0.01 ||
              rect.top < containerBounds.top - 0.01 ||
              rect.bottom > containerBounds.bottom + 0.01
            ) {
              throw new Error(`margin glyph boundsが不正です: ${character}`);
            }
            measured.push({
              character,
              rect: localOrigin ? localizedRectJson(rect, localOrigin) : rectJson(rect),
            });
            if (createDrawing && glyph.path.length > 0) {
              drawing.push({
                path: glyph.path,
                x: rect.left - containerBounds.left,
                y: rect.top - containerBounds.top + ascent,
                scale: Number.parseFloat(style.fontSize) / map.font.units_per_em,
                color: style.color,
              });
            }
          }
        }
        return measured;
      };
      assertLocalizablePage(page, item.box, pageIndex, item.role);
      const [translateX, translateY] = translateComponents(page);
      const pageContainer = page.closest('[data-vivliostyle-page-container]');
      if (!(pageContainer instanceof HTMLElement)) {
        throw new Error(`page ${pageIndex + 1} margin ${item.role}のpage containerがありません`);
      }
      const previousContainerStyle = pageContainer.getAttribute('style');
      let pageLocalBounds;
      let pageLocalCharacterRects;
      let measurementFailed = false;
      let measurementError;
      try {
        pageContainer.style.setProperty('position', 'absolute', 'important');
        pageContainer.style.setProperty('left', '0px', 'important');
        pageContainer.style.setProperty('top', '0px', 'important');
        pageContainer.style.setProperty('margin', '0px', 'important');
        const localizedPageBounds = page.getBoundingClientRect();
        const localizedPageSize = {
          width: getComputedStyle(page).width,
          height: getComputedStyle(page).height,
        };
        if (
          Math.abs(localizedPageBounds.left - translateX) > 0.001 ||
          Math.abs(localizedPageBounds.top - translateY) > 0.001 ||
          Math.abs(localizedPageBounds.left) > canonicalPageBounds.width ||
          Math.abs(localizedPageBounds.top) > canonicalPageBounds.height ||
          Math.abs(localizedPageBounds.width - canonicalPageBounds.width) > 0.001 ||
          Math.abs(localizedPageBounds.height - canonicalPageBounds.height) > 0.001 ||
          localizedPageSize.width !== pageSize.width ||
          localizedPageSize.height !== pageSize.height
        ) {
          throw new Error(
            `page ${pageIndex + 1} margin ${item.role}のpage localizationが不正です: ${JSON.stringify(
              {
                before: rectJson(pageBounds),
                localized: rectJson(localizedPageBounds),
              },
            )}`,
          );
        }
        const localizedBoxBounds = item.box.getBoundingClientRect();
        pageLocalBounds = localizedRectJson(localizedBoxBounds, localizedPageBounds);
        pageLocalCharacterRects = measureCharacters(localizedBoxBounds, true, localizedPageBounds);
      } catch (caught) {
        measurementFailed = true;
        measurementError = caught;
      }
      let restorationFailed = false;
      let restorationError;
      try {
        if (previousContainerStyle === null) pageContainer.removeAttribute('style');
        else pageContainer.setAttribute('style', previousContainerStyle);
        const restoredPageBounds = page.getBoundingClientRect();
        if (previousContainerStyle === null && pageContainer.getAttribute('style') === '') {
          pageContainer.removeAttribute('style');
        }
        if (
          pageContainer.getAttribute('style') !== previousContainerStyle ||
          Math.abs(restoredPageBounds.left - pageBounds.left) > 0.001 ||
          Math.abs(restoredPageBounds.top - pageBounds.top) > 0.001 ||
          Math.abs(restoredPageBounds.width - pageBounds.width) > 0.001 ||
          Math.abs(restoredPageBounds.height - pageBounds.height) > 0.001
        ) {
          throw new Error(
            `page ${pageIndex + 1} margin ${item.role}のlayout restorationが不正です: ${JSON.stringify(
              {
                style_equal: pageContainer.getAttribute('style') === previousContainerStyle,
                style_before: previousContainerStyle,
                style_restored: pageContainer.getAttribute('style'),
                before: rectJson(pageBounds),
                restored: rectJson(restoredPageBounds),
              },
            )}`,
          );
        }
      } catch (caught) {
        restorationFailed = true;
        restorationError = caught;
      }
      if (measurementFailed && restorationFailed) {
        const measurementMessage =
          measurementError instanceof Error ? measurementError.message : String(measurementError);
        const restorationMessage =
          restorationError instanceof Error ? restorationError.message : String(restorationError);
        throw new AggregateError(
          [measurementError, restorationError],
          `page ${pageIndex + 1} margin ${item.role}の測定とlayout restorationが失敗しました: ${measurementMessage}; ${restorationMessage}`,
        );
      }
      if (measurementFailed) throw measurementError;
      if (restorationFailed) throw restorationError;
      if (!pageLocalBounds || !pageLocalCharacterRects) {
        throw new Error(`page ${pageIndex + 1} margin glyph局所座標が不正です`);
      }
      const globalCharacterRects = measureCharacters(bounds, false);
      if (
        globalCharacterRects.length !== pageLocalCharacterRects.length ||
        globalCharacterRects.some(
          (entry, index) => entry.character !== pageLocalCharacterRects[index].character,
        )
      ) {
        throw new Error(`page ${pageIndex + 1} margin glyph座標の対応が不正です`);
      }
      const characterRects = globalCharacterRects.map((entry, index) => ({
        character: entry.character,
        global_rect: entry.rect,
        page_local_rect: pageLocalCharacterRects[index].rect,
      }));
      for (const textNode of textNodes) textNode.textContent = '';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', String(bounds.width));
      svg.setAttribute('height', String(bounds.height));
      svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('role', 'presentation');
      svg.setAttribute('focusable', 'false');
      svg.setAttribute('data-pdf-decorative-margin-outline', item.role);
      Object.assign(svg.style, {
        position: 'absolute',
        left: '0px',
        top: '0px',
        overflow: 'visible',
        pointerEvents: 'none',
      });
      for (const drawingItem of drawing) {
        const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        outline.setAttribute('d', drawingItem.path);
        outline.setAttribute(
          'transform',
          `translate(${drawingItem.x} ${drawingItem.y}) scale(${drawingItem.scale} ${-drawingItem.scale})`,
        );
        outline.setAttribute('fill', drawingItem.color);
        svg.appendChild(outline);
      }
      item.box.style.width = `${bounds.width}px`;
      item.box.style.height = `${bounds.height}px`;
      item.box.appendChild(svg);
      inventory.push({
        page_index: pageIndex,
        role: item.role,
        box: name,
        text: item.text,
        coordinate_space: 'physical_page_css_px_v1',
        source_dom_role: item.role === 'title' ? 'title_text_span' : 'folio_counter_span',
        bounds: rectJson(bounds),
        page_local_bounds: rectJson(pageLocalBounds),
        character_rects: characterRects,
        outline_path_count: drawing.length,
      });
    }
  }
  const after = {
    page_boxes: geometry(PAGE_BOX),
    page_content: geometry(PAGE_CONTENT),
    body_text: contentText(),
  };
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error('margin outline変換でpage/body geometryまたは本文が変わりました');
  }
  return {
    status: 'pass',
    expected_title: expectedTitle,
    page_count: pages.length,
    converted_box_count: inventory.length,
    source_font_face_count: matchingFontFaces.length,
    source_font_family: sourceFontFamily,
    page_body_geometry_equal: true,
    inventory,
  };
}
