# Metrics / Observability

Issue #114 の observability baseline です。Sentry exception capture だけでは障害傾向、学習者の詰まりどころ、API 遅延を追えないため、request-id・structured log・metric catalog を標準化します。

## Request ID

| 項目 | 方針 |
| --- | --- |
| Header | `x-request-id` |
| 生成場所 | `src/middleware.ts` |
| 伝播 | middleware が request / response header に付与 |
| Sentry | `request_id` tag と `request_path` tag を設定 |
| Log | JSON structured log の `requestId` に出力 |

既存 header が `a-zA-Z0-9._:-` の 8-128 文字であれば再利用し、それ以外は `crypto.randomUUID()` で再生成します。

## Structured Log

本番・開発では 1 行 JSON で出力します。`NODE_ENV=test` または `OBSERVABILITY_LOGS=off` の場合は出力しません。

```json
{
  "ts": "2026-05-24T06:45:00.000Z",
  "level": "info",
  "event": "http.request",
  "requestId": "trace-abcdef12",
  "method": "GET",
  "path": "/dashboard",
  "status": 200,
  "durationMs": 42
}
```

| Event | 発生箇所 | 主な fields |
| --- | --- | --- |
| `http.request` | middleware | `requestId`, `method`, `path`, `status`, `durationMs` |
| `trpc.procedure` | tRPC middleware | `requestId`, `path`, `method`, `status`, `durationMs`, `userId` |

## Metric Catalog

| Metric | Type | Source | Tags | Alert / Review |
| --- | --- | --- | --- | --- |
| `auth.login.success.count` | counter | `auth.login` mutation | `requestId`, `userRole` | 週次 trend |
| `auth.login.fail.count` | counter | `auth.login` mutation | `requestId`, `reason` | 5 分で急増したら brute force 調査 |
| `task.create.count` | counter | `task.create` mutation | `requestId`, `projectId` | 週次 activation 指標 |
| `task.update.count` | counter | `task.update` mutation | `requestId`, `status` | 週次 engagement 指標 |
| `http.response.latency_ms` | histogram | middleware | `path`, `method`, `status` | p95 > 1000ms で調査 |
| `trpc.procedure.latency_ms` | histogram | tRPC middleware | `path`, `type`, `ok` | p95 > 800ms で調査 |
| `http.404.count` | counter | middleware / Vercel logs | `path`, `referer` | 教材リンク切れ候補 |
| `http.500.count` | counter | Sentry + Vercel logs | `path`, `requestId` | 即時 triage |

## Vercel Log Drain / Sentry Custom Event

| 連携先 | 用途 | 初期設定 |
| --- | --- | --- |
| Vercel Log Drain | structured log の集約、HTTP latency / 404 rate の集計 | Datadog / Axiom / Logtail のいずれかへ JSON log を転送 |
| Sentry | exception と request-id の突合 | `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` を設定 |
| Analytics | funnel event の集計 | Vercel Analytics または PostHog を選定 |

Sentry issue を確認するときは `request_id` tag で Vercel log を逆引きし、同じ request の `http.request` と `trpc.procedure` を並べて見る運用にします。

## Learner Funnel

| Step | Event | 成功条件 |
| --- | --- | --- |
| Register | `funnel.register.completed` | `/register` から user 作成成功 |
| First task create | `funnel.first_task.created` | user の初回 `task.create` 成功 |
| First task complete | `funnel.first_task.completed` | user の初回 `task.update(status=DONE)` 成功 |

初期実装では structured log と Sentry tag までを入れます。funnel event の永続化先は Vercel Analytics / PostHog / DB audit table の比較後に決めます。
