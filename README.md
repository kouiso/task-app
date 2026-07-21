# タスク管理アプリ 30日間ハンズオン教材

## プロジェクト概要

本教材は、Next.js 15 / TypeScript / tRPC / Prisma を使ったタスク管理アプリを
公式の Next.js 土台と教材スターターから 30 日間で作り上げる、実践的な有償ハンズオン教材です。
共通 UI や設定ファイルはスターターとして用意し、各日の中心機能は教材に沿って実装します。

30 日を終えると、以下の機能を備えたプロダクションレベルのアプリが手元に残ります。

- ユーザー認証（JWT ベースのログイン・登録）
- プロジェクト管理（CRUD・メンバー招待・ロール管理）
- タスク管理（CRUD・ステータス遷移・作業時間の記録）
- コメント機能（投稿・編集・削除・権限チェック）
- 検索・フィルタリング（キーワード・ステータス・担当者・期限）
- レポート・ダッシュボード（円グラフ・週次統計）
- ユーザー管理（管理者用一覧・プロフィール編集）

---

## 前提条件

作業を始める前に以下を確認してください。

| ツール | バージョン | 確認コマンド |
|--------|-----------|------------|
| OS | macOS 13+ / Ubuntu 22.04 / Windows 11 (WSL2) | `sw_vers` / `lsb_release -a` |
| Node.js | 22.x | `node -v` |
| npm | 10.x | `npm -v` |
| Docker runtime | Docker Desktop / OrbStack / Docker Engine | `docker -v` |
| PostgreSQL | 16-alpine（Docker Compose で起動） | `docker compose ps` |
| エディタ | VS Code 推奨 | — |

詳細なサポート環境と Day01 setup E2E の確認項目は
[`doc/SUPPORTED_ENVIRONMENTS.md`](doc/SUPPORTED_ENVIRONMENTS.md) を参照してください。
PostgreSQL は Docker Compose 経由で起動するため、ローカルへの個別インストールは不要です。

---

## はじめかた

### 1. ZIP を展開する

配布された ZIP ファイルを任意のディレクトリに展開してください。

```
task-app/
  .env.example      <- 環境変数の見本
  .mise.toml        <- mise を使う場合の Node.js バージョン設定
  README.md         <- セットアップ案内
  material/          <- 教材（Day 01 〜 Day 30 の Markdown）
  scripts/           <- セットアップスクリプトとスターター素材
```

展開直後には `package.json` や `src` はありません。
Day 01 で公式の `create-next-app` を実行し、教材用スターターを配置します。

mise を使っている場合は、展開後の `task-app` で
`mise trust && mise install` を実行してから Day 01 を進めます。

### 2. Day 01 を開く

最初に、次の教材を開いてください。

`material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md`

Day 01 では、必要なツールの確認から順番に進めます。
README の段階では `npm run dev` や scaffold をまだ実行しません。

Day 01 で実行する scaffold は、次の処理を自動化します。

- Next.js 15 の新規プロジェクト生成（`create-next-app`）
- 共通 UI、設定ファイル、前半で必要な API の配置
- `.env` ファイルの生成（`.env.example` をコピー）
- 依存パッケージのインストール（`npm install`）
- Docker コンテナの起動（PostgreSQL）
- データベースマイグレーションとシードデータの投入

API の一部は、後の日の画面を先に動かせるスターターです。
対象の日には既存コードを読み、教材の手順で置き換えながら仕組みを学びます。

---

## カリキュラム構成

| Phase | Day | タイトル |
|-------|-----|---------|
| Phase 1: 環境構築・即公開 | Day 01 | 開発環境を整えて、初めてのアプリを動かそう |
| | Day 02 | ダッシュボードに自分だけのメッセージを追加しよう |
| | Day 03 | GitHub に保存しよう |
| | Day 04 | ネットに公開しよう |
| Phase 2: ログイン機能 | Day 05 | ログイン画面の UI を作ろう |
| | Day 06 | ユーザー登録画面を作ろう |
| | Day 07 | ログイン体験を改善しよう |
| | Day 08 | サイドバーを完成させよう |
| Phase 3: プロジェクト管理 | Day 09 | プロジェクト一覧画面を作ろう |
| | Day 10 | プロジェクト新規作成を実装しよう |
| | Day 11 | プロジェクト編集・削除を実装しよう |
| | Day 12 | メンバー追加を実装しよう |
| Phase 4: タスク管理 | Day 13 | タスク一覧画面を作ろう |
| | Day 14 | タスク新規作成を実装しよう |
| | Day 15 | タスク編集・削除を実装しよう |
| | Day 16 | ステータス変更・時間記録を実装しよう |
| | Day 17 | 自分のタスクページを作ろう |
| Phase 5: コメント・検索 | Day 18 | コメント投稿を実装しよう |
| | Day 19 | コメント編集・削除を実装しよう |
| | Day 20 | タスク検索機能を実装しよう |
| Phase 6: ダッシュボード・レポート | Day 21 | 統計カードを表示しよう |
| | Day 22 | グラフを表示しよう |
| | Day 23 | 週次レポートを表示しよう |
| Phase 7: ユーザー管理 | Day 24 | ユーザー一覧（管理者用）を作ろう |
| | Day 25 | プロフィール編集を実装しよう |
| Phase 8: 仕上げ・完成公開 | Day 26 | エラーページを作って、バグを退治しよう |
| | Day 27 | プロジェクト詳細・アーカイブを実装しよう |
| | Day 28 | タスク一括操作を実装しよう |
| | Day 29 | ユーザー詳細・編集ページを作ろう |
| | Day 30 | 完成版を公開！卒業！ |

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 15（App Router） |
| 言語 | TypeScript 5.8 |
| API 層 | tRPC 11.8 |
| ORM | Prisma 6.16（Client）/ 6.19（CLI） |
| データベース | PostgreSQL（Docker） |
| UI コンポーネント | shadcn/ui + Tailwind CSS v4 |
| フォーム | react-hook-form + zod |
| グラフ | Recharts 3.2 |
| テスト | Vitest 3.0 |
| リンター | Biome |

---

## テストの実行方法

```bash
# Docker コンテナが起動していることを確認
docker compose up -d

# テストを実行
npm test
```

テスト用データベースは `TEST_DATABASE_URL` に設定されたポート（デフォルト: 25533）を使用します。
`.env` の設定を変更した場合は、ポート番号が `docker-compose.yml` と一致しているか確認してください。

---

## 環境変数

`.env.example` をコピーして `.env` を作成し、必要に応じて値を編集してください。
スキャフォルドスクリプトを実行すると自動でコピーされます。

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | Prisma が使うメイン DB の接続 URL |
| `TEST_DATABASE_URL` | Vitest が使うテスト用 DB の接続 URL |
| `JWT_SECRET` | JWT 署名用シークレット（32 文字以上必須） |
| `NODE_ENV` | 実行環境（`development` / `production`） |

---

## トラブルシューティング

よくある問題と解決方法は付録を参照してください。

- `material/30days-curriculum/appendix_トラブルシューティング.md`

主な確認ポイント：

- Docker が起動しているか（macOS・Windows は Docker Desktop、Ubuntu は Docker Engine）
- `.env` が存在するか（`ls .env` で確認）
- ポートが競合していないか（デフォルト: DB=25532, テストDB=25533, アプリ=3000）

---

## ライセンス

本教材は購入者個人の学習目的にのみ使用できます。
第三者への再配布・転売・無断公開は禁止します。
