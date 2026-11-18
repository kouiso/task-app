// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from './alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './dialog';

interface ControlledDialogHarnessProps {
  modal?: boolean;
  customFocusTarget?: boolean;
}

const ControlledDialogHarness = ({
  modal = true,
  customFocusTarget = false,
}: ControlledDialogHarnessProps) => {
  const [open, setOpen] = React.useState(false);
  const customRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        開く
      </button>
      <input aria-label="外部入力欄" />
      <button ref={customRef} type="button">
        指定先
      </button>
      <Dialog open={open} onOpenChange={setOpen} modal={modal}>
        <DialogContent
          onCloseAutoFocus={
            customFocusTarget
              ? (event) => {
                  event.preventDefault();
                  customRef.current?.focus();
                }
              : undefined
          }
        >
          <DialogTitle>テストダイアログ</DialogTitle>
          <DialogDescription>説明</DialogDescription>
          <input aria-label="内部入力欄" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ControlledAlertDialogHarness = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        削除する
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>削除確認</AlertDialogTitle>
          <AlertDialogDescription>本当に削除しますか</AlertDialogDescription>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface TriggerWithAutoFocusHarnessProps {
  onOpenAutoFocus?: React.ComponentProps<typeof DialogContent>['onOpenAutoFocus'];
}

const TriggerWithAutoFocusHarness = ({ onOpenAutoFocus }: TriggerWithAutoFocusHarnessProps) => (
  <Dialog>
    <DialogTrigger asChild>
      <button type="button">トリガーで開く</button>
    </DialogTrigger>
    <DialogContent onOpenAutoFocus={onOpenAutoFocus}>
      <DialogTitle>トリガー付き</DialogTitle>
      <DialogDescription>説明</DialogDescription>
      <input aria-label="自動フォーカス欄" />
    </DialogContent>
  </Dialog>
);

const InnerAutoFocusHarness = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        開く
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>自動フォーカス</DialogTitle>
          <DialogDescription>説明</DialogDescription>
          <input aria-label="自動フォーカス欄" autoFocus />
        </DialogContent>
      </Dialog>
    </div>
  );
};

describe('制御型 Dialog / AlertDialog のクローズ時フォーカス制御', () => {
  it('モーダル Dialog を Escape で閉じると開いたボタンへフォーカスが戻る', async () => {
    const user = userEvent.setup();
    render(<ControlledDialogHarness />);

    const opener = screen.getByRole('button', { name: '開く' });
    await user.click(opener);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(opener);
    });
  });

  it('modal={false} で外部入力欄をクリックして閉じた時は外部入力欄のフォーカスを維持する', async () => {
    const user = userEvent.setup();
    render(<ControlledDialogHarness modal={false} />);

    const opener = screen.getByRole('button', { name: '開く' });
    const outsideInput = screen.getByRole('textbox', { name: '外部入力欄' });
    await user.click(opener);
    await screen.findByRole('dialog');

    await user.click(outsideInput);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(outsideInput);
    });
  });

  it('利用側 onCloseAutoFocus が preventDefault した場合は指定のフォーカス先を優先する', async () => {
    const user = userEvent.setup();
    render(<ControlledDialogHarness customFocusTarget />);

    const opener = screen.getByRole('button', { name: '開く' });
    const customTarget = screen.getByRole('button', { name: '指定先' });
    await user.click(opener);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(customTarget);
    });
  });

  it('制御型 AlertDialog をキャンセルで閉じると開いたボタンへフォーカスが戻る', async () => {
    const user = userEvent.setup();
    render(<ControlledAlertDialogHarness />);

    const opener = screen.getByRole('button', { name: '削除する' });
    await user.click(opener);
    await screen.findByRole('alertdialog');

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(document.activeElement).toBe(opener);
    });
  });

  it('内側要素の autoFocus で onOpenAutoFocus が抑制されても開いたボタンへフォーカスが戻る', async () => {
    const user = userEvent.setup();
    render(<InnerAutoFocusHarness />);

    const opener = screen.getByRole('button', { name: '開く' });
    await user.click(opener);
    await screen.findByRole('dialog');
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: '自動フォーカス欄' }));

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(opener);
    });
  });

  it('開く直前の activeElement が body の時は既定の DialogTrigger 復帰を妨げない', async () => {
    const user = userEvent.setup();
    const seenAtOpen: (Element | null)[] = [];
    render(
      <TriggerWithAutoFocusHarness
        onOpenAutoFocus={() => seenAtOpen.push(document.activeElement)}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'トリガーで開く' });
    // user.click はクリック前にボタンへフォーカスを移すので、Safari のように
    // クリックでフォーカスが乗らない環境を再現できない。tabindex の無い
    // body.focus() もフォーカスを動かさない。fireEvent.click はフォーカスを
    // 一切動かさないので、保存対象が body になる状態を確実に作れる。
    fireEvent.click(trigger);
    await screen.findByRole('dialog');
    expect(seenAtOpen).toEqual([document.body]);

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
