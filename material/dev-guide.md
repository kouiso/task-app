# 開発ガイド

## コマンド

package.json の script の箇所を参照
npm-run-all で様々なコマンドを一括で動かせるようにしています。

以下のコマンドは package.json にはコメントを書くとエラーを起こすので、ここで説明が必要なものは記載していく。

- `devs:scss` など複数形になっているもの。

  - 何らかの理由で、npm run all によって自動起動したくないものを複数形にした。打ち間違えではない。いずれ解決したいもの。

- `"build": "run-s build:*",`

  - // build だけは aspida と orval を吐き出してから build:server をやったほうがいいので、順次実行させるために npm-run-all を使っている

- `"compile": "npm run build:compile",`
  - github action では実行しないが、ファイル等を生成させておくために実行するコマンド。github action のときには、orval や aspida を吐き出すことが出来ないので、このようにしておく。

## パッケージ管理

npm を使用します。理由は以下のとおりです。

- volta で Node.js のバージョンを管理しているため
- yarn のバージョンで大きく挙動が異なるため却下した

## Debugger

任意の位置で実行を止めて変数確認やコード実行が可能です。

1. ブレイククポイントを設定 (任意の行をクリックし、赤丸を付ける)
1. backend 起動状態で、VSCode の `Next.js: debug full stack`
   を実行するとデバッガーがアタッチされる

## コーディング規約

- ディレクトリ・ファイル

  - 超基本的なことだが、全てのコンポーネント関数はパスカルケースで定義する。カスタムフックはキャメルケースで定義する。

  - すべてのディレクトリ・ファイル名は ケバブケース & **単数形** とする
    → 単数形・複数形は議論の余地有りだが、日本語話者にとって可算名詞・不可算名詞の区別は難しいため、すべて単数に統一することで混乱を避ける

  - 本リポジトリでは Next.js の App Router を採用した。
  - 原則ドメイン/url ごとに component や page を分割する。
  - ドメインの垣根を越える場合に初めて、app 直下に該当のフォルダを配置することを検討する。
    → dir 構成には議論の余地があるが、ドメインや URL ごとに管理することで『あのコンポーネントはどこか』を探しやすくする狙いがある。
    例: 認証系【auth】の画面ならば、(auth)/sign-up/page.tsx（URL は/sign-up）、(auth)/component/button/google-auth-button.tsx

  - スタイルは `scss module` 以前まで使用していたが、shadcn/ui + Tailwind CSS に全切り替えする。sass が 残っていたら気付いたら shadcn/ui への移行をお願いしたい

- 環境変数

  - ローカルにのみ影響を及ぼす環境変数は `_` prefix をつける

- 文法

  - `as` による型推論上書きは外部からの入力を受ける場合以外は使用しない
    - 例: `const foo = bar as string` // NG

- biome 系統

  - export が必要な際には、原則そのファイル内で主体とするものを export したい場合、export default を使用する。つまり export default を使用していないのに、named export は禁止とする。

- URL や画面遷移の取り扱いについて

  - 画面遷移時に、`useRouter`（`next/navigation`）等を使用して画面遷移するが、これらは route dir 内にある `PAGE_CONSTANT` を使用すること。
    ※ Next.js で dynamic routing の object を出力する方法があった気もするため、要調査

## api 型定義の自動生成

api の型定義を手動で作るのは面倒です。
そう思い、ここでは openapi.yml を使った型定義の自動生成を積極的に取り入れています。

### 下準備

- 対象リポジトリ: `horsemanager-backend`

  - 本 repository では、上記対象 repository を起動していれば、swagger-json を自動で見に行くので、コマンドを実行するだけでよい。

  下記の両方とも `npm run compile` をやれば、自動生成される。

#### api クライアント

- aspida

  - キャッシュを使用しない通常の api では[aspida の README](https://github.com/aspida/aspida/blob/main/packages/aspida/docs/ja/README.md)を使用する。

- orval
  - キャッシュ管理したいものは上記の aspida に加えて[orval の README](https://orval.dev/)を使用する
  - orval を使用すれば axios と@tanstack/react-query を使って openapi.yml を見てソースコードを自動生成してくれる。

上記を踏まえ、本 repository では以下のように使い分ける。

- キャッシュが必要ないものに関しては、aspida
- キャッシュでデータ保持をさせたいものに関しては、orval を使う

## その他ライブラリについて

特にありません。

# SCSS Coding Guidelines

このプロジェクトでは、SCSS のクラス命名規則として BEM（Block Element Modifier）を使用します。以下のガイドラインに従ってください。

## 基本ルール

1. **Block** はコンポーネントのルートクラス。PascalCase で命名する。
2. **Element** は Block の一部である要素。Block 名の後にアンダースコア（\_）を付けて PascalCase で命名する。
3. **Modifier** は Block または Element のバリエーション。アンダースコア（\_）を付けて camelCase で命名する。

## 注意点

- **Block**は PascalCase で命名する。
- **Element**は Block 名の後にアンダースコア（\_）を付けて PascalCase で命名する。
- **Modifier**はアンダースコア（\_）を付けて camelCase で命名する。
- **Element**は Block の中にネストして記述する。
- **Modifier**は対応する Block または Element の中にネストして記述する。
