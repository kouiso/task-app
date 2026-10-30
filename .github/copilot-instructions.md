<!-- AUTO-GENERATED from AGENTS.md by scripts/sync-ai-rules.sh -->
<!-- DO NOT HAND-EDIT — changes will be overwritten on next sync -->
<!-- To update: edit AGENTS.md, then run: bash scripts/sync-ai-rules.sh -->

# task-app

Next.js 15 タスク管理アプリ。30日間ハンズオン型プログラミング教材として販売予定。

- **本番**: https://task-app-pink-psi.vercel.app (Vercel)
- **ステージング**: Vercel Preview Deployment（PR ごと自動生成）

> ⚠️ `.gemini/styleguide.md` と `.github/copilot-instructions.md` はこのファイルから
> `scripts/sync-ai-rules.sh` で自動生成される。直接編集禁止。

## Critical Checklist (絶対遵守)

**回答前に必ず以下の項目をセルフチェックし、1つでも違反があれば修正してから出力すること。**

番号が2から始まるのは、1番（思考は英語・応答は関西弁）が Claude だけに効く口調の規約で、`.claude/rules/persona.md` に置いているため。

2. **[No Delegation]** 「確認してください」「実行してください」は禁止。MCP/コマンドで自分で確認・実行した結果のみを報告する。
3. **[No Guessing]** 「おそらく動くはずです」は禁止。`tavily`, `grep`, `cat`, `git`, テストコマンドで事実を確認し根拠を示す。
4. **[No Error Suppression]** `// @ts-ignore`, `as any`, 空の`catch`は禁止。型定義・入力検証・エラーハンドリングで根本解決する。
5. **[No Partial Work]** 指定1ファイルだけ直して終了は禁止。`rg`/`find`で類似ファイルを全検索し、必要な範囲を明示する。
6. **[No Lazy Git]** `--no-verify`、無条件`--force`、`git reset --hard`は禁止。フック/CIの失敗は原因を調べて修正する。
7. **[No Instruction Ignore]** ユーザー・リポジトリ・システムの禁止事項を同時に満たす。
8. **[Understand Purpose]** 表面的な作業ではなく、なぜその指示が出たのかを把握してから実装する。
9. **[Instant Obey]** `good`/`bad`/`/update-rules`が来たら、対象プロンプトファイルを確認して更新案を即座に作る。

## ユーザー報告とAI調査結果の矛盾時の対応

ユーザーが「動いている」と言っているのにAIの調査結果が異なる場合、最初にAIの調査方法を疑う。

- ユーザーの目の前の事実を優先し、AI側の環境・コマンド・接続先を再確認する。
- DB接続先、環境変数、ブランチ、ワークツリー、ポート、認証状態を確認する。
- `prisma migrate reset`、データ削除、設定初期化などの破壊的操作は明示許可なしに行わない。
- 矛盾が残る場合は、確認した事実・未確認の仮説・次に行う最小検証を分けて報告する。

## プロジェクト概要

### プロジェクト名
**Task-App** - モダンタスク管理アプリケーション教材

### 目的
redmine-clone（Flask/Python実装）の完全リプレイス版として、最新のNext.js 15とTypeScriptで再実装したタスク管理アプリケーション。単なるサンプルではなく、実際に使えるプロダクションレベルの品質を持つ教材プロジェクト。

### 重要な位置付け
- **redmine-cloneとの関係**: redmine-cloneはFlask/Python版の教材として存在
- **task-appの役割**: 同じ機能をより充実した内容で、最新技術スタックで提供
- **教材としての価値**: 2024-2025年の最新Web開発技術を学べる実践教材

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 15 + TypeScript（App Router 必須） |
| API | tRPC v11 |
| ORM | Prisma 6 + PostgreSQL 16 |
| スタイル | Tailwind CSS v4 + shadcn/ui |
| テスト | Vitest 5 (unit) + Playwright (E2E) |
| Linter | Biome 2 + ESLint |
| デプロイ | Vercel |

### 技術スタック（変更禁止）

#### フロントエンド
- **Next.js 15.5.24** - App Router必須（Pages Router禁止）
- **React 18.3.1** - UIライブラリ
- **TypeScript 5.9.3** - 厳格モード完全対応
- **shadcn/ui** - Radix UIベースのコンポーネントライブラリ
- **Tailwind CSS v4** - ユーティリティファーストCSS
- **Lucide React** - アイコンライブラリ

#### バックエンド
- **tRPC v11.17.0** - End-to-End型安全API
- **Prisma 6.19.3** - TypeScript ORM
- **PostgreSQL** - データベース
- **jose 6.2.3** - セッション JWT の署名・検証（`src/lib/session.ts`。NextAuth は使っていない）
- **bcryptjs** - パスワードハッシュ化

#### 開発ツール
- **Biome 2.4.15** - リンター・フォーマッター（基本はBiome、足りない場合のみESLint）
- **Vitest 5.0.1** - テストフレームワーク
- **Husky + lint-staged** - Git hooks
- **Turbopack** - 高速バンドラー（Next.js内蔵）

#### データ可視化・UI拡張
- **Recharts 3.8.1** - グラフ・チャートライブラリ
- **react-day-picker 9.14.0** - 日付ピッカー
- **react-hook-form 7.76.1 + zod 3.25.76** - フォームバリデーション
- **class-variance-authority (CVA)** - バリアントベースのスタイリング
- **tailwind-merge + clsx** - クラス名管理

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

MW-CANARY-CLAUDEMD-7f3a9c

**`material/**` 配下のファイルを編集する前に、必ず `.claude/skills/material-writing/SKILL.md` を読み、その手順に従うこと。**

これは任意ではない。外部レビューで**AI独特の言い回しと翻訳文感を指摘され、商品として通用しないと判断された実績がある**。
以前はこの指示が CLAUDE.md にだけ抜けていたため、Claude は一度もスキルを適用していなかった。今はこのファイルに一本化し、
CLAUDE.md は AGENTS.md を読み込む1行（`@AGENTS.md`）だけにしている。`--add-dir` で足したリポジトリでは AGENTS.md が
直接は読まれない。`CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` を付けた `--add-dir` では shim の CLAUDE.md は読まれるが、
`@AGENTS.md` の取り込みは展開されなかった（2026-10-30 の `claude -p` 実測。記録は redmine-clone の
`material/_meta/agents-canary.md`）。環境変数を付けなければ、追加ディレクトリの CLAUDE.md そのものが読まれない。だから task-app の作業も
cwd=/home/user/task-app で起動したセッションで行う。cwd=リポジトリなら shim 経由で AGENTS.md が読まれる。

**恒久ルール: 教材は実コードを編集しながら、その場で書く。** 1 Step は「作業ツリーの実コードを1か所変える → 動かして確かめる →
その差分と理由を Step に書く」で1単位とする。教材に載せるコードは作業ツリーの実ファイルから写し、手で打ち直さない。
後からまとめて書くことも、先に教材を書いてからコードを合わせることも禁止する。

守るべき最小の3点（詳細は SKILL.md 本体）:

1. **書く前に6手順を通す** — 偏愛語を疑う → 実体があるか判定 → 具体へ書き直す。書いた後に削るのではなく、最初からその語彙で書かない。
2. **手順書化を禁止** — 「これ書け→チェック」の羅列は教材ではない。コードブロックの後には必ず「なぜこう動くか」を書く。
3. **判定基準** — 読者がこの節を読んだ後、次の似た手続きを自力で書ける見込みがあるか。無ければ手順を増やさず理由を足す。

自動発火の仕組み（`.claude/hooks/material-writing-reminder.sh`）も入っているが、**あれは書き込みの「後」に届く安全網**であり、
書く前に効くのはこのファイル（AGENTS.md）の常時ロードだけ。

`material/**/*.md`（30日カリキュラム教材）を執筆・編集する AI（Claude / Codex / Devin 等）は、
必ず `.claude/skills/material-writing/SKILL.md` の手順（偏愛語チェック→実体判定→ゲート）に従うこと。
CodeRabbit・Gemini Code Assist はこの節を参照して `material/**/*.md` の変更を自動指摘する。

以下は SKILL.md の中核を抜き出したもの。**SKILL.md を開けない AI でも、この節だけで判定できる**ようにしてある。

### [MUST] 文体 — ですます体

外部レビューで「AI独特の言い回しと翻訳文感」を指摘され、商品として通用しないと判断された実績がある。
以下3つの表が、その指摘に直接対応する部分。

地の文はすべて **ですます体**。AI のペルソナが関西弁でも、教材本文には持ち込まない。ここが最も混入しやすい。

対象の範囲に例外がある。コードブロックと引用（`>`）は検査から外れるが、**` ```text ` のブロックだけは中身も検査される**。読者がそのまま貼る文面（SNS への共有文など）を置く場所で、除外すると話し言葉が商品の外へ出るためである。

| 許可される語尾 | 禁止される語尾 |
|---|---|
| です / ます / ました / でした | だ / だぞ / だろ / しろ |
| しましょう / してみましょう | やで / やな / やねん / ちゃう |
| ですね / ますね | ワイ / からや / ええわけやない |
| ポイントです / 確認してみましょう | 命令形単体（「書け」「使え」「確認しろ」） |

実際に混入していた例: `初期セットアップは完了やで。` → `初期セットアップが完了しました。`

### [MUST] AI典型構文の禁止

| ❌ NG | ✅ OK |
|---|---|
| することができます | できます |
| これにより | だから / なので / よって |
| 〜と言えるでしょう | 〜です / 〜になります |
| 〜ではないでしょうか | 〜ですよね |
| いかがでしたでしょうか | （削除する） |
| ここでは〜について解説します | （削除して本文から始める） |
| さまざまな場面で | （削除するか具体例を書く） |
| 言うまでもありません / あらゆる観点から | （削除するか具体項目を列挙） |
| 並列以外の読点（「〜は、」「〜が、」「〜ので、」「〜すると、」の息継ぎ） | 読点は入れ替えても意味が変わらない並列の要素の間（「A、B、C」「Aも、Bも」）にだけ打つ。読点が無いと読みにくい文は2文に分けるか語順を変える。読点を足して済ませない |

### [MUST] 英語直訳調の禁止

| ❌ NG | ✅ OK |
|---|---|
| 〜することは可能です | 〜できます |
| 〜について言及 | 〜について / 〜を紹介 |
| 〜を実施します | 〜します / 〜を行います |
| 〜に関しても同様です | 〜も同じです |

例: `認証を実施することは可能です。` → `認証できます。` ／ `セッションについて言及しました。` → `セッションを説明しました。`

機械検出は `python3 scripts/curriculum-qa/check_tone.py <file>`（`check_quality.sh` の Step 7 で自動実行）。

**上の3表と手順6の重言は、2026-08-07 時点で全項目が検出対象に入っている**。`test_check_tone.py` が、登録されている全パターンに検出例が1件以上あることを検査する。パターンを足して例を書き忘れるとテストが落ちるので、この網羅は宣言ではなく実測で保たれる。以前ここに「`〜を実施します` は素通りする」と書いてあった穴は塞いだ。

分担は次のとおり。textlint の `no-mix-dearu-desumasu` が捕まえるのは `である` だけで、`だ。` `だった。` `使え。` はどれも通す（実測）。そこは `check_tone.py` が受け持つ。

**それでも通ったことは「3表を守った」以上の意味を持たない。** 表に無い言い回しのAI臭・誤字脱字・語り口の不自然さは、どのゲートも見ていない。表は人の目で確認する前提で読むこと。

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

## ファイル・フォルダ命名規約

英語のファイル名・フォルダ名は **小文字単数形ケバブケース**（例: `task-card.tsx`、`query-client.ts`）を厳守する。
CIの `scripts/check-naming-convention.sh` が全トラックファイルを機械チェックする。

**例外（ツール/エコシステムの慣習で名前が固定されているもの）:**

- Python: `snake_case`（PEP 8。例: `check_quality.py`）
- Prisma migration: `<timestamp>_<snake_case>`（Prisma生成物）
- patch-package: `patches/<pkg>+<version>.patch`（生成物）
- GitHub/OSS慣習の固定ファイル名: `README.md` / `LICENSE` / `CODEOWNERS` / `Makefile` / `Dockerfile` /
  `ARCHITECTURE.md` 等の大文字ドキュメント一式
- ツール固有の固定ファイル名: `SKILL.md`（Claude Codeスキル規約）、`migration_lock.toml`（Prisma生成）、
  `pull_request_template.md`（GitHub認識パス）
- 日本語ファイル名（`material/**` の教材コンテンツ等、コンテンツの言語選択によるもの）

新規ファイル・フォルダを追加するときは、上記例外に該当しない限りケバブケースを使うこと。

## GitHub Project での作業管理

- この repo の作業は GitHub Project（`.github/scrum-board.yml` の番号）で管理する
- 次にやる物を決める・課題を起票する・Status を動かす・繰り越す時は必ず先に `.agents/skills/scrum-board/SKILL.md`（`.claude/skills/scrum-board/`）を読んでから手を付ける
- 読めない・見つからない場合の要点: 次にやる物=盤の「今週の Iteration」で Wait 空の先頭（無ければ「無し」と答える・issue一覧や open PR から選ばない）・課題は題の頭に `[PBI]`/`[SBI]` を付け sub-issue と盤登録と項目（Iteration・Priority・Estimate・Size）までやる・繰り越しは `kouiso/.github` の `scripts/scrum_keeper/scrum_keeper.py --job carryover|okawari` を使う
- Status は Backlog / In progress / In review / Done の 4 つ。Todo は作らん
