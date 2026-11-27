# #780 の確かめ: 販売 ZIP から組んだ読者の手元（2026-11-27）

この枝（main の #785 を取り込んだ後）で `bash scripts/build-zip.sh` を流し、販売 ZIP を空のフォルダに展開して `bash scripts/scaffold-from-scratch.sh` を流した（Linux コンテナ、Docker なし・ローカル PostgreSQL）。

```text
初期セットアップは完了しました。
カリキュラムの Day 01 の続きを進めてください。
rc=0
+-- @trpc/client@11.17.0
+-- @trpc/next@11.17.0
+-- @trpc/react-query@11.17.0
+-- @trpc/server@11.17.0
`-- next@15.5.29
patches/: next+15.5.29.patch 
next の補修が当たった行数: 2
npx tsc rc=0
npm run build rc=0
```

## 読者の手元の `npm audit --omit=dev`

```text
deepmerge-ts  <8.0.0
Severity: high
effect  <=3.22.0
Severity: high
zod  <4.6.6
Severity: high
5 high severity vulnerabilities
```

next の advisory は0件。残りは zod・effect・deepmerge-ts など（prisma 経由を含む）で、#780 で販売後に回すと決めた分。
