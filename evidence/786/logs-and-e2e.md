# #786 の確かめ（2026-11-27）

## 本番ビルドの構造化ログ

`next.config.ts` の `removeConsole` が本番で `console.*` を全部消していたため、`writeStructuredLog` は本番で何も出していませんでした（Sentry を外すとエラーを追う手段が無くなるので、この PR で直しました）。

- 直す前（main の `.next`）: tRPC のチャンクの `console.info` は 0 件
- 直した後（この枝で `npm run build`）: 1 件

直した後の本番サーバー（`next start`）で `/login` と未ログインの `project.getAll` を叩いた時の標準出力:

```text
{"ts":"2026-11-27T14:35:49.246Z","level":"info","event":"http.request","requestId":"0283b904-25ea-4bb1-91a8-c11f0b1b5fee","method":"GET","path":"/login","status":200,"durationMs":2}
{"ts":"2026-11-27T14:35:49.292Z","level":"info","event":"http.request","requestId":"c9ffc27c-50eb-4b2b-9f6e-aa4f0b6a7882","method":"GET","path":"/login","status":200,"durationMs":0}
{"ts":"2026-11-27T14:35:49.306Z","level":"info","event":"http.request","requestId":"e8020a06-8f0a-4208-a3df-7be5bfaeb884","method":"GET","path":"/api/trpc/project.getAll","status":200,"durationMs":0}
{"ts":"2026-11-27T14:35:49.323Z","level":"warn","event":"trpc.procedure","requestId":"e8020a06-8f0a-4208-a3df-7be5bfaeb884","path":"project.getAll","method":"query","status":500,"durationMs":1,"errorCode":"UNAUTHORIZED"}
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
