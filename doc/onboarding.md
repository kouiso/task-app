# ONBOARDING

チームにジョインしてフロントエンドを立ち上げるところまで

## prerequisite

セットアップとその後の開発に必要な依存をインストール

- Machine: MacOS or Windows WSL2
- Homebrew
- NodeJS: バージョンは.tool-versionsファイル参照

<details>
<summary>複数のnodeバージョン管理</summary>

※複数の node バージョン管理が必要な場合は各自バージョン管理ツールを導入して管理する
まだ未導入であればプラグイン式で全言語の環境管理ができる[asdf](https://asdf-vm.com/guide/getting-started.html#_3-install-asdf)がおすすめ

```bash
# brewを手動インストール後、以下を実行

※ asdfはinstall後パスを繋げて下さい。
$HOME/.asdf/shims/
# バージョン管理
brew install jq asdf

asdf install
asdf reshim
```

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
