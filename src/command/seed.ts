import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
    console.log('🌱 シードデータの投入を開始します');

    const developerEmail = process.env._DEVELOPER_EMAIL || 'admin@example.com';
    const developerName = (process.env._DEVELOPER_LASTNAME && process.env._DEVELOPER_FIRSTNAME)
      ? `${process.env._DEVELOPER_LASTNAME} ${process.env._DEVELOPER_FIRSTNAME}`
      : '管理者';

    await this.createUsers(developerEmail, developerName);
    await this.createProjects(developerEmail);
    await this.createTasks(developerEmail);
    await this.createComments(developerEmail);

    console.log('✅ シードデータの投入が完了しました');
  }

  async createUsers(developerEmail: string, developerName: string) {
    console.log('👤 ユーザーを作成中...');
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

    console.log('✓ ユーザー作成完了');
  }

  async createProjects(developerEmail: string) {
    console.log('📁 プロジェクトを作成中...');

    const user1 = await this.prisma.user.findUnique({
      where: { email: developerEmail },
    });
    const user2 = await this.prisma.user.findUnique({
      where: { email: 'user1@example.com' },
    });
    const user3 = await this.prisma.user.findUnique({
      where: { email: 'user2@example.com' },
    });

    await this.prisma.project.upsert({
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

    await this.prisma.project.upsert({
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

    console.log('✓ プロジェクト作成完了');
  }

  async createTasks(developerEmail: string) {
    console.log('📝 タスクを作成中...');

    const user1 = await this.prisma.user.findUnique({
      where: { email: developerEmail },
    });
    const user2 = await this.prisma.user.findUnique({
      where: { email: 'user1@example.com' },
    });
    const user3 = await this.prisma.user.findUnique({
      where: { email: 'user2@example.com' },
    });

    await Promise.all([
      this.prisma.task.create({
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
          projectId: 'project1',
          createdById: user1.id,
          assigneeId: user3.id,
        },
      }),
      this.prisma.task.create({
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
          projectId: 'project1',
          createdById: user1.id,
          assigneeId: user2.id,
        },
      }),
      this.prisma.task.create({
        data: {
          title: 'API仕様書作成',
          description: 'RESTful APIの仕様書を作成',
          status: 'TODO',
          priority: 'MEDIUM',
          dueDate: new Date('2025-02-28'),
          estimatedHours: 16,
          position: 3,
          projectId: 'project1',
          createdById: user1.id,
          assigneeId: user2.id,
        },
      }),
      this.prisma.task.create({
        data: {
          title: 'プロトタイプ開発',
          description: '基本機能のプロトタイプを実装',
          status: 'TODO',
          priority: 'HIGH',
          dueDate: new Date('2025-03-15'),
          estimatedHours: 80,
          position: 1,
          projectId: 'project2',
          createdById: user2.id,
          assigneeId: user3.id,
        },
      }),
      this.prisma.task.create({
        data: {
          title: 'ユーザーテスト実施',
          description: 'ターゲットユーザーでのテスト',
          status: 'TODO',
          priority: 'MEDIUM',
          dueDate: new Date('2025-04-30'),
          estimatedHours: 24,
          position: 2,
          projectId: 'project2',
          createdById: user2.id,
        },
      }),
    ]);

    console.log('✓ タスク作成完了');
  }

  async createComments(developerEmail: string) {
    console.log('💬 コメントを作成中...');

    const user1 = await this.prisma.user.findUnique({
      where: { email: developerEmail },
    });
    const user2 = await this.prisma.user.findUnique({
      where: { email: 'user1@example.com' },
    });

    const tasks = await this.prisma.task.findMany({
      orderBy: { createdAt: 'asc' },
      take: 2,
    });

    await this.prisma.comment.create({
      data: {
        content: 'デザインの方向性について確認したいことがあります。',
        taskId: tasks[0].id,
        userId: user1.id,
      },
    });

    await this.prisma.comment.create({
      data: {
        content: 'データベース設計完了しました。レビューをお願いします。',
        taskId: tasks[1].id,
        userId: user2.id,
      },
    });

    console.log('✓ コメント作成完了');
  }
}

new Seed().main();
