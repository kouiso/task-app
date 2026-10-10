// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDetailDialog } from '@/component/task/task-detail-dialog';

const state = vi.hoisted(() => ({
  code: null as string | null,
  calls: 0,
  sessionCode: null as string | null,
  sessionCalls: 0,
  sessionWait: null as Promise<void> | null,
}));
const privateTitle = 'PRIVATE TASK TITLE';
const task = {
  id: 'task-1',
  title: privateTitle,
  description: 'PRIVATE DESCRIPTION',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  assignee: null,
  project: { name: 'PRIVATE PROJECT', members: [{ userId: 'user-1', role: 'MEMBER' }] },
  comments: [
    {
      id: 'comment-1',
      userId: 'user-1',
      content: 'PRIVATE COMMENT',
      createdAt: '2026-01-01T00:00:00.000Z',
      user: { name: 'AUTHOR', email: 'author@example.test', avatar: null },
    },
  ],
};
vi.mock('@/trpc/react', () => ({
  api: {
    useUtils: () => ({ task: { getById: { invalidate: vi.fn() } } }),
    auth: {
      getSession: {
        useQuery: (_input: unknown, options: object) =>
          useQuery({
            queryKey: ['session'],
            queryFn: async () => {
              state.sessionCalls++;
              if (state.sessionWait) await state.sessionWait;
              if (state.sessionCode)
                throw Object.assign(new Error('Untrusted session message'), {
                  data: {
                    code: state.sessionCode,
                    httpStatus: state.sessionCode === 'UNAUTHORIZED' ? 401 : 500,
                  },
                });
              return { user: { id: 'user-1' } };
            },
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
              state.calls++;
              if (state.code)
                throw Object.assign(new Error('Untrusted backend message'), {
                  data: {
                    code: state.code,
                    httpStatus: (
                      {
                        UNAUTHORIZED: 401,
                        FORBIDDEN: 403,
                        NOT_FOUND: 404,
                        INTERNAL_SERVER_ERROR: 500,
                      } as Record<string, number>
                    )[state.code],
                  },
                });
              return task;
            },
            ...options,
          }),
      },
    },
    comment: {
      create: {
        useMutation: (options: object) => useMutation({ mutationFn: async () => ({}), ...options }),
      },
      update: {
        useMutation: (options: object) => useMutation({ mutationFn: async () => ({}), ...options }),
      },
      delete: {
        useMutation: (options: object) => useMutation({ mutationFn: async () => ({}), ...options }),
      },
    },
  },
}));
let client: QueryClient;
beforeEach(() => {
  state.code = null;
  state.calls = 0;
  state.sessionCode = null;
  state.sessionCalls = 0;
  state.sessionWait = null;
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
});
afterEach(() => {
  cleanup();
  client.clear();
});
function show() {
  render(
    <QueryClientProvider client={client}>
      <TaskDetailDialog open taskId="task-1" onClose={() => {}} />
    </QueryClientProvider>,
  );
}
async function fail(code: string) {
  state.code = code;
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['task', 'task-1'] });
  });
  await waitFor(() => expect(client.getQueryState(['task', 'task-1'])?.status).toBe('error'));
  expect(state.calls).toBeGreaterThanOrEqual(2);
}
async function failSession(code = 'INTERNAL_SERVER_ERROR') {
  state.sessionCode = code;
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['session'] });
  });
  await waitFor(() => expect(client.getQueryState(['session'])?.status).toBe('error'));
  expect(state.sessionCalls).toBeGreaterThanOrEqual(2);
}
describe('task detail actual ReactQuery cached read failure', () => {
  it('preserves saved comment line breaks in the display paragraph', async () => {
    const comment = task.comments[0];
    if (!comment) throw new Error('COMMENT_FIXTURE_MISSING');
    const original = comment.content;
    comment.content = '1行目\n2行目';
    try {
      show();
      const content = await screen.findByText('1行目 2行目');
      expect(content.textContent).toBe('1行目\n2行目');
      expect(content).toHaveClass('whitespace-pre-wrap');
    } finally {
      comment.content = original;
    }
  });
  it('normally renders protected task and comment', async () => {
    show();
    expect(await screen.findByText(privateTitle)).toBeInTheDocument();
    expect(screen.getByText('PRIVATE COMMENT')).toBeInTheDocument();
  });
  it.each([
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
  ])('%s hides previously cached protected content', async (code) => {
    show();
    await screen.findByText(privateTitle);
    await fail(code);
    expect(screen.queryByText(privateTitle)).not.toBeInTheDocument();
    expect(screen.queryByText('PRIVATE COMMENT')).not.toBeInTheDocument();
    expect(screen.queryByText('PRIVATE DESCRIPTION')).not.toBeInTheDocument();
    expect(screen.queryByText('PRIVATE PROJECT')).not.toBeInTheDocument();
    expect(screen.queryByText('Untrusted backend message')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'コメント投稿' })).not.toBeInTheDocument();
  });
  it('after A401 opening previously cached B does not display B', async () => {
    const view = render(
      <QueryClientProvider client={client}>
        <TaskDetailDialog open taskId="task-1" onClose={() => {}} />
      </QueryClientProvider>,
    );
    await screen.findByText(privateTitle);
    await fail('UNAUTHORIZED');
    await screen.findByRole('link', { name: 'ログイン画面へ' });
    client.setQueryData(['task', 'task-2'], { ...task, id: 'task-2', title: 'PRIVATE B' });
    expect(client.getQueryData(['task', 'task-2'])).toMatchObject({ title: 'PRIVATE B' });
    view.rerender(
      <QueryClientProvider client={client}>
        <TaskDetailDialog open taskId="task-2" onClose={() => {}} />
      </QueryClientProvider>,
    );
    expect(screen.queryByText('PRIVATE B')).not.toBeInTheDocument();
    expect(client.getQueryState(['task', 'task-2'])?.fetchStatus).toBe('idle');
  });
  it('temporary failure retains previous content but explains failed refresh', async () => {
    show();
    await screen.findByText(privateTitle);
    await fail('INTERNAL_SERVER_ERROR');
    expect(screen.getByText(privateTitle)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/更新|取得/);
  });
  it('initial session 500 keeps task content visible but hides member actions', async () => {
    state.sessionCode = 'INTERNAL_SERVER_ERROR';
    show();
    expect(await screen.findByText(privateTitle)).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('コメントの権限情報');
    expect(screen.queryByRole('button', { name: 'コメント投稿' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'コメントを編集' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'コメントを削除' })).not.toBeInTheDocument();
  });
  it('cached session 500 fails closed without hiding task content', async () => {
    show();
    await screen.findByRole('button', { name: 'コメント投稿' });
    await failSession();
    expect(screen.getByText(privateTitle)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('コメントの権限情報');
    expect(screen.queryByRole('button', { name: 'コメント投稿' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'コメントを編集' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'コメントを削除' })).not.toBeInTheDocument();
  });
  it('session-only retry stays disabled in flight and restores member actions', async () => {
    show();
    await screen.findByRole('button', { name: 'コメント投稿' });
    await failSession();
    let releaseSession: (() => void) | undefined;
    state.sessionCode = null;
    state.sessionWait = new Promise<void>((resolve) => {
      releaseSession = resolve;
    });
    fireEvent.click(screen.getByRole('button', { name: 'コメント権限を再試行' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'コメント権限を再試行' })).toBeDisabled(),
    );
    expect(client.getQueryState(['task', 'task-1'])?.fetchStatus).toBe('idle');
    releaseSession?.();
    state.sessionWait = null;
    expect(await screen.findByRole('button', { name: 'コメント投稿' })).toBeInTheDocument();
    expect(screen.queryByText(/コメントの権限情報/)).not.toBeInTheDocument();
  });
});

describe('task detail read boundaries', () => {
  it('closed dialog does not fetch task', async () => {
    render(
      <QueryClientProvider client={client}>
        <TaskDetailDialog open={false} taskId="task-1" onClose={() => {}} />
      </QueryClientProvider>,
    );
    await act(async () => {});
    expect(state.calls).toBe(0);
  });
  it('401 informs optional parent callback', async () => {
    const expire = vi.fn();
    render(
      <QueryClientProvider client={client}>
        <TaskDetailDialog open taskId="task-1" onClose={() => {}} onAuthExpired={expire} />
      </QueryClientProvider>,
    );
    await screen.findByText(privateTitle);
    await fail('UNAUTHORIZED');
    await waitFor(() => expect(expire).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: 'ログイン画面へ' })).toHaveAttribute('href', '/login');
  });
  it('403 closes an already open comment delete confirmation', async () => {
    show();
    await screen.findByText(privateTitle);
    fireEvent.click(screen.getByRole('button', { name: 'コメントを削除' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await fail('FORBIDDEN');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
  it('A403 does not block B', async () => {
    const view = render(
      <QueryClientProvider client={client}>
        <TaskDetailDialog open taskId="task-1" onClose={() => {}} />
      </QueryClientProvider>,
    );
    await screen.findByText(privateTitle);
    await fail('FORBIDDEN');
    state.code = null;
    client.setQueryData(['task', 'task-2'], { ...task, id: 'task-2', title: 'PRIVATE B' });
    view.rerender(
      <QueryClientProvider client={client}>
        <TaskDetailDialog open taskId="task-2" onClose={() => {}} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('PRIVATE B')).toBeInTheDocument();
  });
  it('successful null session hides content', async () => {
    show();
    await screen.findByText(privateTitle);
    await act(async () => {
      client.setQueryData(['session'], null);
    });
    await waitFor(() => expect(screen.queryByText(privateTitle)).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'ログイン画面へ' })).toBeInTheDocument();
  });
  it('500 refresh recovers through explicit retry', async () => {
    show();
    await screen.findByText(privateTitle);
    await fail('INTERNAL_SERVER_ERROR');
    state.code = null;
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByText(privateTitle)).toBeInTheDocument();
  });
  it('initial 500 has retry path without cached content', async () => {
    state.code = 'INTERNAL_SERVER_ERROR';
    show();
    await screen.findByRole('alert');
    await waitFor(() => expect(client.getQueryState(['task', 'task-1'])?.fetchStatus).toBe('idle'));
    expect(screen.queryByText(privateTitle)).not.toBeInTheDocument();
    state.code = null;
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByText(privateTitle)).toBeInTheDocument();
  });
});

function mounted(callback?: () => void) {
  const props = {
    open: true,
    taskId: 'task-1',
    onClose: () => {},
    ...(callback ? { onAuthExpired: callback } : {}),
  };
  const view = render(
    <QueryClientProvider client={client}>
      <TaskDetailDialog {...props} />
    </QueryClientProvider>,
  );
  return {
    ...view,
    change: (change: Partial<typeof props>) =>
      view.rerender(
        <QueryClientProvider client={client}>
          <TaskDetailDialog {...props} {...change} />
        </QueryClientProvider>,
      ),
  };
}
function denied(status: number) {
  return Object.assign(new Error('PRIVATE RAW ERROR'), { data: { httpStatus: status } });
}
describe('independent lifetime and observer boundaries', () => {
  it.each([
    401, 403, 404,
  ])('latest retry failure %s supersedes previous terminal 500', async (status) => {
    mounted();
    await screen.findByText(privateTitle);
    await fail('INTERNAL_SERVER_ERROR');
    expect(screen.getByText(privateTitle)).toBeInTheDocument();
    // 別の監視元が再試行条件を変えても、保護情報を表示しないためです。
    void client
      .fetchQuery({
        queryKey: ['task', 'task-1'],
        queryFn: async () => {
          throw denied(status);
        },
        retry: 3,
        retryDelay: 60000,
      })
      .catch(() => {});
    await waitFor(() =>
      expect(client.getQueryState(['task', 'task-1'])?.fetchFailureReason).toMatchObject({
        data: { httpStatus: status },
      }),
    );
    await act(async () => {
      await new Promise<void>((resolve) => notifyManager.schedule(resolve));
    });
    expect(screen.queryByText(privateTitle)).not.toBeInTheDocument();
  });
  it('closing controlled parent also hides already open comment deletion', async () => {
    const view = mounted();
    await screen.findByText(privateTitle);
    fireEvent.click(screen.getByRole('button', { name: 'コメントを削除' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    view.change({ open: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    view.change({ open: true });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
  it('403 on A permits B and does not call auth callback', async () => {
    const callback = vi.fn();
    const view = mounted(callback);
    await screen.findByText(privateTitle);
    await fail('FORBIDDEN');
    await screen.findByText('このタスクを表示する権限がありません。');
    state.code = null;
    view.change({ taskId: 'task-2' });
    expect(await screen.findByText(privateTitle)).toBeInTheDocument();
    expect(callback).not.toHaveBeenCalled();
  });
  it('null session permanently latches even when session is restored and task changes', async () => {
    const view = mounted();
    await screen.findByText(privateTitle);
    await act(async () => {
      client.setQueryData(['session'], null);
    });
    await screen.findByRole('link', { name: 'ログイン画面へ' });
    const count = state.calls;
    await act(async () => {
      client.setQueryData(['session'], { user: { id: 'user-1' } });
      client.setQueryData(['task', 'task-2'], { ...task, title: 'PRIVATE B' });
    });
    view.change({ taskId: 'task-2' });
    expect(screen.queryByText('PRIVATE B')).not.toBeInTheDocument();
    expect(state.calls).toBe(count);
  });
  it('absence of auth callback does not prevent a manual login link', async () => {
    mounted();
    await screen.findByText(privateTitle);
    await fail('UNAUTHORIZED');
    expect(await screen.findByRole('link', { name: 'ログイン画面へ' })).toHaveAttribute(
      'href',
      '/login',
    );
  });
  it('session retry 401 is not hidden by a previous terminal session 500', async () => {
    mounted();
    await screen.findByText(privateTitle);
    await act(async () => {
      await client
        .fetchQuery({
          queryKey: ['session'],
          queryFn: async () => {
            throw denied(500);
          },
          retry: false,
        })
        .catch(() => {});
    });
    void client
      .fetchQuery({
        queryKey: ['session'],
        queryFn: async () => {
          throw denied(401);
        },
        retry: 3,
        retryDelay: 60000,
      })
      .catch(() => {});
    await waitFor(() =>
      expect(client.getQueryState(['session'])?.fetchFailureReason).toMatchObject({
        data: { httpStatus: 401 },
      }),
    );
    await act(async () => {
      await new Promise<void>((resolve) => notifyManager.schedule(resolve));
    });
    expect(screen.queryByText(privateTitle)).not.toBeInTheDocument();
  });
  it('previous 403 stays protected while same key retries with 500', async () => {
    mounted();
    await screen.findByText(privateTitle);
    await fail('FORBIDDEN');
    await screen.findByText('このタスクを表示する権限がありません。');
    void client
      .fetchQuery({
        queryKey: ['task', 'task-1'],
        queryFn: async () => {
          throw denied(500);
        },
        retry: 3,
        retryDelay: 60000,
      })
      .catch(() => {});
    await waitFor(() =>
      expect(client.getQueryState(['task', 'task-1'])?.fetchFailureReason).toMatchObject({
        data: { httpStatus: 500 },
      }),
    );
    await act(async () => {
      await new Promise<void>((resolve) => notifyManager.schedule(resolve));
    });
    expect(screen.queryByText(privateTitle)).not.toBeInTheDocument();
  });
});
