/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import type { inferRouterOutputs } from '@trpc/server';
import { describe, expect, it, vi } from 'vitest';
import type { AppRouter } from '@/server/api/root';
import { ProjectDetailView } from '../project-detail-view';

type ProjectDetail = inferRouterOutputs<AppRouter>['project']['getById'];

const buildProjectDetail = (): ProjectDetail => ({
  id: 'project-1',
  name: 'テストプロジェクト',
  description: null,
  color: '#1976d2',
  isArchived: false,
  startDate: null,
  endDate: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  members: [
    {
      id: 'member-owner',
      role: 'OWNER',
      joinedAt: new Date('2024-01-01T00:00:00.000Z'),
      userId: 'user-owner',
      projectId: 'project-1',
      user: {
        id: 'user-owner',
        name: 'オーナー太郎',
        email: 'owner@example.com',
        avatar: null,
        role: 'USER',
      },
    },
    {
      id: 'member-1',
      role: 'MEMBER',
      joinedAt: new Date('2024-01-02T00:00:00.000Z'),
      userId: 'user-1',
      projectId: 'project-1',
      user: {
        id: 'user-1',
        name: 'メンバー花子',
        email: 'member@example.com',
        avatar: null,
        role: 'USER',
      },
    },
  ],
  tasks: [],
});

const renderView = (override?: Partial<React.ComponentProps<typeof ProjectDetailView>>) => {
  render(
    <ProjectDetailView
      projectDetail={buildProjectDetail()}
      onBack={vi.fn()}
      onAddMemberClick={vi.fn()}
      onRemoveMember={vi.fn()}
      onArchive={vi.fn()}
      canManageMembers={true}
      canArchive={true}
      {...override}
    />,
  );
};

describe('ProjectDetailView の権限による表示制御', () => {
  it('canManageMembers=false ではメンバー追加・削除ボタンを表示しない', () => {
    renderView({ canManageMembers: false });

    expect(screen.queryByRole('button', { name: 'メンバー追加' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /削除/ })).not.toBeInTheDocument();
  });

  it('canManageMembers=true ではメンバー追加・削除ボタンを表示する', () => {
    renderView({ canManageMembers: true });

    expect(screen.getByRole('button', { name: 'メンバー追加' })).toBeInTheDocument();
    // オーナー以外（メンバー花子）の削除ボタンが表示される
    expect(
      screen.getByRole('button', { name: 'メンバー花子をプロジェクトから削除' }),
    ).toBeInTheDocument();
  });

  it('canArchive=false ではアーカイブボタンを表示しない', () => {
    renderView({ canArchive: false });

    expect(screen.queryByRole('button', { name: /アーカイブ/ })).not.toBeInTheDocument();
  });

  it('canArchive=true ではアーカイブボタンを表示する', () => {
    renderView({ canArchive: true });

    expect(screen.getByRole('button', { name: /アーカイブ/ })).toBeInTheDocument();
  });
});
