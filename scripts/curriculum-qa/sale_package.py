#!/usr/bin/env python3
"""販売ZIPに何が入るかを `scripts/build-zip.sh` から読み出す。

30周目に見つかった最も重い1件は、本文8箇所が「このリポジトリの `src/...` と見比べて
確認してください」と書いていたことだった。`build-zip.sh` は完成アプリの
`src/` `prisma/` `package.json` を入れない。買った人の手元にその照合先は無い。

「ZIP に何が入るか」を検査側へ書き写すと、`build-zip.sh` を変えたときに写した側が古くなる。
ここでは build-zip.sh を読んで組み立てる。ZIP の作り方が変われば、この判定も一緒に動く。
"""

from __future__ import annotations

import re
from pathlib import Path

__all__ = [
    "REPO_ROOT",
    "excluded_routers",
    "scaffold_src_paths",
    "zip_scaffold_dirs",
    "zip_top_level",
]

REPO_ROOT = Path(__file__).resolve().parents[2]
BUILD_ZIP = REPO_ROOT / "scripts" / "build-zip.sh"

# scaffold の配布物が、読者の手元でどこへ置かれるか。
# check_scaffold_curriculum_alignment.py の SCAFFOLD_COPY_MAP と同じ対応表を使う。
from check_scaffold_curriculum_alignment import SCAFFOLD_COPY_MAP  # noqa: E402


def _build_zip_text() -> str:
    return BUILD_ZIP.read_text(encoding="utf-8")


def _array(name: str) -> list[str]:
    """build-zip.sh の bash 配列リテラルを読む。"""
    m = re.search(rf"^{re.escape(name)}=\(\s*(.*?)^\)", _build_zip_text(), re.M | re.S)
    if not m:
        raise ValueError(f"build-zip.sh に {name} 配列がありません")
    return re.findall(r'"([^"]+)"', m.group(1))


def zip_top_level() -> list[str]:
    """ZIP へ個別に入れるファイル（required_files）。"""
    return _array("required_files")


def zip_scaffold_dirs() -> list[str]:
    """ZIP へ入る scaffold 補助ディレクトリ（support_directories）。"""
    return _array("support_directories")


def excluded_routers() -> set[str]:
    """`_server-routers` から意図的に外すファイル名。

    この6本は読者が30日かけて自分で書くので、完成版を配らない。
    """
    return set(re.findall(r'--exclude="([^"]+)"', _build_zip_text()))


def scaffold_src_paths() -> set[str]:
    """読者の手元に「最初から書かれた状態」で届く src/ 配下のパス。

    scaffold-from-scratch.sh がコピーするので、読者はこれらを写経しない。
    構造の収支を数える検査は、この集合のファイルを対象から外す。写経していない
    行が既にそこに在るため、教材のブロックだけを数えても収支は合わない。
    """
    skip = excluded_routers()
    out: set[str] = set()
    for directory in zip_scaffold_dirs():
        src_dir = REPO_ROOT / "scripts" / directory
        if not src_dir.is_dir():
            continue
        for f in src_dir.rglob("*"):
            if not f.is_file():
                continue
            rel = f.relative_to(src_dir)
            key = f"{directory}/{rel.parts[0]}" if len(rel.parts) > 1 else directory
            dest = SCAFFOLD_COPY_MAP.get(key) or SCAFFOLD_COPY_MAP.get(directory)
            if dest is None:
                continue
            if directory == "_server-routers" and f.name in skip:
                continue
            tail = rel.name if key in SCAFFOLD_COPY_MAP and key != directory else str(rel)
            out.add(f"{dest}/{tail}")
    return out
