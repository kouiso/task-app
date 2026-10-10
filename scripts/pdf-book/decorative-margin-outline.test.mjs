import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  loadMarginOutlineAssets,
  outlineDecorativeMargins,
  titleFromVivliostyleArgs,
  validateGlyphMap,
} from './decorative-margin-outline.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, '..', '..');
const MAP_PATH = path.join(HERE, 'decorative-margin-glyph-map.json');
const FONT_PATH =
  process.env.PDF_BOOK_TEST_MARGIN_FONT ??
  path.join(
    REPO,
    'node_modules/@expo-google-fonts/biz-udpgothic/400Regular/BIZUDPGothic_400Regular.ttf',
  );
const TEST_REPO = process.env.PDF_BOOK_TEST_REPO ?? REPO;
const TOOLCHAIN = process.env.PDF_BOOK_TEST_TOOLCHAIN_DIR;
const BROWSER = process.env.PDF_BOOK_TEST_BROWSER ?? '/usr/bin/google-chrome';
const canUseBrowser =
  Boolean(TOOLCHAIN) &&
  fs.existsSync(path.join(TOOLCHAIN, 'node_modules/puppeteer-core')) &&
  fs.existsSync(BROWSER);
const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));

test('static glyph asset binds all current 36 sources and stable titles', () => {
  const validated = validateGlyphMap(map);
  assert.equal(validated.titles.size, 36);
  const source = map.supported_titles[0];
  const sourcePath = path.join(TEST_REPO, source.path);
  const assets = loadMarginOutlineAssets(MAP_PATH, FONT_PATH, sourcePath, source.title);
  assert.equal(assets.provenance.supported_title_count, 36);
  assert.equal(assets.provenance.font_sha256, map.font.sha256);
  assert.equal(assets.provenance.source_sha256, source.sha256);
  for (const titleSource of map.supported_titles) {
    const currentPath = path.join(TEST_REPO, titleSource.path);
    const current = loadMarginOutlineAssets(MAP_PATH, FONT_PATH, currentPath, titleSource.title);
    assert.equal(current.provenance.source_sha256, titleSource.sha256);
  }
  for (const character of '0123456789') assert.ok(map.glyphs[character]);
  const tampered = structuredClone(map);
  tampered.glyphs['0'].path = '';
  assert.throws(() => validateGlyphMap(tampered), /glyph/);
  const staleDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'margin-outline-stale-source-'));
  const staleSource = path.join(staleDirectory, source.path);
  fs.mkdirSync(path.dirname(staleSource), { recursive: true });
  fs.copyFileSync(sourcePath, staleSource);
  fs.appendFileSync(staleSource, '\nchanged\n');
  assert.throws(
    () => loadMarginOutlineAssets(MAP_PATH, FONT_PATH, staleSource, source.title),
    /title source不一致/,
  );
  fs.rmSync(staleDirectory, { recursive: true });
});

test('Vivliostyle title arguments are single and explicit', () => {
  assert.equal(
    titleFromVivliostyleArgs(['build', '--title', 'さらなる学習のために']),
    'さらなる学習のために',
  );
  assert.throws(() => titleFromVivliostyleArgs(['build']), /単一/);
  assert.throws(() => titleFromVivliostyleArgs(['--title', 'a', '--title', 'b']), /単一/);
});

test('real browser outlines only the two supported margin boxes and rejects malformed layouts', {
  skip: !canUseBrowser,
}, async () => {
  const resolver = createRequire(path.join(TOOLCHAIN, 'node_modules/.margin-outline-resolver.cjs'));
  const puppeteer = await import(pathToFileURL(resolver.resolve('puppeteer-core')));
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'margin-outline-test-'));
  const fontUrl = pathToFileURL(FONT_PATH).href;
  const title = 'さらなる学習のために';
  const html = (body) => `<!doctype html><html><head><style>
      @font-face{font-family:"BIZ UDPGothic";font-style:normal;font-weight:400;src:url(${JSON.stringify(fontUrl)}) format("truetype")}
      @font-face{font-family:"-viv-ts-sp";src:url("data:font/woff2;base64,d09GMgABAAAAAADsAAoAAAAAAhwAAACkAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAANAoUNgE2AiQDDAsIAAQgBQYHLhuDATAvDuxmH09wwcdQfVXDjoN4/uuenbvv/WombeKVxJoJmsgSDAIMQBNI2364+oJVIbt1VpdteYNucBxRTKkHHAAtsOCiG02Dh+ybQCFXG3XLx6aFAW6lt2nu/R/sYAIAJhgonJTgpE20Fsy1eGx9BUCBHYJCAxpAKsezAIKwvzuuv0MdwOvy2w0RlAHC9crGWiIAgIIGCEoJGCTsDC4sx/ZMAAA=") format("woff2")}
      body{margin:0}.page{position:relative;width:794px;height:1123px;text-spacing-trim:space-all;text-autospace:no-autospace}.content{position:absolute;left:80px;top:90px;width:634px;height:943px}.margin{position:absolute;left:80px;width:634px;height:90px;font:normal 400 17px "BIZ UDPGothic";color:rgb(37,48,58)}.top{top:0}.bottom{top:1033px}
      viv-ts-thin-sp::after{content:" ";font:1em/0 "-viv-ts-sp";letter-spacing:-.375em;text-rendering:geometricPrecision;word-spacing:normal;text-orientation:mixed;visibility:visible}
    </style></head><body>${body}</body></html>`;
  const titleMarkup = (text = title) => `<span style="">${text}</span>`;
  const folioMarkup = (text = '1') =>
    `<span style=""><span data-vivliostyle-page-counter="_1">${text}</span></span>`;
  const pageMarkup = (top = titleMarkup(), bottom = folioMarkup(), extra = '') =>
    `<div data-vivliostyle-page-container="true"><section class="page" data-vivliostyle-page-box="true"><main class="content" data-vivliostyle-page-area-container="true">本文</main><div class="margin top" data-vivliostyle-page-margin-box="top-right">${top}</div><div class="margin bottom" data-vivliostyle-page-margin-box="bottom-right">${bottom}</div>${extra}</section></div>`;
  const run = async (markup, expectedTitle = title) => {
    const page = await browser.newPage();
    const fixture = path.join(directory, 'fixture.html');
    fs.writeFileSync(fixture, html(markup));
    await page.goto(pathToFileURL(fixture).href);
    try {
      const result = await page.evaluate(outlineDecorativeMargins, map, expectedTitle);
      const remainingMarginText = await page.$$eval('[data-vivliostyle-page-margin-box]', (boxes) =>
        boxes.map((box) => box.textContent),
      );
      return { ...result, remainingMarginText };
    } finally {
      await page.close();
    }
  };
  try {
    const result = await run(pageMarkup());
    assert.equal(result.status, 'pass');
    assert.equal(result.converted_box_count, 2);
    assert.equal(result.page_body_geometry_equal, true);
    assert.deepEqual(result.remainingMarginText, ['', '']);
    const knownEngineTitles = [
      {
        title: 'Day 03: GitHubに保存する',
        markup: 'Day 03: GitHub<viv-ts-thin-sp></viv-ts-thin-sp>に保存する',
      },
      {
        title: 'Day 05: ログイン画面のUIを作ろう',
        markup:
          'Day 05: ログイン画面の<viv-ts-thin-sp></viv-ts-thin-sp>UI<viv-ts-thin-sp></viv-ts-thin-sp>を作ろう',
      },
      {
        title: 'タスク管理アプリを作る30日間ハンズオン教材',
        markup:
          'タスク管理アプリを作る<viv-ts-thin-sp></viv-ts-thin-sp>30<viv-ts-thin-sp></viv-ts-thin-sp>日間ハンズオン教材',
      },
      {
        title: 'Day 17: マイタスクページ（自分のタスク一覧）を作ろう',
        markup:
          'Day 17: マイタスクページ<viv-ts-open><viv-ts-inner>（</viv-ts-inner></viv-ts-open>自分のタスク一覧<viv-ts-close><viv-ts-inner>）</viv-ts-inner></viv-ts-close>を作ろう',
      },
      {
        title: '学びのロードマップ（30日カリキュラム全体像）',
        markup:
          '学びのロードマップ<viv-ts-open><viv-ts-inner>（</viv-ts-inner></viv-ts-open>30<viv-ts-thin-sp></viv-ts-thin-sp>日カリキュラム全体像<viv-ts-close><viv-ts-inner>）</viv-ts-inner></viv-ts-close>',
      },
    ];
    for (const known of knownEngineTitles) {
      const converted = await run(pageMarkup(titleMarkup(known.markup)), known.title);
      const titleInventory = converted.inventory.find((item) => item.role === 'title');
      assert.equal(converted.status, 'pass');
      assert.equal(converted.page_body_geometry_equal, true);
      assert.deepEqual(converted.remainingMarginText, ['', '']);
      assert.equal(titleInventory.character_rects.length, [...known.title].length);
      assert.equal(titleInventory.coordinate_space, 'physical_page_css_px_v1');
      assert.equal(
        titleInventory.outline_path_count,
        [...known.title].filter((character) => map.glyphs[character].path.length > 0).length,
      );
      assert.ok(
        titleInventory.character_rects.every(
          (item) =>
            Math.abs(
              item.page_local_rect.top - titleInventory.character_rects[0].page_local_rect.top,
            ) <= 0.01 && Number.isFinite(item.global_rect.top),
        ),
      );
    }
    await assert.rejects(() => run(pageMarkup(), '未登録タイトル'), /未登録/);
    await assert.rejects(() => run(pageMarkup(titleMarkup(), folioMarkup('2'))), /folio|不一致/);
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup(),
            folioMarkup(),
            '<div class="margin" data-vivliostyle-page-margin-box="left-middle">extra</div>',
          ),
        ),
      /2件/,
    );
    await assert.rejects(
      () => run(pageMarkup('<span style="font-weight:700">さらなる学習のために</span>')),
      /source node構造|unsupported margin font/,
    );
    await assert.rejects(
      () => run(pageMarkup('<span style="writing-mode:vertical-rl">さらなる学習のために</span>')),
      /source node構造|unsupported margin font/,
    );
    await assert.rejects(() => run(pageMarkup(titleMarkup(`${title}※`))), /title不一致/);
    await assert.rejects(
      () => run(pageMarkup(`<span style=""><span>${title}</span></span>`)),
      /未知の装飾node/,
    );
    await assert.rejects(
      () => run(pageMarkup(`<span style="">${title}<svg aria-hidden="true"></svg></span>`)),
      /未知の装飾node/,
    );
    await assert.rejects(
      () => run(pageMarkup(`<span style="">${title}<span hidden></span></span>`)),
      /未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup('Day 03: GitHub<viv-ts-thin-sp class="bad"></viv-ts-thin-sp>に保存する'),
          ),
          'Day 03: GitHubに保存する',
        ),
      /未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(titleMarkup('Day 03: GitHub<viv-ts-thin-sp>x</viv-ts-thin-sp>に保存する')),
          'Day 03: GitHubに保存する',
        ),
      /title不一致|未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup('Day 03: GitHub<viv-ts-thin-sp><span></span></viv-ts-thin-sp>に保存する'),
          ),
          'Day 03: GitHubに保存する',
        ),
      /未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(titleMarkup('Day 03: GitH<viv-ts-thin-sp></viv-ts-thin-sp>ubに保存する')),
          'Day 03: GitHubに保存する',
        ),
      /未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup(
              'Day 03: GitHub<viv-ts-thin-sp></viv-ts-thin-sp><viv-ts-thin-sp></viv-ts-thin-sp>に保存する',
            ),
          ),
          'Day 03: GitHubに保存する',
        ),
      /未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup('Day 03: GitHub<viv-ts-thin-sp></viv-ts-thin-sp>に保存する'),
            folioMarkup(),
            '<style>viv-ts-thin-sp::after{content:"x"}</style>',
          ),
          'Day 03: GitHubに保存する',
        ),
      /未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup('Day 03: GitHub<viv-ts-thin-sp></viv-ts-thin-sp>に保存する'),
            folioMarkup(),
            '<style>viv-ts-thin-sp::after{font-family:serif}</style>',
          ),
          'Day 03: GitHubに保存する',
        ),
      /未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup('Day 03: GitHub<viv-ts-thin-sp></viv-ts-thin-sp>に保存する'),
            folioMarkup(),
            '<style>viv-ts-thin-sp::after{letter-spacing:0}</style>',
          ),
          'Day 03: GitHubに保存する',
        ),
      /未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup(
              'Day 17: マイタスクページ<viv-ts-close><viv-ts-inner>（</viv-ts-inner></viv-ts-close>自分のタスク一覧<viv-ts-open><viv-ts-inner>）</viv-ts-inner></viv-ts-open>を作ろう',
            ),
          ),
          'Day 17: マイタスクページ（自分のタスク一覧）を作ろう',
        ),
      /未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup(
              'Day 17: マイタスクページ<viv-ts-open class="bad"><viv-ts-inner>（</viv-ts-inner></viv-ts-open>自分のタスク一覧<viv-ts-close><viv-ts-inner>）</viv-ts-inner></viv-ts-close>を作ろう',
            ),
          ),
          'Day 17: マイタスクページ（自分のタスク一覧）を作ろう',
        ),
      /未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup(
              'Day 17: マイタスクページ<viv-ts-open><viv-ts-inner>（</viv-ts-inner><span></span></viv-ts-open>自分のタスク一覧<viv-ts-close><viv-ts-inner>）</viv-ts-inner></viv-ts-close>を作ろう',
            ),
          ),
          'Day 17: マイタスクページ（自分のタスク一覧）を作ろう',
        ),
      /未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup(
              'Day 17: マイタスクページ<viv-ts-open>（</viv-ts-open>自分のタスク一覧<viv-ts-close><viv-ts-inner>）</viv-ts-inner></viv-ts-close>を作ろう',
            ),
          ),
          'Day 17: マイタスクページ（自分のタスク一覧）を作ろう',
        ),
      /未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup(
              'Day 17: マイタスクページ<viv-ts-open><viv-ts-inner>）</viv-ts-inner></viv-ts-open>自分のタスク一覧<viv-ts-close><viv-ts-inner>）</viv-ts-inner></viv-ts-close>を作ろう',
            ),
          ),
          'Day 17: マイタスクページ（自分のタスク一覧）を作ろう',
        ),
      /title不一致|未知の装飾node/,
    );
    await assert.rejects(
      () =>
        run(
          pageMarkup(
            titleMarkup(),
            folioMarkup(),
            '<style>.top>span{display:inline-block;width:8px}</style>',
          ),
        ),
      /未知の装飾node|単一行|bounds/,
    );
  } finally {
    await browser.close();
    for (const file of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory, file));
    fs.rmdirSync(directory);
  }
});
