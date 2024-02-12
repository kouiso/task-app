
# horsemanager

## 環境構築手順

前提
本PJではvscodeであれば、dev-containerの拡張機能を入れてdockerで起動すると共通の環境が立ち上がります。
つまり、dev-containerを使えば面倒な環境構築が自動です。

なので以下の設定はdev-containerを使わない立ち上げ方、もしくはこのプロジェクトがどのようにして立ち上げているかを確認するためです。


1. brewをinstall
[Brewのinstall](https://brew.sh/ja/)

Windowsの場合にはscoopを使用
[scoopのinstall](https://scoop.sh/)


2. voltaを設定する

```bash
brew install volta
```

Windowsの場合

```bash
scoop bucket add main
scoop install main/volta
```



### clone後の環境構築手順
一度設定が終わればcloneした時にはここから始めれば良いはずです。


1. .envの編集
`.env.development.example` をコピーして `.env.development` を作成してください。


1. プロジェクトのルートディレクトリで、以下のコマンドを実行して依存関係をインストールします。
```bash
yarn install
```

## 実行方法
1. プロジェクトが正しくセットアップされたら、以下のコマンドで開発サーバーを起動します。
```bash
yarn dev
```

2. ブラウザを開き `http://localhost:3000` にアクセスして、プロジェクトが正しく表示されることを確認します。
