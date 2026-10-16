#!/usr/bin/env bash
# verify の依存先が同じ自己テストを実行するので、ローカルでは二重に回さない。
make book-pdf-verify | tee "$RUNNER_TEMP/selftest.log"
grep -q '✅ 46 ケースすべて通過' "$RUNNER_TEMP/selftest.log"
