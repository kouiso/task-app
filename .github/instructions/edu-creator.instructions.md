---
applyTo: "**/edu-creator/**"
---

# edu-creator 開発ガイド（実装AI向け）

## 1. 基本概念：実装AI vs eduAI

### 定義

| 名称 | 役割 | 性質 |
|------|------|------|
| **実装AI** | 内田祐貴が使うAI。edu-creatorのコード・プロンプトを編集する | 外側のAI（ワークスペースレベル） |
| **eduAI** | CrewAI内のエージェント群。教材を生成する | 内側のAI（edu-creator内） |

### eduAIの構成

```
判断層（GPT-5.2）                作業層（Gemini Flash）
├─ ProductOwner              ├─ Scout（調査）
├─ ContentPM                 ├─ Scribe（執筆）
├─ QualityPM                 └─ Validator（検証）
└─ BeginnerAdvocate
```

---

## 2. 実装AIの心構え：方針重視 vs 細かい制御

### ✅ eduAIには「方針・考え方」を伝える

```python
# ✅ 良い例：自由度を与える
"""
You are FREE to create your own metaphors, but follow these rules:
1. Use everyday objects/experiences everyone knows
2. ONE concept = ONE metaphor (don't mix)
3. Reader should immediately think "Ah, I get it!"
"""

# ❌ 悪い例：細かく制御しすぎ
"""
Use EXACTLY these metaphors:
- Variable = 箱
- Function = 自動販売機
- Array = ロッカー
"""
```

### ✅ 「絶対守らせたいこと」だけ固定する

```python
# ✅ 絶対ルール（固定）
"""
【ABSOLUTE RULES】
- Code block limit: 25 lines
- Paragraph limit: 3 sentences
- Forbidden words: 「同様に」「以下略」「簡単です」
"""

# ❌ 創造的な部分まで固定しない
"""
必ず以下の順序で書くこと：
1. 🤔で始まる悩みセクション（100-150字）
2. 💡で始まる解決策セクション（200-300字）
"""
```

### 判断基準

| 種類 | 対応方法 | 例 |
|------|---------|-----|
| **品質基準** | 固定・厳密 | 禁止ワード、行数制限、テーブル数 |
| **構造・フォーマット** | ガイドライン | セクション構成、見出しルール |
| **創造的な部分** | 自由度を与える | メタファー選択、説明の言い回し |
| **技術的正確性** | 検証を義務付け | コマンド動作、コード存在確認 |

---

## 3. ファイル構成と役割

### メインファイル

| ファイル | 役割 | 編集頻度 | 注意点 |
|---------|------|---------|--------|
| `main.py` | メイン処理、エージェント生成、タスク生成 | 中 | CrewAI APIの最新仕様を確認 |
| `config_models.py` | Pydantic型安全検証 | 低 | 設定追加時は必ずここも更新 |
| `quality_checker.py` | 機械的な品質チェック | 中 | AIの判断に依存しない仕組み |
| `prompt/teaching.py` | 教育方針（メタファー、文体） | 低 | 全エージェントに影響 |
| `prompt/agent/*.py` | 各エージェントの役割 | 中 | 判断層と作業層の区別を明確に |
| `prompt/task/*.py` | 各タスクの指示 | **高** | 最頻編集ファイル |
| `prompt/task/quality_rules.py` | 品質ルール | **高** | 全生成物に影響 |

### 言語ルール（絶対遵守）

| 対象 | 言語 | 理由 |
|------|------|------|
| エージェント間コミュニケーション | **英語** | CrewAIの動作 |
| プロンプト本体 | **英語** | AIパフォーマンス最適化 |
| プロンプト内の日本語訳（docstring） | **日本語** | VS Codeホバー表示用 |
| 最終生成物（チュートリアル） | **日本語（です・ます調）** | 読者向け |
| 設定ファイル | **日本語混在OK** | 人間用 |
| Pythonコメント（except設定） | **日本語** | コード理解用 |

---

## 4. 品質ルールの徹底理解

### 禁止ワード（AIの「手抜き」検出）

```
❌ 「同様に」「同じように」「残りも」「以下略」
❌ 「簡単です」「すぐできます」「簡単に」
❌ 「など」「等」「その他」「以下同じ」

✅ 代わりに、具体的に全て書く
```

### コードブロック（上限25行）

```markdown
// filepath: src/components/Button.tsx  ← 必須
export const Button = () => {
  // 日本語コメント必須                    ← 必須
  return <button>Click</button>;
};
```

各ブロック直後に「確認ポイント」を記述：
```markdown
確認ポイント:
- ファイルを保存した
- npm run dev でエラーが出ていない
```

### 段落（上限3文）

```markdown
# ❌ 悪い例（4文）
文1。文2。文3。文4。

# ✅ 良い例（分割）
文1。文2。文3。

文4。
```

### ビジュアル化（1日あたり）

| 要素 | 最小 | 目安 | 目的 |
|------|------|------|------|
| テーブル | 4個 | 4-5個 | 比較・参照・トラブルシューティング |
| Mermaid図 | 1個 | 1-2個 | アーキテクチャ・フロー |
| スクリーンショット | 3箇所 | 3-5箇所 | 実行画面・エラー画面 |

### ステップ（1日 = 7〜12ステップ）

```markdown
### ステップ1 🧭: Node.jsのインストール（5分）

1. コマンドブロック
2. 何をしているか（What）
3. なぜ必要か（Why）
4. 期待される出力（Expected Output）
5. 失敗時の対処（最低2パターン）
```

**絶対ルール**:
- 1ステップ = 3〜7分
- 1ファイル = 1ステップまで

---

## 5. プロンプト編集時のパターン

### ✅ 良い例：方針ベース

```python
SCRIBE_BACKSTORY_TEMPLATE: str = """
You are Scribe, a former elementary school teacher.
Your gift: explaining complex concepts using everyday analogies.

【YOUR RESPONSIBILITIES】
1. Write tutorial based on Commander's outline
2. Use the EXACT metaphors from Teaching Methodology
3. Include REAL code from Scout's research
4. Make every sentence accessible to complete beginners

【CRITICAL LANGUAGE RULES】
- Planning/thinking: ENGLISH
- FINAL OUTPUT ONLY: Japanese (です・ます form)
- Example: "変数とは、データを入れておく箱のようなものです。"

{teaching_method}
"""
"""
あなたはScribe。元小学校教師で、テクニカルライターに転身した。
日常の例えを使って複雑な概念を説明する才能がある。

【あなたの責任】
...（日本語訳）
"""
```

### ❌ 悪い例：制御しすぎ

```python
SCRIBE_BACKSTORY = """
You MUST write each section exactly as follows:
1. Start with emoji exactly matching: 🤔 問題点
2. Write EXACTLY 150 characters
3. Then write 💡 解決策
4. Write EXACTLY 250 characters
...
"""
```

---

## 6. アーキテクチャ理解（必須）

### マルチPMタスクパイプライン

```
Phase 1: RESEARCH & PLANNING
├─ Task 1: Research (Scout)
└─ Task 2: Outline (ContentPM)

Phase 2: WRITING
└─ Task 3: Write (Scribe)

Phase 3: MULTI-PM REVIEW (並列可能)
├─ Task 4: Validation (Validator)
├─ Task 5: Content Review (ContentPM)
├─ Task 6: Quality Review (QualityPM)
└─ Task 7: Beginner Review (BeginnerAdvocate)

Phase 4: FINAL APPROVAL
└─ Task 8: ProductOwner Approval
```

### エージェント層の区別

```
判断層（有料・GPT-5.2）
└─ 品質判定、最終承認など高度な判断

↕ 指示・レポート

作業層（無料・Gemini Flash）
└─ リサーチ、執筆、検証など実行作業
```

---

## 7. Pydantic設定の理解

### ZodのsafeParser相当

```python
from config_models import validate_config

# 設定検証（TypeScript Zodと同じ概念）
success, config, error = validate_config(config_dict)
if not success:
    print(error)
    sys.exit(1)

# 検証済みなので型安全
max_iterations = config.safety.max_iterations  # int型確定
```

### 設定追加時の手順

1. `config_models.py`に型定義を追加
2. `main.py`の`DEFAULT_CONFIG`に値を追加
3. `config_models.py`を検証テスト

```python
# Before
config = yaml.load(f)

# After
success, config, error = validate_config(config_dict)
```

---

## 8. 品質チェッカーの仕組み

### 機械的チェック = AIの判断に依存しない

```python
class TutorialQualityChecker:
    def check_all(self) -> Dict:
        return {
            "markdown_format": ✅,      # 構文チェック
            "required_sections": ✅,    # セクション存在確認
            "code_blocks": ✅,          # 行数制限チェック
            "tables": ✅,               # テーブル数確認
            "step_by_step": ✅,         # ステップ詳細度確認
            "error_handling": ✅,       # エラー対処確認
            "technical_terms": ⚠️,      # 用語説明確認
            "explanation_depth": ✅,    # 説明深さ確認
            "sentence_length": ⚠️,      # 文長確認
            "emoji_usage": ✅,          # 絵文字使用状況
            "is_passed": True/False,
        }
```

**新しいチェック項目を追加する場合**:
1. `quality_checker.py`に`check_xxx()`メソッドを追加
2. `check_all()`に組み込む
3. Validatorエージェントが自動で使用

---

## 9. 編集時のワークフロー

### ✅ 必ず実施すること

```bash
# 1. 構文確認
python -c "import main; print('✅ Imports OK')"

# 2. ドライラン
python main.py --config edu-config.yaml --dry-run

# 3. 単章生成テスト
python main.py --config edu-config.yaml --chapters 1

# 4. 品質チェック確認
bash edu-creator/script/check_quality.sh material/30days-curriculum/day01*.md
```

---

## 10. 避けるべきパターン（実装AI向け）

### ❌ マイクロマネジメント

```python
# ❌ 悪い
"""
Step 1では必ず「こんにちは」で始めてください。
Step 2では必ず「さて」で始めてください。
"""

# ✅ 良い
"""
Use natural transitions between steps.
Consider using 「さて」（by the way）、「では」（now）
for smooth pacing.
"""
```

### ❌ 矛盾するルール

```python
# ❌ 悪い
"""
- 必ず具体例を3つ挙げてください
- 文章は簡潔に
- 初心者にもわかるよう詳しく説明
"""

# ✅ 良い
"""
Balance conciseness with clarity.
Use 1-2 concrete examples per section.
Prioritize: Clarity > Brevity
"""
```

### ❌ 「なぜ」を伝えずに「何を」だけ

```python
# ❌ 悪い
"""テーブルを4つ入れてください"""

# ✅ 良い
"""
【ビジュアル化ルール】
比較・参照・トラブルシューティングは表形式が効果的。
読者が「一覧で見たい」と思う情報は必ず表にする。
目安: 1日あたり最低4つのテーブル
"""
```

---

## 11. 設定ファイル（safety）の理解

| 設定 | デフォルト | 目的 |
|------|-----------|------|
| `max_iterations` | 3 | 無限ループ防止 |
| `max_rpm` | 10 | APIレート制限 |
| `timeout_seconds` | 1800 | タイムアウト防止 |
| `cost_confirmation_threshold_usd` | 1.0 | コスト確認 |

---

## 12. 禁止されるプログラミングパターン

### ❌ ハードコードされたパス

```python
# ❌ 悪い（eduAIの自律性を奪う）
target_dirs = ["src/app/", "src/components/"]

# ✅ 良い（eduAIが自律探索）
# Scout autonomously explores the codebase
```

### ❌ 固定メタファー辞書

```python
# ❌ 悪い
metaphors = {
    "Variable": "箱",
    "Function": "自動販売機",
}

# ✅ 良い
# AI chooses optimal metaphors based on context
```

### ❌ 英語コメント

```python
# ❌ 悪い
# This function creates agents

# ✅ 良い
# エージェントを作成する関数
```

---

## 13. 重要な変更時の注意

### `prompt/task/quality_rules.py`の変更

- **影響範囲**: 全ての生成物
- **変更前チェック**: 既存生成物への影響を検討
- **テスト**: テスト用edu-configで生成実行

### `prompt/task/write.py`の変更

- **影響範囲**: Scribeの出力フォーマット全体
- **注意**: EMOJI & HEADING RULESは厳密に守る
- **フォーマット**: セクション見出しの絵文字位置（先頭 or 末尾）

### エージェント追加時

```python
# 必ず同時に更新
1. main.py: create_agents()
2. main.py: create_tasks_for_chapter()
3. 判断層 or 作業層の明確化
4. prompt/agent/xxx.py の作成
```

### 設定追加時

```python
# 必ず同時に更新
1. config_models.py: 型定義追加
2. main.py: DEFAULT_CONFIG に値追加
3. README.md: ドキュメント更新
```

---

## 14. eduAIの自律性を尊重する理由

1. **創造性の発揮** - 固定しすぎるとテンプレ化して読者に飽きられる
2. **文脈適応** - 章ごとに最適なアプローチは異なる
3. **品質向上** - AIが「なぜこうするのか」を理解していれば、より良い判断ができる
4. **メンテナンス性** - ルールベースなら変更が容易

---

## 15. まとめ：実装AIの心構え

### ✅ やること

- 方針・考え方を伝える
- 「なぜ」を説明する
- eduAIに創造的な部分の自由度を与える
- 品質基準だけ厳密に固定する
- 機械的チェック（quality_checker）を活用

### ❌ やらないこと

- 一挙一動を制御する
- 矛盾するルールを乱立させる
- 「何を」だけで「なぜ」を伝えない
- 創造的な部分まで細かく指定する
- 機械的チェックで対応できることをプロンプトで手作業させる

