# CI Gates 棚卸し

最終更新: 2026-04-17

## 現状

### 既存 workflow

- `ci.yml`
- `reusable-ci.yml`
- `npm-audit.yml`
- `dependency-review.yml`
- `semgrep.yml`
- `trufflehog.yml`
- そのほか運用系 workflow 複数

### 問題点

`reusable-ci.yml` はもともと以下しか実行していなかった。

- `npm run build:ci`
- `npm run lint`

そのため、`moonlit-scribbling-hoare.md` の D-1 要件である以下を満たしていなかった。

- `type-check`
- `test`
- coverage 関連の明示
- `npm audit --audit-level=high`

## 今回の反映

### `reusable-ci.yml`

- PostgreSQL service を追加
- `TEST_DATABASE_URL` と `_DOCKER_COMPOSE_HOST_PORT_TEST_DB=5432` を注入
- `npm run type-check` を追加
- `npm test` を追加
- lint 失敗を成功扱いしていた分岐を削除

### `npm-audit.yml`

- 既に weekly schedule は存在していた
- `npm audit --audit-level=moderate` を `high` に変更

## まだ残るギャップ

1. coverage 80% gate は未実装
2. Playwright smoke を PR 必須 check にしていない
3. `reusable-ci.yml` は 1 job 直列構成で、fail fast や job ごとの可視性が弱い

## ローカル確認

| コマンド | 結果 |
|---|---|
| `npm run type-check` | PASS |
| `npm test -- --coverage` | PASS / `180 tests` |
| `npm run build` | PASS |
| `npm audit --audit-level=high` | PASS / `0 vulnerabilities` |
| `npm run lint` | PASS |
| coverage | `25.20%` |

## 判断

coverage 80% をすぐ gate にすると現状では CI を常時落とすため、今回は gate 追加を見送る。先にテスト資産の拡充が必要。
