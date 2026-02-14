---
name: OpenSpec: Archive
description: Archive a completed OpenSpec change and merge deltas into specs.
category: OpenSpec
tags: [openspec, archive]
---
<!-- OPENSPEC:START -->
**Guardrails**
- Only archive changes that have been deployed and confirmed working in production.
<!-- デプロイ済みで本番環境で動作確認済みの変更のみアーカイブ -->
- Ensure all tasks in `tasks.md` are marked complete before archiving.
<!-- アーカイブ前にtasks.mdの全タスクが完了マークされていることを確認 -->
- Refer to `openspec/AGENTS.md` for additional conventions.
<!-- 追加規約はopenspec/AGENTS.mdを参照 -->

**Steps**
Track these steps as TODOs and complete them one by one.
<!-- これらのステップをTODOとして追跡し、1つずつ完了 -->

1. Verify the change is deployed and working:
   <!-- 変更がデプロイ済みで動作していることを確認 -->
   - Check that all tasks in `changes/<id>/tasks.md` are marked `[x]`
   <!-- tasks.mdの全タスクが完了マークされていることを確認 -->
   - Confirm the feature is live in production
   <!-- 機能が本番環境で稼働していることを確認 -->

2. Merge spec deltas into main specs:
   <!-- スペックデルタをメインスペックにマージ -->
   - For each `changes/<id>/specs/<capability>/spec.md`:
     <!-- 各スペックデルタについて -->
     - Apply ADDED requirements to `openspec/specs/<capability>/spec.md`
     <!-- ADDED要件を適用 -->
     - Update MODIFIED requirements in place
     <!-- MODIFIED要件を更新 -->
     - Remove REMOVED requirements
     <!-- REMOVED要件を削除 -->
   - Ensure scenarios are preserved
   <!-- シナリオが保持されていることを確認 -->

3. Move change to archive:
   <!-- 変更をアーカイブに移動 -->
   - Create `openspec/changes/archive/` if it doesn't exist
   <!-- アーカイブディレクトリを作成（存在しない場合） -->
   - Move `changes/<id>/` to `changes/archive/YYYY-MM-DD-<id>/`
   <!-- 変更をアーカイブに移動 -->

4. Validate the final state:
   <!-- 最終状態を検証 -->
   - Run `openspec validate --strict --no-interactive`
   <!-- openspec validateを実行 -->
   - Ensure no broken references or missing scenarios
   <!-- 壊れた参照や欠落したシナリオがないことを確認 -->

5. Create archive commit:
   <!-- アーカイブコミットを作成 -->
   - Commit with message: `chore(openspec): archive <id>`
   <!-- コミットメッセージ形式 -->

**Reference**
- Use `openspec archive <change-id> --skip-specs --yes` for tooling-only changes that don't affect specs.
<!-- スペックに影響しないツーリングのみの変更には --skip-specs を使用 -->
- For changes that only modified implementation without spec changes, use `--skip-specs`.
<!-- スペック変更なしの実装のみの変更には --skip-specs を使用 -->
<!-- OPENSPEC:END -->
