#!/usr/bin/env bash
set -o pipefail
make snapshot-verify 2>&1 | tee "$RUNNER_TEMP/snapshot.log"
