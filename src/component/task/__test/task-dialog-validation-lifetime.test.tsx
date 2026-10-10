// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TaskDialog, type TaskFormData } from '@/component/task/task-dialog';

const validation = vi.hoisted(() => {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release: () => release() };
});

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver:
    () =>
    async (
      values: TaskFormData,
    ): Promise<{ values: TaskFormData; errors: Record<string, never> }> => {
      await validation.promise;
      return { values, errors: {} };
    },
}));
vi.mock('@/trpc/react', () => ({
  api: { search: { getMembersByProject: { useQuery: () => ({ data: [] }) } } },
}));

const initial: TaskFormData = {
  id: 'a',
  title: 'Task A',
  status: 'TODO',
  priority: 'MEDIUM',
  projectId: 'p',
};
const projects = [{ id: 'p', name: 'Project' }];

it('keeps the native-submit lifetime after delayed validation but marks it stale after remount', async () => {
  const submittedChecks: Array<() => boolean> = [];
  const onSubmit = vi.fn((_data: TaskFormData, isCurrent?: () => boolean) => {
    if (isCurrent) submittedChecks.push(isCurrent);
  });
  const dialog = (key: string) => (
    <TaskDialog
      key={key}
      open
      onClose={() => {}}
      onSubmit={onSubmit}
      initialData={initial}
      projects={projects}
    />
  );
  const { rerender } = render(dialog('first'));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  expect(onSubmit).not.toHaveBeenCalled();

  rerender(<div role="status">読み込み中...</div>);
  rerender(dialog('second'));
  await act(async () => validation.release());

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(submittedChecks[0]?.()).toBe(false);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
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
