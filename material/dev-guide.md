# 開発ガイド

## コマンド

package.jsonのscriptの箇所を参照
npm-run-allで様々なコマンドを一括で動かせるようにしています。

以下のコマンドはpackage.jsonにはコメントを書くとエラーを起こすので、ここで説明が必要なものは記載していく。

- `devs:scss`など複数形になっているもの。

  - 何らかの理由で、npm run allによって自動起動したくないものを複数形にした。打ち間違えではない。いずれ解決したいもの。

- `"build": "run-s build:*",`

  - // buildだけはaspidaとorvalを吐き出してからbuild:serverをやったほうがいいので、順次実行させるためにnpm-run-allを使っている

- `"compile": "npm run build:compile",`
  - github actionでは実行しないが、ファイル等を生成させておくために実行するコマンド。github actionのときには、orvalやaspidaを吐き出すことが出来ないので、このようにしておく。

## パッケージ管理

npm を使用します。理由としては、

- yarnのバージョンで大きく挙動が異なるため却下した
- Voltaとの親和性が高く、バージョン管理が容易

## Debugger

任意の位置で実行を止めて変数確認やコード実行が可能

1. ブレイククポイントを設定 (任意の行をクリックし、赤丸を付ける)
1. backend 起動状態で、VSCode の `Next.js: debug full stack`
   を実行するとデバッガーがアタッチされる

## コーディング規約

- ディレクトリ・ファイル

  - 超基本的なことだが、全てのコンポーネント関数はパスカルケースで定義する。カスタムフックはキャメルケースで定義する。

  - すべてのディレクトリ・ファイル名は ケバブケース & **単数形** とする
    → 単数形・複数形は議論の余地有りだが、日本語話者にとって可算名詞・不可算名詞の区別は難しいため、すべて単数に統一することで混乱を避ける

  - 本リポジトリではNext.jsのApp Routerを採用した。
  - 原則ドメイン/urlごとにcomponentやpageを分割する。
  - ドメインの垣根を越える場合に初めて、app直下に該当のフォルダを配置することが検討される
    → dir構成に関しては議論の余地有りだが、ドメイン/url毎に管理することで『あのコンポーネントどこだっけ？』を無くす狙い
    例: 認証系 【auth】の画面ならば、(auth)/sing-up/page.tsx, URLは/sign-up, (auth)/component/button/google-auth-button.tsx

  - スタイルは`scss module`以前まで使用していたが、MUIに全切り替えする。sass が 残っていたら気付いたらMUIへの移行をお願いしたい

- 環境変数

  - ローカルにのみ影響を及ぼす環境変数は `_` prefix をつける

- 文法

  - `as` による型推論上書きは外部からの入力を受ける場合以外は使用しない
    - 例: `const foo = bar as string` // NG

- eslint系統

  - exportが必要な際には、原則そのファイル内で主体とするものをexportしたい場合、export defaultを使用する。つまりexport defaultを使用していないのに、named exportは禁止とする。

- URLや画面遷移の取り扱いについて

  - 画面遷移時に, `useNavigate`等を使用して、画面遷移を行うが、これらはroute dir内にある `PAGE_CONSTANT`を使用すること。
    ※ Next.jsでdynamic routingのobjectを出力する方法があった気がするのでそれを要調査

## api型定義自動生成

apiの型定義を手動で作るのは面倒。。。
そう思い、ここではopenapi.ymlを使った型定義の自動生成を積極的に取り入れています。

### 下準備

- 対象リポジトリ: `horsemanager-backend`

  - 本repositoryでは、上記対象repositoryを起動していればコマンドを実行するだけで、swagger-jsonを自動で見に行くので、コマンドを実行するだけです。

  下記の両方とも`npm run compile`をやれば、自動生成される。

#### apiクライアント

- aspida

  - キャッシュを使用しない通常のapiでは[aspidaのREADME](https://github.com/aspida/aspida/blob/main/packages/aspida/docs/ja/README.md)を使用する。

- orval
  - キャッシュ管理したいものは上記のaspidaに加えて[orvalのREADME](https://orval.dev/)を使用する
  - orvalを使用すればaxiosと@tanstack/react-queryを使ってopenapi.ymlを見てソースコードを自動生成してくれる。

上記を踏まえ、本repositoryでは以下のように使い分ける。

- キャッシュが必要ないものに関しては、aspida
- キャッシュでデータ保持をさせたいものに関しては、orvalを使う

## その他ライブラリについて

特に無し

# SCSS Coding Guidelines

このプロジェクトでは、SCSSのクラス命名規則としてBEM（Block Element Modifier）を使用します。以下のガイドラインに従ってください。

## 基本ルール

1. **Block**: コンポーネントのルートクラス。PascalCaseで命名します。
2. **Element**: Blockの一部である要素。Block名の後にアンダースコア（\_）を付けてPascalCaseで命名します。
3. **Modifier**: BlockまたはElementのバリエーション。アンダースコア（\_）を付けてcamelCaseで命名します。

## 注意点

- **Block**はPascalCaseで命名します。
- **Element**はBlock名の後にアンダースコア（\_）を付けてPascalCaseで命名します。
- **Modifier**はアンダースコア（\_）を付けてcamelCaseで命名します。
- **Element**はBlockの中にネストして記述します。
- **Modifier**は対応するBlockまたはElementの中にネストして記述します。
