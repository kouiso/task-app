# Day 15: ファイルアップロード・画像管理

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **ファイルアップロード処理** | 画像・ドキュメント添付 | ✅ FormData で送信できる |
| **Cloudinary連携** | クラウドストレージ | ✅ 画像をクラウドに保存できる |
| **画像最適化・プレビュー** | パフォーマンス | ✅ Next.js Image で最適化できる |

## 💼 なぜこれを学ぶのか?

**実務アプリでは、画像やファイルのアップロードが必須**です。ローカルに保存するのではなく、クラウドストレージ(Cloudinary、AWS S3など)を使用します。

- **ローカル保存**: 容量制限、削除管理が煩雑
- **クラウドストレージ**: スケーラブル、CDN配信で高速

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | Cloudinary 設定・API | 2ステップ | 25分 |
| **Part 2** | タスク添付ファイル | 2ステップ | 20分 |
| **Part 3** | 画像プレビュー・表示 | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: Cloudinary設定・API(25分)

#### Step 1.1: Cloudinary 環境構築(所要時間:12分)

**このステップで学ぶこと**: Cloudinary APIの設定。

**なぜ必要?**: フロント・バック両側で認証が必要。API呼び出しを安全に行います。

**コードの仕組み解説**:

```bash
# 1. Cloudinary に登録
# https://cloudinary.com にアクセス → 無料登録
# ダッシュボードから、以下を確認:
# - Cloud Name: xxxxxx
# - API Key: xxxxxx
# - API Secret: xxxxxx

# 2. .env に追加
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**フロント側: Cloudinary Widget**:

```typescript
// filepath: src/lib/cloudinary.ts
/**
 * Cloudinary Upload Widget を使用
 *
 * メリット:
 * - ブラウザ側でアップロード(サーバー経由不要)
 * - 削除も簡単
 * - プリセット設定で自動リサイズ可能
 *
 * フロー:
 * 1. ユーザーが画像を選択
 * 2. ブラウザ → Cloudinary へ直接アップロード
 * 3. 返ってきた public_id をDBに保存
 */

declare global {
  interface Window {
    cloudinary: any;
  }
}

export function openUploadWidget(
  onSuccess: (publicId: string, url: string) => void,
  onError?: (error: any) => void
) {
  if (!window.cloudinary) {
    console.error('Cloudinary SDK not loaded');
    return;
  }

  window.cloudinary.openUploadWidget(
    {
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      uploadPreset: 'your_preset_name', // Cloudinary Dashboard で作成
      folder: 'task-app/files',
      sources: ['local', 'url', 'camera'],
      maxFileSize: 5000000, // 5MB
      multiple: false,
      tags: ['task-attachment'],
    },
    (error: any, result: any) => {
      if (error) {
        onError?.(error);
      } else if (result?.event === 'success') {
        const publicId = result.info.public_id;
        const secureUrl = result.info.secure_url;
        onSuccess(publicId, secureUrl);
      }
    }
  );
}

// 画像削除
export async function deleteFile(publicId: string) {
  const response = await fetch('/api/cloudinary/delete', {
    method: 'POST',
    body: JSON.stringify({ publicId }),
  });

  if (!response.ok) {
    throw new Error('ファイル削除に失敗しました');
  }

  return response.json();
}

// 画像URL生成(変換付き)
export function getCloudinaryUrl(publicId: string, options = {}) {
  const baseUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;

  // 変換オプション例:
  // w_400,h_300,c_fill - 幅400px、高さ300px、填充
  // q_auto,f_auto - 品質自動、形式自動最適化
  const transforms = [
    'w_400,h_300,c_fill', // サムネイル用
    'q_auto',              // 品質自動最適化
    'f_auto',              // 形式自動最適化
  ].join('/');

  return `${baseUrl}/${transforms}/${publicId}`;
}
```

**HTML に Cloudinary SDK を追加**:

```typescript
// filepath: src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='ja'>
      <head>
        {/* Cloudinary Upload Widget */}
        <script src='https://upload-widget.cloudinary.com/latest/global/loader.js' />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

#### Step 1.2: バック側・ファイル削除API(所要時間:13分)

**このステップで学ぶこと**: サーバー側でのCloudinary API呼び出し。

**なぜ必要?**: フロント側で削除しても、Cloudinaryに残すわけにいきません。バック側でも削除処理が必須。

**コードの仕組み解説**:

```typescript
// filepath: src/app/api/cloudinary/delete/route.ts
import { v2 as cloudinary } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { TRPCError } from '@trpc/server';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // 認証確認
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // public_id を取得
    const { publicId } = await request.json();
    if (!publicId) {
      return NextResponse.json(
        { error: 'Missing publicId' },
        { status: 400 }
      );
    }

    // Cloudinary から削除
    const result = await cloudinary.uploader.destroy(publicId);

    // result.result: 'ok' | 'not_found'
    if (result.result === 'not_found') {
      console.warn(`File not found in Cloudinary: ${publicId}`);
    }

    return NextResponse.json({
      success: true,
      result: result.result,
    });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
```

---

### Part 2: タスク添付ファイル(20分)

#### Step 2.1: Attachment テーブルの追加(所要時間:10分)

**このステップで学ぶこと**: Prismaスキーマにファイル情報を追加。

**なぜ必要?**: どのタスクにどのファイルが添付されているか管理。

**スキーマ追加**:

```prisma
// filepath: prisma/schema.prisma
model Attachment {
  id        String   @id @default(cuid())
  taskId    String   @db.VarChar(255)
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  // Cloudinary 情報
  publicId  String   @unique @db.VarChar(255)
  url       String   @db.VarChar(1000)
  fileName  String   @db.VarChar(255)
  fileSize  Int      // バイト単位
  mimeType  String   @db.VarChar(100) // image/jpeg など

  // メタデータ
  uploadedBy String  @db.VarChar(255)
  user       User    @relation(fields: [uploadedBy], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([taskId])
  @@index([uploadedBy])
}

model Task {
  // ... 既存フィールド
  attachments Attachment[]
}

model User {
  // ... 既存フィールド
  attachments Attachment[]
}
```

**マイグレーション実行**:
```bash
npx prisma migrate dev --name add_attachments
```

---

#### Step 2.2: ファイルアップロード・API(所要時間:10分)

**このステップで学ぶこと**: ファイル情報をDBに保存。

**なぜ必要?**: Cloudinary に保存されたファイル情報(publicId等)をDBにも記録。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/attachment.ts
import { prisma } from '@/lib/prisma';
import { protectedProcedure, createTRPCRouter } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const uploadSchema = z.object({
  taskId: z.string(),
  publicId: z.string(),
  url: z.string().url(),
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

export const attachmentRouter = createTRPCRouter({
  // ファイルアップロード情報を保存
  create: protectedProcedure
    .input(uploadSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. タスク存在確認 + 権限チェック
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
        select: { creatorId: true, assigneeId: true },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      // タスク作成者 または 割り当て先のみアップロード可
      if (
        task.creatorId !== ctx.user.id &&
        task.assigneeId !== ctx.user.id
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'ファイルをアップロードする権限がありません',
        });
      }

      // 2. ファイル情報を保存
      const attachment = await prisma.attachment.create({
        data: {
          taskId: input.taskId,
          publicId: input.publicId,
          url: input.url,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          uploadedBy: ctx.user.id,
        },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      });

      return attachment;
    }),

  // ファイル削除
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. ファイル取得 + 権限チェック
      const attachment = await prisma.attachment.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          publicId: true,
          uploadedBy: true,
          task: { select: { creatorId: true } },
        },
      });

      if (!attachment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ファイルが見つかりません',
        });
      }

      // アップロード者 または タスク作成者のみ削除可
      if (
        attachment.uploadedBy !== ctx.user.id &&
        attachment.task.creatorId !== ctx.user.id
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '削除する権限がありません',
        });
      }

      // 2. Cloudinary から削除(API経由)
      // (別途実装: フロント側で削除 → Cloudinary → DB)

      // 3. DB から削除
      await prisma.attachment.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
```

---

### Part 3: 画像プレビュー・表示(15分)

#### Step 3.1: ファイル表示UI(所要時間:15分)

**このステップで学ぶこと**: Next.js Image コンポーネントで最適化。

**なぜ必要?**: 大きな画像をそのまま表示するとページが遅くなります。Next.jsの自動最適化を活用。

**コードの仕組み解説**:

```typescript
// filepath: src/components/attachment-list.tsx
'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  IconButton,
} from '@mui/material';
import Image from 'next/image';
import { Delete, Download } from '@mui/icons-material';
import { api } from '@/trpc/react';

interface Attachment {
  id: string;
  publicId: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  user: { id: string; name: string; avatar: string | null };
}

export function AttachmentList({
  taskId,
  attachments,
}: {
  taskId: string;
  attachments: Attachment[];
}) {
  const utils = api.useUtils();
  const deleteAttachment = api.attachment.delete.useMutation({
    onSuccess: async () => {
      await utils.task.getById.invalidate({ id: taskId });
    },
  });

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant='h6' sx={{ mb: 2 }}>
        添付ファイル ({attachments.length})
      </Typography>

      <Grid container spacing={2}>
        {attachments.map((attachment) => (
          <Grid item xs={12} sm={6} md={4} key={attachment.id}>
            <Paper
              sx={{
                p: 2,
                position: 'relative',
                '&:hover .delete-btn': {
                  opacity: 1,
                },
              }}
            >
              {/* 画像プレビュー */}
              {attachment.mimeType.startsWith('image/') ? (
                <Box sx={{ position: 'relative', width: '100%', height: 200 }}>
                  <Image
                    src={attachment.url}
                    alt={attachment.fileName}
                    fill
                    style={{
                      objectFit: 'cover',
                      borderRadius: 4,
                    }}
                    sizes='(max-width: 768px) 100vw, 33vw'
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: 200,
                    bgcolor: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1,
                  }}
                >
                  <Typography color='textSecondary'>
                    {attachment.mimeType.split('/')[1].toUpperCase()}
                  </Typography>
                </Box>
              )}

              {/* ファイル情報 */}
              <Box sx={{ mt: 1 }}>
                <Typography
                  variant='subtitle2'
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {attachment.fileName}
                </Typography>

                <Typography variant='caption' color='textSecondary'>
                  {(attachment.fileSize / 1024).toFixed(1)} KB
                </Typography>
              </Box>

              {/* アクション */}
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button
                  size='small'
                  href={attachment.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  startIcon={<Download />}
                >
                  DL
                </Button>

                <IconButton
                  size='small'
                  className='delete-btn'
                  sx={{ opacity: 0, transition: 'opacity 0.2s' }}
                  onClick={() =>
                    deleteAttachment.mutate({ id: attachment.id })
                  }
                  disabled={deleteAttachment.isPending}
                >
                  <Delete />
                </IconButton>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {attachments.length === 0 && (
        <Typography color='textSecondary'>
          ファイルはまだありません
        </Typography>
      )}
    </Box>
  );
}

// 使用例
export function TaskDetailWithAttachments({ taskId }: { taskId: string }) {
  const { data: task } = api.task.getById.useQuery({ id: taskId });

  return (
    <Box>
      {/* タスク情報 ... */}

      {/* 添付ファイル表示 */}
      {task && (
        <AttachmentList
          taskId={taskId}
          attachments={task.attachments || []}
        />
      )}
    </Box>
  );
}
```

**Next.js Image コンポーネント**:
```typescript
<Image
  src={url}
  alt={fileName}
  fill  // コンテナに満たす
  style={{ objectFit: 'cover' }}
  sizes='(max-width: 768px) 100vw, 33vw' // レスポンシブ画像
  priority={false} // 遅延ロード
/>
// メリット:
// 1. 自動圧縮(JPEG → WebP)
// 2. 遅延ロード
// 3. Cloudinary との統合
// 4. サイズ自動計算
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. **Cloudinary 設定**
   - [ ] 環境変数設定
   - [ ] Upload Widget 実装
   - [ ] 削除API 実装

2. **ファイル管理**
   - [ ] Attachment テーブル作成
   - [ ] アップロード・削除API

3. **表示・最適化**
   - [ ] 画像プレビュー
   - [ ] Next.js Image 使用
   - [ ] ダウンロードボタン

---

## まとめ

- **Cloudinary**: クラウド画像ホスティング
- **Upload Widget**: ブラウザからの直接アップロード
- **Attachment**: タスク ↔️ ファイル の関連付け
- **Next.js Image**: 自動最適化・遅延ロード
- **削除権限**: アップロード者 OR タスク作成者

次回(Day 16)はリアルタイム通知・WebSocket です。
