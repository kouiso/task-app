# ROLLBACK: plan-memory-reminder.sh

2026-07-15 の修正をやり直したい/壊れた時の手順。

## このフックは何をするか

`plan-*.md` / `plan_*.md` を Write/Edit した後（PostToolUse）に、MEMORY.md 更新のリマインダを**モデルの文脈へ注入**する。

## 一番速いロールバック（30秒）

```bash
# 方法1: 登録を外す（推奨・確実）
# .claude/settings.json の hooks.PostToolUse から
#   plan-memory-reminder.sh のエントリを削除する

# 方法2: スクリプトを即無効化（設定を触らず殺す）
printf '#!/bin/bash\nexit 0\n' > .claude/hooks/plan-memory-reminder.sh
chmod +x .claude/hooks/plan-memory-reminder.sh
```

**fail-open 設計**（全経路 `exit 0`）なので Write/Edit をブロックしない。ブロックされたなら原因は別のフック。まず `.claude/settings.json` の hooks セクション全体を見ること。

## 2026-07-15 に直したバグ（戻さないこと）

| # | バグ | 症状 | 修正 |
|---|---|---|---|
| 1 | `FILE_PATH="${TOOL_INPUT_file_path:-}"` | Claude Code は stdin に **JSON** で渡すため常に空 → if が成立せず → **一度も発火せず**。登録だけはされており「守られている」という偽の安心を作っていた | `jq -r '.tool_input.file_path // empty'` で stdin から取得 |
| 2 | `echo` で素の stdout へ出力 | `exit 0` 時の素の stdout は**トランスクリプト止まりでモデルに届かない** | `hookSpecificOutput.additionalContext` を JSON で stdout へ |
| 3 | cwd ガードが無かった | 他プロジェクトでも発火しうる | `*task-app*` の部分一致ガード（worktree でも効く） |

## 仕様の裏取り（推測でなく実測・2026-07-15）

**PostToolUse でも additionalContext はモデルに届く**ことを専用プローブで確認済み:

1. プローブ hook が `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"POSTTOOL-CANARY-a4f81c ..."}}` を返す
2. 冷えたセッションに Write させ、「文脈に届いた `POSTTOOL-CANARY-*` を挙げよ」と質問
3. 回答: `POSTTOOL-CANARY-a4f81c` — **見ていない文字列は復唱できない = 注入の証明**

**検証時の落とし穴**: グローバルの `enforce-codex-delegation.sh` が Write をブロックすると、セッションが Bash（`printf` 等）へ迂回する。すると `matcher: "Write"` のこの hook は**発火する機会自体が無い**ため、「届かない」という**偽の否定的結論**が出る。実地検証の前にその干渉を排除すること（override marker 等）。

## 動作確認（dry-run）

```bash
export CLAUDE_PROJECT_DIR="$PWD"
H=./.claude/hooks/plan-memory-reminder.sh

# 1. plan-*.md 絶対パス → 注入される
echo '{"tool_input":{"file_path":"'"$PWD"'/plan-x.md"}}' | $H | jq .
# 2. plan-x.md 相対パス（bare形）→ 注入される
#    実測では Claude Code は常に絶対パスへ正規化するが、契約ではないので両方受ける
echo '{"tool_input":{"file_path":"plan-x.md"}}' | $H | jq .
# 3. 無関係ファイル → 空（負の対照）
echo '{"tool_input":{"file_path":"'"$PWD"'/src/app/page.tsx"}}' | $H
# 4. planning.md（名前にplanを含むが対象外）→ 空
echo '{"tool_input":{"file_path":"planning.md"}}' | $H
# 5. plan-x.txt（拡張子違い）→ 空
echo '{"tool_input":{"file_path":"plan-x.txt"}}' | $H
# 6. 壊れたJSON → fail-open
echo 'garbage' | $H; echo $?   # → 0
```

**Claude Code が渡すパス形式の実測（2026-07-15, v2.1.210）**: 生 stdin をログするプローブ hook で確認したところ、ユーザーが「相対パスで指定して」と頼んだ場合でも `file_path = /private/tmp/pathprobe/plan-x.md` と**絶対パスへ正規化して**渡していた。よって bare 相対パスは実際には来ない。ただしこれは観測された挙動であって文書化された契約ではないため、パターン側で両方受けている（Geminiレビュー指摘 PR#284）。

2026-07-15 に上記＋別プロジェクト／JSON妥当性を含む全ケースを確認済み。同じ相対パス対応を `material-writing-reminder.sh` にも横展開済み（`material/*` 形も受ける。`materials/x.md` のような別ディレクトリは無音になることも確認）。

## 要件

- Claude Code **v2.1.9+**（`additionalContext` 対応）
- `jq`（無ければ fail-open で何もしない）

## 関連

- 同型バグの先行事例: `.claude/hooks/rollback-material-writing-reminder.md`（PR #282 で修正済み）。
  そちらは PreToolUse で、additionalContext が**書き込みの後**に届くという追加の限界がある。
  こちらは元から PostToolUse なので「後に届く」で意図どおり。
