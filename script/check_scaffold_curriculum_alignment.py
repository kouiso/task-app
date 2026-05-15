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

REPO_ROOT = Path(__file__).resolve().parents[1]
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


def curriculum_creates() -> set[str]:
    """day*.md の filepath: ブロックが作成するファイルパス集合（src/ 基準）"""
    creates: set[str] = set()
    for md in MATERIAL_DIR.glob("day*.md"):
        content = md.read_text(encoding="utf-8")
        for block in re.finditer(r"```(?:\w+)?\n(.*?)```", content, re.DOTALL):
            lines = block.group(1).split("\n")
            if lines:
                m = re.match(r"//\s*filepath:\s*(.+)", lines[0].strip())
                if m:
                    creates.add(m.group(1).strip())
    return creates


def curriculum_imports() -> dict[str, list[str]]:
    """day*.md に登場する @/ import → [day ファイル名リスト]"""
    imports: dict[str, list[str]] = defaultdict(list)
    import_re = re.compile(r"""from\s+['"](@/[^'"]+)['"]""")
    for md in MATERIAL_DIR.glob("day*.md"):
        content = md.read_text(encoding="utf-8")
        for m in import_re.finditer(content):
            alias_path = m.group(1)
            imports[alias_path].append(md.stem)
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
                base + "/index.ts",
                base + "/index.tsx",
            ]
    return []


def main() -> int:
    provided = scaffold_provided()
    creates = curriculum_creates()
    imports = curriculum_imports()

    # src/ 正規化: 拡張子なしのキーも対応するため、提供セットを stem でも引けるように
    provided_stems = {Path(p).with_suffix("").as_posix() for p in provided}
    creates_stems = {Path(p).with_suffix("").as_posix() for p in creates}
    all_known = provided | creates | provided_stems | creates_stems

    errors: list[str] = []
    for alias_path, day_names in sorted(imports.items()):
        candidates = resolve_alias(alias_path)
        if not candidates:
            continue
        found = any(c in all_known for c in candidates)
        if not found:
            days_str = ", ".join(sorted(set(day_names)))
            errors.append(
                f"ERROR: {alias_path} is imported ({days_str}) "
                f"but not in scaffold or curriculum"
            )

    if errors:
        for e in errors:
            print(e)
        print(f"\n{len(errors)} alignment error(s) found.")
        return 1

    total = len(imports)
    print(f"✅ All {total} @/ imports are covered by scaffold or curriculum.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
