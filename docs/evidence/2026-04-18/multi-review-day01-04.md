# Day 01-04 カリキュラム マルチエージェント・レビュー結果

- 対象: `material/30days-curriculum/day01_*.md` 〜 `day04_*.md`
- 実施日: 2026-04-18
- 方式: `/multi-review` 裁判形式（Architecture / Code Quality / Testing / Business Logic / 完全初心者 / 教材編集者 / SE / PM の7視点）
- 参照仕様: `docs/evidence/2026-04-18/curriculum-ideal-plan.md` L83-250
- スコープ除外: a11y / SEO / 人間通し
- 前提: task-app は **2026-04-19 リリース予定の有償教材**

---

## 総合判定

| 指標 | 件数 |
|---|---|
| 🔴 BLOCKER | 5 |
| 🟡 MAJOR | 4 |
| 🟢 MINOR | 3 |

### Verdict: 🔴 **DO NOT LAUNCH**

**理由（最重要）:**

1. Day 01 手順通りに実行してもログイン不可（DB シード未実行）→ 初日で教材が破綻
2. Day 03 が `git reset --hard HEAD~1` を教えており、**プロジェクトルール `prompt/instructions/git.instructions.md` の「`git reset` 完全禁止」と真正面から衝突**
3. Day 02 の `PORT=3002` が Day 01 の `PORT=3001` と食い違い、初心者が自力復帰不能
4. Day 04 は紙面設計のみで「今日作ったもの」が1個も画面に出ない → feature-unit 原則違反（`curriculum-ideal-plan.md` と不整合）
5. Day 01 で示す管理者名が `User Admin` / `管理者` と二重表記、seed のデフォルトと合わない

このまま明日リリースしたら、**初日の Day 01 でほとんどの購入者が詰まる**。商用教材としては致命傷。

---

## Day 01 所見

### 🔴 BLOCKER D01-01: DB シード手順が欠落（L60-67）

**該当:**

```bash
npm install
PORT=3001 npm run dev
```

**問題:**

- `npm run db:push` / `npm run db:seed` / `docker compose up -d` が一切登場しない
- 初心者が手順通りに実行しても PostgreSQL が起動していない、admin ユーザーも存在しない
- 結果: L82-85 の「`admin@example.com` / `password123` でログイン」が 100% 失敗する

**修正案（Step 3 を差し替え）:**

```bash
# 1. PostgreSQL を起動
docker compose up -d

# 2. 依存関係をインストール
npm install

# 3. DB スキーマを反映 + 初期データ投入
npm run db:push
npm run db:seed

# 4. 開発サーバー起動
PORT=3001 npm run dev
```

**根拠:** `package.json` に `db:push` / `db:seed` スクリプトあり。`src/command/seed.ts` で `admin@example.com` が作成される。これを踏まないと Day 01 のゴール（ログインして名前を見る）到達不可。

---

### 🔴 BLOCKER D01-02: 管理者表示名の不整合（L35-36, L146-149）

**該当 L35-36:**

> 名前の表示は環境によって `User Admin` または `管理者` などに見えます。

**該当 L146-149:**

> ### 名前が `管理者` じゃなくて `User Admin` と出た
> 問題ありません。シードデータは環境変数の入り方で表示名が変わります。

**問題:**

- `src/command/seed.ts` のデフォルト表示名は **`管理者`** 固定
- `_DEVELOPER_FIRSTNAME` / `_DEVELOPER_LASTNAME` が未設定なら `User Admin` は出ない
- 「どっちでも OK」と書かれると初心者は「どっちが正解？」で手が止まる

**修正案:**

- L35-36: 「ログインすると画面に **`管理者`** と表示されます」と一本化
- L146-149: トラブルシュートごと削除（または「環境変数を設定した場合のみ表示が変わる」と but 初期設定では不要 と明記）

**根拠:** Single Source of Truth = seed.ts の挙動。教材は seed の実挙動に合わせる。

---

### 🟡 MAJOR D01-03: `.env` の入手経路が不明（L46-50）

**該当:**

> プロジェクトのいちばん上に `.env` ファイルを作って、配布された内容をそのまま貼り付けます。

**問題:**

- 「配布された内容」が何を指すのか不明
- 初心者は `.env.example` の存在を知らない

**修正案:**

```bash
cp .env.example .env
```

と明記し、「このコマンドで `.env` を作ります。中身は自動で埋まっています」と説明。

---

### 🟢 MINOR D01-04: Docker 起動確認コマンドがない（L22-28）

**修正案:** 前提チェックに `docker --version` と `docker ps` を追加し、「エラーなく返ってきたら OK」と一文。

---

## Day 02 所見

### 🔴 BLOCKER D02-01 / X-01: PORT 不整合（L18, L19, L22, L137）

**該当:**

- L18: `PORT=3002 npm run dev`
- L19: `http://localhost:3002/dashboard`
- L22: 「もし `3002` が使われていたら」
- L137: `PORT=3002 npm run dev` を動かしているターミナル

**問題:**

- Day 01 は `PORT=3001`、Day 02 は `PORT=3002`
- Day 01 のターミナルをそのまま流用する初心者が `localhost:3001` でアクセスして「何も変わらない」状態に陥る
- 「なぜポートが変わったのか」の説明も一切なし

**修正案:** Day 02 を **`PORT=3001` に統一**（全4箇所置換）。連続性優先。

**根拠:** `docs/evidence/2026-04-18/curriculum-ideal-plan.md` L83-250 でも PORT 変更は仕様化されていない。

---

### 🟡 MAJOR D02-02: 挿入位置が曖昧（L44）

**該当:**

> ダッシュボードのヒーローセクションの下に、1 枚だけカードを差し込みます。

**問題:** 「ヒーローセクション」が JSX のどの部分か初心者には特定不能。行番号もアンカーもない。

**修正案:** `src/app/dashboard/page.tsx` の具体的な行番号を示すか、差し込み直前の既存コードスニペット（例: `</div>` の閉じタグ）を引用して「この直後に貼る」と明示。

---

### 🟢 MINOR D02-03: ポート占有時の kill コマンド欠落（L22）

**修正案:**

```bash
lsof -ti:3001 | xargs kill -9
```

を一行添えて「これで占有プロセスを落とせます」と。

---

## Day 03 所見

### 🔴 BLOCKER D03-01: `git reset --hard HEAD~1` を教えている（L119-147, L191-196, L7-10）

**該当 L135:**

```bash
git reset --hard HEAD~1
```

**該当 L7-10:**

> 「昨日までに作ったものを保存して、あとで 1 つ前の状態へ戻せる」と言えるようになること。
> Git はタイムマシン、GitHub はそのタイムマシンのバックアップ置き場、と思って進めたら大丈夫です。

**問題:**

- `prompt/instructions/git.instructions.md` および `.claude` ルールで **`git reset` は完全禁止**
- 初心者に `--hard` を教えるのは**教材レベルで危険**（公開後にローカル作業を吹き飛ばす事故が確実に発生）
- `curriculum-ideal-plan.md` L83-250 でも reset は仕様に含まれない

**修正案:**

1. Step 5「1 回だけ巻き戻してみる」を **完全削除** または以下に差し替え
2. 代替: **GitHub 側の履歴画面で「過去のコミットの中身を見る」体験**に変更（実際に戻さない）

```markdown
## Step 5: 過去の保存ポイントを見てみる

GitHub の履歴画面でコミットをクリックすると、その時点のファイルをブラウザで見られます。
「巻き戻す」練習は Day 後半で安全なやり方（ブランチ）を使って行います。
```

3. L7-10 の「タイムマシン」メタファーを「**保存ポイントを並べていく記録帳**」に変更（巻き戻しを強調しない）

**根拠:** プロジェクトルール違反かつ初心者安全性の観点で致命的。

---

### 🔴 BLOCKER D03-02: `git push` 前提が欠落（L103-105）

**該当:**

```bash
git push
```

**問題:**

- この手順以前に `git init` / `git remote add origin` / Personal Access Token (PAT) 設定の説明がない
- Day 01 でも GitHub リポジトリ作成手順なし
- `git push` でいきなり認証エラーに突き当たる

**修正案:** Day 02 末尾か Day 03 冒頭に以下を追加:

```bash
# GitHub で新規リポジトリ作成後
git init
git remote add origin https://github.com/<your-username>/task-app.git
# PAT を使って認証（初回のみ）
```

もしくは GitHub Desktop / gh CLI `gh auth login` を前提に誘導する手順を明記。

---

### 🟡 MAJOR D03-03: Conventional Commits プレフィックスが未説明（L86, L129）

**該当:**

```bash
git commit -m "feat: 最初のタスクカードを保存"
```

**問題:** `feat:` の意味を一切説明せずに使っている。初心者は「なぜ `feat:` が必要か」分からない。

**修正案:** L96 の直後あたりに短く:

> `feat:` は「機能追加」の合図です。あとで履歴を見返したときに「何の種類の変更か」一瞬でわかります。

---

### 🟢 MINOR D03-04: メンター前提の記述（L180-181）

**該当:**

> わからんときは、まず先生やメンターに `git status` の結果を見せるのが最短です

**問題:** 自習購入者に「メンター」前提の指示は違和感。

**修正案:** 「サポートチャット／Discord に貼る」「Day 03 のヘルプ欄を見る」等、教材側が用意する導線に置き換え。

---

## Day 04 所見

### 🔴 BLOCKER D04-01: 「今日作ったもの」が画面に出ない（L55-105）

**該当 Step 1-4 全体:**

- Step 1: 「送る URL を決める」（文字列を決めるだけ）
- Step 2: 「見せる画面を決める」（決めるだけ）
- Step 3: 「準備パネルに情報をまとめる」（文章のみ、JSX なし）
- Step 4: 「Day 30 への導線を置く」（文章のみ）

**問題:**

- **JSX コード、ファイルパス、実装手順が一切ない**
- Day 01-03 が「画面に何かが出る」形式だったのに、Day 04 だけ紙面設計に退行
- `curriculum-ideal-plan.md` L83-250 の「feature-unit 原則」（1日 = 1画面変化）に正面衝突
- L3「今日作ったもの: 友達に送る前の『共有準備パネル』」と書いてあるのに、その共有準備パネルの**コードが本文に存在しない**

**修正案:** Step 3 を以下の JSX 実装に差し替え

```tsx
// src/app/dashboard/page.tsx のタスクカードの下に追加
const sharePrepPanel = {
  url: 'https://example-task-app.vercel.app',
  firstScreen: 'ダッシュボード',
  note: '本番公開は Day 30 で行う',
};

<aside className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
    Share Preview
  </p>
  <h3 className="mt-2 text-xl font-bold text-slate-900">
    友達に送る準備
  </h3>
  <dl className="mt-4 space-y-2 text-sm">
    <div>
      <dt className="font-semibold text-slate-700">送る URL</dt>
      <dd className="text-slate-600">{sharePrepPanel.url}</dd>
    </div>
    <div>
      <dt className="font-semibold text-slate-700">最初に見せる画面</dt>
      <dd className="text-slate-600">{sharePrepPanel.firstScreen}</dd>
    </div>
    <div>
      <dt className="font-semibold text-slate-700">メモ</dt>
      <dd className="text-slate-600">{sharePrepPanel.note}</dd>
    </div>
  </dl>
</aside>
```

保存してブラウザで見たら「共有準備パネルが新しく増えた」が画面上で確認できる → Day 04 が feature-unit に回帰。

---

### 🟡 MAJOR D04-02: 難易度が Day 02 より下（L1-8, L23-33）

**該当 L5:** `目標難易度: 1.3`

**問題:**

- Day 02 (1.1) で JSX を書かせたのに、Day 04 (1.3) は JSX なし
- 難易度曲線が単調増加になっていない（1.0 → 1.1 → 1.2 → **1.3 で退行**）

**修正案:** BLOCKER D04-01 の JSX 追加で自動的に難易度 1.3 相当に回復。

---

### 🟢 MINOR D04-03: Day 30 相対リンクの到達確認なし（L143）

**該当:**

```markdown
[Day 30: 完成版を公開！卒業！](./day30_完成版を公開！卒業！.md)
```

**問題:** Day 30 のファイルが作成済みでない場合、リンク切れ。

**修正案:** リリース前に Day 30 ファイルが存在することを必ず確認（または「Day 30 の教材は順次公開」と注記）。

---

## 横串の問題

### X-01: PORT 番号の不統一

- Day 01: `3001`
- Day 02: `3002`
- Day 03 以降: 言及なし

**対応:** 全日程で `3001` 統一。`package.json` の `dev` スクリプトにも `-p 3001` を固定する検討を推奨。

### X-02: Day 30 への伏線タイミング

- Day 04 で Day 30 を明示的に参照するのは良い
- ただし Day 04 → Day 30 間の Day 05-29 でも **公開を先送りにする意識**が繰り返し必要（購入者が迷子にならないよう）

---

## リリース前対応の優先順位

| # | 項目 | 所要見積 | 担当 |
|---|---|---|---|
| 1 | D01-01: DB シード手順追加 | 10 min | content |
| 2 | D01-02: `管理者` 一本化 | 5 min | content |
| 3 | X-01: Day 02 PORT を 3001 に統一 | 5 min | content |
| 4 | D03-01: `git reset` 削除 + メタファー変更 | 30 min | content |
| 5 | D03-02: git 初期設定手順追加 | 20 min | content |
| 6 | D04-01: 共有準備パネル JSX 追加 | 30 min | content + code |

合計見積: **約 1 時間 40 分**。明日リリース前に十分消化可能。

---

## 検証用 grep コマンド

修正後、以下が全て 0 件になれば BLOCKER 解消確認:

```bash
# Day 02 の 3002 残留チェック
grep -rn "3002" material/30days-curriculum/

# git reset の残留チェック
grep -rn "git reset" material/30days-curriculum/

# User Admin の残留チェック
grep -rn "User Admin" material/30days-curriculum/

# docker compose / db:seed 言及確認（Day 01 に存在すべき）
grep -n "docker compose\|db:seed\|db:push" material/30days-curriculum/day01_*.md
```

---

## 関連ドキュメント

- `docs/evidence/2026-04-18/curriculum-ideal-plan.md` — 仕様ソース
- `docs/evidence/2026-04-18/curriculum-beginner-audit.md` — 先行監査
- `docs/evidence/2026-04-18/final-verdict.md` — 最終判定ログ
- `prompt/instructions/git.instructions.md` — `git reset` 完全禁止ルール
- `prompt/instructions/curriculum-quality-gate.instructions.md` — 教材品質ゲート

---

## 結論（再掲）

🔴 **DO NOT LAUNCH** — 上記 BLOCKER 5 件を全て修正してから再判定が必須。

特に以下は**一行でも誤魔化すと有償教材として致命的**:

1. Day 01 でログインできない（D01-01）
2. Day 03 で `git reset` を教えている（D03-01）
3. Day 04 で画面に何も出ない（D04-01）

これらを片付ければ Day 01-04 は「LAUNCH READY」に復帰可能。

---

## 2026-04-18 ローンチ可否再判定

- 判定日: 2026-04-18（ローンチ前日）
- 判定者: Claude（担当: 内田祐貴ペルソナ）+ Codex MCP（bypass モード）委任
- 対象: `material/30days-curriculum/day01_*.md` 〜 `day04_*.md`

### Phase 1: 既知 BLOCKER 6 件修正（完了）

| ID | ファイル | 修正内容 | 検証 grep | 結果 |
|---|---|---|---|---|
| D01-01 | day01 | `docker compose up -d` / `npm run db:push` / `npm run db:seed` を Step 3 系列に追加 | `docker compose up -d\|db:push\|db:seed` day01 | ✅ 15 hits |
| D01-02 | day01 | 「User Admin」誤導文削除、既定名 `管理者` に統一（`src/command/seed.ts:19-23` 根拠） | `User Admin` day01-04 | ✅ 0 hit |
| D01-03 | day01 | `.env` 準備を `cp .env.example .env` に変更 | `cp \.env\.example` day01 | ✅ hit |
| X-01 / D02-01 | day02 | `3002` → `3001` 統一（Day 01 との整合性）／ `api.report.getOverview.useQuery()` に正す | `3002` day02 | ✅ 0 hit |
| D03-01 | day03 | `git reset --hard` → `git revert --no-edit HEAD`（`git.instructions.md` 違反解消） | `git reset --hard` day03 | ✅ 0 hit |
| D03-02 | day03 | `git push` 前に `gh auth login` / `winget install` の導入手順追加 | `gh auth login\|winget install` day03 | ✅ hit |
| D04-01 | day04 | `<aside>` JSX 実体と `src/app/dashboard/page.tsx` 挿入位置を具体化（feature-unit 原則遵守） | `<aside` day04 | ✅ hit |

### Phase 2: 学習者完走ウォークスルーで発見した BLOCKER-B（完了）

| ID | ファイル | 症状 | 修正内容 |
|---|---|---|---|
| B-D02-01 | day02 | Day 01 との tRPC エンドポイント名不整合（`api.task.getAll` / `tasks?.slice` と記載） | `api.report.getOverview.useQuery()` / `overview.recentTasks` に正し、Day 01 実装と一致させた |
| B-D03-01 | day03 | `gh` CLI 未インストール前提で `gh auth login` を実行させていた | Mac (`brew install gh`) / Windows (`winget install --id GitHub.cli`) のインストール手順を先行追加 |
| B-D04-01 | day04 | Vercel / Neon / DATABASE_URL / JWT_SECRET を Day 04 に持ち込み、**本番公開を Day 30 で行う方針と衝突** | 「共有準備パネル」方式に全面書き換え。Day 04 は共有の下書き、Day 30 で本番公開と明確に分離 |
| B-D04-02 | day04 | `const sharePrepPanel = {...}` を JSX の `<div>` ブロック内に貼らせる手順 → React 構文違反で実行不能 | 手順 2 を「2a: `const` を `return (` の直前に追加」「2b: `<aside>` を JSX ブロックに追加」に分割。React の `const` は JSX 外という制約を教材内に明記 |

### 最終 grep 検証（2026-04-18 実施）

```
rg "3002"              day01-04    → 0 hit ✅
rg "User Admin"        day01-04    → 0 hit ✅
rg "git reset --hard"  day01-04    → 0 hit ✅
rg "docker compose up -d|db:push|db:seed" day01 → 15 hits ✅
rg "git revert|gh auth login|winget install" day03 → 11 hits ✅
rg "sharePrepPanel|手順 2a|手順 2b|<aside" day04 → 19 hits ✅
```

### Verdict: 🟢 **GO (LAUNCH READY)**

**判定理由:**

1. Phase 1 既知 BLOCKER 6 件 + Phase 2 発見 BLOCKER-B 4 件、**計 10 件すべて修正済み**
2. Day 01-04 の「学習者が手順通りに走れば完走できる」状態を確認
3. feature-unit 原則（1 Day = 1 画面変化）を Day 01-04 すべてで遵守
4. 破壊コマンド（`git reset --hard` 等）が教材から完全排除された
5. Day 04 と Day 30 の責務分離（下書き / 本番公開）が明示された

**残課題（ローンチ後対応可）:**

- MAJOR / MINOR 指摘（4+3 件）は本判定のスコープ外。ローンチ後の改訂で継続対応
- Phase 1.5 Linear 風 UI アップグレードは明日ローンチ判定に不要、Day 05 以降の改訂で検討
- Day 05-30 は本日範囲外。同じ品質基準で順次見直すのが次フェーズ

### Day 05-30 への品質基準メモ（引き継ぎ用）

Day 05 以降の改訂時は以下を**最低ライン**として適用する:

1. **feature-unit 原則**: 1 Day = 画面上に見える変化が 1 個以上。コードを書いても画面が変わらない日は作らない
2. **既定値は教材に明記**: `src/command/seed.ts` 等のデフォルト値を参照して、環境依存の曖昧表記（「〜または〜」など）を使わない
3. **破壊コマンド禁止**: `git reset --hard` / `rm -rf` / `DROP` 等は教材で扱わない。取り消しは `git revert` を第一選択
4. **前段依存の明示**: Day N の手順が Day N-1 の成果物に依存する場合、冒頭で前日ゴール達成を前提として明記
5. **コピペ可能性**: JSX / CLI コードブロックは挿入位置（ファイルパス + 直前直後の文字列）を明示し、初学者が迷わずに貼れる形にする
6. **tRPC エンドポイント名の一貫性**: 実装コードベース（`src/server/api/routers/*`）と教材コードが完全一致するか grep で確認する
7. **Playwright / 実機での動作確認**: スクリーンショット差分で教材手順が実際の画面と一致するか、改訂時ごとに検証
8. **依存ツール（`gh` CLI 等）のインストール手順**: 環境前提は OS 別（Mac/Windows）に先行提示する
