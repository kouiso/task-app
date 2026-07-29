#!/bin/bash
# material-writing-gate.sh
# PreToolUse hook (matcher: Write|Edit|Bash): 文体スペックを読まずに教材へ書くのを止める。
#
# WHY: 同じディレクトリの material-writing-reminder.sh は、自分でも書いているとおり
#   「書いた後に届く安全網」である。PreToolUse の additionalContext はツール結果の隣に
#   届くので、モデルは書いてから読む。外部レビューで指摘された「AIっぽい・翻訳文みたい」は
#   書く前に効く機構が無いことが原因で、注意の払い方では止まらない。
#   ここは permissionDecision で書き込みそのものを拒否する。
#
# Bash も見る理由: Write/Edit だけを塞いでも、python3 や printf で同じファイルへ書ける。
#   実際にこのリポジトリでは python3 のワンライナーで教材を一括置換した実績がある。
#   塞いだつもりで一番使う抜け道が空いている状態は、無いより悪い。
#   書き込み手段を列挙する方式は取らない。node -e や自作スクリプトのように名前を
#   挙げきれない経路があり、列挙は必ず漏れる。教材のパスに触れるコマンドは既定で
#   拒否し、明らかに読むだけの入り口だけを通す。
#
# 判定材料は material-writing-skill-marker.sh がセッションIDごとに置く印だけ。
# 印が無ければ deny する。逃げ道は「スキルを読む」1つだけなので、詰まることはない。
#
# 対象はこのリポジトリの material/ 配下の .md だけ。他の場所は常に通す。
# 緊急停止: リポジトリ直下に .claude/disable-material-writing-gate を作る。
#   これはチェックアウト単位で効く。同じチェックアウトの他セッションにも効くので、
#   置いたら用が済み次第すぐ消すこと。
#
# 契約: 判定できない場合（jq が無い、payload が壊れている、対象外パス）は exit 0。
#   deny するのは「対象パス かつ 印が無い」と確定したときだけ。
#
# ROLLBACK: .claude/hooks/rollback-material-writing-gate.md を参照。

set -uo pipefail

INPUT="$(cat 2>/dev/null || true)"
[[ -n "$INPUT" ]] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

# リポジトリの実体。ここを基準に「このリポジトリの material/」を決める。
# 以前は CLAUDE_PROJECT_DIR に task-app が含まれるかで判定していたが、
# 別名でチェックアウトすると黙って無効になり、/tmp/material/notes.md のような
# 無関係なパスまで拾っていた（codex 指摘）。
ROOT="${CLAUDE_PROJECT_DIR:-}"
[[ -n "$ROOT" ]] || exit 0
[[ -d "$ROOT/material/30days-curriculum" ]] || exit 0
[[ -f "$ROOT/.claude/disable-material-writing-gate" ]] && exit 0

TOOL="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)"

# 教材本文にあたるか。監査記録・スクリプト・設定は文体スペックの管轄外なので通す。
is_material() {
  local f="$1"
  [[ "$f" == *.md ]] || return 1
  case "$f" in
    "$ROOT"/material/*) return 0 ;;
    material/*) return 0 ;;
    ./material/*) return 0 ;;
  esac
  return 1
}

TARGETED=0
case "$TOOL" in
  Write|Edit|NotebookEdit)
    FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
    [[ -n "$FILE_PATH" ]] || exit 0
    is_material "$FILE_PATH" && TARGETED=1
    ;;
  Bash)
    CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"
    [[ -n "$CMD" ]] || exit 0
    # 教材のパスに触れていなければ関係ない。
    if printf '%s' "$CMD" | grep -qE '(^|[^A-Za-z0-9_/.-])(\./)?material/[^ "'"'"']*\.md|'"$ROOT"'/material/[^ "'"'"']*\.md|material/30days-curriculum'; then
      # 書き込みの手段を列挙する方式はやめた。node -e や自作スクリプトのように
      # 名前を挙げきれない経路がいくらでもあり、列挙は必ず漏れる（codex 指摘）。
      # 既定を拒否にして、明らかに読むだけの入り口だけを通す。
      # 誤って止めても逃げ道は「スキルを読む」1つなので、漏れるより厳しい側へ倒す。
      FIRST="$(printf '%s' "$CMD" | sed -E 's/^[[:space:]]*//; s/^\(//; s/^[A-Za-z_][A-Za-z0-9_]*=[^ ]*[[:space:]]+//' | awk '{print $1}' | xargs -n1 basename 2>/dev/null || true)"
      READONLY=0
      case "$FIRST" in
        grep|rg|egrep|fgrep|cat|head|tail|less|more|wc|ls|find|file|stat|diff|git|md5|md5sum|shasum|sha256sum|awk|cut|sort|uniq|nl|column)
          READONLY=1 ;;
      esac
      # リダイレクトがあれば読むだけではない。sed の上書きも同じ。
      if printf '%s' "$CMD" | grep -qE '>|\btee\b|\bsed\b[^|]*-i'; then
        READONLY=0
      fi
      [[ "$READONLY" -eq 1 ]] || TARGETED=1
    fi
    ;;
  *)
    exit 0
    ;;
esac

[[ "$TARGETED" -eq 1 ]] || exit 0

SESSION="$(printf '%s' "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || true)"
# セッションIDが取れない＝判定材料が無い。ここで deny すると復旧手段まで塞ぐので通す。
[[ -n "$SESSION" ]] || exit 0

# 印の置き場は実行ユーザーごとに分ける。共有ホストで /tmp を使うと、
# 先に作った利用者の 0755 ディレクトリへ後の利用者が書けない（codex 指摘）。
MARKER_DIR="${TMPDIR:-/tmp}/task-app-material-writing-loaded-$(id -u)"
[[ -f "$MARKER_DIR/$SESSION" ]] && exit 0

REASON='教材ファイルへの書き込みを止めました。

このセッションはまだ .claude/skills/material-writing を読み込んでいません。
外部レビューで指摘された「AIっぽい・翻訳文みたい」は、書いたあとに直すのでは
戻らないため、書く前に文体スペックを通す必要があります。

次の1手: Skill ツールで material-writing を読み込んでから、同じ操作をやり直してください。

対象はこのリポジトリの material/ 配下の .md だけです。監査記録・スクリプト・設定は
影響を受けません。Write/Edit だけでなく、シェル経由の書き込みも同じ扱いです。
緊急停止が要る場合は .claude/disable-material-writing-gate を作ってください
（同じチェックアウトの他セッションにも効くので、用が済んだら消してください）。'

jq -n --arg reason "$REASON" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'

exit 0
