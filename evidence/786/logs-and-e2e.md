# #786 の確かめ（2026-11-27）

## 本番ビルドの構造化ログ

`next.config.ts` の `removeConsole` は本番で `console.*` の呼び出しを全部消します。このため `writeStructuredLog` は本番で何も出していませんでした（Sentry を外すとエラーを追う手段が無くなるので、この PR で直しました）。`removeConsole` はそのままにし、`writeStructuredLog` だけ `globalThis.console` を変数に受けて出すようにしました。他の `console.*`（`src/lib/session.ts` の `console.error` など）は今までどおり本番で消えます。

- 直す前（main の `.next`）: tRPC のチャンクの `console.info` は 0 件
- 直した後（この枝で `npm run build`）: tRPC のチャンク（`.next/server/chunks/736.js`）に `globalThis.console` が1件、`Failed to verify session token` は0件（消えている）

直した後の本番サーバー（`next start -p 3300`）で `/login`、未ログインの `project.getAll`、壊れた session cookie 付きの `project.getAll` を叩いた時の標準出力（`Failed to verify session token` の行は出ない）:

```text
{"ts":"2026-11-27T14:43:46.725Z","level":"info","event":"http.request","requestId":"97a21c19-b062-4803-8a81-4910146c7dc4","method":"GET","path":"/login","status":200,"durationMs":1}
{"ts":"2026-11-27T14:43:46.770Z","level":"info","event":"http.request","requestId":"7f6222a2-72a3-4c59-a9b3-d17f79d5ce8d","method":"GET","path":"/login","status":200,"durationMs":0}
{"ts":"2026-11-27T14:43:46.786Z","level":"info","event":"http.request","requestId":"c92f0776-79e1-42e2-abbb-8cf36313030b","method":"GET","path":"/api/trpc/project.getAll","status":200,"durationMs":0}
{"ts":"2026-11-27T14:43:46.809Z","level":"warn","event":"trpc.procedure","requestId":"c92f0776-79e1-42e2-abbb-8cf36313030b","path":"project.getAll","method":"query","status":401,"durationMs":0,"errorCode":"UNAUTHORIZED"}
{"ts":"2026-11-27T14:43:46.826Z","level":"info","event":"http.request","requestId":"0dd21455-0d3d-45eb-ac3d-b4d183dfb4fe","method":"GET","path":"/api/trpc/project.getAll","status":200,"durationMs":1}
{"ts":"2026-11-27T14:43:46.831Z","level":"warn","event":"trpc.procedure","requestId":"0dd21455-0d3d-45eb-ac3d-b4d183dfb4fe","path":"project.getAll","method":"query","status":401,"durationMs":0,"errorCode":"UNAUTHORIZED"}
```

## E2E（Playwright、この枝・next dev・PLAYWRIGHT_TEST=1）

```text
  1) [chromium] › e2e/a11y.spec.ts:70:9 › Accessibility: authenticated pages › my tasks has no critical axe violations 
    test-results/a11y-Accessibility-authent-515a4--no-critical-axe-violations-chromium/test-failed-1.png
  2) [chromium] › e2e/a11y.spec.ts:78:7 › Accessibility: authenticated pages › my task filters are keyboard accessible with proper aria labels 
    Error: expect(locator).toBeFocused() failed
    test-results/a11y-Accessibility-authent-6e26f-ble-with-proper-aria-labels-chromium/test-failed-1.png
  3) [chromium] › e2e/profile-avatar.spec.ts:17:7 › avatar update › avatar URL set via /profile/edit is reflected on /profile 
    test-results/profile-avatar-avatar-upda-9a2c6-dit-is-reflected-on-profile-chromium/test-failed-1.png
  4) [chromium] › e2e/profile-avatar.spec.ts:38:7 › avatar update › avatar URL set via /user/[id]/edit (own profile) is reflected on detail page 
    test-results/profile-avatar-avatar-upda-406fd-is-reflected-on-detail-page-chromium/test-failed-1.png
  5) [chromium] › e2e/search.spec.ts:18:7 › Search › should display search page ────────────────────
    Error: expect(locator).toBeVisible() failed
    test-results/search-Search-should-display-search-page-chromium/test-failed-1.png
  5 failed
  97 passed (11.7m)
```

落ちた5件は main（`eb406ac`）でも同じく落ちます（変更前からの失敗）:

```text
  1) [chromium] › e2e/a11y.spec.ts:70:9 › Accessibility: authenticated pages › my tasks has no critical axe violations 
    test-results/a11y-Accessibility-authent-515a4--no-critical-axe-violations-chromium/test-failed-1.png
  2) [chromium] › e2e/a11y.spec.ts:78:7 › Accessibility: authenticated pages › my task filters are keyboard accessible with proper aria labels 
    Error: expect(locator).toBeFocused() failed
    test-results/a11y-Accessibility-authent-6e26f-ble-with-proper-aria-labels-chromium/test-failed-1.png
  3) [chromium] › e2e/search.spec.ts:18:7 › Search › should display search page ────────────────────
    Error: expect(locator).toBeVisible() failed
    test-results/search-Search-should-display-search-page-chromium/test-failed-1.png
  4) [chromium] › e2e/profile-avatar.spec.ts:17:7 › avatar update › avatar URL set via /profile/edit is reflected on /profile 
    test-results/profile-avatar-avatar-upda-9a2c6-dit-is-reflected-on-profile-chromium/test-failed-1.png
  5) [chromium] › e2e/profile-avatar.spec.ts:38:7 › avatar update › avatar URL set via /user/[id]/edit (own profile) is reflected on detail page 
    test-results/profile-avatar-avatar-upda-406fd-is-reflected-on-detail-page-chromium/test-failed-1.png
  5 failed
  12 passed (4.4m)
```
