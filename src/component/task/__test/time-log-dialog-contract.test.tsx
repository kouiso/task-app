// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  QueryClient,
  QueryClientProvider,
  type UseMutationOptions,
  useMutation,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeLogDialog } from '@/component/task/time-log-dialog';

type Variables = { id: string; minutesToAdd: number };

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
);
vi.mock('react-hot-toast', () => ({ default: toast }));

const mocks = vi.hoisted(() => ({
  write: vi.fn<(variables: Variables) => Promise<unknown>>(),
  invalidateDetail: vi.fn(),
  invalidateList: vi.fn(),
}));

vi.mock('@/trpc/react', () => ({
  api: {
    useUtils: () => ({
      task: {
        getById: { invalidate: mocks.invalidateDetail },
        getAll: { invalidate: mocks.invalidateList },
      },
    }),
    task: {
      addTime: {
        useMutation: (options: UseMutationOptions<unknown, Error, Variables>) =>
          useMutation({ ...options, mutationKey: ['add-time'], mutationFn: mocks.write }),
      },
    },
  },
}));

let client: QueryClient;

const provider = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

const deferred = () => {
  let resolve!: (value: unknown) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

const errorWithStatus = (status: number, privateMessage: string) =>
  Object.assign(new Error(privateMessage), { data: { httpStatus: status } });

const renderDialog = (props?: Partial<React.ComponentProps<typeof TimeLogDialog>>) => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  const base = { open: true, onClose, onSuccess, taskId: 'task-a', ...props };
  const view = render(<TimeLogDialog {...base} />, { wrapper: provider });
  return {
    ...view,
    onClose,
    onSuccess,
    rerenderDialog: (next: Partial<typeof base>) =>
      view.rerender(<TimeLogDialog {...base} {...next} />),
  };
};

const enterDuration = (hours: string, minutes: string) => {
  fireEvent.change(screen.getByLabelText('時間'), { target: { value: hours } });
  fireEvent.change(screen.getByLabelText('分'), { target: { value: minutes } });
};

const formFor = (button: HTMLElement) => {
  const form = button.closest('form');
  if (!form) throw new Error('時間記録フォームが見つかりません');
  return form;
};

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.clearAllMocks();
  mocks.write.mockResolvedValue({ id: 'task-a' });
  mocks.invalidateDetail.mockResolvedValue(undefined);
  mocks.invalidateList.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  client.clear();
});

describe('TimeLogDialog contract', () => {
  it('keeps both distributed copies and both error-classifier copies byte-identical', () => {
    expect(readFileSync(resolve('scripts/_app-components/task/time-log-dialog.tsx'), 'utf8')).toBe(
      readFileSync(resolve('src/component/task/time-log-dialog.tsx'), 'utf8'),
    );
    expect(readFileSync(resolve('scripts/_lib-base/task-write-error.ts'), 'utf8')).toBe(
      readFileSync(resolve('src/lib/task-write-error.ts'), 'utf8'),
    );
  });

  it.each([
    ['', '', '1分以上入力してください。'],
    ['0', '0', '1分以上入力してください。'],
    ['-1', '0', '時間は0以上の整数で入力してください。'],
    ['0.5', '0', '時間は0以上の整数で入力してください。'],
    ['0', '60', '分は0から59の整数で入力してください。'],
    ['9'.repeat(400), '0', '入力した作業時間が大きすぎます。桁数を確認してください。'],
  ])('shows a stable Japanese error for hours=%s minutes=%s', async (hours, minutes, message) => {
    renderDialog();
    enterDuration(hours, minutes);

    fireEvent.click(screen.getByRole('button', { name: '時間を追加' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it('uses the same form entry for Enter and the submit button', async () => {
    const first = renderDialog();
    enterDuration('1', '2');
    fireEvent.submit(formFor(screen.getByRole('button', { name: '時間を追加' })));

    await waitFor(() =>
      expect(mocks.write.mock.calls[0]?.[0]).toEqual({ id: 'task-a', minutesToAdd: 62 }),
    );
    first.unmount();
    vi.clearAllMocks();
    mocks.write.mockResolvedValue({ id: 'task-a' });
    mocks.invalidateDetail.mockResolvedValue(undefined);
    mocks.invalidateList.mockResolvedValue(undefined);

    renderDialog();
    enterDuration('0', '7');
    fireEvent.click(screen.getByRole('button', { name: '時間を追加' }));

    await waitFor(() =>
      expect(mocks.write.mock.calls[0]?.[0]).toEqual({ id: 'task-a', minutesToAdd: 7 }),
    );
  });

  it('uses a synchronous lock before pending state can render', async () => {
    const request = deferred();
    mocks.write.mockReturnValue(request.promise);
    renderDialog();
    enterDuration('0', '5');
    const button = screen.getByRole('button', { name: '時間を追加' });

    fireEvent.click(button);
    fireEvent.submit(formFor(button));

    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: '追加中...' })).toBeDisabled();
    await act(async () => request.resolve({ id: 'task-a' }));
  });

  it('keeps the pending state until the submitted target refresh finishes', async () => {
    const refresh = deferred();
    mocks.invalidateDetail.mockReturnValue(refresh.promise);
    renderDialog();
    enterDuration('0', '5');
    fireEvent.click(screen.getByRole('button', { name: '時間を追加' }));

    await waitFor(() => expect(mocks.invalidateDetail).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: '追加中...' })).toBeDisabled();
    expect(toast.success).not.toHaveBeenCalled();

    await act(async () => refresh.resolve(undefined));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('5分の作業時間を追加しました。'),
    );
  });

  it('keeps reopened draft B when delayed submission A succeeds', async () => {
    const request = deferred();
    mocks.write.mockReturnValue(request.promise);
    const view = renderDialog();
    enterDuration('0', '10');
    fireEvent.click(screen.getByRole('button', { name: '時間を追加' }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    view.rerenderDialog({ open: false });
    view.rerenderDialog({ open: true });
    enterDuration('0', '20');

    await act(async () => request.resolve({ id: 'task-a' }));

    expect(screen.getByLabelText('分')).toHaveValue('20');
    expect(view.onClose).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('先ほど送信した10分の作業時間を追加しました。'),
    );
    expect(mocks.invalidateDetail).toHaveBeenCalledWith({ id: 'task-a' }, undefined, {
      throwOnError: true,
    });
  });

  it('keeps a newer draft in the same open form when submission A succeeds', async () => {
    const request = deferred();
    mocks.write.mockReturnValue(request.promise);
    const view = renderDialog();
    enterDuration('0', '10');
    fireEvent.click(screen.getByRole('button', { name: '時間を追加' }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('分'), { target: { value: '20' } });

    await act(async () => request.resolve({ id: 'task-a' }));

    expect(screen.getByLabelText('分')).toHaveValue('20');
    expect(view.onClose).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('先ほど送信した10分の作業時間を追加しました。');
  });

  it('latches 401 without exposing its private message or retrying', async () => {
    mocks.write.mockRejectedValue(errorWithStatus(401, 'PRIVATE_401'));
    renderDialog();
    enterDuration('0', '5');
    fireEvent.click(screen.getByRole('button', { name: '時間を追加' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ログインの有効期限が切れました');
    expect(screen.queryByText('PRIVATE_401')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '時間を追加' })).toBeDisabled();
    fireEvent.submit(formFor(screen.getByRole('button', { name: '時間を追加' })));
    expect(mocks.write).toHaveBeenCalledTimes(1);
  });

  it('separates a completed write from a 401 during refresh and latches auth', async () => {
    mocks.invalidateDetail.mockRejectedValue(errorWithStatus(401, 'PRIVATE_REFRESH_401'));
    const view = renderDialog();
    enterDuration('0', '6');
    fireEvent.click(screen.getByRole('button', { name: '時間を追加' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '作業時間は追加されましたが、ログインの有効期限が切れました。',
    );
    expect(screen.queryByText('PRIVATE_REFRESH_401')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '時間を追加' })).toBeDisabled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(view.onClose).not.toHaveBeenCalled();
  });

  it('keeps 403 private and refreshes the submitted target', async () => {
    mocks.write.mockRejectedValue(errorWithStatus(403, 'PRIVATE_403'));
    renderDialog();
    enterDuration('0', '5');
    fireEvent.click(screen.getByRole('button', { name: '時間を追加' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '作業時間の追加を実行できません。権限と対象の最新の状態を確認してください。',
    );
    expect(screen.queryByText('PRIVATE_403')).not.toBeInTheDocument();
    expect(mocks.invalidateDetail).toHaveBeenCalledWith({ id: 'task-a' }, undefined, {
      throwOnError: true,
    });
    expect(mocks.invalidateList).toHaveBeenCalled();
  });

  it('treats an unknown response neutrally, refreshes, and never retries automatically', async () => {
    mocks.write.mockRejectedValue(new Error('PRIVATE_NETWORK'));
    renderDialog();
    enterDuration('0', '5');
    fireEvent.click(screen.getByRole('button', { name: '時間を追加' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '作業時間の追加の結果を確認できません。最新の表示で操作結果を確認してから、必要な場合だけ再実行してください。',
    );
    expect(screen.getByRole('alert')).toHaveClass('text-foreground');
    expect(screen.getByRole('alert')).not.toHaveClass('text-destructive');
    expect(screen.getByLabelText('時間')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByLabelText('分')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByText('PRIVATE_NETWORK')).not.toBeInTheDocument();
    expect(mocks.invalidateDetail).toHaveBeenCalled();
    expect(mocks.write).toHaveBeenCalledTimes(1);
  });

  it('reports a completed write separately from a failed refresh', async () => {
    mocks.invalidateDetail.mockRejectedValue(new Error('refresh failed'));
    const view = renderDialog();
    enterDuration('0', '8');
    fireEvent.click(screen.getByRole('button', { name: '時間を追加' }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('8分の作業時間を追加しました。'),
    );
    expect(toast.error).toHaveBeenCalledWith(
      '作業時間の追加は完了しましたが、最新の合計を取得できませんでした。画面を開き直して確認してください。',
    );
    expect(view.onSuccess).toHaveBeenCalledTimes(1);
    expect(view.onClose).toHaveBeenCalledTimes(1);
  });
});
