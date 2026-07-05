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

type ProjectTask = NonNullable<ProjectDetail['tasks']>[number];

const buildTask = (id: string, status: ProjectTask['status']): ProjectTask => ({
  id,
  title: `項目-${id}`,
  description: null,
  status,
  priority: 'MEDIUM',
  dueDate: null,
  completedAt: null,
  estimatedHours: null,
  actualHours: 0,
  timeSpentMinutes: 0,
  position: 0,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  projectId: 'project-1',
  createdById: 'user-owner',
  assigneeId: null,
  assignee: null,
});

const renderView = (override?: Partial<React.ComponentProps<typeof ProjectDetailView>>) => {
  const onUpdateMemberRole = vi.fn();
  render(
    <ProjectDetailView
      projectDetail={buildProjectDetail()}
      onBack={vi.fn()}
      onAddMemberClick={vi.fn()}
      onRemoveMember={vi.fn()}
      onUpdateMemberRole={onUpdateMemberRole}
      onArchive={vi.fn()}
      canManageMembers={true}
      canArchive={true}
      {...override}
    />,
  );
  return { onUpdateMemberRole };
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

describe('ProjectDetailView の権限編集', () => {
  it('オーナー以外のメンバーには権限変更用のセレクトが表示される', () => {
    renderView();

    // OWNER以外（MEMBER）の行にのみ権限変更コンボボックスが出る
    const roleSelectors = screen.getAllByRole('combobox');
    expect(roleSelectors).toHaveLength(1);
    expect(roleSelectors[0]).toHaveTextContent('メンバー');
  });

  it('オーナーの権限はロックされ、変更用セレクトが表示されない', () => {
    renderView();

    // オーナー行は固定ラベル表示（コンボボックスではない）
    expect(screen.getByText('オーナー')).toBeInTheDocument();
    // コンボボックスはMEMBER分の1つのみ＝オーナーには出ていない
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('メンバー管理権限が無い閲覧者には権限変更セレクトを表示せず読み取り専用にする', () => {
    renderView({ canManageMembers: false });

    // 権限管理できないユーザーにはセレクト（コンボボックス）を一切出さない
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    // 役割は読み取り専用ラベルで表示される
    expect(screen.getByText('メンバー')).toBeInTheDocument();
  });
});

describe('ProjectDetailView のタスク件数表示', () => {
  it('総数はキャンセル済みを除外し、キャンセル済みは別表記する', () => {
    renderView({
      projectDetail: {
        ...buildProjectDetail(),
        tasks: [
          buildTask('1', 'TODO'),
          buildTask('2', 'IN_PROGRESS'),
          buildTask('3', 'DONE'),
          buildTask('4', 'CANCELLED'),
        ],
      },
    });

    // 総数はアクティブな3件（CANCELLEDを除外）
    expect(screen.getByText('タスク (3)')).toBeInTheDocument();
    // キャンセル済みは別表記で1件
    expect(screen.getByText('（キャンセル済 1）')).toBeInTheDocument();
  });

  it('キャンセル済みが無ければ別表記を出さない', () => {
    renderView({
      projectDetail: {
        ...buildProjectDetail(),
        tasks: [buildTask('1', 'TODO'), buildTask('2', 'DONE')],
      },
    });

    expect(screen.getByText('タスク (2)')).toBeInTheDocument();
    expect(screen.queryByText(/キャンセル済/)).not.toBeInTheDocument();
  });
});
