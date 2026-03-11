# Day 08: サイドバーを完成させよう

## 🎯 今日のゴール

サイドバーにユーザー情報ウィジェット（名前・ロールバッジ）を追加し、ログアウト確認ダイアログを実装します。認証ガード（未ログイン時のリダイレクト）の動作も体験します。

![サイドバー（ユーザー情報・ログアウト）](./screenshots/sidebar.png)

## 🤔 なぜこれを作るのか？

現在のサイドバーにはナビゲーションメニューだけがあり、「誰がログインしているか」がわかりません。ユーザー名とロール（管理者/メンバー）を表示し、誤操作防止のログアウト確認ダイアログも追加しましょう。

> 💡 **例え話**: サイドバーは「オフィスの廊下」です。廊下に部屋の案内板（メニュー）があり、壁には自分の名札（ユーザー情報ウィジェット）が掲示されています。退出ボタン（ログアウト）を押すと「本当に退出しますか？」と確認されます。

### 📐 AppLayoutの構造

```mermaid
graph TD
    A[AppLayout] --> B{セッションチェック}
    B -->|なし| C[/loginへリダイレクト]
    B -->|あり| D[レイアウト表示]
    D --> E[サイドバー]
    D --> F[ヘッダー]
    D --> G[メインコンテンツ]
    E --> H[ナビメニュー]
    E --> I[ユーザー情報ウィジェット]
    E --> J[ログアウトボタン]

    style B fill:#fff3e0
    style C fill:#ffebee
    style D fill:#e8f5e9
```

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| サイドバーにユーザー情報を表示する | 新しいページを作る |
| AlertDialogでログアウト確認を追加する | 認証ロジックを変更する |
| ロールによるメニュー表示切替を理解する | 権限管理システムの設計 |
| モバイル表示をDevToolsで確認する | CSSのレスポンシブ設計をゼロから書く |

### 🆕 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| useEffect | ユース・エフェクト | コンポーネント表示後に実行される処理 | ページを開いた直後の自動チェック |
| AlertDialog | アラート・ダイアログ | 確認が必要な操作の前に表示するモーダル | 「本当に退出しますか？」のポップアップ |
| 条件付きレンダリング | — | 条件によって表示内容を切り替える | ADMINだけに「管理者メニュー」を見せる |

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 | 触るファイル | 成功状態 |
|---------|---------|---------|-------------|---------|
| Step 1 | AppLayoutの構造を読む | 5分 | なし（読むのみ） | 認証ガードの流れがわかる |
| Step 2 | 認証ガードの動作を体験する | 4分 | なし | リダイレクトを確認 |
| Step 3 | AlertDialogコンポーネントを追加する | 4分 | ターミナル | コンポーネントが生成される |
| Step 4 | サイドバーにユーザー情報を追加する | 7分 | app-layout.tsx | 名前とバッジが表示される |
| Step 5 | ログアウト確認ダイアログを追加する | 7分 | app-layout.tsx | 確認ダイアログが動作する |
| Step 6 | ロールによるメニュー切替を確認する | 4分 | なし（読むのみ） | ADMINメニューが見える |
| Step 7 | モバイル表示を確認する | 3分 | なし | Sheet動作を確認 |
| Step 8 | ログアウトの動作確認 | 3分 | なし | ログアウトが正常動作 |

**合計時間**: 約37分

---

### Step 1: AppLayoutの構造を読む（5分）

🎯 **ゴール**: AppLayoutがどうページを保護しているか理解します。

VS Codeで`src/component/layout/app-layout.tsx`を開いてください。先頭のセッションチェック部分を確認します。

💻 **確認するコード**:

```typescript
// filepath: src/component/layout/app-layout.tsx
export function AppLayout(
  { children }: { children: React.ReactNode }
) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isLoading } =
    api.auth.getSession.useQuery();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);
```

🔍 **コード解説**:

| コード | 意味 | 例え |
|--------|------|------|
| `api.auth.getSession.useQuery()` | サーバーにセッション確認を問い合わせ | 「入口でリストバンドチェック」 |
| `useEffect` | コンポーネント表示後に実行 | ページが開いた直後の自動処理 |
| `!isLoading && !session` | 読み込み完了かつセッションなし | 「リストバンドなし」確定 |
| `router.push('/login')` | ログイン画面にリダイレクト | 「受付に案内する」 |

✅ **確認ポイント**:
1. `app-layout.tsx`を開けた
2. `useEffect`でセッションチェック → リダイレクトの流れがわかった

📝 **学んだこと**: AppLayoutは全ページに共通の「認証ゲート」として機能します。

---

### Step 2: 認証ガードの動作を体験する（4分）

🎯 **ゴール**: 未ログイン状態でページにアクセスした時の動作を確認します。

💻 **操作手順**:

1. ログインした状態で`/dashboard`が表示されることを確認
2. DevTools → Application → Cookies → `session`を右クリック → Delete
3. ブラウザで`/dashboard`にアクセス
4. 自動的に`/login`にリダイレクトされることを確認
5. 再度ログインする（`admin@example.com` / `password123`）

```mermaid
# filepath: 図解（実行可能なコードではありません）
flowchart LR
    A["/dashboardにアクセス"] --> B{"session Cookie\nあり？"}
    B -->|あり| C["ダッシュボード表示 ✅"]
    B -->|なし| D["/loginにリダイレクト ↩️"]

    style C fill:#e8f5e9
    style D fill:#ffebee
```

✅ **確認ポイント**:
1. Cookie削除後に`/dashboard`にアクセスすると`/login`に飛ばされた
2. 再ログイン後は正常に`/dashboard`が表示された

📝 **学んだこと**: 認証ガードはCookieのセッションをチェックし、なければログイン画面にリダイレクトします。

---

### Step 3: AlertDialogコンポーネントを追加する（4分）

🎯 **ゴール**: shadcn/uiのAlertDialogコンポーネントをプロジェクトに追加します。

ターミナルで以下のコマンドを実行してください。

💻 **実装**:

```bash
# filepath: ターミナル
# shadcn/uiのAlertDialogコンポーネントを追加
npx shadcn@latest add alert-dialog
```

🔍 **コード解説**:

| コマンド | 意味 | 結果 |
|---------|------|------|
| `npx shadcn@latest` | shadcn/uiのCLIツールを実行 | 最新版を使用 |
| `add alert-dialog` | AlertDialogコンポーネントを追加 | ファイルが自動生成される |

生成されるファイル: `src/component/ui/alert-dialog.tsx`

このファイルには、以下のコンポーネントが含まれます。

| コンポーネント | 役割 |
|--------------|------|
| `AlertDialog` | ダイアログの外枠（開閉を管理） |
| `AlertDialogTrigger` | ダイアログを開くボタン |
| `AlertDialogContent` | ダイアログの中身 |
| `AlertDialogHeader` | タイトルと説明文 |
| `AlertDialogFooter` | キャンセル・確定ボタン |
| `AlertDialogAction` | 確定ボタン |
| `AlertDialogCancel` | キャンセルボタン |

✅ **確認ポイント**:
1. コマンドが正常に完了した
2. `src/component/ui/alert-dialog.tsx`が生成された

📝 **学んだこと**: shadcn/uiは`npx shadcn@latest add [コンポーネント名]`で必要なコンポーネントだけを追加できます。

---

### Step 4: サイドバーにユーザー情報を追加する（7分）

🎯 **ゴール**: サイドバー下部にログイン中のユーザー名とロールバッジを表示します。

`src/component/layout/app-layout.tsx`を開いて、サイドバーの`</nav>`の後に、ユーザー情報ウィジェットを追加します。

まずimportを追加します。

💻 **実装**:

```typescript
// filepath: src/component/layout/app-layout.tsx（import追加）
import {
  AlertDialog, AlertDialogAction,
  AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/component/ui/alert-dialog';
import {
  Avatar, AvatarFallback, AvatarImage,
} from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
```

次に、サイドバーの`</div>`（`flex-1`の直後）に追加します。

```typescript
// filepath: src/component/layout/app-layout.tsx
          {/* ユーザー情報ウィジェット */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={session.user.avatar || ''}
                  alt={session.user.name || ''} />
                <AvatarFallback>
                  {session.user.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
```

続けて、同じ`<div>`の中に名前とバッジを表示します。

```typescript
// filepath: src/component/layout/app-layout.tsx
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium
                  truncate">
                  {session.user.name}
                </span>
                <Badge variant={
                  session.user.role === 'ADMIN'
                    ? 'default' : 'secondary'
                } className="w-fit text-xs">
                  {session.user.role === 'ADMIN'
                    ? '管理者' : 'メンバー'}
                </Badge>
              </div>
            </div>
          </div>
```

🔍 **コード解説**:

| コード | 意味 | 例え |
|--------|------|------|
| `session.user.name` | ログイン中のユーザー名 | 名札に書かれた名前 |
| `session.user.role` | ユーザーの権限 | 「管理者」か「メンバー」 |
| `Badge variant="default"` | 濃い色のバッジ | 管理者は目立つ色 |
| `AvatarFallback` | アバター画像がない時の代替 | 名前の頭文字を表示 |

✅ **確認ポイント**:
1. ブラウザのサイドバー下部にユーザー名が表示される
2. 「管理者」または「メンバー」のバッジが表示される
3. アバター（またはイニシャル）が表示される

![サイドバーのユーザー情報ウィジェット](./screenshots/sidebar.png)

📝 **学んだこと**: `session`オブジェクトからユーザー情報を取得して、UIに反映できます。

---

### Step 5: ログアウト確認ダイアログを追加する（7分）

🎯 **ゴール**: ログアウトボタンにAlertDialog確認を追加し、誤操作を防止します。

Step 4で追加したユーザー情報ウィジェットの下に、ログアウトボタンを追加します。

💻 **実装**:

```typescript
// filepath: src/component/layout/app-layout.tsx
            {/* ↑ ユーザー情報ウィジェットのdivの中 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm"
                  className="w-full gap-2">
                  <LogOut className="h-4 w-4" />
                  ログアウト
                </Button>
              </AlertDialogTrigger>
```

ボタンをクリックすると、確認ダイアログが表示されます。

```typescript
// filepath: src/component/layout/app-layout.tsx
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    ログアウトしますか？
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    ログアウトすると、再度ログインが
                    必要になります。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    キャンセル
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}>
                    ログアウト
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
```

🔍 **コード解説**:

| コード | 意味 | 例え |
|--------|------|------|
| `AlertDialogTrigger` | ダイアログを開くトリガー | ドアのノブ。押すとダイアログが開く |
| `asChild` | 子要素をそのままトリガーにする | Buttonをそのまま使う |
| `AlertDialogAction` | 確定ボタン | 「はい、退出します」ボタン |
| `AlertDialogCancel` | キャンセルボタン | 「やっぱりやめます」ボタン |
| `handleLogout` | ログアウト処理の関数 | Cookie削除 + ログイン画面へ遷移 |

✅ **確認ポイント**:
1. サイドバーの「ログアウト」ボタンをクリック
2. 確認ダイアログが表示される
3. 「キャンセル」で閉じる → ダイアログが消える
4. 「ログアウト」で確定 → ログイン画面に遷移する

![ログアウト確認ダイアログ](./screenshots/sidebar.png)

📝 **学んだこと**: AlertDialogを使うと、`window.confirm()`よりも美しく、アクセシブルな確認ダイアログを作れます。

---

### Step 6: ロールによるメニュー切替を確認する（4分）

🎯 **ゴール**: ADMINユーザーだけに「ユーザー管理」メニューが表示される仕組みを理解します。

💻 **確認するコード**:

```typescript
// filepath: src/component/layout/app-layout.tsx
  const menuItems: MenuItem[] = [
    ...baseMenuItems,
    ...(session?.user?.role === 'ADMIN'
      ? [{
          text: 'ユーザー管理',
          icon: <Users className="h-5 w-5" />,
          path: '/user',
        }]
      : []),
  ];
```

🔍 **コード解説**:

| コード | 意味 | 例え |
|--------|------|------|
| `...baseMenuItems` | 全員共通のメニューを展開 | 基本メニュー6項目 |
| `session?.user?.role === 'ADMIN'` | 管理者かどうか判定 | 名札に「管理者」と書いてあるか |
| `? [{...}] : []` | 管理者なら追加、それ以外なら空 | 管理者だけ追加メニューあり |
| `...` (スプレッド) | 配列を展開して結合 | 基本メニュー + 追加メニュー |

✅ **確認ポイント**:
1. ADMINアカウント（`admin@example.com`）でサイドバーに「ユーザー管理」が表示される
2. この条件分岐の仕組みが理解できた

📝 **学んだこと**: スプレッド構文と三項演算子を組み合わせて、条件付きでメニュー項目を追加できます。

---

### Step 7: モバイル表示を確認する（3分）

🎯 **ゴール**: DevToolsでモバイル表示を確認し、Sheet（スライドメニュー）の動作を体験します。

💻 **操作手順**:

1. DevToolsを開く（F12）
2. デバイスツールバーを有効にする（Ctrl+Shift+M / Cmd+Shift+M）
3. iPhone 14 Pro のようなモバイルデバイスを選択
4. ハンバーガーメニュー（☰）をタップ → サイドメニューがスライドして表示される

🔍 **レスポンシブ対応の仕組み**:

| 画面サイズ | サイドバー | 実装方法 |
|-----------|----------|---------|
| デスクトップ（768px以上） | 常に表示 | `md:block` (CSSクラス) |
| モバイル（768px未満） | Sheet（スライド） | `md:hidden` + Sheet |


```bash
# filepath: ブラウザ（DevToolsで操作）
# F12 または右クリック → 検証 でDevToolsを開く
# Ctrl+Shift+M (Mac: Cmd+Shift+M) でデバイス表示切替
```

✅ **確認ポイント**:
1. モバイル表示でハンバーガーメニューが表示される
2. メニューをタップするとスライドで開く
3. メニュー項目をタップするとメニューが閉じる

📝 **学んだこと**: Tailwind CSSの`md:`プレフィックスで、画面サイズに応じた表示切替ができます。

---

### Step 8: ログアウトの動作確認（3分）

🎯 **ゴール**: ログアウト機能が正しく動作することを確認します。

💻 **操作手順**:

1. サイドバーの「ログアウト」ボタンをクリック
2. 確認ダイアログで「ログアウト」をクリック
3. `/login`画面にリダイレクトされることを確認
4. ブラウザの戻るボタンを押しても、ダッシュボードに戻れないことを確認

```typescript
// filepath: src/component/layout/app-layout.tsx
  // ログアウト処理
  const logoutMutation =
    api.auth.logout.useMutation({
      onSuccess: () => {
        router.push('/login');
        router.refresh();
      },
    });

  const handleLogout = async () => {
    logoutMutation.mutate();
  };
```

🔍 **コード解説**:

| コード | 意味 | 例え |
|--------|------|------|
| `api.auth.logout.useMutation()` | ログアウトAPIを呼び出す | 「退出処理をお願いします」 |
| `router.push('/login')` | ログイン画面に遷移 | 受付に戻される |
| `router.refresh()` | ページの状態をリセット | キャッシュされた情報をクリア |

✅ **確認ポイント**:
1. ログアウト後に`/login`に遷移した
2. 戻るボタンでダッシュボードに戻れない（認証ガードがリダイレクトする）

📝 **学んだこと**: ログアウトはCookieの削除 + ページ遷移 + 状態リフレッシュの3ステップで完了します。

---

## 📋 今日のまとめ

- [ ] AppLayoutの認証ガード（useEffect + リダイレクト）を理解した
- [ ] Cookie削除で認証ガードの動作を体験した
- [ ] shadcn/uiのAlertDialogコンポーネントを追加した
- [ ] サイドバーにユーザー名とロールバッジを表示した
- [ ] ログアウト確認ダイアログを実装した
- [ ] ロールによるメニュー切替の仕組みを理解した
- [ ] モバイル表示のSheet動作を確認した

## ⚠️ つまずきポイント

| エラー/問題 | 原因 | 解決方法 |
|------------|------|---------|
| `Cannot find module '@/component/ui/alert-dialog'` | AlertDialogが未インストール | `npx shadcn@latest add alert-dialog`を実行 |
| ユーザー名が`null`と表示される | seedデータにnameがない | `admin@example.com`でログインし直す |
| モバイルメニューが閉じない | `onClick`で`setMobileOpen(false)`が呼ばれていない | Sheet内のLinkに`onClick`を確認 |
| ログアウト後もページが見える | `router.refresh()`の呼び忘れ | `onSuccess`内で`router.refresh()`を追加 |

## 🔜 次回の予告

Day 09では、プロジェクト一覧画面を作ります。tRPCでデータを取得し、Cardコンポーネントで一覧表示する方法を学びましょう。
