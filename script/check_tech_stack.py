#!/usr/bin/env python3
"""
技術スタックチェックスクリプト
- shadcn/ui + Tailwind CSS 必須
- Material-UI (MUI) 禁止
"""

import sys
import re


def check_tech_stack(filepath: str) -> bool:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    warnings = []

    # コードブロックを抽出
    code_block_pattern = r'```(\w+)?\n(.*?)```'
    code_blocks = re.findall(code_block_pattern, content, re.DOTALL)

    # MUI禁止パターン
    mui_patterns = [
        (r"from\s+['\"]@mui/material['\"]", "@mui/material"),
        (r"from\s+['\"]@mui/icons-material['\"]", "@mui/icons-material"),
        (r"from\s+['\"]@mui/system['\"]", "@mui/system"),
        (r"from\s+['\"]@emotion/react['\"]", "@emotion/react"),
        (r"from\s+['\"]@emotion/styled['\"]", "@emotion/styled"),
        (r"<Box\s", "<Box> (MUI)"),
        (r"<Typography\s", "<Typography> (MUI)"),
        (r"<TextField\s", "<TextField> (MUI)"),
        (r"sx=\{", "sx={{ }} (MUI style prop)"),
    ]

    # shadcn/ui推奨パターン
    shadcn_patterns = [
        r"from\s+['\"]@/components?/ui/",
        r"from\s+['\"]lucide-react['\"]",
        r'className="',
    ]

    mui_found = []
    shadcn_found = False

    for lang, code in code_blocks:
        # mermaidやbashはスキップ
        if lang and lang.lower() in ('mermaid', 'bash', 'shell', 'sh'):
            continue

        # MUIパターンをチェック
        for pattern, name in mui_patterns:
            if re.search(pattern, code):
                mui_found.append(name)

        # shadcn/uiパターンをチェック
        for pattern in shadcn_patterns:
            if re.search(pattern, code):
                shadcn_found = True
                break

    # 結果表示
    if mui_found:
        unique_mui = list(set(mui_found))
        for mui in unique_mui:
            errors.append(f"❌ MUI使用禁止: {mui}")

    if shadcn_found:
        print("✅ shadcn/ui パターン検出")
    else:
        if code_blocks:
            # コードブロックがあるのにshadcn/uiがない
            warnings.append("⚠️ shadcn/uiパターンが検出されませんでした")

    for warning in warnings:
        print(warning)

    for error in errors:
        print(error)

    if errors:
        print("❌ 技術スタックチェックFAIL")
        return False

    print("✅ 技術スタックチェックPASS")
    return True


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("使用法: python check_tech_stack.py <filepath>")
        sys.exit(1)

    success = check_tech_stack(sys.argv[1])
    sys.exit(0 if success else 1)
