// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { expect, it, vi } from 'vitest';
import { TaskDialog, type TaskFormData } from '@/component/task/task-dialog';

vi.mock('@/trpc/react', () => ({
  api: { search: { getMembersByProject: { useQuery: () => ({ data: [] }) } } },
}));

const initial: TaskFormData = {
  id: 'a',
  title: 'Task A',
  status: 'TODO',
  priority: 'MEDIUM',
  projectId: 'p',
  expectedUpdatedAt: '2026-01-01T00:00:00.000Z',
};
const projects = [{ id: 'p', name: 'Project' }];

it('blocks repeated submit while the parent reports a pending write', () => {
  const onSubmit = vi.fn();
  render(
    <TaskDialog
      open
      onClose={() => {}}
      onSubmit={onSubmit}
      initialData={initial}
      projects={projects}
      isPending
    />,
  );
  const submit = screen.getByRole('button', { name: '更新中...' });
  const form = submit.closest('form');
  if (!form) throw new Error('Submit button is not inside a form');
  expect(submit).toBeDisabled();
  fireEvent.click(submit);
  fireEvent.submit(form);
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByPlaceholderText('タスクのタイトルを入力')).toBeEnabled();
});

it('marks a submission stale when the same dialog is edited after submit', async () => {
  let isCurrent: (() => boolean) | undefined;
  render(
    <TaskDialog
      open
      onClose={() => {}}
      onSubmit={(_data, check) => {
        isCurrent = check;
      }}
      initialData={initial}
      projects={projects}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(isCurrent).toBeTypeOf('function'));
  expect(isCurrent?.()).toBe(true);
  fireEvent.change(screen.getByPlaceholderText('タスクのタイトルを入力'), {
    target: { value: 'Newer unsent A edit' },
  });
  expect(isCurrent?.()).toBe(false);
});

it('marks a submission stale after closing and reopening the same task', async () => {
  let isCurrent: (() => boolean) | undefined;
  const { rerender } = render(
    <TaskDialog
      open
      onClose={() => {}}
      onSubmit={(_data, check) => {
        isCurrent = check;
      }}
      initialData={initial}
      projects={projects}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(isCurrent).toBeTypeOf('function'));
  expect(isCurrent?.()).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
  rerender(
    <TaskDialog
      open
      onClose={() => {}}
      onSubmit={() => {}}
      initialData={initial}
      projects={projects}
    />,
  );
  expect(isCurrent?.()).toBe(false);
});

it('invalidates an old closure when loading unmounts and remounts the open dialog', async () => {
  const checks: Array<() => boolean> = [];
  const dialog = (key: string) => (
    <StrictMode>
      <TaskDialog
        key={key}
        open
        onClose={() => {}}
        onSubmit={(_data, check) => {
          if (check) checks.push(check);
        }}
        initialData={initial}
        projects={projects}
      />
    </StrictMode>
  );
  const { rerender } = render(dialog('first'));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(checks).toHaveLength(1));
  expect(checks[0]?.()).toBe(true);

  rerender(<div role="status">読み込み中...</div>);
  expect(checks[0]?.()).toBe(false);
  rerender(dialog('second'));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(checks).toHaveLength(2));
  expect(checks[0]?.()).toBe(false);
  expect(checks[1]?.()).toBe(true);
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
