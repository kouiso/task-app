import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const SEED_PROJECTS = {
  websiteRenewal: {
    id: 'clseedwebsiterenewal0000000',
    name: 'Webサイトリニューアル',
  },
  mobileApp: {
    id: 'clseedmobileapp000000000000',
    name: 'モバイルアプリ開発',
  },
} as const;

class Seed {
  prisma = new PrismaClient();

  async main() {
    try {
      await this.seed();
      await this.prisma.$disconnect();
    } catch (e) {
      console.error('❌ シードデータの投入に失敗しました:', e);
      await this.prisma.$disconnect();
      process.exit(1);
    }
  }

  async seed(): Promise<void> {
    const developerEmail = process.env['_DEVELOPER_EMAIL'] || 'admin@example.com';
    const developerName =
      process.env['_DEVELOPER_LASTNAME'] && process.env['_DEVELOPER_FIRSTNAME']
        ? `${process.env['_DEVELOPER_LASTNAME']} ${process.env['_DEVELOPER_FIRSTNAME']}`
        : '管理者';

    await this.createUsers(developerEmail, developerName);
    await this.cleanupSeedData();
    const projectIds = await this.createProjects(developerEmail);
    await this.createTasks(developerEmail, projectIds.project1Id, projectIds.project2Id);
    await this.createComments(developerEmail);
  }

  async cleanupSeedData(): Promise<void> {
    await this.prisma.project.deleteMany({
      where: {
        id: {
          in: Object.values(SEED_PROJECTS).map((project) => project.id),
        },
      },
    });
  }

  async createUsers(developerEmail: string, developerName: string) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    await this.prisma.user.upsert({
      where: { email: developerEmail },
      update: {},
      create: {
        email: developerEmail,
        name: developerName,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });

    await this.prisma.user.upsert({
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

    await this.prisma.user.upsert({
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
  }

  async createProjects(developerEmail: string) {
    const user1 = await this.prisma.user.findUniqueOrThrow({
      where: { email: developerEmail },
    });
    const user2 = await this.prisma.user.findUniqueOrThrow({
      where: { email: 'user1@example.com' },
    });
    const user3 = await this.prisma.user.findUniqueOrThrow({
      where: { email: 'user2@example.com' },
    });

    const project1 = await this.prisma.project.create({
      data: {
        id: SEED_PROJECTS.websiteRenewal.id,
        name: SEED_PROJECTS.websiteRenewal.name,
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

    const project2 = await this.prisma.project.create({
      data: {
        id: SEED_PROJECTS.mobileApp.id,
        name: SEED_PROJECTS.mobileApp.name,
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

    return { project1Id: project1.id, project2Id: project2.id };
  }

  async createTasks(developerEmail: string, project1Id: string, project2Id: string) {
    const user1 = await this.prisma.user.findUniqueOrThrow({
      where: { email: developerEmail },
    });
    const user2 = await this.prisma.user.findUniqueOrThrow({
      where: { email: 'user1@example.com' },
    });
    const user3 = await this.prisma.user.findUniqueOrThrow({
      where: { email: 'user2@example.com' },
    });

    // createdAtの順序を確定させるため順次実行（コメント紐付けに影響）
    await this.prisma.task.create({
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
        projectId: project1Id,
        createdById: user1.id,
        assigneeId: user1.id,
      },
    });
    await this.prisma.task.create({
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
        projectId: project1Id,
        createdById: user1.id,
        assigneeId: user2.id,
      },
    });
    await this.prisma.task.create({
      data: {
        title: 'API仕様書作成',
        description: 'RESTful APIの仕様書を作成',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date('2025-02-28'),
        estimatedHours: 16,
        position: 3,
        projectId: project1Id,
        createdById: user1.id,
        assigneeId: user2.id,
      },
    });
    await this.prisma.task.create({
      data: {
        title: 'プロトタイプ開発',
        description: '基本機能のプロトタイプを実装',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: new Date('2025-03-15'),
        estimatedHours: 80,
        position: 1,
        projectId: project2Id,
        createdById: user2.id,
        assigneeId: user3.id,
      },
    });
    await this.prisma.task.create({
      data: {
        title: 'ユーザーテスト実施',
        description: 'ターゲットユーザーでのテスト',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date('2025-04-30'),
        estimatedHours: 24,
        position: 2,
        projectId: project2Id,
        createdById: user2.id,
        assigneeId: user1.id,
      },
    });
  }

  async createComments(developerEmail: string) {
    const user1 = await this.prisma.user.findUniqueOrThrow({
      where: { email: developerEmail },
    });
    const user2 = await this.prisma.user.findUniqueOrThrow({
      where: { email: 'user1@example.com' },
    });

    const tasks = await this.prisma.task.findMany({
      orderBy: { createdAt: 'asc' },
      take: 2,
    });

    const task1 = tasks[0];
    const task2 = tasks[1];

    if (!task1 || !task2) {
      return;
    }

    await this.prisma.comment.create({
      data: {
        content: 'デザインの方向性について確認したいことがあります。',
        taskId: task1.id,
        userId: user1.id,
      },
    });

    await this.prisma.comment.create({
      data: {
        content: 'データベース設計完了しました。レビューをお願いします。',
        taskId: task2.id,
        userId: user2.id,
      },
    });
  }
}

new Seed().main();
