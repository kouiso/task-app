# 販売用 ZIP（task-app-curriculum-v1.1.zip）の中身

`scripts/build-zip.sh` をリポジトリのルートで実行すると作られます。

## 商品は2点

| # | 中身 | 置き場所 |
|---|---|---|
| 1 | **教材PDF 36冊** | `make book-pdf` で `dist/pdf/` に出力。**ZIP には入れません**。Drive フォルダ `1LXf2Ws7MKN0hBjEGCU6W3CmwH5Y4GjxU` に届けます（既存ファイルの内容を更新して同一IDを維持。`scripts/pdf-book/pdf-link-map.json` が現行の配布IDを指します。認証経路は下の「Drive 配布の認証方式」を参照） |
| 2 | **写経用の土台コード（この ZIP）** | `task-app-curriculum-v1.1.zip`。同じ Drive フォルダへ `task-app-curriculum-v1.1.zip` として配布しています（ファイル ID: `1JGcp9mhde-MOD97CcIjKacHgcD38OLkr`） |

読者は PDF を見ながら、この ZIP を展開して写経します。
更新前後にファイルID・名前・親フォルダ・共有権限を照合します。更新後は同じIDから内容を読戻し、ローカル成果物のSHA256と一致することを確認します。

## Drive 配布の認証方式

配布フォルダへの操作は **OAuth 経路のみ**で行います。サービスアカウントは使いません。サービスアカウントの新規発行・GCP プロジェクトでの API 有効化・外部プログラム（Developer Preview 等）への申請も禁止です。Drive を操作する自作コード（rclone スクリプト等）はリポジトリに置きません。操作経路は **ブラウザ** または **接続済みのOAuthコネクタ・Remote MCP** です。

### Devin からの操作: Google Drive Remote MCP のみ

Devin の org に登録済みの **Google Drive Remote MCP**（`google-drive` サーバー）を使います。org 側で接続済みの OAuth をそのまま使うため、作業環境側での認証情報の準備は不要です。

- 参照・検証: `search_files`（`parentId = '1LXf2Ws7MKN0hBjEGCU6W3CmwH5Y4GjxU'` で一覧）、`get_file_metadata`、`get_file_permissions`、`download_file_content`
- 新規ファイルの作成: `create_file` に `title`・`parentId`・`contentMimeType` を指定し、バイナリは `base64Content` で渡します

このDevin Remote MCPには既存ファイルの内容を更新する手段がありません。`create_file` で同名ファイルを作ると別 ID になり、配布済み PDF 内の章間リンクと `pdf-link-map.json` が古い ID を指して壊れます。同一 ID 維持が必要な上書きには使わないでください。

### Codexからの上書き: Google Driveコネクタ

接続済みGoogle Driveコネクタの `update_file` は、既存の `fileId` とPDF・ZIPのファイル参照を指定して内容を更新できます。ID・名前・親フォルダ・共有権限を保つ更新には、この経路を使えます。`upload_file` による新規作成や、同名ファイルの作成で置き換えないでください。

更新機能の有無は接続先ごとに確認します。Devin Remote MCPの制限を、別のコネクタにも当てはめないでください。接続済みコネクタで更新できない場合は、下のブラウザ経路を使います。

### 作業者による上書き: ブラウザの「バージョンを管理」

既存ファイルの同一IDを維持する再配布では、作業者がブラウザの Drive 画面で行います。対象ファイルを右クリック →「バージョンを管理」→「新しいバージョンをアップロード」で、ファイル ID と共有設定を維持したまま内容だけを差し替えられます（教材PDF・写経用 ZIP 共通）。新規ファイルの追加はフォルダへのドラッグ＆ドロップで構いません。

## PDFの章間リンクを設定する

章間リンクがある原稿では、生成前に配布先のJSONを用意します。
`PDF_BOOK_LINK_MAP` に、そのファイルの絶対パスを指定してください。

```sh
PDF_BOOK_LINK_MAP=/absolute/path/pdf-link-map.json make book-pdf
```

JSONのキーは出力するPDF名、値は購入者が開くHTTPS URLです。
URLは先に確定した配布先を使います。原稿へDrive IDを書く必要はありません。

```json
{
  "day01_開発環境を整えて、初めてのアプリを動かそう.pdf": "https://drive.google.com/file/d/EXISTING_FILE_ID/view"
}
```

`name` と `url` を持つオブジェクトの配列も受け付けます。
既存Driveファイルのメタデータを使えば、同じIDへのリンクを維持できます。
生成処理はDriveの内容や公開権限を変更しません。

未登録の章リンクや未知のローカル参照がある場合は、生成前に停止します。
別冊への `#見出し` 指定も、PDF側の移動先を保証できないため停止します。
同冊の `#見出し` と外部HTTPリンク、画像、コード内の例は変更しません。
章間リンクがない原稿は、環境変数を指定せず生成できます。

相対パスを `.pdf` に変えるだけでは、組版時にlocalhostへ絶対化されます。
この経路では可搬性のある相対PDFリンクを保証しません。
生成後は `make book-pdf-verify` で、中間URLが残っていないことも検査します。

## この ZIP に入るもの

`build-zip.sh` は**許可リスト方式**です。下に挙げたものだけを集めて固めます。
名指しで挙げていないものは、除外条件を書かなくても入りません。

### ルート直下（`required_files`）

- `README.md`
- `.env.example`
- `.mise.toml`
- `.node-version`
- `doc/SUPPORTED_ENVIRONMENTS.md`
- `scripts/scaffold-from-scratch.sh`
- `scripts/verify-scaffold-database.cjs`

1つでも欠けると `build-zip.sh` は途中で止まります。

### 写経の土台（`support_directories`・13ディレクトリ）

`scaffold-from-scratch.sh` が展開先へ配るファイル群です。

`_app-api-trpc` / `_app-base` / `_app-components` / `_constants` / `_docker` / `_lib-base` /
`_lib-utils` / `_prisma` / `_seed` / `_server-base` / `_server-routers` / `_trpc-base` / `_ui-components`

`_server-routers` からは6本（`project.ts` `task.ts` `search.ts` `comment.ts` `report.ts` `user.ts`）を外しています。
**この6本は読者が教材を写経して自分で書くもの**だからです。

## この ZIP に入らないもの

### 教材そのもの

`material/` は丸ごと入りません。教材は PDF 36冊として別に渡します。

**理由**: 読者は PDF を開いて読みながら、この ZIP を展開したフォルダへ写経します。
PDF と同じ中身の原稿 Markdown を並べても使い道がなく、画面写真（13MB）は PDF へ
焼き込み済みで二重持ちになります。`material/` の下には他に、別商品の見本 PDF
（`sample/`）・社内向けの手引き（`pr-reviewer-rule.md` `dev-guide.md` `onboarding.md`）・
組版用の CSS（`style/`）・内部メタ（`30days-curriculum/_meta/`）も入っており、
買い手が ZIP を開いた瞬間にこれらが出てくると、それだけで商品の信用が落ちます。

`build-zip.sh` は `material/` を build ディレクトリへ集めません。集めた後に外すのではなく
最初から集めないので、混入の経路そのものがありません。`check-sale-package.sh` の
`non_product_entries` が `task-app/material/` を1つでも見つけたら失敗します。

### 完成アプリ本体（意図的に入れていません）

`package.json` / `package-lock.json` / `src/` / `prisma/` / `tsconfig.json` / `next.config.ts` / `biome.json`。

**理由**: `scaffold-from-scratch.sh` は `create-next-app` から始めます。`package.json` が先にあると
その工程を飛ばしてしまい、読者は「自分で作った」という手応えを得られません。
`check-sale-package.sh` がこれらの混入を検出して失敗させます。

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
