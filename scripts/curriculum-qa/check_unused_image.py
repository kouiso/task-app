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

from markdown_scan import mask_html_comments, strip_fences

# 画像の書き方は3通りある。inline（`![a](path)`）、`<img src=...>`、そして
# 参照形式（`![a][label]` と `[label]: path` の組）。参照形式を取り落とすと、
# 読者の画面には確かに出ている画像を「未参照」として消させることになる。
# 参照形式のラベルは group(3)、省略形（`![a][]` / `![a]`）は alt がラベルを兼ねる。
IMAGE_REF = re.compile(
    r"!\[([^\]]*)\](?:\(([^)\s]+)[^)]*\)|\[([^\]]*)\])?"
    r"|<img[^>]+src=[\"']([^\"']+)[\"']"
)
# 参照形式の定義行。`[label]: ./screenshots/a.png "title"` の形を取る。
LINK_DEF = re.compile(r"^\s{0,3}\[([^\]]+)\]:\s*<?([^\s>]+)>?", re.M)
IMAGE_SUFFIX = frozenset({".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"})


def referenced_names(md_files: list[Path], root: Path) -> tuple[set[str], set[str]]:
    """教材が参照している画像を (root からの相対パス, 解けなかった参照のファイル名) で返す。

    ファイル名だけで突き合わせると、`day01/result.png` への参照が
    `day02/result.png` まで参照済みにしてしまう。画像は入れ子のディレクトリから
    再帰的に拾っているので、突き合わせる側も相対パスへ揃える。

    root の外を指す参照や、URL のように解けない参照はパスにならない。それらは
    ファイル名だけを持って戻す。ここで捨てると、参照されている画像を
    「未参照」として消させることになる。誤検知の側へは倒さない。

    コードブロックの中は数えない。書き方の例として見せている `![](...)` や
    `<img>` は読者に markup のまま表示されるので、画像は1枚も描画されない。
    それを参照として数えると、本当にどこにも出てこない画像がゲートを通る。

    HTML コメントの中も同じく数えない。`<!-- ![old](...) -->` は Markdown が
    読者に表示しないので、そこに残った古い参照は画像を1枚も出さない。数えると、
    本文から消えたまま ZIP に入り続ける画像がゲートを通る。
    """
    paths: set[str] = set()
    loose: set[str] = set()
    base = root.resolve()
    for p in md_files:
        prose = mask_html_comments(strip_fences(p.read_text(encoding="utf-8")))
        labels = {m.group(1).lower(): m.group(2) for m in LINK_DEF.finditer(prose)}
        for m in IMAGE_REF.finditer(prose):
            alt, inline, label, img = m.groups()
            if inline is not None:
                value = inline
            elif img is not None:
                value = img
            else:
                # `![a][b]` は b、`![a][]` と `![a]` は alt をラベルとして引く。
                value = labels.get((label or alt or "").lower(), "")
            value = value.split("#")[0].split("?")[0]
            if not value:
                continue
            try:
                resolved = (p.parent / value).resolve()
                paths.add(str(resolved.relative_to(base)))
            except (ValueError, OSError):
                loose.add(Path(value).name)
    return paths, loose


def find_unused(root: Path) -> tuple[list[Path], int, int]:
    """(参照されない画像, 画像の総数, 走査した md の数) を返す。"""
    md_files = sorted(root.glob("*.md"))
    shots = root / "screenshots"
    if not shots.is_dir():
        return [], 0, len(md_files)
    images = sorted(
        f for f in shots.rglob("*") if f.is_file() and f.suffix.lower() in IMAGE_SUFFIX
    )
    used, loose = referenced_names(md_files, root)
    unused = [
        f
        for f in images
        if str(f.resolve().relative_to(root.resolve())) not in used and f.name not in loose
    ]
    return unused, len(images), len(md_files)


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
