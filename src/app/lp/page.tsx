import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Mail,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import type { Metadata } from 'next';

import { Button } from '@/component/ui/button';

export const metadata: Metadata = {
  title: '30日で作るTaskApp教材 | TaskApp',
  description: 'Next.js、tRPC、Prismaを使って30日で動くtask管理アプリを作る実践教材の販売LPです。',
};

const curriculumDays = [
  '環境構築とプロジェクト方針',
  'Next.js App Routerの土台作り',
  'UIトークンと共通コンポーネント',
  '認証モデルとセッション設計',
  'ユーザー登録とログイン',
  'PrismaスキーマとDB接続',
  'タスク一覧の基本表示',
  'タスク作成フォーム',
  'バリデーションとエラー表示',
  'ステータス更新の体験設計',
  'プロジェクト管理の導入',
  '担当者と権限の整理',
  '検索とフィルタリング',
  '期限・優先度・並び替え',
  'コメントと履歴の記録',
  'ダッシュボード指標',
  '週次レポート画面',
  'レスポンシブ調整',
  'ローディングと空状態',
  'アクセシビリティ確認',
  'ユニットテストの追加',
  'E2Eテストの追加',
  'DBシードとデモデータ',
  'エラー監視の準備',
  'パフォーマンス確認',
  'セキュリティ点検',
  'READMEと運用手順',
  'Vercelデプロイ準備',
  '販売用ZIPの確認',
  'リリース前チェックリスト',
];

const beforeAfter = [
  {
    before: 'チュートリアルを写して終わる',
    after: '認証、DB、テスト、デプロイまで通した自作アプリが残る',
  },
  {
    before: 'Next.jsとDB連携が点でしか理解できない',
    after: 'タスク管理の画面単位で設計判断を説明できる',
  },
  {
    before: '完成物を見せる材料がない',
    after: 'ポートフォリオや社内提案に使える動く題材を持てる',
  },
];

const includedItems = [
  '30日分の実装ガイド',
  '完成版ソースコード',
  'デモデータと動作確認手順',
  '購入者向けQ&A導線',
];

export default function LpPage() {
  const purchaseUrl = process.env['NEXT_PUBLIC_LP_PURCHASE_URL'] || '#purchase';
  const newsletterUrl = process.env['NEXT_PUBLIC_LP_NEWSLETTER_URL'] || '#newsletter';

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <section className="relative isolate min-h-[92vh] overflow-hidden bg-stone-950 text-white">
        <div className="absolute inset-0 bg-stone-900/70" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-stone-50" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-5 py-12 sm:px-8 lg:px-10">
          <div className="max-w-3xl py-12">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-100">
              <Sparkles className="size-4" aria-hidden="true" />
              Next.js / tRPC / Prisma 実践教材
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.12] sm:text-5xl lg:text-6xl">
              30日で動く task 管理アプリを作れる
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-stone-200 sm:text-lg">
              認証、DB、タスク管理、テスト、デプロイまでを1本のプロダクトで積み上げる教材です。
              毎日1つの到達点を作り、最終日に販売・公開できる完成物へまとめます。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-emerald-400 text-stone-950 hover:bg-emerald-300"
              >
                <a href={purchaseUrl}>
                  <CreditCard aria-hidden="true" />
                  購入ページへ
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/8 text-white hover:bg-white/15 hover:text-white"
              >
                <a href="#newsletter">
                  <Mail aria-hidden="true" />
                  メルマガ登録
                </a>
              </Button>
            </div>
          </div>

          <section
            className="relative mb-10 w-full overflow-hidden rounded-lg border border-white/15 bg-white p-3 text-stone-950 shadow-2xl"
            aria-label="TaskAppの完成イメージ"
          >
            <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
              <div className="rounded-md bg-stone-950 p-4 text-white">
                <div className="mb-6 text-sm font-semibold">TaskApp</div>
                {['Dashboard', 'My Task', 'Project', 'Report'].map((item, index) => (
                  <div
                    className={`mb-2 rounded px-3 py-2 text-sm ${
                      index === 0 ? 'bg-emerald-400 text-stone-950' : 'bg-white/8 text-stone-200'
                    }`}
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ['今週の完了', '24', '前週比 +18%'],
                  ['進行中', '11', '期限内 9件'],
                  ['レビュー待ち', '5', '今日中 2件'],
                ].map(([label, value, note]) => (
                  <div className="rounded-md border border-stone-200 bg-stone-50 p-4" key={label}>
                    <div className="text-sm text-stone-500">{label}</div>
                    <div className="mt-2 text-3xl font-bold">{value}</div>
                    <div className="mt-3 text-sm text-emerald-700">{note}</div>
                  </div>
                ))}
                <div className="rounded-md border border-stone-200 p-4 md:col-span-3">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="text-lg font-bold">Day 30 リリースチェック</h2>
                    <span className="rounded bg-sky-100 px-2 py-1 text-sm text-sky-800">Ready</span>
                  </div>
                  {['認証フロー', 'DBシード', 'E2Eスモーク', '販売ZIP'].map((item) => (
                    <div
                      className="mb-2 flex items-center justify-between rounded border border-stone-200 px-3 py-2 text-sm"
                      key={item}
                    >
                      <span>{item}</span>
                      <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10" id="purchase">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CalendarDays className="size-4" aria-hidden="true" />
              30日カリキュラム
            </p>
            <h2 className="text-3xl font-bold">毎日の成果物がつながるロードマップ</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {curriculumDays.map((summary, index) => (
                <div
                  className="rounded-md border border-stone-200 bg-white p-4 shadow-sm"
                  data-testid="curriculum-day"
                  key={summary}
                >
                  <div className="text-sm font-semibold text-sky-700">Day {index + 1}</div>
                  <div className="mt-2 text-sm leading-6 text-stone-700">{summary}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="h-fit rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-stone-500">販売価格</div>
            <div className="mt-2 text-4xl font-bold">¥10,000</div>
            <p className="mt-4 text-sm leading-6 text-stone-600">
              ZIP教材、完成版コード、購入者向けQ&A導線を含むMVP価格です。
            </p>
            <Button asChild className="mt-6 w-full bg-stone-950 text-white hover:bg-stone-800">
              <a href={purchaseUrl}>
                Stripe決済へ進む
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>
            <ul className="mt-6 space-y-3">
              {includedItems.map((item) => (
                <li className="flex gap-2 text-sm text-stone-700" key={item}>
                  <PackageCheck
                    className="mt-0.5 size-4 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold">受講前後の変化</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {beforeAfter.map((item) => (
              <div className="rounded-md border border-stone-200 p-5" key={item.before}>
                <div className="text-sm font-semibold text-rose-700">Before</div>
                <p className="mt-2 text-sm leading-6 text-stone-600">{item.before}</p>
                <div className="mt-5 text-sm font-semibold text-emerald-700">After</div>
                <p className="mt-2 text-sm leading-6 text-stone-900">{item.after}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8" id="newsletter">
        <div className="text-center">
          <h2 className="text-3xl font-bold">リリース案内を受け取る</h2>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            教材アップデート、販売開始、購入者向けQ&Aの日程をメールで案内します。
          </p>
        </div>
        <form action={newsletterUrl} className="mt-8 flex flex-col gap-3 sm:flex-row" method="post">
          <input
            aria-label="メールアドレス"
            className="min-h-11 flex-1 rounded-md border border-stone-300 bg-white px-4 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
          <Button className="min-h-11 bg-emerald-600 text-white hover:bg-emerald-700" type="submit">
            <Mail aria-hidden="true" />
            登録する
          </Button>
        </form>
      </section>
    </main>
  );
}
