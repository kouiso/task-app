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

import re
import sys
from collections import defaultdict
from pathlib import Path

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
        for block in re.finditer(r"```(?:\w+)?\n(.*?)```", content, re.DOTALL):
            lines = block.group(1).split("\n")
            if lines:
                m = re.match(r"//\s*filepath:\s*(.+)", lines[0].strip())
                if m:
                    by_day[n].add(m.group(1).strip())
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

    if errors:
        for e in errors:
            print(e)
        print(f"\n{len(errors)} alignment error(s) found.")
        return 1

    total = len(imports)
    print(
        f"✅ All {total} @/ imports are covered by scaffold or "
        f"an earlier/same day (順序込みで検証)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
