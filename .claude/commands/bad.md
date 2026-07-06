# /bad — 悪い挙動を捕獲・強制化

**役割境界**

| コマンド | 役割 | コスト |
|---|---|---|
| `/bad` `/good` | **捕獲**: 単一挙動 → Gate ルーティング → 強制 → 報告 | light |
| `/rules-distill` | **統合**: 2+ スキルに跨る原則を抽出し rule 昇格（定期） | heavy |
| `/skill-stocktake` | **監査**: 品質 + 重複 + retire/merge（定期） | heavy |

**許可待ちなし。`/bad` は常時承認。実施して報告。**

---

## Gate ルーティング（上から順に評価、最初に一致したところで止まる）

```
corpus scan → Gate0 → Gate1 → Gate2 → Gate3
```

### Corpus Scan（全 Gate 共通・最初に必ず実行）

```bash
grep -r "<2〜4語キーワード>" ~/.claude/rules/ ~/.claude/skills/*/SKILL.md 2>/dev/null
```

ヒットしたファイルのみ Read で精読。読まずに「カバー済み」と断定しない（no-effect-speculation）。

---

### Gate0: 既存ルールがあるのに破られた = プロンプト設計の失敗

corpus scan ヒットを精読 + 再犯チェック（`grep "<キーワード>" ~/.claude/hooks/state/bad-capture.log`）。

**ヒットした = ルールはあったのに破られた = そのプロンプトは効いていない（証明済み）。**
「カバー済みだから文言を足して終了」は禁止（希釈エンジン）。「とりあえず hook 化」も禁止。
失敗種別を判定する（enforcement-must-match-failure-type）:

- **A. 決定論系**（tool 呼び出し / テキストから機械検出可能）→ Gate1 へ。
- **B. 判断系**（意味理解が必要）→ 強制再設計。hook 厳禁。
  「なぜ効かなかったか」を1つ診断してから、種別に合った直し方を選ぶ:

  | 診断 | 直し方 |
  |---|---|
  | 埋もれていた | `00-core-ranked.md` で順位 / 配置を上げる（salience） |
  | 曖昧だった | 具体パターン / 閾値 / worked-example で先鋭化 |
  | 矛盾していた | 競合ルールを surface して解消 |
  | 冗長で薄かった | 周辺の重複を削り、信号対雑音比を上げる |

  ⚠ 削除規律: 「足すだけ」を禁止。先鋭化で行が増えるなら、同じ diff 内で
     周辺の重複 rule / skill 行を削除 or 統合する（空白でなく意味行を削る）。
     削除は K1/K2/K3（後述・Track C 規律）に従う。netΔ は当該 rule ファイルの `wc -l` 差で記録。

  ログ（判断系・再設計）:
  `echo "$(date -Iseconds) | GATE0-REDESIGN | <診断種別>: <パターン> | netΔ=<行数差>" >> ~/.claude/hooks/state/bad-capture.log`

- **corpus scan ヒットなし（真に新規）** → Gate1 へ。

---

### Gate1: 決定論的強制可能か？

tool 呼び出しパターンで機械的に検出できるか:
- Bash コマンド内容・引数
- Edit / Write / MultiEdit のパス or 内容
- Stop hook のタイミング
- UserPromptSubmit テキスト

- **YES** → hook を第一成果物として作成。散文ルールは副次的（説明用のみ）。
  1. `~/.claude/hooks/<name>.sh` 作成（hook-writing-safety 準拠）
  2. `~/.claude/settings.json` に登録
  3. FP テスト3件 + block テスト1件を実行して証拠を取る
  4. 報告
  5. ログ記録: `echo "$(date -Iseconds) | GATE1 | <パターン>" >> ~/.claude/hooks/state/bad-capture.log`
  6. `post-prompt-edit-sync` で macmini/Windows/claude.ai 伝播

  ⚠️ 「false positive リスクがあるので散文のみ」は禁止句。FP を最小化して hook を作れ。
  ⚠️ hook は**非ブロッキング既定**（検出 → stderr 警告 + ログ、exit 0）。hard-block（exit 2）は kouiso の明示承認時のみ。
     「本質的ちゃう / 他作業を止める hook の作りすぎ」自体が病気。FP を最小化し、停止させない形を第一候補にせよ。

- **NO** → Gate2 へ。

---

### Gate2: 判断系か？

- **YES** → 最小原則に般化し、1行ポインタ（always）＋詳細（skill）のハイブリッドへ。
  1. `~/.claude/rules/<slug>.md` に 1行ポインタ（≤8行）を作成
     - 内容: NEVER/WHEN/BECAUSE + 発火条件のみ
  2. `~/.claude/skills/<slug>/SKILL.md` に詳細・例・バックグラウンドを書く
  3. ログ記録: `echo "$(date -Iseconds) | GATE2 | <パターン>" >> ~/.claude/hooks/state/bad-capture.log`
  4. `post-prompt-edit-sync` で伝播

  ⚠️ rules/ 本体に詳細を詰め込まない。ポインタ（≤8行）のみ always ロード。

---

### Gate3: 常時ロードへのフルコンテンツ追加（最終関門）

rules/ ファイルに 30行超の内容を常時ロードとして追加する場合のみ到達。

- **net-zero 予算制**: 1ファイル追加なら既存1ファイルを削除または skill 降格（同セッション内）
- **30行超**: AskUserQuestion で kouiso の明示承認を取ってから実施

---

## Quality Gate（Gate1/2/3 実装前の必須チェック）

Gate1/Gate2/Gate3 で新規 hook または rule を作成する前に全チェックをパスせよ。

| チェック | 問い | NO → 修正 |
|---|---|---|
| 再現性 | 別の AI でもこのルールで同じ挙動を避けられるか？ | 曖昧な禁止（「悪いことをするな」）を除去し具体パターン/例を追加 |
| 定量性 | 違反を boolean または閾値で検出できるか？ | 検出可能な基準を定義（「`--no-verify` を含む」など） |
| 意味構造 | NEVER/WHEN/BECAUSE 形式か？ | `NEVER [行動] WHEN [条件] BECAUSE [理由]` に書き直す |
| 確信度 | この挙動が常に悪いと確信できるか？ | High / Medium / Low を割り当て。Low なら例外条件を追加（一律禁止にしない） |
| False Positive リスク | このルールで正当なユースケースがブロックされるか？ | 明示的な例外を定義する。有効な作業をブロックするルールはルールがないより悪い |

---

## 横断ルール

| ルール | 内容 |
|---|---|
| 許可待ち廃止 | `/bad` は常時承認。実施して報告（AskUserQuestion は Gate3 追加時のみ） |
| 儀式廃止 | corpus scan → Gate ルーティング → 強制実装 → 報告のみ |
| 単一ソース | abeja hub の `prompt/commands/bad.md` が正本。全リポは symlink |
| FROZEN 保護 | `prohibitions-core-*.md` / `> **FROZEN**` バナー付きファイルへの追記は hook がブロック |
| 矛盾検出 | 既存ルールと衝突する場合は silent 追記せず衝突を surface する |

---

## 既存 Hook 参照

| Hook | トリガー | 強制内容 |
|---|---|---|
| `git-safety.sh` | PreToolUse Bash | --no-verify, git reset, --force |
| `file-safety.sh` | PreToolUse Write\|Edit | バックアップファイル, ESLint 設定保護 |
| `post-edit-check.sh` | PostToolUse Edit\|Write | console.log, debugger, any 型, @ts-ignore |
| `validate-pr-body.sh` | PostToolUse Bash | PR テンプレート準拠 |
| `block-frozen-rule-growth.sh` | PreToolUse Edit\|Write\|MultiEdit | FROZEN ファイルへの積み増し禁止 |

---

## 完了ゲート（報告直前・スキップ不可）

`/bad` の完了報告は、次を満たして初めて成立する（モデルの遵守でなくツール境界で強制）:

```bash
bash ~/.claude/hooks/bad-discipline-check.sh
```

を実行し、**出力の `PASS` 行を完了報告の証拠としてそのまま貼る**。
`exit≠0`（FAIL）なら完了報告は禁止。FAIL 項目を直して再実行せよ。PASS 行が無い完了報告は無効。
