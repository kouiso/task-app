#!/usr/bin/env python3
"""
視覚化チェックスクリプト
- 表が4つ以上あるか
- スクショ位置が3箇所以上あるか
- Mermaid図が適切か（該当Dayのみ）
"""

import sys
import re

def check_visualization(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 表の数をカウント
    table_pattern = r'\|.*\|.*\|'
    tables = re.findall(table_pattern, content)
    table_count = len([t for t in tables if '---' not in t])  # ヘッダー行を除く

    # スクショ位置をカウント（複数パターンに対応）
    # 1. 旧形式: 【スクリーンショット:...】
    # 2. 絵文字マーカー: 📸
    # 3. Markdown画像リンク: ![...](./screenshots/...)
    screenshot_patterns = [
        r'【スクリーンショット[^】]*】',  # 旧形式: コロンあり・なし両対応
        r'📸',
        r'!\[.*?\]\(.*?\.png\)',
        r'!\[.*?\]\(.*?\.jpg\)',
        r'!\[.*?\]\(.*?screenshot.*?\)',
    ]
    # 重複を防ぐため行ベースでカウント（1行に複数パターンがマッチしても1件と数える）
    lines_with_screenshots = set()
    for i, line in enumerate(content.splitlines()):
        for pattern in screenshot_patterns:
            if re.search(pattern, line):
                lines_with_screenshots.add(i)
                break
    screenshot_count = len(lines_with_screenshots)

    # Mermaid図をカウント
    mermaid_pattern = r'```mermaid'
    mermaid_count = len(re.findall(mermaid_pattern, content))

    print(f"表の数: {table_count}")
    print(f"スクショ位置: {screenshot_count}")
    print(f"Mermaid図: {mermaid_count}")

    errors = []

    if table_count < 4:
        errors.append(f"❌ 表が不足（{table_count}/4以上）")
    else:
        print("✅ 表の数OK")

    if screenshot_count < 3:
        errors.append(f"❌ スクショ位置が不足（{screenshot_count}/3以上）")
    else:
        print("✅ スクショ位置OK")

    # Day番号を抽出
    day_match = re.search(r'day(\d+)', filepath.lower())
    if day_match:
        day_num = int(day_match.group(1))
        required_mermaid_days = [4, 7, 9, 13, 16, 21, 27]

        if day_num in required_mermaid_days:
            if mermaid_count == 0:
                errors.append(f"❌ Day {day_num}にはMermaid図が必須")
            else:
                print(f"✅ Mermaid図あり（Day {day_num}は必須）")

    if errors:
        for error in errors:
            print(error)
        sys.exit(1)

    print("✅ 視覚化チェックPASS")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("使用法: python check_visualization.py <filepath>")
        sys.exit(1)

    check_visualization(sys.argv[1])
