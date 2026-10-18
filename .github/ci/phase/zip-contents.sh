#!/usr/bin/env bash
echo "=== ZIP Contents ==="
# grep の早期終了で unzip が SIGPIPE にならないよう一覧を最後まで取得する。
listing=$(mktemp)
trap 'rm -f -- "$listing"' EXIT
unzip -l dist/task-app.zip > "$listing"
cat "$listing"

# 必須ファイルの存在確認
echo ""
echo "=== Verifying required files ==="
grep -q "package.json" "$listing" || { echo "❌ package.json missing"; exit 1; }
grep -q ".env.example" "$listing" || { echo "❌ .env.example missing"; exit 1; }
grep -q "tsconfig.json" "$listing" || { echo "❌ tsconfig.json missing"; exit 1; }
echo "✅ All required files present"

# 除外すべきファイルが含まれていないことを確認
echo ""
echo "=== Verifying excluded files ==="
if grep -q "node_modules/" "$listing"; then
  echo "❌ node_modules should be excluded"
  exit 1
fi
if grep -q ".git/" "$listing"; then
  echo "❌ .git should be excluded"
  exit 1
fi
echo "✅ Excluded files properly excluded"
