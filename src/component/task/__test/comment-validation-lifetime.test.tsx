// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  QueryClient,
  QueryClientProvider,
  type UseMutationOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TaskDetailDialog } from '@/component/task/task-detail-dialog';

type Vars = Record<string, unknown>;

const validation = vi.hoisted(() => {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release: () => release() };
});
const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
);
const mocks = vi.hoisted(() => ({
  create: vi.fn<(variables: Vars) => Promise<unknown>>(),
  invalidated: vi.fn(),
}));

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver:
    () =>
    async (values: Vars): Promise<{ values: Vars; errors: Record<string, never> }> => {
      await validation.promise;
      return { values, errors: {} };
    },
}));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/trpc/react', () => {
  const unusedMutation = {
    useMutation: (options: UseMutationOptions<unknown, Error, Vars>) =>
      useMutation({ ...options, mutationFn: async () => ({}) }),
  };
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
          useQuery: (_input: unknown, options: object) =>
            useQuery({
              queryKey: ['task', 'a'],
              queryFn: async () => task,
              initialData: task,
              staleTime: Infinity,
              ...options,
            }),
        },
      },
      comment: {
        create: {
          useMutation: (options: UseMutationOptions<unknown, Error, Vars>) =>
            useMutation({ ...options, mutationFn: mocks.create }),
        },
        update: unusedMutation,
        delete: unusedMutation,
      },
    },
  };
});

const task = {
  id: 'a',
  title: 'Task A',
  description: 'Description A',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  assignee: null,
  project: { name: 'Project A', members: [{ userId: 'user-1', role: 'MEMBER' }] },
  comments: [],
};

it('captures the create revision before async validation and preserves post-submit edits', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  mocks.create.mockResolvedValue({});
  mocks.invalidated.mockResolvedValue(undefined);
  render(
    <QueryClientProvider client={client}>
      <TaskDetailDialog open taskId="a" onClose={() => {}} />
    </QueryClientProvider>,
  );
  await screen.findByText('Task A');
  const draft = screen.getByRole('textbox', { name: 'コメント本文' });
  fireEvent.change(draft, { target: { value: 'submitted snapshot' } });
  const form = draft.closest('form');
  if (!form) throw new Error('Comment input is not inside a form');
  fireEvent.submit(form);
  expect(mocks.create).not.toHaveBeenCalled();

  fireEvent.change(draft, { target: { value: 'edited while validation waits' } });
  await act(async () => validation.release());
  await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
  expect(mocks.create.mock.calls[0]?.[0]).toEqual({
    content: 'submitted snapshot',
    taskId: 'a',
  });
  await waitFor(() => expect(draft).toHaveValue('edited while validation waits'));
  expect(toast.success).toHaveBeenCalledWith('コメントを投稿しました。');
  expect(toast).toHaveBeenCalledWith(
    '送信後の変更は保存されていません。このまま投稿すると、同じ内容が重複する可能性があります。',
  );
  client.clear();
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
