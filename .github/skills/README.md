# GitHub Copilot Agent Skills

このディレクトリには、TaskAppプロジェクト固有のGitHub Copilot Agent Skillsが含まれています。

## スキル一覧

### 1. create-learning-materials
**目的**: TaskAppの21日間学習教材を作成

**使用場面**:
- 新しい学習教材を作成する時
- 既存の教材を改善する時
- 初心者向けの技術解説を書く時

**例**:
```
@copilot Day 5の教材を作成してください
```

### 2. follow-coding-guidelines
**目的**: プロジェクト固有のコーディング規約に従う

**使用場面**:
- 新しいコードを書く時
- コードレビューを受ける時
- 既存コードをリファクタリングする時

**例**:
```
@copilot このコンポーネントをプロジェクトの規約に従って書き直してください
```

### 3. fix-lint-errors
**目的**: Biomeを使用したリント・フォーマットエラー修正

**使用場面**:
- リントエラーが発生した時
- コードのフォーマットを統一したい時
- コミット前にコードをきれいにしたい時

**例**:
```
@copilot リントエラーを修正してください
```

**スクリプト**: `script.sh` を実行すると、リント・フォーマットを自動実行できます
```bash
.github/skills/fix-lint-errors/script.sh
```

### 4. update-documentation
**目的**: プロジェクトドキュメントの更新

**使用場面**:
- 新機能を追加した時
- セットアップ手順が変わった時
- README.mdを更新する時

**例**:
```
@copilot この新機能についてREADME.mdを更新してください
```

## スキルの構造

各スキルは以下の構造を持ちます:

```
skill-name/
├── SKILL.md      # 必須: スキルの指示内容
└── script.sh     # 任意: 自動実行スクリプト
```

### SKILL.md の形式

```markdown
---
name: skill-name
description: スキルの説明（Copilotがいつこのスキルを使うか判断するための情報）
---

# スキルのタイトル

スキルの詳細な説明...
```

## 動作確認方法

### VS Code Insiders / Copilot Chat で確認

1. VS Code Insidersを開く
2. Copilot Chatを起動
3. `@copilot /help` と入力
4. "Loading skills from .github/skills/..." と表示されればOK

### スキルが正しく読み込まれたか確認

Copilot Chatで以下のように質問してみてください:

```
@copilot 利用可能なスキルを教えてください
```

または、直接スキルを使用してみます:

```
@copilot 教材を作成してください
@copilot コーディング規約を教えてください
@copilot リントエラーを修正してください
```

## スキルの追加方法

1. 新しいディレクトリを作成
```bash
mkdir -p .github/skills/new-skill-name
```

2. SKILL.md を作成
```bash
touch .github/skills/new-skill-name/SKILL.md
```

3. SKILL.md の内容を記述
```markdown
---
name: new-skill-name
description: 新しいスキルの説明
---

# 新しいスキル

スキルの詳細...
```

4. 必要に応じてスクリプトを追加
```bash
touch .github/skills/new-skill-name/script.sh
chmod +x .github/skills/new-skill-name/script.sh
```

## 参考資料

- [GitHub Copilot Agent Skills Documentation](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-agent-skills)
- [CodeZine ニュース記事](https://codezine.jp/article/detail/20247)

## トラブルシューティング

### スキルが読み込まれない

1. SKILL.md のYAMLフロントマターが正しいか確認
2. ファイル名が `SKILL.md` (大文字) になっているか確認
3. VS Code Insidersを再起動してみる

### スキルが期待通りに動作しない

1. `description` フィールドに適切なキーワードが含まれているか確認
2. スキルの内容が明確に記述されているか確認
3. 複雑すぎる指示を避け、シンプルで具体的な指示にする
