# Gate C 再検証台帳 — Day 13「タスク一覧画面を作ろう」(tip 5881e2f7)

- **検査者**: devin-8fcefb2b353645f4a4411adc9e263f8a
- **検査日**: 2026-10-10
- **対象PDF**: `artifacts/pdf/day13_タスク一覧画面.pdf` @ commit `5881e2f71267aebd996abb0ceba8174e03707365` (branch `devin/source40-pdf-artifacts`)
- **SHA256照合**: manifest 記載 `7882f529b4f5…` = 実測 `7882f529b4f5…` → **MATCH**
- **方法**: `pdftoppm -r 100` で 104 ページ全てを PNG 化し逐ページ目視（Mermaid 箇所は 200dpi 再切り出しで確認）
- **結果**: **must 0 / suggest 4 / ok 100**（全 104 ページ検査済み）

## 旧build (e39a1ce9) との関係

| 旧buildの指摘 | tipでの状態 | 証跡 |
|---|---|---|
| suggest: p5 図2 Mermaid ラベル軽度クリップ | **解消** | tip p5 図2: 「タスク一覧ページ／フィルター／タスクカードのグリッド／プロジェクト選択／ステータス選択／TaskCard コンポーネント／ステータスBadge／優先度Badge／担当者アバター／期限日」すべてのノードラベルが枠内に完全収まる |
| suggest: p6 図3 Mermaid ラベル軽度クリップ | **解消** | tip p6 図3: 「ユーザーがフィルターを変更→state更新→useQueryが再実行される→サーバーから絞り込み結果を取得→画面が自動更新される」全ラベル完全描画 |
| suggest 計38件（空白・脚注等の軽微指摘） | **4件に大幅減** | 残る suggest は白紙残り2頁と脚注裸URLのみ |

## verdict別ページ一覧

- **must**: なし
- **suggest (4)**: p16, p50, p103, p104

## suggest 詳細

| page | 内容 |
|---|---|
| p16 | 1段落のみ・下部約71%白紙 |
| p50 | 確認ポイント+1段落のみ・下部約74%白紙 |
| p103 | 脚注1-2が裸URL（drive.google.com/…） |
| p104 | 脚注3-6が裸URL×4（drive.google.com/…） |

## ok 備考（主なパターン）

- 完成コードの hardwrap（`page.tsx` 連続コード頁で JSX 属性・タグ名・文字列が行頭 col-0 に折り返す：p88-97, p93-97 等）。内容欠落なし・tip採点では ok+note。
- `from` 先の import 行割れ（`'./trpc';` `'@/lib/constant/query';` 等 col-0）：p77, p85 他。内容は完全。
- セクション末の白紙 60% 未満は ok（p44, 48, 52, 61, 67, 73 等）。

## 良好描画の確認例（実目視の証跡）

- p5/p6 の2図: 旧 suggest の Mermaid クリップが完全解消（font-measure fix 有効）。
- p17 図4: 絞り込み分岐「input.projectIdの指定はあるか／無い・有る／FORBIDDENを投げて打切る／指定したプロジェクトのタスクを返す」全ラベル枠内完全描画。
- p75: STATUS_CONFIG オブジェクト（`TODO: { label: "未対応", color: "bg-gray-100 text-gray-800" }` / IN_PROGRESS / DONE / `as const satisfies Record<TaskStatus, ...>`）完全。
- p91-97: `TaskPageContent` の連続コード（`canEditProject`/`canDeleteProject`/ハンドラ/JSX nav/TaskDetailDialog）が途切れなく p97 `export default function TaskPage()` で完結。
- p101: 用語表5行・p102: A1「検索する範囲を、ログイン中の本人がメンバーになっているプロジェクトだけにあらかじめ狭めるためです」Q3「渡さないと既定値の false が使われ…」解答まで完全。

## 傾向メモ

- 全書で Mermaid 図（p5, p6, p17）のクリップは解消。font-measure fix の効果が顕著。
- 残る軽微指摘は白紙残り（p16, p50）と奥付脚注裸URL（p103, p104）のみ。
- この本には `□ール` tofu は見当たらず（コード内日本語文字列が少ないため）。
