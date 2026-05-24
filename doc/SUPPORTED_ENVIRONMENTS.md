# Supported Environments

このドキュメントは TaskApp 教材と開発環境のサポート対象を明文化するものです。
Day01 の環境構築手順、`README.md`、CI/ローカル検証の前提条件はこの表に合わせます。

## サポート対象

| 項目 | サポート対象 | 固定・確認元 | 確認コマンド |
|------|--------------|--------------|--------------|
| OS | macOS 13 以上 | Day01 setup E2E の対象 | `sw_vers` |
| OS | Windows 11 + WSL2 | Day01 setup E2E の対象 | `wsl.exe --version` / `lsb_release -a` |
| OS | Ubuntu 22.04 LTS | Day01 setup E2E の対象 | `lsb_release -a` |
| Node.js | 22.x | `.mise.toml` の `node = "22.22.2"` / `package.json` の `engines.node >=22` | `node -v` |
| npm | 10.x | Node.js 22 同梱 npm を基準 | `npm -v` |
| PostgreSQL | 16-alpine | `docker-compose.yml` の `postgres:16-alpine` | `docker compose ps` |
| Docker runtime | Docker Desktop または OrbStack | ローカル PostgreSQL 起動に使用 | `docker -v` / `docker compose version` |
| エディタ | VS Code 推奨 | 教材本文の操作説明に合わせる | `code --version` |

## バージョン管理方針

- Node.js は mise で固定します。初回セットアップ時は `mise install` を実行してください。
- npm は Node.js 22 系に同梱される 10.x 系をサポート対象にします。
- PostgreSQL はローカルに直接インストールせず、`docker-compose.yml` の `postgres:16-alpine` を使います。
- Docker runtime は Docker Desktop または OrbStack をサポート対象にします。Windows は WSL2 上で Docker Desktop 連携を有効にしてください。

## Day01 Setup E2E 確認項目

各 OS で Day01 の環境構築が成立することを確認するときは、次の手順を実行し、結果を PR または証跡ファイルに残します。

| 確認 | コマンド | 成功条件 |
|------|----------|----------|
| Node.js 固定 | `mise install && node -v` | `v22.x.x` が表示される |
| npm 確認 | `npm -v` | `10.x.x` が表示される |
| 依存関係インストール | `npm install` | エラーなく完了する |
| PostgreSQL 起動 | `docker compose up -d` | `db` と `test-db` が起動する |
| Prisma 生成 | `npm run db:generate` | Prisma Client 生成が成功する |
| アプリ起動 | `npm run dev` | `http://localhost:3000` が表示できる |
| テスト DB 確認 | `npm test` | Vitest が実行できる |

## OS 別の注意点

### macOS 13 以上

- Docker Desktop または OrbStack のどちらかを起動してから `docker compose up -d` を実行します。
- Apple Silicon / Intel のどちらも Docker の Linux コンテナ上で `postgres:16-alpine` を使います。

### Windows 11 + WSL2

- 作業ディレクトリは WSL2 の Linux ファイルシステム側に置きます。
- Docker Desktop の WSL integration を有効にします。
- コマンドは WSL2 のシェルから実行します。

### Ubuntu 22.04 LTS

- Docker Engine と Docker Compose plugin が利用できる状態にします。
- 権限エラーが出る場合は、ユーザーを `docker` グループへ追加し、シェルを開き直してください。

## サポート外

- Node.js 20.x 以下
- npm 9.x 以下または 11.x 以上を前提にした検証
- PostgreSQL 15 以下、または Docker 以外で直接起動した PostgreSQL
- Windows の PowerShell / cmd.exe だけでの実行
- Ubuntu 20.04 以下または 24.04 以上を前提にした未検証環境
