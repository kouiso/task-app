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
    (
        "同名でもディレクトリが違えば別の画像として見る",
        "![a](./screenshots/day01/result.png)\n",
        ["day01/result.png", "day02/result.png"],
        ["day02/result.png"],
    ),
    (
        "入れ子のディレクトリの参照を認める",
        "![a](./screenshots/day01/result.png)\n"
        '<img src="screenshots/day02/result.png" alt="b">\n',
        ["day01/result.png", "day02/result.png"],
        [],
    ),
    (
        "教材の外を指す参照はファイル名で拾って未参照にしない",
        "![a](../../shared/a.png)\n",
        ["a.png"],
        [],
    ),
    (
        "コードブロックの中の書き方の例は参照ではない",
        "画像はこう書きます。\n\n```markdown\n![a](./screenshots/a.png)\n```\n",
        ["a.png"],
        ["a.png"],
    ),
    (
        "コードブロックの中の img タグも参照ではない",
        '```html\n<img src="screenshots/a.png" alt="a">\n```\n',
        ["a.png"],
        ["a.png"],
    ),
    (
        "コードブロックの外に参照があれば通す",
        "![a](./screenshots/a.png)\n\n```markdown\n![b](./screenshots/b.png)\n```\n",
        ["a.png"],
        [],
    ),
]

# ワークフローの起動条件が、この検査の見る拡張子を全部覆っているか。
# png だけに絞られていると、未参照の webp を足すPRでゲートが一度も走らない。
WORKFLOW = Path(__file__).resolve().parents[2] / ".github/workflows/material-gate.yml"


def check_workflow_paths() -> tuple[int, int]:
    from check_unused_image import IMAGE_SUFFIX

    text = WORKFLOW.read_text(encoding="utf-8")
    # `pull_request` と `push` で別々に書くため、両方に在ることを件数で見る。
    failed = 0
    for suffix in sorted(IMAGE_SUFFIX):
        got = text.count(f"- 'material/**/*{suffix}'")
        if got < 2:
            failed += 1
            print(f"  ❌ material-gate.yml の起動条件に {suffix} が {got} 箇所しかない（期待 2）")
    return failed, len(IMAGE_SUFFIX)


def build(d: Path, md: str, images: list[str]) -> None:
    (d / "screenshots").mkdir()
    (d / "day01_x.md").write_text(md, encoding="utf-8")
    for name in images:
        target = d / "screenshots" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"x")


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
            got = [str(f.relative_to(Path(d) / "screenshots")) for f in unused]
        if sorted(got) != sorted(expected):
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    exit_failed, exit_total = check_exit_code()
    failed += exit_failed
    workflow_failed, workflow_total = check_workflow_paths()
    failed += workflow_failed
    total = len(CASES) + exit_total + workflow_total
    if failed:
        print(f"❌ check_unused_image 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_unused_image 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main_test())
