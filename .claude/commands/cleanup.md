# /cleanup - ゾンビプロセス一掃・PCサクサク化

**Claude Code使用中に溜まるゾンビプロセスを一掃し、PCをサクサクにする。**

## 目的

Claude Codeで並行作業を行っていると、バグによりゾンビプロセスが溜まってPCが重くなることがある。このエイリアスで定期的にクリーンアップする。

## 実行時の振る舞い

1. **ゾンビプロセスの検出**
   - 状態が `Z`（zombie）または `defunct` のプロセス
   - MCPサーバー関連のゾンビ（`mcp-server-*`, `@anthropic/mcp`等）
   - Claude Code関連の孤立プロセス
   - 親プロセスが死んでいる孤児Node.jsプロセス

2. **検出結果の提示**
   - kill対象のプロセス一覧を表示
   - 各プロセスのPID、コマンド名、CPU/メモリ使用率を表示

3. **ユーザー確認（必須）**
   - 「これらをkillしますけどええですか？」と確認
   - **ユーザーの許可を得てから実行**（確認なしkill絶対禁止）

4. **kill実行**
   - 許可されたプロセスのみkill
   - 結果を報告

## 対象プロセス

| カテゴリ | 検出パターン |
|---------|-------------|
| ゾンビ | 状態が `Z` または `defunct` |
| MCPサーバー | `mcp-server-*`, `@anthropic/mcp`, `npx.*mcp` |
| Claude Code | `claude` コマンドの孤立子プロセス |
| Node.js孤児 | 親がinit(1)のNode.jsプロセス |

## 検出コマンド例

```bash
# ゾンビプロセス確認
ps aux | grep -E 'Z|defunct' | grep -v grep

# MCPサーバー関連
ps aux | grep -E 'mcp-server|@anthropic/mcp|npx.*mcp' | grep -v grep

# 重いプロセス確認（CPU/メモリ使用率高いやつ）
ps aux --sort=-%cpu | head -20
```

## 注意事項

- **確認なしのkillは絶対禁止** → 必ずユーザーに確認
- **重要プロセスの誤killを防ぐ** → システムプロセスは対象外
- **定期実行推奨** → 重い作業の後や、PCが遅くなった時に実行
