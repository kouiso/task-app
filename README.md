#　 horsemanager

## 必要なツール

- Volta
- Node.js v18.16.0
- Yarn v1.22.18

### Volta

Node.js 系は Volta によって管理されています。以下ドキュメントを参考にして Volta を使用してください

[Volta Docs](https://volta.sh/)

## エディターについて

エディターは Visual Studio Code を使用してください

[Visual Studio Code Download](https://azure.microsoft.com/ja-jp/products/visual-studio-code/)

### VSCode 拡張機能について

推奨の拡張機能を`.vscode/extensions.json`に記載していますのでインストールをお願いします

拡張機能の導入についてはこちらを参考にしています

[VSCode の拡張機能・設定を共有](https://qiita.com/otsuky/items/f46f5ee9eb11b3a9a4ba)

### ESLint & Prettier

ESLint & Prettier & StyleLint によって コード の保守及び整形を行っています

- ファイル内容変更時 → ESLint、StyleLint による構文チェック（`.vscode/settings.json`から設定）
- ファイル保存時 → Prettier によるコード自動整形を行う（`.vscode/settings.json`から設定）

[ESLint Docs](https://eslint.org/docs/latest/)

[Prettier Docs](https://prettier.io/docs/en/index.html)

## 環境構築

### npm パッケージのインストール

`yarn install`

### 開発サーバーの起動

`yarn dev`
