// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import SearchPage from './page';

type Submission = { taskId: string };
type MutationOptions = {
  retry?: boolean;
  onMutate?: () => Submission | null;
  onSettled?: (
    data: unknown,
    error: unknown,
    variables: { id: string },
    submitted: Submission | null | undefined,
  ) => void;
};
const mocks = vi.hoisted(() => ({
  params: new URLSearchParams('keyword=api'),
  push: vi.fn(),
  replace: vi.fn(),
  mutate: vi.fn(),
  invalidate: vi.fn(),
  confirm: null as (() => void) | null,
  pending: false,
  options: undefined as MutationOptions | undefined,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => mocks.params,
}));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/component/task/task-card', () => ({
  TaskCard: ({
    id,
    onDelete,
  }: {
    id: string;
    onDelete: (id: string) => void;
    canDelete: boolean;
  }) => (
    <button type="button" onClick={() => onDelete(id)}>
      Delete {id}
    </button>
  ),
}));
vi.mock('@/component/ui/delete-confirm-dialog', () => ({
  DeleteConfirmDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) => {
    mocks.confirm = open ? onConfirm : null;
    return open ? <p>Confirmation open</p> : null;
  },
}));
vi.mock('@/trpc/react', () => ({
  api: {
    useUtils: () => ({ search: { search: { invalidate: mocks.invalidate } } }),
    auth: {
      getSession: { useQuery: () => ({ data: { user: { id: 'user-a' } } }) },
    },
    search: {
      getUserProjects: { useQuery: () => ({ data: [] }) },
      getProjectMembers: { useQuery: () => ({ data: [] }) },
      search: {
        useQuery: () => ({
          data: {
            totalCount: 2,
            tasks: [
              {
                id: 'task-a',
                title: 'A',
                projectId: 'project-a',
                status: 'TODO',
                priority: 'LOW',
              },
              {
                id: 'task-b',
                title: 'B',
                projectId: 'project-a',
                status: 'TODO',
                priority: 'LOW',
              },
            ],
            projects: [],
          },
          isLoading: false,
          isError: false,
          isFetching: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
    project: {
      getAll: {
        useQuery: () => ({
          data: [{ id: 'project-a', members: [{ userId: 'user-a', role: 'OWNER' }] }],
        }),
      },
    },
    task: {
      delete: {
        useMutation: (options: MutationOptions) => {
          mocks.options = options;
          return { mutate: mocks.mutate, isPending: mocks.pending };
        },
      },
    },
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.confirm = null;
  mocks.pending = false;
  mocks.options = undefined;
});
it('one synchronous confirmation turn sends at most one delete', () => {
  render(<SearchPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete task-a' }));
  const confirm = mocks.confirm;
  expect(confirm).not.toBeNull();
  act(() => {
    confirm?.();
    confirm?.();
  });
  expect(mocks.mutate).toHaveBeenCalledTimes(1);
  expect(mocks.mutate).toHaveBeenCalledWith({ id: 'task-a' });
});

it('a pending deletion blocks replacing its confirmation target', () => {
  render(<SearchPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete task-a' }));
  const confirm = mocks.confirm;
  act(() => confirm?.());
  const submitted = mocks.options?.onMutate?.();
  expect(submitted).toEqual({ taskId: 'task-a' });
  fireEvent.click(screen.getByRole('button', { name: 'Delete task-b' }));
  expect(screen.getByText('Confirmation open')).toBeInTheDocument();
  expect(mocks.mutate).toHaveBeenCalledTimes(1);
  act(() =>
    mocks.options?.onSettled?.(undefined, new Error('Delete failed'), { id: 'task-a' }, submitted),
  );
  act(() => mocks.confirm?.());
  expect(mocks.mutate).toHaveBeenCalledTimes(2);
  expect(mocks.mutate).toHaveBeenNthCalledWith(2, { id: 'task-a' });
});
it('only the matching settled request releases the same-render guard', () => {
  render(<SearchPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete task-a' }));
  const confirm = mocks.confirm;
  act(() => confirm?.());
  const submitted = mocks.options?.onMutate?.();
  expect(submitted).toEqual({ taskId: 'task-a' });
  act(() =>
    mocks.options?.onSettled?.(
      undefined,
      new Error('Unrelated failure'),
      { id: 'task-a' },
      { taskId: 'task-a' },
    ),
  );
  act(() => mocks.confirm?.());
  expect(mocks.mutate).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Confirmation open')).toBeInTheDocument();
  act(() =>
    mocks.options?.onSettled?.(undefined, new Error('Delete failed'), { id: 'task-a' }, submitted),
  );
  act(() => mocks.confirm?.());
  expect(mocks.mutate).toHaveBeenCalledTimes(2);
  expect(mocks.mutate).toHaveBeenNthCalledWith(2, { id: 'task-a' });
});
it('reported transport pending prevents opening another confirmation', () => {
  mocks.pending = true;
  render(<SearchPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete task-a' }));
  expect(screen.queryByText('Confirmation open')).not.toBeInTheDocument();
  expect(mocks.mutate).not.toHaveBeenCalled();
});
