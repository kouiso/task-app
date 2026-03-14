# /devin-audit - Devin Knowledge・Playbook・Secrets 監査・最適化

## Purpose
Devin管理画面のKnowledge・Playbook・Secretsを監査し、重複削除・統合・フォルダ整理・新規登録を実行する

## Trigger
ユーザーが `/devin-audit` を実行

## API Info
- Base: `https://api.devin.ai/v1/`
- Auth: Secret `DEVIN_ORG_API_KEY` or ask user for Bearer token
- Endpoints:
  - `GET /knowledge` — 全Knowledge+フォルダ取得
  - `POST /knowledge` — Knowledge新規作成
  - `PUT /knowledge/{id}` — Knowledge更新（name, trigger_description, body 全て必須）
  - `DELETE /knowledge/{id}` — Knowledge削除
  - `GET /playbooks` — 全Playbook取得
  - `POST /playbooks` — Playbook新規作成（title, body, macro）。macroは`!`始まり
  - `DELETE /playbooks/{playbook_id}` — Playbook削除（IDフィールド名は `playbook_id`。`id` ではない）
  - `GET /secrets` — Secret一覧取得
  - `DELETE /secrets/{id}` — Secret削除

## Important Notes
- PUT requires ALL fields (name, trigger_description, body) even if only changing metadata
- Playbook macro must start with `!` (e.g., `!bugfix`)
- Knowledge body should be written in English
- Use Python scripts in /tmp/ to avoid git-safety hook false positives on strings like `--legacy-peer-deps`
- Always CREATE before DELETE when merging entries (safety-first)
- Playbook UPDATE is not supported by the API. Use DELETE + CREATE (preserve macro name)
- Metadata-only PUTs (pinned_repo, parent_folder_id) may not persist unless body content also changes. Include a minimal body modification as workaround

## Workflow

### Step 1: Current State Audit
1. Fetch all Knowledge, Playbooks, Secrets via API
2. Generate a summary table with: ID, Name, Folder, Pin, Trigger, Body length
3. Report current counts to user

### Step 2: Standard Analysis
Analyze for:
- **Complete duplicates**: Identical name + body → DELETE one
- **Semantic duplicates**: Different name, overlapping content → MERGE into one
- **AGENTS.md redundancy**: Content that exactly mirrors AGENTS.md → Simplify to essence only
- **Missing folders**: Entries without folder assignment → Assign to appropriate folder
- **Pin mismatches**: Universal rules without `all` pin, project-specific without repo pin
- **Stale entries**: Outdated information, references to deleted features
- **Missing coverage**: Important workflows without Knowledge entries

### Step 2.5: DS/AI/Prompt Engineering Optimization

After the standard analysis, evaluate each Knowledge entry against three expert perspectives.

#### Data Scientist Perspective
- **Trigger precision** (score 1-5): Does the trigger fire exactly when needed? Score 1 = fires on everything or never fires. Score 5 = fires only on the exact scenario described.
- **Trigger mutual exclusivity**: Do multiple entries fire on the same event with overlapping content? Flag pairs with >50% body overlap that share trigger conditions → merge candidates.
- **Reproducibility**: Would a different Devin instance behave identically from this Knowledge? Flag any entry containing ambiguous words ("appropriate", "properly", "as needed", "relevant") → replace with concrete conditions.

#### AI Engineer Perspective
- **Token efficiency**: Flag entries with body >2000 chars for compression review. Flag entries with internal content duplication (same information stated twice within one body).
- **Context window impact**: Is `pinned_repo` correct? Entries pinned to `all` load in every session for every repo. If content is repo-specific, pin to that repo to reduce token load elsewhere.
- **Dependency graph**: Does this entry reference other entries by name or "see dedicated Knowledge entry"? Verify references are resolvable. Replace vague cross-references with specific entry names.
- **Contradiction detection**: Do any two entries state conflicting rules? (e.g., one prohibits X, another permits X in certain contexts without the first acknowledging the exception.)

#### Prompt Engineer Perspective
- **Quantifiability**: Are success criteria measurable (boolean, count, threshold)? Flag vague criteria like "sufficient coverage" → replace with "coverage >= 80%" or "all files evaluated".
- **Semantic structure**: Does the body follow IF/THEN/BECAUSE or PROHIBITION/CONTEXT/REASON/CORRECT_APPROACH format? Flag unstructured prose → restructure.
- **Anti-pattern coverage**: Does each prohibition include the correct alternative, not just "don't do this"? Every PROHIBITED item must have a corresponding CORRECT APPROACH.
- **False positive risk**: Does any rule block legitimate use cases? Define explicit exceptions where needed (e.g., "`as` is prohibited EXCEPT `as const`").

### Step 3: Plan Proposal
Present a numbered action plan to user:
- Execution order: Phase 1 CREATE → Phase 2 UPDATE (including merge targets) → Phase 3 DELETE (only after merge targets are updated)
- Each action with: entry ID, name, what changes, why
- Risk assessment per action (verify DELETE safety: confirm all content exists in remaining entries before proposing deletion)
- Expected final counts with arithmetic verification (before + creates - deletes = after)

### Step 4: Self-Review (iterate until 100/100)
Self-review the plan. Score each item pass/fail. Repeat until ALL items pass.
- Math check: do the counts add up? (before + creates - deletes = after)
- CREATE→DELETE order for all merges?
- No information loss in merges? (diff-check original bodies vs merged body — list ANY content in deletion target NOT present in containing items)
- Triggers cover all original use cases? (check pin_repo scope — deleting an entry pinned to "all" when the replacement is pinned to a specific repo = information loss for other repos)
- No conflicts with Devin default slash commands (/plan, /review, /test, /think-hard, /implement)
- DS/AI/PE Quality Gate: Do all new/updated entries pass Reproducibility, Quantifiability, Semantic Structure, and Confidence checks?
- DELETE prerequisite check: For each DELETE, verify that prerequisite UPDATEs (pin changes, DoD additions, content merges) are scheduled BEFORE the DELETE in execution order

### Step 5: Execute (after user approval)
Execute the approved plan phase by phase. Use Python scripts in /tmp/ for API calls.
Report progress after each phase.

### Step 6: Final Verification
Fetch all resources again and confirm final counts match the plan.

## Existing Folder IDs
- code-style: `folder-2d0a967ed8b64060a405ccc9de66a751`
- git-workflow: `folder-38b0687a7df44678bfdafb8e2815e856`
- pr: `folder-6da473636b5944288b507b197b5ea1a1`
- ci-cd: `folder-78c329de49dc4ce7811bedf70b059f47`
- reporting: `folder-89020cefdb7d4943a69dfc7dfaf07242`
- persona: `folder-fa39863df1de4fcea8719589b5f55d83`
- mcp: `folder-208fc361eb314f068830c594321de980`
- sanity-cms: `folder-45fcbecd7a79447d80a072f898575248`
- BigQuery Analytics: `folder-f56adeb2e8e14e7a8adfc92917e9614c`

## Current Playbook Macros (as of 2026-02-24)
| Macro | Category | Purpose |
|-------|----------|---------|
| `!investigate` | Behavioral | Stop and investigate before coding |
| `!pr_completion` | Phase | Run PR completion loop autonomously |
| `!report` | Phase | Report plan before implementation |
| `!reflect` | Phase | Post reflection on PR |
| `!pr_selfreview_comments` | Behavioral | Post self-review inline comments |
| `!bad` | Learning | Suggest prohibition as Knowledge |
| `!good` | Learning | Suggest reinforcement as Knowledge |
| `!prompt` | Learning | Persist instruction as Knowledge |
