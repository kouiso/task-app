#!/usr/bin/env python3
"""
ステップ連続性チェックスクリプト
- 各ステップに実装コードがあるか
- filepathコメントがあるか
- 確認ポイントがあるか
"""

import sys
import re

def check_step_completeness(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # ステップセクションを抽出
    step_pattern = r'### Step \d+:.*?(?=\n### Step \d+:|\n## [^#]|\Z)'
    steps = re.findall(step_pattern, content, re.DOTALL)

    print(f"検出されたステップ数: {len(steps)}")

    errors = []

    for i, step in enumerate(steps, 1):
        step_errors = []

        # コードブロックの有無
        if '```' not in step:
            step_errors.append("コードブロックなし")
        else:
            # filepathコメントの有無
            if '// filepath:' not in step and '# filepath:' not in step:
                step_errors.append("filepathコメントなし")

        # 確認ポイントの有無
        if '✅' not in step and '確認ポイント' not in step:
            step_errors.append("確認ポイントなし")

        if step_errors:
            errors.append(f"❌ Step {i}: {', '.join(step_errors)}")

    if errors:
        print("\nステップ不備:")
        for error in errors:
            print(error)
        sys.exit(1)

    print(f"✅ 全{len(steps)}ステップが完全")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("使用法: python check_no_skip.py <filepath>")
        sys.exit(1)

    check_step_completeness(sys.argv[1])
