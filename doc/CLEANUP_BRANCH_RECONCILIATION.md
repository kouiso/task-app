# Cleanup branch reconciliation

Issue #292 のように長期間使われたブランチを分割するときは、元ブランチのコミット数ではなく、最終的な tracked file の内容を保存対象とする。マージコミット、revert、競合解消が含まれるため、コミットを数えるだけでは変更の欠落を検出できない。

## 保全手順

1. 作業開始前に元ブランチの先端を更新し、削除されない保全 ref を作る。

   ```bash
   git fetch origin <cleanup-branch>
   git branch backup/cleanup-292 origin/<cleanup-branch>
   ```

2. `git diff --name-status <base>...backup/cleanup-292` と `git log --reverse <base>..backup/cleanup-292` を使い、変更を機能、テスト、教材、ツール設定の単位に分類する。各 PR は単独で検証できる変更と、その変更に対応するテストを一緒に含める。

3. 依存する PR は、先行 PR のブランチを base にして積み重ねる。先行 PR がマージされたら後続 PR の base を `main` に変更する。競合解消では元ブランチを直接編集せず、分割先のブランチだけを更新する。

4. すべての分割 PR を統合した候補 ref に対して、元ブランチとの最終状態を検査する。

   ```bash
   scripts/check-branch-reconciliation.sh backup/cleanup-292 <reconciled-ref>
   ```

   終了コード `0` と `PASS` は、両 ref の Git tree が一致し、tracked file の追加、変更、削除、実行権限が保存されたことを示す。失敗時は差分のパスと統計が表示されるため、該当する分割 PR へ不足分を追加する。

5. 通常のテストと lint を候補 ref で実行する。tree の一致は元ブランチからの欠落を検出するが、元ブランチ自体の不具合までは検出しない。

6. 元ブランチは、全 PR のマージと tree 一致の記録を Issue #292 に残した後でのみ削除する。保全用 ref はレビュー完了まで残す。

## レビュー記録

Issue または最後の PR に次を記録する。

- 元ブランチ名と保全 ref の commit SHA
- 分割した全 PR の番号と依存順
- 各 PR で実行したテスト
- `check-branch-reconciliation.sh` の source、reconciled、tree SHA を含む出力
- 意図的に元ブランチと異なる変更がある場合は、その差分と承認先

意図的な差分が必要なら、先に元ブランチと同一の候補 ref を作って一致を記録し、その後の修正を別 PR にする。これにより「取りこぼし」と「レビューで選んだ変更」を区別できる。
