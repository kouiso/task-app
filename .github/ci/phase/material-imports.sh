#!/usr/bin/env bash
echo "::group::test_check_scaffold_alignment.py — 目印の読み取りそのものの退行テスト"
python3 scripts/curriculum-qa/test_check_scaffold_alignment.py
echo "::endgroup::"
echo "::group::check_scaffold_curriculum_alignment.py"
python3 scripts/curriculum-qa/check_scaffold_curriculum_alignment.py
echo "::endgroup::"
