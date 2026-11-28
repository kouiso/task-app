# #788 の確かめ（2026-11-27）

main（`eb406ac` + この枝のテストの変更）で `npx playwright test e2e/a11y.spec.ts e2e/profile-avatar.spec.ts e2e/search.spec.ts`（Chromium の実行ファイルを指定する一時設定で実行）。

```text
  1) [chromium] › e2e/a11y.spec.ts:69:9 › Accessibility: authenticated pages › my tasks has no critical axe violations 
    aria-valid-attr-value: Ensure all ARIA attributes have valid values (1 node(s))
    +     "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/aria-valid-attr-value?application=playwright",
    +     "id": "aria-valid-attr-value",
    +             "id": "aria-valid-attr-value",
    test-results/a11y-Accessibility-authent-515a4--no-critical-axe-violations-chromium/test-failed-1.png
  2) [chromium] › e2e/a11y.spec.ts:77:7 › Accessibility: authenticated pages › my task filters are keyboard accessible with proper aria labels 
    Error: expect(locator).toBeFocused() failed
    Locator:  getByRole('tab', { name: '未対応' })
    test-results/a11y-Accessibility-authent-6e26f-ble-with-proper-aria-labels-chromium/test-failed-1.png
  2 failed
  15 passed (2.0m)
```

直す前（同じ3つの spec、main のまま）:

```text
  1) [chromium] › e2e/a11y.spec.ts:70:9 › Accessibility: authenticated pages › my tasks has no critical axe violations 
    TypeError: _test.expect.fail is not a function
    test-results/a11y-Accessibility-authent-515a4--no-critical-axe-violations-chromium/test-failed-1.png
  2) [chromium] › e2e/a11y.spec.ts:78:7 › Accessibility: authenticated pages › my task filters are keyboard accessible with proper aria labels 
    Error: expect(locator).toBeFocused() failed
    Locator:  getByRole('tab', { name: 'すべて' })
    test-results/a11y-Accessibility-authent-6e26f-ble-with-proper-aria-labels-chromium/test-failed-1.png
  3) [chromium] › e2e/search.spec.ts:18:7 › Search › should display search page ────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('button', { name: '検索' })
    test-results/search-Search-should-display-search-page-chromium/test-failed-1.png
  4) [chromium] › e2e/profile-avatar.spec.ts:17:7 › avatar update › avatar URL set via /profile/edit is reflected on /profile 
    test-results/profile-avatar-avatar-upda-9a2c6-dit-is-reflected-on-profile-chromium/test-failed-1.png
  5) [chromium] › e2e/profile-avatar.spec.ts:38:7 › avatar update › avatar URL set via /user/[id]/edit (own profile) is reflected on detail page 
    test-results/profile-avatar-avatar-upda-406fd-is-reflected-on-detail-page-chromium/test-failed-1.png
  5 failed
  12 passed (4.4m)
```

残る2件は #789 の製品の不具合（`aria-valid-attr-value` と、未取得のステータスへ切り替えた時のフォーカス喪失）で落ちています。
