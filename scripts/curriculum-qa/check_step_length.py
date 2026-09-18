#!/usr/bin/env python3
"""コードブロックの長さと、完全なコピー単位に限る例外表記を確認する。"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from curriculum_blocks import has_filepath_marker  # noqa: E402
from markdown_scan import fence_states  # noqa: E402


LIMIT = 25
EXCEPTION_MARKER = "<!-- code-block-length-exception: complete-copy-unit -->"


def iter_blocks(content):
    """(開始行, コード行) を CommonMark のフェンス規則で返す。"""
    opened_at = None
    body = []
    for lineno, line, state, _fence in fence_states(content):
        if state == "open":
            opened_at, body = lineno, []
        elif state == "inside":
            body.append(line)
        elif state == "close" and opened_at is not None:
            yield opened_at, body
            opened_at, body = None, []
    if opened_at is not None:
        yield opened_at, body

def check_code_blocks(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    source_lines = content.split('\n')
    code_blocks = list(iter_blocks(content))

    errors = []
    used_markers = set()
    for i, (opened_at, body) in enumerate(code_blocks, 1):
        block = '\n'.join(body)
        lines = block.strip().split('\n')
        line_count = len(lines)
        marker_line = opened_at - 1
        has_exception = (
            marker_line >= 1
            and source_lines[marker_line - 1].strip() == EXCEPTION_MARKER
        )
        if has_exception:
            used_markers.add(marker_line)

        if has_exception and line_count <= LIMIT:
            errors.append(
                f"❌ コードブロック#{i}: {line_count}行なので長さ例外は不要です"
            )
        elif has_exception and not has_filepath_marker(block):
            errors.append(
                f"❌ コードブロック#{i}: 長さ例外には filepath: コメントが必要です"
            )
        elif line_count > LIMIT and not has_exception:
            errors.append(f"❌ コードブロック#{i}: {line_count}行（上限{LIMIT}行）")
            # 最初の3行と最後の3行を表示
            print(f"\nコードブロック#{i} ({line_count}行):")
            print('\n'.join(lines[:3]))
            print("...")
            print('\n'.join(lines[-3:]))

    for lineno, line in enumerate(source_lines, start=1):
        if line.strip() == EXCEPTION_MARKER and lineno not in used_markers:
            errors.append(
                f"❌ {lineno}行目: 長さ例外は対象コードブロックの直前に置いてください"
            )

    if errors:
        print(f"\n合計{len(errors)}個のコードブロックが制限超過")
        for error in errors:
            print(error)
        sys.exit(1)

    print(f"✅ 全{len(code_blocks)}個のコードブロックが長さ規約を満たしています")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("使用法: python check_step_length.py <filepath>")
        sys.exit(1)

    check_code_blocks(sys.argv[1])
