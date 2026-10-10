import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const { outlineDecorativeMargins } = await import(
  pathToFileURL(path.join(HERE, 'decorative-margin-outline.mjs'))
);
const MAP_PATH =
  process.env.PDF_BOOK_TEST_MARGIN_MAP ?? path.join(HERE, 'decorative-margin-glyph-map.json');
const FONT_PATH = process.env.PDF_BOOK_TEST_MARGIN_FONT;
const TOOLCHAIN = process.env.PDF_BOOK_TEST_TOOLCHAIN_DIR;
const BROWSER = process.env.PDF_BOOK_TEST_BROWSER;
const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
const title = 'さらなる学習のために';
const fontUrl = pathToFileURL(FONT_PATH).href;
const containerPair = 'zoom:8;transform:matrix(0.125,0,5e-324,0.125,0,0);transform-origin:left top';
const layoutPair = 'zoom:8;transform:matrix(0.125,0,0,0.125,0,0);transform-origin:left top';
const attr = (enabled, name) => (enabled ? name : '');

const html = ({
  pinned = false,
  containerStyle = '',
  layoutStyle = '',
  outerStyle = '',
  containerAttribute = true,
  spreadAttribute = true,
  outerAttribute = true,
  viewerAttribute = true,
  layoutAttribute = true,
  layoutBeforeOuter = false,
  interloper = false,
  pageTop = 1051200.140625,
} = {}) => {
  const layout = `<div class="layout" ${attr(layoutAttribute, 'data-vivliostyle-layout-box')} style="${layoutStyle}"></div>`;
  const pageTree = `<div class="outer" ${attr(outerAttribute, 'data-vivliostyle-outer-zoom-box')}><div class="spread" ${attr(spreadAttribute, 'data-vivliostyle-spread-container')}>${interloper ? '<div class="interloper">' : ''}<div class="container" ${attr(containerAttribute, 'data-vivliostyle-page-container')} style="${containerStyle}"><div data-vivliostyle-bleed-box><section class="page" data-vivliostyle-page-box="true"><main class="content" data-vivliostyle-page-area-container="true">本文</main><div class="margin top" data-vivliostyle-page-margin-box="top-right"><span>${title}</span></div><div class="margin bottom" data-vivliostyle-page-margin-box="bottom-right"><span><span data-vivliostyle-page-counter="_1">1</span></span></div></section></div></div>${interloper ? '</div>' : ''}</div></div>`;
  return `<!doctype html><html><head><style>
@font-face{font-family:"BIZ UDPGothic";font-style:normal;font-weight:400;src:url(${JSON.stringify(fontUrl)}) format("truetype")}
html,body{margin:0;min-height:${pageTop + 1300}px}.unknown,.viewer,.outer,.spread{position:relative}.container{position:absolute;left:0;top:${pageTop}px}.page{position:absolute;left:0;top:0;width:794px;height:1123px;text-spacing-trim:space-all;text-autospace:no-autospace}.content{position:absolute;left:80px;top:90px;width:634px;height:943px}.margin{position:absolute;left:80px;width:634px;height:94.5px;box-sizing:border-box;font:normal 400 17px "BIZ UDPGothic";color:rgb(37,48,58);text-align:right}.top{top:0;padding-top:38.6875px}.bottom{top:1028.03125px;padding-top:38.6875px}
${pinned ? `[data-vivliostyle-layout-box]{--viv-outputPixelRatio:8;--viv-devicePixelRatio:1;transform-origin:left top}@supports (zoom:8){[data-vivliostyle-layout-box]{zoom:calc(var(--viv-outputPixelRatio,1)/var(--viv-devicePixelRatio,1));transform:scale(calc(var(--viv-devicePixelRatio,1)/var(--viv-outputPixelRatio,1)))}@media print{[data-vivliostyle-spread-container] [data-vivliostyle-page-container]{--viv-outputPixelRatio:8;zoom:var(--viv-outputPixelRatio,1);transform:matrix(calc(1/var(--viv-outputPixelRatio,1)),0,5e-324,calc(1/var(--viv-outputPixelRatio,1)),0,0);transform-origin:left top}}}` : ''}
</style></head><body><div class="unknown" style="${outerStyle}"><div class="viewer" ${attr(viewerAttribute, 'data-vivliostyle-viewer-viewport')}>${layoutBeforeOuter ? layout + pageTree : pageTree + layout}<div data-vivliostyle-toc-box></div></div></div></body></html>`;
};

const assertClose = (actual, expected, label) => {
  if (typeof expected === 'number')
    return assert.ok(Math.abs(actual - expected) <= 0.005, `${label}: ${actual} != ${expected}`);
  if (Array.isArray(expected)) {
    assert.equal(actual.length, expected.length, label);
    expected.forEach((value, index) => {
      assertClose(actual[index], value, `${label}[${index}]`);
    });
    return;
  }
  if (expected && typeof expected === 'object') {
    assert.deepEqual(Object.keys(actual), Object.keys(expected), label);
    for (const key of Object.keys(expected))
      assertClose(actual[key], expected[key], `${label}.${key}`);
    return;
  }
  assert.equal(actual, expected, label);
};

test('accepts only the pinned Chrome/Vivliostyle print wrapper and preserves localized geometry', async () => {
  const resolver = createRequire(path.join(TOOLCHAIN, 'node_modules/.margin-outline-resolver.cjs'));
  const puppeteer = await import(pathToFileURL(resolver.resolve('puppeteer-core')));
  const browser = await puppeteer.launch({
    executablePath: BROWSER,
    headless: true,
  });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'margin-pixel-ratio-v3-'));
  const run = async (fixture) => {
    const page = await browser.newPage();
    await page.emulateMediaType('print');
    const file = path.join(directory, `fixture-${crypto.randomUUID()}.html`);
    fs.writeFileSync(file, html(fixture));
    await page.goto(pathToFileURL(file).href);
    try {
      const computed = await page.evaluate(() => {
        const read = (selector) => {
          const style = getComputedStyle(document.querySelector(selector));
          return {
            transform: style.transform,
            zoom: style.zoom,
            origin: style.transformOrigin,
          };
        };
        return { container: read('.container'), layout: read('.layout') };
      });
      const before = await page.$eval('.page', (pageBox) => {
        const rect = (value) => ({
          x: value.x,
          y: value.y,
          width: value.width,
          height: value.height,
          top: value.top,
          right: value.right,
          bottom: value.bottom,
          left: value.left,
        });
        const margin = pageBox.querySelector('.top');
        const text = margin.querySelector('span').firstChild;
        const range = document.createRange();
        range.setStart(text, 0);
        range.setEnd(text, 1);
        return {
          page: rect(pageBox.getBoundingClientRect()),
          margin: rect(margin.getBoundingClientRect()),
          firstCharacter: rect(range.getBoundingClientRect()),
        };
      });
      let result;
      let error;
      try {
        result = await page.evaluate(outlineDecorativeMargins, map, title);
      } catch (caught) {
        error = String(caught);
      }
      const pathTransforms = result
        ? await page.$$eval('[data-vivliostyle-page-margin-box] path:first-child', (elements) =>
            elements.map((element) => element.getAttribute('transform')),
          )
        : null;
      const after = await page.$eval('.page', (pageBox) => {
        const bounds = pageBox.getBoundingClientRect();
        return {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          top: bounds.top,
          right: bounds.right,
          bottom: bounds.bottom,
          left: bounds.left,
        };
      });
      return { before, computed, result, error, pathTransforms, after };
    } finally {
      await page.close();
    }
  };
  try {
    const good = await run({ pinned: true });
    assert.deepEqual(good.computed, {
      container: {
        transform: 'matrix(0.125, 0, 4.94066e-324, 0.125, 0, 0)',
        zoom: '8',
        origin: '0px 0px',
      },
      layout: {
        transform: 'matrix(0.125, 0, 0, 0.125, 0, 0)',
        zoom: '8',
        origin: '0px 0px',
      },
    });
    const origin = await run({ pinned: true, pageTop: 0 });
    assert.equal(origin.error, undefined);
    assert.equal(good.error, undefined);
    assert.equal(good.result.status, 'pass');
    assert.equal(good.result.page_body_geometry_equal, true);
    assert.ok(good.before.page.y > 500_000, JSON.stringify(good.before.page));
    assertClose(good.after, good.before.page, 'page geometry after conversion');
    const titleInventory = good.result.inventory.find((item) => item.role === 'title');
    assert.ok(titleInventory);
    const firstCharacter = titleInventory.character_rects[0];
    assertClose(
      firstCharacter.global_rect,
      good.before.firstCharacter,
      'global first-character geometry',
    );
    const originTitle = origin.result.inventory.find((item) => item.role === 'title');
    assertClose(
      firstCharacter.page_local_rect,
      originTitle.character_rects[0].page_local_rect,
      'localized first-character geometry',
    );
    assertClose(
      titleInventory.page_local_bounds,
      originTitle.page_local_bounds,
      'localized margin geometry',
    );
    assert.ok(
      Math.abs(
        good.before.firstCharacter.y - good.before.page.y - firstCharacter.page_local_rect.y,
      ) > 0.005,
      'large global coordinates must expose the Float32 subtraction residual',
    );
    assert.match(good.pathTransforms[0], /^translate\(-?\d/u);
    for (const bad of [
      {
        layoutStyle: layoutPair,
        containerStyle: 'zoom:4;transform:matrix(0.125,0,5e-324,0.125,0,0)',
      },
      {
        layoutStyle: layoutPair,
        containerStyle: 'zoom:8.0001;transform:matrix(0.125,0,5e-324,0.125,0,0)',
      },
      {
        layoutStyle: layoutPair,
        containerStyle: 'zoom:8;transform:matrix(0.125001,0,5e-324,0.125,0,0)',
      },
      {
        layoutStyle: layoutPair,
        containerStyle: 'zoom:8;transform:matrix(0.125,0,5e-324,0.125,1,0)',
      },
      {
        layoutStyle: layoutPair,
        containerStyle: 'zoom:8;transform:matrix(0.125,0.01,5e-324,0.125,0,0)',
      },
      {
        layoutStyle: layoutPair,
        containerStyle: 'zoom:8;transform:matrix(0.125,0,0.01,0.125,0,0)',
      },
      { layoutStyle: layoutPair, containerStyle: 'zoom:8;transform:none' },
      {
        layoutStyle: layoutPair,
        containerStyle: `${containerPair};rotate:1deg`,
      },
      { layoutStyle: layoutPair, containerStyle: `${containerPair};scale:1` },
      {
        layoutStyle: layoutPair,
        containerStyle:
          'zoom:8;transform:matrix(0.125,0,5e-324,0.125,0,0);transform-origin:1px 0px',
      },
      {
        layoutStyle: layoutPair,
        containerStyle: containerPair,
        containerAttribute: false,
      },
      {
        layoutStyle: layoutPair,
        containerStyle: containerPair,
        spreadAttribute: false,
      },
      {
        layoutStyle: layoutPair,
        containerStyle: containerPair,
        outerAttribute: false,
      },
      {
        layoutStyle: layoutPair,
        containerStyle: containerPair,
        viewerAttribute: false,
      },
      {
        layoutStyle: layoutPair,
        containerStyle: containerPair,
        layoutAttribute: false,
      },
      {
        layoutStyle: 'zoom:4;transform:matrix(0.125,0,0,0.125,0,0)',
        containerStyle: containerPair,
      },
      {
        layoutStyle: 'zoom:8;transform:matrix(0.125001,0,0,0.125,0,0)',
        containerStyle: containerPair,
      },
      {
        layoutStyle: layoutPair,
        containerStyle: containerPair,
        layoutBeforeOuter: true,
      },
      {
        layoutStyle: layoutPair,
        containerStyle: containerPair,
        interloper: true,
      },
      {
        layoutStyle: layoutPair,
        containerStyle: containerPair,
        outerStyle: containerPair,
      },
      { layoutStyle: layoutPair, containerStyle: 'transform:scale(1)' },
    ]) {
      const reading = await run(bad);
      assert.match(reading.error, /transform\/zoom/u, JSON.stringify({ bad, reading }));
    }
  } finally {
    await browser.close();
    fs.rmSync(directory, { recursive: true });
  }
});
