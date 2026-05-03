'use client';

import { BarChart3, ClipboardList, Lock, Users } from 'lucide-react';
import { AppLayout } from '@/component/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';

const features = [
  {
    icon: <ClipboardList className="w-12 h-12 text-primary" />,
    title: 'タスク管理',
    description:
      'タスクの作成・担当者割り当て・進捗管理が可能。ステータス、優先度、期限を柔軟に設定できます。',
  },
  {
    icon: <Users className="w-12 h-12 text-primary" />,
    title: 'チームコラボレーション',
    description:
      'プロジェクト単位でチームメンバーを管理。コメント機能でタスクごとのコミュニケーションが行えます。',
  },
  {
    icon: <BarChart3 className="w-12 h-12 text-primary" />,
    title: '進捗トラッキング',
    description:
      'ダッシュボードと週次レポートで進捗を可視化。タイマー機能で作業時間も記録できます。',
  },
  {
    icon: <Lock className="w-12 h-12 text-primary" />,
    title: 'プロジェクト管理',
    description:
      'プロジェクトをカラーで色分け、アーカイブ機能で整理。ロールベースの権限管理で安全に運用できます。',
  },
];

const techStack = [
  {
    category: 'フロントエンド',
    items: [
      '• Next.js 15 - Reactフレームワーク',
      '• Tailwind CSS - ユーティリティファーストCSS',
      '• shadcn/ui - コンポーネントライブラリ',
      '• tRPC - 型安全APIレイヤー',
    ],
  },
  {
    category: 'バックエンド',
    items: [
      '• Prisma - データベースORM',
      '• PostgreSQL - データベース',
      '• jose + bcryptjs - JWT認証',
      '• Vercel - ホスティング',
    ],
  },
];

export default function AboutPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Task Appについて</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Next.js、tRPC、Prismaで構築されたモダンなタスク管理アプリケーションです。
            チームの生産性向上を目的に設計されています。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div>{feature.icon}</div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>技術スタック</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {techStack.map((section) => (
                <div key={section.category}>
                  <h3 className="font-bold text-lg mb-3">{section.category}</h3>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="text-sm text-muted-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
