// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  QueryClient,
  QueryClientProvider,
  type UseMutationOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TaskDetailDialog } from '@/component/task/task-detail-dialog';

type Write = 'create' | 'update' | 'delete';
type Vars = Record<string, unknown>;
const REOPENED_CREATE_WARNING =
  '先ほどの投稿は完了しています。残った入力をこのまま投稿すると重複する可能性があります。';
const STALE_CREATE_SUCCESS = '先ほど送信したコメントを投稿しました。';
const STALE_UPDATE_SUCCESS = '先ほど送信したコメントを更新しました。';
const CURRENT_DELETE_SUCCESS = 'コメントを削除しました。';
const STALE_DELETE_SUCCESS = '先ほど送信したコメントを削除しました。';
const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
);
vi.mock('react-hot-toast', () => ({ default: toast }));
const mocks = vi.hoisted(() => ({
  invalidated: vi.fn(),
  taskReadError: null as Error | null,
  writes: Object.fromEntries(
    ['create', 'update', 'delete'].map((name) => [
      name,
      vi.fn<(variables: Vars) => Promise<unknown>>(),
    ]),
  ) as Record<Write, ReturnType<typeof vi.fn<(variables: Vars) => Promise<unknown>>>>,
}));
const details = Object.fromEntries(
  ['a', 'b'].map((id) => [
    id,
    {
      id,
      title: `Task ${id.toUpperCase()}`,
      description: `Description ${id}`,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: null,
      assignee: null,
      project: { name: `Project ${id}`, members: [{ userId: 'user-1', role: 'MEMBER' }] },
      comments: [
        {
          id: `comment-${id}`,
          userId: 'user-1',
          content: `Comment ${id}`,
          createdAt: '2026-01-01T00:00:00.000Z',
          user: { name: 'Author', email: 'author@example.test', avatar: null },
        },
      ],
    },
  ]),
);
function detailFor(id: string) {
  const detail = details[id];
  if (!detail) throw new Error(`Missing task fixture: ${id}`);
  return detail;
}
vi.mock('@/trpc/react', () => {
  const mutation = (name: Write) => ({
    useMutation: (options: UseMutationOptions<unknown, Error, Vars>) =>
      useMutation({ ...options, mutationKey: ['comment', name], mutationFn: mocks.writes[name] }),
  });
  return {
    api: {
      useUtils: () => ({ task: { getById: { invalidate: mocks.invalidated } } }),
      auth: {
        getSession: {
          useQuery: (_input: unknown, options: object) =>
            useQuery({
              queryKey: ['session'],
              queryFn: async () => ({ user: { id: 'user-1' } }),
              initialData: { user: { id: 'user-1' } },
              staleTime: Infinity,
              ...options,
            }),
        },
      },
      task: {
        getById: {
          useQuery: (input: { id: string }, options: object) =>
            useQuery({
              queryKey: ['task', input.id],
              queryFn: async () => {
                if (mocks.taskReadError) throw mocks.taskReadError;
                return detailFor(input.id);
              },
              initialData: detailFor(input.id),
              staleTime: Infinity,
              ...options,
            }),
        },
      },
      comment: {
        create: mutation('create'),
        update: mutation('update'),
        delete: mutation('delete'),
      },
    },
  };
});
let client: QueryClient;
function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function Harness({ onAuthExpired = vi.fn() }: { onAuthExpired?: () => void }) {
  const [open, setOpen] = useState(true);
  const [taskId, setTaskId] = useState('a');
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTaskId('a');
          setOpen(true);
        }}
      >
        Open A
      </button>
      <button
        type="button"
        onClick={() => {
          setTaskId('b');
          setOpen(true);
        }}
      >
        Open B
      </button>
      <TaskDetailDialog
        open={open}
        taskId={taskId}
        onClose={() => setOpen(false)}
        onAuthExpired={onAuthExpired}
      />
    </>
  );
}
function mount(onAuthExpired?: () => void) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <Harness {...(onAuthExpired ? { onAuthExpired } : {})} />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.taskReadError = null;
  for (const fn of Object.values(mocks.writes)) fn.mockResolvedValue({});
  mocks.invalidated.mockResolvedValue(undefined);
});

async function startPendingWrite(write: Write) {
  if (write === 'create') {
    fireEvent.change(screen.getByRole('textbox', { name: 'コメント本文' }), {
      target: { value: 'pending create' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));
  } else if (write === 'update') {
    fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));
    fireEvent.change(screen.getByDisplayValue('Comment a'), {
      target: { value: 'pending update' },
    });
    fireEvent.click(screen.getByRole('button', { name: '更新' }));
  } else {
    fireEvent.click(screen.getByRole('button', { name: 'コメントを削除' }));
    fireEvent.click(await screen.findByRole('button', { name: '削除' }));
  }
  await waitFor(() => expect(mocks.writes[write]).toHaveBeenCalledTimes(1));
}

it.each([
  'create',
  'update',
  'delete',
] as const)('suppresses late %s callbacks after a parent-equivalent unmount', async (write) => {
  const pending = deferred();
  const onAuthExpired = vi.fn();
  mocks.writes[write].mockReturnValue(pending.promise);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <TaskDetailDialog open taskId="a" onClose={() => {}} onAuthExpired={onAuthExpired} />
    </QueryClientProvider>,
  );
  await screen.findByText('Task A');
  await startPendingWrite(write);
  view.unmount();

  await act(async () => pending.resolve({}));
  await waitFor(() =>
    expect(
      client.getMutationCache().findAll({ mutationKey: ['comment', write] })[0]?.state.status,
    ).toBe('success'),
  );
  expect(toast.success).not.toHaveBeenCalled();
  expect(toast).not.toHaveBeenCalled();
  expect(toast.error).not.toHaveBeenCalled();
  expect(mocks.invalidated).not.toHaveBeenCalled();
  expect(onAuthExpired).not.toHaveBeenCalled();
});

it.each([
  'create',
  'update',
  'delete',
] as const)('suppresses late %s callbacks after the detail query crosses the auth boundary', async (write) => {
  const pending = deferred();
  const onAuthExpired = vi.fn();
  mocks.writes[write].mockReturnValue(pending.promise);
  mount(onAuthExpired);
  await screen.findByText('Task A');
  await startPendingWrite(write);

  mocks.taskReadError = Object.assign(new Error('PRIVATE_READ_401'), {
    data: { code: 'UNAUTHORIZED', httpStatus: 401 },
  });
  await act(async () => {
    await client.refetchQueries({ queryKey: ['task', 'a'] });
  });
  await screen.findByRole('link', { name: 'ログイン画面へ' });
  expect(onAuthExpired).toHaveBeenCalledTimes(1);
  onAuthExpired.mockClear();

  await act(async () => pending.resolve({}));
  await waitFor(() =>
    expect(
      client.getMutationCache().findAll({ mutationKey: ['comment', write] })[0]?.state.status,
    ).toBe('success'),
  );
  expect(toast.success).not.toHaveBeenCalled();
  expect(toast).not.toHaveBeenCalled();
  expect(toast.error).not.toHaveBeenCalled();
  expect(mocks.invalidated).not.toHaveBeenCalled();
  expect(onAuthExpired).not.toHaveBeenCalled();
});

it.each([
  'create',
  'update',
  'delete',
] as const)('routes a delayed A %s 401 only through the authentication path while B is open', async (write) => {
  const pending = deferred();
  const onAuthExpired = vi.fn();
  mocks.writes[write].mockReturnValue(pending.promise);
  mount(onAuthExpired);
  await screen.findByText('Task A');
  await startPendingWrite(write);
  if (write === 'delete') {
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  }
  fireEvent.click(screen.getByText('閉じる', { selector: 'button' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open B' }));
  await screen.findByText('Task B');

  await act(async () =>
    pending.reject(
      Object.assign(new Error(`PRIVATE_${write.toUpperCase()}_401`), {
        data: { code: 'UNAUTHORIZED', httpStatus: 401 },
      }),
    ),
  );
  await waitFor(() =>
    expect(
      client.getMutationCache().findAll({ mutationKey: ['comment', write] })[0]?.state.status,
    ).toBe('error'),
  );

  expect(onAuthExpired).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('link', { name: 'ログイン画面へ' })).toBeInTheDocument();
  expect(mocks.invalidated).toHaveBeenCalledWith(
    { id: 'a' },
    { refetchType: 'none' },
    { throwOnError: true },
  );
  expect(toast.error).not.toHaveBeenCalled();
  expect(toast).not.toHaveBeenCalled();
});
afterEach(() => {
  cleanup();
  client?.clear();
});

it('keeps the newer B draft when delayed A comment creation succeeds', async () => {
  const pending = deferred();
  mocks.writes.create.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  fireEvent.change(screen.getByRole('textbox', { name: 'コメント本文' }), {
    target: { value: 'A submission' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));
  await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByText('閉じる', { selector: 'button' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open B' }));
  await screen.findByText('Task B');
  const draft = screen.getByRole('textbox', { name: 'コメント本文' });
  fireEvent.change(draft, { target: { value: 'B draft must survive' } });
  expect(draft).toHaveValue('B draft must survive'); // positive control: B draft exists before A settles
  await act(async () => pending.resolve({}));
  await waitFor(() => expect(draft).toHaveValue('B draft must survive'));
  expect(toast.success).toHaveBeenCalledWith(STALE_CREATE_SUCCESS);
  expect(toast.success).not.toHaveBeenCalledWith('コメントを投稿しました。');
  expect(toast).not.toHaveBeenCalledWith(REOPENED_CREATE_WARNING);
  expect(mocks.invalidated).toHaveBeenCalledWith({ id: 'a' }, undefined, { throwOnError: true });
});

it('resets create, edit, and delete UI when taskId changes directly from A to B', async () => {
  mount();
  await screen.findByText('Task A');
  fireEvent.change(screen.getByRole('textbox', { name: 'コメント本文' }), {
    target: { value: 'A create draft' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));
  fireEvent.change(screen.getByDisplayValue('Comment a'), {
    target: { value: 'A edit draft' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'コメントを削除' }));
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Open B'));
  await screen.findByText('Task B');
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(screen.getByRole('textbox', { name: 'コメント本文' })).toHaveValue('');
  expect(screen.queryByDisplayValue('A edit draft')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '更新' })).not.toBeInTheDocument();
});

it('keeps the newer B editor when delayed A comment update succeeds', async () => {
  const pending = deferred();
  mocks.writes.update.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));
  fireEvent.change(screen.getByDisplayValue('Comment a'), { target: { value: 'A updated' } });
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByText('閉じる', { selector: 'button' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open B' }));
  await screen.findByText('Task B');
  fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));
  const bEditor = screen.getByDisplayValue('Comment b');
  fireEvent.change(bEditor, { target: { value: 'B edit must survive' } });
  expect(bEditor).toHaveValue('B edit must survive'); // positive control
  await act(async () => pending.resolve({}));
  await waitFor(() => expect(screen.getByDisplayValue('B edit must survive')).toBeInTheDocument());
  expect(toast.success).toHaveBeenCalledWith(STALE_UPDATE_SUCCESS);
  expect(toast.success).not.toHaveBeenCalledWith('コメントを更新しました。');
  expect(mocks.invalidated).toHaveBeenCalledWith({ id: 'a' }, undefined, { throwOnError: true });
});

it('keeps a newer same-task edit when an older comment update succeeds', async () => {
  const pending = deferred();
  mocks.writes.update.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));
  const editor = screen.getByDisplayValue('Comment a');
  fireEvent.change(editor, { target: { value: 'submitted update' } });
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  expect(editor).toBeEnabled();
  fireEvent.change(editor, { target: { value: 'newer unsent update' } });
  await act(async () => pending.resolve({}));
  await waitFor(() => expect(screen.getByDisplayValue('newer unsent update')).toBeInTheDocument());
  expect(mocks.invalidated).toHaveBeenCalledWith({ id: 'a' }, undefined, { throwOnError: true });
});

it('closes an unchanged editor after its own successful update', async () => {
  mount();
  await screen.findByText('Task A');
  fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));
  fireEvent.change(screen.getByDisplayValue('Comment a'), { target: { value: 'saved update' } });
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByDisplayValue('saved update')).not.toBeInTheDocument());
});

it('turns a comment 401 into sticky login guidance and informs the parent', async () => {
  const expire = vi.fn();
  mocks.writes.create.mockRejectedValue(
    Object.assign(new Error('PRIVATE_401'), { data: { code: 'UNAUTHORIZED', httpStatus: 401 } }),
  );
  mount(expire);
  await screen.findByText('Task A');
  fireEvent.change(screen.getByRole('textbox', { name: 'コメント本文' }), {
    target: { value: 'will fail' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));
  await waitFor(() =>
    expect(
      client.getMutationCache().findAll({ mutationKey: ['comment', 'create'] })[0]?.state.status,
    ).toBe('error'),
  );
  expect(expire).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('link', { name: 'ログイン画面へ' })).toBeInTheDocument();
  expect(
    screen.getByText('ログインの有効期限が切れました。もう一度ログインしてください。'),
  ).toBeInTheDocument();
  expect(mocks.invalidated).toHaveBeenCalledWith(
    { id: 'a' },
    { refetchType: 'none' },
    { throwOnError: true },
  );
});

it('does not show an old A failure on B and refreshes the submitted task', async () => {
  const pending = deferred();
  mocks.writes.create.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  fireEvent.change(screen.getByRole('textbox', { name: 'コメント本文' }), {
    target: { value: 'A will fail' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));
  await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByText('閉じる', { selector: 'button' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open B' }));
  await screen.findByText('Task B');
  await act(async () =>
    pending.reject(
      Object.assign(new Error('PRIVATE_403'), {
        data: { code: 'FORBIDDEN', httpStatus: 403 },
      }),
    ),
  );
  await waitFor(() =>
    expect(mocks.invalidated).toHaveBeenCalledWith({ id: 'a' }, undefined, { throwOnError: true }),
  );
  expect(screen.queryByText(/コメントの投稿を実行できません/)).not.toBeInTheDocument();
  expect(toast.error).toHaveBeenCalledWith(
    '先ほど送信したコメントの投稿に失敗しました。コメントの投稿を実行できません。権限と対象の最新の状態を確認してください。',
  );
  expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining('PRIVATE_403'));
});

it('identifies a delayed A update failure as an earlier submission while B is visible', async () => {
  const pending = deferred();
  mocks.writes.update.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));
  fireEvent.change(screen.getByDisplayValue('Comment a'), {
    target: { value: 'A update will fail' },
  });
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByText('閉じる', { selector: 'button' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open B' }));
  await screen.findByText('Task B');

  await act(async () =>
    pending.reject(
      Object.assign(new Error('PRIVATE_403_UPDATE'), {
        data: { code: 'FORBIDDEN', httpStatus: 403 },
      }),
    ),
  );
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      '先ほど送信したコメントの更新に失敗しました。コメントの更新を実行できません。権限と対象の最新の状態を確認してください。',
    ),
  );
  expect(screen.queryByText(/コメントの更新を実行できません/)).not.toBeInTheDocument();
  expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining('PRIVATE_403_UPDATE'));
});

it('clears an unchanged create draft when starting and cancelling an editor while creation is pending', async () => {
  const pending = deferred();
  mocks.writes.create.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  const draft = screen.getByRole('textbox', { name: 'コメント本文' });
  fireEvent.change(draft, { target: { value: 'submitted only once' } });
  fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));
  await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));
  fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
  expect(draft).toHaveValue('submitted only once');

  await act(async () => pending.resolve({}));
  await waitFor(() => expect(draft).toHaveValue(''));
});

it('keeps newer same-task input when an older comment creation succeeds', async () => {
  const pending = deferred();
  mocks.writes.create.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  const draft = screen.getByRole('textbox', { name: 'コメント本文' });
  fireEvent.change(draft, { target: { value: 'submitted A text' } });
  fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));
  await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1));
  expect(draft).toBeEnabled();
  fireEvent.change(draft, { target: { value: 'newer unsent A draft' } });
  expect(draft).toHaveValue('newer unsent A draft'); // positive control: input remains editable while pending
  await act(async () => pending.resolve({}));
  await waitFor(() => expect(draft).toHaveValue('newer unsent A draft'));
  expect(toast.success).toHaveBeenCalledWith('コメントを投稿しました。');
  expect(toast).toHaveBeenCalledWith(
    '送信後の変更は保存されていません。このまま投稿すると、同じ内容が重複する可能性があります。',
  );
});

it('reports successful update while preserving a newer unsaved edit', async () => {
  const pending = deferred();
  mocks.writes.update.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));
  const editor = screen.getByDisplayValue('Comment a');
  fireEvent.change(editor, { target: { value: 'submitted edit' } });
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  fireEvent.change(editor, { target: { value: 'newer unsaved edit' } });

  await act(async () => pending.resolve({}));
  await waitFor(() => expect(editor).toHaveValue('newer unsaved edit'));
  expect(toast.success).toHaveBeenCalledWith('コメントを更新しました。');
  expect(toast).toHaveBeenCalledWith(
    '送信後に入力した変更は保存されていません。入力内容を別の場所にコピーしてから「キャンセル」を押し、コメントをもう一度編集して保存してください。',
  );
});

it('keeps an identically worded draft from a newer A dialog lifetime', async () => {
  const pending = deferred();
  mocks.writes.create.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  const firstDraft = screen.getByRole('textbox', { name: 'コメント本文' });
  fireEvent.change(firstDraft, { target: { value: 'same content X' } });
  fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));
  await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByText('閉じる', { selector: 'button' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open A' }));
  await screen.findByText('Task A');
  const reopenedDraft = screen.getByRole('textbox', { name: 'コメント本文' });
  fireEvent.change(reopenedDraft, { target: { value: 'same content X' } });
  expect(reopenedDraft).toHaveValue('same content X'); // taskId/open/content all match the old submission

  await act(async () => pending.resolve({}));
  await waitFor(() => expect(reopenedDraft).toHaveValue('same content X'));
  expect(toast).toHaveBeenCalledWith(REOPENED_CREATE_WARNING);
});

it('does not warn that a different draft from a newer A dialog lifetime is a duplicate', async () => {
  const pending = deferred();
  mocks.writes.create.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  fireEvent.change(screen.getByRole('textbox', { name: 'コメント本文' }), {
    target: { value: 'submitted content X' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));
  await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByText('閉じる', { selector: 'button' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open A' }));
  await screen.findByText('Task A');
  const reopenedDraft = screen.getByRole('textbox', { name: 'コメント本文' });
  fireEvent.change(reopenedDraft, { target: { value: 'different content Y' } });

  await act(async () => pending.resolve({}));
  await waitFor(() => expect(reopenedDraft).toHaveValue('different content Y'));
  expect(toast.success).toHaveBeenCalledWith(STALE_CREATE_SUCCESS);
  expect(toast).not.toHaveBeenCalledWith(REOPENED_CREATE_WARNING);
});

it('does not warn about duplicate posting while the submitted task dialog stays closed', async () => {
  const pending = deferred();
  mocks.writes.create.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  fireEvent.change(screen.getByRole('textbox', { name: 'コメント本文' }), {
    target: { value: 'closed submission' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));
  await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByText('閉じる', { selector: 'button' }));

  await act(async () => pending.resolve({}));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith(STALE_CREATE_SUCCESS));
  expect(toast).not.toHaveBeenCalledWith(REOPENED_CREATE_WARNING);
});

it('clears an unchanged draft after its own successful creation', async () => {
  mount();
  await screen.findByText('Task A');
  const draft = screen.getByRole('textbox', { name: 'コメント本文' });
  fireEvent.change(draft, { target: { value: 'submitted once' } });
  fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));
  await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(draft).toHaveValue(''));
  expect(mocks.invalidated).toHaveBeenCalledWith({ id: 'a' }, undefined, { throwOnError: true });
});

it('keeps write success separate from a failed refresh', async () => {
  mocks.invalidated.mockRejectedValue(new Error('REFETCH_FAILED'));
  mount();
  await screen.findByText('Task A');
  const draft = screen.getByRole('textbox', { name: 'コメント本文' });
  fireEvent.change(draft, { target: { value: 'saved before refresh failure' } });
  fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));
  await waitFor(() => expect(draft).toHaveValue(''));
  expect(
    await screen.findByText(
      'コメントの操作は完了しましたが、最新のコメントを取得できませんでした。画面を閉じて開き直してください。',
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText('REFETCH_FAILED')).not.toBeInTheDocument();
  expect(mocks.invalidated).toHaveBeenCalledWith({ id: 'a' }, undefined, { throwOnError: true });
});

it('turns a 401 during the success refresh into sticky login guidance without calling the write a failure', async () => {
  const expire = vi.fn();
  mocks.invalidated.mockRejectedValue(
    Object.assign(new Error('REFRESH_401'), {
      data: { code: 'UNAUTHORIZED', httpStatus: 401 },
    }),
  );
  mount(expire);
  await screen.findByText('Task A');
  const draft = screen.getByRole('textbox', { name: 'コメント本文' });
  fireEvent.change(draft, { target: { value: 'saved before auth refresh' } });
  fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));

  await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
  expect(toast.success).toHaveBeenCalledWith('コメントを投稿しました。');
  expect(screen.getByRole('link', { name: 'ログイン画面へ' })).toBeInTheDocument();
  expect(toast.error).not.toHaveBeenCalledWith(
    expect.stringMatching(/コメントの投稿を実行できません/),
  );
});

it('reports a failed refresh after a write error without claiming that the write completed', async () => {
  mocks.writes.create.mockRejectedValue(
    Object.assign(new Error('PRIVATE_403'), {
      data: { code: 'FORBIDDEN', httpStatus: 403 },
    }),
  );
  mocks.invalidated.mockRejectedValue(new Error('REFRESH_500'));
  mount();
  await screen.findByText('Task A');
  fireEvent.change(screen.getByRole('textbox', { name: 'コメント本文' }), {
    target: { value: 'will fail and fail refresh' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'コメント投稿' }));

  expect(await screen.findByText(/コメントの投稿を実行できません/)).toBeInTheDocument();
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      '最新のコメントを取得できませんでした。画面を閉じて開き直してください。',
    ),
  );
  expect(toast.error).not.toHaveBeenCalledWith(expect.stringMatching(/操作は完了しました/));
});

it('acquires the shared write lock before mutate can be submitted twice', async () => {
  const pending = deferred();
  mocks.writes.create.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  fireEvent.change(screen.getByRole('textbox', { name: 'コメント本文' }), {
    target: { value: 'only once' },
  });
  const form = screen.getByRole('textbox', { name: 'コメント本文' }).closest('form');
  if (!form) throw new Error('Comment input is not inside a form');
  fireEvent.submit(form);
  fireEvent.submit(form);
  await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1));
  await act(async () => pending.resolve({}));
});

it('allows pending delete cancellation and does not reopen its trigger', async () => {
  const pending = deferred();
  mocks.writes.delete.mockReturnValue(pending.promise);
  mount();
  await screen.findByText('Task A');
  fireEvent.click(screen.getByRole('button', { name: 'コメントを削除' }));
  fireEvent.click(await screen.findByRole('button', { name: '削除' }));
  await waitFor(() => expect(mocks.writes.delete).toHaveBeenCalledTimes(1));
  const cancel = screen.getByRole('button', { name: 'キャンセル' });
  expect(cancel).toBeEnabled();
  fireEvent.click(cancel);
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'コメントを削除' })).toBeDisabled();
  await act(async () => pending.resolve({}));
  expect(mocks.invalidated).toHaveBeenCalledWith({ id: 'a' }, undefined, { throwOnError: true });
  expect(toast.success).toHaveBeenCalledWith(STALE_DELETE_SUCCESS);
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

it('closes the matching delete confirmation after success', async () => {
  mount();
  await screen.findByText('Task A');
  fireEvent.click(screen.getByRole('button', { name: 'コメントを削除' }));
  fireEvent.click(await screen.findByRole('button', { name: '削除' }));
  await waitFor(() => expect(mocks.writes.delete).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(toast.success).toHaveBeenCalledWith(CURRENT_DELETE_SUCCESS);
  expect(mocks.invalidated).toHaveBeenCalledWith({ id: 'a' }, undefined, { throwOnError: true });
});

it('retains the delete confirmation and shows fixed guidance after failure', async () => {
  mocks.writes.delete.mockRejectedValue(
    Object.assign(new Error('PRIVATE_409'), { data: { code: 'CONFLICT', httpStatus: 409 } }),
  );
  mount();
  await screen.findByText('Task A');
  fireEvent.click(screen.getByRole('button', { name: 'コメントを削除' }));
  fireEvent.click(await screen.findByRole('button', { name: '削除' }));
  await waitFor(() =>
    expect(
      client.getMutationCache().findAll({ mutationKey: ['comment', 'delete'] })[0]?.state.status,
    ).toBe('error'),
  );
  const confirmation = screen.getByRole('alertdialog');
  expect(confirmation).toBeInTheDocument();
  expect(confirmation).toHaveTextContent(/コメントの削除を現在の状態では実行できません/);
  expect(screen.queryByText('PRIVATE_409')).not.toBeInTheDocument();
  expect(mocks.invalidated).toHaveBeenCalledWith({ id: 'a' }, undefined, { throwOnError: true });
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});
