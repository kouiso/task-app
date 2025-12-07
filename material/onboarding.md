# ONBOARDING

チームにジョインしてフロントエンドを立ち上げるところまで

## prerequisite

セットアップとその後の開発に必要な依存をインストール

- Machine: MacOS or Windows WSL2
- Homebrew
- NodeJS: バージョンはpackage.jsonのvoltaフィールド参照

<details>
<summary>複数のnodeバージョン管理</summary>

※複数の node バージョン管理が必要な場合は各自バージョン管理ツールを導入して管理する
まだ未導入であれば[Volta](https://volta.sh/)がおすすめ

```bash
# Voltaのインストール (macOS/Linux)
curl https://get.volta.sh | bash

# Voltaのインストール (Windows)
# https://docs.volta.sh/guide/getting-started からインストーラーをダウンロード

# Node.jsのインストール
volta install node@24.11.1
```

このプロジェクトでは `package.json` に Volta の設定が含まれているため、
プロジェクトディレクトリで自動的に正しいバージョン (24.11.1) が使用されます。

</details>

## 初回設定

### 環境変数

- dev環境の.envを以下のURLから取得する
  [develop]()
  localの開発環境もこれで動かします。

```bash
# firebaseの認証情報
NEXT_PUBLIC_API_KEY=
NEXT_PUBLIC_AUTH_DOMAIN=
NEXT_PUBLIC_PROJECT_ID=
NEXT_PUBLIC_STORAGE_BUCKET=
NEXT_PUBLIC_MESSAGING_SENDER_ID=
NEXT_PUBLIC_APP_ID=
NEXT_PUBLIC_MEASUREMENT_ID=
```

## セットアップ手順

- `npm ci` で packageをinstall
- `npm run build` で ビルド実行
- `npm run dev` で packageをinstall

```bash
npm ci
npm run build
npm run dev
```

(知っておくと便利)

- `npm run lint`
  - 実行するとprettier, eslint, stylelintのコードチェックが順次に走る
- `npm run fix`
  - 実行するとprettier, eslint, stylelintのコードチェックが順次に走る
