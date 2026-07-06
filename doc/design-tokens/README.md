# Design Tokens

## 1. 定義しているトークン

このプロジェクトでは、shadcn/ui の semantic token 命名を維持しながら、`src/app/globals.css` に以下のトークンを定義しています。

- カラー: `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`
- 補助カラー: `--success`, `--warning`, `--chart-1` から `--chart-5`, `--sidebar-*`
- タイポグラフィ: `--font-sans`, `--font-mono`
- 角丸: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`
- シャドウ: `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- モーション: `--ease-linear-out`, `--duration-fast`, `--duration-base`, `--duration-slow`

light / dark の実値は `:root` と `.dark` にあり、Tailwind からは semantic 名で参照します。

## 2. なぜ Linear 風なのか

paid-curriculum の Done Definition 軸 E「ワクワク感」を満たすためです。Linear.app / Vercel / Arc browser の方向性は、学習者が作った画面を SNS に載せたときに「教育用サンプル」ではなく「プロダクトっぽい」と感じてもらいやすく、教材の体験価値と商品価値を上げやすいからです。

今回は特に次の要素をトークンに落とし込んでいます。

- 深い slate 系の dark background
- 高コントラストな violet / indigo 系 primary
- 余白と角丸を締めたシャープな surface
- 重すぎない soft shadow

## 3. 学習者はどう使うか

基本は semantic token を Tailwind utility としてそのまま使います。

```tsx
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground shadow-sm">
    保存
  </button>
</div>
```

よく使う例:

- ページ背景: `bg-background text-foreground`
- 強い CTA: `bg-primary text-primary-foreground`
- 補助ボタンや面: `bg-secondary text-secondary-foreground`
- 控えめな説明: `text-muted-foreground`
- hover 面: `bg-accent text-accent-foreground`
- 入力: `border-input bg-background focus-visible:ring-primary/12`
- カード: `bg-card text-card-foreground rounded-lg shadow-sm`

## 4. arbitrary value を使う基準

原則は token を優先します。`bg-[#...]`, `text-[11px]`, `rounded-[13px]` のような arbitrary value は、教材全体で再利用しない一回限りの表現にだけ使ってください。

レビュー基準は次の通りです。

- 既存 token で表現できるなら token を使う
- 1 画面だけの演出でも、今後複数日で再利用しそうなら token へ昇格を検討する
- arbitrary value を入れた場合は、レビューで「なぜ token では足りないか」を説明できる状態にする
