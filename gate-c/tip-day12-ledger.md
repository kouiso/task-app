# Gate C 再検証台帳 — Day 12「メンバー追加を実装しよう」(tip 5881e2f7)

- **検査者**: devin-8fcefb2b353645f4a4411adc9e263f8a
- **検査日**: 2026-10-10
- **対象PDF**: `artifacts/pdf/day12_メンバー追加.pdf` @ commit `5881e2f71267aebd996abb0ceba8174e03707365` (branch `devin/source40-pdf-artifacts`)
- **SHA256照合**: manifest 記載 `55c0f815ce90…` = 実測 `55c0f815ce90…` → **MATCH**
- **方法**: `pdftoppm -r 100` で 169 ページ全てを PNG 化し逐ページ目視（Mermaid 箇所は 200dpi 再切り出しで確認）
- **結果**: **must 0 / suggest 14 / ok 155**（全 169 ページ検査済み）

## 旧build (e39a1ce9) との関係

| 旧buildの指摘 | tipでの状態 | 証跡 |
|---|---|---|
| must: p5 図2 Mermaid ラベル右端クリップ | **解消** | tip p5 図2: ノード内ラベルが右端まで完全描画（`フォームを送信` / `addMember.mutate` / `一覧を再取得` 等すべて枠内に収まる） |
| suggest: p104 脚注裸URL | **継続（位置は移動）** | tip p168: 奥付頁の脚注1-6が `https://drive.google.com/file/d/…` の裸URLのまま。件名行に*1〜*6参照はある。 |

## verdict別ページ一覧

- **must**: なし
- **suggest (14)**: p40, p58, p68, p96, p99, p134, p137, p146, p148, p149, p157, p158, p165, p168

## suggest 詳細

| page | 内容 |
|---|---|
| p40 | 下部約73%白紙（本文+コードのみ） |
| p58 | 下部約80%白紙（表+1段落のみ） |
| p68 | 図7 シーケンス図 右端ラベル軽度クリップ `assertMemberPermission(canManageMembers` （`')` が枠外、200dpi確認）。旧buildの致命的切断ではなく1字欠け。 |
| p96 | 1段落のみ・下部約85%白紙 |
| p99 | コード3行+1段落・下部約78%白紙 |
| p134 | 1段落のみ・下部約85%白紙 |
| p137 | コード末尾4行+1段落・下部約75%白紙 |
| p146 | 1段落のみ・下部約82%白紙 |
| p148 | `□ール` tofu（コード内文字列 `ロール` の カタカナ「ロ」がコードフォントで欠字）+hardwrap |
| p149 | `□ールを選択` tofu（placeholder文字列）+hardwrap |
| p157 | `□ール` tofu（`<Label htmlFor="role">` 内）+hardwrap |
| p158 | `□ールを選択` tofu（placeholder）+hardwrap |
| p165 | 用語表セル語中分割（`MEMBER/VIE`→`WER`） |
| p168 | 脚注URL×6が裸URL |

## ok 備考（主なパターン）

- 完成コード断片の hardwrap（継続行が行頭 col-0 に折り返す）。内容欠落はなく tip 採点では ok+note 扱い（多数。`src/app/project/page.tsx`・`src/server/api/routers/project.ts` の長行）。
- `{/* filepath: …(同じファイルの続き` → `) */}` のコメント中折返しは複数頁。内容は完結。
- セクション末の白紙は 60% 未満なら ok。

## 良好描画の確認例（実目視の証跡）

- p5 図2（旧must）: 「ユーザーがメンバー追加フォームを送信→addMember.mutate→サーバー権限チェック→一覧を再取得」の全ノード・全ラベルが完全描画。
- p87-90: `getAll` / `getById` / `assertMemberPermission` のクエリコードが `include`/`findMany`/`canView`/`canManageMembers` まで完全。
- p151-161: `page.tsx` 完成版 687〜868 行目の連続コードが `Switch`/`Button`/`grid`/`ProjectCard`/`DeleteConfirmDialog`/`export default function ProjectPage()` まで途切れなく描画。
- p162: 最終確認 `npm run build`・今日のまとめチェックリスト 6 項目すべて描画。
- p166: 理解チェック Q1-Q3（`getAvailableUsers`の`none`、`addMember`の`if (existing)`、`canManageMembers`とOWNER追加の関係）完全。

## 傾向メモ

- 旧must（p5 Mermaid）は font-measure fix により解消。
- tip 独自の新規欠陥: **コードフォントのカタカナ「ロ」tofu**（p148/149/157/158 に `□ール` — day08 の `{/* ロゴ */}`→`□ゴ` と同根のフォント欠字系）。
- 下部白紙 70-85% の残りページが suggest の主構成（p40,58,96,99,134,137,146）。
