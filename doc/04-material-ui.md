# Day 04: Material-UIの基本コンポーネント

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **MUIのテーマ設定を理解する** | デザインシステム構築 | ✅ テーマをカスタマイズできる |
| **基本コンポーネントを使える** | UI実装 | ✅ Button, TextField, Cardを使える |
| **レイアウトコンポーネントを使える** | 画面構成 | ✅ Box, Grid, Containerを使える |

## 💼 なぜこれを学ぶのか?

Material-UI(MUI)は、Googleのマテリアルデザインに基づいた**最も人気のあるReact UIライブラリ**です。

- **一貫したデザイン**: 統一されたルック&フィールを簡単に実現
- **アクセシビリティ**: キーボード操作やスクリーンリーダー対応が組み込み済み
- **カスタマイズ性**: テーマで色やフォントを自由に変更可能

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | テーマとProvider | 2ステップ | 15分 |
| **Part 2** | 基本コンポーネント | 3ステップ | 25分 |
| **Part 3** | レイアウトコンポーネント | 2ステップ | 20分 |
| **合計** | - | **7ステップ** | **約60分** |

---

## 実装内容

### Part 1: テーマとProvider(15分)

#### Step 1.1: MUIテーマの設定を理解する(所要時間:8分)

**このステップで学ぶこと**: MUIのテーマシステムとカスタマイズ方法。

**なぜ必要?**: テーマを設定することで、アプリ全体の配色やフォントを一括管理できます。ブランドカラーを変えたいときも、テーマを変更するだけで済みます。

**コードの仕組み解説**:
- `createTheme()`: カスタムテーマを作成
- `palette`: 色の設定(primary, secondary, error など)
- `mode`: ライト/ダークモードの切り替え

以下のコードを確認してください(既存ファイル):

```typescript
// filepath: src/app/providers.tsx
'use client';

import { TRPCReactProvider } from '@/trpc/react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Toaster } from 'react-hot-toast';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',  // メインカラー(青)
    },
    secondary: {
      main: '#dc004e',  // アクセントカラー(赤)
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCReactProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
        <Toaster />
      </ThemeProvider>
    </TRPCReactProvider>
  );
}
```

**テーマの色について**:
| キー | 用途 | デフォルト色 |
|------|------|-------------|
| primary | メインアクション、リンク | 青(#1976d2) |
| secondary | 補助的なアクション | 赤(#dc004e) |
| error | エラー表示 | 赤 |
| warning | 警告表示 | オレンジ |
| success | 成功表示 | 緑 |

**確認方法**:
1. `src/app/providers.tsx`を開く
2. `primary.main`の色コードを変更してみる
3. ブラウザで色が変わることを確認

---

#### Step 1.2: CssBaselineとスタイルリセット(所要時間:7分)

**このステップで学ぶこと**: CssBaselineの役割と重要性。

**なぜ必要?**: ブラウザにはデフォルトのスタイル(余白やフォントサイズ)があり、ブラウザごとに微妙に異なります。CssBaselineを使うことで、これらをリセットし、一貫した見た目を実現します。

**コードの仕組み解説**:
- `CssBaseline`: グローバルなCSSリセット
- ボックスサイズを`border-box`に設定
- bodyのマージンを0に設定
- デフォルトのフォントを適用

```typescript
import CssBaseline from '@mui/material/CssBaseline';

// ThemeProviderの直下に配置
<ThemeProvider theme={theme}>
  <CssBaseline />  {/* ここでリセット */}
  {children}
</ThemeProvider>
```

**確認方法**:
1. CssBaselineをコメントアウトしてみる
2. ページの余白が変わることを確認
3. 元に戻す

---

### Part 2: 基本コンポーネント(25分)

#### Step 2.1: Buttonコンポーネント(所要時間:8分)

**このステップで学ぶこと**: MUIのボタンのバリエーションと使い方。

**なぜ必要?**: ボタンはユーザーインタラクションの基本です。MUIのButtonは、一貫したスタイルと優れたアクセシビリティを提供します。

**コードの仕組み解説**:
- `variant`: ボタンのスタイル(contained, outlined, text)
- `color`: ボタンの色(primary, secondary, error など)
- `startIcon` / `endIcon`: アイコンの配置
- `disabled`: 無効状態

```typescript
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

// 塗りつぶしボタン(主要アクション)
<Button variant="contained" color="primary">
  保存
</Button>

// 枠線ボタン(二次的アクション)
<Button variant="outlined" color="secondary">
  キャンセル
</Button>

// テキストボタン(軽いアクション)
<Button variant="text">
  詳細を見る
</Button>

// アイコン付きボタン
<Button variant="contained" startIcon={<AddIcon />}>
  タスクを追加
</Button>

// 無効状態
<Button variant="contained" disabled>
  送信中...
</Button>
```

**確認方法**:
1. ログインページ(`src/app/login/page.tsx`)を開く
2. Buttonコンポーネントの使われ方を確認

---

#### Step 2.2: TextFieldコンポーネント(所要時間:8分)

**このステップで学ぶこと**: 入力フィールドの実装方法。

**なぜ必要?**: フォーム入力はWebアプリの基本機能です。TextFieldはラベル、エラー表示、ヘルパーテキストなど、フォームに必要な機能が揃っています。

**コードの仕組み解説**:
- `label`: 入力フィールドのラベル
- `error`: エラー状態の表示
- `helperText`: 補足テキストやエラーメッセージ
- `type`: 入力タイプ(text, password, email など)
- `fullWidth`: 親要素の幅いっぱいに広げる

```typescript
import { TextField } from '@mui/material';

// 基本的な使い方
<TextField
  label="メールアドレス"
  type="email"
  fullWidth
/>

// エラー表示
<TextField
  label="パスワード"
  type="password"
  error={true}
  helperText="パスワードは8文字以上必要です"
  fullWidth
/>

// 必須フィールド
<TextField
  label="タスク名"
  required
  fullWidth
/>

// 複数行入力
<TextField
  label="説明"
  multiline
  rows={4}
  fullWidth
/>
```

**確認方法**:
1. 登録ページ(`src/app/register/page.tsx`)を開く
2. TextFieldの使われ方を確認

---

#### Step 2.3: Card / Paper コンポーネント(所要時間:9分)

**このステップで学ぶこと**: コンテンツを囲むコンテナコンポーネント。

**なぜ必要?**: CardとPaperは、関連するコンテンツをグループ化して表示するのに使います。影(elevation)をつけることで、要素の階層を視覚的に表現できます。

**コードの仕組み解説**:
- `Card`: 構造化されたコンテンツ用(ヘッダー、コンテンツ、アクション)
- `Paper`: シンプルな背景コンテナ
- `elevation`: 影の強さ(0〜24)
- `CardContent`: カード内のコンテンツ領域
- `CardActions`: カード内のアクションボタン領域

```typescript
import { Card, CardContent, CardActions, Paper, Typography, Button } from '@mui/material';

// Cardの使い方
<Card>
  <CardContent>
    <Typography variant="h5">タスク名</Typography>
    <Typography color="text.secondary">
      タスクの説明文がここに入ります
    </Typography>
  </CardContent>
  <CardActions>
    <Button size="small">編集</Button>
    <Button size="small" color="error">削除</Button>
  </CardActions>
</Card>

// Paperの使い方
<Paper elevation={3} sx={{ p: 2 }}>
  <Typography>シンプルなコンテナ</Typography>
</Paper>
```

**確認方法**:
1. ダッシュボード(`src/app/dashboard/page.tsx`)を開く
2. CardとPaperの使われ方を確認

---

### Part 3: レイアウトコンポーネント(20分)

#### Step 3.1: Box / Container コンポーネント(所要時間:10分)

**このステップで学ぶこと**: 基本的なレイアウトコンテナの使い方。

**なぜ必要?**: BoxはMUIの最も基本的なレイアウトコンポーネントです。`sx`プロパティを使って、柔軟にスタイリングできます。Containerはページの最大幅を制限するのに使います。

**コードの仕組み解説**:
- `Box`: 汎用的なコンテナ(`<div>`相当)
- `Container`: 最大幅を制限したコンテナ
- `sx`: インラインスタイルをテーマに沿って記述
- `component`: 使用するHTML要素を指定

```typescript
import { Box, Container } from '@mui/material';

// Boxの基本的な使い方
<Box sx={{ p: 2, m: 1, bgcolor: 'background.paper' }}>
  コンテンツ
</Box>

// Flexboxレイアウト
<Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
  <span>左</span>
  <span>右</span>
</Box>

// Containerで最大幅を制限
<Container maxWidth="sm">
  <p>最大幅600pxのコンテナ</p>
</Container>

// maxWidthの値
// 'xs': 444px, 'sm': 600px, 'md': 900px, 'lg': 1200px, 'xl': 1536px
```

**sxプロパティのショートハンド**:
| 短縮形 | 意味 | 例 |
|--------|------|-----|
| p | padding | `p: 2` → padding: 16px |
| m | margin | `m: 1` → margin: 8px |
| px | padding左右 | `px: 2` → paddingLeft/Right: 16px |
| py | padding上下 | `py: 1` → paddingTop/Bottom: 8px |
| mt | marginTop | `mt: 2` → marginTop: 16px |
| mb | marginBottom | `mb: 2` → marginBottom: 16px |

**確認方法**:
1. ログインページを開く
2. Containerでフォームが中央に配置されていることを確認

---

#### Step 3.2: Gridコンポーネント(所要時間:10分)

**このステップで学ぶこと**: レスポンシブなグリッドレイアウトの実装。

**なぜ必要?**: Gridを使うと、画面サイズに応じてレイアウトが自動的に調整されるレスポンシブデザインを実現できます。

**コードの仕組み解説**:
- `Grid container`: グリッドのコンテナ
- `Grid item`: グリッドのアイテム
- `xs`, `sm`, `md`, `lg`, `xl`: ブレークポイントごとの列数(12列システム)
- `spacing`: アイテム間の余白

```typescript
import { Grid, Card, CardContent, Typography } from '@mui/material';

// 基本的なグリッド
<Grid container spacing={3}>
  <Grid item xs={12} sm={6} md={4}>
    <Card>
      <CardContent>
        <Typography>カード1</Typography>
      </CardContent>
    </Card>
  </Grid>
  <Grid item xs={12} sm={6} md={4}>
    <Card>
      <CardContent>
        <Typography>カード2</Typography>
      </CardContent>
    </Card>
  </Grid>
  <Grid item xs={12} sm={6} md={4}>
    <Card>
      <CardContent>
        <Typography>カード3</Typography>
      </CardContent>
    </Card>
  </Grid>
</Grid>
```

**グリッドシステムの解説**:
- 全体が12列で構成
- `xs={12}`: 小さい画面では1行1カード
- `sm={6}`: 中程度の画面では1行2カード
- `md={4}`: 大きい画面では1行3カード

```
xs(〜600px): |------ 12 ------|  → 1列
sm(600px〜): |-- 6 --|-- 6 --|   → 2列
md(900px〜): |4 | 4 | 4 |       → 3列
```

**確認方法**:
1. ダッシュボード(`src/app/dashboard/page.tsx`)を開く
2. 統計カードのGridレイアウトを確認
3. ブラウザの幅を変えて、レイアウトが変わることを確認

---

## ✅ 今日の成果

以下の内容を理解できたことを確認しましょう:

1. **テーマ設定**: createThemeでカスタマイズ
2. **Button**: variant, color, アイコン
3. **TextField**: label, error, helperText
4. **Card/Paper**: コンテンツのグループ化
5. **Box/Container**: 基本レイアウト
6. **Grid**: レスポンシブレイアウト

---

## まとめ

- **ThemeProvider**: アプリ全体の配色とスタイルを管理
- **CssBaseline**: ブラウザのデフォルトスタイルをリセット
- **Button**: ユーザーアクションのトリガー
- **TextField**: テキスト入力フィールド
- **Card/Paper**: コンテンツのグループ化
- **Box**: 汎用コンテナ(`sx`でスタイリング)
- **Grid**: 12列グリッドシステム

次回(Day 5)では、Prismaを使ったデータベース操作の基礎を学びます。
