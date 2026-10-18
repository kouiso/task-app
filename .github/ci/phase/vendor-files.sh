#!/usr/bin/env bash
echo "::group::hana652/Xamfonosの中身が実在するか確認"
fail=0
for dir in \
  ".claude/skills/material-writing/hana652-tech-writing-pack" \
  ".claude/skills/material-writing/xamfonos-technical-writing-best-practices"; do
  if [ ! -d "$dir" ]; then
    echo "::error::$dir が存在しません"
    fail=1
    continue
  fi
  count=$(find "$dir" -type f | wc -l)
  if [ "$count" -lt 1 ]; then
    echo "::error::$dir が空です(未初期化submoduleと同じ症状)。ファイルが直接コピーされているか確認してください。"
    fail=1
  else
    echo "OK: $dir ($count ファイル)"
  fi
done
if [ "$fail" -eq 1 ]; then
  exit 1
fi
echo "::endgroup::"
