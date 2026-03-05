---
applyTo: "**/*.ts,**/*.tsx"
---

# TypeScript規約

**ルール違反は即時タスク失敗。例外一切認めず。**

## Props型命名規約

- **Props型は必ずコンポーネント名+Propsで命名すること**
  - 例: `type ThemedButtonProps = { ... }`
  - 例: `type IdentificationAlertBannerProps = { ... }`
- `type Props = { ... }` のような汎用名は禁止（既存も発見次第リネーム）

## 型安全性

- **as const推奨**: READONLY型保証、型安全性向上
- **実行時バリデーション**: zodスキーマ推奨、複雑自作型ガード禁止

## `any`型の完全禁止

- **対象**: `as any`, `any[]`, `: any`, `<any>`, `Promise<any>`
- **例外**: Biome設定許可ファイルのみ
- **対処法**: 適切型定義、最小限インターフェース、zodスキーマ、ジェネリクス

```typescript
// ❌ 禁止
const data: any = fetchData()
const items: any[] = response.data
const result = value as any

// ✅ 正解
const data: UserResponse = fetchData()
const items: User[] = response.data
const result: User = validateUser(value)
```

## 型アサーション（`as`）の完全禁止

- **対象**: `as any`, `as unknown`, `as SomeType`
- **例外**: `as const`は積極推奨（READONLY型保証）
- **対処法**: 適切型定義、型ガード（`is`キーワード）、zodスキーマ（`safeParse`）、判別共用体

```typescript
// ❌ 禁止
const user = response as User
const id = params.id as string

// ✅ 正解（型ガード）
const isUser = (data: unknown): data is User => {
  return userSchema.safeParse(data).success
}

// ✅ 正解（zodバリデーション）
const result = userSchema.safeParse(response)
if (result.success) {
  const user = result.data
}
```

## 型ユーティリティの積極活用義務

**「自動生成された型だから」は言い訳にならない。TypeScript型ユーティリティで解決せよ。**

- **禁止される言い訳**:
  - ❌ 「Prismaの自動生成型に`createdAt`がないので`any`を使います」
  - ❌ 「型定義を変更できないので型アサーションします」
  - ❌ 「プロパティが存在しないので`as`で回避します」

- **正しいアプローチ**:
  - ✅ **`Omit<T, K>`**: 不要なプロパティを除外
  - ✅ **`Pick<T, K>`**: 必要なプロパティのみ選択
  - ✅ **`Partial<T>`**: 全プロパティをオプショナルに
  - ✅ **`Required<T>`**: 全プロパティを必須に
  - ✅ **`Record<K, T>`**: キーと値の型を定義
  - ✅ **`Readonly<T>`**: ミューテーション防止
  - ✅ **組み合わせ**: `Omit<UserType, 'id'> & { customField: string }`

```typescript
// ❌ 禁止
const updateUser = (user: any) => { ... }

// ✅ 正解
type UpdateUserInput = Omit<User, 'id' | 'createdAt'>
const updateUser = (user: UpdateUserInput) => { ... }
```

## `as`を使った`export`禁止

- **禁止**: `export { A as B }`
- **必須**: 純粋Named Export使用

## アロー関数の原則使用

- **デフォルト**: アロー関数（`const foo = () => {}`）
- **`function`キーワード禁止**: ホイスティングが明示的に必要な場合のみ例外

## AIが`as`を使いたくなる典型シナリオと正しい代替パターン

**このセクションは、AIエージェントが禁止されているにも関わらず繰り返し`as`を出力するパターンを防止するために存在する。「`as`を書く→指摘→修正→また`as`を書く」のループを二度と繰り返すな。**

### シナリオ1: 配列操作でのEnum/Union型マッピング

```typescript
// ❌ AIが繰り返し書くパターン
const items = options.map((opt) => ({
  label: opt.label,
  value: opt.value as ReportReason,
}))

// ✅ 正解: ソースデータの型を制約する
type ReportOption = { label: string; value: ReportReason }
const options: ReportOption[] = [
  { label: 'スパム', value: 'SPAM' },
  { label: '不正利用', value: 'ABUSE' },
]
```

### シナリオ2: イベントハンドラのコールバック引数

```typescript
// ❌ AIが繰り返し書くパターン
onValueChange={(v) => setReason(v as ReportReason)}

// ✅ 正解: 型ガード関数を使う
const REPORT_REASONS = ['SPAM', 'ABUSE', 'HARASSMENT', 'OTHER'] as const
type ReportReason = (typeof REPORT_REASONS)[number]
const isReportReason = (v: string): v is ReportReason =>
  (REPORT_REASONS as readonly string[]).includes(v)

onValueChange={(v) => {
  if (isReportReason(v)) setReason(v)
}}
```

### シナリオ3: APIレスポンスの型処理

```typescript
// ❌ AIが繰り返し書くパターン
const user = response.data as User

// ✅ 正解: 境界でzodバリデーション
const result = userSchema.safeParse(response.data)
if (!result.success) throw new Error('Invalid response')
const user = result.data
```

### シナリオ4: ジェネリックコンポーネントのProps型変換

```typescript
// ❌ AIが繰り返し書くパターン
<Picker selectedValue={reason as string} />

// ✅ 正解
<Picker<ReportReason> selectedValue={reason} />
<TextInput value={String(count)} />
```

### シナリオ5: Null/Undefinedチェック後の型狭化

```typescript
// ❌ AIが繰り返し書くパターン
const user = users.find((u) => u.id === id) as User

// ✅ 正解: undefinedケースをハンドル
const user = users.find((u) => u.id === id)
if (!user) throw new Error(`User not found: ${id}`)
```

### シナリオ6: Object.keys / Object.entries

```typescript
// ❌ AIが繰り返し書くパターン
Object.keys(config).forEach((key) => {
  const value = config[key as keyof Config]
})

// ✅ 正解: Object.entriesを使う
Object.entries(config).forEach(([key, value]) => {
  // keyはstring、valueは正しく型付け
})
```

### シナリオ7: 外部ライブラリの型不一致

```typescript
// ❌ AIが繰り返し書くパターン
const result = externalLib.parse(input) as MyType

// ✅ 正解: 型付きラッパーを作成
const parseInput = (input: string): MyType => {
  const raw = externalLib.parse(input)
  return myTypeSchema.parse(raw)
}
```

### ループ防止チェックリスト

**型変換コードを書く前に必ず確認:**

1. ソースの型を制約できないか？（シナリオ1）
2. 型ガードを使えないか？（シナリオ2）
3. 境界でバリデーションできないか？（シナリオ3, 7）
4. 条件分岐で狭化できないか？（シナリオ5）
5. `Object.entries`を使えないか？（シナリオ6）

**全て「No」なら、アーキテクチャが間違っている。設計し直せ。**

## 心得

- **型エラーは型システムからのメッセージ** → 隠蔽するな、解決しろ
- **TypeScriptは味方** → 型ユーティリティを駆使して正確な型を作れ
- **`any`は敗北** → 型安全性を放棄した証拠
- **`as`は怠惰** → 型チェッカーをバイパスした証拠
