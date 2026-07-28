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
    "comparable_src_paths",
    "excluded_routers",
    "scaffold_src_paths",
    "uncovered_scaffold_dirs",
    "zip_scaffold_dirs",
    "zip_top_level",
]

REPO_ROOT = Path(__file__).resolve().parents[2]
BUILD_ZIP = REPO_ROOT / "scripts" / "build-zip.sh"

# scaffold の配布物が、読者の手元でどこへ置かれるか。
# check_scaffold_curriculum_alignment.py の SCAFFOLD_COPY_MAP と同じ対応表を使う。
from check_scaffold_curriculum_alignment import SCAFFOLD_COPY_MAP  # noqa: E402

# SCAFFOLD_COPY_MAP はディレクトリ丸ごとのコピーしか表していない。
# scaffold-from-scratch.sh はそれ以外に、ファイルを名指しで配る関数を3つ持つ
# （copy_server_base / copy_app_base / copy_prisma_files）。こちらの配布物が
# 表から抜けていると、読者の手元に確かに在るファイルを
# check_zip_reference が「ZIP に無い照合先」として弾き、
# check_tag_balance が配布済みの中身を無視して断片だけの収支を数える。
# 値は (置かれる先, 配られるファイル名。None はそのディレクトリの全ファイル)。
EXTRA_COPY_MAP: dict[str, tuple[str, frozenset[str] | None]] = {
    "_server-base":  ("src/server/api", None),
    "_app-api-trpc": ("src/app/api/trpc/[trpc]", frozenset({"route.ts"})),
    "_app-base":     ("src/app", frozenset({"providers.tsx", "layout.tsx"})),
    "_prisma":       ("prisma", frozenset({"schema.prisma"})),
    "_seed":         ("src/command", frozenset({"seed.ts"})),
}

# 配置先がリポジトリ直下のもの。`src/` `prisma/` のどちらでも始まらないので、
# この集合を使う検査（照合先の判定・構文の収支）はそもそも参照しない。
# _docker は docker-compose.yml だけ、_prisma の prisma.config.ts も直下へ行く。
ROOT_LEVEL_SCAFFOLD_DIRS = frozenset({"_docker"})


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


def uncovered_scaffold_dirs() -> set[str]:
    """配布されるのに、置かれる先が分かっていない補助ディレクトリ。

    scaffold の配布物が増えたとき、ここが空でなくなる。空でないまま放置すると、
    読者の手元に在るファイルを検査が「無い」ものとして扱い、正しい記述が赤くなる。
    自己テストがこの集合の空を見張る。
    """
    known = {d.split("/")[0] for d in SCAFFOLD_COPY_MAP} | set(EXTRA_COPY_MAP)
    return {
        d
        for d in zip_scaffold_dirs()
        if d not in known and d not in ROOT_LEVEL_SCAFFOLD_DIRS
    }


def _scaffold_copies() -> list[tuple[str, Path]]:
    """(読者の手元での置き場, 配られる現物) の組を全部返す。

    ディレクトリ丸ごとのコピー（SCAFFOLD_COPY_MAP）と、ファイル名指しのコピー
    （EXTRA_COPY_MAP）の両方を1つに束ねる。
    """
    out: list[tuple[str, Path]] = []
    for directory, (dest, names) in EXTRA_COPY_MAP.items():
        src_dir = REPO_ROOT / "scripts" / directory
        if not src_dir.is_dir():
            continue
        for f in sorted(src_dir.iterdir()):
            if f.is_file() and (names is None or f.name in names):
                out.append((f"{dest}/{f.name}", f))

    skip = excluded_routers()
    for directory in zip_scaffold_dirs():
        src_dir = REPO_ROOT / "scripts" / directory
        if not src_dir.is_dir():
            continue
        for f in sorted(src_dir.rglob("*")):
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
            out.append((f"{dest}/{tail}", f))
    return out


def scaffold_src_paths() -> set[str]:
    """読者の手元に「最初から書かれた状態」で届く `src/` `prisma/` 配下のパス。

    scaffold-from-scratch.sh がコピーするので、読者はこれらを写経しない。
    構造の収支を数える検査は、この集合のファイルを対象から外す。写経していない
    行が既にそこに在るため、教材のブロックだけを数えても収支は合わない。

    ここで見るのは「読者の手元に在るか」だけで、中身が完成版と同じかは見ない。
    照合先として使えるかは別の問いなので `comparable_src_paths()` が答える。
    """
    return {dest for dest, _ in _scaffold_copies()}


def comparable_src_paths() -> set[str]:
    """「このリポジトリの ◯◯ と見比べて」の照合先として成立するパス。

    scaffold が配る現物が、このリポジトリの同じ位置のファイルと1バイト違わない
    ものだけを返す。中身が違えば、読者は自分の手元に無い版を見に行かされる。
    現に `prisma/schema.prisma` `src/server/api/root.ts` と `_app-components` の
    4ファイルは、配る版とこのリポジトリの版が違う。手元に在ることと、
    照合先として使えることは別である。
    """
    out: set[str] = set()
    for dest, src in _scaffold_copies():
        repo_file = REPO_ROOT / dest
        if repo_file.is_file() and repo_file.read_bytes() == src.read_bytes():
            out.add(dest)
    return out
