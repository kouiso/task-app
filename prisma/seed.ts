import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: '管理者',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'user1@example.com' },
    update: {},
    create: {
      email: 'user1@example.com',
      name: '田中太郎',
      password: hashedPassword,
      role: 'USER',
      isActive: true,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'user2@example.com' },
    update: {},
    create: {
      email: 'user2@example.com',
      name: '山田花子',
      password: hashedPassword,
      role: 'USER',
      isActive: true,
    },
  });

  const project1 = await prisma.project.upsert({
    where: { id: 'project1' },
    update: {},
    create: {
      id: 'project1',
      name: 'Webサイトリニューアル',
      description: '企業サイトの全面リニューアルプロジェクト',
      color: '#1976d2',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-06-30'),
      members: {
        create: [
          {
            userId: user1.id,
            role: 'OWNER',
          },
          {
            userId: user2.id,
            role: 'MEMBER',
          },
          {
            userId: user3.id,
            role: 'MEMBER',
          },
        ],
      },
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: 'project2' },
    update: {},
    create: {
      id: 'project2',
      name: 'モバイルアプリ開発',
      description: 'iOS/Android向けアプリ開発',
      color: '#4caf50',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-08-31'),
      members: {
        create: [
          {
            userId: user2.id,
            role: 'OWNER',
          },
          {
            userId: user3.id,
            role: 'ADMIN',
          },
        ],
      },
    },
  });

  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'デザインモックアップ作成',
        description: '新デザインのモックアップをFigmaで作成する',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date('2025-02-15'),
        estimatedHours: 40,
        actualHours: 12,
        timeSpentMinutes: 720,
        position: 1,
        projectId: project1.id,
        createdById: user1.id,
        assigneeId: user3.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'データベース設計',
        description: 'ER図の作成とテーブル定義',
        status: 'DONE',
        priority: 'HIGH',
        dueDate: new Date('2025-01-31'),
        completedAt: new Date('2025-01-28'),
        estimatedHours: 24,
        actualHours: 20,
        timeSpentMinutes: 1200,
        position: 2,
        projectId: project1.id,
        createdById: user1.id,
        assigneeId: user2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'API仕様書作成',
        description: 'RESTful APIの仕様書を作成',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date('2025-02-28'),
        estimatedHours: 16,
        position: 3,
        projectId: project1.id,
        createdById: user1.id,
        assigneeId: user2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'プロトタイプ開発',
        description: '基本機能のプロトタイプを実装',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: new Date('2025-03-15'),
        estimatedHours: 80,
        position: 1,
        projectId: project2.id,
        createdById: user2.id,
        assigneeId: user3.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'ユーザーテスト実施',
        description: 'ターゲットユーザーでのテスト',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date('2025-04-30'),
        estimatedHours: 24,
        position: 2,
        projectId: project2.id,
        createdById: user2.id,
      },
    }),
  ]);

  const _comment1 = await prisma.comment.create({
    data: {
      content: 'デザインの方向性について確認したいことがあります。',
      taskId: tasks[0].id,
      userId: user1.id,
    },
  });

  const _comment2 = await prisma.comment.create({
    data: {
      content: 'データベース設計完了しました。レビューをお願いします。',
      taskId: tasks[1].id,
      userId: user2.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ シードデータの投入に失敗しました:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
