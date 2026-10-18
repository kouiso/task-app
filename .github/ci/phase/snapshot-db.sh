#!/usr/bin/env bash
for _ in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p 25532 -U user -d taskapp >/dev/null 2>&1; then
    echo "25532 へ届いた"
    exit 0
  fi
  sleep 2
done
echo "::error::25532 の Postgres へ届かん。ここで止めんと全日 SKIP で緑になる"
exit 1
