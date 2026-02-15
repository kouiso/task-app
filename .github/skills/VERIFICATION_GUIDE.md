# GitHub Copilot Agent Skills 動作確認ガイド

このドキュメントは、`.github/skills/` に配置したAgent Skillsが正しく動作するかを確認するためのガイドです。

## 前提条件

- VS Code Insiders がインストールされている
- GitHub Copilot の拡張機能が有効になっている
- GitHub Copilot Chat が使用可能な状態

## 確認手順

### 1. スキルの読み込み確認

#### 手順
1. VS Code Insiders でこのプロジェクトを開く
2. Copilot Chat を起動（`Ctrl+Shift+I` または `Cmd+Shift+I`）
3. 以下のコマンドを入力:
   ```
   @copilot /help
   ```

#### 期待される結果
- コンソールに "Loading skills from .github/skills/..." のようなメッセージが表示される
- または、利用可能なスキル一覧が表示される

#### トラブルシューティング
表示されない場合:
- VS Code Insiders を再起動
- SKILL.md ファイルのYAMLフロントマターが正しいか確認
- ファイル名が `SKILL.md` (大文字) になっているか確認

### 2. 各スキルの動作確認

#### 2.1. create-learning-materials スキル

**テスト1: 教材作成の依頼**
```
@copilot Day 1の環境構築の教材を作成してください
```

**期待される動作**:
- 21日間の学習教材形式で応答
- Day 1に適した内容（環境構築、セットアップ）
- 段階的なステップで構成
- 初心者向けの丁寧な説明

**テスト2: 技術スタックの確認**
```
@copilot このプロジェクトで使用している技術スタックを教えてください
```

**期待される動作**:
- Next.js 15, TypeScript, tRPC, Prisma, shadcn/ui などを含む
- バージョン情報も含まれている

#### 2.2. follow-coding-guidelines スキル

**テスト1: コーディング規約の確認**
```
@copilot このプロジェクトのファイル命名規則を教えてください
```

**期待される動作**:
- ケバブケース（英語単数形）の説明
- 良い例と悪い例の提示
- Reactコンポーネントの命名規則

**テスト2: コード生成**
```
@copilot タスク一覧を表示するコンポーネントを作成してください
```

**期待される動作**:
- ファイル名がケバブケース（例: `task-list.tsx`）
- コンポーネント名がPascalCase（例: `TaskList`）
- 日本語のコメント
- Next.js App Router準拠

**テスト3: 豆知識の表示**
```
@copilot tRPCについて教えてください
```

**期待される動作**:
- 回答の最後に「💡 豆知識:」セクションがある
- 技術的な豆知識が1〜3文で記載されている

#### 2.3. fix-lint-errors スキル

**テスト1: リントエラー修正の依頼**
```
@copilot リントエラーを修正してください
```

**期待される動作**:
- Biomeコマンドの使用を提案
- `npm run lint:fix` の実行を提案
- よくあるエラーと修正方法の説明

**テスト2: スクリプトの存在確認**
```
@copilot リント修正を自動化するスクリプトはありますか？
```

**期待される動作**:
- `.github/skills/fix-lint-errors/script.sh` の存在を認識
- スクリプトの使用方法を説明

#### 2.4. update-documentation スキル

**テスト1: ドキュメント更新の依頼**
```
@copilot 新しい認証機能を追加したので、README.mdを更新してください
```

**期待される動作**:
- Markdown形式での更新提案
- 適切なセクションへの追加
- 初心者にも分かりやすい説明

**テスト2: ドキュメント構造の確認**
```
@copilot このプロジェクトのドキュメント構造を教えてください
```

**期待される動作**:
- README.md, doc/onboarding.md, doc/dev-guide.md などの説明
- 各ドキュメントの目的と更新タイミング

### 3. スキルの統合確認

#### テスト: 複数のスキルを組み合わせた依頼
```
@copilot タスク削除機能を実装して、その教材を作成し、ドキュメントも更新してください
```

**期待される動作**:
- コーディング規約に従った実装コード
- 学習教材形式の説明
- ドキュメント更新の提案
- すべて日本語で応答

### 4. スキルのdescription適合性確認

各スキルが適切なタイミングで呼び出されるか確認します。

#### 4.1. create-learning-materials が呼ばれるべきケース
✅ "教材を作成して"
✅ "Day 5の内容を書いて"
✅ "初心者向けに説明して"
✅ "段階的な手順を作成して"

#### 4.2. follow-coding-guidelines が呼ばれるべきケース
✅ "規約に従って書き直して"
✅ "ファイル名は正しい？"
✅ "型安全なコードにして"
✅ "App Routerで実装して"

#### 4.3. fix-lint-errors が呼ばれるべきケース
✅ "リントエラーを修正して"
✅ "コードをフォーマットして"
✅ "不要なimportを削除して"

#### 4.4. update-documentation が呼ばれるべきケース
✅ "READMEを更新して"
✅ "ドキュメントに追加して"
✅ "開発ガイドを修正して"

## 確認完了のチェックリスト

- [ ] `@copilot /help` でスキルが読み込まれている
- [ ] create-learning-materials スキルが正常に動作する
- [ ] follow-coding-guidelines スキルが正常に動作する
- [ ] fix-lint-errors スキルが正常に動作する
- [ ] update-documentation スキルが正常に動作する
- [ ] 複数のスキルを組み合わせた依頼が動作する
- [ ] すべての応答が日本語で返ってくる
- [ ] 豆知識モードが機能している（該当スキル使用時）
- [ ] スクリプトが実行可能（fix-lint-errors/script.sh）

## 問題が発生した場合

### スキルが読み込まれない
1. ファイル名が `SKILL.md` (大文字) か確認
2. YAMLフロントマターの形式が正しいか確認
3. VS Code Insiders を再起動

### スキルが期待通りに動作しない
1. `description` フィールドに適切なキーワードが含まれているか確認
2. スキルの内容が明確に記述されているか確認
3. 複雑すぎる指示を避け、シンプルで具体的な指示にする

### スクリプトが実行できない
```bash
chmod +x .github/skills/fix-lint-errors/script.sh
```

## フィードバック

動作確認の結果、改善点や問題点があれば、Issueまたはプルリクエストで報告してください。

## 関連ドキュメント

- [.github/skills/README.md](./README.md) - スキルの使用方法
- [GitHub Copilot Agent Skills Documentation](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-agent-skills)
