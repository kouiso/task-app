#!/usr/bin/env bash
echo "::group::check_quality.sh — day/appendix 全件（変更有無を問わない）"
# ディレクトリモードで呼ぶ。理由は2つ（PR#285 CodeRabbitレビュー指摘）:
# 1. 命名規則外の md（day1_x.md 等）を検出するガードはディレクトリモードに
#    実装されており、find でファイルを渡す旧方式ではガードが一度も走らない。
# 2. スコープが day のみ → day+appendix に広がる（appendix も検査対象になる）。
bash scripts/curriculum-qa/check_quality.sh material/30days-curriculum/
echo "::endgroup::"
