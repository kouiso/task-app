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
const HELPER =
  process.env.PDF_BOOK_TEST_MARGIN_HELPER ?? path.join(HERE, 'decorative-margin-outline.mjs');
const MAP_PATH = path.join(HERE, 'decorative-margin-glyph-map.json');
const FONT_PATH = process.env.PDF_BOOK_TEST_MARGIN_FONT;
const TOOLCHAIN = process.env.PDF_BOOK_TEST_TOOLCHAIN_DIR;
const BROWSER = process.env.PDF_BOOK_TEST_BROWSER;
const { outlineDecorativeMargins } = await import(pathToFileURL(HELPER));
const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));

const requiredInputsExist =
  Boolean(FONT_PATH) &&
  Boolean(TOOLCHAIN) &&
  Boolean(BROWSER) &&
  fs.existsSync(FONT_PATH) &&
  fs.existsSync(path.join(TOOLCHAIN, 'node_modules', 'puppeteer-core')) &&
  fs.existsSync(BROWSER);

test('page-local glyph coordinates remain stable across global Float32 boundaries', {
  skip: !requiredInputsExist,
}, async () => {
  const resolver = createRequire(path.join(TOOLCHAIN, 'node_modules/.margin-outline-resolver.cjs'));
  const puppeteer = await import(pathToFileURL(resolver.resolve('puppeteer-core')));
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'margin-local-coordinate-'));
  const title = 'さらなる学習のために';
  const fontUrl = pathToFileURL(FONT_PATH).href;
  const pageCases = [
    { name: 'zero', pageTop: 0 },
    { name: 'fractional-9-64', pageTop: 1051200 + 9 / 64 },
    { name: 'fractional-2-64', pageTop: 1051200 + 2 / 64 },
    { name: 'fractional-2p21-plus-5-64', pageTop: 2 ** 21 + 5 / 64 },
    { name: 'integer-1046400', pageTop: 1046400 },
    { name: 'integer-1048576', pageTop: 1048576 },
    { name: 'integer-1051200', pageTop: 1051200 },
    { name: 'integer-2p21', pageTop: 2 ** 21 },
  ];

  const fixtureHtml = ({
    pageTop,
    titlePadding = 38.6875,
    translate = '',
    failAfterTranslate = false,
    pageStyle = '',
    fixedDescendant = false,
    containerStyle = null,
    bodyStyle = '',
    extraCss = '',
  }) => `<!doctype html><html><head><style>
    @font-face{font-family:"BIZ UDPGothic";font-style:normal;font-weight:400;src:url(${JSON.stringify(fontUrl)}) format("truetype")}
    html,body{margin:0;min-height:${pageTop + 1200}px}
    .container{position:absolute;left:0;top:${pageTop}px}
    .page{position:relative;left:0;top:0;width:794px;height:1123px;text-spacing-trim:space-all;text-autospace:no-autospace}
    .content{position:absolute;left:80px;top:90px;width:634px;height:943px}
    .margin{position:absolute;left:80px;width:634px;height:94.5px;box-sizing:border-box;font:normal 400 17px "BIZ UDPGothic";color:rgb(37,48,58);text-align:right}
    .top{top:0;padding-top:${titlePadding}px;translate:${translate || 'none'}}
    .bottom{top:1028.03125px;padding-top:38.6875px}
    ${fixedDescendant ? '.top{position:fixed}' : ''}
    @keyframes page-witness{from{opacity:1}to{opacity:.99}}
    ${failAfterTranslate ? '.container[style*="position: absolute"] .top>span{font-weight:700}' : ''}
    ${extraCss}
  </style></head><body style="${bodyStyle}">
    <div class="container" data-vivliostyle-page-container="true"${containerStyle !== null ? ` style="${containerStyle}"` : ''}><section class="page" data-vivliostyle-page-box="true" style="${pageStyle}">
      <main class="content" data-vivliostyle-page-area-container="true">本文</main>
      <div class="margin top" data-vivliostyle-page-margin-box="top-right"${
        translate ? ` style="translate:${translate} !important"` : ''
      }><span style="">${title}</span></div>
      <div class="margin bottom" data-vivliostyle-page-margin-box="bottom-right"><span style=""><span data-vivliostyle-page-counter="_1">1</span></span></div>
    </section></div>
  </body></html>`;

  const run = async (options) => {
    const page = await browser.newPage();
    const fixture = path.join(directory, `fixture-${crypto.randomUUID()}.html`);
    fs.writeFileSync(fixture, fixtureHtml(options));
    await page.goto(pathToFileURL(fixture).href);
    await page.addScriptTag({
      content: `globalThis.__testOutlineDecorativeMargins = (${outlineDecorativeMargins.toString()});`,
    });
    if (options.blockLayout) {
      await page.evaluate(() => {
        const container = document.querySelector('.container');
        const originalSetProperty = container.style.setProperty.bind(container.style);
        container.style.setProperty = (name, value, priority) => {
          if (['position', 'left', 'top', 'margin'].includes(name)) return;
          originalSetProperty(name, value, priority);
        };
      });
    }
    if (options.blockRestoration) {
      await page.evaluate(() => {
        const container = document.querySelector('.container');
        const originalSetAttribute = container.setAttribute.bind(container);
        container.setAttribute = (name, value) => {
          if (name === 'style') return;
          originalSetAttribute(name, value);
        };
      });
    }
    if (Object.hasOwn(options, 'measurementThrowValue')) {
      await page.evaluate((thrownValue) => {
        const container = document.querySelector('.container');
        const originalSetProperty = container.style.setProperty.bind(container.style);
        container.style.setProperty = (name, value, priority) => {
          if (name === 'position') throw thrownValue;
          originalSetProperty(name, value, priority);
        };
      }, options.measurementThrowValue);
    }
    if (Object.hasOwn(options, 'restorationThrowValue')) {
      await page.evaluate((thrownValue) => {
        const container = document.querySelector('.container');
        const originalSetAttribute = container.setAttribute.bind(container);
        container.setAttribute = (name, value) => {
          if (name === 'style') throw thrownValue;
          originalSetAttribute(name, value);
        };
      }, options.restorationThrowValue);
    }
    if (options.waapiSelector) {
      await page.$eval(
        options.waapiSelector,
        (element, { action, keyframes, timing }) => {
          const animation = element.animate(
            keyframes,
            timing ?? { duration: 10000, iterations: Number.POSITIVE_INFINITY },
          );
          if (action === 'pause') animation.pause();
          if (action === 'finish-persist') {
            animation.persist();
            animation.finish();
          }
        },
        {
          action: options.waapiAction,
          keyframes: options.waapiKeyframes,
          timing: options.waapiTiming,
        },
      );
    }
    try {
      const beforeTranslate = await page.$eval('.top', (element) => ({
        value: element.style.getPropertyValue('translate'),
        priority: element.style.getPropertyPriority('translate'),
      }));
      const beforePageTranslate = await page.$eval('.page', (element) => ({
        value: element.style.getPropertyValue('translate'),
        priority: element.style.getPropertyPriority('translate'),
      }));
      const beforeFixture = await page.evaluate(() => ({
        containerStyle: document.querySelector('.container').getAttribute('style'),
        page: document.querySelector('.page').getBoundingClientRect().toJSON(),
        content: document.querySelector('.content').getBoundingClientRect().toJSON(),
        bodyText: document.body.innerText,
      }));
      const beforeScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
      const evaluation = await page.evaluate(
        async (glyphMap, expectedTitle) => {
          const serializeThrown = (caught) => {
            const caughtType = caught === null ? 'null' : typeof caught;
            const hasSerializableValue =
              caught === null || ['boolean', 'number', 'string'].includes(caughtType);
            return {
              type: caughtType,
              value: hasSerializableValue ? caught : null,
              wasUndefined: caught === undefined,
              message: String(caught),
            };
          };
          const outline = globalThis.__testOutlineDecorativeMargins;
          try {
            return {
              failureCaught: false,
              result: await outline(glyphMap, expectedTitle),
            };
          } catch (caught) {
            return {
              failureCaught: true,
              error: String(caught),
              caught: serializeThrown(caught),
              aggregateErrors:
                caught instanceof AggregateError
                  ? caught.errors.map((entry) => serializeThrown(entry))
                  : null,
            };
          }
        },
        map,
        title,
      );
      const { result, error, failureCaught, caught, aggregateErrors } = evaluation;
      const afterTranslate = await page.$eval('.top', (element) => ({
        value: element.style.getPropertyValue('translate'),
        priority: element.style.getPropertyPriority('translate'),
      }));
      const afterPageTranslate = await page.$eval('.page', (element) => ({
        value: element.style.getPropertyValue('translate'),
        priority: element.style.getPropertyPriority('translate'),
      }));
      const afterFixture = await page.evaluate(() => ({
        containerStyle: document.querySelector('.container').getAttribute('style'),
        page: document.querySelector('.page').getBoundingClientRect().toJSON(),
        content: document.querySelector('.content').getBoundingClientRect().toJSON(),
        bodyText: document.body.innerText,
      }));
      const afterScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
      const pathTransforms = result
        ? await page.$$eval('[data-vivliostyle-page-margin-box] path:first-child', (elements) =>
            Object.fromEntries(
              elements.map((element) => [
                element.parentElement.dataset.pdfDecorativeMarginOutline,
                element.getAttribute('transform'),
              ]),
            ),
          )
        : null;
      return {
        result,
        error,
        failureCaught,
        caught,
        aggregateErrors,
        beforeTranslate,
        afterTranslate,
        beforePageTranslate,
        afterPageTranslate,
        beforeScroll,
        afterScroll,
        beforeFixture,
        afterFixture,
        pathTransforms,
      };
    } finally {
      await page.close();
    }
  };

  try {
    const readings = [];
    for (const pageCase of pageCases) {
      const reading = await run({ pageTop: pageCase.pageTop });
      assert.equal(reading.error, undefined);
      assert.equal(reading.result.status, 'pass');
      assert.equal(reading.result.page_body_geometry_equal, true);
      for (const role of ['title', 'folio']) {
        const item = reading.result.inventory.find((entry) => entry.role === role);
        assert.equal(item.coordinate_space, 'physical_page_css_px_v1');
        const first = item.character_rects[0];
        assert.ok(Number.isFinite(first.global_rect.top));
        assert.ok(Number.isFinite(first.page_local_rect.top));
        const transform = reading.pathTransforms[role];
        const match = /^translate\(([-.\d]+) ([-.\d]+)\) scale\(/u.exec(transform);
        assert.ok(match, transform);
        assert.ok(
          Math.abs(
            Number(match[2]) - (first.page_local_rect.top - item.page_local_bounds.top + 15),
          ) < 0.000001,
        );
      }
      readings.push({
        ...pageCase,
        result: reading.result,
        pathTransforms: reading.pathTransforms,
      });
    }
    const reference = readings[0];
    for (const reading of readings) {
      for (const role of ['title', 'folio']) {
        const item = reading.result.inventory.find((entry) => entry.role === role);
        const referenceItem = reference.result.inventory.find((entry) => entry.role === role);
        const actualPathY = Number(
          /^translate\(([-.\d]+) ([-.\d]+)\) scale\(/u.exec(reading.pathTransforms[role])[2],
        );
        const referencePathY = Number(
          /^translate\(([-.\d]+) ([-.\d]+)\) scale\(/u.exec(reference.pathTransforms[role])[2],
        );
        assert.equal(actualPathY, referencePathY, `${reading.name} ${role} physical path y`);
        assert.equal(
          item.character_rects[0].page_local_rect.top,
          referenceItem.character_rects[0].page_local_rect.top,
          `${reading.name} ${role} page-local receipt`,
        );
        assert.equal(
          item.page_local_bounds.top,
          referenceItem.page_local_bounds.top,
          `${reading.name} ${role} page-local bounds`,
        );
      }
    }
    assert.notEqual(
      readings.find(({ name }) => name === 'zero').result.inventory[0].character_rects[0]
        .global_rect.top,
      readings.find(({ name }) => name === 'fractional-9-64').result.inventory[0].character_rects[0]
        .global_rect.top,
      'fixture must expose distinct global receipts',
    );

    for (const name of ['fractional-2-64', 'fractional-2p21-plus-5-64']) {
      const reading = readings.find((entry) => entry.name === name);
      const item = reading.result.inventory.find((entry) => entry.role === 'title');
      assert.notEqual(
        item.character_rects[0].global_rect.top - reading.pageTop,
        reference.result.inventory[0].character_rects[0].global_rect.top,
        `${name} must retain the global receipt residual witness`,
      );
    }

    const shifted = await run({ pageTop: 1051200, titlePadding: 39.6875 });
    const referenceTop = reference.result.inventory.find((item) => item.role === 'title')
      .character_rects[0].page_local_rect.top;
    const shiftedTop = shifted.result.inventory.find((item) => item.role === 'title')
      .character_rects[0].page_local_rect.top;
    assert.equal(shiftedTop - referenceTop, 1);

    const smallShift = await run({ pageTop: 0, titlePadding: 38.6875 + 1 / 64 });
    assert.equal(smallShift.error, undefined);
    const smallShiftTitle = smallShift.result.inventory.find((item) => item.role === 'title');
    const referenceTitle = reference.result.inventory.find((item) => item.role === 'title');
    const smallShiftPathY = Number(
      /^translate\(([-.\d]+) ([-.\d]+)\) scale\(/u.exec(smallShift.pathTransforms.title)[2],
    );
    const referencePathY = Number(
      /^translate\(([-.\d]+) ([-.\d]+)\) scale\(/u.exec(reference.pathTransforms.title)[2],
    );
    assert.equal(
      smallShiftTitle.character_rects[0].page_local_rect.top -
        referenceTitle.character_rects[0].page_local_rect.top,
      1 / 64,
    );
    assert.equal(
      smallShiftTitle.character_rects[0].global_rect.top -
        referenceTitle.character_rects[0].global_rect.top,
      1 / 64,
    );
    assert.equal(smallShiftPathY - referencePathY, 1 / 64);

    const translated = await run({ pageTop: 1051200, translate: '3px 4px' });
    assert.deepEqual(translated.beforeTranslate, { value: '3px 4px', priority: 'important' });
    assert.deepEqual(translated.afterTranslate, translated.beforeTranslate);

    const emptyContainerStyle = await run({ pageTop: 1051200, containerStyle: '' });
    assert.equal(emptyContainerStyle.error, undefined);
    assert.equal(emptyContainerStyle.beforeFixture.containerStyle, '');
    assert.equal(emptyContainerStyle.afterFixture.containerStyle, '');

    const throwing = await run({
      pageTop: 1051200,
      translate: '3px 4px',
      failAfterTranslate: true,
      containerStyle: 'margin-top:0px !important;margin-left:0px !important',
    });
    assert.match(throwing.error, /unsupported margin font/u);
    assert.deepEqual(throwing.afterTranslate, throwing.beforeTranslate);
    assert.deepEqual(throwing.afterPageTranslate, throwing.beforePageTranslate);
    assert.deepEqual(throwing.afterScroll, throwing.beforeScroll);
    assert.deepEqual(throwing.afterFixture, throwing.beforeFixture);

    const blockedLayout = await run({ pageTop: 1051200, blockLayout: true });
    assert.match(blockedLayout.error, /page localization/u);
    assert.deepEqual(blockedLayout.afterScroll, blockedLayout.beforeScroll);

    const restorationOnly = await run({
      pageTop: 1051200,
      blockRestoration: true,
      containerStyle: 'margin-top:0px !important;margin-left:0px !important',
    });
    assert.match(restorationOnly.error, /layout restoration/u);

    const measurementAndRestoration = await run({
      pageTop: 1051200,
      failAfterTranslate: true,
      blockRestoration: true,
      containerStyle: 'margin-top:0px !important;margin-left:0px !important',
    });
    assert.match(measurementAndRestoration.error, /unsupported margin font/u);
    assert.match(measurementAndRestoration.error, /layout restoration/u);

    const falsyRestoration = await run({
      pageTop: 1051200,
      restorationThrowValue: 0,
      containerStyle: 'margin-top:0px !important;margin-left:0px !important',
    });
    assert.equal(falsyRestoration.failureCaught, true);
    assert.deepEqual(falsyRestoration.caught, {
      type: 'number',
      value: 0,
      wasUndefined: false,
      message: '0',
    });

    const falsyMeasurement = await run({ pageTop: 1051200, measurementThrowValue: false });
    assert.equal(falsyMeasurement.failureCaught, true);
    assert.deepEqual(falsyMeasurement.caught, {
      type: 'boolean',
      value: false,
      wasUndefined: false,
      message: 'false',
    });

    const bothFalsy = await run({
      pageTop: 1051200,
      measurementThrowValue: 0,
      restorationThrowValue: false,
      containerStyle: 'margin-top:0px !important;margin-left:0px !important',
    });
    assert.equal(bothFalsy.failureCaught, true);
    assert.match(bothFalsy.error, /測定とlayout restoration/u);
    assert.deepEqual(bothFalsy.aggregateErrors, [
      { type: 'number', value: 0, wasUndefined: false, message: '0' },
      { type: 'boolean', value: false, wasUndefined: false, message: 'false' },
    ]);

    for (const unsupported of [
      { pageStyle: 'transform:scale(1)', error: /transform\/zoom/u },
      { pageStyle: 'translate:2000px 0', error: /page localization/u },
      { pageStyle: 'position:sticky', error: /fixed\/sticky/u },
      { pageStyle: 'animation:page-witness 1s linear infinite', error: /animation\/transition/u },
      { bodyStyle: 'animation:page-witness 1s linear infinite', error: /animation\/transition/u },
      {
        extraCss: '.top{animation:page-witness 1s linear infinite}',
        error: /animation\/transition/u,
      },
      { extraCss: '.top{transition:padding-top 1s}', error: /animation\/transition/u },
      { extraCss: '.top{transform:translateX(1px)}', error: /transform\/zoom/u },
      {
        extraCss: '.top>span{animation:page-witness 1s linear infinite}',
        error: /animation\/transition/u,
      },
      { extraCss: '.top>span{transform:translateX(1px)}', error: /transform\/zoom/u },
      { extraCss: '.top>span{position:fixed}', error: /fixed|未知の装飾node/u },
      { extraCss: '.top>span{position:sticky}', error: /fixed\/sticky|未知の装飾node/u },
      { fixedDescendant: true, error: /fixed/u },
      {
        extraCss: '.bottom{animation:page-witness 1s linear infinite}',
        error: /animation\/transition/u,
      },
      {
        name: 'waapi-running-target',
        waapiSelector: '.top',
        waapiKeyframes: [{ paddingTop: '38.6875px' }, { paddingTop: '40px' }],
        error: /animation\/transition/u,
      },
      {
        waapiSelector: '.top>span',
        waapiKeyframes: [{ opacity: 1 }, { opacity: 0.99 }],
        error: /animation\/transition/u,
      },
      {
        waapiSelector: 'body',
        waapiKeyframes: [{ opacity: 1 }, { opacity: 0.99 }],
        error: /animation\/transition/u,
      },
      {
        name: 'waapi-paused-delay',
        waapiSelector: '.top',
        waapiKeyframes: [{ paddingTop: '38.6875px' }, { paddingTop: '40px' }],
        waapiTiming: { delay: 10000, duration: 10000 },
        waapiAction: 'pause',
        error: /animation\/transition/u,
      },
      {
        name: 'waapi-completed-fill-forwards',
        waapiSelector: '.top',
        waapiKeyframes: [{ paddingTop: '38.6875px' }, { paddingTop: '40px' }],
        waapiTiming: { duration: 1, fill: 'forwards' },
        waapiAction: 'finish-persist',
        error: /animation\/transition/u,
      },
    ]) {
      const reading = await run({ pageTop: 1051200 + 9 / 64, ...unsupported });
      assert.match(reading.error, unsupported.error, unsupported.name);
      assert.deepEqual(reading.afterPageTranslate, reading.beforePageTranslate);
    }

    const pageTranslated = await run({
      pageTop: 1051200 + 9 / 64,
      pageStyle: 'translate:2px 3px !important',
    });
    assert.equal(pageTranslated.error, undefined);
    assert.deepEqual(pageTranslated.beforePageTranslate, {
      value: '2px 3px',
      priority: 'important',
    });
    assert.deepEqual(pageTranslated.afterPageTranslate, pageTranslated.beforePageTranslate);
  } finally {
    await browser.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
