# Tailwind Pro Patterns

- target version: `tailwindcss` `4.1.18`（v4 系） + `tailwindcss-animate` `1.0.7`
- last updated: `2026-04-19`
- purpose: `30日カリキュラム Before/After セクションで使う Pro パターン参照資料`

`task-app` の [`src/app/globals.css`](/Users/kouiso/ghq/kouiso/task-app/src/app/globals.css:1) はすでに `@import "tailwindcss";` と `@theme inline` を使い、shadcn/ui 系コンポーネントでは `cva` と `cn()` で variant を構成している。ここではその現状を踏まえ、Phase 0-E で学習者に渡しやすい Tailwind v4 の Pro パターンを整理する。

## Pattern 1: v4 では `@theme` を design token の入口にする

`task-app` はすでに `@theme inline` を採用している。教材でも最初からこの形にすると、色・radius・animation を utility と CSS 変数の両方で扱える。

### Before
```css
@import "tailwindcss";

:root {
  --brand-blue: #1976d2;
  --brand-surface: #f7fafc;
}
```

### After
```css
@import "tailwindcss";

@theme inline {
  --color-primary: hsl(var(--primary));
  --color-card: hsl(var(--card));
  --radius-md: calc(var(--radius) - 2px);
}

@layer base {
  :root {
    --primary: 212 100% 54%;
    --card: 0 0% 100%;
    --radius: 0.5rem;
  }
}
```

### Why
- token 定義と utility 生成が直結し、`bg-primary` や `rounded-md` を自然に使える。
- CSS 変数だけを置くより、Tailwind 側の設計意図が明確になる。
- `globals.css` を見ればデザイン基盤が分かるため、教材との往復がしやすい。

**該当Day**: Day 01, Day 08

## Pattern 2: arbitrary value 多用より design token を先に切る

Dashboard などで inline style が混じる箇所もあるが、学習教材ではまず token 化を優先したい。`#1976d2` をコード中に散らさない。

### Before
```tsx
export function PrimaryCard() {
  return (
    <div className="rounded-[14px] border border-[#d7e3f4] bg-[#1976d2] px-[18px] py-[14px] text-white">
      プロジェクト
    </div>
  );
}
```

### After
```tsx
export function PrimaryCard() {
  return (
    <div className="rounded-lg border border-border bg-primary px-4 py-3 text-primary-foreground">
      プロジェクト
    </div>
  );
}
```

### Why
- 色・余白・角丸の表現を token 名で共有でき、画面横断の一貫性が出る。
- デザイン変更時に置換対象が `globals.css` と variant 定義へ寄る。
- arbitrary value が減るほど、レビュー時に「例外値」が目立ちやすい。

**該当Day**: Day 02, Day 08, Day 21

## Pattern 3: variant の組み合わせは `cva` に集約する

[`src/component/ui/button.tsx`](/Users/kouiso/ghq/kouiso/task-app/src/component/ui/button.tsx:1) が代表例。button / badge / alert のような再利用 UI は class を呼び出し側へ散らさない。

### Before
```tsx
type ButtonProps = {
  danger?: boolean;
  small?: boolean;
  children: React.ReactNode;
};

export function Button({ danger, small, children }: ButtonProps) {
  const className = [
    'inline-flex items-center justify-center rounded-md font-medium',
    danger ? 'bg-red-500 text-white' : 'bg-blue-500 text-white',
    small ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
  ].join(' ');

  return <button className={className}>{children}</button>;
}
```

### After
```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      size: {
        default: 'h-10 px-4 text-sm',
        sm: 'h-8 px-3 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'destructive';
  size?: 'default' | 'sm';
};

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
```

### Why
- variant の組み合わせが型として見えるので、呼び出し側の表記揺れを防げる。
- UI primitive の責務が安定し、feature 側が class の詳細を知らなくて済む。
- `cn()` とセットで override 位置を統一できる。

**該当Day**: Day 05, Day 10, Day 14

## Pattern 4: dark mode は `.dark` 直書きだけでなく data attribute で切り替え可能にしておく

現状の `task-app` は `.dark` トークンを持っている。今後テーマ切り替えを Day 26 以降に入れるなら、attribute 起点でも動く構造にしておくと拡張しやすい。

### Before
```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 213 27% 14%;
  }

  .dark {
    --background: 213 27% 8%;
    --foreground: 0 0% 98%;
  }
}
```

### After
```css
@import "tailwindcss";

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 213 27% 14%;
  }

  [data-theme='dark'] {
    --background: 213 27% 8%;
    --foreground: 0 0% 98%;
  }
}
```

### Why
- `html[data-theme=dark]` で切り替えられ、テーマ管理ライブラリとの接続が楽になる。
- utility 側は `dark:bg-card dark:text-foreground` のまま保てる。
- DOM ルートに状態を置けるので、layout 単位の切り替えとも相性が良い。

**該当Day**: Day 08, Day 26

## Pattern 5: レイアウト分岐は viewport だけでなく container query も使う

`task-app` では `container mx-auto max-w-*` は使っているが、カード内部の崩れ方は container query を使うと素直になる。特に dashboard card や project detail の情報量に向く。

### Before
```tsx
export function ProjectStatsCard() {
  return (
    <section className="grid gap-4 rounded-xl border p-4 md:grid-cols-2">
      <div>完了率</div>
      <div>担当者数</div>
    </section>
  );
}
```

### After
```tsx
export function ProjectStatsCard() {
  return (
    <section className="@container rounded-xl border p-4">
      <div className="grid gap-4 @md:grid-cols-2">
        <div>完了率</div>
        <div>担当者数</div>
      </div>
    </section>
  );
}
```

### Why
- 親幅に応じて内部レイアウトを切り替えられ、再利用コンポーネントの自由度が上がる。
- sidebar の有無や split view など、同じ viewport でも幅が違うケースに強い。
- page 固有の breakpoint 調整を減らし、部品単位で完結した UI を作りやすい。

**該当Day**: Day 09, Day 21, Day 27

## Pattern 6: animation は `tailwindcss-animate` と token を組み合わせる

[`src/app/globals.css`](/Users/kouiso/ghq/kouiso/task-app/src/app/globals.css:53) の accordion keyframes が土台。dialog / sheet / dropdown でも同じ考え方で animation を token 化すると整う。

### Before
```tsx
export function LoadingSpinner() {
  return <div className="animate-spin rounded-full border-2 border-blue-500 border-b-transparent" />;
}
```

### After
```css
@import "tailwindcss";
@plugin "tailwindcss-animate";

@theme inline {
  --animate-fade-up: fade-up 0.24s ease-out;

  @keyframes fade-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

```tsx
export function LoadingSpinner() {
  return (
    <div className="flex items-center gap-2 animate-fade-up">
      <div className="size-4 animate-spin rounded-full border-2 border-primary border-b-transparent" />
      <span>読み込み中</span>
    </div>
  );
}
```

### Why
- motion 名を token として管理でき、複数コンポーネントで再利用しやすい。
- plugin 提供 utility と自前 keyframes を混在させても命名が整理される。
- page ごとの場当たり animation を減らし、体験の統一感が出る。

**該当Day**: Day 08, Day 16, Day 26

## Pattern 7: shadcn/ui は生成物をそのまま使わず、token と data attribute に寄せて育てる

`task-app` の `ui/` 配下は shadcn/ui ベース。Tailwind v4 では token と `data-[state=*]` を前提に整える方が長持ちする。

### Before
```tsx
import { Content } from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

type SimpleDialogContentProps = {
  children?: ReactNode;
  className?: string;
};

export function SimpleDialogContent(props: SimpleDialogContentProps) {
  return (
    <Content
      className="fixed left-1/2 top-1/2 w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg"
      {...props}
    />
  );
}
```

### After
```tsx
import { Content } from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SimpleDialogContentProps = {
  children?: ReactNode;
  className?: string;
};

export function SimpleDialogContent(props: SimpleDialogContentProps) {
  const { className, ...rest } = props;

  return (
    <Content
      className={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...rest}
    />
  );
}
```

### Why
- primitive の状態を `data-[state=*]` で受けると、ロジックを増やさず見た目だけ差し替えられる。
- background / border / shadow を token に乗せることで、全テーマで一貫した見た目になる。
- shadcn/ui の再生成や差し替えが入っても、設計方針を保ちやすい。

**該当Day**: Day 08, Day 18, Day 26

## 適用マトリクス

| Pattern | Day |
|---|---|
| `@theme` を入口にする | Day 01, Day 08 |
| token を優先する | Day 02, Day 08, Day 21 |
| `cva` で variant を組む | Day 05, Day 10, Day 14 |
| dark mode を data attribute 対応にする | Day 08, Day 26 |
| container query を使う | Day 09, Day 21, Day 27 |
| animation を token 化する | Day 08, Day 16, Day 26 |
| shadcn/ui を token ベースで育てる | Day 08, Day 18, Day 26 |
