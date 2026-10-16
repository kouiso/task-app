#!/usr/bin/env bash
echo "=== ZIP Contents ==="
unzip -l dist/task-app.zip

# 必須ファイルの存在確認
echo ""
echo "=== Verifying required files ==="
unzip -l dist/task-app.zip | grep -q "package.json" || { echo "❌ package.json missing"; exit 1; }
unzip -l dist/task-app.zip | grep -q ".env.example" || { echo "❌ .env.example missing"; exit 1; }
unzip -l dist/task-app.zip | grep -q "tsconfig.json" || { echo "❌ tsconfig.json missing"; exit 1; }
echo "✅ All required files present"

# 除外すべきファイルが含まれていないことを確認
echo ""
echo "=== Verifying excluded files ==="
if unzip -l dist/task-app.zip | grep -q "node_modules/"; then
  echo "❌ node_modules should be excluded"
  exit 1
fi
if unzip -l dist/task-app.zip | grep -q ".git/"; then
  echo "❌ .git should be excluded"
  exit 1
fi
echo "✅ Excluded files properly excluded"
