import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TASK_PRIORITY } from '@/lib/constant/priority';
import { TASK_STATUS } from '@/lib/constant/status';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestProject,
  createTestTask,
  createTestUser,
} from '../../../../test/helpers';

const TASK_STATUSES = Object.values(TASK_STATUS);
const TASK_PRIORITIES = Object.values(TASK_PRIORITY);

describe('property-based and chaos coverage', () => {
  it('fast-check: task positions remain contiguous in creation order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 40 }), { minLength: 1, maxLength: 6 }),
        async (titles) => {
          const user = await createTestUser({
            email: `position-${Date.now()}-${Math.random()}@example.com`,
          });
          const project = await createTestProject(user.id);
          const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

          const created = [];
          for (const [index, title] of titles.entries()) {
            const task = await caller.task.create({
              title: title.trim() || `Task ${index}`,
              projectId: project.id,
            });
            created.push(task);
          }

          expect(created.map((task) => task.position)).toEqual(titles.map((_, index) => index));

          const listed = await caller.task.getAll({ projectId: project.id, limit: titles.length });
          expect(listed.map((task) => task.position)).toEqual(titles.map((_, index) => index));
        },
      ),
      { numRuns: 8 },
    );
  });

  it('fast-check: status transitions keep completedAt consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom(...TASK_STATUSES), { minLength: 1, maxLength: 10 }),
        async (statuses) => {
          const user = await createTestUser({
            email: `status-${Date.now()}-${Math.random()}@example.com`,
          });
          const project = await createTestProject(user.id);
          const task = await createTestTask(project.id, user.id);
          const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

          for (const status of statuses) {
            const updated = await caller.task.update({ id: task.id, status });
            expect(updated.status).toBe(status);
            if (status === TASK_STATUS.DONE) {
              expect(updated.completedAt).not.toBeNull();
            } else {
              expect(updated.completedAt).toBeNull();
            }
          }
        },
      ),
      { numRuns: 8 },
    );
  });

  it('fast-check: overview report aggregation matches generated status and priority totals', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            status: fc.constantFrom(...TASK_STATUSES),
            priority: fc.constantFrom(...TASK_PRIORITIES),
            timeSpentMinutes: fc.integer({ min: 0, max: 480 }),
          }),
          { minLength: 1, maxLength: 16 },
        ),
        async (tasks) => {
          const user = await createTestUser({
            email: `report-${Date.now()}-${Math.random()}@example.com`,
          });
          const project = await createTestProject(user.id);

          await prisma.task.createMany({
            data: tasks.map((task, index) => ({
              title: `Generated Task ${index}`,
              status: task.status,
              priority: task.priority,
              position: index,
              timeSpentMinutes: task.timeSpentMinutes,
              projectId: project.id,
              createdById: user.id,
              assigneeId: user.id,
            })),
          });

          const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
          const overview = await caller.report.getOverview();

          // ダッシュボード集計は CANCELLED を除外する (アクティブな作業のみが対象)
          const activeTasks = tasks.filter((task) => task.status !== TASK_STATUS.CANCELLED);

          expect(overview.totalProjects).toBe(1);
          expect(overview.totalTasks).toBe(activeTasks.length);
          expect(overview.completedTasks).toBe(
            tasks.filter((task) => task.status === TASK_STATUS.DONE).length,
          );
          expect(overview.inProgressTasks).toBe(
            tasks.filter((task) => task.status === TASK_STATUS.IN_PROGRESS).length,
          );
          expect(overview.totalTimeSpent).toBe(
            activeTasks.reduce((total, task) => total + task.timeSpentMinutes, 0),
          );
        },
      ),
      { numRuns: 6 },
    );
  });

  it('rejects stale concurrent task edits with optimistic lock metadata', async () => {
    const owner = await createTestUser({ email: 'concurrent-owner@example.com' });
    const editor = await createTestUser({ email: 'concurrent-editor@example.com' });
    const project = await createTestProject(owner.id);
    await prisma.projectMember.create({
      data: {
        userId: editor.id,
        projectId: project.id,
        role: 'MEMBER',
      },
    });
    const task = await createTestTask(project.id, owner.id, { title: 'Original' });
    const ownerCaller = await createAuthenticatedCaller(owner.id, owner.email, owner.role);
    const editorCaller = await createAuthenticatedCaller(editor.id, editor.email, editor.role);

    const firstRead = await ownerCaller.task.getById({ id: task.id });
    const secondRead = await editorCaller.task.getById({ id: task.id });

    await ownerCaller.task.update({
      id: task.id,
      expectedUpdatedAt: firstRead.updatedAt.toISOString(),
      title: 'Owner edit wins',
    });

    await expect(
      editorCaller.task.update({
        id: task.id,
        expectedUpdatedAt: secondRead.updatedAt.toISOString(),
        title: 'Stale editor overwrite',
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
    });

    const current = await ownerCaller.task.getById({ id: task.id });
    expect(current.title).toBe('Owner edit wins');
  });

  it('handles 100 projects and 1000 tasks within the paginated list and overview limits', async () => {
    const user = await createTestUser({ email: 'large-dataset@example.com' });
    const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
    const runId = Date.now().toString(36);
    const projects = Array.from({ length: 100 }, (_, index) => ({
      id: `chaos-project-${runId}-${index}`,
      name: `Chaos Project ${index}`,
      color: '#1976d2',
    }));
    const fallbackProject = projects.at(0);
    if (!fallbackProject) {
      throw new Error('Expected at least one project for chaos task fixtures');
    }

    await prisma.project.createMany({ data: projects });
    await prisma.projectMember.createMany({
      data: projects.map((project) => ({
        userId: user.id,
        projectId: project.id,
        role: 'OWNER',
      })),
    });
    await prisma.task.createMany({
      data: Array.from({ length: 1000 }, (_, index) => ({
        title: `Chaos Task ${index}`,
        status: index % 4 === 0 ? TASK_STATUS.DONE : TASK_STATUS.TODO,
        priority: TASK_PRIORITY.MEDIUM,
        position: index % 10,
        projectId: projects[index % projects.length]?.id ?? fallbackProject.id,
        createdById: user.id,
        assigneeId: user.id,
      })),
    });

    const tasks = await caller.task.getAll({ limit: 100 });
    const overview = await caller.report.getOverview();

    expect(tasks).toHaveLength(100);
    expect(overview.totalProjects).toBe(100);
    expect(overview.totalTasks).toBe(1000);
    expect(overview.completedTasks).toBe(250);
  });
});
