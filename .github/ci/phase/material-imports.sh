#!/usr/bin/env bash
echo "::group::test_check_scaffold_alignment.py — 目印の読み取りそのものの退行テスト"
python3 scripts/curriculum-qa/test_check_scaffold_alignment.py
echo "::endgroup::"
echo "::group::test_scaffold_biome_pin.py — 土台の Biome を lockfile の版に固定"
python3 scripts/curriculum-qa/test_scaffold_biome_pin.py
echo "::endgroup::"
echo "::group::check_scaffold_curriculum_alignment.py"
python3 scripts/curriculum-qa/check_scaffold_curriculum_alignment.py
echo "::endgroup::"
