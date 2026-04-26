# Pro パターン Before/After テンプレート

**適用対象**: `material/30days-curriculum/dayXX_*.md` 全 Day
**原則**: 磯貝さん 3 点再定義 原則 C（プロパターンの Before/After 教示）
**必須要件**: 全 Day に最低 1 箇所（Q3 決定）

---

## 使用目的

学習者が「動くコード」で満足せず、「プロが書くコード」との差分を目で見て理解できるようにする。
**技術トピック単体の Before/After は禁止**。必ず「ワクワクする機能」の文脈で示す。

---

## テンプレート（Markdown に貼り付けて使う）

````markdown
### 💡 Pro パターンで書こう — <ここに機能名を入れる>

ここまでで動くコードは書けた。でもプロの現場ではもう一段上の書き方をする。
なぜ上の書き方をするのか、**Before/After** で見比べてみよう。

#### ❌ Before（動くけど、プロは書かない）

```typescript
// <例: if 連続 / as any / typeof 分岐 / useEffect + fetch / ネストした三項演算子>
<ここに Before コードを貼る>
```

**このコードの問題点**:

- <問題点 1: 具体的に何が良くないか>
- <問題点 2: バグが生まれる余地、保守性、型安全性など>
- <問題点 3: 将来の拡張でどう困るか>

#### ✅ After（プロが書くコード）

```typescript
// <例: 配列メソッド / 判別共用体 / zod 境界バリデーション / tRPC useQuery / early return>
<ここに After コードを貼る>
```

**このコードの強み**:

- <強み 1: なぜ保守性が上がるか>
- <強み 2: なぜ型安全性が上がるか>
- <強み 3: なぜ拡張に強いか>

#### 🎓 覚えておきたいエッセンス

<1-2 行で、このパターンの本質を学習者の記憶に残す形でまとめる>
````

---

## 適用可能な Pro パターン一覧（磯貝さん指定 + 追加候補）

磯貝さんが明示したパターンを中心に、全 Day から **1 Day につき 1 個以上** 選ぶ。

| # | パターン名 | Before の典型 | After の典型 | 適用しやすい Day |
|---|----------|--------------|--------------|--------------|
| 1 | **if 連続 → 配列メソッド** | `if (x === 'a') ...; if (x === 'b') ...` | `[{ key: 'a', fn }, ...].find(...)` | タスクステータス切替（G3 Day 16） |
| 2 | **Map vs switch** | `switch (status) { case 'todo': ... }` | `const handler = STATUS_MAP[status]` | ステータス表示（G3 Day 13） |
| 3 | **early return vs nested ternary** | `status === 'a' ? ... : status === 'b' ? ... : ...` | `if (!user) return null; if (!task) return <Skeleton />; return <Task />` | ログイン判定（G1 Day 07） |
| 4 | **tRPC useQuery vs useEffect + fetch** | `useEffect(() => { fetch(...).then(setData) }, [])` | `const { data } = trpc.task.list.useQuery()` | タスク一覧（G3 Day 13） |
| 5 | **zod vs `as`** | `const user = response as User` | `const user = userSchema.parse(response)` | ユーザー登録（G1 Day 06） |
| 6 | **判別共用体 vs typeof 分岐** | `if (typeof result === 'string') ... else if (typeof result === 'number') ...` | `type Result = { ok: true; data: T } \| { ok: false; error: E }` | API レスポンス（G1 Day 06） |
| 7 | **Props 型 spread vs 個別列挙** | `type Props = { name: string; email: string; ... 10 個 }` | `type Props = Pick<User, 'name' \| 'email'>` | ユーザー一覧（G6 Day 24） |
| 8 | **Optional chaining vs 多段 null check** | `if (user && user.profile && user.profile.avatar) ...` | `user?.profile?.avatar ?? DEFAULT_AVATAR` | プロフィール（G6 Day 25） |
| 9 | **Server Component vs Client Component** | 全部 `"use client"` | 静的描画は Server Component、対話のみ Client Component に分離 | ダッシュボード（G6 Day 21） |
| 10 | **tRPC mutation + optimistic update** | 保存後にリロードして一覧再取得 | `utils.task.list.setData` で楽観的更新 | タスク編集（G3 Day 15） |
| 11 | **Prisma include vs N+1** | `tasks.map(t => prisma.user.findUnique({ where: { id: t.userId } }))` | `prisma.task.findMany({ include: { user: true } })` | タスク一覧（G3 Day 13） |
| 12 | **Enum vs string literal union** | `status: 'todo' \| 'doing' \| 'done'` をあちこちで重複定義 | Prisma `enum TaskStatus` を `@prismaClient` から import | タスク新規（G3 Day 14） |

---

## 適用ルール

1. **各 Day で 1-3 箇所**: 多すぎると学習者が疲れる。1 Day 1 個でも OK。
2. **機能の文脈で示す**: 「このタスクステータス切替を、if 連続で書くとこうなる（動くけど辛い）」→「配列メソッドで書くとこうなる（すっきり）」
3. **学習者の理解段階を尊重**: 早い Day (G1-G2) は基礎的パターン、遅い Day (G5-G7) は高度なパターン
4. **コピペで動くコードを両方載せる**: Before も After も、学習者がエディタに貼って試せる完全な形にする

---

## 禁止事項

❌ **技術トピックだけの Before/After**: 「`any` の使い方 Before/After」みたいな切り口
   → ✅ 「ユーザー登録で `any` を使うとこうなる / zod で境界バリデーションするとこうなる」

❌ **2 つのコードが意味的に違う**: Before と After で挙動が変わっている
   → ✅ 両方とも同じ機能を実現しており、**書き方だけ**が違う

❌ **After が複雑すぎて初学者が理解できない**: 高度なメタプログラミングや魔術的 TypeScript
   → ✅ After は「慣れれば読める」レベル。書き方の方向性を示すのが目的

❌ **Before をバカにするトーン**: 「こんな書き方するやつおる？」
   → ✅ 「動くコードはこれで OK。ただプロはもう一段上を狙う」（学習者が途中で恥ずかしくならないように）

---

## 検証コマンド

```bash
# 全 Day に Before/After が最低 1 箇所ずつあるか
rg -c "### ❌ Before|### ✅ After" material/30days-curriculum/
# 期待: 各 Day 行に 2 以上の数字が出ること
```
