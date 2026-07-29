# ROLLBACK: material-writing-gate

教材ファイルへの書き込みが止まって進めなくなったときの戻し方。上から順に、
軽いものから並べてある。

## 1. その場で1回だけ通したい

Skill ツールで `material-writing` を読み込む。これが本来の逃げ道で、
読み込んだセッションでは以後の教材編集が通る。

## 2. このセッションだけ、ゲートごと切りたい

リポジトリ直下に空ファイルを置く。

```bash
touch .claude/disable-material-writing-gate
```

置いてある間、ゲートは何も判定せずに通す。消せば元に戻る。
このファイルは `.gitignore` に入れてあるのでコミットされない。

## 3. ゲート自体を外したい

`.claude/settings.json` の `hooks.PreToolUse` から、`matcher` が `Write` と `Edit` の
それぞれについて、次の1行を含む要素を消す。

```json
{"type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/material-writing-gate.sh"}
```

同じファイルの `hooks.PostToolUse` から、`matcher` が `Skill` のブロックごと消す。

```json
{"matcher": "Skill", "hooks": [{"type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/material-writing-skill-marker.sh"}]}
```

Claude Code を再起動する。

## 4. スクリプトも消したい

```bash
rm .claude/hooks/material-writing-gate.sh .claude/hooks/material-writing-skill-marker.sh
```

同じディレクトリの `material-writing-reminder.sh` は別物なので残してよい。
あちらは書いたあとに手順を注入する安全網で、書き込みを止めない。

## 何が起きるとゲートが発動するか

3つが同時に成り立ったときだけ拒否する。

1. 書き込み先が `material/` 配下の `.md`
2. そのセッションで `material-writing` を一度も読み込んでいない
3. `.claude/disable-material-writing-gate` が置かれていない

1つでも外れれば素通りする。判定に必要な材料が取れないとき
（`jq` が無い、payload が壊れている、セッションIDが取れない）も素通りする。
復旧手段まで塞がないためである。

## 印の置き場所

`${TMPDIR:-/tmp}/task-app-material-writing-loaded/<セッションID>` に空ファイルを置く。
リポジトリの中には何も書かない。手で印を置いてゲートを通すこともできる。

```bash
mkdir -p "${TMPDIR:-/tmp}/task-app-material-writing-loaded"
touch "${TMPDIR:-/tmp}/task-app-material-writing-loaded/<セッションID>"
```
