# Deputy Administrator Runbook

Issue: #118

この runbook は、主担当者が不在でも task-app の保守判断を止めないための副管理者運用を定義します。GitHub collaborator の招待と権限付与はリポジトリ管理者だけが実施できます。この文書は、招待後に副管理者が迷わず対応できる責務と escalation path を明文化します。

## 役割

| 役割 | 推奨人数 | GitHub 権限 | 主な責務 |
|------|----------|-------------|----------|
| 主管理者 | 1 | Admin | 最終判断、権限管理、リリース承認 |
| 副長 | 1 | Maintain 以上 | PR triage、CI 障害判断、緊急 hotfix の merge 判断 |
| 局長 | 1 | Triage または Maintain | Issue 整理、教材/運用 docs の一次レビュー、外部問い合わせ整理 |

## 権限付与手順

1. GitHub の `Settings > Collaborators and teams` を開く。
2. 副長候補 1 名と局長候補 1 名を招待する。
3. 副長には `Maintain` 以上を付与する。緊急時に settings 変更まで任せる場合のみ `Admin` を検討する。
4. 局長には `Triage` から開始し、PR review と branch 運用を任せる場合は `Maintain` へ上げる。
5. 招待後、この runbook と `doc/qa-runbook-2026-05-18.md` を共有する。

## 副長の責務

- CI failure がリポジトリ設定、runner、billing、secret に起因するか切り分ける。
- security / dependency / release blocker の Issue に優先度を付ける。
- 小さな docs / ops PR は CODEOWNERS に従ってレビューする。
- 緊急 hotfix は主管理者へ連絡し、応答がない場合は下記 escalation SLA で判断する。

## 局長の責務

- Issue の重複、完了済み PR、blocker を整理する。
- 教材 docs、runbook、evidence の PR を一次レビューする。
- PR body に検証結果、未実行理由、外部 blocker が書かれているか確認する。
- merge 後に該当 Issue が close されているか確認する。

## Escalation Path

| 状況 | 初動 | 期限 | 次の行動 |
|------|------|------|----------|
| CI が runner / billing / secret で止まる | 副長が原因を記録 | 4 時間 | 主管理者へ escalation |
| セキュリティ alert | 副長が影響範囲を確認 | 1 営業日 | hotfix PR または risk acceptance を作成 |
| paid 教材の配布リスク | 局長が該当 asset / doc を特定 | 1 営業日 | `doc/LICENSE_INVENTORY.md` へ追記し、主管理者へ確認 |
| main が壊れた | 副長が直近 merge を特定 | 1 時間 | revert PR または hotfix PR を作成 |
| 主管理者が不在 | 副長が Issue に対応方針を書く | 2 営業日 | CODEOWNERS review を満たす PR だけ merge 判断 |

## PR Review Gate

- `main` へ入れる PR は少なくとも 1 名の CODEOWNER review を必要とする。
- `doc/**`、`.github/**`、`package.json`、`package-lock.json`、`prisma/**` は副長または主管理者の確認を優先する。
- 外部作業が必要な Issue は、PR body に「コードで完了した範囲」と「GitHub settings 等の残作業」を分けて書く。

## CODEOWNERS 運用

`.github/CODEOWNERS` は既存の `@ritmo-inc/developpers` をデフォルト owner とします。副長・局長を個人 collaborator として追加した後は、必要に応じて個人または team を CODEOWNERS に追加してください。

追加例:

```text
# ops / governance
.github/** @ritmo-inc/developpers @example-deputy
doc/RUNBOOK.md @ritmo-inc/developpers @example-deputy
```

## 未完了の外部作業

- [ ] 副長候補 1 名を GitHub collaborator に invite する。
- [ ] 局長候補 1 名を GitHub collaborator に invite する。
- [ ] 招待承認後、必要なら CODEOWNERS に個人または team を追加する。
