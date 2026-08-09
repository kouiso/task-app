#!/usr/bin/env python3
"""
コード完全性チェックスクリプト
- filepath: コメントがあるか
- パート1/2形式の分割禁止
- 省略コメント禁止
"""

import sys
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from curriculum_blocks import has_filepath_marker  # noqa: E402
from markdown_scan import code_blocks as iter_code_blocks  # noqa: E402

# filepath 目印を求めない言語。求めないのはこの検査だけで、省略コメントと
# パート分割は言語に関わらず見る。`bash` に「// 省略」と書いても素通りしていた。
FILEPATH_EXEMPT_LANGS = ('bash', 'shell', 'sh', 'zsh', 'mermaid')
FILEPATH_REQUIRED_LANGS = ('typescript', 'javascript', 'tsx', 'jsx', 'ts', 'js')


def check_code_completeness(filepath: str) -> bool:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    warnings = []

    # フェンスの解釈は markdown_scan に寄せる。自前の ```` ```(\w+)?\n ```` は
    # ```` ```text title="post" ```` のような属性付きフェンスに一致せず、その開き
    # フェンスが本文扱いになって以降の対がずれる。ずれた先のブロックは丸ごと
    # 検査されないまま緑になる。
    blocks = [(lang, "\n".join(line for _lineno, line in body))
              for lang, body in iter_code_blocks(content)]

    if not blocks:
        print("⚠️ コードブロックが見つかりません")
        return True

    total_blocks = len(blocks)
    blocks_with_filepath = 0

    for i, (lang, code) in enumerate(blocks, 1):
        if lang not in FILEPATH_EXEMPT_LANGS:
            # filepath: コメントのチェック
            if has_filepath_marker(code):
                blocks_with_filepath += 1
            elif lang in FILEPATH_REQUIRED_LANGS:
                warnings.append(f"⚠️ コードブロック {i}: filepath: コメントがありません")

        # パート分割の禁止チェック
        part_patterns = [
            r'パート\s*\d+\s*/\s*\d+',
            r'Part\s*\d+\s*/\s*\d+',
            r'（パート\d+）',
            r'\(Part\s*\d+\)',
        ]
        for pattern in part_patterns:
            if re.search(pattern, code, re.IGNORECASE):
                errors.append(f"❌ コードブロック {i}: パート分割形式を使用しています")

        # 省略コメントの禁止チェック
        skip_patterns = [
            (r'//\s*\.\.\.残り', '// ...残り'),
            (r'//\s*省略', '// 省略'),
            (r'//\s*以下略', '// 以下略'),
            (r'//\s*etc', '// etc'),
            (r'/\*\s*\.\.\.\s*\*/', '/* ... */'),
            (r'//\s*同様に', '// 同様に'),
            (r'//\s*残りは同じ', '// 残りは同じ'),
        ]
        for pattern, display in skip_patterns:
            if re.search(pattern, code, re.IGNORECASE):
                errors.append(f"❌ コードブロック {i}: 省略コメント「{display}」を使用しています")

    # 結果表示
    print(f"コードブロック数: {total_blocks}")
    print(f"filepath:コメント付き: {blocks_with_filepath}")

    for warning in warnings:
        print(warning)

    for error in errors:
        print(error)

    if errors:
        print("❌ コード完全性チェックFAIL")
        return False

    if warnings:
        print("⚠️ コード完全性チェックPASS（警告あり）")
    else:
        print("✅ コード完全性チェックPASS")

    return True


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("使用法: python check_code_completeness.py <filepath>")
        sys.exit(1)

    success = check_code_completeness(sys.argv[1])
    sys.exit(0 if success else 1)
