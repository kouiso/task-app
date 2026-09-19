#!/usr/bin/env python3
"""check_complete_code.py の退行テスト。

検査は「教材が最後に出す完全な版」と src/ の骨格比較である。
折り返し・コメント・文字列連結の差は差分にしない規則と、
最終日が断片しか出さないファイルは対象外にする規則が崩れると、
実際には一致している日が落ちたり、ずれている日が緑になったりする。
"""

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import check_complete_code  # noqa: E402
from check_complete_code import check_corpus, code_tokens  # noqa: E402

BLOCK = "```typescript\n// filepath: src/a.ts\n{body}\n```"
COMPLETE = """export function greet() {{
  return 'hello';
}}
"""


def write_case(
    root: Path,
    material: dict[str, str],
    src: dict[str, str],
) -> Path:
    """テスト用の教材と src/ を tmp ツリーに作る。"""
    mat = root / "material"
    mat.mkdir()
    for name, body in material.items():
        (mat / name).write_text(body, encoding="utf-8")
    for name, body in src.items():
        p = root / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body, encoding="utf-8")
    return mat


def run(material: dict[str, str], src: dict[str, str]) -> int:
    with tempfile.TemporaryDirectory() as d:
        mat = write_case(Path(d), material, src)
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            _reports, failures = check_corpus(mat, Path(d))
        return failures


CASES: list[tuple[str, dict[str, str], dict[str, str], int]] = [
    (
        "完成版が src/ と一致すれば差なし",
        {"day01_a.md": BLOCK.format(body=COMPLETE)},
        {"src/a.ts": COMPLETE},
        0,
    ),
    (
        "完成版が古いと落ちる",
        {"day01_a.md": BLOCK.format(body="export function greet() {\n  return 'hi';\n}\n")},
        {"src/a.ts": COMPLETE},
        1,
    ),
    (
        "行折り返しの違いは差分にしない",
        {"day01_a.md": BLOCK.format(
            body="export function greet(\n): string {\n  return 'hello';\n}\n"
        )},
        {"src/a.ts": "export function greet(): string {\n  return 'hello';\n}\n"},
        0,
    ),
    (
        "コメントの違いは差分にしない",
        {"day01_a.md": BLOCK.format(
            body="// 挨拶を返す\nexport function greet() {\n  return 'hello';\n}\n"
        )},
        {"src/a.ts": "/** 挨拶 */\nexport function greet() {\n  return 'hello';\n}\n"},
        0,
    ),
    (
        "文字列連結の違いは差分にしない",
        {"day01_a.md": BLOCK.format(
            body="export const s = 'abc' +\n  'def';\n"
        )},
        {"src/a.ts": "export const s = 'abcdef';\n"},
        0,
    ),
    (
        "途中の日の版は見ない（最終日が完成版なら照合する）",
        {
            "day01_a.md": BLOCK.format(body="export const v = 1;\n"),
            "day05_b.md": BLOCK.format(body=COMPLETE),
        },
        {"src/a.ts": COMPLETE},
        0,
    ),
    (
        "最終日が断片しか出さないファイルは対象外",
        {
            "day01_a.md": BLOCK.format(body=COMPLETE),
            # オブジェクトの1要素の抜粋。先頭が宣言でないので完全な版ではない。
            "day05_b.md": "```typescript\n// filepath: src/a.ts（delete の直後に追加）\n  extra: 1,\n```\n",
        },
        {"src/a.ts": "export const v = 99;\n"},
        0,
    ),
    (
        "src/ に対応ファイルが無ければ落ちる",
        {"day01_a.md": BLOCK.format(body=COMPLETE)},
        {},
        1,
    ),
    (
        "完成版が無いファイルだけの corpus でも落ちない",
        {
            "day01_a.md": "```typescript\n// filepath: src/a.ts（delete の直後に追加）\n  extra,\n```\n",
        },
        {"src/a.ts": "export const v = 1;\n"},
        0,
    ),
]


def token_cases() -> int:
    cases = [
        ("コメントを除く", "// a\nconst x = 1;", ["const", "x", "=", "1", ";"]),
        ("ブロックコメントを除く", "/* a */ const x = 1;", ["const", "x", "=", "1", ";"]),
        ("文字列は残す", "const s = 'a // b';", ["const", "s", "=", "'a // b'", ";"]),
        (
            "連結を畳む",
            "const s = 'a' + 'b';",
            ["const", "s", "=", "'ab'", ";"],
        ),
        (
            "引用符が違う連結は畳まない",
            "const s = 'a' + \"b\";",
            ["const", "s", "=", "'a'", "+", '"b"', ";"],
        ),
    ]
    failed = 0
    for name, text, expected in cases:
        got = code_tokens(text)
        if got != expected:
            failed += 1
            print(f"  ❌ tokens {name}: 期待 {expected} / 実際 {got}")
    return failed


def main() -> int:
    failed = 0
    for name, material, src, expected in CASES:
        got = run(material, src)
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    failed += token_cases()
    total = len(CASES) + 5
    if failed:
        print(f"❌ check_complete_code 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_complete_code 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
