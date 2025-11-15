# Claude Code Devcontainer セットアップ

このプロジェクトでは、Claude Codeを安全にコンテナ内で実行できる環境を構築しています。

## 🎯 目的

`--dangerously-skip-permissions`フラグを使って、許可を毎回求められずに自動でコーディングできる環境を提供します。

## 📋 必要なもの

- **Docker Desktop** または **Docker Engine**（インストール済みであること）
- **VS Code**
- **Remote - Containers拡張機能**（VS Codeにインストール）
- **Claude Pro/Team サブスクリプション**（アカウントでログイン方式）

## 🚀 使い方

### 1. コンテナで開く

1. VS Codeでこのプロジェクトを開く
2. コマンドパレットを開く（`Ctrl+Shift+P` / `Cmd+Shift+P`）
3. **"Dev Containers: Reopen in Container"** を選択
4. コンテナのビルドと起動を待つ（初回は数分かかります）

### 2. 初回ログイン（初回のみ）

コンテナ内のターミナルで：

```bash
claude
```

ブラウザで認証URLが開くので、Claude Pro/Teamアカウントでログインします。

**認証情報はホストマシンと共有されるので、一度ログインすれば次回からは不要です！**

### 3. Claude Codeを実行

ログイン後、以下を実行：

```bash
claude --dangerously-skip-permissions
```

これで、許可なしで自動コーディングが可能になります！

## ⚙️ 設定内容

### devcontainer.json
- Claude Code拡張機能を自動インストール
- ESLint、Prettier、GitLensも含む
- コマンド履歴を永続化
- **ホストの`~/.claude`フォルダをマウント**（認証情報を共有）
- **ホストの`~/.claude.json`をマウント**（MCP設定を共有）
- **ホストの`~/.mcp-servers`をマウント**（MCPサーバー本体を共有）
- **ホストの`~/.gitconfig`と`~/.ssh`をマウント**（コンテナ内でもgit操作可能）

### Dockerfile
- Node.js 20ベース
- 必要な開発ツールをインストール
- ZSH + Powerline10kテーマ
- Claude Code CLIをグローバルインストール

### init-firewall.sh
- **外部リクエストを全て許可**（npm install等が可能）
- Dockerの内部DNS解決を維持
- ネットワーク接続を検証

## 🔒 セキュリティ

このセットアップでは：
- ✅ ホストシステムから隔離されたコンテナ内で実行
- ✅ 問題が起きてもコンテナを削除すれば元に戻る
- ✅ 外部リクエストは全て許可（開発に必要なため）
- ✅ 認証情報（`~/.claude`）はホストと共有（一度ログインすれば再利用可能）

## 💡 トラブルシューティング

### コンテナがビルドできない
- Dockerが起動しているか確認
- ディスク容量があるか確認

### Claude Codeが動かない
- コンテナ内で `claude` を実行してログインしているか確認
- ホストマシンの `~/.claude` フォルダが存在するか確認
- 認証が切れている場合は `claude` を再実行してログイン

### MCP設定が引き継がれない

**診断方法：**
```bash
bash /workspace/.devcontainer/diagnose.sh
```

**一時的な対処：MCPサーバーを一括追加**
```bash
bash /workspace/.devcontainer/setup-mcp.sh
```

このスクリプトは以下のMCPサーバーを一気に追加します：
- github-remote (HTTP transport)
- serena, vscode, chrome-devtools, playwright, puppeteer
- tavily, filesystem, mobile-mcp
- **figma** (thirdstrandstudio製 - 全Figma APIメソッド実装、31+ツール)
- sqlite, github, notion, gdrive, postgres

**注意：**
- API keyなどは環境に合わせて`setup-mcp.sh`を編集してください
- Figma API tokenは[こちら](https://www.figma.com/developers/api#access-tokens)から取得

### ネットワークエラー
- init-firewall.shのログを確認
- ファイアウォール設定が正しく適用されているか確認

## 📚 参考資料

- [Claude Code 公式ドキュメント](https://code.claude.com/docs/en/devcontainer)
- [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
