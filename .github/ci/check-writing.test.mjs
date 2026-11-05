import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildComment,
  checkBody,
  COMMENT_MARKER,
  parseSections,
  sectionContentIsFilled,
} from './check-writing.mjs';

const goodIssue = [
  '## 背景',
  '公開リポで公開内容を書きすぎる事故を防ぎたい。',
  '## 今どこまで',
  '見出し修正は入っている。',
  '## 次にやること',
  'チェックを入れる。',
  '## 誰の判断待ち',
  'オーナーのマージ判断。',
  '## 完了条件',
  'PR が入って緑になること。',
].join('\n');

test('issue: 必須見出し5つに中身があれば ok', () => {
  const r = checkBody('issue', goodIssue);
  assert.equal(r.ok, true);
  assert.deepEqual(r.problems, []);
});

test('issue: 見出しが無いと missing', () => {
  const r = checkBody(
    'issue',
    goodIssue.replace('## 完了条件\nPR が入って緑になること。', ''),
  );
  assert.equal(r.ok, false);
  assert.deepEqual(r.problems, [{ section: '完了条件', reason: 'missing' }]);
});

test('issue: 見出しだけで中身が無いと empty', () => {
  const body = goodIssue.replace('公開リポで公開内容を書きすぎる事故を防ぎたい。', '');
  const r = checkBody('issue', body);
  assert.equal(r.ok, false);
  assert.deepEqual(r.problems, [{ section: '背景', reason: 'empty' }]);
});

test('issue: 「-」や空チェックボックスだけの節は未記入(empty)', () => {
  const body = goodIssue.replace(
    '公開リポで公開内容を書きすぎる事故を防ぎたい。',
    '-\n- [ ]\n*',
  );
  const r = checkBody('issue', body);
  assert.equal(r.ok, false);
  assert.deepEqual(r.problems, [{ section: '背景', reason: 'empty' }]);
});

test('issue: HTMLコメントだけの節は未記入(empty)', () => {
  const body = goodIssue.replace(
    '公開リポで公開内容を書きすぎる事故を防ぎたい。',
    '<!-- ここに書いてください -->',
  );
  const r = checkBody('issue', body);
  assert.equal(r.ok, false);
  assert.deepEqual(r.problems, [{ section: '背景', reason: 'empty' }]);
});

test('issue: 赤字の本文を直すと緑になる', () => {
  const bad = '## 背景\n理由だけ。\n';
  const before = checkBody('issue', bad);
  assert.equal(before.ok, false);
  assert.equal(before.problems.length, 4);
  const after = checkBody('issue', goodIssue);
  assert.equal(after.ok, true);
});

test('issue: 太字だけの行も見出しとして認める', () => {
  const body = goodIssue.replace('## 背景', '**背景**');
  const r = checkBody('issue', body);
  assert.equal(r.ok, true);
});

test('issue: コードフェンス内の「##」は見出しにしない', () => {
  const body = `${goodIssue}\n\`\`\`text\n## 見せかけの見出し\n\`\`\`\n`;
  const r = checkBody('issue', body);
  assert.equal(r.ok, true);
});

test('issue: 「背景・目的」のように見出し名を含む表記でも認める', () => {
  const body = goodIssue.replace('## 背景', '## 背景・目的');
  const r = checkBody('issue', body);
  assert.equal(r.ok, true);
});

const goodPr = [
  '## 概要',
  '書き方チェックと公開内容チェックを追加する。',
  '## 変更内容',
  '- workflow とスクリプトを追加',
  '## 関連Issue',
  'Refs #722',
].join('\n');

test('pr: 概要/変更内容/関連Issue(Refs) があれば ok', () => {
  const r = checkBody('pr', goodPr);
  assert.equal(r.ok, true);
});

test('pr: Closes #番号 でも ok', () => {
  const r = checkBody('pr', goodPr.replace('Refs #722', 'Closes #722'));
  assert.equal(r.ok, true);
});

test('pr: 関連Issue にリンク記載が無いと no-link', () => {
  const r = checkBody('pr', goodPr.replace('Refs #722', '関連する issue があります'));
  assert.equal(r.ok, false);
  assert.deepEqual(r.problems, [{ section: '関連Issue', reason: 'no-link' }]);
});

test('pr: 変更内容が無いと missing', () => {
  const r = checkBody('pr', goodPr.replace('## 変更内容\n- workflow とスクリプトを追加\n', ''));
  assert.equal(r.ok, false);
  assert.deepEqual(r.problems, [{ section: '変更内容', reason: 'missing' }]);
});

test('pr: 赤字の本文を直すと緑になる', () => {
  const bad = '## 概要\nだけ。\n';
  const before = checkBody('pr', bad);
  assert.equal(before.ok, false);
  const after = checkBody('pr', goodPr);
  assert.equal(after.ok, true);
});

test('buildComment: 不足時は指摘行、OK時は「OK」相当、どちらも目印を含む', () => {
  const bad = checkBody('pr', '## 概要\nだけ。\n');
  const ngComment = buildComment(bad);
  assert.ok(ngComment.startsWith(COMMENT_MARKER));
  assert.ok(ngComment.includes('変更内容'));
  assert.ok(ngComment.includes('関連Issue'));
  const okComment = buildComment(checkBody('pr', goodPr));
  assert.ok(okComment.startsWith(COMMENT_MARKER));
  assert.ok(okComment.includes('✅'));
});

test('parseSections: 見出しと本文行を拾う', () => {
  const sections = parseSections(goodIssue);
  assert.equal(sections.length, 5);
  assert.equal(sections[0].title, '背景');
  assert.ok(sectionContentIsFilled(sections[0]));
});
