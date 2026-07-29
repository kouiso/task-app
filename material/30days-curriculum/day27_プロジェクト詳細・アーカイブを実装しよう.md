# Day 27: プロジェクト詳細・アーカイブを実装しよう

## 前回の振り返り

Day 26ではエラーページ（404・500）を実装し、予期せぬエラーが起きたときでもユーザーを安全に案内できるようにしました。今日はプロジェクト管理画面をさらに使いやすくするために、**プロジェクト詳細表示**と**アーカイブ機能**を実装します。

---

## 今日のゴール

プロジェクト一覧から1件を選ぶと、同じ `/project` ページの中で **一覧表示から詳細表示へ切り替わる UI** を実装します。詳細画面では次の情報を扱います。

![プロジェクト詳細画面の完成イメージ](./screenshots/project-detail-tasks.png)

![別のプロジェクトの詳細画面。右上にアーカイブボタンがある](./screenshots/project-detail-archive-action.png)

- プロジェクト名・色・説明
- メンバー一覧
- タスク一覧
- アーカイブ / アーカイブ解除

> **今日のゴールライン**: URLのprojectIdで一覧と詳細を切り替え、アーカイブまで同じページ内で扱える感覚を掴めれば大丈夫です。
>
> 現在の完成形は `ProjectDetailDialog` のモーダルではなく、`ProjectDetailView` を使った**インライン詳細表示**です。URL は `/project?projectId=xxx` のように変わり、同じページの中で一覧 ↔ 詳細を切り替えます。
>
> **この Day は Day 11・12 で作った機能の
> 統合確認です。** 以下のコードは完成状態との
> 照合用です。同じ名前の state、query、mutation、
> handler、Props を追加し直してはいけません。
> 不足がある場合だけ、該当箇所を補ってください。
>
> `project-detail-view.tsx` は Day 01 の配布物に完成した形で入っています。
> この Day のコードブロックは**読んで見比べるためのもの**で、書き写す必要はありません。
> 「保存できない」「エラーが出る」といった記述も、書き写した場合の話として読んでください。

## なぜこれを作るのか

プロジェクト管理アプリでは、「このプロジェクトには誰が入っているのか」「今どんなタスクがあるのか」をすぐ確認できる必要があります。

今回は詳細を別ルートに分離するのではなく、一覧ページの延長として表示を切り替える構成にします。この構成には次の利点があります。

- URL に `projectId` が残るので再読み込みや共有に強い
- 一覧画面へ戻る導線をシンプルに保てる
- ページ全体の責務を `page.tsx` に集約しやすい

また、完了したプロジェクトは削除ではなく**アーカイブ**します。アーカイブは「使わないものを棚にしまう」イメージです。履歴は残したまま、普段の一覧からは外せます。

### 今日実装する全体像

```mermaid
flowchart TD
    A["/project 一覧表示"] -->|"カードをクリック"| B["router.push('/project?projectId=...')"]
    B --> C["page.tsx が searchParams.projectId を読む"]
    C --> D["selectedProject をセット"]
    D --> E["api.project.getById を取得"]
    E --> F["ProjectDetailView をインライン表示"]
    F --> G["メンバー一覧"]
    F --> H["タスク一覧"]
    F --> I["アーカイブ / アーカイブ解除"]
    I --> J["tRPC: project.archive / unarchive"]
    J --> K["一覧を invalidate して /project に戻る"]
```

この図で目を留めてほしいのは、B から C への戻りです。カードをクリックしたとき、`selectedProject` を直接書き換えてはいません。いったん URL を書き換えて、そのあと `page.tsx` が URL を読み直して `selectedProject` に反映します。遠回りに見えますが、画面の状態を決める大元が URL 1か所にそろいます。だから再読み込みしても、リンクを人に送っても、同じ詳細画面が開きます。

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| 一覧 ↔ 詳細の表示切り替え | 詳細モーダルの新規採用 |
| 配布済みの `ProjectDetailView` に詳細表示を書き足す | タスクの編集機能 |
| アーカイブ / アーカイブ解除 | アーカイブ専用ページの新設 |
| メンバー追加・削除の導線 | メンバー権限変更 UI |

### 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| `useSearchParams` | ユースサーチパラメータ | URL クエリを読む | ブラウザの住所欄から条件を読む |
| `router.push()` | ルータープッシュ | URL を変えて画面状態を切り替える | 本にしおりを挟んで場所を移す |
| `inferRouterOutputs` | インファー・ルーター・アウトプット | tRPC の戻り値から型を自動取得 | レシートから商品一覧の型を読む |
| アーカイブ | アーカイブ | 削除ではなく `isArchived` で隠す | 本棚の奥にしまう |

### 復習する概念

| 概念 | 初出 |
|------|------|
| `useState` / `useEffect` | Day 10 以降 |
| コールバック Props | Day 15 以降 |
| `useQuery` / `useMutation` | Day 20 以降 |

---

## 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 | 触るファイル | 成功状態 |
|---------|---------|---------|-------------|---------|
| Step 1 | アーカイブ API を確認・実装する | 5分 | `src/server/api/routers/project.ts` | `archive` / `unarchive` が呼べる |
| Step 2 | 一覧 ↔ 詳細の切り替えを作る | 8分 | `src/app/project/page.tsx` | カードクリックで詳細へ切り替わる |
| Step 3 | `ProjectDetailView` の型と骨格を作る | 8分 | `src/component/project/project-detail-view.tsx` | 戻るボタン付きの詳細画面が出る |
| Step 4 | メンバー一覧とタスク一覧を表示する | 10分 | `project-detail-view.tsx` | 主要情報が確認できる |
| Step 5 | アーカイブ / アーカイブ解除をつなぐ | 5分 | `page.tsx`, `project-detail-view.tsx` | ボタンで状態が切り替わる |
| Step 6 | 補助ダイアログと完成形を整える | 5分 | `src/app/project/page.tsx` | メンバー追加・削除確認も動く |

**合計時間**: 約41分です。

この時間はコードを読んで理解する目安です。写経して打ち込む時間、詰まって調べる時間は別に見てください。

---

### Step 1: アーカイブ API を確認・実装する (5分)

**ゴール**: `project.archive` と `project.unarchive` で `isArchived` を切り替えられるようにします。

Day 11 で実装済みなら、ここではコードを追加せず
次の完成形と照合してください。同名 procedure を
追加すると重複定義になるため、書き直しません。

まず前提です。アーカイブは**削除ではありません**。

| 方法 | 仕組み | 復元 | 向いている用途 |
|------|--------|------|---------------|
| 完全削除 | レコード自体を消す | 不可 | 本当に不要なデータ |
| アーカイブ | `isArchived` を切り替える | 可 | 過去プロジェクトの退避 |

Prisma スキーマに `isArchived` があることを確認します。

```prisma
model Project {
  id          String    @id @default(cuid())
  name        String
  description String?
  color       String    @default("#1976d2")
  isArchived  Boolean   @default(false) @map("is_archived")
  startDate   DateTime? @map("start_date")
  endDate     DateTime? @map("end_date")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
}
```

現在の実装では、`archive` と `unarchive` は共通ヘルパー `setArchiveStatus` を使っています。

```ts
// filepath: src/server/api/routers/project.ts
const setArchiveStatus = async (userId: string, projectId: string, isArchived: boolean) => {
  const userMember = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
  });

  assertMemberPermission(userMember ? [userMember] : [], 'canArchive');

  return await prisma.project.update({
    where: { id: projectId },
    data: { isArchived },
  });
};
```

ポイントは次の2つです。

- 権限確認は `prisma.project` ではなく `prisma.projectMember` で行う
- `assertMemberPermission(..., 'canArchive')` でアーカイブ権限を明示する

`prisma.project` を引いても、そのユーザーがそのプロジェクトの何なのかは分かりません。役割が載っているのは `ProjectMember` の行のほうです。`assertMemberPermission` は渡された配列の先頭を見て、行が1つも無ければ `FORBIDDEN` を返します。だから `findUnique` が `null` を返す「そもそも参加していない人」は、ここで止まります。第2引数の `'canArchive'` を渡すと、役割の中身まで見ます。`canArchive` が `true` の役割は `OWNER` だけなので、管理者でもアーカイブはできません。この引数を省くと「メンバーなら誰でもアーカイブできる」に意味が変わってしまいます。

ルーター本体はシンプルです。

```ts
// filepath: src/server/api/routers/project.ts
archive: protectedProcedure
  .input(z.object({ id: z.string().cuid() }))
  .mutation(async ({ ctx, input }) => {
    return await setArchiveStatus(ctx.session.userId, input.id, true);
  }),

unarchive: protectedProcedure
  .input(z.object({ id: z.string().cuid() }))
  .mutation(async ({ ctx, input }) => {
    return await setArchiveStatus(ctx.session.userId, input.id, false);
  }),
```

2つの procedure で違うのは、最後に渡す `true` と `false` だけです。1つにまとめて現在値を反転させる作り方もできますが、そうすると画面が送ってきた「今の状態」を信じることになります。同じプロジェクトを2人が開いていると、反転した結果がお互いにずれます。呼ぶ名前で結果を決めておけば、サーバーが受け取るのは「こうしたい」という最終状態だけです。`archive` を続けて2回呼んでも、`isArchived` は `true` のままで変わりません。権限確認をヘルパー1か所に寄せてあるので、片方だけ確認を書き忘れる事故も起きません。

**確認ポイント**

- `archive` と `unarchive` の両方がある
- どちらも `setArchiveStatus` を使っている
- `getAll` は `isArchived` で一覧を絞り込める

---

### Step 2: 一覧 ↔ 詳細の切り替えを作る (8分)

**ゴール**: 一覧カードをクリックしたら URL の `projectId` を更新し、同じ `/project` ページ内で詳細表示へ切り替えます。

この state、query、handler、描画分岐は
Day 11・12 で実装済みです。以下は追加手順ではなく
照合用です。同名の宣言があれば変更しません。

現在の完成形では、`page.tsx` が**画面全体の分岐役**です。

- `projectId` が無いとき: 一覧を表示
- `projectId` があるとき: `ProjectDetailView` を表示

まず `searchParams` と state を用意します。

```ts
// filepath: src/app/project/page.tsx
const [selectedProject, setSelectedProject] = useState<string | null>(null);

const searchParams = useSearchParams();
const projectIdParam = searchParams.get('projectId');
const router = useRouter();

useEffect(() => {
  if (projectIdParam) {
    setSelectedProject(projectIdParam);
  } else {
    setSelectedProject(null);
  }
}, [projectIdParam]);
```

`selectedProject` は詳細取得用の ID です。実際の切り替えトリガーは URL に置いているので、再読み込みしても状態を復元できます。

詳細データの取得は `selectedProject` があるときだけ行います。

```ts
// filepath: src/app/project/page.tsx
const { data: projectDetail } = api.project.getById.useQuery(
  { id: selectedProject ?? '' },
  { enabled: !!selectedProject },
);
```

`useQuery` は Day 09 で書いたときと同じで、置いておくだけで自動的に走ります。ところが一覧を見ている間は `selectedProject` が `null` です。そのままだと、空の ID で詳細を取りに行ってサーバー側でエラーになります。それを止めているのが第2引数の `enabled` です。`!!selectedProject` が `false` の間、この `useQuery` は通信そのものを行いません。第1引数の `?? ''` は、その間も `id` が文字列であるという型の約束を満たすための埋め合わせで、この空文字が実際に送られることはありません。

カードクリック時は `router.push()` で URL を変えます。

```ts
// filepath: src/app/project/page.tsx
const handleProjectClick = (projectId: string) => {
  router.push(`/project?projectId=${projectId}`);
};

const handleDetailClose = () => {
  router.push('/project');
};
```

どちらのハンドラーも `setSelectedProject` を呼んでいません。やっているのは URL の書き換えだけです。ここで state も一緒に書き換えたくなりますが、そうすると更新の経路が2本になります。ブラウザの戻るボタンを押したとき、URL だけ `/project` に戻って詳細の表示が残る、という食い違いはその一例です。URL を唯一の起点にしておけば、上で書いた `useEffect` が `projectIdParam` の変化を受け取って、state のほうを合わせてくれます。

最後に、`projectIdParam` があるかどうかで描画を分岐します。

```tsx
// filepath: src/app/project/page.tsx
if (projectIdParam && selectedProject) {
  return (
    <AppLayout>
      <ProjectDetailView
        projectDetail={projectDetail}
        onBack={handleDetailClose}
        onAddMemberClick={() => setMemberDialogOpen(true)}
        onRemoveMember={handleRemoveMember}
        onUpdateMemberRole={handleUpdateMemberRole}
        onArchive={handleArchive}
        canManageMembers={canManageMembers}
        canArchive={canArchiveProject}
      />
    </AppLayout>
  );
}
```

肝心なのは、この分岐が `if` の中の `return` になっている点です。ここで `return` すると、この下に書いてある一覧の JSX には一切進みません。条件を満たすときだけ詳細を返す形なので、一覧と詳細が同時に描かれる状態になりません。条件に `projectIdParam && selectedProject` と2つ並べているのにも理由があります。`/project?projectId=...` を直接開いた1回目の描画では `useEffect` がまだ走っておらず、`selectedProject` は `null` のままです。詳細データを取りに行くクエリは `selectedProject` を使うので、この時点ではまだ動いていません。`projectIdParam` だけで判定すると、この1回だけ中身の無い詳細画面が出ます。ただし、詳細から別の詳細へ URL を直接切り替えたときは、この2つでは前の内容を止められません。両方に値が入ったままなので、切り替え直後の1回は前のプロジェクトの詳細が残ります。Props を8つも渡しているのは、`ProjectDetailView` が自分ではデータを取りに行かないためです。

**確認ポイント**

- 一覧クリックで `/project?projectId=...` に変わる
- URL を直接開いても詳細が表示される
- 戻るボタンで `/project` に戻る

---

### Step 3: `ProjectDetailView` の型と骨格を作る (8分)

**ゴール**: モーダルではなく、ページ内に表示する詳細ビューコンポーネントを作ります。

Day 12 で作成済みのファイルを削除したり、
5 props の旧形式へ置き換えたりしないでください。
現在の8 props 契約を、次の完成形と照合します。

まず tRPC の戻り値から型を取ります。

```ts
// filepath: src/component/project/project-detail-view.tsx
import type { inferRouterOutputs } from '@trpc/server';
import type {
  ProjectMemberRole,
} from '@/lib/constant/roles';
import type { AppRouter } from '@/server/api/root';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ProjectDetail = RouterOutputs['project']['getById'];
```

ここで `ProjectDetail` の中身を自分で書き並べないのが肝心なところです。`inferRouterOutputs` は、サーバー側の手続きが実際に返す形をそのまま取り出して型にしてくれます。Day 09 の `getAll` でメンバーとタスクを `include` して返したように、`getById` も関連データを一緒に返します。その入れ子の形まで自動で付いてくるので、`{ id: string; name: string; ... }` と手で書く必要はありません。手書きにすると、あとで `include` を1つ増やしたときに画面側の型だけが古いまま取り残されます。

Props は次の形です。

```ts
// filepath: src/component/project/project-detail-view.tsx
interface ProjectDetailViewProps {
  projectDetail: ProjectDetail | null | undefined;
  onBack: () => void;
  onAddMemberClick: () => void;
  onRemoveMember: (userId: string) => void;
  onUpdateMemberRole?: (
    userId: string,
    role: ProjectMemberRole,
  ) => void;
  onArchive: (projectId: string, isArchived: boolean) => void;
  canManageMembers?: boolean;
  canArchive?: boolean;
}
```

末尾の3つに `?` が付いているのは、Day 11 の呼び出しがこの3つを渡さないためです。
必須にすると Day 11 で書いた記述が型エラーになります。

8つと聞くと多く感じますが、中身は2種類しかありません。`projectDetail` と `canManageMembers` / `canArchive` は「表示に必要な材料」、`on` で始まる5つは「押されたことを親に伝える窓口」です。裏を返すと、`ProjectDetailView` は mutation を1つも持ちません。通信も権限の判定もこの部品の仕事ではありません。Day 15 以降で使ってきたコールバック Props と同じ考え方で、判断は `page.tsx` に集めます。こう分けておくと、あとで詳細を別ページへ移したくなったときも、この部品はそのまま持っていけます。

現在の完成形は、データが見つからないケースも自前で処理します。

```tsx
// filepath: src/component/project/project-detail-view.tsx
if (!projectDetail) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
      <p>プロジェクトが見つかりません。</p>
      <Button variant="ghost" className="mt-4" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        プロジェクト一覧に戻る
      </Button>
    </div>
  );
}
```

Props の型が `ProjectDetail | null | undefined` になっているので、この `if` は中身が無い場面をまとめて受け止めます。まだ通信が終わっていない `undefined` のときと、親から明示的に `null` を渡されたときです。存在しない ID を開いたときは `null` にはなりません。`project.getById` が `NOT_FOUND` を投げるので、`data` は `undefined` のままで、代わりに `error` のほうに中身が入ります。どの場合もこの `if` が受け止めます。ただし、受け止め方は同じでも中身は違います。通信中も、通信に失敗したときも、この案内は「プロジェクトが見つかりません」と出ます。読者から見ると、待っているだけなのか本当に無いのかが分かりません。実務では `isLoading` と `error` も親から渡し、待機中・失敗・不在の3つを別々に出し分けます。今日は3つを1つにまとめた形で進めます。そしてこの早い `return` には、もう1つの効き目があります。ここを通り抜けた先では、TypeScript が「`projectDetail` には必ず中身がある」と判断してくれます。だからこの後に出てくる `projectDetail.color` や `projectDetail.name` を、`?.` を付けずにそのまま書けます。逆にこの `if` を消すと、以降のすべての参照で型エラーが出ます。

詳細ビュー本体の骨格はこうなります。

```tsx
// filepath: src/component/project/project-detail-view.tsx
return (
  <div className="flex flex-col gap-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          プロジェクト一覧
        </Button>
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: projectDetail.color }}
          />
          <h1 className="text-3xl font-bold tracking-tight">{projectDetail.name}</h1>
        </div>
      </div>
    </div>

    {projectDetail.description && (
      <p className="text-muted-foreground">{projectDetail.description}</p>
    )}

    <div className="grid gap-6 lg:grid-cols-2">
```

先に外枠だけを置いています。上から順に、戻るボタンと色の丸と名前を1行に並べたヘッダー、説明文、そして下半分に来る2カラムの入れ物、という3段構えです。`projectDetail.description && (...)` としてあるので、説明が空のプロジェクトでは段落そのものが出ません。空の `<p>` が残って行間だけ空くのを防げます。`lg:grid-cols-2` は Day 09 のグリッドと同じ考え方で、画面が広いときだけ横2列にします。スマートフォンの幅ではメンバーとタスクが縦に積まれます。

なお最後の `<div className="grid ...">` は開いたままです。閉じタグが足りない状態なので、この時点では保存してもエラーが出ます。続きを次のブロックで書きます。

```tsx
      {/* filepath: src/component/project/project-detail-view.tsx（同じファイルの続き） */}
      {/* Step 4 でメンバー一覧とタスク一覧を入れる */}
    </div>
  </div>
);
```

閉じタグが2つ並ぶだけのブロックですが、どれがどれを閉じるかを数えておいてください。1つ目の `</div>` が `grid gap-6 lg:grid-cols-2` を、2つ目が一番外側の `flex flex-col gap-6` を閉じます。JSX は開いたタグが閉じていないとビルドで止まるため、ここまで書いて初めてファイルが保存できる状態になります。中のコメント行は Step 4 で中身に置き換える目印で、このままでも表示は崩れません。2カラムの入れ物だけが先にあり、そこに入るカードがまだ無い状態です。

**確認ポイント**

- モーダルの `Dialog` は使っていない
- 戻るボタンは `onBack` で親に処理を委譲している
- 詳細画面は 2 カラムのカード構成になっている

---

### Step 4: メンバー一覧とタスク一覧を表示する (10分)

**ゴール**: `ProjectDetailView` の中に、メンバー一覧とタスク一覧の 2 つのカードを配置します。ここで作るのは完成版を少し削った形です。削ってある部分は、それぞれのカードを書き終えたところで説明します。

Day 12 で実装済みなら、以下は読み比べだけ行います。
既存の権限制御やロール変更 UI を残してください。

メンバーカードは `Card` と `Avatar` を使って構成します。

```tsx
{/* filepath: src/component/project/project-detail-view.tsx */}
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
    <CardTitle className="text-lg">
      メンバー ({projectDetail.members?.length ?? 0})
    </CardTitle>
    <Button variant="outline" size="sm" onClick={onAddMemberClick}>
      <UserPlus className="mr-2 h-4 w-4" /> メンバー追加
    </Button>
  </CardHeader>
  <CardContent>
    <div className="grid gap-2">
      {projectDetail.members?.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
        >
          <div className="flex items-center gap-3">
            <Avatar>
              {member.user?.avatar && <AvatarImage src={member.user.avatar} alt="" />}
              <AvatarFallback>
                {(member.user?.name || member.user?.email || '?')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
```

`Avatar` の中を2段構えにしているのは、アイコン画像を持たないメンバーがいるからです。`member.user?.avatar` があるときだけ `AvatarImage` を出し、無ければ `AvatarFallback` が受け止めて、名前かメールの1文字目を大文字にして丸の中に置きます。`(member.user?.name || member.user?.email || '?')` と3段に重ねてあるのは、名前とメールが両方空だったときに `?` を出すためです。ここを `member.user.name[0]` と素直に書くと、名前が空のメンバーが1人いるだけで、描画の途中で例外が飛びます。Day 26 で `error.tsx` を置いたので、行き先は真っ白な画面ではなく、あのエラーページです。それでも、1人分のデータ欠けで詳細画面ごと消える点は変わりません。

`<Avatar>` を閉じた直後で切れているので、続きを次のブロックで書きます。

```tsx
            {/* filepath: src/component/project/project-detail-view.tsx（同じファイルの続き） */}
            <div>
              <p className="font-medium">{member.user?.name || member.user?.email || '不明'}</p>
              <Badge variant="outline" className="text-xs">
                {isProjectMemberRole(member.role)
                  ? PROJECT_MEMBER_ROLE_LABELS[member.role]
                  : member.role}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${member.user?.name || member.user?.email || '不明'}をプロジェクトから削除`}
            onClick={() => onRemoveMember(member.userId)}
            disabled={member.role === PROJECT_MEMBER_ROLE.OWNER}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

この一覧でいちばん大事な1行は、削除ボタンの `disabled={member.role === PROJECT_MEMBER_ROLE.OWNER}` です。最後のオーナーを消せてしまうと、そのプロジェクトを操作できる人が誰も残らず、誰も直せない状態のプロジェクトが残ります。押せない見た目にしておけば、うっかりクリックがそこで止まります。ここでは相手がオーナーなら一律で押せなくしているので、オーナーが2人以上いるプロジェクトでも片方を外せません。サーバー側の `removeMember` は2段構えで止めます。オーナー以外がオーナーを外そうとしたら `FORBIDDEN` で拒み、そのうえでオーナーが1人しか残っていなければ `BAD_REQUEST` で拒みます。つまりオーナー同士なら2人目以降を外せるので、一律で押させない画面のほうが厳しい作りです。安全側に倒した分、オーナーの入れ替えは画面からはできません。ただし画面側の `disabled` は入口の防波堤にすぎません。本当の門番は Step 1 で見た `assertMemberPermission` で、そちらが最後に権限を確かめます。ロール名を `PROJECT_MEMBER_ROLE_LABELS` に通しているのも同じ発想で、`'OWNER'` という英字をそのまま出さず、他の画面と同じ日本語のラベルにそろえます。

削除ボタンはアイコン1つなので、`aria-label` で名前を付けています。Day 16 で見たとおり、名前が無いと読み上げでは同じボタンが人数分並ぶだけになり、どの行を押しているのか分かりません。

ここで書いたメンバーカードは、完成版から2つ削ってあります。完成版はロール名をただのラベルではなく `Select` で出し、その場で権限を変えられます。さらに `canManageMembers` が false の人には `Select` と削除ボタンを見せず、ラベルだけの読み取り専用にします。今日はまず一覧を出すところまでで、この出し分けは Day 12 で書いた既存のコードにそのまま残しておいて問題ありません。

タスクカードは 0 件のときの表示も入れておくのがポイントです。

```tsx
{/* filepath: src/component/project/project-detail-view.tsx */}
<Card>
  <CardHeader className="space-y-0 pb-4">
    <div className="flex items-center gap-2">
      <CheckSquare className="h-5 w-5 text-muted-foreground" />
      <CardTitle className="text-lg">タスク ({projectDetail.tasks?.length ?? 0})</CardTitle>
    </div>
  </CardHeader>
  <CardContent>
    <div className="grid gap-2">
      {projectDetail.tasks?.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          タスクがありません。
        </p>
      ) : (
        projectDetail.tasks?.map((task) => (
          <div
            key={task.id}
            className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <p className="font-medium">{task.title}</p>
            <div className="flex gap-2">
              <StatusBadge status={task.status} />
```

タスクカードで先に書いてあるのは、0 件のときの分岐です。`projectDetail.tasks?.length === 0` を最初に見て、空なら「タスクがありません。」の1行だけを出します。これが無いと、タスクを作っていないプロジェクトでは枠の中が空のまま残ります。読み込み中と失敗は手前の `if (!projectDetail)` が受け止めているので、ここへ来た時点での0件は「まだタスクが無い」以外にありません。それを1行で言い切っておくと、画面が壊れているのかタスクが無いだけなのかで読者が迷いません。`StatusBadge` はタスク一覧でも使っている共通の部品で、`task.status` を渡すだけで状態に応じた色の札になります。ここで色分けを直に書かないので、状態の色を変えたいときは部品側を1か所直すだけで全画面に効きます。

見出しの件数も、完成版とは数え方が違います。ここでは `projectDetail.tasks?.length ?? 0` として全件を数えますが、完成版はキャンセル済みを外した件数を `タスク (3)` のように出し、外した分を「（キャンセル済 1）」と脇に添えます。Day 21 の統計カードと同じで、中止したタスクを混ぜると「今動いている作業の量」として読めなくなるためです。今日は数え分けまでは踏み込まず、まず一覧が出る状態を作ります。

こちらも `<div>` の途中で切れています。続きを次のブロックで書きます。

```tsx
              {/* filepath: src/component/project/project-detail-view.tsx（同じファイルの続き） */}
              <Badge variant={getPriorityBadgeVariant(task.priority)}>
                {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
              </Badge>
            </div>
          </div>
        ))
      )}
    </div>
  </CardContent>
</Card>
```

優先度の札だけは専用の部品にせず、共通の `Badge` に `variant` を渡す形にしています。色を決める役目は `getPriorityBadgeVariant` が持っていて、`URGENT` なら `destructive`、`HIGH` なら `default`、`MEDIUM` なら `secondary`、残りは `outline` を返します。ここで `task.priority === 'URGENT' ? ... : ...` と書き始めると、同じ優先度がタスク一覧と詳細で違う色になっていきます。文字のほうは `TASK_PRIORITY_LABELS[task.priority]` を通して「緊急」「高」「中」「低」の日本語にします。`?? task.priority` を添えてあるのは、対応表で見つからない値が届いても札を空にしないためです。

**確認ポイント**

- メンバー追加ボタンがヘッダー右上にある
- オーナーの削除ボタンは無効化される
- タスク 0 件でも空表示で崩れない

---

### Step 5: アーカイブ / アーカイブ解除をつなぐ (5分)

**ゴール**: 詳細画面上部のボタンで `archive` / `unarchive` を切り替えられるようにします。

Day 11 で作った mutation と handler があれば、
追加し直さず、次の条件を満たすか確認します。

`ProjectDetailView` 側では「どちらを呼ぶか」は判断せず、現在状態だけを親へ渡します。

```tsx
{/* filepath: src/component/project/project-detail-view.tsx */}
<Button
  variant="outline"
  onClick={() => onArchive(projectDetail.id, projectDetail.isArchived)}
>
  {projectDetail.isArchived ? (
    <>
      <ArchiveRestore className="mr-2 h-4 w-4" /> アーカイブ解除
    </>
  ) : (
    <>
      <Archive className="mr-2 h-4 w-4" /> アーカイブ
    </>
  )}
</Button>
```

このボタンは `archive` と `unarchive` のどちらを呼ぶかを決めていません。親に渡しているのは `projectDetail.isArchived`、つまり今どちらの状態なのかという事実だけです。判断を親に預けておくと、あとで「アーカイブ前に確認ダイアログを挟む」と決めても、直すのは `page.tsx` の1か所で済みます。表示のほうは `isArchived` を見て文字とアイコンを入れ替えるので、アーカイブが成功して詳細のデータが取り直されると、ラベルも自動で反対側へ変わります。押すたびに文字を書き換える処理を自分で持つ必要はありません。

親の `page.tsx` では 2 つの mutation を持ちます。

```ts
// filepath: src/app/project/page.tsx
const archiveMutation = api.project.archive.useMutation({
  onSuccess: () => {
    utils.project.getAll.invalidate();
    router.push('/project');
  },
});

const unarchiveMutation = api.project.unarchive.useMutation({
  onSuccess: () => {
    utils.project.getAll.invalidate();
    router.push('/project');
  },
});
```

2つの mutation で `onSuccess` の中身がそろっているのは、どちらも「一覧の中身が変わった」という同じ結果を生むからです。`utils.project.getAll.invalidate()` は、tRPC が手元に持っている一覧のデータに古いという印を付けて、次に表示されるときに取り直させます。これを忘れると、アーカイブしたはずのプロジェクトが一覧に残って見えます。サーバー側は正しく更新されているのに画面だけが古い、という一番気付きにくいずれ方です。続く `router.push('/project')` で詳細から一覧へ戻すので、読者は取り直された一覧をその場で確かめられます。

切り替え関数は次の通りです。

```ts
// filepath: src/app/project/page.tsx
const handleArchive = (projectId: string, isArchived: boolean) => {
  const mutation = isArchived ? unarchiveMutation : archiveMutation;
  mutation.mutate({ id: projectId });
};
```

3行しかありませんが、この関数がアーカイブ機能の分かれ道です。受け取る `isArchived` は今の状態なので、`true`（すでにアーカイブ済み）なら呼ぶのは `unarchiveMutation` のほうです。渡ってくるのは現在で、呼ぶのは反対側、と覚えてください。ここを逆にすると、アーカイブ済みのプロジェクトをもう一度アーカイブする通信になります。エラーにはならず、ボタンを押しても何も変わらないので、原因を見つけるのに時間がかかります。`useMutation` の戻り値をいったん変数に入れてから `mutate` を呼べるのは、戻り値がただのオブジェクトだからです。おかげで `if` を2つに分けて同じ `mutate` を2回書かずに済みます。

**確認ポイント**

- 未アーカイブなら「アーカイブ」と表示される
- アーカイブ済みなら「アーカイブ解除」と表示される
- 成功後は `/project` に戻って一覧が更新される

---

### Step 6: 補助ダイアログと完成形を整える (5分)

**ゴール**: 詳細表示はインラインのままにしつつ、補助的なモーダルだけ `page.tsx` 側で扱う現在構成を完成させます。

Day 12 で実装済みのダイアログや state は
再宣言しません。以下は配置と動作の確認用です。

ここが少し重要です。**いまも `Dialog` は使っていますが、詳細表示のためではありません。**

- `ProjectDialog`: プロジェクト作成 / 編集用
- メンバー追加用 `Dialog`
- 削除確認用 `DeleteConfirmDialog`

つまり、現在の役割分担はこうです。

| コンポーネント | 役割 |
|---------------|------|
| `ProjectDetailView` | 詳細をインライン表示する |
| `ProjectDialog` | プロジェクト作成・編集 |
| `DeleteConfirmDialog` | 削除確認 |

メンバー削除は即時実行ではなく、確認ダイアログを挟みます。

```ts
// filepath: src/app/project/page.tsx
const handleRemoveMember = (userId: string) => {
  setRemoveMemberTargetId(userId);
  setRemoveMemberDialogOpen(true);
};
```

この関数は削除そのものを行いません。誰を消すのかを `removeMemberTargetId` に覚えて、ダイアログを開くところまでです。実際に消すのは、次に置く `DeleteConfirmDialog` の `onConfirm` の中です。ここで即座に mutation を呼ぶ形にすると、押し間違いがそのままメンバーの削除になります。取り消せない操作では「対象を覚える」と「実行する」を2段に分ける、という形を覚えてください。`ProjectDetailView` 側が `onRemoveMember` を呼ぶだけで済んでいるのも、この2段を親が引き受けているからです。

```tsx
{/* filepath: src/app/project/page.tsx */}
<DeleteConfirmDialog
  open={removeMemberDialogOpen}
  onOpenChange={setRemoveMemberDialogOpen}
  onConfirm={() => {
    if (selectedProject && removeMemberTargetId) {
      removeMemberMutation.mutate({
        projectId: selectedProject,
        userId: removeMemberTargetId,
      });
    }
  }}
  isPending={removeMemberMutation.isPending}
  title="このメンバーを削除しますか？"
/>
```

`onConfirm` の中で `selectedProject && removeMemberTargetId` を確かめてから `mutate` を呼びます。`selectedProject` の型は `string | null` なので、この確認が無いと `projectId` に `null` が入りうる形になり、TypeScript が先に止めます。`isPending` を渡しているのは、通信の返事を待つ間にボタンを押せなくするためです。`DeleteConfirmDialog` は `isPending` が `true` の間、削除ボタンの文字を「削除中...」に変えて、キャンセルも含めて `disabled` にします。これが無いと連打で同じ削除要求が何本も飛びます。`title` を上書きしているのは、既定の文言が削除対象を名指ししない一般的な言い回しで、プロジェクトそのものの削除と見分けが付かないためです。

これで完成です。

**確認ポイント**:
- メンバー削除は確認ダイアログを挟んで実行される
- 詳細表示そのものはインライン表示のままになっている

![プロジェクト詳細でアーカイブ操作ができる状態](./screenshots/project-detail-archive-action.png)

---

## 現在の完成形の流れ

1. 一覧カードをクリックする
2. `router.push('/project?projectId=...')` が走る
3. `page.tsx` が `projectId` を読み、`selectedProject` を更新する
4. `api.project.getById` が有効化される
5. `ProjectDetailView` が表示される
6. 戻る・アーカイブ・メンバー操作は親の `page.tsx` が処理する

---

## 設計の変化メモ

この章の古い教材や一部のコードには `ProjectDetailDialog` という名前が残っていることがあります。これは**以前のモーダル設計の名残**です。

現在の完成形は次のとおりです。

- 詳細表示の本体は `src/component/project/project-detail-view.tsx`
- 画面遷移の制御は `src/app/project/page.tsx`

という構成になっています。

`src/component/project/project-detail-dialog.tsx` というファイル自体は残っていても、現行の `page.tsx` では詳細表示に使っていません。教材では**現行の実装に合わせて `ProjectDetailView` を正解とします。**

---

## ファイル構成の確認

| ファイル | 内容 | Step |
|---------|------|------|
| `src/server/api/routers/project.ts` | アーカイブ API | Step 1 |
| `src/app/project/page.tsx` | 一覧 ↔ 詳細の切り替え、各種 mutation | Step 2, 5, 6 |
| `src/component/project/project-detail-view.tsx` | 詳細表示本体 | Step 3, 4, 5 |
| `src/component/project/project-dialog.tsx` | プロジェクト作成 / 編集ダイアログ | Step 6 |

---

### Pro パターンで書こう（アーカイブ状態の絞り込みは配列メソッドで選ぶ）

絞り込み条件を配列メソッドで並べると、条件が増えても追記だけで対応でき、見渡しが保てます。
なぜ直前の1文の書き方をするのか、**Before/After** で見比べてみましょう。

#### Before（改善前のコード）

```typescript
type ProjectListItem = {
  id: string;
  name: string;
  isArchived: boolean;
};

type ArchiveFilter = 'active' | 'archived' | 'all';
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

`ArchiveFilter` は3つの文字列だけを許す型なので、`'finished'` のような綴り違いを渡すと TypeScript が先に止めてくれます。ここまでは Before と After で共通です。次のブロックから、この3つを処理へ結びつける書き方が分かれます。

```typescript
export function filterProjectsByArchiveStatus(
  projects: ProjectListItem[],
  filter: ArchiveFilter,
) {
  if (filter === 'active') {
    return projects.filter((project) => !project.isArchived);
  }

  if (filter === 'archived') {
    return projects.filter((project) => project.isArchived);
  }

  if (filter === 'all') {
    return projects;
  }

  return projects;
}
```

**このコードの問題点**:

- `if` が増えるほど、どの条件が一覧のルールなのか見渡しにくくなる
- 新しい絞り込み条件を足すと、関数の中に分岐がさらに増える
- `filter` の値と実際の絞り込み処理が離れているため、UI 側の選択肢と対応づけにくい

#### After（プロが書くコード）

```typescript
type ProjectListItem = {
  id: string;
  name: string;
  isArchived: boolean;
};

type ArchiveFilter = 'active' | 'archived' | 'all';
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

型の定義は Before とまったく同じです。書き換えるのは、この3つの値と処理をどこで結びつけるか、その1点だけです。型を触らずに組み立て方だけを差し替えられる、という確認も兼ねています。

```typescript
const ARCHIVE_FILTERS: Array<{
  key: ArchiveFilter;
  apply: (projects: ProjectListItem[]) => ProjectListItem[];
}> = [
  {
    key: 'active',
    apply: (projects) => projects.filter((project) => !project.isArchived),
  },
  {
    key: 'archived',
    apply: (projects) => projects.filter((project) => project.isArchived),
  },
  {
    key: 'all',
    apply: (projects) => projects,
  },
];
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

ここで効いているのは、配列の要素が `key` と `apply` の組になっている点です。`'active'` という選択肢の名前と「アーカイブ済みを除く」という処理が、同じ1つの要素の中で隣り合います。Before では、選択肢の名前と処理が `if` を挟んで数行離れていました。並べて置くと、画面の絞り込みメニューの選択肢をこの配列から作る、といった使い回しもできます。

```typescript
export function filterProjectsByArchiveStatus(
  projects: ProjectListItem[],
  filter: ArchiveFilter,
) {
  const archiveFilter = ARCHIVE_FILTERS.find((item) => item.key === filter);

  return archiveFilter?.apply(projects) ?? projects;
}
```

**このコードの強み**:

- 絞り込み条件が配列にまとまり、選択肢と処理の対応が一覧できる
- 新しい条件を足すときは `ARCHIVE_FILTERS` に1要素追加するだけで済む
- `find` で対象ルールを選ぶ形なので、分岐のネストが増えにくい

#### 覚えておきたいエッセンス

同じ値を見て分岐する `if` が並び始めたら、
「条件と処理を配列にして選ぶ」形にできないか考えます。

## 完成コード全体

今日は3つのファイルを扱いました。各 Step のコードは説明のために短く切ってあり、途中で切れたブロックも混ざっています。ここでは同じ3ファイルの完成状態を、意味のまとまりごとに最初から最後まで載せます。手元のファイルを開いて、上から順に見比べてください。

`src/server/api/routers/project.ts` だけは、アーカイブに関わる部分だけを載せます。このファイルには Day 09 から Day 12 で作った手続きも並んでおり、全体で 500 行を超えます。今日足したのは、この2か所だけです。

| ファイル | 役割 | 対応する Step |
|---------|------|--------------|
| `src/server/api/routers/project.ts` | アーカイブ状態を切り替えるサーバー側の手続き | Step 1 |
| `src/app/project/page.tsx` | 一覧と詳細の切り替え、通信と権限の判断 | Step 2, 5, 6 |
| `src/component/project/project-detail-view.tsx` | 詳細画面の見た目 | Step 3, 4, 5 |

### `src/server/api/routers/project.ts`

**アーカイブ状態を書き換える共通ヘルパー**:

```typescript
// filepath: src/server/api/routers/project.ts
// 完成版: アーカイブ状態を書き換える共通ヘルパー
const setArchiveStatus = async (userId: string, projectId: string, isArchived: boolean) => {
  const userMember = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
  });

  assertMemberPermission(userMember ? [userMember] : [], 'canArchive');

  return await prisma.project.update({
    where: { id: projectId },
    data: { isArchived },
  });
};
```

この関数を `projectRouter` の外、つまり `createTRPCRouter({ ... })` より前に置いてあります。中に入れると、tRPC は手続きの一覧としてこの名前も公開しようとして型が合わなくなります。外に出しておけば、このファイルの中だけで呼べるただの関数です。

`findUnique` に `userId_projectId` という見慣れない名前を渡している点も見ておいてください。Prisma のスキーマで「ユーザーとプロジェクトの組は1行しか作れない」と決めてあり、その組に付けられた名前がこれです。2つの値をまとめて渡すと、`findUnique` が1行だけを取り出せます。

**archive と unarchive の手続き**:

```typescript
// filepath: src/server/api/routers/project.ts
// 完成版: archive と unarchive の手続き
  archive: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return await setArchiveStatus(ctx.session.userId, input.id, true);
    }),

  unarchive: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return await setArchiveStatus(ctx.session.userId, input.id, false);
    }),
```

`.input(z.object({ id: z.string().cuid() }))` の `.cuid()` は、渡された文字列が cuid（このアプリが ID に使っている形式）かどうかを確かめます。ここで弾いておくと、形の違う文字列がそのままデータベースへの問い合わせに使われません。

`protectedProcedure` を使っているので、ログインしていない人はこの手続きに入れません。その先の「入れたとして、この人にアーカイブする資格があるか」を見るのが、ヘルパーの中の `assertMemberPermission` です。ログイン済みかどうかと、そのプロジェクトで何ができるかは別の問いなので、確かめる場所も分けてあります。

### `src/app/project/page.tsx`

**外部ライブラリと画面部品の import**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: インポート（外部ライブラリと画面部品）
'use client';

import { Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AppLayout } from '@/component/layout/app-layout';
import { ProjectCard } from '@/component/project/project-card';
import { ProjectDetailView } from '@/component/project/project-detail-view';
import { ProjectDialog, type ProjectFormData } from '@/component/project/project-dialog';
import { Button } from '@/component/ui/button';
import { DeleteConfirmDialog } from '@/component/ui/delete-confirm-dialog';
```

`'use client'` が先頭にあるのは、このページが `useState` と `useEffect` を使うためです。この1行が無いとサーバー側の部品として扱われ、状態を持てないというエラーで止まります。

`ProjectDialog` の行だけ `type ProjectFormData` が並んでいます。同じファイルから部品と型をまとめて取り込む書き方です。型のほうに `type` を付けておくと、ビルド時にその名前が実行するコードから外れます。型は型検査だけに使うもので、動くコードには要らないためです。

**UI 部品と共通の道具の import**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: インポート（UI 部品と共通の道具）
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/component/ui/dialog';
import { Label } from '@/component/ui/label';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { Switch } from '@/component/ui/switch';
```

`Dialog` と `Select` は名前を6つ前後まとめて取り込むので、Biome が1行へ収めず縦に並べます。shadcn/ui の部品は「枠・中身・見出し・footer」と役割ごとに分かれており、使う組み合わせを自分で選べます。

**権限・日付・tRPC の import**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: インポート（権限・日付・tRPC）
import {
  hasPermission,
  isProjectMemberRole,
  PROJECT_MEMBER_ROLE,
  PROJECT_MEMBER_ROLE_LABELS,
  type ProjectMemberRole,
} from '@/lib/constant/roles';
import { TASK_STATUS } from '@/lib/constant/status';
import { dateOnlyFromValue, dateOnlyToUtcStartIso } from '@/lib/date';
import { api } from '@/trpc/react';
```

役割やステータスの文字列を `@/lib/constant/` から取り込んでいるのは、`'OWNER'` や `'CANCELLED'` をこのファイルに直接書かないためです。直接書くと綴りを1文字間違えても TypeScript は気付かず、条件が静かに外れます。定数を通せば、間違った名前はその場でエラーになります。

**useState で持つ状態**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: 状態（useState）
function ProjectPageContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectFormData | undefined>(undefined);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<ProjectMemberRole>(PROJECT_MEMBER_ROLE.MEMBER);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [removeMemberTargetId, setRemoveMemberTargetId] = useState<string | null>(null);
```

11 個並んでいますが、対になっているものを探すと数はぐっと減ります。`deleteDialogOpen` と `deleteTargetId`、`removeMemberDialogOpen` と `removeMemberTargetId` は、それぞれ「開いているか」と「対象は誰か」の組です。Step 6 で見た2段構えの操作は、この組があって初めて成り立ちます。

`editingProject` の初期値が `undefined` なのは、`ProjectDialog` が「初期値が無い＝新規作成」と読む約束だからです。`null` にすると型が合いません。

**URL から読み取る詳細の対象**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: URL から詳細の対象を読む
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const router = useRouter();

  useEffect(() => {
    if (projectIdParam) {
      setSelectedProject(projectIdParam);
    } else {
      setSelectedProject(null);
    }
  }, [projectIdParam]);
```

`else` の側で `null` を入れ直しているところが要点です。詳細から一覧へ戻ったとき、`projectIdParam` は消えますが `selectedProject` は前の ID を持ったままになります。空にしておかないと、一覧を見ている間も詳細の取得が走り続けます。

依存配列が `[projectIdParam]` の1つだけなのは、この文字列が変わったときにだけ state を合わせ直せば足りるからです。`searchParams` を入れると、Day 26 のバグBと同じで、描画のたびに別の入れ物として扱われます。

**サーバーから読むデータ**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: サーバーから読むデータ
  const utils = api.useUtils();

  const { data: currentUser } = api.auth.getCurrentUser.useQuery();
  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery({
    // showArchived が true のとき isArchived フィルターを外して進行中・アーカイブ両方を取得する
    isArchived: showArchived ? undefined : false,
  });
  const { data: availableUsers } = api.project.getAvailableUsers.useQuery(
    { projectId: selectedProject ?? '' },
    { enabled: !!selectedProject },
  );
  const { data: projectDetail } = api.project.getById.useQuery(
    { id: selectedProject ?? '' },
    { enabled: !!selectedProject },
  );
```

`isArchived: showArchived ? undefined : false` は、`false` と `undefined` を別物として使い分けています。`false` は「アーカイブしていないものだけ」という絞り込みで、`undefined` は「この条件を送らない」という意味です。サーバー側は条件が来なければ絞り込みをしないので、両方が返ります。ここを `true` にすると、アーカイブ済みだけが並ぶ別の画面になってしまいます。

`utils` は、あとで一覧のデータに古いという印を付けるために取り出しています。

**プロジェクトを作る・直す・消す通信**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: プロジェクトを作る・直す・消す通信
  const createMutation = api.project.create.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      setDialogOpen(false);
    },
  });

  const updateMutation = api.project.update.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      if (selectedProject) {
        utils.project.getById.invalidate({ id: selectedProject });
      }
      setDialogOpen(false);
    },
  });
```

`update` のほうだけ `getById.invalidate` も呼んでいます。編集は詳細画面を開いたままでも起こるので、一覧だけを取り直すと、目の前の詳細に古い名前が残ります。`create` にこれが要らないのは、作ったばかりのプロジェクトの詳細をまだ誰も開いていないからです。

`setDialogOpen(false)` を `onSuccess` の中に置いているのは、保存が終わってからダイアログを閉じるためです。送信した瞬間に閉じると、失敗したときに入力内容ごと消えます。

**削除とメンバー追加の通信**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: 削除とメンバー追加の通信
  const deleteMutation = api.project.delete.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      router.push('/project');
    },
  });

  const addMemberMutation = api.project.addMember.useMutation({
    onSuccess: () => {
      if (selectedProject) {
        utils.project.getById.invalidate({ id: selectedProject });
      }
      setMemberDialogOpen(false);
      setNewMemberUserId('');
      setNewMemberRole(PROJECT_MEMBER_ROLE.MEMBER);
    },
  });
```

削除の `onSuccess` で `router.push('/project')` を呼ぶのは、消したプロジェクトの詳細を開いたままにしないためです。URL に `projectId` が残っていると、無くなった ID を取りに行って「プロジェクトが見つかりません」の画面になります。

メンバー追加のほうは、閉じるだけでなく入力欄も初期値へ戻しています。ここを戻さないと、次に開いたときに前回選んだ人が残ったままで、続けて同じ人を追加しかけます。

**メンバーを外す・権限を変える通信**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: メンバーを外す・権限を変える通信
  const removeMemberMutation = api.project.removeMember.useMutation({
    onSuccess: () => {
      if (selectedProject) {
        utils.project.getById.invalidate({ id: selectedProject });
      }
    },
  });

  const updateMemberRoleMutation = api.project.updateMemberRole.useMutation({
    onSuccess: () => {
      if (selectedProject) {
        utils.project.getById.invalidate({ id: selectedProject });
      }
    },
  });
```

この2つが取り直すのは詳細だけです。メンバーの増減や権限は詳細画面にしか出ていないので、一覧のデータには影響しません。要らない取り直しを増やすと、そのぶん通信が走ります。

`if (selectedProject)` で囲んであるのは、`invalidate` に渡す `id` が `string` でなければならないためです。詳細を開いていなければ、この通信自体が起きません。

**アーカイブの通信**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: アーカイブの通信
  const archiveMutation = api.project.archive.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      router.push('/project');
    },
  });

  const unarchiveMutation = api.project.unarchive.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      router.push('/project');
    },
  });
```

2つの中身がそろっているのは、どちらも一覧の並びを変える操作だからです。アーカイブすれば進行中の一覧から消え、解除すれば戻ります。どちらでも `getAll` に古いという印が要ります。

`router.push('/project')` で一覧へ戻すので、読者は自分の操作の結果をその場で確かめられます。詳細へ留まる作りにすると、ボタンの文字が入れ替わるだけになり、一覧がどうなったかは分かりません。

**新規作成と編集を開くハンドラー**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: 新規作成と編集を開くハンドラー
  const handleCreate = () => {
    setEditingProject(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (projectId: string) => {
    const project = projects?.find((p) => p.id === projectId);
    if (project) {
      const startDate = project.startDate ? dateOnlyFromValue(project.startDate) : undefined;
      const endDate = project.endDate ? dateOnlyFromValue(project.endDate) : undefined;

      setEditingProject({
        id: project.id,
        name: project.name,
        description: project.description || '',
        color: project.color,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      setDialogOpen(true);
    }
  };
```

`handleCreate` の1行目で `undefined` を入れ直しているのは、直前に編集を開いていた場合に前のプロジェクトの内容が残るのを防ぐためです。

`...(startDate && { startDate })` という書き方は、日付が入っているときだけその項目を作ります。`startDate: undefined` と書いても近い形になりますが、その場合はキーだけが存在する状態になり、`ProjectFormData` の型が「日付は無くてもよい」と決めている形と食い違います。

**保存の送信先の振り分け**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: 保存の送信先を振り分ける
  const handleDelete = (projectId: string) => {
    setDeleteTargetId(projectId);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (data: ProjectFormData) => {
    if (data.id) {
      updateMutation.mutate({
        id: data.id,
        name: data.name,
        description: data.description || null,
        color: data.color,
        startDate: data.startDate ? dateOnlyToUtcStartIso(data.startDate) : null,
        endDate: data.endDate ? dateOnlyToUtcStartIso(data.endDate) : null,
      });
    } else {
      if (!currentUser?.id) {
        return;
      }
```

`data.id` があるかどうかで作成と更新を分けています。ダイアログは1つしか無いので、開いたときに ID を入れたかどうかが、そのまま送信先の分かれ道になります。

更新のときだけ `null` を送っている点も見ておいてください。更新では「説明を空にする」という指示を送る必要があり、`null` はその意思表示です。項目を送らないと、サーバー側は「触らない」と受け取ります。

**新規作成の送信**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: 新規作成の送信
      createMutation.mutate({
        name: data.name,
        description: data.description,
        color: data.color,
        startDate: data.startDate ? dateOnlyToUtcStartIso(data.startDate) : undefined,
        endDate: data.endDate ? dateOnlyToUtcStartIso(data.endDate) : undefined,
      });
    }
  };
```

作成では未入力の日付を `undefined` にします。更新の `null` と使い分けているのは、作成に「空にする」という指示が要らないためです。値が無ければ、その項目は最初から無い状態で作られます。

`dateOnlyToUtcStartIso` を通しているのは、画面が扱う「年月日だけ」の値を、サーバーが扱う日時の文字列へそろえるためです。ここを素通しにすると、時差の分だけ日付が前後します。

**一覧と詳細を行き来するハンドラー**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: 一覧と詳細を行き来するハンドラー
  const handleProjectClick = (projectId: string) => {
    router.push(`/project?projectId=${projectId}`);
  };

  const handleDetailClose = () => {
    router.push('/project');
  };

  const handleAddMember = () => {
    if (selectedProject && newMemberUserId) {
      addMemberMutation.mutate({
        projectId: selectedProject,
        userId: newMemberUserId,
        role: newMemberRole,
      });
    }
  };
```

`handleAddMember` が `selectedProject && newMemberUserId` を確かめてから送っているのは、`newMemberUserId` の初期値が空文字だからです。ユーザーを選ばずにボタンを押せた場合でも、ここで止まります。画面側でもボタンを押せなくしてありますが、確認は両方に置きます。

**メンバー操作とアーカイブのハンドラー**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: メンバー操作とアーカイブのハンドラー
  const handleRemoveMember = (userId: string) => {
    setRemoveMemberTargetId(userId);
    setRemoveMemberDialogOpen(true);
  };

  const handleUpdateMemberRole = (userId: string, role: ProjectMemberRole) => {
    if (selectedProject) {
      updateMemberRoleMutation.mutate({
        projectId: selectedProject,
        userId,
        role,
      });
    }
  };

  const handleArchive = (projectId: string, isArchived: boolean) => {
    const mutation = isArchived ? unarchiveMutation : archiveMutation;
    mutation.mutate({ id: projectId });
  };
```

3つのうち、その場で通信するのは `handleUpdateMemberRole` と `handleArchive` だけです。権限の変更とアーカイブは、間違えてもう一度押せば戻せます。取り消せない削除だけが確認ダイアログを挟む形になっていて、この差が Step 6 で見た2段構えの理由です。

**読み込み中の表示と権限の判定**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: 読み込み中の表示と権限の判定
  if (projectsLoading) {
    return (
      <AppLayout>
        <PageLoadingSpinner />
      </AppLayout>
    );
  }

  // 詳細画面で操作ボタンの表示可否を決めるため、ログインユーザー自身のプロジェクト内ロールから権限を求める
  const currentMember = projectDetail?.members?.find((m) => m.userId === currentUser?.id);
  const currentMemberRole =
    currentMember && isProjectMemberRole(currentMember.role) ? currentMember.role : undefined;
  const canManageMembers = currentMemberRole
    ? hasPermission(currentMemberRole, 'canManageMembers')
    : false;
  const canArchiveProject = currentMemberRole
    ? hasPermission(currentMemberRole, 'canArchive')
    : false;
```

権限を求める道筋は3段です。メンバー一覧から自分の行を探し、その `role` が決められた4つの名前のどれかであることを `isProjectMemberRole` が確かめ、`hasPermission` が「その役割にこの操作ができるか」を答えます。

役割が取れなかったときの答えを `false` にそろえてあるのが要点です。分からないときに `true` を返すと、まだデータが届いていない一瞬だけボタンが出てしまいます。

**詳細画面を返す分岐**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: 詳細画面を返す分岐
  // プロジェクト詳細をインラインページとして表示（ダイアログオーバーレイなし）
  if (projectIdParam && selectedProject) {
    return (
      <AppLayout>
        <ProjectDetailView
          projectDetail={projectDetail}
          onBack={handleDetailClose}
          onAddMemberClick={() => setMemberDialogOpen(true)}
          onRemoveMember={handleRemoveMember}
          onUpdateMemberRole={handleUpdateMemberRole}
          onArchive={handleArchive}
          canManageMembers={canManageMembers}
          canArchive={canArchiveProject}
        />
```

`onAddMemberClick` だけ、その場で書いた短い関数を渡しています。やることが `setMemberDialogOpen(true)` の1つだけで、名前を付けて上に置いても読む手掛かりが増えないためです。何段階かある処理は、上のハンドラーのように名前を付けて分けます。

渡している `canArchive` の名前と、こちら側の変数名 `canArchiveProject` がずれている点にも気付いてください。部品の側は「アーカイブしてよいか」だけを知ればよく、何のアーカイブかは呼ぶ側の関心です。

**メンバー追加ダイアログのユーザー選択欄**:

```tsx
        {/* filepath: src/app/project/page.tsx */}
        {/* 完成版: メンバー追加ダイアログ（ユーザー選択） */}
        <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>メンバー追加</DialogTitle>
              <DialogDescription>このプロジェクトに新しいメンバーを追加します。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="user">ユーザー</Label>
                <Select value={newMemberUserId} onValueChange={setNewMemberUserId}>
                  <SelectTrigger id="user">
                    <SelectValue placeholder="ユーザーを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
```

`onOpenChange={setMemberDialogOpen}` と書けるのは、`onOpenChange` の渡す値が `true` か `false` の2択で、`setMemberDialogOpen` の求める形と一致するからです。`Escape` キーや背景のクリックで閉じたときも、この1本の線を通って状態が戻ります。

`availableUsers` はまだこのプロジェクトに入っていない人だけを返す手続きです。全ユーザーを出すと、すでにメンバーの人を選んで失敗する道ができます。

**メンバー追加ダイアログのロール選択欄**:

```tsx
              {/* filepath: src/app/project/page.tsx */}
              {/* 完成版: メンバー追加ダイアログ（ロール選択） */}
              <div className="grid gap-2">
                <Label htmlFor="role">ロール</Label>
                <Select
                  value={newMemberRole}
                  onValueChange={(value) => {
                    if (isProjectMemberRole(value)) setNewMemberRole(value);
                  }}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="ロールを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_MEMBER_ROLE_LABELS)
                      .filter(([value]) => value !== PROJECT_MEMBER_ROLE.OWNER)
                      .map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
```

`onValueChange` が `isProjectMemberRole` を挟んでいるのは、`Select` が渡してくる値の型が `string` だからです。`newMemberRole` は4つの名前しか受け付けないので、そのままでは代入できません。ここで確かめてから入れると、`as` を使わずに型が通ります。

`.filter(([value]) => value !== PROJECT_MEMBER_ROLE.OWNER)` がオーナーを選択肢から外します。オーナーはプロジェクトを作った人へ自動で付く役割なので、あとから他人へ配るものではありません。

**メンバー追加ダイアログの操作ボタン**:

```tsx
            {/* filepath: src/app/project/page.tsx */}
            {/* 完成版: メンバー追加ダイアログの操作ボタン */}
            <DialogFooter>
              <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleAddMember} disabled={!newMemberUserId}>
                メンバー追加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
```

`disabled={!newMemberUserId}` で、ユーザーを選ぶまで追加ボタンを押せなくしています。押せてしまうと、何も起きないボタンを押した人が「壊れている」と受け取ります。

キャンセル側を `variant="outline"` にしてあるのは、色の付いたボタンを画面に1つだけにするためです。2つとも目立つと、どちらが本命の操作か迷います。

**詳細画面のメンバー削除確認**:

```tsx
        {/* filepath: src/app/project/page.tsx */}
        {/* 完成版: 詳細画面のメンバー削除確認 */}
        <DeleteConfirmDialog
          open={removeMemberDialogOpen}
          onOpenChange={setRemoveMemberDialogOpen}
          onConfirm={() => {
            if (selectedProject && removeMemberTargetId) {
              removeMemberMutation.mutate({
                projectId: selectedProject,
                userId: removeMemberTargetId,
              });
            }
          }}
          isPending={removeMemberMutation.isPending}
          title="このメンバーを削除しますか？"
        />
      </AppLayout>
    );
  }
```

この `</AppLayout>` と `}` で、詳細を返す `if` が閉じます。ここから下は `projectIdParam` が無いとき、つまり一覧のときだけ動く部分です。

ダイアログをこの `if` の中にも置いてあるのは、詳細画面から開くダイアログだからです。下の一覧側にも同じ形が出てきますが、返り値が別々なので、それぞれの中に置く必要があります。

**一覧画面のヘッダー**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: 一覧画面のヘッダー
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="shrink-0 whitespace-nowrap text-3xl font-bold tracking-tight">
            プロジェクト
          </h1>
          <div className="flex shrink-0 items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
              <Label htmlFor="show-archived" className="whitespace-nowrap">
                アーカイブ表示
              </Label>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> 新規プロジェクト
            </Button>
          </div>
        </div>
```

`flex-col` から始めて `sm:flex-row` を足しているのは、狭い画面では見出しと操作を縦に積むためです。横1列のまま狭めると、見出しが折り返して読みにくくなります。

`Label` の `htmlFor="show-archived"` と `Switch` の `id` をそろえてあるので、文字のほうを押しても切り替わります。小さなスイッチだけを狙わずに済み、指でも操作しやすくなります。

**カードに渡す件数の集計**:

```tsx
        {/* filepath: src/app/project/page.tsx */}
        {/* 完成版: カードに渡す件数の集計 */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects && projects.length > 0 ? (
            projects.map((project) => {
              // キャンセル済みは進捗の母数に含めない（アクティブな4ステータスのみを総数とする）。
              // 総数と完了数を1回のループで同時に集計する。
              let taskCount = 0;
              let doneCount = 0;
              for (const t of project.tasks ?? []) {
                if (t.status === TASK_STATUS.CANCELLED) continue;
                taskCount++;
                if (t.status === TASK_STATUS.DONE) doneCount++;
              }
```

`filter` を2回呼ぶ書き方もできますが、ここでは `for` の1周で2つの数を数えています。1周のあいだに両方を数えれば、タスクの配列を2度読む必要がありません。

キャンセル済みを `continue` で飛ばしているのは、中止した作業を分母に入れると進捗率が実態より低く出るためです。10 件のうち3件を中止して7件を終えたら、その画面が示すべきは 100% です。

**プロジェクトカードの描画**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: プロジェクトカードの描画
              return (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  description={project.description}
                  color={project.color}
                  memberCount={project.members?.length ?? 0}
                  taskStats={{ total: taskCount, done: doneCount }}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClick={handleProjectClick}
                  isArchived={project.isArchived}
                />
              );
            })
```

`key={project.id}` は、React が並び替えや削除のときにどのカードが同じものかを見分ける目印です。ここを配列の番号にすると、1件消したときに以降のカードが別物として作り直されます。

`onClick={handleProjectClick}` で詳細へ移りますが、この関数がやるのは URL の書き換えだけです。カードの側は「押された」と伝えるところまでで、その先をどうするかは知りません。

**プロジェクトが0件のときの表示**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: プロジェクトが0件のときの表示
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p>プロジェクトが見つかりません。</p>
              <p>最初のプロジェクトを作成しましょう！</p>
            </div>
          )}
        </div>
```

`col-span-full` を付けているのは、この案内がグリッドの中に入るからです。付けないと4列のうちの1列ぶんの幅に押し込まれ、中央にそろいません。

2行に分けてあるのは、事実と次の行動を分けて読ませるためです。1行にまとめると、初めて開いた人には長い1文になります。

**作成・編集ダイアログ**:

```tsx
        {/* filepath: src/app/project/page.tsx */}
        {/* 完成版: 作成・編集ダイアログ */}
        <ProjectDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingProject}
        />
```

作成と編集で `ProjectDialog` を1つだけ置いているのは、入力欄がまったく同じだからです。違うのは `initialData` に中身が入っているかどうかで、その1点を `handleSubmit` が読んで送信先を分けます。

**一覧側のメンバー追加ダイアログのユーザー選択欄**:

```tsx
        {/* filepath: src/app/project/page.tsx */}
        {/* 完成版: 一覧側のメンバー追加ダイアログ（ユーザー選択） */}
        <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>メンバー追加</DialogTitle>
              <DialogDescription>このプロジェクトに新しいメンバーを追加します。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="user">ユーザー</Label>
                <Select value={newMemberUserId} onValueChange={setNewMemberUserId}>
                  <SelectTrigger id="user">
                    <SelectValue placeholder="ユーザーを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
```

ここから先は、詳細側で見たメンバー追加ダイアログと中身が重なります。手元のファイルでも2か所に書かれていれば正しい状態です。

重なっているのは、詳細と一覧が別々の `return` に分かれているためです。`if` の中で返してしまうと、その下の JSX は描かれません。この重複が気になる場合は、ダイアログを部品として切り出して両方から呼ぶ形にできます。今日は現状の形をそのまま載せます。

**一覧側のメンバー追加ダイアログのロール選択欄**:

```tsx
              {/* filepath: src/app/project/page.tsx */}
              {/* 完成版: 一覧側のメンバー追加ダイアログ（ロール選択） */}
              <div className="grid gap-2">
                <Label htmlFor="role">ロール</Label>
                <Select
                  value={newMemberRole}
                  onValueChange={(value) => {
                    if (isProjectMemberRole(value)) setNewMemberRole(value);
                  }}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="ロールを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_MEMBER_ROLE_LABELS)
                      .filter(([value]) => value !== PROJECT_MEMBER_ROLE.OWNER)
                      .map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
```

状態の変数は詳細側と共有しています。`newMemberRole` は1つしか無いので、どちらのダイアログから選んでも同じ場所へ入ります。片方を開いているときはもう片方が画面に無いため、値が混ざる心配はありません。

**一覧側ダイアログの操作ボタン**:

```tsx
            {/* filepath: src/app/project/page.tsx */}
            {/* 完成版: 一覧側ダイアログの操作ボタン */}
            <DialogFooter>
              <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleAddMember} disabled={!newMemberUserId}>
                メンバー追加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
```

最後の `</div>` が、ヘッダーから始まった `flex flex-col gap-6` の外枠を閉じます。この下に置く削除確認のダイアログは外枠の外に出してあり、画面の縦の並びには入りません。

**プロジェクト削除の確認**:

```tsx
      {/* filepath: src/app/project/page.tsx */}
      {/* 完成版: プロジェクト削除の確認 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate({ id: deleteTargetId });
          }
        }}
        isPending={deleteMutation.isPending}
        title="プロジェクトを削除しますか？"
      />
```

`title` に `プロジェクトを削除しますか？` を渡して、対象を名指ししています。この画面には削除の確認が2つあり、文言が同じだと何を消そうとしているのか分かりません。

**一覧側のメンバー削除確認とページの出口**:

```tsx
      {/* filepath: src/app/project/page.tsx */}
      {/* 完成版: 一覧側のメンバー削除確認とページの出口 */}
      <DeleteConfirmDialog
        open={removeMemberDialogOpen}
        onOpenChange={setRemoveMemberDialogOpen}
        onConfirm={() => {
          if (selectedProject && removeMemberTargetId) {
            removeMemberMutation.mutate({
              projectId: selectedProject,
              userId: removeMemberTargetId,
            });
          }
        }}
        isPending={removeMemberMutation.isPending}
        title="このメンバーを削除しますか？"
      />
    </AppLayout>
  );
}
```

`removeMemberMutation.isPending` を渡しているので、返事を待つあいだボタンが押せなくなります。これが無いと、反応が遅いときに読者が何度も押し、同じ削除の要求が重なって飛びます。

**Suspense で包んだページ本体**:

```tsx
// filepath: src/app/project/page.tsx
// 完成版: Suspense で包んだページ本体
export default function ProjectPage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <ProjectPageContent />
    </Suspense>
  );
}
```

ここまで書いてきた中身が `ProjectPageContent` で、外へ出しているのはこの短い関数のほうです。2つに分けているのは `useSearchParams` のためで、この関数を使う部品は `Suspense` で包まないとビルドが通りません。URL の中身が決まるまで待つ必要があり、その待ち時間に何を出すかを `fallback` で指定します。

`fallback` に `PageLoadingSpinner` を置いてあるので、待っているあいだも画面は白のままになりません。

### `src/component/project/project-detail-view.tsx`

このファイルは Day 01 の配布物に完成した形で入っています。Step 3 と Step 4 では説明のために一部を削った形を載せたので、ここで完成状態を確かめてください。削ってあったのは、ロールを変える `Select`、権限による出し分け、キャンセル済みタスクの数え分けの3つです。

**画面部品の import**:

```tsx
// filepath: src/component/project/project-detail-view.tsx
// 完成版: インポート（部品）
'use client';

import type { inferRouterOutputs } from '@trpc/server';
import { Archive, ArchiveRestore, ArrowLeft, CheckSquare, Trash2, UserPlus } from 'lucide-react';
import { StatusBadge } from '@/component/task/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
```

`'use client'` が必要なのは、`Select` が開閉を自分で覚える部品だからです。その動きはブラウザ側でしか成り立ちません。Step 3 と Step 4 のコードだけを見ると状態を持っていないように見えますが、完成版はここで `Select` を使います。

`inferRouterOutputs` にだけ `import type` が付いています。これは型を取り出すためだけの名前で、動くコードには残りません。

**定数と型の import**:

```tsx
// filepath: src/component/project/project-detail-view.tsx
// 完成版: インポート（定数と型）
import { getPriorityBadgeVariant } from '@/lib/badge-variant';
import { TASK_PRIORITY_LABELS } from '@/lib/constant/priority';
import {
  isProjectMemberRole,
  PROJECT_MEMBER_ROLE,
  PROJECT_MEMBER_ROLE_LABELS,
  type ProjectMemberRole,
} from '@/lib/constant/roles';
import { TASK_STATUS } from '@/lib/constant/status';
import type { AppRouter } from '@/server/api/root';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ProjectDetail = RouterOutputs['project']['getById'];
```

`TASK_STATUS` を取り込んでいるのは、キャンセル済みのタスクを数え分けるためです。Step 4 の形では全件を数えていたので、この import も要りませんでした。

`AppRouter` の取り込みで `import type` を付けているのは、サーバー側のファイルを動くコードとしてブラウザへ持ち込まないためです。型として使うだけなら、ここで線を引いておけば安全です。

**Props の形**:

```tsx
// filepath: src/component/project/project-detail-view.tsx
// 完成版: Props の形
interface ProjectDetailViewProps {
  projectDetail: ProjectDetail | null | undefined;
  onBack: () => void;
  onAddMemberClick: () => void;
  onRemoveMember: (userId: string) => void;
  onUpdateMemberRole: (userId: string, role: ProjectMemberRole) => void;
  onArchive: (projectId: string, isArchived: boolean) => void;
  canManageMembers: boolean;
  canArchive: boolean;
}
```

Step 3 では末尾3つに `?` を付けた形を載せましたが、完成版はすべて必須です。`?` は「渡さなくてもよい」という意味で、渡し忘れても型検査が通ってしまいます。権限に関わる値では、渡し忘れがそのまま「ボタンが出ない」という不具合になります。必須にしておけば、呼ぶ側が忘れた時点でエラーが出ます。

`onUpdateMemberRole` が引数を2つ取るのは、誰の役割をどれに変えるかの両方が要るためです。

**中身が無いときの表示**:

```tsx
// filepath: src/component/project/project-detail-view.tsx
// 完成版: 中身が無いときの表示
export function ProjectDetailView({
  projectDetail,
  onBack,
  onAddMemberClick,
  onRemoveMember,
  onUpdateMemberRole,
  onArchive,
  canManageMembers,
  canArchive,
}: ProjectDetailViewProps) {
  if (!projectDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <p>プロジェクトが見つかりません。</p>
        <Button variant="ghost" className="mt-4" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          プロジェクト一覧に戻る
        </Button>
      </div>
    );
  }
```

`export default` ではなく `export function` にしてあるのは、名前を付けて出すほうが呼ぶ側で名前を変えられないためです。`page.tsx` の import と見比べると、波括弧が付いた形になっています。

`py-24` で上下に広い余白を取っているのは、この案内を画面の真ん中あたりへ置くためです。上に貼り付くと、読み込み中の一瞬だけ画面が跳ねて見えます。

**タスク件数の集計**:

```tsx
// filepath: src/component/project/project-detail-view.tsx
// 完成版: タスク件数の数え分け
  // 総数はアクティブな4ステータスのみで数え、キャンセル済みは別表記にする（進捗指標との整合のため）。
  // アクティブ数とキャンセル数を1回のループで同時に集計する。
  let activeTaskCount = 0;
  let cancelledTaskCount = 0;
  for (const task of projectDetail.tasks ?? []) {
    if (task.status === TASK_STATUS.CANCELLED) {
      cancelledTaskCount++;
    } else {
      activeTaskCount++;
    }
  }
```

Step 4 で予告した数え分けが、ここに入っています。中止したタスクを総数に混ぜると、その数字は「今動いている作業の量」として読めません。一覧のカードが使っている数え方とここをそろえておくと、同じプロジェクトの件数が画面によって違う、という食い違いが起きません。

`projectDetail.tasks ?? []` としてあるので、タスクの配列が届いていない場合でも `for` は0周で終わります。

**ヘッダー左側の戻るボタン**:

```tsx
// filepath: src/component/project/project-detail-view.tsx
// 完成版: ヘッダーの左側（戻るボタン）
  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div className="flex flex-col gap-4">
        {/* アクション行: 戻る・アーカイブ操作 */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="shrink-0" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            プロジェクト一覧
          </Button>
```

Step 3 では戻るボタンとプロジェクト名を横1列に並べていましたが、完成版は操作の行とタイトルの行を上下に分けています。長い名前のプロジェクトでも、ボタンが押し出されて画面の外へ出ません。

`shrink-0` は、隣の要素が広がってもこのボタンを縮ませない指定です。付けないと、文字が2行へ折り返した細長いボタンになります。

**ヘッダー右側のアーカイブ操作**:

```tsx
          {/* filepath: src/component/project/project-detail-view.tsx */}
          {/* 完成版: ヘッダーの右側（アーカイブ操作） */}
          {canArchive && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => onArchive(projectDetail.id, projectDetail.isArchived)}
            >
              {projectDetail.isArchived ? (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" /> アーカイブ解除
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" /> アーカイブ
                </>
              )}
            </Button>
          )}
        </div>
```

Step 5 のコードには無かった `canArchive &&` が、完成版では付いています。アーカイブできるのはオーナーだけなので、それ以外の人には押しても断られるボタンを見せません。

`<>` と `</>` はフラグメントと呼ばれ、アイコンと文字の2つを1つとして扱うための入れ物です。`<div>` で囲むと、その `div` の分だけ余分な箱ができてボタンの中の並びが崩れます。

**タイトル行**:

```tsx
        {/* filepath: src/component/project/project-detail-view.tsx */}
        {/* 完成版: タイトル行 */}
        {/* タイトル行: 長い名前も省略せず全文表示する。アーカイブバッジはタイトルの下に置く */}
        <div className="flex items-start gap-3">
          <div
            className="mt-2.5 h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: projectDetail.color }}
          />
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight break-words">{projectDetail.name}</h1>
            {projectDetail.isArchived && (
              <Badge variant="secondary" className="mt-2 text-xs">
                アーカイブ済み
              </Badge>
            )}
          </div>
        </div>
      </div>
```

色の丸に `mt-2.5` を足してあるのは、`items-start` で上にそろえた結果、丸が文字の上端より高い位置に来るためです。この値で、丸の中心が1行目の文字の高さに合います。

`min-w-0` と `break-words` は組で効きます。flex の中の要素は既定で中身より小さくならないため、`min-w-0` が無いと長い名前が枠を突き破ります。`break-words` は、その中で語の途中でも折り返す指定です。

**説明文と2列の入れ物**:

```tsx
      {/* filepath: src/component/project/project-detail-view.tsx */}
      {/* 完成版: 説明文と2列の入れ物 */}
      {/* 説明 */}
      {projectDetail.description && (
        <p className="text-muted-foreground">{projectDetail.description}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
```

`projectDetail.description &&` で囲んでいるので、説明が空のプロジェクトでは段落そのものが出ません。空の `<p>` が残ると、そこだけ行間が空いて理由の分からない隙間になります。

`lg:grid-cols-2` に `lg:` が付いているので、狭い画面ではメンバーとタスクが縦に積まれます。横2列を固定にすると、スマートフォンで1列の幅が半分になって読めません。

**メンバーカードの見出し**:

```tsx
        {/* filepath: src/component/project/project-detail-view.tsx */}
        {/* 完成版: メンバーカードの見出し */}
        {/* メンバーセクション */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">
              メンバー ({projectDetail.members?.length ?? 0})
            </CardTitle>
            {canManageMembers && (
              <Button variant="outline" size="sm" onClick={onAddMemberClick}>
                <UserPlus className="mr-2 h-4 w-4" /> メンバー追加
              </Button>
            )}
          </CardHeader>
```

Step 4 では常に出していたメンバー追加ボタンが、完成版では `canManageMembers &&` で囲まれています。追加できない人にボタンを見せると、押してから断られる形になります。

`space-y-0` を付けているのは、`CardHeader` が既定で子要素を縦に離すためです。ここは横1列に並べたいので、その既定を打ち消します。

**メンバー1人ぶんの枠とアイコン**:

```tsx
          {/* filepath: src/component/project/project-detail-view.tsx */}
          {/* 完成版: メンバー1人ぶんの枠とアイコン */}
          <CardContent>
            <div className="grid gap-2">
              {projectDetail.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {member.user?.avatar && <AvatarImage src={member.user.avatar} alt="" />}
                      <AvatarFallback>
                        {(member.user?.name || member.user?.email || '?')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.user?.name || member.user?.email || '不明'}
                      </p>
```

`key={member.id}` に使っているのは、参加を表す行そのものの ID です。`member.userId` でも重複はしませんが、行の ID のほうがこの一覧の並びと1対1で対応します。

`alt=""` を空にしてあるのは、この画像が飾りだからです。隣に名前の文字が出ているので、読み上げソフトが画像の説明も読むと同じ人の名前が2回続きます。

**変更できない場合の役割表示**:

```tsx
                      {/* filepath: src/component/project/project-detail-view.tsx */}
                      {/* 完成版: 役割の表示（変更できない場合） */}
                      {member.role === PROJECT_MEMBER_ROLE.OWNER || !canManageMembers ? (
                        // オーナーは権限変更対象外。加えて、メンバー管理権限を持たないユーザーには
                        // 読み取り専用で表示する（操作してもバックエンドで弾かれるため誤操作を防ぐ）
                        <Badge variant="outline" className="text-xs">
                          {isProjectMemberRole(member.role)
                            ? PROJECT_MEMBER_ROLE_LABELS[member.role]
                            : member.role}
                        </Badge>
                      ) : (
```

条件が2つ並んでいて、どちらかに当たれば読み取り専用の札になります。相手がオーナーのときと、見ている自分にメンバー管理の権限が無いときです。

`isProjectMemberRole(member.role)` で確かめてから対応表を引いているのは、`member.role` の型がデータベース由来の文字列で、4つの名前に限られていないためです。確かめずに `PROJECT_MEMBER_ROLE_LABELS[member.role]` と書くと型エラーになります。当てはまらない値が来たときは、変換せずそのまま出します。

**役割を変える Select**:

```tsx
                        {/* filepath: src/component/project/project-detail-view.tsx */}
                        {/* 完成版: 役割の変更（Select） */}
                        <Select
                          value={member.role}
                          onValueChange={(value) => {
                            if (isProjectMemberRole(value)) {
                              onUpdateMemberRole(member.userId, value);
                            }
                          }}
                        >
                          <SelectTrigger
                            aria-label={`${member.user?.name || member.user?.email || '不明'}の権限`}
                            className="mt-1 h-7 w-32 text-xs"
                          >
                            <SelectValue />
                          </SelectTrigger>
```

Step 4 の形にはこの `Select` がありませんでした。役割を選び直した瞬間に `onUpdateMemberRole` が呼ばれ、保存ボタンを押す手間がありません。選択肢を選ぶ操作は取り消しやすいので、確認を挟まなくても事故になりにくいためです。

`aria-label` に名前を入れているのは、同じ見た目の選択欄が人数分並ぶからです。読み上げでは「権限」だけが繰り返され、誰のものか分かりません。

**役割の選択肢**:

```tsx
                          {/* filepath: src/component/project/project-detail-view.tsx */}
                          {/* 完成版: 役割の選択肢 */}
                          <SelectContent>
                            {Object.entries(PROJECT_MEMBER_ROLE_LABELS)
                              .filter(([value]) => value !== PROJECT_MEMBER_ROLE.OWNER)
                              .map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
```

選択肢を対応表から作っているので、役割を1つ増やしたときにこの画面を直す必要がありません。手で `<SelectItem>` を並べると、増やした役割がここだけ抜け落ちます。

オーナーを `filter` で外している理由は、選べる状態にすると1つのプロジェクトへオーナーを2人以上作る道が開くからです。

**メンバーを外すボタン**:

```tsx
                  {/* filepath: src/component/project/project-detail-view.tsx */}
                  {/* 完成版: メンバーを外すボタン */}
                  {canManageMembers && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${member.user?.name || member.user?.email || '不明'}をプロジェクトから削除`}
                      onClick={() => onRemoveMember(member.userId)}
                      disabled={member.role === PROJECT_MEMBER_ROLE.OWNER}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
```

`canManageMembers &&` で丸ごと隠す形と、`disabled` で押せなくする形を使い分けています。権限が無い人にはボタンそのものを見せず、権限がある人にはオーナー行だけを押せない状態で見せます。押せない状態で残しておくと「ここは操作できる場所だが、この相手だけは外せない」と伝わります。

`text-destructive` で赤にしてあるのは、取り消せない操作だと目で分かるようにするためです。

**タスクカードの見出し**:

```tsx
        {/* filepath: src/component/project/project-detail-view.tsx */}
        {/* 完成版: タスクカードの見出し */}
        {/* タスクセクション */}
        <Card>
          <CardHeader className="space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">
                タスク ({activeTaskCount})
                {cancelledTaskCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    （キャンセル済 {cancelledTaskCount}）
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
```

Step 4 で `projectDetail.tasks?.length ?? 0` としていた部分が、完成版では `activeTaskCount` に変わっています。中止したタスクは括弧の中へ回し、見出しの数字は動いている作業の件数だけを表します。

`cancelledTaskCount > 0 &&` で囲んでいるので、中止が0件のプロジェクトでは括弧そのものが出ません。「（キャンセル済 0）」と出すと、読む側は無い情報を毎回目で追うことになります。

**タスク0件のときの表示**:

```tsx
          {/* filepath: src/component/project/project-detail-view.tsx */}
          {/* 完成版: タスク0件のときの表示 */}
          <CardContent>
            <div className="grid gap-2">
              {projectDetail.tasks?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  タスクがありません。
                </p>
              ) : (
                projectDetail.tasks?.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/30"
                  >
```

0件の判定に使っているのは `projectDetail.tasks?.length === 0` で、`activeTaskCount` ではありません。中止したタスクだけが並ぶプロジェクトでも、その中止分は一覧に出したいためです。見出しの数字と一覧の中身で、数え方が別になっています。

読み込み中と失敗は手前の `if (!projectDetail)` が受け止めているので、ここへ来た時点での0件は「まだタスクが無い」以外にありません。

**タスク1件ぶんの中身**:

```tsx
                    {/* filepath: src/component/project/project-detail-view.tsx */}
                    {/* 完成版: タスク1件ぶんの中身 */}
                    <p className="font-medium">{task.title}</p>
                    <div className="flex gap-2">
                      <StatusBadge status={task.status} />
                      <Badge variant={getPriorityBadgeVariant(task.priority)}>
                        {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

状態の札は `StatusBadge` という専用の部品に任せ、優先度は共通の `Badge` に色の指定を渡す形にしています。状態はタスク一覧でも同じ見た目で何度も出てくるため部品にする値打ちがあり、優先度は色を決める関数さえそろえておけば足ります。

`?? task.priority` を添えてあるのは、対応表に載っていない値が届いても札を空にしないためです。表示が消えると、データがおかしいことにも気付けません。

## つまずきポイント

| エラー/問題 | 原因 | 解決方法 |
|------------|------|---------|
| 詳細が開かない | `router.push('/project?projectId=...')` していない | カードクリック時の URL 更新を確認する |
| API が毎回エラーになる | `selectedProject` が空なのに `getById` を呼んでいる | `enabled: !!selectedProject` を付ける |
| 一覧に戻れない | `onBack` が `router.push('/project')` になっていない | 戻る処理を URL ベースにそろえる |
| アーカイブ後に画面が古いまま | `invalidate()` を呼んでいない | `utils.project.getAll.invalidate()` を `onSuccess` に入れる |
| 詳細 UI が教材画像と違う | 旧モーダル版の資料を見ている | 現在は `ProjectDetailView` のインライン表示が正解 |

---

## Day 27 完了

### 今日学んだこと

| 概念 | 意味 | 使い場面 |
|------|------|---------|
| `useSearchParams` | URL クエリを読む | `/project?projectId=...` の解釈 |
| `router.push()` | URL を変えて画面状態を切り替える | 一覧 ↔ 詳細の切り替え |
| `inferRouterOutputs` | tRPC の戻り値型を自動で取る | `ProjectDetailView` の Props |
| アーカイブ | `isArchived` で論理的に隠す | 完了済みプロジェクトの退避 |
| `enabled` | 条件付きで `useQuery` を実行する | `selectedProject` があるときだけ詳細取得 |
| `invalidate()` | tRPC キャッシュを再取得させる | アーカイブ後の一覧更新 |

### 次回予告

Day 28では、タスクの一括操作を実装します。複数選択したタスクをまとめて完了・削除・ステータス変更できるようにしていきます。

---

## Day 27 終了時点の状態（完成版との違い）

### `src/app/project/page.tsx`

Day 27 全 Step 完了後の状態は、完成版の `src/app/project/page.tsx` と同じです。手元のコードが各 Step の確認ポイントを満たしているかを見てください（販売用 ZIP に完成版の `src/` は入っていません。教材内のコードと確認ポイントが正本です）。

---

## 次に読むもの

- 前の日: [Day 26](./day26_エラーページを作って、バグを退治しよう.md)
- 次の日: [Day 28](./day28_タスク一括操作を実装しよう.md)
- 全体の地図: [学びのロードマップ](./00-1_学びのロードマップ.md)
- 目次: [カリキュラム目次](./00_カリキュラム目次.md)
- 詰まったとき: [トラブルシューティング](./appendix_トラブルシューティング.md)
- 言葉の意味: [用語集](./appendix_用語集.md)
