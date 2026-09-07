#!/usr/bin/env python3
"""
scaffold と教材の整合性チェック。

教材 day*.md が import している @/ パスが、
(a) scaffold 配布物 (scripts/_lib-base/, _constants/, _trpc-base/, _server-routers/, _app-components/, _ui-components/)
または
(b) いずれかの day*.md の '// filepath: src/...' ブロック
のどちらかで提供されていることを確認する。

満たさない import があれば exit 1。
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from curriculum_blocks import filepath_value, first_filepath_match  # noqa: E402
from markdown_scan import code_blocks  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
MATERIAL_DIR = REPO_ROOT / "material" / "30days-curriculum"
SCRIPTS_DIR = REPO_ROOT / "scripts"

# scaffold配布元ディレクトリ → コピー先 src/ パスのマッピング
SCAFFOLD_COPY_MAP = {
    "_lib-base":           "src/lib",
    "_lib-utils":          "src/lib",
    "_constants":          "src/lib/constant",
    "_trpc-base":          "src/trpc",
    "_app-components/project": "src/component/project",
    "_app-components/task":    "src/component/task",
    "_ui-components":      "src/component/ui",
    "_server-routers":     "src/server/api/routers",
    "_server-routers/_helpers": "src/server/api/routers/_helpers",
}

ALIAS_MAP = {
    "@/lib/":       "src/lib/",
    "@/component/": "src/component/",
    "@/server/":    "src/server/",
    "@/trpc/":      "src/trpc/",
    "@/app/":       "src/app/",
    "@/hooks/":     "src/hooks/",
    "@/types/":     "src/types/",
}


def scaffold_provided() -> set[str]:
    """scaffold が src/ に配置するファイルパス集合（拡張子あり、src/ 基準）"""
    provided: set[str] = set()
    for src_rel, dest_prefix in SCAFFOLD_COPY_MAP.items():
        src_dir = SCRIPTS_DIR / src_rel
        if not src_dir.is_dir():
            continue
        for f in src_dir.iterdir():
            if f.is_file() and f.suffix in {".ts", ".tsx", ".js", ".jsx", ".css"}:
                dest = f"{dest_prefix}/{f.name}"
                provided.add(dest)
    return provided


def day_number(md: Path) -> int:
    """dayNN_*.md → NN。day 以外の命名は 0（＝どの日より前）として扱う。"""
    m = re.match(r"day(\d+)", md.stem)
    return int(m.group(1)) if m else 0


def curriculum_creates_by_day() -> dict[int, set[str]]:
    """day 番号 → その日の filepath: ブロックが作成するファイルパス集合（src/ 基準）

    以前は全 day を1つの集合にまとめていたため、day13 の import が day27 でしか
    登場しないファイルで満たされても PASS していた（順序盲目＝偽の緑）。
    学習者は day を順番に進むので、day13 の時点で day27 のファイルは存在しない。
    """
    by_day: dict[int, set[str]] = defaultdict(set)
    for md in MATERIAL_DIR.glob("day*.md"):
        n = day_number(md)
        content = md.read_text(encoding="utf-8")
        # フェンスの抽出は markdown_scan に寄せる。自前の ```` ```(?:\w+)?\n ```` は
        # ```` ```tsx title="..." ```` のような属性付きフェンスに一致せず、以降の対が
        # ずれる。ずれた先の filepath 目印は「その日に作られていない」ことになり、
        # 順序の検査が黙って素通りする。
        for _lang, body in code_blocks(content):
            # 目印は `// filepath:` と `{/* filepath: */}` の2通りある。JSX の
            # 子要素の位置では `//` がコメントにならないためで、片方しか読めないと
            # 「その日にそのファイルを作った」ことを取り落とす。判定は抽出側と
            # 共通の FILEPATH に寄せて、2つの判定が割れないようにする。
            #
            # 先頭行だけを見ると、`'use client';` のような行が上に来たブロックの
            # 目印を取り落とす。`has_filepath_marker` と同じ `first_filepath_match`
            # から採り、有無の判定と値の取り出しが割れないようにする。
            m = first_filepath_match("\n".join(line for _lineno, line in body))
            if m:
                by_day[n].add(filepath_value(m))
    return dict(by_day)


def curriculum_imports() -> dict[str, list[tuple[int, str]]]:
    """day*.md に登場する @/ import → [(day番号, day ファイル名), ...]"""
    imports: dict[str, list[tuple[int, str]]] = defaultdict(list)
    import_re = re.compile(r"""from\s+['"](@/[^'"]+)['"]""")
    for md in MATERIAL_DIR.glob("day*.md"):
        n = day_number(md)
        content = md.read_text(encoding="utf-8")
        for m in import_re.finditer(content):
            alias_path = m.group(1)
            imports[alias_path].append((n, md.stem))
    return dict(imports)


def resolve_alias(alias_path: str) -> list[str]:
    """@/lib/foo → [src/lib/foo.ts, src/lib/foo.tsx, src/lib/foo/index.ts, ...]"""
    for prefix, replacement in ALIAS_MAP.items():
        if alias_path.startswith(prefix):
            base = replacement + alias_path[len(prefix):]
            return [
                base,
                base + ".ts",
                base + ".tsx",
                base + ".js",
                base + ".jsx",
                base + ".css",
                base + "/index.ts",
                base + "/index.tsx",
            ]
    return []


def with_stems(paths: set[str]) -> set[str]:
    """拡張子ありなしの両方で引けるように stem も足した集合を返す"""
    return paths | {Path(p).with_suffix("").as_posix() for p in paths}


def main() -> int:
    provided = scaffold_provided()
    creates_by_day = curriculum_creates_by_day()
    imports = curriculum_imports()

    provided_known = with_stems(provided)

    # day N 時点で学習者の手元に存在するもの = scaffold + day <= N が作ったもの。
    # 各 day について累積集合を先に作っておく。
    max_day = max([*creates_by_day.keys(), *(n for v in imports.values() for n, _ in v)], default=0)
    cumulative: dict[int, set[str]] = {}
    acc: set[str] = set()
    for n in range(0, max_day + 1):
        acc = acc | creates_by_day.get(n, set())
        cumulative[n] = provided_known | with_stems(acc)

    errors: list[str] = []
    for alias_path, occurrences in sorted(imports.items()):
        candidates = resolve_alias(alias_path)
        if not candidates:
            continue
        for day_n, day_stem in sorted(set(occurrences)):
            known_at_day = cumulative.get(day_n, provided_known)
            if not any(c in known_at_day for c in candidates):
                # 後の day でなら提供されるのか、そもそもどこにも無いのかを区別して出す
                later = next(
                    (
                        n
                        for n in sorted(creates_by_day)
                        if n > day_n
                        and any(c in with_stems(creates_by_day[n]) for c in candidates)
                    ),
                    None,
                )
                if later is not None:
                    errors.append(
                        f"ERROR: {alias_path} is imported at {day_stem} (day{day_n:02d}) "
                        f"but only created at day{later:02d} — 学習者はその時点で未所持（順序違反）"
                    )
                else:
                    errors.append(
                        f"ERROR: {alias_path} is imported at {day_stem} (day{day_n:02d}) "
                        f"but not in scaffold or any curriculum day"
                    )

    scaffold_script = (SCRIPTS_DIR / "scaffold-from-scratch.sh").read_text(encoding="utf-8")
    package_json = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8"))
    dependencies = package_json.get("dependencies", {})
    dev_dependencies = package_json.get("devDependencies", {})
    overrides = package_json.get("overrides", {})
    scaffold_main_match = re.search(
        r"\nmain\(\) \{\n(?P<body>.*?)\n\}\n\nmain \"\$@\"",
        scaffold_script,
        re.DOTALL,
    )
    scaffold_main_body = (
        scaffold_main_match.group("body") if scaffold_main_match is not None else ""
    )
    day07_candidates = sorted(MATERIAL_DIR.glob("day07_*.md"))
    day07_text = (
        day07_candidates[0].read_text(encoding="utf-8") if len(day07_candidates) == 1 else ""
    )
    day08_candidates = sorted(MATERIAL_DIR.glob("day08_*.md"))
    day08_text = (
        day08_candidates[0].read_text(encoding="utf-8") if len(day08_candidates) == 1 else ""
    )
    day30_candidates = sorted(MATERIAL_DIR.glob("day30_*.md"))
    day30_text = (
        day30_candidates[0].read_text(encoding="utf-8") if len(day30_candidates) == 1 else ""
    )
    deployment_contract = {
        "source/scaffold seed byte parity": (
            REPO_ROOT / "src" / "command" / "seed.ts"
        ).read_bytes()
        == (SCRIPTS_DIR / "_seed" / "seed.ts").read_bytes(),
        "source/scaffold rate-limit byte parity": (
            REPO_ROOT / "src" / "lib" / "rate-limit.ts"
        ).read_bytes()
        == (SCRIPTS_DIR / "_lib-base" / "rate-limit.ts").read_bytes(),
        "source/scaffold auth router byte parity": (
            REPO_ROOT / "src" / "server" / "api" / "routers" / "auth.ts"
        ).read_bytes()
        == (SCRIPTS_DIR / "_server-routers" / "auth.ts").read_bytes(),
        "Day 07 login rate-limit": all(
            token in day07_text
            for token in (
                "checkLoginRateLimit",
                "extractClientIp",
                "rateLimitToTRPCError",
                "recordLoginSuccess",
                "mutation(async ({ input, ctx })",
            )
        ),
        "Day 07 Edge-safe jose import": (
            "import { jwtVerify } from 'jose/jwt/verify';" in day07_text
            and "import { jwtVerify } from 'jose/jwt/verify';"
            in (REPO_ROOT / "src" / "middleware.ts").read_text(encoding="utf-8")
        ),
        "Day 08 route continuity": (
            "src/app/dashboard/page.tsx" in day08_text and "src/app/(app)" not in day08_text
        ),
        'scaffold scripts.vercel-build="prisma generate && next build"': (
            'scripts.vercel-build="prisma generate && next build"' in scaffold_script
        ),
        'scaffold scripts.postinstall="prisma generate"': (
            'scripts.postinstall="prisma generate"' in scaffold_script
        ),
        "source production dependency audit overrides": (
            dependencies.get("next") == "^15.5.21"
            and dev_dependencies.get("postcss") == "8.5.23"
            and overrides.get("postcss") == "8.5.23"
            and overrides.get("sharp") == "0.35.3"
        ),
        "scaffold production dependency audit overrides": (
            all(
                token in scaffold_script
                for token in (
                    "next@15.5.21",
                    "create-next-app@15.5.21",
                    'overrides.postcss="8.5.23"',
                    'overrides.sharp="0.35.3"',
                )
            )
            and 0
            <= scaffold_main_body.find("configure_security_overrides")
            < scaffold_main_body.find("install_dependencies")
        ),
        # `vercel env run` は実在しないサブコマンド（あるのは ls / add / rm / pull）。
        # 以前はその文字列を契約として固定していたため、動かない手順が守られていた。
        # 取り出してから読み込む形に変え、追加の道具を要らない書き方を契約にする。
        "Day 30 production schema command": (
            "npx vercel env pull .env.production.local --environment=production" in day30_text
            and "npx prisma db push" in day30_text
            and "rm .env.production.local" in day30_text
        ),
    }
    for contract, satisfied in deployment_contract.items():
        if not satisfied:
            errors.append(f"ERROR: deployment contract missing: {contract}")

    if errors:
        for e in errors:
            print(e)
        print(f"\n{len(errors)} alignment error(s) found.")
        return 1

    total = len(imports)
    print(
        f"✅ All {total} @/ imports are covered by scaffold or "
        f"an earlier/same day (順序込みで検証), and deployment contracts match."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
