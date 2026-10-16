#!/usr/bin/env bash
make book-pdf-test | tee "$RUNNER_TEMP/selftest.log"
# 件数はスクリプト側で動的に算出しとる。減った時に緑で通さんよう突き合わせる
grep -q '✅ 46 ケースすべて通過' "$RUNNER_TEMP/selftest.log"
