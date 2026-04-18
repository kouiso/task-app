# 30日間カリキュラム 初心者向け難易度監査

作成日: 2026-04-18
対象: `material/30days-curriculum/` のうち指定9ファイル
前提読者像: JavaScript 基礎講座を終えたが、実アプリ開発は未経験の学習者
判定: **LAUNCH-BLOCK**

## 1. 総合結論

現状の30日カリキュラムは、上記の読者像に対して**難しすぎます**。特に Day 01, 05, 10, 15, 20, 25, 30 で、初心者がまだ獲得していない前提知識を当然のように要求しており、説明の深さより実装・読解・運用判断の負荷が先に来ています。

致命的なのは「用語を短く定義している」ことと「理解できる」ことが一致していない点です。たとえば `Prisma`、`tRPC`、`useMutation`、`Suspense`、`URLSearchParams`、`refine`、`managed DB` などは単語説明こそありますが、初心者がどこで・なぜ必要かを自力でつなげるには情報が足りません。

この教材は「JS 入門修了者向け」ではなく、実態としては**React/Next.js + TypeScript + API/DB の既存コードをある程度読める初中級者向け**です。商用の有料教材としては、現在のままの公開は危険です。

## 2. 監査方法

以下を実施しました。

1. 指定された 9 ファイルを実際に本文通読
2. それぞれについて、前提知識、難易度ジャンプ、前提説明不足、専門用語、演習量と説明量のバランスを確認
3. 初心者が詰まる箇所を、**ファイル・行番号・原文フレーズ**つきで抽出
4. サンプル日の難易度を 1-5 で採点

読んだファイル:

- [day01_開発環境を整えて、初めてのアプリを動かそう.md](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md:1)
- [day02_ダッシュボードに自分だけのメッセージを追加しよう.md](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day02_ダッシュボードに自分だけのメッセージを追加しよう.md:1)
- [day03_GitHubに保存する.md](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day03_GitHubに保存する.md:1)
- [day05_ログイン画面のUI.md](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day05_ログイン画面のUI.md:1)
- [day10_プロジェクト新規作成.md](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day10_プロジェクト新規作成.md:1)
- [day15_タスク編集・削除.md](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day15_タスク編集・削除.md:1)
- [day20_タスク検索機能.md](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day20_タスク検索機能.md:1)
- [day25_プロフィール編集.md](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day25_プロフィール編集.md:1)
- [day30_完成版を公開！卒業！.md](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day30_完成版を公開！卒業！.md:1)

## 3. 日別評価

| Day | 難易度 | 初心者が不足しやすい前提知識 | 難易度ジャンプ / 説明不足 | 用語・ジャーゴン | 演習量と説明量のバランス |
|---|---:|---|---|---|---|
| Day 01 | 4 | ターミナル、Git、Docker、DB、環境変数、Node バージョン管理、Prisma | 初日から `mise`、Docker、`.env`、Prisma、JWT、本番/ローカル差分まで要求。JS 入門者には範囲が広すぎる | `Docker Compose`、`Prisma`、`ORM`、`JWT_SECRET`、`Turbopack` | 手順は多いが、なぜその順なのかの因果は浅い。成功しても理解が残りにくい |
| Day 02 | 3 | React コンポーネント構造、JSX、import、既存コード読解、Tailwind | `const`/型入門の回としては良いが、途中で `completionRate`、`api.task.getAll.useQuery()`、`as const`、`Record` が急に出る | `use client`、`Tailwind CSS`、`as const`、`Record` | 前半は適切。後半で TypeScript 高度概念へ飛ぶため、説明深度が不足 |
| Day 03 | 3 | Git/GitHub、リモート、ブランチ、認証、PAT、credential helper | 「保存」の日に `PAT`、`gh auth login`、`origin` 差し替え、既存履歴の理解まで要求 | `unrelated histories`、`credential helper`、`origin`、`main` | 画面操作は丁寧だが、Git の概念負荷が高い |
| Day 05 | 4 | React hooks、フォーム管理、バリデーション、Next.js App Router、tRPC | 1 日で `react-hook-form`、`zod`、`zodResolver`、`useMutation`、`useSearchParams`、`Suspense`、Open Redirect 対策まで入る | `resolver`、`mutation`、`Suspense`、`callbackUrl`、`Open Redirect` | UI 作成の体裁だが、実際にはフロント+API+セキュリティ基礎が一気に来る |
| Day 10 | 5 | 既存コード読解、フォーム抽象化、props、型推論、キャッシュ無効化、tRPC | 「新規作成」なのに [day10_...md:65](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day10_プロジェクト新規作成.md:65) で既存実装読解中心。自力で作る感覚が薄く、仕組み理解の難度が高い | `useMutation`、`invalidate`、`values prop`、`initialData` | 説明はあるが、既存の複雑な設計に追従させる比重が大きい |
| Day 15 | 5 | create/update の分岐、部分更新、null/undefined、キャッシュ同期、日付変換 | Day 14 前提が非常に強く、 `defaultValues + useEffect(reset)`、`taskToFormData`、`dateOnlyToUtcStartIso` まで自然に使う | `mutation`、`invalidate`、`UTC`、`partial update` | 実装量のわりに、背景説明より「この形で書く」が先行 |
| Day 20 | 5 | URL クエリ、同期、型ガード、条件付き query、日付境界、検索 UX | `URLSearchParams`、`useSearchParams`、`watch`、`enabled`、UTC日付変換、検索結果削除再取得を 1 日で扱う | `cuid`、`datetime`、`enabled`、`refetchOnWindowFocus` | 機能は実践的だが、初心者には一度に抱える状態と条件が多すぎる |
| Day 25 | 5 | 複数ページ構成、認証済みユーザー取得、zod refine、正規表現、mutation | 3 ページをまたいでプロフィール表示・編集・パスワード変更を実装。`regex` 4 本 + `refine` は初心者には重い | `refine`、`PasswordInput`、`regex`、`toast`、`form.reset` | 画面数も概念数も多く、1 日あたりの説明許容量を超えている |
| Day 30 | 5 | 本番環境、環境変数、クラウドDB、Vercel、CI/CD、ビルド、運用確認 | 「公開」の回で本番DB選定、`DATABASE_URL`、`JWT_SECRET`、Prisma build 依存、Vercel ビルド戦略まで要求 | `managed DB`、`CI/CD`、`Production`、`vercel-build`、`prisma generate` | 学習の締めとしては実務寄りすぎる。初学者には運用判断の責任が重い |

### 日別補足

**Day 01**

- [day01_...md:13](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md:13) の「`Docker Desktop`、`mise`」時点で、JS チュートリアル修了者の守備範囲を超えています。
- [day01_...md:613](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md:613) の「`prisma generate` が自動実行」は、初心者には“何が生成されて、なぜ失敗するのか”が見えません。
- [day01_...md:584](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md:584) の JWT 解説は、初日に出すには高度です。

**Day 02**

- 前半は初心者向けですが、後半で [day02_...md:370](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day02_ダッシュボードに自分だけのメッセージを追加しよう.md:370) の「`api.task.getAll.useQuery()`」や [day02_...md:444](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day02_ダッシュボードに自分だけのメッセージを追加しよう.md:444) の `as const` に飛ぶのが急です。
- 「JS/TS 基礎の日」に API の存在や既存の型メタ構文が混ざり、学習の芯がぶれています。

**Day 03**

- [day03_...md:187](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day03_GitHubに保存する.md:187) の `Personal Access Token` は、用語説明はあっても初学者には心理的ハードルが高いです。
- [day03_...md:295](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day03_GitHubに保存する.md:295) の `git remote set-url origin` は、Git のリモート概念を知らないと手順暗記になります。

**Day 05**

- [day05_...md:11](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day05_ログイン画面のUI.md:11) で、いきなり `react-hook-form`、`zod`、`shadcn/ui` を同時投入しています。
- [day05_...md:500](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day05_ログイン画面のUI.md:500) の `Suspense` 必須説明は、初心者には「なぜこのページだけ必要か」が見えにくいです。
- [day05_...md:507](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day05_ログイン画面のUI.md:507) の Open Redirect 対策は実務的には良いですが、初心者教材では文脈補強が足りません。

**Day 10**

- [day10_...md:65](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day10_プロジェクト新規作成.md:65) で「既存コードの理解が中心」と明示されており、初学者の“自分で作れた”感を削ぎます。
- [day10_...md:227](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day10_プロジェクト新規作成.md:227) の `values` prop 自動同期、[day10_...md:537](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day10_プロジェクト新規作成.md:537) の `invalidate()` は、かなり React/tRPC に慣れた読者向けです。

**Day 15**

- [day15_...md:95](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day15_タスク編集・削除.md:95) から `defaultValues + useEffect(reset)` を前提として読ませる構成で、Day 14 が理解できていない学習者はほぼ脱落します。
- [day15_...md:274](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day15_タスク編集・削除.md:274) の `dateOnlyToUtcStartIso` や [day15_...md:308](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day15_タスク編集・削除.md:308) の `null と undefined の使い分け` は中級内容です。

**Day 20**

- [day20_...md:101](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day20_タスク検索機能.md:101) の `cuid` / `datetime` スキーマ、[day20_...md:743](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day20_タスク検索機能.md:743) の URL→form 同期は、検索機能としては高度です。
- [day20_...md:840](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day20_タスク検索機能.md:840) の UTC境界変換は、初心者向けに別枠で扱うべき難所です。

**Day 25**

- [day25_...md:632](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day25_プロフィール編集.md:632) のパスワードポリシーは実務品質としては妥当ですが、初心者演習としては一度に要求しすぎです。
- [day25_...md:662](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day25_プロフィール編集.md:662) の `refine` は、基礎段階の読者には抽象度が高いです。
- さらに 3 画面を 1 日で進めるため、認知負荷が高すぎます。

**Day 30**

- [day30_...md:90](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day30_完成版を公開！卒業！.md:90) の `DATABASE_URL` / `JWT_SECRET` 準備、[day30_...md:151](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day30_完成版を公開！卒業！.md:151) のローカル build 前提、[day30_...md:334](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day30_完成版を公開！卒業！.md:334) の Prisma build 戦略は実務者向けです。
- 「公開して終わり」ではなく「本番運用の事故らせない手順」まで求めており、初心者にとって重すぎます。

## 4. 難易度カーブ

### 難易度マップ

| Day | 難易度 |
|---|---:|
| Day 01 | 4 |
| Day 02 | 3 |
| Day 03 | 3 |
| Day 05 | 4 |
| Day 10 | 5 |
| Day 15 | 5 |
| Day 20 | 5 |
| Day 25 | 5 |
| Day 30 | 5 |

### カーブ評価

結論: **単調増加ではなく、不連続なジャンプが複数あります。**

主な不連続点:

1. **Day 01 の時点で高すぎる**
   初日から環境構築の範囲が広く、初心者が「何をしているか分からないまま成功/失敗する」構造です。
2. **Day 02 で一度やや下がる**
   画面変更体験自体は良いが、後半で既存コード・型メタ構文が混ざり再び難化します。
3. **Day 05 で再度大きく上がる**
   UI 作成の題名に対して、実態は複数ライブラリ横断のフォーム/認証/Next.js 概念学習です。
4. **Day 10 以降はほぼ中級者帯で固定**
   既存実装の読解、ミューテーション、キャッシュ無効化、日付変換、URL同期、regex/refine、本番デプロイと、初心者向けの補助輪がほぼ外れます。

このため、難易度カーブは「なだらかに上がる」ではなく、**早期に急坂へ入り、そのまま高止まりする**形です。

## 5. 初心者の詰まりポイント Top 10

1. [Day 01:13](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md:13) 「`ターミナル、VS Code、Docker Desktop、mise、ブラウザ`」
   初日でツールが多すぎます。JS 基礎だけ終えた読者は、どれが必須で何のためかをまだ整理できません。

2. [Day 01:556](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md:556) 「`dotenv 系の仕組みが同ファイル内の変数参照を展開`」
   `dotenv` も変数展開も未学習の読者には一文で理解不能です。`.env` は“コピペして終わり”になりやすいです。

3. [Day 01:613](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md:613) 「`prisma generate` が自動実行」
   何が生成されるか、なぜ `.env` が必要か、失敗時に何を見るべきかが分からず詰まります。

4. [Day 01:723](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md:723) 「`npx prisma db push`」
   DB テーブル反映は初心者にとって非常に重い操作です。`schema.prisma` を知らないままコマンドだけ打たせています。

5. [Day 02:370](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day02_ダッシュボードに自分だけのメッセージを追加しよう.md:370) 「`api.task.getAll.useQuery()` でタスク一覧をサーバーから取得」
   `const`/型の回なのに API フックの存在が急に前提化されます。JS 基礎学習者はここで“自分はいま何を学んでいるのか”を見失います。

6. [Day 02:444](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day02_ダッシュボードに自分だけのメッセージを追加しよう.md:444) 「`as const`」「`typeof TASK_STATUS`」「`keyof`」
   TypeScript 中級の型メタ構文です。Day 02 の初心者基礎としては過積載です。

7. [Day 05:11](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day05_ログイン画面のUI.md:11) 「`react-hook-form と zod ... shadcn/ui`」
   1日で学ぶ新規ライブラリが多すぎます。フォーム基礎だけでも十分なところに、UI ライブラリまで重ねています。

8. [Day 05:500](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day05_ログイン画面のUI.md:500) 「`useSearchParams を使うコンポーネントには Suspense ラッパーが必要`」
   必要条件だけが提示され、App Router の非同期/レンダリング文脈が説明されません。初心者には“おまじない化”します。

9. [Day 15:308](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day15_タスク編集・削除.md:308) 「`null と undefined の使い分け`」
   実務では重要ですが、JS 入門直後の学習者にはかなり難しい境界です。しかも update API の部分更新設計まで同時に理解が必要です。

10. [Day 30:90](/Users/kouiso/ghq/kouiso/task-app/material/30days-curriculum/day30_完成版を公開！卒業！.md:90) 「`DATABASE_URL`」「`JWT_SECRET`」
    最終日とはいえ、初心者に本番 DB 接続文字列と秘密鍵管理を任せるのは危険です。公開手順というより運用設計の領域に入っています。

## 6. 推奨対応

### 6-a. 簡略化は必要か

**必要です。結論は LAUNCH-BLOCK です。**

理由:

- 序盤の時点で初心者が持たない前提知識を大量に要求している
- タイトルと実際の学習負荷が一致していない日が複数ある
- 「コードを書かせる」より「既存コードの高度な読解」が先に来る日がある
- 本番運用・認証・型システム・DB・検索同期など、失敗時の自己復旧が難しいテーマが早く深く出る
- 商用品として「初心者向け」と受け取って購入した受講者の期待値を外すリスクが高い

### 6-b. 最優先で手直しすべき日

優先度順:

1. **Day 01**
   Docker/Prisma/JWT を初日から同列で扱う構成を見直すべきです。最短で「動いた」を得る簡易ルートと、理解重視の補足ルートを分ける必要があります。

2. **Day 05**
   `react-hook-form`、`zod`、`tRPC`、`Suspense`、リダイレクト対策を1日に詰め込まないほうがよいです。フォーム入力とバリデーションだけに絞る再設計が必要です。

3. **Day 10**
   「既存コード理解中心」は初心者向けの体験として弱いです。新規作成の最小版を自分で書かせ、そのあと既存版との差分を見る順が望ましいです。

4. **Day 15 / Day 20 / Day 25**
   この3日は完全に中級者帯です。分割か、前提補講の挿入が必要です。

5. **Day 30**
   本番公開の前に「教材用の安全なデプロイパス」を別途用意すべきです。DB と秘密鍵の責任を初心者にそのまま負わせないほうがよいです。

### 6-c. 粗い工数見積もり

最低ラインの改修:

- **8-12営業日**
  説明追記、詰まりポイントの補足、用語注釈、各日の前提明記、難所の図解追加

初心者向けとして売れる水準まで上げる改修:

- **15-25営業日**
  Day 01/05/10/15/20/25/30 の再構成
  予備知識の前置き追加
  既存コード読解中心の日を「最小実装→拡張」の流れに変更
  本番運用系の安全な代替導線追加
  スクリーンショットとチェックポイントの再設計

理想的な再設計:

- **20-30営業日**
  カリキュラム全体の難易度再配列
  Day 01-07 を完全に初心者専用トラックへ再設計
  中級トピックを「発展」折りたたみへ移動
  事前知識ゼロ想定の補助教材追加

## 最終判定

**LAUNCH-BLOCK**

根拠:

- 初心者向けを名乗るには、序盤から要求する前提知識が広すぎる
- 難易度カーブに複数の不連続ジャンプがある
- 中盤以降は継続的に中級者向けの思考を要求している
- 有料商材として、受講者が「自分が悪いのか教材が飛んでいるのか」を判別しにくい構造は致命的

少なくとも Day 01, 05, 10, 15, 20, 25, 30 の大幅な手直しなしでの公開は推奨できません。
