# Features Documentation - Task-App

このドキュメントでは、Task-Appに実装されているすべての機能を詳細に説明します。

---

## 目次

1. [認証システム](#認証システム)
2. [ユーザー管理](#ユーザー管理)
3. [プロジェクト管理](#プロジェクト管理)
4. [タスク管理](#タスク管理)
5. [コメント機能](#コメント機能)
6. [検索機能](#検索機能)
7. [レポート機能](#レポート機能)
8. [UI/UX機能](#uiux機能)

---

## 認証システム

### 概要

NextAuth.jsを使用した安全な認証システムを実装しています。

### 機能詳細

#### ユーザー登録

**エンドポイント**: `POST /api/auth/register`

**機能**:
- メールアドレスとパスワードでアカウント作成
- パスワードの強度チェック
- メールアドレスの重複チェック
- パスワードのハッシュ化（bcryptjs）

**バリデーション**:
- メール: 有効な形式
- パスワード: 最低8文字、英数字含む
- 名前: 1文字以上、255文字以下

**使用例**:
```typescript
const register = api.auth.register.useMutation({
  onSuccess: () => {
    router.push('/login');
  },
});

register.mutate({
  email: 'user@example.com',
  password: 'SecurePass123',
  name: 'John Doe',
});
```

#### ログイン

**エンドポイント**: `POST /api/auth/callback/credentials`

**機能**:
- メールアドレスとパスワードで認証
- JWTトークン発行
- セッション管理（30日間）

**セキュリティ**:
- パスワードはbcryptで検証
- ブルートフォース対策
- CSRF保護（NextAuth標準）

#### ログアウト

**エンドポイント**: `POST /api/auth/signout`

**機能**:
- セッションの無効化
- クライアント側のトークン削除
- リダイレクト処理

#### セッション管理

**機能**:
- JWT戦略
- セッション有効期限: 30日
- 自動更新
- サーバーサイド認証チェック

---

## ユーザー管理

### 概要

ユーザーアカウントの作成、編集、削除、ロール管理を提供します。

### 機能詳細

#### ユーザープロフィール

**ページ**: `/profile`

**機能**:
- プロフィール情報の表示
- アバター画像の設定
- 名前・メールアドレスの変更
- パスワード変更

**API**: `api.user.updateProfile`

```typescript
const updateProfile = api.user.updateProfile.useMutation();

updateProfile.mutate({
  name: '新しい名前',
  avatar: '/avatars/new-avatar.png',
});
```

#### ユーザーリスト

**ページ**: `/users`
**権限**: ADMIN のみ

**機能**:
- 全ユーザーの一覧表示
- ロール別フィルター（USER, ADMIN）
- アクティブ/非アクティブフィルター
- ユーザー検索

**表示項目**:
- ID
- 名前
- メールアドレス
- ロール
- 登録日
- 最終ログイン

#### ユーザー作成

**ページ**: `/users/new`
**権限**: ADMIN のみ

**機能**:
- 新規ユーザーの作成
- ロール設定（USER, ADMIN）
- 初期パスワードの設定

#### ユーザー編集

**ページ**: `/users/[id]/edit`
**権限**: ADMIN または本人

**機能**:
- ユーザー情報の編集
- ロール変更（ADMINのみ）
- アカウント有効/無効切り替え

#### ユーザー削除

**API**: `api.user.delete`
**権限**: ADMIN のみ

**機能**:
- ユーザーアカウントの削除
- 関連データの処理
  - 作成したタスク: createdByをnullに
  - アサインされたタスク: assigneeをnullに
  - コメント: 削除

---

## プロジェクト管理

### 概要

タスクをグループ化して管理するプロジェクト機能を提供します。

### 機能詳細

#### プロジェクト一覧

**ページ**: `/project`

**機能**:
- 参加プロジェクトの表示
- プロジェクトカード表示（色・進捗付き）
- アーカイブプロジェクトの表示/非表示
- プロジェクト作成ボタン

**表示項目**:
- プロジェクト名
- 説明
- 色ラベル
- タスク数
- 完了率
- メンバー数

#### プロジェクト作成

**ページ**: `/project/new`

**機能**:
- プロジェクト名・説明の入力
- 色の選択（16色）
- 開始日・終了日の設定
- 作成者が自動的にOWNERに

**バリデーション**:
- 名前: 1〜100文字
- 説明: 0〜1000文字
- 色: HEX形式
- 日付: 開始日 ≦ 終了日

**使用例**:
```typescript
const createProject = api.project.create.useMutation();

createProject.mutate({
  name: '新規プロジェクト',
  description: 'プロジェクトの説明',
  color: '#1976d2',
  startDate: new Date(),
  endDate: new Date('2025-12-31'),
});
```

#### プロジェクト詳細

**ページ**: `/project/[id]`

**機能**:
- プロジェクト情報の表示
- タスク一覧（フィルター・ソート機能付き）
- メンバー一覧
- プロジェクト統計
  - 総タスク数
  - 完了タスク数
  - 進捗率
  - メンバー数

#### プロジェクト編集

**ページ**: `/project/[id]/edit`
**権限**: OWNER または ADMIN

**機能**:
- プロジェクト情報の編集
- 色・期間の変更
- アーカイブ設定

#### プロジェクトメンバー管理

**ページ**: `/project/[id]/members`
**権限**: OWNER または ADMIN

**機能**:
- メンバー追加
- ロール変更
  - OWNER: フルコントロール
  - ADMIN: メンバー管理可能
  - MEMBER: タスク作成・編集可能
  - VIEWER: 閲覧のみ
- メンバー削除

**API**: `api.project.addMember`, `api.project.updateMemberRole`, `api.project.removeMember`

#### プロジェクトアーカイブ

**API**: `api.project.archive`
**権限**: OWNER のみ

**機能**:
- プロジェクトをアーカイブ
- タスクは保持（読み取り専用）
- 再度アクティブ化可能

---

## タスク管理

### 概要

プロジェクト内でタスクを作成・管理する機能を提供します。

### 機能詳細

#### タスク一覧

**ページ**: `/project/[id]`, `/my-tasks`

**機能**:
- タスクカード表示
- ステータス別表示（カンバンボード風）
- フィルター機能
  - ステータス
  - 優先度
  - アサイニー
  - 期限
- ソート機能
  - 作成日
  - 期限
  - 優先度
  - タイトル

#### タスク作成

**ページ**: `/task/new?projectId=xxx`

**機能**:
- タスク情報の入力
  - タイトル（必須）
  - 説明
  - ステータス
  - 優先度
  - アサイニー
  - 期限
  - 見積時間

**バリデーション**:
- タイトル: 1〜255文字
- 説明: 0〜5000文字
- ステータス: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED, BLOCKED
- 優先度: LOW, MEDIUM, HIGH, URGENT
- 見積時間: 0以上

**使用例**:
```typescript
const createTask = api.task.create.useMutation();

createTask.mutate({
  title: 'ログイン機能の実装',
  description: 'NextAuthを使用した認証システムを実装する',
  projectId: 'project-id',
  status: 'TODO',
  priority: 'HIGH',
  assigneeId: 'user-id',
  dueDate: new Date('2025-01-31'),
  estimatedHours: 8,
});
```

#### タスク詳細

**ページ**: `/task/[id]`

**機能**:
- タスク情報の表示
- コメント一覧
- タスク編集ボタン
- タスク削除ボタン
- タイマー機能
- 作業時間の記録

**表示項目**:
- タイトル
- 説明
- ステータス
- 優先度
- アサイニー
- 作成者
- 期限
- 見積時間
- 実績時間
- 作業時間
- 作成日
- 更新日

#### タスク編集

**ページ**: `/task/[id]/edit`
**権限**: 作成者、アサイニー、プロジェクトADMIN/OWNER

**機能**:
- すべてのタスク情報を編集可能
- ステータス変更時の自動処理
  - DONEに変更: completedAtを自動設定
  - DONE以外に変更: completedAtをクリア

#### タスク削除

**API**: `api.task.delete`
**権限**: 作成者、プロジェクトOWNER

**機能**:
- タスクの削除
- 関連コメントも削除（Cascade）

#### タスクステータス管理

**6段階のステータス**:

| ステータス | 説明 | 色 |
|----------|------|-----|
| TODO | 未着手 | グレー |
| IN_PROGRESS | 進行中 | ブルー |
| IN_REVIEW | レビュー中 | オレンジ |
| DONE | 完了 | グリーン |
| CANCELLED | キャンセル | レッド |
| BLOCKED | ブロック中 | パープル |

**API**: `api.task.updateStatus`

#### タスク優先度

**4段階の優先度**:

| 優先度 | 説明 | アイコン |
|-------|------|---------|
| LOW | 低 | ⬇️ |
| MEDIUM | 中 | ➡️ |
| HIGH | 高 | ⬆️ |
| URGENT | 緊急 | 🔥 |

#### タスクアサイン

**機能**:
- ユーザーをタスクにアサイン
- 1タスク1ユーザーのみ
- プロジェクトメンバーのみ選択可能

**API**: `api.task.assign`

```typescript
const assignTask = api.task.assign.useMutation();

assignTask.mutate({
  taskId: 'task-id',
  assigneeId: 'user-id',
});
```

#### タスクタイマー機能

**機能**:
- 作業時間の計測
- タイマーの開始/停止
- 累計作業時間の記録

**API**:
- `api.task.startTimer` - タイマー開始
- `api.task.stopTimer` - タイマー停止

**使用例**:
```typescript
// タイマー開始
const startTimer = api.task.startTimer.useMutation();
startTimer.mutate({ taskId: 'task-id' });

// タイマー停止（作業時間が自動計算される）
const stopTimer = api.task.stopTimer.useMutation();
stopTimer.mutate({ taskId: 'task-id' });
```

#### 個人タスクビュー

**ページ**: `/my-tasks`

**機能**:
- 自分がアサインされているタスクのみ表示
- プロジェクト横断で表示
- ステータス・優先度フィルター
- 期限でソート

---

## コメント機能

### 概要

タスクに対するコメントとディスカッション機能を提供します。

### 機能詳細

#### コメント投稿

**場所**: タスク詳細ページ（`/task/[id]`）

**機能**:
- Markdownサポート
- リアルタイム投稿
- 投稿者情報の自動付加

**バリデーション**:
- 内容: 1〜5000文字

**API**: `api.comment.create`

```typescript
const createComment = api.comment.create.useMutation();

createComment.mutate({
  taskId: 'task-id',
  content: 'コメント内容',
});
```

#### コメント一覧

**機能**:
- 時系列順で表示
- 投稿者情報（アバター・名前）
- 投稿日時
- 編集・削除ボタン（本人のみ）

#### コメント編集

**権限**: コメント作成者のみ

**API**: `api.comment.update`

```typescript
const updateComment = api.comment.update.useMutation();

updateComment.mutate({
  id: 'comment-id',
  content: '編集後のコメント',
});
```

#### コメント削除

**権限**: コメント作成者、プロジェクトOWNER

**API**: `api.comment.delete`

---

## 検索機能

### 概要

タスクとプロジェクトを横断的に検索できる機能を提供します。

### 機能詳細

#### 全文検索

**ページ**: `/search`

**機能**:
- タスクのタイトル・説明を検索
- プロジェクト名・説明を検索
- 複数キーワードのAND検索
- 部分一致検索

**API**: `api.search.global`

```typescript
const searchResults = api.search.global.useQuery({
  query: '検索キーワード',
});
```

#### 高度な検索

**機能**:
- ステータスフィルター
- 優先度フィルター
- アサイニーフィルター
- プロジェクトフィルター
- 期限範囲フィルター

**API**: `api.search.advanced`

```typescript
const results = api.search.advanced.useQuery({
  query: 'ログイン',
  status: ['TODO', 'IN_PROGRESS'],
  priority: ['HIGH', 'URGENT'],
  assigneeId: 'user-id',
  projectId: 'project-id',
  dueDateFrom: new Date('2025-01-01'),
  dueDateTo: new Date('2025-12-31'),
});
```

#### 検索結果の表示

**機能**:
- タスクカード形式
- プロジェクト情報付き
- ハイライト表示（検索キーワード）
- ソート機能（関連度、日付、優先度）

---

## レポート機能

### 概要

プロジェクトとタスクの進捗を可視化するレポート機能を提供します。

### 機能詳細

#### ダッシュボード

**ページ**: `/dashboard`

**機能**:
- 総タスク数
- 完了タスク数
- 進行中タスク数
- 今日期限のタスク
- 自分のタスク統計
- プロジェクト別統計
- グラフ表示（Recharts使用）

**グラフの種類**:
- タスクステータス分布（円グラフ）
- プロジェクト別タスク数（棒グラフ）
- 期限別タスク数（折れ線グラフ）
- 優先度分布（ドーナツグラフ）

**API**: `api.report.dashboard`

#### 週次レポート

**ページ**: `/report/weekly`

**機能**:
- 週ごとの進捗レポート
- 完了タスク数の推移
- 新規作成タスク数
- メンバー別完了数
- プロジェクト別完了率

**API**: `api.report.weekly`

```typescript
const weeklyReport = api.report.weekly.useQuery({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-07'),
});
```

#### プロジェクトレポート

**場所**: プロジェクト詳細ページ

**機能**:
- プロジェクト進捗率
- タスク完了率
- メンバー別タスク数
- ステータス分布
- 優先度分布
- 期限超過タスク数

---

## UI/UX機能

### 概要

使いやすく美しいユーザーインターフェースを提供します。

### 機能詳細

#### レスポンシブデザイン

**対応デバイス**:
- モバイル（320px〜）
- タブレット（768px〜）
- デスクトップ（1024px〜）

**実装**:
- Material-UIのブレークポイント活用
- モバイルファーストアプローチ
- タッチ操作対応

#### ダークモード

**機能**:
- ライト/ダークテーマ切り替え（準備済み）
- ユーザー設定として保存
- システム設定に追従

**実装**: Material-UIテーマシステム

#### ローディング状態

**機能**:
- スケルトンローディング
- スピナー表示
- プログレスバー

**実装**: Material-UIコンポーネント + tRPC状態管理

#### エラーハンドリング

**機能**:
- エラーメッセージ表示
- トースト通知（react-hot-toast）
- エラーバウンダリー

**種類**:
- 404 Not Found
- 500 Internal Server Error
- 認証エラー
- バリデーションエラー

#### トースト通知

**機能**:
- 成功メッセージ
- エラーメッセージ
- 情報メッセージ
- 警告メッセージ

**使用例**:
```typescript
import toast from 'react-hot-toast';

// 成功
toast.success('タスクを作成しました');

// エラー
toast.error('エラーが発生しました');

// 情報
toast('通知メッセージ');
```

#### ナビゲーション

**機能**:
- サイドバーナビゲーション
- トップバー
- パンくずリスト
- モバイルメニュー

---

## API仕様

### 認証

| エンドポイント | メソッド | 説明 |
|-------------|---------|------|
| `/api/auth/register` | POST | ユーザー登録 |
| `/api/auth/callback/credentials` | POST | ログイン |
| `/api/auth/signout` | POST | ログアウト |

### ユーザー

| エンドポイント | メソッド | 説明 |
|-------------|---------|------|
| `api.user.getAll` | Query | ユーザー一覧取得 |
| `api.user.getById` | Query | ユーザー詳細取得 |
| `api.user.create` | Mutation | ユーザー作成 |
| `api.user.update` | Mutation | ユーザー更新 |
| `api.user.delete` | Mutation | ユーザー削除 |

### プロジェクト

| エンドポイント | メソッド | 説明 |
|-------------|---------|------|
| `api.project.getAll` | Query | プロジェクト一覧 |
| `api.project.getById` | Query | プロジェクト詳細 |
| `api.project.create` | Mutation | プロジェクト作成 |
| `api.project.update` | Mutation | プロジェクト更新 |
| `api.project.delete` | Mutation | プロジェクト削除 |
| `api.project.archive` | Mutation | アーカイブ |

### タスク

| エンドポイント | メソッド | 説明 |
|-------------|---------|------|
| `api.task.getAll` | Query | タスク一覧 |
| `api.task.getById` | Query | タスク詳細 |
| `api.task.getMyTasks` | Query | 自分のタスク |
| `api.task.create` | Mutation | タスク作成 |
| `api.task.update` | Mutation | タスク更新 |
| `api.task.delete` | Mutation | タスク削除 |
| `api.task.startTimer` | Mutation | タイマー開始 |
| `api.task.stopTimer` | Mutation | タイマー停止 |

### コメント

| エンドポイント | メソッド | 説明 |
|-------------|---------|------|
| `api.comment.getByTaskId` | Query | タスクのコメント一覧 |
| `api.comment.create` | Mutation | コメント作成 |
| `api.comment.update` | Mutation | コメント更新 |
| `api.comment.delete` | Mutation | コメント削除 |

### 検索

| エンドポイント | メソッド | 説明 |
|-------------|---------|------|
| `api.search.global` | Query | 全文検索 |
| `api.search.advanced` | Query | 高度な検索 |

### レポート

| エンドポイント | メソッド | 説明 |
|-------------|---------|------|
| `api.report.dashboard` | Query | ダッシュボード |
| `api.report.weekly` | Query | 週次レポート |
| `api.report.project` | Query | プロジェクトレポート |

---

## 今後の拡張機能

以下の機能は現在未実装ですが、将来的に追加予定です。

### 通知システム
- リアルタイム通知
- メール通知
- ブラウザ通知

### ファイル添付
- タスクへのファイル添付
- 画像プレビュー
- ファイルダウンロード

### カレンダービュー
- タスクのカレンダー表示
- ドラッグ&ドロップ対応
- Google Calendar連携

### ガントチャート
- プロジェクト進捗の可視化
- タスク依存関係
- クリティカルパス表示

### データエクスポート
- CSV形式
- PDF形式
- JSON形式

---

すべての機能は型安全で、テスト済みです。
詳細な使用方法は各APIのTypeScript定義を参照してください。
