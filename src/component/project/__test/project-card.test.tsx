// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectCard } from '../project-card';

const baseProps = {
  id: 'project-1',
  name: '権限確認プロジェクト',
  color: '#1976D2',
  memberCount: 1,
  taskStats: { total: 1, done: 0 },
};

describe('ProjectCardの操作表示', () => {
  it('コールバックが無ければ編集と削除を表示しない', () => {
    render(<ProjectCard {...baseProps} />);

    expect(
      screen.queryByRole('button', { name: '権限確認プロジェクトを編集' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '権限確認プロジェクトを削除' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('権限確認プロジェクト')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '権限確認プロジェクト' })).not.toBeInTheDocument();
  });

  it('onClickがあればプロジェクト名をボタンとして1回だけ開く', () => {
    const onClick = vi.fn();
    render(<ProjectCard {...baseProps} onClick={onClick} />);

    const titleButton = screen.getByRole('button', { name: '権限確認プロジェクト' });
    expect(titleButton).toHaveClass('focus-visible:ring-2');
    expect(titleButton).toHaveClass('focus-visible:ring-ring');

    fireEvent.click(titleButton);

    expect(onClick).toHaveBeenCalledExactlyOnceWith('project-1');
  });

  it('カード本体のマウスクリックも1回だけ開く', () => {
    const onClick = vi.fn();
    const { container } = render(<ProjectCard {...baseProps} onClick={onClick} />);
    const card = container.firstElementChild;
    if (!card) throw new Error('ProjectCardが描画されていません');

    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledExactlyOnceWith('project-1');
  });

  it('渡された操作だけを表示する', () => {
    const onEdit = vi.fn();
    const { rerender } = render(<ProjectCard {...baseProps} onEdit={onEdit} />);

    fireEvent.click(screen.getByRole('button', { name: '権限確認プロジェクトを編集' }));
    expect(onEdit).toHaveBeenCalledWith('project-1');
    expect(
      screen.queryByRole('button', { name: '権限確認プロジェクトを削除' }),
    ).not.toBeInTheDocument();

    const onDelete = vi.fn();
    rerender(<ProjectCard {...baseProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: '権限確認プロジェクトを削除' }));
    expect(onDelete).toHaveBeenCalledWith('project-1');
    expect(
      screen.queryByRole('button', { name: '権限確認プロジェクトを編集' }),
    ).not.toBeInTheDocument();
  });

  it('操作ボタンのクリックをカード遷移へ伝播しない', () => {
    const onEdit = vi.fn();
    const onClick = vi.fn();
    render(<ProjectCard {...baseProps} onEdit={onEdit} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '権限確認プロジェクトを編集' }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });
});
