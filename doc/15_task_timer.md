# Day 15: タスクタイマー・作業時間管理

## 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **タイマーステートマシン** | 開始/停止/累計計算 | ✅ start/stop を安全に制御できる |
| **Prisma 時間フィールド設計** | 作業時間の永続化 | ✅ Float/Boolean/DateTime を使い分けられる |
| **tRPC タイマー手続き** | サーバー側の時間計算 | ✅ 経過分を正確に積算できる |
| **React 楽観的更新** | UX の即時反応 | ✅ サーバー応答前に UI を更新できる |
| **手動入力ダイアログ** | タイマー以外の時間記録 | ✅ 時間・分の入力バリデーションができる |

## なぜこれを学ぶのか?

**実務では「誰がいつ何時間作業したか」を記録するケースが多い**です。タイマー機能はその代表例で、単純に見えてステートマシンの設計ミスが致命的なバグにつながります。

- **ステートマシン**: 「動いている」「止まっている」の遷移を厳密に管理する
- **時間計算はサーバーで**: クライアントの時計は信頼できないため、`timerStartedAt` をサーバーで記録して差分を計算
- **楽観的更新**: ネットワーク待ちで UI がフリーズするのを防ぐ

## 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | ステートマシン設計と Prisma スキーマ | 2ステップ | 20分 |
| **Part 2** | tRPC プロシージャ実装 | 2ステップ | 25分 |
| **Part 3** | React コンポーネントと手動入力 | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: ステートマシン設計と Prisma スキーマ(20分)

#### Step 1.1: タイマーのステートマシン設計(所要時間:10分)

**このステップで学ぶこと**: start/stop/reset の遷移を状態として定義する。

**なぜ必要?**: 「すでに動いているのに start した」「止まっているのに stop した」を防ぐには、状態ごとに許可する操作を決めておく必要があります。

**コードの仕組み解説**:

```typescript
// filepath: 知識整理 — タイマーステートマシン
/**
 * 状態: IDLE (停止中)
 *   isTimerActive: false
 *   timerStartedAt: null
 *   timeSpentMinutes: 累計分(変化しない)
 *
 *   許可する操作: start
 *   禁止する操作: stop (エラー: 'タイマーは実行されていません')
 *
 * 状態: RUNNING (稼働中)
 *   isTimerActive: true
 *   timerStartedAt: Date (開始日時)
 *   timeSpentMinutes: 累計分(変化しない ← まだ加算前)
 *
 *   許可する操作: stop
 *   禁止する操作: start (エラー: 'タイマーは既に実行中です')
 *
 * 遷移図:
 *   IDLE --[start]--> RUNNING
 *   RUNNING --[stop]--> IDLE
 *
 * stop 時の処理:
 *   elapsed = floor((now - timerStartedAt) / 60_000)   // ミリ秒 → 分
 *   timeSpentMinutes += elapsed
 *   isTimerActive = false
 *   timerStartedAt = null
 */
```

**ステートマシンが壊れるパターン**:

| 操作 | IDLE 状態 | RUNNING 状態 |
|------|----------|------------|
| start | ✅ RUNNING へ遷移 | ❌ エラー |
| stop | ❌ エラー | ✅ IDLE へ遷移(時間を積算) |
| addTime | ✅ どちらでも可 | ✅ どちらでも可 |

---

#### Step 1.2: Prisma スキーマの時間フィールド(所要時間:10分)

**このステップで学ぶこと**: 時間追跡に必要な 5 つのフィールドの役割と型の選択理由。

**なぜ必要?**: 型を誤ると精度問題や NULL 違反が起きます。Int vs Float の選択は特に重要です。

**スキーマ(実装済み)**:

```prisma
// filepath: prisma/schema.prisma

model Task {
  // ... 既存フィールド

  // ---- 時間追跡フィールド ----

  // 作業見積もり時間(時間単位、任意入力)
  // Float? にする理由: 1.5h など小数で入力できる
  estimatedHours   Float?       @map("estimated_hours")

  // 実績時間(時間単位、タイマーとは独立した入力)
  // Float にする理由: 0.0 スタートで常に値を持つ
  actualHours      Float        @default(0) @map("actual_hours")

  // タイマーが積算した分(分単位)
  // Float にする理由: DB で直接 increment できる(後述)
  timeSpentMinutes Float        @default(0) @map("time_spent_minutes")

  // タイマー稼働フラグ(RUNNING/IDLE の判定に使う)
  isTimerActive    Boolean      @default(false) @map("is_timer_active")

  // タイマー開始日時(RUNNING → IDLE 時に経過時間を計算するために保持)
  // Nullable: IDLE 状態のときは null
  timerStartedAt   DateTime?    @map("timer_started_at")
}
```

**型の選択理由まとめ**:

| フィールド | 型 | 理由 |
|-----------|-----|------|
| `estimatedHours` | `Float?` | 任意 + 小数対応 |
| `actualHours` | `Float` | 常に存在 + 小数対応 |
| `timeSpentMinutes` | `Float` | Prisma の `increment` が Float に対応 |
| `isTimerActive` | `Boolean` | ステートマシンのフラグ |
| `timerStartedAt` | `DateTime?` | RUNNING 時のみ値が入る |

---

### Part 2: tRPC プロシージャ実装(25分)

#### Step 2.1: updateTimer プロシージャ(所要時間:13分)

**このステップで学ぶこと**: start/stop を 1 つのプロシージャで安全に扱うパターン。

**なぜ必要?**: action を enum で絞ることで、フロントからの不正な操作を型レベルで拒否できます。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts (抜粋)

// タイマー操作のスキーマ
// action を 'start' | 'stop' に限定することで、それ以外の文字列を型で弾く
const taskTimerSchema = z.object({
  id: z.string().cuid(),
  action: z.enum(['start', 'stop']),
});

// ...

updateTimer: protectedProcedure
  .input(taskTimerSchema)
  .mutation(async ({ ctx, input }) => {
    // canEdit 権限チェック: VIEWER は操作不可
    // findTaskWithPermission は NOT_FOUND / FORBIDDEN を内部で throw する
    const task = await findTaskWithPermission(input.id, ctx.session.userId, 'canEdit');

    if (input.action === 'start') {
      // RUNNING → start は二重起動なので弾く
      if (task.isTimerActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'タイマーは既に実行中です',
        });
      }

      // IDLE → RUNNING 遷移
      // timerStartedAt をサーバーで記録する理由:
      //   クライアントの時計はユーザーが変更できるため信頼しない
      return await prisma.task.update({
        where: { id: input.id },
        data: {
          isTimerActive: true,
          timerStartedAt: new Date(),
        },
      });
    }

    // action === 'stop'
    // IDLE → stop は操作ミスなので弾く
    if (!task.isTimerActive || !task.timerStartedAt) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'タイマーは実行されていません',
      });
    }

    // 経過時間を分単位で計算
    // Math.floor で端数を切り捨て(四捨五入しない設計判断)
    const MS_PER_MINUTE = 60_000;
    const elapsedMinutes = Math.floor(
      (Date.now() - task.timerStartedAt.getTime()) / MS_PER_MINUTE
    );

    // RUNNING → IDLE 遷移
    // elapsedMinutes を既存の timeSpentMinutes に加算して永続化
    return await prisma.task.update({
      where: { id: input.id },
      data: {
        isTimerActive: false,
        timerStartedAt: null,
        timeSpentMinutes: task.timeSpentMinutes + elapsedMinutes,
      },
    });
  }),
```

**エラーケース一覧**:

| 状況 | エラーコード | メッセージ |
|------|------------|----------|
| タスクが存在しない | `NOT_FOUND` | タスクが見つかりません |
| プロジェクトメンバーでない | `FORBIDDEN` | この操作を実行する権限がありません |
| VIEWER ロールで操作 | `FORBIDDEN` | この操作を実行する権限がありません |
| RUNNING 中に start | `BAD_REQUEST` | タイマーは既に実行中です |
| IDLE 中に stop | `BAD_REQUEST` | タイマーは実行されていません |

---

#### Step 2.2: addTime プロシージャ(所要時間:12分)

**このステップで学ぶこと**: 手動入力の時間を `increment` で安全に積算する。

**なぜ必要?**: `timeSpentMinutes = X` のように値を上書きすると、並列リクエストで時間が消える競合が起きます。`increment` を使うと DB 側でアトミックに加算できます。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts (抜粋)

// 手動入力スキーマ
// minutesToAdd は 0 以上の整数のみ許容(マイナスを弾く)
const taskTimeUpdateSchema = z.object({
  id: z.string().cuid(),
  minutesToAdd: z.number().min(0),
});

// ...

addTime: protectedProcedure
  .input(taskTimeUpdateSchema)
  .mutation(async ({ ctx, input }) => {
    // canEdit チェック: VIEWER は手動入力も不可
    await findTaskWithPermission(input.id, ctx.session.userId, 'canEdit');

    return await prisma.task.update({
      where: { id: input.id },
      data: {
        timeSpentMinutes: {
          // increment を使う理由:
          //   { timeSpentMinutes: currentValue + delta } で書くと
          //   「読み取り → 加算 → 書き込み」の間に別リクエストが割り込むと時間が消える
          //   increment は DB 側で「UPDATE ... SET x = x + delta」になるのでアトミック
          increment: input.minutesToAdd,
        },
      },
    });
  }),
```

**increment vs 上書きの違い**:

```typescript
// 悪い例: 競合が起きると後勝ちになる
const task = await prisma.task.findUnique({ where: { id } });
await prisma.task.update({
  data: { timeSpentMinutes: task.timeSpentMinutes + 30 }, // 読み取り→加算→書き込み
});

// 良い例: DB が 1 命令でアトミックに処理する
await prisma.task.update({
  data: { timeSpentMinutes: { increment: 30 } }, // UPDATE SET time = time + 30
});
```

---

### Part 3: React コンポーネントと手動入力(15分)

#### Step 3.1: TaskTimer コンポーネントと TimeLogDialog(所要時間:15分)

**このステップで学ぶこと**: ローカルカウンターで「リアルタイム表示」しながら、実際の積算はサーバーに任せる設計。

**なぜ必要?**: サーバーに 1 秒おきにリクエストを送るのは非現実的です。`setInterval` でローカルに表示だけ更新し、stop 時にサーバーで確定するのが正解です。

**TaskTimer コンポーネント**:

```typescript
// filepath: src/component/task/task-timer.tsx

'use client';

import { Loader2, PauseIcon, PlayIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/component/ui/button';
import { api } from '@/trpc/react';

interface TaskTimerProps {
  taskId: string;
  isTimerActive: boolean;
  timerStartedAt: Date | null;
  timeSpentMinutes: number;
  onTimerUpdate?: (() => void) | undefined;
}

export function TaskTimer({
  taskId,
  isTimerActive,
  timerStartedAt,
  timeSpentMinutes,
  onTimerUpdate,
}: TaskTimerProps) {
  // ローカルカウンター: 表示専用。サーバーの状態とは独立
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const updateTimerMutation = api.task.updateTimer.useMutation({
    onSuccess: () => {
      // サーバー確定後に親コンポーネントのキャッシュを更新させる
      onTimerUpdate?.();
    },
  });

  useEffect(() => {
    if (!isTimerActive || !timerStartedAt) {
      // IDLE 状態ではカウンターをリセット
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(timerStartedAt).getTime();

    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    };

    // マウント直後に 1 回実行して、1 秒後まで 0 表示になるのを防ぐ
    updateElapsed();

    // 1 秒おきにローカル表示を更新
    const interval = setInterval(updateElapsed, 1000);

    // クリーンアップ: アンマウントやタイマー停止時にタイマーを止める
    return () => clearInterval(interval);
  }, [isTimerActive, timerStartedAt]);

  const handleStartStop = async () => {
    try {
      await updateTimerMutation.mutateAsync({
        id: taskId,
        action: isTimerActive ? 'stop' : 'start',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'タイマーの更新に失敗しました');
    }
  };

  // 秒数を HH:MM:SS 表示に変換
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hours, minutes, secs]
      .map((v) => v.toString().padStart(2, '0'))
      .join(':');
  };

  // 分数を「Xh Ym」表示に変換
  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant={isTimerActive ? 'destructive' : 'default'}
          size="sm"
          onClick={handleStartStop}
          disabled={updateTimerMutation.isPending}
          aria-label={isTimerActive ? 'タイマー停止' : 'タイマー開始'}
        >
          {updateTimerMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : isTimerActive ? (
            <PauseIcon className="w-4 h-4 mr-2" />
          ) : (
            <PlayIcon className="w-4 h-4 mr-2" />
          )}
          {isTimerActive ? 'タイマー停止' : 'タイマー開始'}
        </Button>

        {/* RUNNING 中だけカウンターを表示 */}
        {isTimerActive && (
          <span className="text-lg font-bold font-mono text-primary">
            {formatTime(elapsedSeconds)}
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        合計作業時間: {formatMinutes(timeSpentMinutes)}
      </p>
    </div>
  );
}
```

**TimeLogDialog — 手動入力ダイアログ**:

```typescript
// filepath: src/component/task/time-log-dialog.tsx

'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/component/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/component/ui/dialog';
import { Input } from '@/component/ui/input';
import { Label } from '@/component/ui/label';
import { api } from '@/trpc/react';

interface TimeLogDialogProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  onSuccess?: (() => void) | undefined;
}

export function TimeLogDialog({ open, onClose, taskId, onSuccess }: TimeLogDialogProps) {
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');

  const addTimeMutation = api.task.addTime.useMutation({
    onSuccess: () => {
      onSuccess?.();
      handleClose();
    },
  });

  const handleClose = () => {
    // ダイアログを閉じるたびに入力をリセット
    setHours('');
    setMinutes('');
    onClose();
  };

  const handleSubmit = async () => {
    const totalMinutes =
      Number.parseInt(hours || '0', 10) * 60 +
      Number.parseInt(minutes || '0', 10);

    // 0 分は送信しない(バリデーション)
    if (totalMinutes <= 0) return;

    try {
      await addTimeMutation.mutateAsync({ id: taskId, minutesToAdd: totalMinutes });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '作業時間の追加に失敗しました');
    }
  };

  // 数字のみ受け付け
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '' || /^\d+$/.test(v)) setHours(v);
  };

  // 数字かつ 0-59 の範囲のみ受け付け
  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '' || (/^\d+$/.test(v) && Number.parseInt(v, 10) < 60)) {
      setMinutes(v);
    }
  };

  const isValid =
    Number.parseInt(hours || '0', 10) * 60 +
      Number.parseInt(minutes || '0', 10) > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>作業時間の記録</DialogTitle>
          <DialogDescription>タスクに作業時間を記録します</DialogDescription>
        </DialogHeader>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="hours" className="text-sm font-medium mb-2 block">
              時間
            </Label>
            <Input
              id="hours"
              value={hours}
              onChange={handleHoursChange}
              type="text"
              inputMode="numeric"
              placeholder="0"
              disabled={addTimeMutation.isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">作業時間（時）</p>
          </div>
          <div className="flex-1">
            <Label htmlFor="minutes" className="text-sm font-medium mb-2 block">
              分
            </Label>
            <Input
              id="minutes"
              value={minutes}
              onChange={handleMinutesChange}
              type="text"
              inputMode="numeric"
              placeholder="0"
              disabled={addTimeMutation.isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">作業時間（分、0-59）</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={addTimeMutation.isPending}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || addTimeMutation.isPending}
          >
            {addTimeMutation.isPending ? '追加中...' : '時間を追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**2 コンポーネントの役割分担**:

| コンポーネント | 役割 | tRPC 呼び出し |
|--------------|------|-------------|
| `TaskTimer` | タイマー開始/停止 + 経過時間表示 | `task.updateTimer` |
| `TimeLogDialog` | 時間・分の手動入力 | `task.addTime` |

---

## 今日の成果

以下の内容を実装できたことを確認:

1. **ステートマシン設計**
   - [ ] IDLE / RUNNING の 2 状態を図にできる
   - [ ] 禁止操作でエラーになることを確認した

2. **Prisma スキーマ**
   - [ ] 5 つのフィールドの型と役割を説明できる
   - [ ] Float? と Float の違いを理解した

3. **tRPC プロシージャ**
   - [ ] updateTimer: start/stop 両ブランチの動作を確認した
   - [ ] addTime: increment でアトミックに加算されることを確認した

4. **React コンポーネント**
   - [ ] setInterval でローカルカウンターが動くことを確認した
   - [ ] TimeLogDialog で 0 分のとき送信できないことを確認した

---

## 練習問題

1. `updateTimer` の `stop` 処理で `Math.floor` を `Math.round` に変えると何が変わるか説明してください。

2. `timeSpentMinutes` を `increment` ではなく直接代入で実装した場合に、並列リクエストで何が起こるかを説明してください。

3. `TaskTimer` コンポーネントで `setInterval` のクリーンアップ関数を省略した場合、どのような問題が起きますか?

4. `minutesToAdd: z.number().min(0)` のバリデーションを `min(1)` に変更した場合、`TimeLogDialog` の動作にどんな影響がありますか?

---

## まとめ

- **ステートマシン**: IDLE / RUNNING の遷移を厳密に定義することで、二重起動や不整合を防ぐ
- **時間計算はサーバーで**: `timerStartedAt` をサーバーで記録し、差分をサーバーで計算する
- **increment**: 時間の加算は `{ increment: n }` を使ってアトミックにする
- **ローカルカウンター**: `setInterval` は表示専用。確定はサーバー呼び出しで行う
- **手動入力**: タイマーを止め忘れた場合など、`addTime` で後から修正できる

次回(Day 16)は、認可(RBAC)の設計と実装です。Day 14 で触れた `adminProcedure` と `ProjectMemberRole` を体系化します。
