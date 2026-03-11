# Day 14: Week 2 復習・統合テスト

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **tRPC全体の理解** | API開発 | ✅ mutation/queryを区別できる |
| **複雑なデータフロー** | 実装 | ✅ コンポーネント間の通信できる |
| **統合テスト** | 品質保証 | ✅ 複数機能の連携テストできる |

## 💼 なぜこれを学ぶのか?

**Week 1で基礎、Week 2でAPI開発方法を学びました**。しかし、学んだ各機能が実際に組み合わさるのを経験することが重要です。

- **タスク作成** → **割り当て** → **コメント** → **完了**
- このフローを実施すれば、すべての機能が動作することを確認

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | 実装復習・要点整理 | 2ステップ | 20分 |
| **Part 2** | 統合テスト・動作確認 | 2ステップ | 25分 |
| **Part 3** | Week 3 準備・ロードマップ | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: 実装復習・要点整理(20分)

#### Step 1.1: tRPC プロシージャの復習(所要時間:10分)

**このステップで学ぶこと**: Query と Mutation の使い分け。

**なぜ必要?**: API設計の基本。読み取り/書き込み操作を正しく区別することで、キャッシング戦略やセキュリティが向上します。

**コードの仕組み解説**:

```typescript
// filepath: 知識整理
/**
 * Query (GET) : データ取得(副作用なし)
 *
 * 例:
 * - task.getById
 * - task.list
 * - task.listPaginated
 * - project.list
 * - comment.listByTask
 * - activityLog.listByTask
 *
 * 特徴:
 * - キャッシュ可能
 * - 何度呼んでも結果は同じ
 * - 呼び出し順序は関係ない
 */
const result1 = await api.task.list.useQuery();
const result2 = await api.task.list.useQuery();
// 結果は同じ(2回目はキャッシュから)

/**
 * Mutation (POST/PUT/DELETE) : データ変更(副作用あり)
 *
 * 例:
 * - task.create
 * - task.update
 * - task.updateStatus
 * - task.updatePriority
 * - task.assign
 * - task.batchUpdate
 * - task.delete
 * - project.create
 * - project.addMember
 * - project.removeMember
 * - comment.create
 * - comment.delete
 *
 * 特徴:
 * - キャッシュなし(毎回実行)
 * - 実行するたびに状態が変わる
 * - onSuccess/onError でハンドル
 */
const result = await api.task.create.useMutation({
  onSuccess: async () => {
    // キャッシュ更新
    await utils.task.list.invalidate();
  },
});
```

**Query vs Mutation**:

| 操作 | Query | Mutation |
|------|-------|----------|
| データ取得 | ✅ | ❌ |
| データ変更 | ❌ | ✅ |
| キャッシュ | ✅ | ❌ |
| 冪等性(べきとう) | ✅ | ❌ |
| 呼び出し順序 | 関係ない | 関係あり |

---

#### Step 1.2: 権限チェック・エラーハンドリング復習(所要時間:10分)

**このステップで学ぶこと**: APIセキュリティの要点。

**なぜ必要?**: すべてのAPIで権限チェックが必須。漏れるとセキュリティ脆弱性になります。

**コードの仕組み解説**:

```typescript
// 権限チェックパターン

/**
 * パターン1: 認証チェック(ログイン必須)
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx });
});
// 使用例: auth.logout, auth.getSession など

/**
 * パターン2: 所有権チェック(自分のリソースのみ)
 */
if (task.creatorId !== ctx.user.id) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: '権限がありません',
  });
}
// 使用例: task.update, task.delete, comment.delete など

/**
 * パターン3: メンバーシップチェック(プロジェクトメンバーのみ)
 */
const isMember = project.members.some((m) => m.id === ctx.user.id);
if (!isMember && project.ownerId !== ctx.user.id) {
  throw new TRPCError({ code: 'FORBIDDEN' });
}
// 使用例: project.getById, project.addMember など

/**
 * パターン4: ロールチェック(ADMINのみ)
 */
if (ctx.user.role !== 'ADMIN') {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: '管理者のみアクセス可能',
  });
}
// 使用例: admin.listUsers, admin.updateUserRole など
```

**エラーコード一覧**:

| コード | HTTP | 意味 | 対応 |
|--------|------|------|------|
| UNAUTHORIZED | 401 | ログインなし | ログインページへ |
| FORBIDDEN | 403 | ログイン済みだが権限なし | エラー表示 |
| NOT_FOUND | 404 | リソースなし | 404ページへ |
| CONFLICT | 409 | データ衝突(重複など) | エラー表示 |
| BAD_REQUEST | 400 | 入力値が不正 | フォームエラー表示 |

---

### Part 2: 統合テスト・動作確認(25分)

#### Step 2.1: エンドツーエンドフロー(所要時間:12分)

**このステップで学ぶこと**: 全機能の連携動作確認。

**なぜ必要?**: 各機能は正常でも、組み合わさると問題が起こることがあります(統合テスト)。

**テスト手順**:

```typescript
// ★ テストシナリオ: タスク作成 → 割り当て → コメント → 完了

// 1. ユーザーA がログイン
POST /api/trpc/auth.login
Input: { email: 'user-a@example.com', password: 'xxxx' }
Response: { user: { id: 'user_a', name: 'Alice', ... } }
✓ ログインできる

// 2. ユーザーA がプロジェクト作成
POST /api/trpc/project.create
Input: { name: 'Web開発', description: '新規Webアプリ' }
Response: { id: 'proj_123', name: 'Web開発', ownerId: 'user_a', ... }
✓ プロジェクト作成できる

// 3. ユーザーB をメンバーに追加
POST /api/trpc/project.addMember
Input: { projectId: 'proj_123', userId: 'user_b' }
Response: { members: [{ id: 'user_a', ... }, { id: 'user_b', ... }] }
✓ メンバー追加できる

// 4. ユーザーA がタスク作成(割り当て: ユーザーB)
POST /api/trpc/task.create
Input: {
  title: 'データベース設計',
  projectId: 'proj_123',
  assigneeId: 'user_b',
  priority: 'HIGH'
}
Response: { id: 'task_456', title: 'データベース設計', ... }
✓ タスク作成・割り当てできる

// 5. ユーザーB がコメント追加
POST /api/trpc/comment.create
Input: { taskId: 'task_456', content: '明日から始めます' }
Response: { id: 'cmt_789', content: '明日から始めます', author: { id: 'user_b', ... } }
✓ コメント投稿できる

// 6. ユーザーB がステータスを IN_PROGRESS に変更
POST /api/trpc/task.updateStatus
Input: { id: 'task_456', status: 'IN_PROGRESS' }
Response: { id: 'task_456', status: 'IN_PROGRESS', ... }
✓ ステータス変更できる

// 7. ユーザーA がアクティビティログを確認
GET /api/trpc/activityLog.listByTask?taskId=task_456
Response: [
  { action: 'TASK_CREATED', user: { name: 'Alice' }, ... },
  { action: 'COMMENT_CREATED', user: { name: 'Bob' }, ... },
  { action: 'TASK_UPDATED', user: { name: 'Bob' }, ... }
]
✓ 活動履歴が記録されている

// 8. ユーザーB がタスク完了
POST /api/trpc/task.updateStatus
Input: { id: 'task_456', status: 'DONE' }
Response: { status: 'DONE', ... }
✓ タスク完了できる

// 9. プロジェクト統計を確認
GET /api/trpc/project.getStats?id=proj_123
Response: {
  totalTasks: 1,
  completedTasks: 1,
  completionRate: 100,
  ...
}
✓ 統計が自動計算されている
```

---

#### Step 2.2: UI・ブラウザでの動作確認(所要時間:13分)

**このステップで学ぶこと**: ブラウザでの実際の動作。

**なぜ必要?**: APIが正常でも、UI側でエラーハンドリングが漏れていると動作しません。

**確認項目**:

```
【ログイン】
□ ログインページが表示される
□ メール/パスワード入力で ログインできる
□ ログイン失敗時にエラー表示
□ 新規登録できる
□ ログイン後、ダッシュボードが表示

【ダッシュボード】
□ 認証状態が表示される
□ タスク一覧が表示
□ プロジェクト一覧が表示
□ サイドバーナビゲーション動作
□ ログアウトボタンで /login にリダイレクト

【タスク作成】
□ 「新規作成」ボタンをクリック → 作成フォーム表示
□ フォーム入力 → 「作成」ボタン クリック
□ 成功時: タスク一覧に追加されている
□ 失敗時: エラーメッセージ表示

【タスク編集】
□ タスク行 → 「詳細」クリック → 詳細ページ表示
□ 「編集」ボタン → 編集フォーム表示
□ ステータス/優先度ドロップダウンで変更
□ 保存 → 一覧に反映

【コメント】
□ 詳細ページにコメント欄表示
□ コメント入力 → 「投稿」ボタン
□ 投稿直後にコメントが表示(キャッシュ更新)
□ 自分のコメントに「削除」ボタン表示

【プロジェクト管理】
□ 「プロジェクト」→ 一覧表示
□ 「新規作成」→ プロジェクト作成
□ 「詳細」→ プロジェクトページ
□ メンバー追加/削除UI動作
□ タスク統計表示

【検索・フィルタリング】
□ 検索テキスト入力 → 即座に絞り込み
□ ステータスフィルタ選択 → 絞り込み
□ 優先度フィルタ複数選択 → 絞り込み
□ ページネーション: 次ページボタン動作

【パフォーマンス】
□ タスク作成直後、一覧が更新される(遅延ない)
□ コメント投稿直後、コメントが表示(遅延ない)
□ ページ切り替え時、スムーズに動作
□ Network タブで不要なリクエストがない
```

---

### Part 3: Week 3 準備・ロードマップ(15分)

#### Step 3.1: 学習進捗確認とWeek 3計画(所要時間:15分)

**このステップで学ぶこと**: Week 3 で学ぶ内容と技術ロードマップ。

**なぜ必要?**: 次のステップを理解することで、モチベーション維持と目標設定ができます。

**Week 1-2 総括**:

| 週 | テーマ | 学習内容 | 達成度 |
|----|--------|--------|--------|
| **Week 1** | 基礎 | 環境構築、ルーティング、型、UI、DB、認証 | ✅ 完了 |
| **Week 2** | API開発 | tRPC、CRUD、エラー処理、プロジェクト、コメント | ✅ 完了 |
| **Week 3(準備中)** | 実務的な機能 | テスト、パフォーマンス、デプロイ | ⏳ 今から |

**Week 3 ロードマップ**:

```
Day 15: ファイルアップロード機能
  - タスクに画像・ドキュメント添付
  - S3 / Cloudinary との連携
  - 画像プレビュー表示

Day 16: リアルタイム通知(WebSocket)
  - 新しいコメントをリアルタイム更新
  - タスク割り当て通知
  - WebSocket で接続

Day 17: テスト実装(Vitest + Playwright)
  - API テスト(Vitest)
  - E2E テスト(Playwright)
  - テストカバレッジ

Day 18: パフォーマンス最適化
  - データベースクエリ最適化
  - キャッシング戦略
  - 画像最適化(Next.js Image)

Day 19: セキュリティ対策
  - Rate Limiting
  - CSRF対策
  - SQL Injection 対策(既に Prisma で対策済み)
  - XSS対策

Day 20: Vercelへのデプロイ
  - 本番環境設定
  - 環境変数管理
  - データベース接続(Vercel Postgres)
  - CI/CD パイプライン

Day 21: 最終確認・まとめ
  - 全機能の動作確認
  - ドキュメント整理
  - デプロイ後の検証
  - 次のステップの提案
```

**Week 2 で獲得したスキル**:

```
✅ tRPC を使った型安全なAPI開発
✅ Prisma を使ったDB操作(関連付け、リレーション)
✅ 権限制御・認可(Authorization)
✅ エラーハンドリング・バリデーション
✅ バッチ操作による効率化
✅ キャッシュ管理(TanStack Query)
✅ アクティビティログ・監査

🔄 Week 3 で学ぶスキル:
⏳ ファイル操作・クラウドストレージ連携
⏳ リアルタイム通信(WebSocket)
⏳ テスト駆動開発(TDD)
⏳ パフォーマンス計測・最適化
⏳ セキュリティ実装
⏳ 本番デプロイ
```

---

## ✅ 今日の成果

以下の内容を習得できたことを確認:

1. **tRPC全体理解**
   - [ ] Query と Mutation の区別
   - [ ] キャッシング戦略
   - [ ] onSuccess/onError ハンドリング

2. **権限・セキュリティ**
   - [ ] protectedProcedure での認証確認
   - [ ] 所有権チェック(creator)
   - [ ] メンバーシップチェック
   - [ ] ロールチェック(ADMIN)

3. **統合テスト**
   - [ ] エンドツーエンドフロー実行
   - [ ] ブラウザ動作確認
   - [ ] ログ・統計の自動計算確認

---

## 📋 Week 2 完了チェックリスト

| 項目 | 完了 |
|------|------|
| tRPCのQueryとMutation理解 | ✅ |
| protectedProcedure / adminProcedure 実装 | ✅ |
| エラーハンドリング(TRPCError) | ✅ |
| ミドルウェア・ロギング | ✅ |
| タスク CRUD 操作 | ✅ |
| 検索・フィルタリング・ページネーション | ✅ |
| プロジェクト・メンバー管理 | ✅ |
| コメント機能 | ✅ |
| 複数割り当て・バッチ操作 | ✅ |
| アクティビティログ・監査 | ✅ |
| **Week 2 全体** | **✅ 完了** |

---

## まとめ

- **tRPC**: 型安全でリアルタイム同期可能なAPI
- **Query**: 読み取り、キャッシュ可能、副作用なし
- **Mutation**: 書き込み、毎回実行、副作用あり
- **権限制御**: すべてのAPIで必須
- **統合テスト**: 全機能が正常に連携することを確認
- **Week 2 が濃い理由**: API設計とデータモデリングはバグが入りやすい領域のため、意図的に密度を高めて段階学習できるように構成しています。

**次のWeek 3では、実務的な機能(ファイルアップロード、リアルタイム、テスト、デプロイ)を学びます。**

21日間のハンズオン教材もいよいよ最終段階。Day 15からは、本番環境で必要な実装内容になります。
