---
name: OpenSpec: Proposal
description: Scaffold a new OpenSpec change and validate strictly.
category: OpenSpec
tags: [openspec, change]
---
<!-- OPENSPEC:START -->
**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
<!-- シンプルで最小限の実装を優先し、要求されるか明らかに必要な場合のみ複雑性を追加 -->
- Keep changes tightly scoped to the requested outcome.
<!-- 変更は要求された成果に厳密にスコープを絞る -->
- Refer to `openspec/AGENTS.md` (located inside the `openspec/` directory—run `ls openspec` or `openspec update` if you don't see it) if you need additional OpenSpec conventions or clarifications.
<!-- 追加のOpenSpec規約や明確化が必要な場合はopenspec/AGENTS.mdを参照 -->
- Identify any vague or ambiguous details and ask the necessary follow-up questions before editing files.
<!-- 曖昧な詳細を特定し、ファイル編集前に必要なフォローアップ質問を行う -->
- Do not write any code during the proposal stage. Only create design documents (proposal.md, tasks.md, design.md, and spec deltas). Implementation happens in the apply stage after approval.
<!-- 提案段階ではコードを書かない。設計ドキュメントのみ作成。実装は承認後のapplyステージで行う -->

**Steps**
1. Review `openspec/project.md`, run `openspec list` and `openspec list --specs`, and inspect related code or docs (e.g., via `rg`/`ls`) to ground the proposal in current behaviour; note any gaps that require clarification.
<!-- project.mdをレビューし、openspecコマンドで現在の状態を確認、関連コードを調査 -->
2. Choose a unique verb-led `change-id` and scaffold `proposal.md`, `tasks.md`, and `design.md` (when needed) under `openspec/changes/<id>/`.
<!-- ユニークな動詞先頭のchange-idを選択し、必要なファイルをスキャフォールド -->
3. Map the change into concrete capabilities or requirements, breaking multi-scope efforts into distinct spec deltas with clear relationships and sequencing.
<!-- 変更を具体的な機能や要件にマッピングし、複数スコープの作業を明確な関係と順序を持つスペックデルタに分割 -->
4. Capture architectural reasoning in `design.md` when the solution spans multiple systems, introduces new patterns, or demands trade-off discussion before committing to specs.
<!-- 複数システムにまたがる場合やトレードオフの議論が必要な場合はdesign.mdにアーキテクチャ根拠を記録 -->
5. Draft spec deltas in `changes/<id>/specs/<capability>/spec.md` (one folder per capability) using `## ADDED|MODIFIED|REMOVED Requirements` with at least one `#### Scenario:` per requirement and cross-reference related capabilities when relevant.
<!-- スペックデルタを各機能フォルダに作成し、各要件に少なくとも1つのシナリオを含める -->
6. Draft `tasks.md` as an ordered list of small, verifiable work items that deliver user-visible progress, include validation (tests, tooling), and highlight dependencies or parallelizable work.
<!-- tasks.mdを小さく検証可能な作業項目の順序付きリストとして作成 -->
7. Validate with `openspec validate <id> --strict --no-interactive` and resolve every issue before sharing the proposal.
<!-- openspec validateで検証し、共有前にすべての問題を解決 -->

**Reference**
- Use `openspec show <id> --json --deltas-only` or `openspec show <spec> --type spec` to inspect details when validation fails.
<!-- バリデーション失敗時は詳細を確認 -->
- Search existing requirements with `rg -n "Requirement:|Scenario:" openspec/specs` before writing new ones.
<!-- 新規作成前に既存要件を検索 -->
- Explore the codebase with `rg <keyword>`, `ls`, or direct file reads so proposals align with current implementation realities.
<!-- コードベースを探索して提案を現在の実装に合わせる -->
<!-- OPENSPEC:END -->
