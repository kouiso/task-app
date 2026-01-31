# Day 14: タスク新規作成を実装しよう

## 🎯 今日のゴール

新しいタスクを作成できるフォーム画面を実装します。タイトル、説明、優先度、期限、担当者を設定できるようにします。

【スクリーンショット: タスク作成フォーム】

## 🤔 なぜこれを作るのか?

タスク管理の出発点となる機能です。**タスク作成は料理のレシピを書くようなもの**。何を作るか（タイトル）、どう作るか（説明）、いつまでに（期限）、誰が作るか（担当者）を明確にすることで、作業がスムーズに進みます。

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | 作成ページを作成 | 10分 |
| Step 2 | フォーム実装 | 20分 |
| Step 3 | tRPC mutationで保存 | 15分 |
| Step 4 | 担当者選択 | 15分 |

**合計時間**: 約60分

---

### Step 1: 作成ページを作成（10分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/tasks/new/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { Box, Typography } from '@mui/material';

export default function NewTaskPage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">新規タスク作成</Typography>
    </Box>
  );
}
```

✅ **確認ポイント**: /projects/[id]/tasks/newにアクセスできる

---

### Step 2: フォーム実装（20分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/tasks/new/page.tsx
import { useState } from 'react';
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

export default function NewTaskPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ title, description, priority, dueDate });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>新規タスク作成</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          required
          label="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          multiline
          rows={4}
          label="説明"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>優先度</InputLabel>
          <Select
            value={priority}
            label="優先度"
            onChange={(e) => setPriority(e.target.value)}
          >
            <MenuItem value="LOW">低</MenuItem>
            <MenuItem value="MEDIUM">中</MenuItem>
            <MenuItem value="HIGH">高</MenuItem>
            <MenuItem value="URGENT">緊急</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          type="date"
          label="期限"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />
        <Button type="submit" variant="contained" fullWidth>
          作成
        </Button>
      </form>
    </Box>
  );
}
```

✅ **確認ポイント**: フォームが表示され、入力できる

---

### Step 3: tRPC mutationで保存（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/tasks/new/page.tsx
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';

export default function NewTaskPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();

  const createMutation = api.task.create.useMutation({
    onSuccess: () => {
      router.push(`/projects/${projectId}/tasks`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      projectId,
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      {/* フォーム内容は同じ */}
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? '作成中...' : '作成'}
      </Button>
    </Box>
  );
}
```

✅ **確認ポイント**: タスクが作成され、一覧ページに戻る

---

### Step 4: 担当者選択（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/tasks/new/page.tsx
export default function NewTaskPage() {
  const [assigneeId, setAssigneeId] = useState('');

  const { data: members } = api.project.getMembers.useQuery({ projectId });

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>新規タスク作成</Typography>
      <form onSubmit={handleSubmit}>
        {/* 他のフィールド */}

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>担当者</InputLabel>
          <Select
            value={assigneeId}
            label="担当者"
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <MenuItem value="">未割当</MenuItem>
            {members?.map((member) => (
              <MenuItem key={member.userId} value={member.userId}>
                {member.user.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button type="submit" variant="contained" fullWidth>
          作成
        </Button>
      </form>
    </Box>
  );
}
```

✅ **確認ポイント**: プロジェクトメンバーから担当者を選択できる

---

## 📝 学んだこと

- **Select コンポーネント**: ドロップダウンリストの実装
- **date型input**: HTML5のdate inputで日付選択
- **InputLabelProps**: shrinkでラベルの動きを制御
- **disabled属性**: 送信中のボタンを無効化してダブルクリック防止
- **リレーション取得**: tRPCでプロジェクトメンバーを取得

## 📋 今日のまとめ

- [ ] タスク作成ページを作成できた
- [ ] フォームを実装できた
- [ ] tRPC mutationでデータを保存できた
- [ ] 担当者を選択できるようにした

## ⚠️ つまずきポイント

| 問題 | 原因 | 解決策 |
|------|------|--------|
| 日付が送信されない | dueDate が空文字列のまま | 空の場合は undefined に変換 |
| 担当者が表示されない | members が undefined | オプショナルチェーン `members?.map()` を使用 |
| 作成後に画面が変わらない | onSuccess が動作していない | router.push() の引数を確認 |

## 🔗 次回予告

Day 15では、タスクの編集・削除機能を実装します。
