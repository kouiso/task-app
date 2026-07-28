# Gate3 初心者シミュレーション — Day 25 (2026-07-28)

- 対象: material/30days-curriculum/day25_プロフィール編集.md
- やり方: 教材の本文だけを読む初心者役が通し、詰まりを行番号つきで挙げた。
  挙がった各件を、別の判定者が「成立しない」を既定の立場として現物の行で反証した。
- 挙がった件数: 3 件 / 反証を生き延びた件数: 0 件

## 生き延びた詰まり

なし

## 反証で消えた件

3 件。挙がった内容と、反証側が示した根拠を全件残す。

### 消えた件 1. 行937 パスワード変更ページの写経で、この import を書いて保存した瞬間に「Module not found: Can't

**逐語引用**

```
import { PasswordInput }
  from '@/component/ui/password-input';
import { api } from '@/trpc/react';
```

**初心者役が挙げた詰まり**

パスワード変更ページの写経で、この import を書いて保存した瞬間に「Module not found: Can't resolve '@/component/ui/password-input'」で画面が出なくなる。3つの入力欄すべてが `PasswordInput` なので、Step 6 から Step 9 まで一歩も進めない。

**初心者役が挙げた不足**

`PasswordInput` は shadcn/ui の標準部品ではなく自作部品だが、Day 01 から Day 25 までの教材本文のどこにも `src/component/ui/password-input.tsx` を作る手順が無い。Day 25 は「再利用コンポーネントです」と紹介するだけで、作り方も配布物に入っている旨も書いていない。

**反証側が示した、成立しない根拠**

【引用の実在確認】day25_プロフィール編集.md:937-939 に確かに存在する。逐語:
```
import { PasswordInput }
  from '@/component/ui/password-input';
import { api } from '@/trpc/react';
```
直後 946-948 行に説明文もある:「> `PasswordInput` はパスワードの表示/非表示 / > トグル（Eye/EyeOff）を内蔵したコンポーネントです。 / > ページ側で `showPassword` を管理する必要がありません。」

【「作る手順が無い」は成立しない — 配布物で埋まっている】
1. 現物ファイルが配布物として存在する。`find` 結果: `./scripts/_ui-components/password-input.tsx`（および実装側 `./src/component/ui/password-input.tsx`）。
2. 販売パッケージ検査 scripts/curriculum-qa/check-sale-package.sh:117 に逐語 `"_ui-components/password-input.tsx"` が必須同梱物として列挙されている（同 57 行に `"_ui-components"` ディレクトリ自体も必須指定）。
3. scaffold が読者の `src/component/ui/` へ丸ごとコピーする。scripts/scaffold-from-scratch.sh:415 `local ui_src="${script_dir}/_ui-components"`、422 `mkdir -p src/component/ui`、423 `cp -r "$ui_src"/* src/component/ui/`、424 `echo "shadcn/ui コンポーネントを src/component/ui/ にコピーしました。"`。`cp -r *` なので password-input.tsx も当然入る。

【「配布物が読者へ渡ることが本文に書かれているか」も満たす】
- day01_開発環境を整えて、初めてのアプリを動かそう.md:268 逐語「bash scripts/scaffold-from-scratch.sh」で Day 01 Step 2 に実行手順がある。
- 同 day01:302 に、そのスクリプトの出力ログとして逐語「shadcn/ui コンポーネントを src/component/ui/ にコピーしました。」が本文に掲載されている。
- 同 day01:338 の「### 成功判定 次のファイルが見えていれば成功です。」リスト中に逐語「- `src/component/ui/button.tsx`」があり、UI 部品が実際に配置済みであることを読者が Day 01 時点で目視確認する構成になっている。
- さらに day08_サイドバーを完成させよう.md:1321 のトラブルシュート表に逐語「| `Cannot find module '@/component/ui/alert-dialog'` | UI コンポーネント未配置 | scaffold の `_ui-components/` が `src/component/ui/` にあるか確認 |」とあり、`_ui-components/` が読者の手元に渡っている前提が本文で明示されている。

【結論】読者は Day 01 の scaffold 実行時点で `src/component/ui/password-input.tsx` を既に持っている。Day 25 Step 6 で「Module not found: Can't resolve '@/component/ui/password-input'」は発生しない。指摘の前提（配布物に無い／本文に配布の記載が無い）が現物と食い違うため不成立。

### 消えた件 2. 行1593 プロフィール編集ページの写経で import を書いた時点で `normalizeAvatarValue` が見つからず

**逐語引用**

```
import { normalizeAvatarValue }
  from '@/lib/utils';
import { api } from '@/trpc/react';
```

**初心者役が挙げた詰まり**

プロフィール編集ページの写経で import を書いた時点で `normalizeAvatarValue` が見つからずエラーになり、Step 11 から先へ進めない。Step 12 の送信処理でも呼ぶので、避けて通れない。

**初心者役が挙げた不足**

`@/lib/utils` は Day 08・16・17 で `cn` のインポート先として出てくるだけで、`normalizeAvatarValue` を追加する手順が教材のどの日にも無い。Day 25 は「`@/lib/utils` にある関数です」と既存前提で書いているが、その前提が満たされていない。

**反証側が示した、成立しない根拠**

【引用の実在確認】material/30days-curriculum/day25_プロフィール編集.md:1593-1595 に逐語で存在。
1593: `import { normalizeAvatarValue }`
1594: `  from '@/lib/utils';`
1595: `import { api } from '@/trpc/react';`
また 1603行「> `normalizeAvatarValue` は `@/lib/utils` にある関数です。」、1738行 `avatar: normalizeAvatarValue(values.avatar),` も実在。指摘の引用自体は正しい。

【不足が埋まっているか — Day 01 の足場配布で埋まっている】
1. material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md:240 「## Step 2: scaffold-from-scratch.sh を走らせる」、同 267-268 の実行コマンドブロック:
   `chmod +x scripts/scaffold-from-scratch.sh`
   `bash scripts/scaffold-from-scratch.sh`
   → 足場スクリプトが読者へ渡り、読者自身が実行することが教材本文に明記されている（day01:23 のチェックリスト「`scripts/scaffold-from-scratch.sh` を実行して、土台を一発で作る」でも重複明記）。

2. scripts/scaffold-from-scratch.sh:427-441 `copy_lib_utils()`:
   431: `local utils_src="${script_dir}/_lib-utils"`
   438: `mkdir -p src/lib`
   439: `cp -r "$utils_src"/* src/lib/`
   → `scripts/_lib-utils/` の中身がそのまま `src/lib/` へコピーされる（= `@/lib/utils`）。

3. scripts/_lib-utils/utils.ts:1-11（逐語）:
   4: `export function cn(...inputs: ClassValue[]) {`
   8: `export function normalizeAvatarValue(avatar: string | null | undefined): string | null {`
   9: `  if (!avatar || avatar === '') return null;`
   10: `  return avatar;`
   → Day 01 の時点で `normalizeAvatarValue` は既に `src/lib/utils.ts` に存在する。

【結論】指摘は「`normalizeAvatarValue` を追加する手順が教材のどの日にも無い」と言うが、追加手順は「Day 01 で読者が自分で実行する scaffold スクリプトによる配布」という形で存在し、その配布は day01 本文（Step 2、行240/267-268）に明記されている。よって読者は Day 25 の import 行で止まらない。Day 25 が「`@/lib/utils` にある関数です」と既存前提で書いているのは事実と一致している。

なお `grep -rn "_lib-utils" material/` は 0 件で、_lib-utils という内部ディレクトリ名は本文に出てこないが、読者が実行するのはスクリプトであり、コピー元ディレクトリ名を知る必要はない。足場が読者へ渡ることは本文に書かれているという条件を満たす。

### 消えた件 3. 行1372 パスワード変更ページの Step 7・Step 8 では「画面での確認は Step 14 で行う」と繰り返し言われるので

**逐語引用**

```
- キャンセルの `onClick` に `/profile` への遷移が書けている
- 画面での確認は、`</form>` を書き終える Step 9 の動作確認で行う
```

**初心者役が挙げた詰まり**

パスワード変更ページの Step 7・Step 8 では「画面での確認は Step 14 で行う」と繰り返し言われるので、Step 9 を飛ばして編集ページへ進んでしまう。すると Step 14 の手順（`/profile/edit` の確認）にはパスワード変更を確かめる項目が無く、パスワード変更が動いているかを確かめる機会が消える。

**初心者役が挙げた不足**

同じ画面の確認先が Step 8 の中だけで「Step 9」と「Step 14」に割れている（1223・1268・1306 行は Step 14、1372 行だけ Step 9）。パスワード変更の動作確認は Step 9 なので、Step 14 と書いた3か所が誤り。

**反証側が示した、成立しない根拠**

現物を確認した結果、「表記の不統一」は実在するが、指摘が主張する「パスワード変更の動作確認の機会が消える」という詰まりは成立しない。

【引用が実在するかの確認】
- 1372行: 「- 画面での確認は、`</form>` を書き終える Step 9 の動作確認で行う」 → 実在（キャンセルボタンの確認ポイント末尾）
- 1223 / 1268 / 1306 / 1341 行: いずれも「- 画面での確認は、`</form>` を書き終える Step 14 の動作確認で行う」 → 実在。4か所とも Step 8（パスワード変更ページ）の中にある。
  よって「同じ Step 8 の中で確認先が Step 9 と Step 14 に割れている」という事実関係は正しい（1372だけ Step 9、他4か所が Step 14）。

【それでも詰まらない理由 — 同じファイル内で埋まっている】
- 1420行: 「### Step 9: パスワード変更の動作確認（3分）」が、問題の記述群（1223〜1372）の直後に順番どおり置かれている。読者は 1372 行の次の閉じタグ（1374〜1382行「// 閉じタグ」「</form>」）を書いた直後に、そのまま 1420 行の Step 9 見出しへ到達する。番号付き見出しを飛ばして先の Step へワープする動線は本文に存在しない。
- Step 9 の本文（1425〜1441行相当）には、パスワード変更の確認項目が11個並んでいる。逐語で「5. パスワード変更フォームに入力」「6. `Password1` で「特殊文字」不足を確認」「8. `Abc123!@` のような値で変更成功を確認」「11. 現在のパスワードにわざと違う文字列を入れて送信し、「現在のパスワードが正しくありません」が出る」。したがって「パスワード変更が動いているか確かめる機会が消える」は事実に反する。
- さらに 1454行に「> 「プロフィール編集」の遷移確認は、> 編集ページを作る Step 14 で行います。」があり、Step 14 が別画面（編集ページ）の確認であることが Step 9 の中で明示されている。読者が Step 14 を「この画面の確認先」と誤解したままにはならない。
- 97行「| Step 9 | パスワード変更の動作確認 | 3分 |」／102行「| Step 14 | 編集の動作確認 | 3分 |」の目次でも、両者の担当画面が区別されている。

【参考】1823 / 1853 / 1940 / 1973 行の「Step 14 の動作確認で行う」は編集ページ（Step 13〜14）側の記述で、こちらは正しい参照。

結論: 4か所の参照先番号は編集上の不統一として直す価値はあるが、読者が手を止める・確認機会を失うという詰まりは、直後の Step 9（1420行）とその11項目、および 1454行の注記で埋まっている。
