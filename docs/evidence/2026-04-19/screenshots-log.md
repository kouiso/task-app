# 2026-04-19 Screenshots Log

## Captured Screens

### Day 01

- State: Day 01 完成時の最小ページ
- Route: `/`
- Runtime: `next dev`
- Viewport: `1440x900`
- Playwright: Chromium headless, `deviceScaleFactor: 2`, `scale: "css"`
- Output: `material/30days-curriculum/screenshots/day01/first-render.png`
- File size: `305417 bytes`

### Day 02

- State: Day 02 完成時の personalized dashboard
- Route: `/dashboard`
- Runtime: `next dev`
- Viewport: `1440x900`
- Playwright: Chromium headless, `deviceScaleFactor: 2`, `scale: "css"`
- Output: `material/30days-curriculum/screenshots/day02/dashboard-message.png`
- File size: `300761 bytes`

### Day 04

- State: Day 04 公開確認画面
- Route: `/dashboard`
- Runtime: `npm run build && npm start`
- Viewport: `1440x900`
- Playwright: Chromium headless, `deviceScaleFactor: 2`, `scale: "css"`
- Output: `material/30days-curriculum/screenshots/day04/public-url.png`
- File size: `298503 bytes`
- Note: Vercel の実 URL は作業時点で利用していないため、local production build を fallback として使用

## Notes

- 既存ワークツリーに未コミット変更があったため、`/tmp/task-app-screenshots` の scratch worktree で Day 状態を再現して撮影した
- `src/middleware.ts` は scratch 側だけで `/` と `/dashboard` を公開扱いに変更した
- 画面上の固有名は `taskapp demo` に統一した
