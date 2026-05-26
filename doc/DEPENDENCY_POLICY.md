# Dependency Policy

Issue: #119

このドキュメントは TaskApp の依存関係更新方針を定義します。通常運用では minor / patch 更新を自動 PR 化し、major 更新は四半期レビューで breaking change と回帰リスクを確認してから個別に扱います。

## 更新方針

| 更新種別 | 扱い | 実施タイミング | 必須確認 |
|----------|------|----------------|----------|
| patch | Dependabot PR を自動作成 | 毎月 | CI、`npm audit`、主要画面 smoke |
| minor | Dependabot PR を自動作成 | 毎月 | CI、型チェック、主要画面 smoke |
| major | Dependabot PR は自動作成しない | 3 / 6 / 9 / 12 月の四半期レビュー | breaking change 調査、移行計画、behavioral E2E |
| security | Dependabot alert / security update を優先 | alert 発生時 | 脆弱性影響範囲、最小修正、CI |

## 現在の major bump 候補

| パッケージ | 現在 | 候補 | 主な確認ポイント |
|------------|------|------|------------------|
| `react`, `react-dom` | 18.x | 19.x | Next.js 対応状況、Server/Client Components、hydration、testing-library |
| `@prisma/client`, `prisma` | 6.x | 7.x | schema / migration / generate、Prisma Client API、Docker PostgreSQL 16 |
| `@hookform/resolvers` | 3.x | 5.x | zod resolver API、フォーム validation、既存フォーム E2E |
| `@types/node` | 22.x | 25.x | Node 実行バージョンとの差分、Next.js / Vitest 型解決 |

## 四半期 major review 手順

1. 3 / 6 / 9 / 12 月の第 1 週に `npm outdated` と Dependabot alerts を確認する。
2. major 候補ごとに upstream release notes / migration guide / breaking changes を読む。
3. 1 PR につき 1 major 系列だけを上げる。React と Prisma のような大きい更新を同じ PR に混ぜない。
4. `package.json` と `package-lock.json` を更新し、必要なコード修正を最小化する。
5. migration notes を PR body に記録する。
6. CI に加えて behavioral E2E を実行し、ユーザーフローの回帰を確認する。

## 必須 verification

major bump PR では最低限、次を実行します。

```bash
npm run lint:ci
npm run type-check
npm test
npm run build
```

さらに、issue #108 で追加される behavioral E2E を major bump の必須ゲートにします。#108 が未完了の間は、PR body に未実行理由と代替確認（手動 smoke / 既存 Playwright spec）を明記します。

## Dependabot 運用

- `.github/dependabot.yml` は npm と GitHub Actions の minor / patch PR を毎月作成します。
- semver-major の version update PR は `ignore.update-types: ["version-update:semver-major"]` で止めます。
- セキュリティ alert は別扱いです。major を含む security fix が必要な場合は、四半期を待たずに影響範囲を確認して対応します。

## PR チェックリスト

- [ ] major 候補と対象バージョンを明記した
- [ ] upstream migration guide / release notes を読んだ
- [ ] breaking change の有無と対応内容を PR body に書いた
- [ ] `package-lock.json` まで更新した
- [ ] unit / build / type-check を通した
- [ ] behavioral E2E (#108) または代替 smoke を実行した
