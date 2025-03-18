import type { ReactElement, ReactNode } from 'react';

import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/utils';

import Accordion from './index';

type AccordionProps = {
  trigger: ReactNode;
  children: ReactNode;
  onToggle?: (isActive: boolean) => void;
};

type TestAccordionProps = Partial<AccordionProps>;

const renderAccordion = (props: TestAccordionProps = {}): ReactElement => {
  const triggerText = 'トリガーテキスト';
  const contentText = 'コンテンツテキスト';
  const defaultProps: AccordionProps = {
    trigger: <div>{triggerText}</div>,
    onToggle: vi.fn(),
    children: <div>{contentText}</div>,
  };

  return <Accordion {...defaultProps} {...props} />;
};

describe('Accordionコンポーネント', () => {
  const triggerText = 'トリガーテキスト';
  const contentText = 'コンテンツテキスト';
  const onToggleMock = vi.fn();

  beforeEach(() => {
    onToggleMock.mockClear();
  });

  it('アコーディオンが正しくレンダリングされること', () => {
    render(renderAccordion({ onToggle: onToggleMock }));

    expect(screen.getByText(triggerText)).toBeInTheDocument();
    expect(screen.getByText(contentText)).toBeInTheDocument();
  });

  it('トリガーをクリックするとコンテンツの表示が切り替わり、onToggleが呼ばれること', () => {
    render(renderAccordion({ onToggle: onToggleMock }));

    const trigger = screen.getByText(triggerText);
    const content = screen.getByText(contentText);

    // 初期状態では非表示
    expect(content.parentElement).not.toHaveClass('open');

    // クリックで表示
    fireEvent.click(trigger);
    expect(content.parentElement).toHaveClass('open');
    expect(onToggleMock).toHaveBeenCalledWith(true);

    // 再度クリックで非表示
    fireEvent.click(trigger);
    expect(content.parentElement).not.toHaveClass('open');
    expect(onToggleMock).toHaveBeenCalledWith(false);
  });

  it('キーボード操作でアコーディオンを開閉できること', () => {
    render(renderAccordion({ onToggle: onToggleMock }));

    const trigger = screen.getByText(triggerText);

    // Enterキーで開く
    fireEvent.keyUp(trigger, { key: 'Enter' });
    expect(screen.getByText(contentText).parentElement).toHaveClass('open');
    expect(onToggleMock).toHaveBeenCalledWith(true);

    // 再度Enterキーで閉じる
    fireEvent.keyUp(trigger, { key: 'Enter' });
    expect(screen.getByText(contentText).parentElement).not.toHaveClass('open');
    expect(onToggleMock).toHaveBeenCalledWith(false);
  });
});
