# Day 12: メンバー追加を実装しよう

## 🎯 今日のゴール

プロジェクトにメンバーを追加できる機能を実装します。ユーザー一覧から選択して、ロールを指定できるようにします。

【スクリーンショット: メンバー追加画面】

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | メンバー一覧表示 | 10分 |
| Step 2 | メンバー追加フォーム | 15分 |
| Step 3 | ロール選択機能 | 10分 |
| Step 4 | メンバー削除機能 | 10分 |

**合計時間**: 約45分

---

### Step 1: メンバー一覧表示（10分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/members/page.tsx
const { data: members } = api.project.getMembers.useQuery({ projectId: id });

return (
  <div>
    {members?.map((member) => (
      <div key={member.id}>
        {member.user.name} ({member.role})
      </div>
    ))}
  </div>
);
```

✅ **確認ポイント**: メンバー一覧が表示される

【スクリーンショット: 確認画面】

---

### Step 2: メンバー追加フォーム（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/members/page.tsx（メンバー追加部分）
const { data: users } = api.user.getAll.useQuery();
const addMemberMutation = api.project.addMember.useMutation();

const handleAdd = () => {
  addMemberMutation.mutate({
    projectId: id,
    userId: selectedUserId,
    role: selectedRole,
  });
};
```

✅ **確認ポイント**: メンバーが追加される

【スクリーンショット: 確認画面】

---

## 📋 今日のまとめ

- [ ] メンバー一覧を表示できた
- [ ] メンバーを追加できた
- [ ] ロールを選択できた

## 🔗 次回予告

Day 13では、タスク一覧画面を作成します。
