// check-public-content.mjs — issue・PR・コメント本文の公開内容チェック。
// 公開リポの GitHub Actions から呼ぶ。AI・外部サービス・追加の認証情報は使わず、
// .github/public-content-rules.json の正規表現規則だけで判定する。
// 規則の語彙追加は JSON 側に足すだけでよい（依頼元の禁止語は customBannedWords）。
//
// 使い方:
//   CHECK_BODY="..." node .github/ci/check-public-content.mjs --result out.json
//   node .github/ci/check-public-content.mjs --rules rules.json --body-file b.md --result out.json
// 結果 JSON を --result に書き、検出があれば exit 1、無ければ exit 0。
// 出力・コメントには規則名・行番号・件数だけを書き、当たった文字列そのものは書かない。

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { argv, env, exit, stdout } from 'node:process';
import { pathToFileURL } from 'node:url';

export const COMMENT_MARKER = '<!-- task-app-public-content-check';
export const DEFAULT_RULES_PATH = '.github/public-content-rules.json';

// イベント名ごとの対象表示。コメント本文の検査は「どのコメントか」が分かるよう login を外側で付ける
export const TARGET_LABELS = {
  issues: 'issue 本文',
  pull_request: 'PR 本文',
  issue_comment: 'コメント',
  pull_request_review: 'レビュー',
  pull_request_review_comment: 'レビュー差分コメント',
};

// 目印の末尾に対象キーを付けて別コメントにする（コメント単位で赤/緑を持てるように）
export function markerFor(targetKey) {
  return `${COMMENT_MARKER}:${targetKey} -->`;
}

export function targetKeyFor(eventName, payload) {
  if (eventName === 'issue_comment' || eventName === 'pull_request_review_comment') {
    return `comment-${payload?.comment?.id ?? 'unknown'}`;
  }
  if (eventName === 'pull_request_review') {
    return `review-${payload?.review?.id ?? 'unknown'}`;
  }
  return 'body';
}

export function loadRules(rulesPath) {
  const config = JSON.parse(readFileSync(rulesPath, 'utf8'));
  if (!Array.isArray(config.rules)) {
    throw new Error(`rules file has no "rules" array: ${rulesPath}`);
  }
  for (const rule of config.rules) {
    if (!rule.id || !rule.label || !rule.pattern) {
      throw new Error(`rule is missing id/label/pattern: ${JSON.stringify(rule)}`);
    }
    // 起動時にコンパイルして壊れた正規表現を即座に失敗させる
    new RegExp(rule.pattern, rule.flags ?? '');
    if (rule.pattern2) new RegExp(rule.pattern2, rule.flags ?? '');
  }
  return config;
}

function domainAllowed(domain, allowedDomains) {
  const d = domain.toLowerCase();
  return allowedDomains.some((a) => d === a || d.endsWith(`.${a}`));
}

// 戻り値: { ok, violations: [{ id, label, count, lines:[1,...] }] }
// matched 文字列は戻り値に入れない。コメントに出す情報は規則名・行番号・件数のみ
export function scanText(text, config) {
  const lines = String(text ?? '').split(/\r?\n/);
  const compiled = config.rules.map((rule) => ({
    ...rule,
    re: new RegExp(
      rule.pattern,
      rule.type === 'email' ? `${rule.flags ?? ''}g` : (rule.flags ?? ''),
    ),
    re2: rule.pattern2 ? new RegExp(rule.pattern2, rule.flags ?? '') : null,
  }));
  const found = new Map();
  const add = (rule, lineNo) => {
    if (!found.has(rule.id)) found.set(rule.id, { label: rule.label, lines: new Set() });
    found.get(rule.id).lines.add(lineNo);
  };
  const banned = (config.customBannedWords ?? []).filter((w) => typeof w === 'string' && w !== '');

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    for (const rule of compiled) {
      if (rule.type === 'email') {
        rule.re.lastIndex = 0;
        for (let m = rule.re.exec(line); m !== null; m = rule.re.exec(line)) {
          if (!domainAllowed(m[1] ?? '', config.allowedEmailDomains ?? [])) {
            add(rule, lineNo);
            break;
          }
        }
        continue;
      }
      // pattern2 がある規則は同一行に両方ある時だけ検出（顧客名+金額の並び判定用）
      if (rule.re.test(line) && (!rule.re2 || rule.re2.test(line))) add(rule, lineNo);
    }
    for (const word of banned) {
      if (line.includes(word)) {
        add({ id: 'custom-banned-word', label: '依頼元指定の禁止語' }, lineNo);
        break;
      }
    }
  });

  const violations = [...found.entries()].map(([id, v]) => ({
    id,
    label: v.label,
    count: v.lines.size,
    lines: [...v.lines].sort((a, b) => a - b),
  }));
  return { ok: violations.length === 0, violations };
}

// 目印つきコメントの本文。当たった文字列そのものは書かない（公開リポで増殖させないため）
export function buildComment(result, targetLabel = '本文', targetKey = 'body') {
  const marker = markerFor(targetKey);
  if (result.ok) {
    return `${marker}\n✅ 公開内容チェック（${targetLabel}）: 問題は検出されませんでした。`;
  }
  const items = result.violations.map((v) => {
    const shown = v.lines
      .slice(0, 5)
      .map((n) => `${n}行目`)
      .join('、');
    const rest = v.lines.length > 5 ? ` 他${v.lines.length - 5}箇所` : '';
    return `- ${v.label}: ${v.count}件（${shown}${rest}付近）`;
  });
  return [
    marker,
    `### ⚠️ 公開内容チェック（${targetLabel}）`,
    '',
    '公開できない可能性のある記述を検出しました（該当の文字列そのものは記載しません）。',
    '内容を確認して修正してください。直すとこのコメントは自動で更新されます。',
    '',
    ...items,
  ].join('\n');
}

function parseArgs(args) {
  const parsed = { rules: DEFAULT_RULES_PATH, result: null, bodyFile: null };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--rules') parsed.rules = args[++i];
    else if (args[i] === '--result') parsed.result = args[++i];
    else if (args[i] === '--body-file') parsed.bodyFile = args[++i];
    else if (args[i].startsWith('--rules=')) parsed.rules = args[i].slice('--rules='.length);
    else if (args[i].startsWith('--result=')) parsed.result = args[i].slice('--result='.length);
    else if (args[i].startsWith('--body-file='))
      parsed.bodyFile = args[i].slice('--body-file='.length);
  }
  return parsed;
}

const isMain = argv[1] && import.meta.url === pathToFileURL(resolve(argv[1])).href;
if (isMain) {
  const args = parseArgs(argv.slice(2));
  const config = loadRules(args.rules);
  const body = args.bodyFile ? readFileSync(args.bodyFile, 'utf8') : (env.CHECK_BODY ?? '');
  const result = scanText(body, config);
  if (args.result) writeFileSync(args.result, `${JSON.stringify(result, null, 2)}\n`);
  stdout.write(
    result.ok
      ? 'public content check: ok\n'
      : `public content check: ${result.violations.map((v) => `${v.id}x${v.count}`).join(', ')}\n`,
  );
  exit(result.ok ? 0 : 1);
}
