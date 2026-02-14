---
name: OpenSpec: Apply
description: Implement an approved OpenSpec change and keep tasks in sync.
category: OpenSpec
tags: [openspec, apply]
---
<!-- OPENSPEC:START -->
**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
<!-- シンプルで最小限の実装を優先 -->
- Keep changes tightly scoped to the requested outcome.
<!-- 変更は要求された成果に厳密にスコープを絞る -->
- Refer to `openspec/AGENTS.md` (located inside the `openspec/` directory—run `ls openspec` or `openspec update` if you don't see it) if you need additional OpenSpec conventions or clarifications.
<!-- 追加のOpenSpec規約が必要な場合はopenspec/AGENTS.mdを参照 -->

**Steps**
Track these steps as TODOs and complete them one by one.
<!-- これらのステップをTODOとして追跡し、1つずつ完了 -->

1. Read `changes/<id>/proposal.md`, `design.md` (if present), and `tasks.md` to confirm scope and acceptance criteria.
<!-- proposal.md、design.md（存在する場合）、tasks.mdを読んでスコープと受入基準を確認 -->
2. Work through tasks sequentially, keeping edits minimal and focused on the requested change.
<!-- タスクを順次処理し、編集を最小限に保ち要求された変更に集中 -->
3. Confirm completion before updating statuses—make sure every item in `tasks.md` is finished.
<!-- ステータス更新前に完了を確認—tasks.mdの全項目が完了していることを確認 -->
4. Update the checklist after all work is done so each task is marked `- [x]` and reflects reality.
<!-- 全作業完了後にチェックリストを更新し、各タスクを完了マーク -->
5. Reference `openspec list` or `openspec show <item>` when additional context is required.
<!-- 追加コンテキストが必要な場合はopenspecコマンドを参照 -->

**Reference**
- Use `openspec show <id> --json --deltas-only` if you need additional context from the proposal while implementing.
<!-- 実装中に提案から追加コンテキストが必要な場合は詳細を確認 -->
<!-- OPENSPEC:END -->
