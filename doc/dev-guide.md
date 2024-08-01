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
  - github actionでは実行しないが、ファイル等を生成させておくために実行するコマンド。github actionのときには、orvalやaspidaを吐き出す必要はないので、このようにしておく。

## パッケージ管理

npm を使用します。
理由としては、yarnやpnpmはasdfでは使用ができないことと, yarnのバージョンで大きく挙動が異なるため却下した

## Debugger

任意の位置で実行を止めて変数確認やコード実行が可能

1. ブレイククポイントを設定 (任意の行をクリックし、赤丸を付ける)
1. backend 起動状態で、VSCode の `Attach to NestJS Container`
   を実行するとデバッガーがアタッチされる

## コーディング規約

- ディレクトリ・ファイル

  - 超基本的なことだが、全てのコンポーネント関数はパスカルケースで定義する。カスタムフックはキャメルケースで定義する。

  - すべてのディレクトリ・ファイル名は ケバブケース & **単数形** とする
    → 単数形・複数形は議論の余地有りだが、日本語話者にとって可算名詞・不可算名詞の区別は難しいため、すべて単数に統一することで混乱を避ける

  - 本リポジトリでは共通化するためのコンポーネントが多いため、原則ドメインごとにcomponentやpageを分割する。特にsrc/pageに関してはNext.jsのようなURLに対して直感的な構成ではないので注意!
    → pageのdir構成は議論の余地有りだが、URLはroutes配下を見れば分かるのと、ディレクトリ構成を見直すことはあっても、URL自体を見直す機会はあまり存在しない。ドメインごとに管理することで『あのコンポーネントどこだっけ？』を無くす狙い
    例: 認証系 【auth】の画面ならば、page/auth/sing-up-page.tsx, URLは/sign-up, component/auth/button/google-auth-button.tsx

  - 実際にそのURLで表示されるpageの概念に相当するファイルの場合には、`page.tsx`と命名する。

  - スタイルは`scss module`を使って定義する。コンポーネントやページに属するscssのファイル名は`style.module.scss`とする。

- 環境変数

  - ローカルにのみ影響を及ぼす環境変数は `_` prefix をつける

- 文法

  - `as` による型推論上書きは外部からの入力を受ける場合以外は使用しない
    - 例: `const foo = bar as string` // NG

- eslint系統

  - /icon, /page ディレクトリ配下はlazy importするので、default export を許可してある。それ以外ではdefault exportは禁止とする。

- URLや画面遷移の取り扱いについて

  - 画面遷移時に, `useNavigate`等を使用して、画面遷移を行うが、これらはroute dir内にある `PAGE_CONSTANT`を使用すること。

## api型定義自動生成

apiの型定義を手動で作るのは面倒。。。
そう思い、ここではopenapi.ymlを使った型定義の自動生成を積極的に取り入れています。

### 下準備

- 対象リポジトリ: `nbo-yomcoma-api`

  - 本repositoryでは、上記対象repositoryのreader-webを起動していればコマンドを実行するだけで、swagger-jsonを自動で見に行くので、コマンドを実行するだけです。

  下記の両方とも`npm run compile`をやれば、自動生成される。

#### apiクライアント

- aspida

  - キャッシュを使用しない通常のapiでは[aspida](https://github.com/aspida/aspida/blob/main/packages/aspida/docs/ja/README.md)を使用する。

- orval
  - キャッシュ管理したいものは上記のaspidaに加えて[orval](https://orval.dev/)を使用する
  - orvalを使用すればaxiosと@tanstack/react-queryを使ってopenapi.ymlを見てソースコードを自動生成してくれる。

上記を踏まえ、本repositoryでは以下のように使い分ける。

- キャッシュが必要ないものに関しては、aspida
- キャッシュでデータ保持をさせたいものに関しては、orvalを使う

ちなみにorvalでビルド実行時に以下のようなWarningが出ているが、Vite特有のものであり、検証済みなので無視して構わない。

```bash
▲ [WARNING] "import.meta" is not available with the "cjs" output format and will be empty [empty-import-meta]

    src/lib/firebase/index.ts:21:17:
      21 │   measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
         ╵                  ~~~~~~~~~~~

  You need to set the output format to "esm" for "import.meta" to work correctly.

Your mutator file doesn't have the default exported function
```

## その他ライブラリについて

- husky
  - .huskyrcを入れておかないと、vscodeでcommitをした際に `command not fount npm`となってしまう。

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
