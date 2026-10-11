# Gate B-drift スポット照合 — tip 5881e2f7 (2026-10-10)

- 実施者: devin-2c4633d6343d44e580dcf442c013794d
- 対象: `devin/source40-pdf-artifacts` tip `5881e2f71267aebd996abb0ceba8174e03707365` の完成版 `src/` と `material/30days-curriculum/*.md` のフェンス記述コード
- 選定: `random.seed(20261010)` で day01-30 から5冊 → **day02 / day08 / day12 / day22 / day26**
- 方法: 各教材のコードフェンスを `filepath:` 記載または直前文脈の path 参照で src ファイルへ対応付け。フェンス行の空白正規化後の行含有照合 + 乖離候補の代表行を src 側で grep 検証。中間状態(写経途中の演習版)フェンスと「完成版/続き」フェンスを区別
- src/ は当ブランチと tip `5881e2f7` で diff なし(照合等価)

## 結果サマリ

| day | src対象フェンス | 乖離 | 分類 |
|---|---|---|---|
| day02 | dashboard/page.tsx ×21 | 中間演習版マークアップ(グリーティングカード)が完成版 src に非含有 | 想定内(演習の中間状態。完成版は日次進化後の実装) |
| day08 | app-layout.tsx 他4ファイル | app-layout.tsx の差分フェンスが完成版と非一致(区間断片) | 既知B-drift(ledger記録済・tsc影響なし) |
| day12 | project/page.tsx ×64, routers/project.ts ×52 | project.ts r=1.00一致。page.tsx は import 行の改行差など軽微 | 乖離ほぼなし |
| day22 | report/page.tsx ×25 | 完成版に無い構成の断片(Recharts import形・Cell/Legend構成) | 既知B-drift(ledger記録済) |
| day26 | 17ファイル分 | **真の乖離2件 + 不存在ファイル1件**(下記) + globals.css `@theme inline` 追記指示フェンス | 要修正候補 |

## day26 の真の乖離(本照合で確定)

1. **`src/app/profile/page-query-state.test.tsx` が完成版 src に存在しない**
   - day26 が「作り」と指示し8フェンスで内容を提示するが、完成版 `src/app/profile/` 配下に該当ファイルなし(`edit/`・`change-password/`・`page.tsx`のみ)。
   - verdict-addendum「残る真の教材側ギャップ」1件目と同一。完成版へ追加するか教材を調整するか要判断(未解決)。
2. **`sessionRefreshFailed` 条件式の相違** — day26 フェンス `{sessionRefreshFailed ? (` vs 完成版 `src/component/layout/app-layout.tsx:311` `{sessionRefreshFailed && session?.user ? (`。完成版側は `session?.user` 条件を追加済み。教材の提示コードが完成版の最終形と一致しない。
3. **`profileRefreshFailed`** — day26 の `src/app/profile/page.tsx` 向けフェンスが参照する変数名が完成版 src 全体に grep ヒット0。同様に「教材が完成版に無い要素を追記指示」型。

## 結論

- 5冊中4冊の乖離は既知クラス(中間演習状態・ledger記録済B-drift)で新規問題なし。
- day26 は「教材が完成版に無い機能差分を指示」型の真の乖離を3件確認。`page-query-state.test.tsx` は addendum 記録済、`sessionRefreshFailed`/`profileRefreshFailed` の2件は本照合で新規特定。**day26 の写経では完成版と同一状態へ到達できない箇所がある** — A級(教材側欠損)候補として記録。
- 提案件: day26 の profile/session リフレッシュ失敗UIのフェンスを完成版 src から逆生成して整合化(既存 addendum の推奨対応と同一方向)。

## 証跡

- 照合スクリプト実行ログは本セッション内で実測。ledger.jsonl の day02/08/12/22/26 行と突合済。
- 参照: `audit/gate-b-repro-2026-10-10/logs/ledger.jsonl`、`logs/verdict-addendum-20261010.md`、`audit/tip-day02-verdict.md`
