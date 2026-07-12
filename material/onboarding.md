# ONBOARDING

チームにジョインしてフロントエンドを立ち上げるところまでを解説します。

## prerequisite

セットアップとその後の開発に必要な依存をインストールします。

- Machine: MacOS or Windows WSL2
- Homebrew
- NodeJS: バージョンは package.json の engines.node を参照

<details>
<summary>複数のnodeバージョン管理</summary>

※複数の node バージョン管理が必要な場合は各自バージョン管理ツールを導入して管理する
まだ未導入であれば、プラグイン式で全言語の環境を管理できる[asdf](https://asdf-vm.com/guide/getting-started.html#_3-install-asdf)をおすすめします。

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
  localの開発環境もこれで動かす。

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

- `task init` で環境初期化（Docker起動、依存インストール、DB作成・シーディング）
- `npm run dev` で 開発サーバー起動

```bash
task init
npm run dev
```

> `task init` は冪等（何度でも実行可能）です。環境をクリーンな状態にリセットできます。

(知っておくと便利)

- `npm run lint`
  - 実行するとBiomeのコードチェックが走る
- `npm run fix`
  - 実行するとBiomeの自動修正が走る
