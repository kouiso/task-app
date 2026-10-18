#!/usr/bin/env bash
# ビルドは環境変数が必要なためスキップするが、コマンドの存在確認
if npm run build --dry-run 2>/dev/null || grep -q '"build"' package.json; then
  echo "✅ Build script exists"
else
  echo "⚠️ Build script not found"
fi
