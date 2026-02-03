# Day 05: ログイン画面のUIを作ろう

## 🎯 今日のゴール

shadcn/uiとTailwind CSSを使って、美しいログイン画面を作ります。メールアドレスとパスワードの入力欄、ログインボタンを配置して、プロフェッショナルなUIを実装します。

【スクリーンショット: 完成したログイン画面】

## 🤔 なぜこれを作るのか？

ログイン機能は、ほとんどのWebアプリに必要な基本機能です。まずはUIを作ることで、Reactのコンポーネントやイベントハンドリングを実践的に学べます。また、shadcn/uiを使うことで、デザインの知識がなくても美しいUIを作れます。

> 💡 **例え話**: お店の入り口が汚かったら、中に入りたくなくなりますよね。ログイン画面は、アプリの「玄関」です。第一印象が大事なので、見た目にもこだわります。

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | ログインページを作成 | 10分 |
| Step 2 | フォームコンポーネントを作成 | 15分 |
| Step 3 | バリデーションを追加 | 15分 |
| Step 4 | デザインを調整 | 10分 |

**合計時間**: 約50分

---

### Step 1: ログインページを作成（10分）

🎯 **ゴール**: `src/app/login/page.tsx`を作成して、ログインページのベースを作ります。

🔰 **初心者向け解説**: Next.jsでは、`src/app`フォルダ内にフォルダを作成すると、自動的にルートが作成されます。`login`フォルダを作って、その中に`page.tsx`を作成すると、`/login`でアクセスできるようになります。

💻 **実装**:

```typescript
// filepath: src/app/login/page.tsx
export default function LoginPage() {
  return (
    <div>
      <h1>ログイン</h1>
    </div>
  );
}
```

🔍 **コード解説**:

| コード | 意味 | 例え |
|--------|------|------|
| `export default` | このコンポーネントをエクスポート | 商品を店頭に並べる |
| `LoginPage` | コンポーネント名 | 商品の名前 |
| `<h1>` | 見出しタグ | 看板 |

✅ **確認ポイント**:

【スクリーンショット: 確認画面】

1. ブラウザで`http://localhost:3000/login`にアクセス
2. 「ログイン」という見出しが表示される
3. これでログインページの作成が完了です

【スクリーンショット: /loginにアクセスした画面】

📝 **学んだこと**: Next.jsのApp Routerで、新しいページを作成できるようになりました。

---

### Step 2: フォームコンポーネントを作成（15分）

🎯 **ゴール**: shadcn/uiのInput、Buttonを使って、ログインフォームを作成します。

🔰 **初心者向け解説**: `Input`は入力欄、`Button`はボタンを表すshadcn/uiのコンポーネントです。これらを組み合わせることで、美しいフォームを簡単に作れます。`useState`を使って、入力内容を管理します。

💻 **実装**:

```typescript
// filepath: src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/component/ui/input';
import { Button } from '@/component/ui/button';
import { Label } from '@/component/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Email:', email);
    console.log('Password:', password);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">ログイン</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">パスワード</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit">ログイン</Button>
      </form>
    </div>
  );
}
```

🔍 **コード解説**:

| コード | 意味 | 例え |
|--------|------|------|
| `'use client'` | クライアントコンポーネント宣言 | 「このページは動的です」と宣言 |
| `useState` | 状態管理フック | ゲームのセーブデータ |
| `Input` | 入力欄 | お店の注文用紙 |
| `Button` | ボタン | お店のレジのボタン |
| `Label` | ラベル | 入力欄の説明文 |
| `space-y-4` | 縦方向の余白 | 要素間のスペース |

✅ **確認ポイント**:

【スクリーンショット: 確認画面】

1. メールアドレスとパスワードの入力欄が表示される
2. 入力すると、コンソールにログが表示される
3. これでフォームの作成が完了です

【スクリーンショット: ログインフォームの画面】

📝 **学んだこと**: shadcn/uiのコンポーネントを使って、入力フォームを作成できるようになりました。

---

### Step 3: バリデーションを追加（15分）

🎯 **ゴール**: 入力内容のバリデーション（検証）を追加します。

🔰 **初心者向け解説**: バリデーションは、ユーザーが正しい形式で入力しているかをチェックする機能です。メールアドレスが正しい形式か、パスワードが入力されているかなどをチェックします。エラーメッセージを表示することで、ユーザーに修正を促します。

💻 **実装**:

```typescript
// filepath: src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/component/ui/input';
import { Button } from '@/component/ui/button';
import { Label } from '@/component/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });

  const validate = () => {
    const newErrors = { email: '', password: '' };

    if (!email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'メールアドレスの形式が正しくありません';
    }

    if (!password) {
      newErrors.password = 'パスワードを入力してください';
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      console.log('ログイン成功:', { email, password });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">ログイン</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">パスワード</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={errors.password ? 'border-destructive' : ''}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
        </div>
        <Button type="submit">ログイン</Button>
      </form>
    </div>
  );
}
```

🔍 **コード解説**:

| コード | 意味 | 例え |
|--------|------|------|
| `validate()` | バリデーション関数 | 注文内容をチェック |
| `border-destructive` | エラー時の赤い枠線 | 赤いランプをつける |
| `text-destructive` | エラーメッセージの赤い文字 | 「ここが間違ってます」と教える |

✅ **確認ポイント**:

【スクリーンショット: 確認画面】

1. 空欄でログインボタンを押すと、エラーメッセージが表示される
2. 正しい形式で入力すると、エラーが消える
3. これでバリデーションの追加が完了です

【スクリーンショット: バリデーションエラーが表示された画面】

📝 **学んだこと**: 入力内容をバリデーションして、ユーザーに適切なフィードバックを返せるようになりました。

---

### Step 4: デザインを調整（10分）

🎯 **ゴール**: レイアウトを調整して、見栄えを良くします。

🔰 **初心者向け解説**: Tailwind CSSのユーティリティクラスを使って、余白や中央揃えを設定します。`className`に直接クラスを書くことで、スタイルを指定できます。

💻 **実装**:

```typescript
// filepath: src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/component/ui/input';
import { Button } from '@/component/ui/button';
import { Label } from '@/component/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });

  const validate = () => {
    const newErrors = { email: '', password: '' };
    if (!email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'メールアドレスの形式が正しくありません';
    }
    if (!password) {
      newErrors.password = 'パスワードを入力してください';
    }
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      console.log('ログイン成功:', { email, password });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-6">ログイン</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            className={`w-full ${errors.email ? 'border-destructive' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">パスワード</Label>
          <Input
            id="password"
            type="password"
            className={`w-full ${errors.password ? 'border-destructive' : ''}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
        </div>
        <Button type="submit" className="w-full">ログイン</Button>
      </form>
    </div>
  );
}
```

🔍 **スタイル解説**:

| クラス | 意味 | 値の例 |
|--------|------|--------|
| `max-w-md` | 最大幅 | 448px |
| `mx-auto` | 左右の余白を自動（中央揃え） | - |
| `mt-16` | 上の余白 | 64px |
| `p-6` | 内側の余白 | 24px |
| `space-y-4` | 子要素間の縦余白 | 16px |
| `w-full` | 幅を100%に | - |

✅ **確認ポイント**:

【スクリーンショット: 確認画面】

1. ログインフォームが画面中央に表示される
2. 余白が適切に設定されている
3. これでデザインの調整が完了です

【スクリーンショット: デザイン調整後のログイン画面】

📝 **学んだこと**: Tailwind CSSのユーティリティクラスを使って、レイアウトを調整できるようになりました。

---

## 📋 今日のまとめ

- [ ] ログインページを作成できた
- [ ] shadcn/uiのInput、Buttonを使えた
- [ ] useState で入力内容を管理できた
- [ ] バリデーションを実装できた
- [ ] Tailwind CSSでデザインを調整できた

## ⚠️ つまずきポイント

| エラー/問題 | 原因 | 解決方法 |
|------------|------|---------|
| `'use client'`エラー | クライアントコンポーネント宣言が必要 | ファイル先頭に`'use client'`を追加 |
| shadcn/uiコンポーネントが表示されない | インポートが間違っている | `@/component/ui/*`からインポート |
| バリデーションが動かない | `validate()`が呼ばれていない | `handleSubmit`内で`validate()`を呼ぶ |

## 🔗 次回予告

Day 6では、ユーザー登録画面を作ります。ログイン画面と同じように、shadcn/uiを使って美しいUIを実装します。
