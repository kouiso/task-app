# #793 の確かめ（2026-11-28 00:28 +09:00）

直す前（main の判定の1行）を一時リポジトリで試した結果。タグ v1.2.4 の後に、件名 `fix(ci): something`・本文 `BREAKING CHANGE の扱いは変えない。` のコミットを置くと当たる（= major）:

```text
$ git log v1.2.4..HEAD --format='%s%n%b' | grep -nE 'BREAKING[ -]CHANGE|^[a-zA-Z]+(\([^)]*\))?!:'
2:BREAKING CHANGE の扱いは変えない。
$ bash .github/ci/next-version.sh   # 直した後の判定
前の版 v1.2.4 → 1.2.5（patch、対象: v1.2.4..HEAD）
```

直した後、この枝のリポジトリそのもの（最新のタグ v1.2.4）で:

```text
$ bash .github/ci/next-version.sh   # 直した後の判定
前の版 v1.2.4 → 1.2.5（patch、対象: v1.2.4..HEAD）
$ node --test .github/ci/next-version.test.mjs
ok 1 - 本文の途中の BREAKING CHANGE という語では major にしない
ok 2 - 本文の行頭の type!: では major にしない
ok 3 - 本文の脚注の BREAKING CHANGE: では major にする
ok 4 - 件名の type!: と type(scope)!: では major にする
ok 5 - 件名の feat: では minor、ほかは patch にする
ok 6 - タグが無い初回は package.json の版をそのまま使う
ok 7 - deploy-r2.yml の version ジョブはこのスクリプトで版を決める
# tests 7
# pass 7
# fail 0
$ node --test .github/ci/*.test.mjs
# tests 114
# pass 114
# fail 0
```
