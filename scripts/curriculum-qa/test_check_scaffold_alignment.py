#!/usr/bin/env python3
"""scaffold 整合性検査が、貼り先の目印を2つの書き方とも読めることの退行テスト。

この検査は「その日にどのファイルが作られたか」を目印から集める。目印には
`// filepath:` と `{/* filepath: */}` の2通りがあり、片方しか読めないと
その日にファイルが作られたことを取り落とす。すると、後の日の import が
「まだ存在しないファイルを参照している」と誤判定される。

実際に2026-07-29 時点で、旧判定は144件の貼り先のうち9件を取り落としていた。
"""

import copy
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import check_scaffold_curriculum_alignment as target  # noqa: E402


DAY_SLASH = """```typescript
// filepath: src/server/api/routers/task.ts
export const taskRouter = createTRPCRouter({});
```
"""

DAY_JSX = """```tsx
{/* filepath: src/app/login/page.tsx */}
<form />
```
"""

DAY_NOT_MARKER = """```typescript
// 完成版: 送信ボタン
const x = 1;
```
"""

# `#` 形式も目印である。旧判定はこれを取り落としていた。教材が「このブロックは
# このファイルを作る」と宣言している以上、言語表記に関係なく数えるのが正しい。
DAY_HASH = """```bash
# filepath: docker-compose.yml
services: {}
```
"""

# 属性付きフェンス（#369 ②）。自前の ```` ```(?:\\w+)?\\n ```` はこの開きフェンスに
# 一致せず、以降のフェンスの対がずれる。ずれた先の目印は「その日に作られていない」
# ことになり、後の日の import が誤って未充足と判定される。
DAY_ATTR_FENCE = """```text title="メモ"
このブロックは貼り先ではありません。
```

```typescript
// filepath: src/lib/format.ts
export const format = () => "";
```
"""


# 目印は先頭行とは限らない。`'use client';` のような行が上に来る書き方があり、
# 先頭行だけを見ると、その日にファイルを作ったことを取り落とす。
# `curriculum_blocks.has_filepath_marker` は全行を見ており、判定が割れていた。
DAY_MARKER_NOT_FIRST = """```tsx
'use client';
// filepath: src/app/task/page.tsx
export default function Page() { return null; }
```
"""


def main() -> int:
    fails = []
    original = target.MATERIAL_DIR
    try:
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "day05_一つ目.md").write_text(DAY_SLASH, encoding="utf-8")
            (root / "day06_二つ目.md").write_text(DAY_JSX, encoding="utf-8")
            (root / "day07_三つ目.md").write_text(DAY_NOT_MARKER, encoding="utf-8")
            (root / "day08_四つ目.md").write_text(DAY_HASH, encoding="utf-8")
            (root / "day09_五つ目.md").write_text(DAY_ATTR_FENCE, encoding="utf-8")
            (root / "day10_六つ目.md").write_text(DAY_MARKER_NOT_FIRST, encoding="utf-8")
            target.MATERIAL_DIR = root
            by_day = target.curriculum_creates_by_day()
    finally:
        target.MATERIAL_DIR = original

    if by_day.get(5) != {"src/server/api/routers/task.ts"}:
        fails.append(f"❌ // 形式の目印を読めていない: {by_day.get(5)}")
    if by_day.get(6) != {"src/app/login/page.tsx"}:
        fails.append(f"❌ JSX 形式の目印を読めていない: {by_day.get(6)}")
    if 7 in by_day:
        fails.append(f"❌ 目印でない行を貼り先として拾った: {by_day.get(7)}")
    if by_day.get(8) != {"docker-compose.yml"}:
        fails.append(f"❌ # 形式の目印を読めていない: {by_day.get(8)}")
    if by_day.get(9) != {"src/lib/format.ts"}:
        fails.append(f"❌ 属性付きフェンスの後ろの目印を読めていない: {by_day.get(9)}")
    if by_day.get(10) != {"src/app/task/page.tsx"}:
        fails.append(f"❌ 先頭行以外の目印を読めていない: {by_day.get(10)}")

    scaffold = (target.SCRIPTS_DIR / "scaffold-from-scratch.sh").read_text(encoding="utf-8")
    if not hasattr(target, "scaffold_security_contract"):
        fails.append("❌ scaffold の依存固定契約を単体検査できない")
    else:
        if not target.scaffold_security_contract(scaffold):
            fails.append("❌ 現在の guarded main と依存固定を受理できない")
        unsafe_scaffolds = {
            "古い postcss override": scaffold.replace(
                'overrides.postcss="8.5.23"', 'overrides.postcss="8.5.22"'
            ),
            "古い sharp override": scaffold.replace(
                'overrides.sharp="0.35.5"', 'overrides.sharp="0.35.4"'
            ),
            "スコープ外の deepmerge override": scaffold.replace(
                'overrides.@prisma/config.deepmerge-ts="8.0.2"',
                'overrides.deepmerge-ts="8.0.2"',
            ),
            "deepmerge override 欠落": scaffold.replace(
                '    overrides.@prisma/config.deepmerge-ts="8.0.2"\n', ""
            ),
            "古い deepmerge override": scaffold.replace(
                'overrides.@prisma/config.deepmerge-ts="8.0.2"',
                'overrides.@prisma/config.deepmerge-ts="8.0.1"',
            ),
            "スコープ内外の deepmerge override 併存": scaffold.replace(
                '    overrides.@prisma/config.deepmerge-ts="8.0.2"',
                '    overrides.deepmerge-ts="8.0.2"\n'
                '    overrides.@prisma/config.deepmerge-ts="8.0.2"',
            ),
            "override が install より後": scaffold.replace(
                "  configure_security_overrides\n  install_dependencies",
                "  install_dependencies\n  configure_security_overrides",
            ),
        }
        for name, candidate in unsafe_scaffolds.items():
            if candidate == scaffold:
                fails.append(f"❌ {name}の負例 fixture が入力を変更していない")
            elif target.scaffold_security_contract(candidate):
                fails.append(f"❌ {name}を受理した")

    package_json = json.loads((target.REPO_ROOT / "package.json").read_text(encoding="utf-8"))
    if not hasattr(target, "source_security_contract"):
        fails.append("❌ 本体 package.json の依存固定契約を単体検査できない")
    elif not target.source_security_contract(package_json):
        fails.append("❌ 現在の本体 package.json の依存固定を受理できない")
    else:
        unsafe_packages = {}
        missing = copy.deepcopy(package_json)
        del missing["overrides"]["@prisma/config"]
        unsafe_packages["本体の scoped deepmerge override 欠落"] = missing
        wrong = copy.deepcopy(package_json)
        wrong["overrides"]["@prisma/config"]["deepmerge-ts"] = "8.0.1"
        unsafe_packages["本体の古い scoped deepmerge override"] = wrong
        coexist = copy.deepcopy(package_json)
        coexist["overrides"]["deepmerge-ts"] = "8.0.2"
        unsafe_packages["本体の scoped/unscoped deepmerge override 併存"] = coexist
        for name, candidate in unsafe_packages.items():
            if target.source_security_contract(candidate):
                fails.append(f"❌ {name}を受理した")

    day30_candidates = sorted(target.MATERIAL_DIR.glob("day30_*.md"))
    day30 = day30_candidates[0].read_text(encoding="utf-8") if len(day30_candidates) == 1 else ""
    if not hasattr(target, "day30_production_schema_contract"):
        fails.append("❌ Day 30 の本番 schema 安全契約を単体検査できない")
    else:
        if not target.day30_production_schema_contract(day30):
            fails.append("❌ 現在の guarded production schema 手順を受理できない")
        unsafe_day30 = {
            "Preview の接続先": day30.replace(
                "file, '--environment=production'", "file, '--environment=preview'"
            ),
            "取得値と異なる DB の検査": day30.replace(
                "new URL(values.DATABASE_URL)", "new URL(process.env.DATABASE_URL)"
            ),
            "親プロセスの別 DB": day30.replace(
                "const env = { ...process.env, DATABASE_URL: values.DATABASE_URL };",
                "const env = process.env;",
            ),
            "既存データ DB の確認": day30.replace(
                "教材用の新規・空の DB と確認できたら ${confirmation}",
                "既存データのある DB でも ${confirmation}",
            ),
            "固定確認文字列": day30.replace(
                "const confirmation = `apply ${randomBytes(4).toString('hex')}`;",
                "const confirmation = 'apply';",
            ),
            "確認不一致でも続行": day30.replace(
                "if (answer !== confirmation) throw new Error",
                "if (false) throw new Error",
            ),
            "Prisma 自動導入を許可": day30.replace("'--yes=false', 'prisma'", "'prisma'"),
            "Prisma へ確認後の入力を渡す": day30.replace(
                "env, [\n    'ignore',", "env, [\n    'inherit',"
            ),
            "無確認の直接 db push": "```bash\nnpx prisma db push\n```\n",
        }
        for name, candidate in unsafe_day30.items():
            if candidate == day30:
                fails.append(f"❌ {name}の負例 fixture が入力を変更していない")
            elif target.day30_production_schema_contract(candidate):
                fails.append(f"❌ {name}を受理した")

    total = 28
    if fails:
        for msg in fails:
            print(msg)
        print(f"❌ scaffold 整合性の目印 {total - len(fails)}/{total} 合格")
        return 1
    print(f"✅ scaffold 整合性の目印 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
