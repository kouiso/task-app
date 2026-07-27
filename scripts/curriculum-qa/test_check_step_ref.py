#!/usr/bin/env python3
"""check_step_ref.py の退行テスト。

止めるもの（存在しない Step への参照）と、止めてはいけないもの（在る Step、他の日への
参照、コードブロックの中）の両方を置く。片方だけでは、全部を止める検査でも全部を通す
検査でも緑になってしまう。
"""

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_step_ref import find_bad_refs, headings  # noqa: E402

CASES: list[tuple[str, dict[str, str], list[tuple[str, int]]]] = [
    (
        "この日に無い Step を指したら拾う",
        {"day05_x.md": "### Step 1: あ\n\nStep 9 で書いた値を使います。\n"},
        [("day05_x.md", 3)],
    ),
    (
        "在る Step なら通す",
        {"day05_x.md": "### Step 1: あ\n\nStep 1 で書いた値を使います。\n"},
        [],
    ),
    (
        "2段の見出しでも在ると認める",
        {"day02_x.md": "## Step 1: あ\n\nStep 1 で書いた値を使います。\n"},
        [],
    ),
    (
        "区切りの前に空白があっても在ると認める",
        {"day17_x.md": "### Step 3 : あ\n\nStep 3 で書いた値を使います。\n"},
        [],
    ),
    (
        "他の日への参照は、その日の見出しで判定する",
        {
            "day11_x.md": "### Step 9: あ\n",
            "day12_x.md": "### Step 0: い\n\nDay 11 Step 9 で仮定義した値を消します。\n",
        },
        [],
    ),
    (
        "他の日に無い Step を指したら拾う",
        {
            "day11_x.md": "### Step 1: あ\n",
            "day12_x.md": "### Step 0: い\n\nDay 11 Step 9 で仮定義した値を消します。\n",
        },
        [("day12_x.md", 3)],
    ),
    (
        "コードブロックの中は対象外",
        {"day05_x.md": "### Step 1: あ\n\n```tsx\n// Step 9 で書いた値\n```\n"},
        [],
    ),
]


def check_exit_code() -> tuple[int, int]:
    """main() の戻り値まで見る。(失敗数, 実行したケース数) を返す。

    ケースを直接 find_bad_refs に当てるだけだと、main() が指摘を持ちながら 0 を返すよう
    壊れても自己テストは緑のままになる。CI は終了コードしか見ないので、そこを塞ぐ。
    """
    import check_step_ref

    # 合格した回に ❌ を出さないよう、検査自身の出力は捨てる。
    def run(args: list[str]) -> int:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return check_step_ref.main(args)

    failed = 0
    cases = [
        ("この日に無い Step を指したら 1 を返す", "### Step 1: あ\n\nStep 9 で書いた値。\n", 1),
        ("存在しない Day を指したら 1 を返す", "### Step 1: あ\n\nDay 99 の Step 1 で書いた値。\n", 1),
        ("指摘が無ければ 0 を返す", "### Step 1: あ\n\nStep 1 で書いた値。\n", 0),
    ]
    for name, body, want in cases:
        with tempfile.TemporaryDirectory() as d:
            Path(d, "day05_x.md").write_text(body, encoding="utf-8")
            if run(["check_step_ref.py", d]) != want:
                failed += 1
                print(f"  ❌ {name}")
    # 対象が見つからない経路。`return 2` は2か所あるので両方を塞ぐ。
    if run(["check_step_ref.py", "/no/such/path"]) != 2:
        failed += 1
        print("  ❌ 見つからないパスで 2 を返さない")
    with tempfile.TemporaryDirectory() as d:
        if run(["check_step_ref.py", d]) != 2:
            failed += 1
            print("  ❌ 対象0件で 2 を返さない")
    return failed, len(cases) + 2


def main() -> int:
    failed = 0
    for name, files, expected in CASES:
        with tempfile.TemporaryDirectory() as d:
            paths = []
            for fname, body in files.items():
                p = Path(d) / fname
                p.write_text(body, encoding="utf-8")
                paths.append(p)
            by_day = {
                int(p.name[3:5]): headings(p.read_text(encoding="utf-8")) for p in paths
            }
            got = []
            for p in paths:
                own = by_day[int(p.name[3:5])]
                got += [(p.name, line) for line, _, _ in find_bad_refs(p, own, by_day)]
        if sorted(got) != sorted(expected):
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    exit_failed, exit_total = check_exit_code()
    failed += exit_failed
    total = len(CASES) + exit_total
    if failed:
        print(f"❌ check_step_ref 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_step_ref 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
