<!-- AUTO-GENERATED from AGENTS.md by scripts/sync-ai-rules.sh -->
<!-- DO NOT HAND-EDIT — changes will be overwritten on next sync -->
<!-- To update: edit AGENTS.md, then run: bash scripts/sync-ai-rules.sh -->

# task-app — Gemini Code Assist スタイルガイド

## レビュー言語

- すべてのレビューコメントは **日本語** で記述してください
- 内部の思考プロセス（think）のみ英語で行い、出力は日本語にしてください

## PR サマリー

- PR の要約はポエティックで読みやすい形式で記述してください（CodeRabbit 風）
- 変更内容の本質を捉えた、わかりやすく印象的な表現を使用してください

---

<!-- ===== AGENTS.md CONTENT (auto-synced) ===== -->

# task-app

Next.js 15 タスク管理アプリ。30日間ハンズオン型プログラミング教材として販売予定。

- **本番**: https://task-app-pink-psi.vercel.app (Vercel)
- **ステージング**: Vercel Preview Deployment（PR ごと自動生成）

> ⚠️ `.gemini/styleguide.md` と `.github/copilot-instructions.md` はこのファイルから
> `scripts/sync-ai-rules.sh` で自動生成される。直接編集禁止。

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 15 + TypeScript（App Router 必須） |
| API | tRPC v11 |
| ORM | Prisma 6 + PostgreSQL 16 |
| スタイル | Tailwind CSS v4 + shadcn/ui |
| テスト | Vitest 3 (unit) + Playwright (E2E) |
| Linter | Biome 2 + ESLint |
| デプロイ | Vercel |

## コマンド

```bash
npm install          # 依存インストール
npm run dev          # Next.js 開発サーバー（Turbopack）
npm run build        # prisma generate && next build
npm run test         # Vitest ユニットテスト（タスク完了前に必須）
npm run test:e2e     # Playwright E2E テスト
npm run db:push      # Prisma スキーマ反映（開発）
npm run db:migrate   # Prisma マイグレーション実行
npm run db:seed      # シードデータ投入
npm run db:studio    # Prisma Studio 起動
```

## コーディング規約

- **コメント**: 日本語、「なぜ」のみ
- **コミットメッセージ**: 英語 Conventional Commits（`feat:`, `fix:`, `chore:` 等）
- `any` 型禁止・`@ts-ignore` 禁止・`eslint-disable` コメント禁止（根本解決する）
- Prisma: `findFirstOrThrow` / `findUniqueOrThrow` を活用（null チェック削減）
- `git reset --hard/--soft/--mixed` 禁止
- `--no-verify` 禁止・`--force`（`--force-with-lease` 以外）禁止

## 再発ミスパターン（レビューアへの指摘指示）

作業 AI（Claude / Copilot / Codex 等）が繰り返す意味的ミスのカタログ。
CodeRabbit・Gemini Code Assist はこのカタログを参照して PR を自動指摘する。

| # | パターン名 | 指摘観点 | 優先度 |
|---|-----------|---------|--------|
| 1 | **スコープクリープ** | バグ修正 PR に、修正に不要なリファクタ・型整理・無関係な変更が混入していないか | [MUST] |
| 2 | **架空完了 / 動作未確認** | PR 説明・コミットに「動くはず」「確認してください」「動作確認済み（根拠なし）」がないか | [MUST] |
| 3 | **影響範囲漏れ** | 1 ファイルだけ変更し、同パターンの類似ファイル（他 page.tsx / router / 設定）が未更新でないか | [MUST] |
| 4 | **認証・認可の欠落** | tRPC procedure / Route Handler / Server Action 追加時に authn/authz チェックがないか | [MUST] |
| 5 | **setTimeout レースハック** | アニメ完了待ち等を `setTimeout` で誤魔化していないか（正: `onTransitionEnd` / コールバック） | [MUST] |
| 6 | **既存状態初期化の削除** | UX 改善名目で、バグ修正として導入された state リセット（`state = []` 等）を削除していないか | [MUST] |
| 7 | **N+1 / ループ内 DB アクセス** | `for` / `map` 内で都度 `prisma.*.find*`（正: `include` / `in` でバッチ取得） | [MUST] |
| 8 | **useEffect / useLayoutEffect 誤用** | 依存配列欠落・過剰、DOM 測定以外で `useLayoutEffect`、不要な effect | [MUST] |
| 9 | **エラー握りつぶし** | 空 `catch {}`、`\|\| true`、失敗を握って成功扱い | [SUGGEST] |
| 10 | **テスト品質** | 振る舞い変更にテスト無し、アサーション緩め/削除でグリーン偽装、エッジケース未網羅 | [SUGGEST] |
| 11 | **マジックナンバー / props バケツリレー** | 補助的観点として styleguide に記載 | [NITS] |

優先度タグ: `[MUST]` = ブロッカー / `[SUGGEST]` = 推奨 / `[Q]` = 確認 / `[NITS]` = 細かい指摘

## 教材（material/\*\*/\*.md）の文章品質規約

`material/**/*.md`（30日カリキュラム教材）を執筆・編集する AI（Claude / Codex / Devin 等）は、
必ず `.claude/skills/material-writing/SKILL.md` の手順（偏愛語チェック→実体判定→ゲート）に従うこと。
CodeRabbit・Gemini Code Assist はこの節を参照して `material/**/*.md` の変更を自動指摘する。

### 5つの不在（AIっぽい文章の思考的欠落。表現の禁止リストではなく思考の欠落を指す）

| # | 名前 | 症状 | 修正の方向 |
|---|------|------|-----------|
| 1 | 態度の不在 | 全トピックを同じ温度で書く | 重要な所に力を入れ、そうでない所は流す |
| 2 | 勇気の不在 | 「〜と言えるでしょう」で保険をかけ言い切らない | 結局どうなのかを最低1つ言い切る |
| 3 | 省略の不在 | 聞かれていないことまで網羅しようとする | 「これは今回いらない」と判断して削る |
| 4 | リズムの不在 | 文の長さが均一 | 長短の緩急をつける |
| 5 | 沈黙の不在 | すべての段落に結論を書き余地を残さない | あえて結論を書かず問いだけ投げることもある |

**教材固有の逆方向の要請（上記3・5とは逆）**: 教材では手順の省略は禁止（初心者が追えなくなる）、
「なぜ」は明示的に書く（手順の羅列は手順書であって教材ではない）。

### 偏愛語（実体のない抽象語の擦り倒し）

「落ちる・壊れる・刺さる・効く」「設計・仕組み・構造・本質・流れ・全体像」「解像度が高い・手触り・深い」等が
登場したら、名詞の指示対象を1文で説明できるか確認する。できなければ [SUGGEST] で指摘。
例: 「情報が落ちると設計が壊れる」（NG・実体不明）→「userId が undefined になると WHERE 句が正しく組み立てられずエラーになる」（OK・実体あり）。

### [MUST] 検出パターン

- 「同様に」「残りも」「以下略」「簡単です」「同じように」による手順の省略・禁止表現（初心者が追えなくなる、または挫折感を防ぐため）
- コードブロックが26行以上（分割・省略推奨）
- 新出の専門用語に注釈（括弧書き）が無い
- 「〜という手続きが解く問題」を示さずにコードから入っている（なぜを教えていない）

詳細・実行可能なゲート（textlint/check_quality.sh）は `.claude/skills/material-writing/SKILL.md` 参照。
