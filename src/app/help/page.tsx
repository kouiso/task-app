'use client';

import { AppLayout } from '@/component/layout/app-layout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/component/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';

const faqs = [
  {
    question: 'プロジェクトを作成するには？',
    answer:
      'プロジェクトページに移動し、「新規プロジェクト」ボタンをクリックします。プロジェクト名、説明、カラーを入力してください。作成者は自動的にオーナーとして登録されます。',
  },
  {
    question: 'タスクを誰かに割り当てるには？',
    answer:
      'タスクの作成・編集時に「担当者」ドロップダウンからチームメンバーを選択します。プロジェクトのメンバーのみが担当者として選択可能です。',
  },
  {
    question: 'タスクのステータスの種類は？',
    answer:
      'タスクには以下のステータスがあります：未対応（TODO）、進行中（IN_PROGRESS）、レビュー中（IN_REVIEW）、完了（DONE）、キャンセル（CANCELLED）、ブロック（BLOCKED）。',
  },
  {
    question: 'プロジェクトにメンバーを追加するには？',
    answer:
      'プロジェクト詳細を開き、「メンバー追加」をクリックします。ユーザーを選択し、ロール（オーナー、管理者、メンバー、閲覧者）を割り当てます。ロールによって操作権限が異なります。',
  },
  {
    question: '複数のタスクを一括操作できますか？',
    answer:
      'はい。タスクページでチェックボックスを使って複数のタスクを選択できます。一括で完了、ステータス変更、削除が可能です。',
  },
  {
    question: 'タスクの優先度はどう使いますか？',
    answer:
      'タスクには4つの優先度レベルがあります：低（LOW）、中（MEDIUM）、高（HIGH）、緊急（URGENT）。優先度を設定することで、チーム全体で重要なタスクに集中できます。',
  },
  {
    question: 'タスクの作業時間を記録するには？',
    answer:
      '各タスクにはタイマー機能があります。タイマーボタンをクリックして計測を開始できます。手動で作業時間を追加することも可能です。',
  },
  {
    question: '完了したプロジェクトをアーカイブできますか？',
    answer:
      'はい。プロジェクト詳細から「アーカイブ」ボタンをクリックできます。アーカイブされたプロジェクトはプロジェクトページの「アーカイブ表示」で確認できます。',
  },
];

export default function HelpPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">ヘルプ・ドキュメント</h1>
          <p className="text-muted-foreground">よくある質問と、Task Appの使い方を確認できます。</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>はじめに</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold">1. プロジェクトを作成する</p>
              <p className="text-sm text-muted-foreground">
                まずプロジェクトを作成して、タスクを整理しましょう。各プロジェクトにはメンバーや設定を個別に管理できます。
              </p>
            </div>
            <div>
              <p className="font-semibold">2. メンバーを追加する</p>
              <p className="text-sm text-muted-foreground">
                チームメンバーをプロジェクトに招待しましょう。役割に応じたロールを割り当てることで、適切な権限管理ができます。
              </p>
            </div>
            <div>
              <p className="font-semibold">3. タスクを作成する</p>
              <p className="text-sm text-muted-foreground">
                作業をタスクに分割しましょう。担当者の割り当て、期限の設定、進捗の管理が行えます。
              </p>
            </div>
            <div>
              <p className="font-semibold">4. 進捗を確認する</p>
              <p className="text-sm text-muted-foreground">
                ダッシュボードで全体の進捗を確認したり、週次レポートでチームの成果を振り返ることができます。
              </p>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-2xl font-bold mb-4">よくある質問</h2>
          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="font-medium">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">さらに詳しく知りたい方へ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              ご不明な点がありましたら、サポート窓口（
              <a href="mailto:support@taskapp.com" className="text-primary hover:underline">
                support@taskapp.com
              </a>
              ）までお問い合わせください。
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
