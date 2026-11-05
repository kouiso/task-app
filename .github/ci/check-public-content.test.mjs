import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildComment,
  loadRules,
  markerFor,
  scanText,
  targetKeyFor,
} from './check-public-content.mjs';

const rulesPath = fileURLToPath(new URL('../public-content-rules.json', import.meta.url));
const config = loadRules(rulesPath);

const ids = (result) => result.violations.map((v) => v.id);

test('rules: 設定ファイルが読めて全規則がコンパイルできる', () => {
  assert.ok(config.rules.length >= 5);
});

test('secrets: APIキー代入・既知トークン・秘密鍵で赤', () => {
  const r1 = scanText('API_KEY = "abcdef1234567890abcdef"', config);
  assert.equal(r1.ok, false);
  assert.ok(ids(r1).includes('secret-assignment'));

  const r2 = scanText('token: ghp_1234567890abcdefghij1234567890', config);
  assert.ok(ids(r2).includes('secret-known-token'));

  const r3 = scanText('-----BEGIN RSA PRIVATE KEY-----\nMII...', config);
  assert.ok(ids(r3).includes('secret-known-token'));

  const r4 = scanText('password = "S3cretP@ssw0rd!"', config);
  assert.ok(ids(r4).includes('secret-assignment'));
});

test('db: 接続文字列とホスト+パスワードで赤', () => {
  const r1 = scanText('本番は postgres://user:pass@db.internal:5432/app です', config);
  assert.ok(ids(r1).includes('db-connection-string'));

  const r2 = scanText('mongodb+srv://admin:pw@cluster0.example.net/db', config);
  assert.ok(ids(r2).includes('db-connection-string'));

  const r3 = scanText('host=db.example.internal password=hunter2xx', config);
  assert.ok(ids(r3).includes('db-host-password'));
});

test('email: フリーメールは赤、組織ドメインとプレースホルダは緑', () => {
  const r1 = scanText('連絡先は foo.bar@gmail.com です', config);
  assert.ok(ids(r1).includes('personal-email'));

  const r2 = scanText('担当: isogai@ritmo.co.jp / user@example.com', config);
  assert.equal(r2.ok, true);
});

test('customer: 金額だけでは緑、社名・氏名と並ぶと赤', () => {
  assert.equal(scanText('予算は300万円を見ている。', config).ok, true);
  assert.equal(scanText('単価は1,000円です。', config).ok, true);

  const r1 = scanText('株式会社サンプルに300万円を請求した。', config);
  assert.ok(ids(r1).includes('customer-amount'));

  const r2 = scanText('山田さんに50万円を支払う契約。', config);
  assert.ok(ids(r2).includes('customer-amount'));
});

test('attack: 典型的な悪用パターンで赤', () => {
  const r1 = scanText("' OR '1'='1' -- を入れると抜ける", config);
  assert.ok(ids(r1).includes('attack-pattern'));
  const r2 = scanText('UNION SELECT password FROM users', config);
  assert.ok(ids(r2).includes('attack-pattern'));
});

test('banned: customBannedWords の語で赤', () => {
  const custom = { ...config, customBannedWords: ['極秘プロジェクトX'] };
  const r = scanText('この件は極秘プロジェクトXに関係する', custom);
  assert.ok(ids(r).includes('custom-banned-word'));
  assert.equal(scanText('この件は無関係の話題', custom).ok, true);
});

test('clean: 普通の文章は緑', () => {
  const body = [
    '## 概要',
    'タスクの並び替えができない不具合を直します。',
    '再現手順はドラッグしてドロップするだけです。',
    'localhost:5432 のローカルDBで確認しました。',
  ].join('\n');
  const r = scanText(body, config);
  assert.equal(r.ok, true, JSON.stringify(r.violations));
});

test('lines: 検出行番号が正しい', () => {
  const body = '1行目は問題なし\nAPI_KEY="abcdef1234567890"\n3行目も問題なし';
  const r = scanText(body, config);
  const v = r.violations.find((x) => x.id === 'secret-assignment');
  assert.deepEqual(v.lines, [2]);
  assert.equal(v.count, 1);
});

test('leak: 結果とコメントに当たった文字列そのものを含まない', () => {
  const secret = 'ghp_sekretTokenValue1234567890abcd';
  const body = `見て: ${secret}`;
  const r = scanText(body, config);
  assert.equal(r.ok, false);
  const comment = buildComment(r, 'issue 本文', 'body');
  assert.ok(!JSON.stringify(r).includes(secret));
  assert.ok(!comment.includes(secret));
  assert.ok(comment.includes(markerFor('body')));
  assert.ok(comment.includes('1行目'));
});

test('buildComment: OK時は「検出されませんでした」で目印つき', () => {
  const c = buildComment(scanText('問題なし', config), 'コメント', 'comment-99');
  assert.ok(c.includes(markerFor('comment-99')));
  assert.ok(c.includes('✅'));
});

test('targetKeyFor: 対象ごとに別キーになる', () => {
  assert.equal(targetKeyFor('issues', { issue: { number: 1 } }), 'body');
  assert.equal(targetKeyFor('pull_request', {}), 'body');
  assert.equal(targetKeyFor('issue_comment', { comment: { id: 7 } }), 'comment-7');
  assert.equal(targetKeyFor('pull_request_review', { review: { id: 9 } }), 'review-9');
  assert.equal(targetKeyFor('pull_request_review_comment', { comment: { id: 11 } }), 'comment-11');
});
