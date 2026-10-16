#!/usr/bin/env bash
echo "::group::textlint — material 配下の全 .md（変更有無を問わない）"
# glob はシェルではなく textlint に展開させる（クォート必須）。
# 旧実装は changed-files の出力を run: へ素のまま展開しており、
# スペース入りファイル名で壊れ、ブランチ名経由のシェル注入面にもなっていた。
# 注: この run: 内に GitHub Actions の式デリミタを literal で書くと、
#     コメント内であっても評価されてワークフロー全体がパースエラーになる。
npx textlint "material/**/*.md"
echo "::endgroup::"
