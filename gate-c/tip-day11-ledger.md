# Gate C: tip day11 視覚検査レジャー

- 検査者: devin-8fcefb2b353645f4a4411adc9e263f8a
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day11_プロジェクト編集・削除.pdf` @ `5881e2f71267aebd996abb0ceba8174e03707365`
- SHA256照合: `4d873fbbb420` — `artifacts/evidence/pdf-manifest.json`(同一コミット)と一致
- ページ数: 160（マニフェスト一致・全160ページ目視済）
- 方法: `pdftoppm -r 100` 30pチャンク描画→`read`で全ページ目視
- 結果: **must 0 / suggest 16 / ok 144**

## 旧build(e39a1ce9)との関係

旧レジャー(day11-ledger.md): must 2 (p6 図2 / p52 図4 のMermaid切断), suggest 104。
macOS font-measure fix リビルド後、**旧must 2件は両方とも解消**:

| 旧ページ | 旧症状 | tipでの確認 |
|---|---|---|
| p6 図2 | `deleteTargetId をt`/`DeleteConfirmDialog` 右端切れ | tip p6 で全ノード完全描画(`deleteTargetId をセット` `DeleteConfirmDialog を表示` 削除→`api.project.delete.mutate` キャンセル→`何もしない` `invalidateでキャッシュ無効化` 全部見え) |
| p52 図4 | `isArchived = ` 端切れ/`archiveMutation.r` `unarchiveMutation.` 切れ | 図4は tip で p51 に前送り。`isArchived = false`/`= true` `archiveMutation.mutate`/`unarchiveMutation.mutate` `setArchiveStatus: isArchived=true/false` `一覧が自動更新される` 全て完全 |

旧 suggest 104件の大半は hardwrap 系で、tip 採点では ok+note に降格(約55ページに残存)。要改善として残ったのは表セル語中分割・ほぼ白紙ページ・裸URL脚注のみ。

## 判定一覧

- **must**: なし
- **suggest** (16): p3, p9, p10, p21, p44, p67, p69, p73, p89, p93, p115, p131, p137, p143, p150, p159
- **ok** (144): 残り全ページ

## suggest 内訳

| ページ | 内容 |
|---|---|
| p3 | 目次続き「奥付」1行のみ・約90%白紙 |
| p9 | Step表セル語中分割(`archi\|ve`・`getByI\|d`) |
| p10 | Step表セル語中分割(`DeleteConfirmDialo\|g`) |
| p21 | 本文3段落のみ・下部約78%白紙 |
| p44 | コード末尾+1段落のみ・下部約70%白紙 |
| p67 | コード末尾3行+1段落・下部約70%白紙 |
| p69 | コード末尾2行+2段落・下部約67%白紙 |
| p73 | 確認ポイント+本文・下部約69%白紙 |
| p89 | 3行段落のみ・下部約85%白紙 |
| p93 | 2段落のみ・下部約76%白紙 |
| p115 | コード末尾4行+1段落・下部約68%白紙 |
| p131 | 1段落のみ・下部約80%白紙 |
| p137 | コード末尾3行+2段落・下部約70%白紙 |
| p143 | 1段落のみ・下部約78%白紙 |
| p150 | 1段落のみ・下部約80%白紙 |
| p159 | 脚注1-6 裸URL(Drive直リンク) |

## ok備考

- hardwrap(継続行が左端0列へ割れるコード折返し、内容損失なし): p8,14-16,18-20,22,23,25,27,31-43,45,46,48,49,52-54,66,70,72,84-86,90,95,97,98,100-104,106-109,114,117-130,132-136,138,139,141,144-147,149,151（内容は全行保持、体裁のみ。tip採点では ok+note）
- 画面スクリーンショット図(図1編集ダイアログ/図3削除確認/図5/図6)は全て完全描画
- 用語表・権限表・まとめ・つまずきポイント・理解チェック・追加課題・次回予告は全て正常

## 良好描画の確認例(実目視の証跡)

- p6 図2 Mermaid: 左枝 `カードの編集ボタン → 既存データを取得 → ProjectDialogを編集モードで開く → フォームを変更 → api.project.update.mutate`、右枝 `カードの削除ボタン → deleteTargetId をセット → DeleteConfirmDialog を表示` が `削除` → `api.project.delete.mutate` / `キャンセル` → `何もしない` に分岐し `invalidateでキャッシュ無効化` まで全ラベル読めた
- p51 図4 Mermaid: `isArchived = false` から `isArchived = true` へ `archiveMutation.mutate`、逆に `unarchiveMutation.mutate`、両経路に `setArchiveStatus: isArchived=true`/`false` → `invalidateでキャッシュ無効化` → `一覧が自動更新される` 全て完全
- p156 用語表: 「再利用」「initialData」「Null合体演算子(??)」「DeleteConfirmDialog」「アーカイブ」「キャッシュ無効化(invalidate)」「assertMemberPermission」7行、セル内wrapは語区切り正常
- p157 Q3: 「`handleDelete` が `deleteMutation.mutate` を直接呼ばないのはなぜですか。」→「押す動作を2回に分けることで、1回目と2回目のあいだに考え直す余地が生まれます。」まで途切れなし
- p84-86 Before/After コード: `assertOwnerDeletePermission` → `assertMemberPermission(members, 'canDelete')` 差分構造が正しく示されている

## 傾向メモ

- 本書の dominan defect は「コードブロック末尾+短い段落だけのページ」による下部大余白(約70-90%白紙)13ページ。ページ境界で大きなコードブロックが割れて残りページがほぼ空になる構造的問題
- Mermaid 図は全図(p6 図2・p51 図4)完全。他ページに Mermaid なし
- 表セル語中分割は p9/p10 のみ(day09 p81/82・day10 p60 と同じ新規 defect class)
- 旧buildの p6/p52 Mermaid クリップは font-measure fix により解消済み
