#!/usr/bin/env python3
"""check_unused_image.py の退行テスト。

止めるもの（どこからも参照されない画像）と、止めてはいけないもの（相対パスでの参照、
`<img src=...>` での参照、クエリ付きの参照、画像でないファイル）の両方を置く。
"""

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_unused_image import find_unused, main  # noqa: E402

CASES: list[tuple[str, str, list[str], list[str]]] = [
    (
        "参照されない画像を止める",
        "![a](./screenshots/a.png)\n",
        ["a.png", "b.png"],
        ["b.png"],
    ),
    (
        "相対パスの参照を認める",
        "![a](./screenshots/a.png)\n",
        ["a.png"],
        [],
    ),
    (
        "img タグの参照を認める",
        '<img src="screenshots/a.png" alt="a">\n',
        ["a.png"],
        [],
    ),
    (
        "クエリやアンカー付きでも参照とみなす",
        "![a](./screenshots/a.png?v=2)\n",
        ["a.png"],
        [],
    ),
    (
        "画像でないファイルは対象外",
        "![a](./screenshots/a.png)\n",
        ["a.png", "notes.txt"],
        [],
    ),
]


def build(d: Path, md: str, images: list[str]) -> None:
    (d / "screenshots").mkdir()
    (d / "day01_x.md").write_text(md, encoding="utf-8")
    for name in images:
        (d / "screenshots" / name).write_bytes(b"x")


def check_exit_code() -> tuple[int, int]:
    def run(args: list[str]) -> int:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return main(args)

    failed = 0
    cases = [
        ("未参照があれば 1 を返す", ["a.png", "b.png"], 1),
        ("全部参照されていれば 0 を返す", ["a.png"], 0),
    ]
    for name, images, want in cases:
        with tempfile.TemporaryDirectory() as d:
            build(Path(d), "![a](./screenshots/a.png)\n", images)
            if run(["check_unused_image.py", d]) != want:
                failed += 1
                print(f"  ❌ {name}")
    if run(["check_unused_image.py", "/no/such/path"]) != 2:
        failed += 1
        print("  ❌ 見つからないパスで 2 を返さない")
    with tempfile.TemporaryDirectory() as d:
        if run(["check_unused_image.py", d]) != 2:
            failed += 1
            print("  ❌ 画像が1枚も無いときに 2 を返さない")
    return failed, len(cases) + 2


def main_test() -> int:
    failed = 0
    for name, md, images, expected in CASES:
        with tempfile.TemporaryDirectory() as d:
            build(Path(d), md, images)
            unused, _, _ = find_unused(Path(d))
            got = [f.name for f in unused]
        if sorted(got) != sorted(expected):
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    exit_failed, exit_total = check_exit_code()
    failed += exit_failed
    total = len(CASES) + exit_total
    if failed:
        print(f"❌ check_unused_image 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_unused_image 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main_test())
