---
name: fix-lint-errors
description: Biomeを使用してコードのリント（構文チェック）とフォーマット（整形）のエラーを修正します。コードスタイルの統一、構文エラーの修正、不要なコードの削除などを行います。
---

# リント・フォーマットエラー修正スキル

このスキルは、TaskAppプロジェクトでBiomeを使用してコードのリント・フォーマットエラーを修正する方法を定義します。

## 適用場面

- コードのリントエラーを修正する場合
- コードのフォーマットを統一する場合
- 構文エラーを修正する場合
- 不要なimportや変数を削除する場合
- コーディング規約に準拠させる場合

## 使用ツール

### Biome

TaskAppプロジェクトでは、**Biome 1.9.4** を使用しています。

**重要**: ESLintやPrettierは使用しません。必ずBiomeを使用してください。

## コマンド

### リントチェック
```bash
npm run lint
```

エラーがある場合、問題箇所が表示されます。

### 自動修正
```bash
npm run lint:fix
```

自動修正可能なエラーを自動的に修正します。

### フォーマット
```bash
npm run format
```

コードを整形します。

## よくあるエラーと修正方法

### 1. 不要なimport

**エラー例**:
```
error[lint/correctness/noUnusedImports]: Unused import
```

**修正方法**:
使用していないimport文を削除します。

```typescript
// ❌ 修正前
import { useState, useEffect, useMemo } from 'react';

export function MyComponent() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

// ✅ 修正後
import { useState } from 'react';

export function MyComponent() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
```

### 2. 未使用の変数

**エラー例**:
```
error[lint/correctness/noUnusedVariables]: Variable is declared but never used
```

**修正方法**:
使用していない変数を削除するか、使用します。

```typescript
// ❌ 修正前
const result = await fetchData();
const unused = "not used";
return result;

// ✅ 修正後
const result = await fetchData();
return result;
```

### 3. any型の使用

**エラー例**:
```
error[lint/suspicious/noExplicitAny]: Unexpected any. Specify a different type.
```

**修正方法**:
明確な型定義を使用します。

```typescript
// ❌ 修正前
function processData(data: any) {
  return data.value;
}

// ✅ 修正後
interface Data {
  value: string;
}

function processData(data: Data) {
  return data.value;
}
```

### 4. console.logの残留

**エラー例**:
```
error[lint/suspicious/noConsoleLog]: Don't use console.log in production code
```

**修正方法**:
デバッグ用のconsole.logを削除します。

```typescript
// ❌ 修正前
export function MyComponent() {
  console.log('rendering');
  return <div>Hello</div>;
}

// ✅ 修正後
export function MyComponent() {
  return <div>Hello</div>;
}
```

### 5. インデント・スペースの問題

**エラー例**:
```
error[format]: Incorrect indentation
```

**修正方法**:
`npm run format` を実行して自動修正します。

## 修正手順

### 1. エラーを確認
```bash
npm run lint
```

### 2. 自動修正を試行
```bash
npm run lint:fix
```

### 3. 手動修正が必要な箇所を修正
自動修正できないエラーは、エラーメッセージを読んで手動で修正します。

### 4. フォーマットを実行
```bash
npm run format
```

### 5. 再度チェック
```bash
npm run lint
```

エラーがなくなるまで繰り返します。

## Biome設定

Biomeの設定は `biome.json` に定義されています。

プロジェクト固有の設定があるため、このファイルを変更する場合は慎重に行ってください。

## Git Hooks

TaskAppプロジェクトでは、Husky + lint-staged を使用して、コミット前に自動的にリント・フォーマットを実行します。

### pre-commit hook
コミット時に自動的に以下が実行されます:
- Biomeによるリントチェック
- Biomeによるフォーマット

エラーがある場合はコミットが中断されるため、修正してから再度コミットしてください。

## ベストプラクティス

1. **頻繁にリントを実行**: コードを書きながら定期的に `npm run lint` を実行
2. **自動修正を活用**: `npm run lint:fix` で自動修正可能なエラーは自動的に修正
3. **型安全性を優先**: any型を避け、明確な型定義を使用
4. **不要なコードを削除**: 使用していないimportや変数は削除
5. **コミット前に確認**: Git hooksが自動的にチェックしますが、手動でも確認する習慣をつける

## 参考資料

- Biome公式ドキュメント: https://biomejs.dev/
- プロジェクトのBiome設定: `biome.json`
- リントスクリプト: `package.json` の `scripts` セクション
