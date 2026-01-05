# Day 19: セキュリティ実装・入力検証

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **入力検証** | 悪質なデータ受け入れ防止 | ✅ Zod で型チェック |
| **レート制限** | DoS 攻撃防止 | ✅ express-rate-limit |
| **CSRF保護** | 他サイトからのリクエスト防止 | ✅ csrf トークン |

## 💼 なぜこれを学ぶのか?

**セキュリティバグ = 企業の信頼失墜**。ユーザーデータ漏洩や改ざんはニュースになります。早期にセキュリティを設計することが重要。

- **入力検証**: SQL インジェクション、XSS 防止
- **レート制限**: ブルートフォース攻撃、DoS 防止
- **CSRF 保護**: 他サイトからの悪意あるリクエスト防止

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | Zod による入力検証 | 2ステップ | 25分 |
| **Part 2** | レート制限 | 2ステップ | 20分 |
| **Part 3** | CSRF 保護 | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: Zod による入力検証(25分)

#### Step 1.1: Zod スキーマ設計(所要時間:12分)

**このステップで学ぶこと**: 入力データの型を定義し、自動検証。

**なぜ必要?**: クライアントからの不正なデータをサーバーで拒否。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/validators/task.ts
import { z } from 'zod';

// 🎯 タスク作成時の入力検証
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(255, 'タイトルは255文字以内')
    .trim(), // 前後の空白を削除

  description: z
    .string()
    .max(5000, '説明は5000文字以内')
    .optional()
    .default(''),

  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .default('MEDIUM'),

  status: z
    .enum(['TODO', 'IN_PROGRESS', 'DONE'])
    .default('TODO'),

  projectId: z
    .string()
    .cuid('有効なプロジェクトIDが必要です')
    .optional(),

  assigneeId: z
    .string()
    .cuid('有効なユーザーIDが必要です')
    .optional()
    .nullable(),

  dueDate: z
    .string()
    .datetime()
    .optional()
    .nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// 🎯 タスク検索時の入力検証
export const searchTaskSchema = z.object({
  q: z
    .string()
    .max(100, '検索キーワードは100文字以内'),

  status: z
    .enum(['TODO', 'IN_PROGRESS', 'DONE'])
    .optional(),

  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .optional(),

  page: z
    .number()
    .int('ページ番号は整数')
    .min(1, 'ページ番号は1以上')
    .default(1),

  limit: z
    .number()
    .int('1ページあたりの件数は整数')
    .min(1, '1件以上')
    .max(100, '最大100件')
    .default(10),
});

export type SearchTaskInput = z.infer<typeof searchTaskSchema>;
```

---

#### Step 1.2: tRPC ルーターで検証実施(所要時間:13分)

**このステップで学ぶこと**: tRPC で自動的に入力検証を実施。

**なぜ必要?**: 検証失敗時の エラーハンドリング。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { createTaskSchema, searchTaskSchema } from '@/server/api/validators/task';
import { TRPCError } from '@trpc/server';

export const taskRouter = createTRPCRouter({
  // 入力検証を含む
  create: protectedProcedure
    .input(createTaskSchema) // ← Zod で自動検証
    .mutation(async ({ ctx, input }) => {
      try {
        // ✅ 入力は既に検証済み
        const task = await ctx.db.task.create({
          data: {
            ...input,
            creatorId: ctx.session.user.id,
          },
        });

        return task;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'タスク作成に失敗しました',
        });
      }
    }),

  // 検索クエリの検証
  search: protectedProcedure
    .input(searchTaskSchema)
    .query(async ({ ctx, input }) => {
      const { q, status, priority, page, limit } = input;

      // WHERE 条件を動的に構築
      const where = {
        AND: [
          // キーワード検索
          {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
            ],
          },
          // ステータスフィルタ(オプション)
          status ? { status } : {},
          // 優先度フィルタ(オプション)
          priority ? { priority } : {},
        ].filter(Boolean),
      };

      const tasks = await ctx.db.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
      });

      return tasks;
    }),
});
```

**検証エラーレスポンス例**:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "検証エラー",
    "issues": [
      {
        "code": "too_small",
        "minimum": 1,
        "type": "string",
        "path": ["title"],
        "message": "タイトルは必須です"
      },
      {
        "code": "invalid_enum_value",
        "options": ["LOW", "MEDIUM", "HIGH", "URGENT"],
        "path": ["priority"],
        "message": "無効な優先度"
      }
    ]
  }
}
```

---

### Part 2: レート制限(20分)

#### Step 2.1: Express Rate Limit 設定(所要時間:10分)

**このステップで学ぶこと**: API アクセス数を制限。

**なぜ必要?**: ブルートフォース攻撃(パスワード総当たり)やDoS攻撃(大量アクセス)を防止。

**コードの仕組み解説**:

```bash
# インストール
npm install express-rate-limit
```

```typescript
// filepath: src/server/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

// 🎯 ログイン試行制限(5分間に5回まで)
export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分
  max: 5, // 最大5回まで
  message: '5分以内に何度も失敗しています。しばらく待ってからお試しください',
  standardHeaders: true, // RateLimit ヘッダーを返す
  legacyHeaders: false,
  // IP アドレスごとにカウント
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

// 🎯 API エンドポイント制限(1分間に60リクエストまで)
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分
  max: 60, // 最大60リクエスト
  message: 'リクエストが多すぎます。少しお待ちください',
  standardHeaders: true,
  legacyHeaders: false,
});

// 🎯 厳しい制限(タスク削除など重要操作)
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 10, // 最大10リクエスト
  message: '操作が多すぎます。少しお待ちください',
});
```

---

#### Step 2.2: Express ミドルウェアに登録(所要時間:10分)

**このステップで学ぶこと**: 実際のルートに適用。

**なぜ必要?**: ルートごとに異なる制限を適用。

**コードの仕組み解説**:

```typescript
// filepath: src/server/index.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import {
  loginLimiter,
  apiLimiter,
  strictLimiter,
} from './middleware/rateLimit';

const app: Express = express();

// 全 API にレート制限
app.use('/api/trpc/', apiLimiter);

// ログインだけ厳しく制限
app.post('/api/auth/login', loginLimiter, (req: Request, res: Response) => {
  // ログイン処理
});

// タスク削除は最も厳しく制限
app.delete('/api/trpc/task.delete', strictLimiter, (req: Request, res: Response) => {
  // 削除処理
});

// エラーハンドリング
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.status === 429) { // Too Many Requests
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: error.retryAfter,
    });
  }
  next(error);
});
```

**X-RateLimit ヘッダー**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699564800
```

---

### Part 3: CSRF 保護(15分)

#### Step 3.1: CSRF トークンとクッキー設定(所要時間:15分)

**このステップで学ぶこと**: 他サイトからのリクエストを拒否。

**なぜ必要?**: 攻撃サイトから勝手にリクエストを送信される「CSRF 攻撃」を防止。

**コードの仕組み解説**:

```typescript
// filepath: src/server/middleware/csrf.ts
import csrf from 'csurf';
import session from 'express-session';
import cookieParser from 'cookie-parser';

// ✅ CSRF ミドルウェア設定
export const csrfProtection = csrf({
  cookie: false, // セッションに保存(クッキーではなく)
});

// ✅ Express セッション設定(CSRF トークン保管用)
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true, // JavaScript からアクセス不可
    sameSite: 'strict' as const, // CSRF 攻撃防止
    maxAge: 24 * 60 * 60 * 1000, // 24時間
  },
};
```

**ミドルウェア登録と GET でトークン提供**:

```typescript
// filepath: src/server/index.ts
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { csrfProtection, sessionConfig } from './middleware/csrf';

const app: Express = express();

app.use(cookieParser());
app.use(session(sessionConfig));
app.use(csrfProtection);

// ✅ GET: CSRF トークン取得(フロント初期化時)
app.get('/api/csrf-token', (req, res) => {
  res.json({ token: req.csrfToken() });
});

// ✅ POST: CSRF トークン検証(自動的に実施)
app.post('/api/auth/login', csrfProtection, (req, res) => {
  // リクエストが有効な CSRF トークンを含んでいることが保証
  const { email, password } = req.body;
  // ログイン処理...
});

// ✅ DELETE: CSRF トークン検証
app.delete('/api/tasks/:id', csrfProtection, (req, res) => {
  // 削除リクエストが正当であることが保証
});
```

**フロントエンド実装**:

```typescript
// filepath: src/lib/api-client.ts
import axios from 'axios';

// アプリ初期化時に CSRF トークン取得
async function initializeCsrfToken() {
  const response = await axios.get('/api/csrf-token');
  return response.data.token;
}

// API リクエスト時にトークンを含める
const apiClient = axios.create({
  baseURL: '/api',
});

apiClient.interceptors.request.use((config) => {
  // リクエストヘッダーに CSRF トークン追加
  const token = localStorage.getItem('csrfToken');
  if (token) {
    config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

// 使用例
async function deleteTask(taskId: string) {
  try {
    await apiClient.delete(`/tasks/${taskId}`);
    console.log('削除成功');
  } catch (error) {
    console.error('削除失敗:', error);
  }
}
```

**CSRF 攻撃の仕組み**:

```
【攻撃シナリオ】
1. ユーザー: task-app.com ログイン済み(セッションクッキー持有)
2. ユーザー: 悪意サイト(evil.com)訪問
3. evil.com: <img src="https://task-app.com/api/tasks/important-task/delete">
4. ユーザーのブラウザ: 自動的に Cookie を含めてリクエスト送信
5. ❌ タスクが削除される(ユーザー意図しない操作)

【CSRF 保護のメカニズム】
1. task-app.com GET で CSRF トークン発行(セッションに保管)
2. POST/DELETE 時に リクエストヘッダー に CSRF トークン必須
3. evil.com: CSRF トークンを知らない(JavaScriptで取得不可)
4. evil.com のリクエスト: CSRF トークンなし → 拒否
5. ✅ 攻撃が防止される
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. **入力検証**
   - [ ] Zod スキーマ定義
   - [ ] tRPC に統合
   - [ ] エラーメッセージ表示

2. **レート制限**
   - [ ] ログイン試行制限(5分/5回)
   - [ ] API 制限(1分/60回)
   - [ ] 厳しい制限(1分/10回)

3. **CSRF 保護**
   - [ ] セッション設定
   - [ ] CSRF トークン発行
   - [ ] POST/DELETE 時に検証

---

## まとめ

- **入力検証**: Zod で型チェック→自動エラーハンドリング
- **レート制限**: express-rate-limit で攻撃を防止
- **httpOnly**: JavaScript からクッキーアクセス不可
- **sameSite=strict**: CSRF 攻撃を完全に防止
- **CSRF トークン**: クライアント/サーバー間でトークン交換

次回(Day 20)は Vercel へのデプロイです。
