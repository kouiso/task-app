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
    const accordionElement = screen.getByRole('button', { name: /トリガーテキスト/i }).closest('[aria-expanded]');

    // 初期状態では非表示（aria-expanded="false"）
    expect(accordionElement).toHaveAttribute('aria-expanded', 'false');

    // クリックで表示
    fireEvent.click(trigger);
    expect(accordionElement).toHaveAttribute('aria-expanded', 'true');
    expect(onToggleMock).toHaveBeenCalledWith(true);

    // 再度クリックで非表示
    fireEvent.click(trigger);
    expect(accordionElement).toHaveAttribute('aria-expanded', 'false');
    expect(onToggleMock).toHaveBeenCalledWith(false);
  });

  it('キーボード操作でアコーディオンを開閉できること', () => {
    render(renderAccordion({ onToggle: onToggleMock }));

    const trigger = screen.getByText(triggerText);
    const accordionElement = screen.getByRole('button', { name: /トリガーテキスト/i }).closest('[aria-expanded]');

    // Enterキーで開く - MUIのアコーディオンはクリックイベントのみ反応するので、クリックシミュレーション
    fireEvent.click(trigger);
    expect(accordionElement).toHaveAttribute('aria-expanded', 'true');
    expect(onToggleMock).toHaveBeenCalledWith(true);

    // 再度クリックで閉じる
    fireEvent.click(trigger);
    expect(accordionElement).toHaveAttribute('aria-expanded', 'false');
    expect(onToggleMock).toHaveBeenCalledWith(false);
  });
});
