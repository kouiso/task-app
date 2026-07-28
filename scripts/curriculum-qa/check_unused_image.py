#!/usr/bin/env python3
"""`screenshots/` にあって、どの教材ファイルからも参照されない画像を見つける。

横断監査の3件目。71枚のうち16枚がどこからも参照されていなかった。販売ZIPには入るので、
読まれないまま 2.3MB を占めていた。16枚を消して 8.5MB が 6.4MB になっている。

参照が消えるのは本文を書き直したときで、消した本人には見えない。ここを機械で見ないと、
次に本文を直した人がまた同じ状態を作る。

逆向き（本文が指す画像が存在しない）は既存の相対リンク確認の担当なので、ここでは見ない。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

IMAGE_REF = re.compile(r"!\[[^\]]*\]\(([^)\s]+)[^)]*\)|<img[^>]+src=[\"']([^\"']+)[\"']")
IMAGE_SUFFIX = frozenset({".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"})


def referenced_names(md_files: list[Path]) -> set[str]:
    """教材が参照している画像のファイル名。"""
    names: set[str] = set()
    for p in md_files:
        for m in IMAGE_REF.finditer(p.read_text(encoding="utf-8")):
            value = m.group(1) or m.group(2)
            names.add(Path(value.split("#")[0].split("?")[0]).name)
    return names


def find_unused(root: Path) -> tuple[list[Path], int, int]:
    """(参照されない画像, 画像の総数, 走査した md の数) を返す。"""
    md_files = sorted(root.glob("*.md"))
    shots = root / "screenshots"
    if not shots.is_dir():
        return [], 0, len(md_files)
    images = sorted(
        f for f in shots.rglob("*") if f.is_file() and f.suffix.lower() in IMAGE_SUFFIX
    )
    used = referenced_names(md_files)
    return [f for f in images if f.name not in used], len(images), len(md_files)


def main(argv: list[str]) -> int:
    args = argv[1:] or ["material/30days-curriculum"]
    if len(args) != 1 or not Path(args[0]).is_dir():
        print("❌ 教材ディレクトリを1つ指定してください", file=sys.stderr)
        return 2
    root = Path(args[0])

    unused, total, md_count = find_unused(root)
    if total == 0:
        print(f"❌ 画像がありません: {root}/screenshots", file=sys.stderr)
        return 2
    if unused:
        size = sum(f.stat().st_size for f in unused)
        print(f"❌ どこからも参照されていない画像 {len(unused)} 枚（{size / 1024:.0f}KB）")
        for f in unused:
            print(f"  {f.relative_to(root)}")
        print("  参照を戻すか、削除してください。販売ZIPにはそのまま入ります。")
        return 1

    print(f"✅ 未参照の画像なし（画像 {total} 枚 / md {md_count} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
