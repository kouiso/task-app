# 販売用 ZIP（task-app-curriculum-v1.1.zip）の中身

`scripts/build-zip.sh` をリポジトリのルートで実行すると作られます。

## 商品は2点

| # | 中身 | 置き場所 |
|---|---|---|
| 1 | **教材PDF 36冊** | `make book-pdf` で `dist/pdf/` に出力。**ZIP には入れません**。買い手には PDF として別に渡します |
| 2 | **写経用の土台コード（この ZIP）** | `task-app-curriculum-v1.1.zip` |

読者は PDF を見ながら、この ZIP を展開して写経します。

## この ZIP に入るもの

`build-zip.sh` は**許可リスト方式**です。下に挙げたものだけを集めて固めます。
「あとから除外する」という処理はありません。

### ルート直下（`required_files`）

- `README.md`
- `.env.example`
- `.mise.toml`
- `.node-version`
- `doc/SUPPORTED_ENVIRONMENTS.md`
- `scripts/scaffold-from-scratch.sh`

1つでも欠けると `build-zip.sh` は途中で止まります。

### 写経の土台（`support_directories`・13ディレクトリ）

`scaffold-from-scratch.sh` が展開先へ配るファイル群です。

`_app-api-trpc` / `_app-base` / `_app-components` / `_constants` / `_docker` / `_lib-base` /
`_lib-utils` / `_prisma` / `_seed` / `_server-base` / `_server-routers` / `_trpc-base` / `_ui-components`

`_server-routers` からは6本（`project.ts` `task.ts` `search.ts` `comment.ts` `report.ts` `user.ts`）を外しています。
**この6本は読者が教材を写経して自分で書くもの**だからです。

### 教材本体

`material/30days-curriculum/` — Markdown 36本 ＋ `screenshots/` の画面写真。

## この ZIP に入らないもの

### 完成アプリ本体（意図的に入れていません）

`package.json` / `package-lock.json` / `src/` / `prisma/` / `tsconfig.json` / `next.config.ts` / `biome.json`。

**理由**: `scaffold-from-scratch.sh` は `create-next-app` から始めます。`package.json` が先にあると
その工程を飛ばしてしまい、読者は「自分で作った」という手応えを得られません。
`check-sale-package.sh` がこれらの混入を検出して失敗させます。

### 商品外のファイル（買い手には無関係）

`material/sample/`（別商品の見本 PDF）／`material/pr-reviewer-rule.md`（社内のレビュー規則）／
`material/dev-guide.md`／`material/onboarding.md`（開発者向け）／`material/style/`（PDF 組版用の CSS）／
`material/30days-curriculum/_meta/`（内部メタ）／`material/30days-curriculum/style/`／`material/pdf/`。

`build-zip.sh` の zip 除外と `check-sale-package.sh` の `non_product_entries` の2箇所で止めています。

### その他

`.git/` `node_modules/` `.github/` `.claude/` `dist/` `coverage/` などは、
そもそも許可リストに載っていないので集められません。
`scripts/curriculum-qa/`（教材の検査ツール）も同じ理由で入りません。

## 確認のしかた

```sh
bash scripts/build-zip.sh
```

`build-zip.sh` は最後に `scripts/curriculum-qa/check-sale-package.sh` を呼びます。
このスクリプトが次の4つを見て、1つでも外れていれば失敗します。

1. 必須ファイルが全部あるか
2. 土台の13ディレクトリのファイルが全部あるか（読者が書く6本を除く）
3. 完成アプリ本体が混入していないか
4. 商品外のファイルが混入していないか

中身を自分の目で確かめるなら:

```sh
unzip -l task-app-curriculum-v1.1.zip | less
```

**注意**: この ZIP には完成アプリの `package.json` も `src/` も入りません。
展開して `npm install` や `npm run build` を走らせても動きません。
動かすには `scripts/scaffold-from-scratch.sh` を実行して土台を作るところから始めます。
その手順は Day 01 の教材に書いてあります。
