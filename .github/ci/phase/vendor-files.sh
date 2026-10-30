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

# hana652 は上流のハッシュに固定して無改変で置いている。ATTRIBUTION.md の一覧と
# 1ファイルずつ突き合わせ、編集・追加・削除のどれでも失敗させる。
echo "::group::hana652 の sha256 照合"
pack=".claude/skills/material-writing/hana652-tech-writing-pack"
attribution=".claude/skills/material-writing/references/ATTRIBUTION.md"
expected=$(mktemp)
actual=$(mktemp)
trap 'rm -f "$expected" "$actual"' EXIT
sed -n '/<!-- BEGIN hana652-sha256 -->/,/<!-- END hana652-sha256 -->/p' "$attribution" \
  | grep -E '^[0-9a-f]{64}  ' | sort -k2 > "$expected"
if [ ! -s "$expected" ]; then
  echo "::error::$attribution に sha256 一覧がありません"
  exit 1
fi
(cd "$pack" && find . -type f | sed 's#^\./##' | sort | xargs -d '\n' sha256sum) | sort -k2 > "$actual"
if ! diff -u "$expected" "$actual"; then
  echo "::error::hana652-tech-writing-pack が ATTRIBUTION.md の一覧と一致しません"
  exit 1
fi
echo "OK: $(wc -l < "$expected") ファイルが一致"
echo "::endgroup::"
