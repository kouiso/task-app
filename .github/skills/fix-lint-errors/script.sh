#!/bin/bash

# TaskApp リント・フォーマット修正スクリプト
# このスクリプトは、Biomeを使用してコードのリント・フォーマットエラーを自動修正します。

echo "🔍 リントエラーをチェックしています..."
npm run lint

echo ""
echo "🔧 自動修正可能なエラーを修正しています..."
npm run lint:fix

echo ""
echo "✨ コードをフォーマットしています..."
npm run format

echo ""
echo "✅ 最終チェックを実行しています..."
npm run lint

echo ""
echo "🎉 リント・フォーマット処理が完了しました！"
