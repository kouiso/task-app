#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`invalid argument pair at ${key ?? '<end>'}`);
    }
    args[key.slice(2)] = value;
  }
  const required = [
    'html',
    'theme-css',
    'book-css',
    'per-book-css',
    'sources',
    'report',
    'browser',
    'toolchain-dir',
    'page-width-mm',
    'page-height-mm',
  ];
  const missing = required.filter((key) => !args[key]);
  if (missing.length) throw new Error(`missing arguments: ${missing.join(', ')}`);
  return args;
}

async function injectStyleSheet(page, cssPath) {
  const resolved = path.resolve(cssPath);
  const css = await fs.readFile(resolved, 'utf8');
  const href = pathToFileURL(resolved).href;
  await page.evaluate(async (url) => {
    await new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', () => reject(new Error(`stylesheet failed: ${url}`)), {
        once: true,
      });
      document.head.append(link);
    });
  }, href);
  return {
    path: resolved,
    expanded_sha256: crypto.createHash('sha256').update(css).digest('hex'),
  };
}

async function flattenCss(cssPath, active = new Set()) {
  const resolved = path.resolve(cssPath);
  if (active.has(resolved)) throw new Error(`cyclic CSS import: ${resolved}`);
  active.add(resolved);
  let css = await fs.readFile(resolved, 'utf8');
  const flattened = [];
  const importPattern = /@import\s+url\(([^)]+)\)\s*;/;
  for (;;) {
    const match = importPattern.exec(css);
    if (!match) break;
    const raw = match[1].trim().replace(/^['"]|['"]$/g, '');
    if (/^(?:data:|https?:|file:)/.test(raw)) {
      throw new Error(`unsupported non-local CSS import: ${raw}`);
    }
    flattened.push(...(await flattenCss(path.resolve(path.dirname(resolved), raw), active)));
    css = `${css.slice(0, match.index)}${css.slice(match.index + match[0].length)}`;
  }
  css = css.replace(/url\(([^)]+)\)/g, (whole, value) => {
    const raw = value.trim().replace(/^['"]|['"]$/g, '');
    if (/^(?:data:|https?:|file:|#)/.test(raw)) return whole;
    return `url("${pathToFileURL(path.resolve(path.dirname(resolved), raw)).href}")`;
  });
  active.delete(resolved);
  flattened.push({ path: resolved, css });
  return flattened;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sources = JSON.parse(await fs.readFile(args.sources, 'utf8'));
  if (!Array.isArray(sources)) {
    throw new Error('pre source manifest must be an array');
  }
  const expected = new Map();
  for (const source of sources) {
    if (
      !source?.id ||
      !/^[0-9a-f]{64}$/.test(source?.source_sha256 ?? '') ||
      expected.has(source.id)
    ) {
      throw new Error(`invalid or duplicate source manifest entry: ${source?.id}`);
    }
    expected.set(source.id, source.source_sha256);
  }

  const pageWidthMm = Number(args['page-width-mm']);
  const pageHeightMm = Number(args['page-height-mm']);
  if (
    !Number.isFinite(pageWidthMm) ||
    !Number.isFinite(pageHeightMm) ||
    !(pageWidthMm > 0) ||
    !(pageHeightMm > 0)
  ) {
    throw new Error('page dimensions must be positive');
  }

  const toolchainDir = path.resolve(args['toolchain-dir']);
  const resolver = createRequire(path.join(toolchainDir, 'node_modules', '.pre-fit-resolver.cjs'));
  const puppeteerEntry = resolver.resolve('puppeteer-core');
  const puppeteer = await import(pathToFileURL(puppeteerEntry));
  const browser = await puppeteer.launch({
    executablePath: path.resolve(args.browser),
    headless: true,
    args: ['--allow-file-access-from-files'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1200 });
    await page.emulateMediaType('print');
    const failedRequests = [];
    page.on('requestfailed', (request) =>
      failedRequests.push({
        url: request.url(),
        error: request.failure()?.errorText ?? 'unknown',
      }),
    );
    await page.goto(pathToFileURL(path.resolve(args.html)).href, { waitUntil: 'load' });
    const expandedTheme = await flattenCss(args['theme-css']);
    await fs.writeFile(
      `${args.report}.theme.css`,
      expandedTheme.map(({ path: filePath, css }) => `/* ${filePath} */\n${css}`).join('\n'),
      'utf8',
    );
    const styleSheets = [];
    for (const sheet of expandedTheme) {
      await page.addStyleTag({ content: sheet.css });
      styleSheets.push({
        path: sheet.path,
        expanded_sha256: crypto.createHash('sha256').update(sheet.css).digest('hex'),
      });
    }
    for (const cssPath of [args['book-css'], args['per-book-css']]) {
      styleSheets.push(await injectStyleSheet(page, cssPath));
    }
    await page.evaluate(async () => await document.fonts.ready);
    if (failedRequests.length) {
      throw new Error(`resource requests failed: ${JSON.stringify(failedRequests)}`);
    }

    const result = await page.evaluate(
      ({ pageWidthMm, pageHeightMm }) => {
        const pxFor = (cssLength) => {
          const probe = document.createElement('div');
          probe.style.cssText = [
            'position:absolute',
            'visibility:hidden',
            'inset:auto',
            'margin:0',
            'padding:0',
            'border:0',
            `width:${cssLength}`,
            'height:1px',
          ].join(';');
          document.body.append(probe);
          const width = probe.getBoundingClientRect().width;
          probe.remove();
          return width;
        };
        const rootStyle = getComputedStyle(document.documentElement);
        const marginNames = [
          '--vs-page--margin-top',
          '--vs-page--margin-bottom',
          '--vs-page--margin-inner',
          '--vs-page--margin-outer',
        ];
        const marginCss = Object.fromEntries(
          marginNames.map((name) => [name, rootStyle.getPropertyValue(name).trim()]),
        );
        if (Object.values(marginCss).some((value) => !value)) {
          throw new Error(`page margin variables are missing: ${JSON.stringify(marginCss)}`);
        }
        const marginPx = Object.fromEntries(
          Object.entries(marginCss).map(([name, value]) => [name, pxFor(value)]),
        );
        if (Object.values(marginPx).some((value) => !(value > 0))) {
          throw new Error(`page margins are not positive: ${JSON.stringify(marginPx)}`);
        }
        const pageWidthPx = pxFor(`${pageWidthMm}mm`);
        const pageHeightPx = pxFor(`${pageHeightMm}mm`);
        const contentWidthPx =
          pageWidthPx - marginPx['--vs-page--margin-inner'] - marginPx['--vs-page--margin-outer'];
        const contentHeightPx =
          pageHeightPx - marginPx['--vs-page--margin-top'] - marginPx['--vs-page--margin-bottom'];
        if (!(contentWidthPx > 0) || !(contentHeightPx > 0)) {
          throw new Error('computed page content box is not positive');
        }

        document.documentElement.style.width = `${contentWidthPx}px`;
        document.body.style.width = `${contentWidthPx}px`;
        document.body.style.maxWidth = 'none';
        document.body.style.margin = '0';
        const elements = [...document.querySelectorAll('pre[data-pdf-pre-id]')];
        if (elements.length !== document.querySelectorAll('pre').length) {
          throw new Error('a pre element is missing data-pdf-pre-id');
        }
        const seen = new Set();
        const pres = elements.map((element) => {
          const id = element.dataset.pdfPreId;
          if (!id || seen.has(id)) throw new Error(`missing or duplicate DOM pre id: ${id}`);
          seen.add(id);
          const style = getComputedStyle(element);
          const expectsJetBrainsMono = style.fontFamily.includes('JetBrains Mono');
          const monoFontLoaded = document.fonts.check(`${style.fontSize} "JetBrains Mono"`);
          if (expectsJetBrainsMono && !monoFontLoaded) {
            throw new Error(`code font is not loaded for ${id}`);
          }
          const rect = element.getBoundingClientRect();
          const marginBefore = Number.parseFloat(style.marginBlockStart);
          const marginAfter = Number.parseFloat(style.marginBlockEnd);
          const paintedHeight = rect.height;
          const requiredHeight = paintedHeight + marginBefore + marginAfter;
          const paddingBefore = Number.parseFloat(style.paddingBlockStart);
          const paddingAfter = Number.parseFloat(style.paddingBlockEnd);
          const borderBefore = Number.parseFloat(style.borderBlockStartWidth);
          const borderAfter = Number.parseFloat(style.borderBlockEndWidth);
          const fontSize = Number.parseFloat(style.fontSize);
          const lineHeight = Number.parseFloat(style.lineHeight);
          const matchedRules = [];
          const collectRules = (rules) => {
            for (const rule of rules) {
              if (rule.cssRules) collectRules(rule.cssRules);
              if (rule.selectorText) {
                try {
                  if (
                    element.matches(rule.selectorText) &&
                    /(?:padding|background|font-size|line-height)/.test(rule.style?.cssText ?? '')
                  ) {
                    matchedRules.push({ selector: rule.selectorText, style: rule.style.cssText });
                  }
                } catch {}
              }
            }
          };
          for (const sheet of document.styleSheets) {
            try {
              collectRules(sheet.cssRules);
            } catch {}
          }
          const numbers = [
            paintedHeight,
            requiredHeight,
            rect.width,
            marginBefore,
            marginAfter,
            paddingBefore,
            paddingAfter,
            borderBefore,
            borderAfter,
            fontSize,
            lineHeight,
          ];
          if (
            numbers.some((number) => !Number.isFinite(number) || number < 0) ||
            paintedHeight === 0 ||
            rect.width === 0
          ) {
            throw new Error(`invalid pre geometry for ${id}: ${JSON.stringify(numbers)}`);
          }
          if (
            paddingBefore === 0 ||
            paddingAfter === 0 ||
            style.backgroundColor === 'rgba(0, 0, 0, 0)' ||
            style.whiteSpace !== 'pre-wrap'
          ) {
            throw new Error(`final code-block CSS is not active for ${id}`);
          }
          if (fontSize + 0.01 < (8 * 96) / 72) {
            throw new Error(`code font is below 8pt for ${id}: ${fontSize}px`);
          }
          return {
            id,
            painted_height_px: paintedHeight,
            required_height_px: requiredHeight,
            painted_width_px: rect.width,
            margin_block_start_px: marginBefore,
            margin_block_end_px: marginAfter,
            padding_block_start_px: paddingBefore,
            padding_block_end_px: paddingAfter,
            border_block_start_px: borderBefore,
            border_block_end_px: borderAfter,
            font_family: style.fontFamily,
            font_size_px: fontSize,
            line_height_px: lineHeight,
            white_space: style.whiteSpace,
            overflow_x: style.overflowX,
            background_color: style.backgroundColor,
            jetbrains_mono_expected: expectsJetBrainsMono,
            jetbrains_mono_loaded: monoFontLoaded,
            matched_size_rules: matchedRules,
          };
        });
        return {
          page: {
            width_mm: pageWidthMm,
            height_mm: pageHeightMm,
            width_px: pageWidthPx,
            height_px: pageHeightPx,
            margin_css: marginCss,
            margin_px: marginPx,
            content_width_px: contentWidthPx,
            content_height_px: contentHeightPx,
            prism_background_variable: rootStyle.getPropertyValue('--vs-prism--background').trim(),
            stylesheet_count: document.styleSheets.length,
            prism_rule_count: [...document.styleSheets]
              .flatMap((sheet) => {
                try {
                  return [...sheet.cssRules];
                } catch {
                  return [];
                }
              })
              .filter((rule) => /pre\[class\*=["']language-["']\]/.test(rule.selectorText ?? ''))
              .length,
          },
          pres,
        };
      },
      { pageWidthMm, pageHeightMm },
    );

    const actualIds = result.pres.map((item) => item.id);
    if (actualIds.length !== expected.size || actualIds.some((id) => !expected.has(id))) {
      throw new Error(`DOM/source pre ID mismatch: ${JSON.stringify(actualIds)}`);
    }
    result.pres = result.pres.map((item) => ({
      ...item,
      source_sha256: expected.get(item.id),
    }));
    result.stylesheets = styleSheets;
    result.browser = path.resolve(args.browser);
    result.html = path.resolve(args.html);
    await fs.writeFile(args.report, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
