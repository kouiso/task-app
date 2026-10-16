#!/usr/bin/env bash
echo "::group::.gitmodules に material-writing 配下のsubmoduleが無いか確認"
if grep -q '.claude/skills/material-writing/' .gitmodules 2>/dev/null; then
  echo "::error::.gitmodules に .claude/skills/material-writing/ 配下のsubmoduleエントリが検出されました。"
  echo "hana652/Xamfonosはsubmodule未初期化による誤読バグ(2026-07-14)を受けてvendoring(直接埋め込み)に統一済みです。"
  echo "submoduleへ戻さず、ファイルを直接コピーしてください。詳細: .claude/skills/material-writing/references/ATTRIBUTION.md"
  cat .gitmodules
  exit 1
fi
echo "OK: .gitmodules に material-writing 配下のsubmoduleは無い"
echo "::endgroup::"
