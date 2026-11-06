// check-writing.mjs — issue / PR 本文の必須見出しチェック。
// 公開リポの GitHub Actions から呼ぶ。AI・外部サービス・追加の認証情報は使わず、
// 文字の規則だけで判定する。コメント文言もここに置いてワークフローから再利用する。
//
// 使い方:
//   CHECK_BODY="..." node .github/ci/check-writing.mjs --kind issue --result out.json
//   node .github/ci/check-writing.mjs --kind pr --body-file body.md --result out.json
// 結果 JSON を --result に書き、不足があれば exit 1、揃っていれば exit 0。

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { argv, env, exit, stdout } from 'node:process';
import { pathToFileURL } from 'node:url';

export const ISSUE_SECTIONS = ['背景', '今どこまで', '次にやること', '誰の判断待ち', '完了条件'];
export const PR_SECTIONS = ['概要', '変更内容', '関連Issue'];
// GitHub が issue を閉じるキーワードと Refs を許容する。issue 要件は Closes / Refs だが、
// 同義の close キーワードで引っかからないようにして「直しても緑にならない」を防ぐ
export const PR_ISSUE_LINK = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|refs?)\s*#\d+/i;
export const COMMENT_MARKER = '<!-- task-app-writing-check -->';

const ATX_HEADING = /^#{1,6}\s+(.*?)\s*#*\s*$/;
const BOLD_HEADING = /^(?:\*\*|__)(.+?)(?:\*\*|__)\s*$/;
const FENCE = /^\s*```/;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const EMPTY_BULLET = /^[-*+•・]\s*(?:\[[ xX]\])?\s*$/;

// 本文を見出し区切りに分解する。`## 背景` のほか `**背景**` だけの行も見出し扱いする。
// コードフェンス内の「##」は見出しにしない（本文に貼ったコード例で誤検出しないため）。
export function parseSections(body) {
  const sections = [];
  let current = null;
  let inFence = false;
  for (const line of String(body ?? '').split(/\r?\n/)) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      if (current) current.lines.push(line);
      continue;
    }
    if (inFence) {
      if (current) current.lines.push(line);
      continue;
    }
    const atx = line.match(ATX_HEADING);
    const bold = atx ? null : line.match(BOLD_HEADING);
    const title = (atx ? atx[1] : (bold?.[1] ?? '')).trim();
    if (title) {
      current = { title, lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return sections;
}

// 中身があるか。HTMLコメント・空行・「-」や空チェックボックスだけの行は未記入として数えない。
export function sectionContentIsFilled(section) {
  const text = section.lines.join('\n').replace(HTML_COMMENT, '');
  return text.split('\n').some((line) => line.trim() !== '' && !EMPTY_BULLET.test(line.trim()));
}

// kind: 'issue' | 'pr'
// 戻り値: { ok, kind, problems: [{ section, reason: 'missing'|'empty'|'no-link' }] }
export function checkBody(kind, body) {
  const required = kind === 'pr' ? PR_SECTIONS : ISSUE_SECTIONS;
  const sections = parseSections(body);
  const problems = [];
  for (const name of required) {
    const found = sections.find((s) => s.title.includes(name));
    if (!found) {
      problems.push({ section: name, reason: 'missing' });
      continue;
    }
    if (!sectionContentIsFilled(found)) {
      problems.push({ section: name, reason: 'empty' });
      continue;
    }
    if (kind === 'pr' && name === '関連Issue' && !PR_ISSUE_LINK.test(found.lines.join('\n'))) {
      problems.push({ section: name, reason: 'no-link' });
    }
  }
  return { ok: problems.length === 0, kind, problems };
}

// 目印つきコメントの本文。ワークフローはこの文字列を1コメントに作る/更新する。
export function buildComment(result) {
  const label = result.kind === 'pr' ? 'PR' : 'issue';
  if (result.ok) {
    return `${COMMENT_MARKER}\n✅ 書き方チェック（${label}本文）: 必須項目はすべて記入されています。`;
  }
  const items = result.problems.map((p) => {
    if (p.reason === 'missing') return `- 見出し「${p.section}」がありません`;
    if (p.reason === 'empty') {
      return `- 見出し「${p.section}」に中身がありません（「-」やコメントだけは未記入として扱います）`;
    }
    return `- 「${p.section}」に \`Closes #番号\` または \`Refs #番号\` の記載がありません`;
  });
  return [
    COMMENT_MARKER,
    `### 📝 書き方チェック（${label}本文）`,
    '',
    '必須項目が不足しています。本文を直すとこのコメントは自動で更新されます。',
    '',
    ...items,
  ].join('\n');
}

function parseArgs(args) {
  const parsed = { kind: null, result: null, bodyFile: null };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--kind') parsed.kind = args[++i];
    else if (args[i] === '--result') parsed.result = args[++i];
    else if (args[i] === '--body-file') parsed.bodyFile = args[++i];
    else if (args[i].startsWith('--kind=')) parsed.kind = args[i].slice('--kind='.length);
    else if (args[i].startsWith('--result=')) parsed.result = args[i].slice('--result='.length);
    else if (args[i].startsWith('--body-file='))
      parsed.bodyFile = args[i].slice('--body-file='.length);
  }
  return parsed;
}

const isMain = argv[1] && import.meta.url === pathToFileURL(resolve(argv[1])).href;
if (isMain) {
  const args = parseArgs(argv.slice(2));
  if (args.kind !== 'issue' && args.kind !== 'pr') {
    stdout.write('usage: check-writing.mjs --kind issue|pr [--result out.json] [--body-file f]\n');
    exit(2);
  }
  // 本文は env 経由で受け取る。シェル展開や改行の問題を避けるため引数には乗せない
  const body = args.bodyFile ? readFileSync(args.bodyFile, 'utf8') : (env.CHECK_BODY ?? '');
  const result = checkBody(args.kind, body);
  if (args.result) writeFileSync(args.result, `${JSON.stringify(result, null, 2)}\n`);
  stdout.write(
    result.ok
      ? 'writing check: ok\n'
      : `writing check: ${result.problems.map((p) => `${p.section}(${p.reason})`).join(', ')}\n`,
  );
  exit(result.ok ? 0 : 1);
}
