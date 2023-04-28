#　 HorseManager

## エディターについて

エディターは Visual Studio Code を使用してください

[Visual Studio Code Download](https://azure.microsoft.com/ja-jp/products/visual-studio-code/)

### VSCode 拡張機能について

推奨の拡張機能を`.vscode/extensions.json`に記載していますのでインストールをお願いします

拡張機能の導入についてはこちらを参考にしています

[VSCode の拡張機能・設定を共有](https://qiita.com/otsuky/items/f46f5ee9eb11b3a9a4ba)

### TODO Highlight について

コメントアウトに「TODO: 」と「FIXME: 」を挿入することができます。ユースケースは以下で統一します

- TODO: - 今後対応すべきタスクを記載。個人メモや他者宛てのメッセージなど。
- FIXME: - 今すぐ対応できないが、修正すべきコードの近くに記載。

## フロントエンド開発環境構築

### 必要なツール

- Node.js v16.15.0
- Yarn v1.22.18

上記ツールは Volta によって管理されています以下ドキュメントを参考にして Volta を使用してください

[Volta Docs](https://volta.sh/)

### npm パッケージのインストール

`yarn install`

### 開発サーバーの起動

`yarn dev`

### ビルド

`yarn build`

### ESLint & Prettier

ESLint & Prettier & StyleLint によって コード の保守及び整形を行っています

- ファイル内容変更時 → ESLint、StyleLint による構文チェック（`.vscode/settings.json`から設定）
- ファイル保存時 → Prettier によるコード自動整形を行う（`.vscode/settings.json`から設定）

[ESLint Docs](https://eslint.org/docs/latest/)

[Prettier Docs](https://prettier.io/docs/en/index.html)

### StoryBook

StoryBook を導入しています

サーバー起動コマンド `yarn storybook`

静的エクスポート `yarn build-storybook`

### Redux DevTools

Chrome の拡張機能`Redux DevTools`を使用できます。

必要であれば適宜インストールしてください。

[Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd?hl=ja)

## フロントエンド コンポーネント作成手順

コンポーネントを作成する際は コンポーネント名を冠したディレクトリを作成し、その中にファイルを作成してください

※ 必ずしも下記ファイルを揃える必要はありません、必要に応じて適宜作成・追加してください

例：

ExampleComponent/
├── index.module.scss（Sass ファイル）
├── index.stories.tsx（StoryBook ファイル）
├── index.test.tsx（テストファイル）
└── index.tsx（React コンポーネント）

## フロントエンド テストについて

下記の記事の内容を参考にし、テストを進めます

[フロントエンドのテスト戦略について考える](https://zenn.dev/koki_tech/articles/a96e58695540a7)

以下 5 つの種類のテストを行い、アプリケーションコードの品質、信頼性をキープします

- 静的テスト
- 単体テスト
- 結合テスト
- E2E テスト
- ビジュアルリグレッションテスト

### 静的テスト

静的解析や静的型付言語などを用いたテスト

- ESLint
- StyleLint
- TypeScript

### 単体テスト

最小単位の関数やコンポーネントのテスト

- Jest
- testing-library/react
- testing-library/react-hooks

FIXME: React コンポーネントのスナップショットテストは css modules と jest の相性が悪いので使えないので直したい
https://qiita.com/toshiokun/items/20d14dbcc6277c24cc11

### 結合テスト

関数、コンポーネント、hooks などを組み合わせて正しく動作するかテスト

- testing-library/react
- testing-library/react-hooks

FIXME: css modules のエラーを解消しないと結合テストできなさそう。直したい
https://qiita.com/toshiokun/items/20d14dbcc6277c24cc11

### E2E テスト

ブラウザ上でユーザーと同じユースケースを想定したシステム全体のテスト

- PlayWright

### ビジュアルリグレッションテスト

UI の差分を検証するテスト

- StoryBook

## TypeDoc について

[TypeDoc docs](https://typedoc.org/)

TypeDoc のドキュメント出力：`yarn typedoc:out`

TypeDoc のドキュメントサーバー起動：`yarn typedoc:view`

## Capacitor でのビルド方法

事前に下記ツールをインストールしておいて下さい

- Xcode
- Android Studio

参考 URL
[Capacitor Docs](https://capacitorjs.jp/docs/getting-started)

### ios 環境 の build ディレクトリを追加

```bash
- iOS 用ディレクトリ＆設定を追加
npx cap add ios

- Xcodeでプロジェクトを開く
npx cap open ios

-----
error: tool 'xcodebuild' requires Xcode, but active developer directory '/Library/Developer/CommandLineTools' is a command line tools instance

※上記エラー発生時は以下コマンドで対処可能
$ sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

### Android 環境 の build ディレクトリを追加

```bash
- Android用ディレクトリ＆設定を追加
npx cap add android

- Android Studio でプロジェクトを開く
npx cap open android
```

### ビルド済みの WebApp を ios & android に同期する

実装を ios と android に反映するには以下の手順を行います

1. `yarn build`で WebApp をビルドする
2. `yarn build:sync`で WebApp の内容を`ios`と`android`に同期する

## Firebase Emulator の起動方法

ローカルで Firebase の仮想環境を扱うことができる Firebase Local Emulator Suite を使用して開発を進めます。

開発の際は必ずこちらを使用してください。なお、環境変数で制御されているので開発時と本番ビルド時で処理を変える必要はありません。

Emulator UI から現在起動中のエミュレーターのステータスを確認できます。

起動コマンド : `yarn firebase:emulate`

Emulator UI : `http://localhost:4001`

[Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)

## BitBucket Pipeline について

BitBucket Pipeline を使用した CI/CD を採用しています。

### CI を実行する

`run-ci`タグを付与してプッシュすることで CI が実行されます。

タグを付与しないと CI は実行されません。
