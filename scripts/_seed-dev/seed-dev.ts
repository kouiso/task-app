/**
 * デバッグ用フルデータ seed
 *
 * 全ステータス・全優先度・全プロジェクトロールを網羅したデータを投入する。
 * 教材用 seed とは異なり、アーカイブ済みプロジェクト・キャンセル済みタスク・
 * タイマー稼働中タスクなども含む。
 *
 * 実行: npm run db:seed:dev
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// bcrypt.hash はtop-level awaitが使えない環境向けにmain()内で生成する
let HASHED_PASSWORD = '';

// ─── ユーザー定義 ───────────────────────────────────────────────────────────

const USERS = [
  {
    email: 'admin@example.com',
    name: '管理者 太郎',
    role: 'ADMIN' as const,
  },
  {
    email: 'owner@example.com',
    name: '田中 一郎',
    role: 'USER' as const,
  },
  {
    email: 'member1@example.com',
    name: '山田 花子',
    role: 'USER' as const,
  },
  {
    email: 'member2@example.com',
    name: '鈴木 次郎',
    role: 'USER' as const,
  },
  {
    email: 'viewer@example.com',
    name: '佐藤 三郎',
    role: 'USER' as const,
  },
] as const;

// ─── メイン処理 ─────────────────────────────────────────────────────────────

async function main() {
  console.warn('🌱 デバッグ用フルデータを投入しています...');

  HASHED_PASSWORD = await bcrypt.hash('password123', 10);

  const users = await seedUsers();
  const projects = await seedProjects(users);
  await seedTasks(users, projects);
  await seedComments(users, projects);

  console.warn('✅ seed 完了');
}

// ─── ユーザー ────────────────────────────────────────────────────────────────

async function seedUsers() {
  const created: Record<string, { id: string }> = {};

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        password: HASHED_PASSWORD,
        role: u.role,
        isActive: true,
      },
    });
    created[u.email] = { id: user.id };
  }

  console.warn(`  👤 ユーザー ${Object.keys(created).length} 件`);
  return created;
}

// ─── プロジェクト ─────────────────────────────────────────────────────────────

async function seedProjects(users: Record<string, { id: string }>) {
  const admin = users['admin@example.com']!;
  const owner = users['owner@example.com']!;
  const member1 = users['member1@example.com']!;
  const member2 = users['member2@example.com']!;
  const viewer = users['viewer@example.com']!;

  // プロジェクト1: 全ロール網羅・進行中
  const p1 = await prisma.project.create({
    data: {
      name: 'ECサイトリニューアル',
      description: '既存 EC サイトを Next.js で全面リニューアルするプロジェクト',
      color: '#1976d2',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-09-30'),
      members: {
        create: [
          { userId: owner.id, role: 'OWNER' },
          { userId: admin.id, role: 'ADMIN' },
          { userId: member1.id, role: 'MEMBER' },
          { userId: member2.id, role: 'MEMBER' },
          { userId: viewer.id, role: 'VIEWER' },
        ],
      },
    },
  });

  // プロジェクト2: 小規模・メンバー2名
  const p2 = await prisma.project.create({
    data: {
      name: 'モバイルアプリ MVP',
      description: 'iOS/Android 向け最小構成アプリの開発',
      color: '#4caf50',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-07-31'),
      members: {
        create: [
          { userId: member1.id, role: 'OWNER' },
          { userId: member2.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // プロジェクト3: アーカイブ済み
  const p3 = await prisma.project.create({
    data: {
      name: '旧システム移行（完了・アーカイブ済み）',
      description: 'レガシーシステムから新基盤への移行。完了済み。',
      color: '#9e9e9e',
      isArchived: true,
      startDate: new Date('2024-04-01'),
      endDate: new Date('2024-12-31'),
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: owner.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.warn('  📁 プロジェクト 3 件');
  return { p1, p2, p3 };
}

// ─── タスク ──────────────────────────────────────────────────────────────────

async function seedTasks(
  users: Record<string, { id: string }>,
  projects: { p1: { id: string }; p2: { id: string }; p3: { id: string } },
) {
  const admin = users['admin@example.com']!;
  const owner = users['owner@example.com']!;
  const member1 = users['member1@example.com']!;
  const member2 = users['member2@example.com']!;

  const now = new Date();

  // プロジェクト1: 全ステータス × 全優先度を網羅
  const p1Tasks = [
    {
      title: '要件定義書の作成',
      description: 'ステークホルダーへのヒアリングを元に要件定義書を作成する',
      status: 'DONE' as const,
      priority: 'URGENT' as const,
      dueDate: new Date('2025-01-31'),
      completedAt: new Date('2025-01-28'),
      estimatedHours: 24,
      actualHours: 22,
      timeSpentMinutes: 1320,
      position: 1,
      projectId: projects.p1.id,
      createdById: owner.id,
      assigneeId: owner.id,
    },
    {
      title: 'デザインシステム構築',
      description: 'Figma でデザイントークンとコンポーネントライブラリを整備する',
      status: 'DONE' as const,
      priority: 'HIGH' as const,
      dueDate: new Date('2025-02-28'),
      completedAt: new Date('2025-02-25'),
      estimatedHours: 40,
      actualHours: 38,
      timeSpentMinutes: 2280,
      position: 2,
      projectId: projects.p1.id,
      createdById: owner.id,
      assigneeId: member1.id,
    },
    {
      title: '商品一覧ページ実装',
      description: '検索・フィルタ・ページネーション付き商品一覧を実装する',
      status: 'IN_PROGRESS' as const,
      priority: 'HIGH' as const,
      dueDate: new Date('2025-04-30'),
      estimatedHours: 32,
      actualHours: 18,
      timeSpentMinutes: 1080,
      position: 3,
      projectId: projects.p1.id,
      createdById: owner.id,
      assigneeId: member1.id,
    },
    {
      title: '決済フロー実装',
      description: 'Stripe を使った決済フローをエンドツーエンドで実装する',
      status: 'IN_PROGRESS' as const,
      priority: 'URGENT' as const,
      dueDate: new Date('2025-05-15'),
      estimatedHours: 48,
      actualHours: 8,
      timeSpentMinutes: 480,
      // タイマー稼働中
      isTimerActive: true,
      timerStartedAt: new Date(now.getTime() - 45 * 60 * 1000),
      position: 4,
      projectId: projects.p1.id,
      createdById: admin.id,
      assigneeId: member2.id,
    },
    {
      title: 'カート機能実装',
      description: 'セッションベースのショッピングカート機能を実装する',
      status: 'IN_REVIEW' as const,
      priority: 'HIGH' as const,
      dueDate: new Date('2025-04-15'),
      estimatedHours: 24,
      actualHours: 24,
      timeSpentMinutes: 1440,
      position: 5,
      projectId: projects.p1.id,
      createdById: owner.id,
      assigneeId: member2.id,
    },
    {
      title: '管理画面の権限設計',
      description: 'ロールベースアクセス制御の設計と実装',
      status: 'IN_REVIEW' as const,
      priority: 'MEDIUM' as const,
      dueDate: new Date('2025-05-31'),
      estimatedHours: 20,
      actualHours: 20,
      timeSpentMinutes: 1200,
      position: 6,
      projectId: projects.p1.id,
      createdById: admin.id,
      assigneeId: admin.id,
    },
    {
      title: '在庫管理 API 実装',
      description: '在庫の増減・アラート通知 API を tRPC で実装する',
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      dueDate: new Date('2025-06-30'),
      estimatedHours: 16,
      position: 7,
      projectId: projects.p1.id,
      createdById: owner.id,
      assigneeId: member1.id,
    },
    {
      title: 'メール通知機能',
      description: '注文確認・発送通知などのトランザクションメールを実装する',
      status: 'TODO' as const,
      priority: 'LOW' as const,
      dueDate: new Date('2025-07-31'),
      estimatedHours: 12,
      position: 8,
      projectId: projects.p1.id,
      createdById: admin.id,
      assigneeId: null,
    },
    {
      title: 'アクセシビリティ監査',
      description: 'WCAG 2.1 AA 準拠のチェックと修正',
      status: 'BLOCKED' as const,
      priority: 'MEDIUM' as const,
      dueDate: new Date('2025-06-15'),
      estimatedHours: 20,
      actualHours: 4,
      timeSpentMinutes: 240,
      position: 9,
      projectId: projects.p1.id,
      createdById: owner.id,
      assigneeId: member1.id,
    },
    {
      title: '旧デザイン資産の整理',
      description: '移行前の Sketch ファイルをアーカイブし不要リソースを削除する',
      status: 'CANCELLED' as const,
      priority: 'LOW' as const,
      dueDate: new Date('2025-03-31'),
      estimatedHours: 8,
      position: 10,
      projectId: projects.p1.id,
      createdById: member1.id,
      assigneeId: member1.id,
    },
  ];

  for (const task of p1Tasks) {
    await prisma.task.create({ data: task });
  }

  // プロジェクト2: シンプルなタスク群
  const p2Tasks = [
    {
      title: 'ワイヤーフレーム作成',
      description: '主要画面のワイヤーフレームを作成する',
      status: 'DONE' as const,
      priority: 'HIGH' as const,
      dueDate: new Date('2025-03-31'),
      completedAt: new Date('2025-03-28'),
      estimatedHours: 16,
      actualHours: 14,
      timeSpentMinutes: 840,
      position: 1,
      projectId: projects.p2.id,
      createdById: member1.id,
      assigneeId: member1.id,
    },
    {
      title: 'プッシュ通知実装',
      description: 'FCM を使ったプッシュ通知を実装する',
      status: 'IN_PROGRESS' as const,
      priority: 'HIGH' as const,
      dueDate: new Date('2025-05-31'),
      estimatedHours: 24,
      actualHours: 6,
      timeSpentMinutes: 360,
      position: 2,
      projectId: projects.p2.id,
      createdById: member1.id,
      assigneeId: member2.id,
    },
    {
      title: 'ストア審査対応',
      description: 'App Store / Google Play のガイドライン準拠確認と申請',
      status: 'TODO' as const,
      priority: 'URGENT' as const,
      dueDate: new Date('2025-07-01'),
      estimatedHours: 8,
      position: 3,
      projectId: projects.p2.id,
      createdById: member1.id,
      assigneeId: null,
    },
  ];

  for (const task of p2Tasks) {
    await prisma.task.create({ data: task });
  }

  // プロジェクト3 (アーカイブ済み): 完了タスクのみ
  const p3Tasks = [
    {
      title: 'データ移行スクリプト作成',
      description: 'PostgreSQL から新 DB へのデータ移行スクリプトを作成する',
      status: 'DONE' as const,
      priority: 'URGENT' as const,
      dueDate: new Date('2024-10-31'),
      completedAt: new Date('2024-10-29'),
      estimatedHours: 40,
      actualHours: 45,
      timeSpentMinutes: 2700,
      position: 1,
      projectId: projects.p3.id,
      createdById: admin.id,
      assigneeId: owner.id,
    },
    {
      title: '本番切り替え作業',
      description: 'ダウンタイムを最小化した本番環境の切り替えを実施する',
      status: 'DONE' as const,
      priority: 'URGENT' as const,
      dueDate: new Date('2024-12-31'),
      completedAt: new Date('2024-12-28'),
      estimatedHours: 16,
      actualHours: 20,
      timeSpentMinutes: 1200,
      position: 2,
      projectId: projects.p3.id,
      createdById: admin.id,
      assigneeId: admin.id,
    },
  ];

  for (const task of p3Tasks) {
    await prisma.task.create({ data: task });
  }

  console.warn(`  ✅ タスク ${p1Tasks.length + p2Tasks.length + p3Tasks.length} 件`);
}

// ─── コメント ─────────────────────────────────────────────────────────────────

async function seedComments(
  users: Record<string, { id: string }>,
  projects: { p1: { id: string }; p2: { id: string }; p3: { id: string } },
) {
  const admin = users['admin@example.com']!;
  const owner = users['owner@example.com']!;
  const member1 = users['member1@example.com']!;
  const member2 = users['member2@example.com']!;

  // プロジェクト1のタスクを取得（position順）
  const p1Tasks = await prisma.task.findMany({
    where: { projectId: projects.p1.id },
    orderBy: { position: 'asc' },
  });

  const comments = [
    // タスク1（要件定義書）のコメント
    {
      content: '関係者ヒアリングが完了しました。ドキュメントに反映します。',
      taskId: p1Tasks[0]!.id,
      userId: owner.id,
    },
    {
      content: 'レビューしました。LGTM です。マージ OK です。',
      taskId: p1Tasks[0]!.id,
      userId: admin.id,
    },
    // タスク3（商品一覧）のコメント
    {
      content: 'フィルタのUI実装が完了しました。ページネーションを続けて実装します。',
      taskId: p1Tasks[2]!.id,
      userId: member1.id,
    },
    {
      content: 'ページネーションはカーソルベースで実装しますか？オフセットベースでもよいですか？',
      taskId: p1Tasks[2]!.id,
      userId: owner.id,
    },
    {
      content: '教材の方針に合わせてオフセットベースで進めてください。',
      taskId: p1Tasks[2]!.id,
      userId: admin.id,
    },
    // タスク4（決済フロー）のコメント
    {
      content: 'Stripe の Webhook 設定が必要です。インフラチームに依頼しました。',
      taskId: p1Tasks[3]!.id,
      userId: member2.id,
    },
    // タスク5（カート機能）のコメント
    {
      content: 'セッション切れ時の UX を改善しました。レビューをお願いします。',
      taskId: p1Tasks[4]!.id,
      userId: member2.id,
    },
    {
      content: 'カート内容の永続化（ログイン後のマージ）も対応済みですか？',
      taskId: p1Tasks[4]!.id,
      userId: owner.id,
    },
    {
      content: '対応済みです。テストコードも追加しました。',
      taskId: p1Tasks[4]!.id,
      userId: member2.id,
    },
    // タスク9（アクセシビリティ）のコメント
    {
      content: 'デザインチームの確認待ちでブロックされています。',
      taskId: p1Tasks[8]!.id,
      userId: member1.id,
    },
  ];

  for (const comment of comments) {
    await prisma.comment.create({ data: comment });
  }

  console.warn(`  💬 コメント ${comments.length} 件`);
}

// ─── エントリポイント ─────────────────────────────────────────────────────────

main()
  .catch((e) => {
    console.error('❌ seed-dev 失敗:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
