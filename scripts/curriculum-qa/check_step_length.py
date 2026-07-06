#!/usr/bin/env python3
"""
コードブロック長さチェックスクリプト
全てのコードブロックが25行以下であることを確認
"""

import sys
import re

def check_code_blocks(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # コードブロックを抽出（```で囲まれた部分）
    code_block_pattern = r'```[\w]*\n(.*?)```'
    code_blocks = re.findall(code_block_pattern, content, re.DOTALL)

    errors = []
    for i, block in enumerate(code_blocks, 1):
        lines = block.strip().split('\n')
        line_count = len(lines)

        if line_count > 25:
            errors.append(f"❌ コードブロック#{i}: {line_count}行（上限25行）")
            # 最初の3行と最後の3行を表示
            print(f"\nコードブロック#{i} ({line_count}行):")
            print('\n'.join(lines[:3]))
            print("...")
            print('\n'.join(lines[-3:]))

    if errors:
        print(f"\n合計{len(errors)}個のコードブロックが制限超過")
        for error in errors:
            print(error)
        sys.exit(1)

    print(f"✅ 全{len(code_blocks)}個のコードブロックが25行以下")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("使用法: python check_step_length.py <filepath>")
        sys.exit(1)

    check_code_blocks(sys.argv[1])
