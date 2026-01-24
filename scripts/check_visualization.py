#!/usr/bin/env python3
"""
ビジュアル化要素チェックスクリプト

1日あたりの表、Mermaid図、スクリーンショット参照の数をチェックします。
最小基準:
- 表: 4個以上
- Mermaid図: 1個以上
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple


def count_tables(content: str) -> int:
    """Markdown表の数をカウント"""
    # | を含む行が連続している部分をテーブルとして数える
    lines = content.split('\n')
    table_count = 0
    in_table = False

    for line in lines:
        is_table_line = '|' in line and line.strip().startswith('|')

        if is_table_line:
            if not in_table:
                table_count += 1
                in_table = True
        else:
            in_table = False

    return table_count

def count_mermaid(content: str) -> int:
    """Mermaid図の数をカウント"""
    # ```mermaid ... ``` で囲まれた部分
    return len(re.findall(r'```mermaid', content))

def count_screenshots(content: str) -> int:
    """スクリーンショット参照の数をカウント"""
    # ![...](../images/...) または [スクリーンショット: ...] の形式
    screenshot_refs = len(re.findall(r'!\[.*?\]\(.*?images.*?\)', content))
    screenshot_comments = len(re.findall(r'\[スクリーンショット:', content))
    return screenshot_refs + screenshot_comments

def count_code_blocks(content: str) -> int:
    """コードブロックの数をカウント"""
    return len(re.findall(r'```', content)) // 2  # 開始と終了でペア

def check_file(filepath: Path) -> Tuple[int, int, int, int, List[str]]:
    """
    ファイルをチェック

    Returns:
        (表数, Mermaid数, スクショ数, コードブロック数, [チェック項目])
    """
    try:
        content = filepath.read_text(encoding='utf-8')
    except Exception as e:
        print(f"❌ ファイル読込エラー: {filepath}")
        return 0, 0, 0, 0, []

    tables = count_tables(content)
    mermaid = count_mermaid(content)
    screenshots = count_screenshots(content)
    code_blocks = count_code_blocks(content)

    issues = []

    if tables < 4:
        issues.append(f"表が{tables}個です（目標: 4個以上）")

    if mermaid < 1:
        issues.append(f"Mermaid図が{mermaid}個です（目標: 1個以上）")

    return tables, mermaid, screenshots, code_blocks, issues

def main():
    """メイン処理"""
    if len(sys.argv) < 2:
        print("使用法: python check_visualization.py <directory_or_file>")
        print("例: python check_visualization.py material/30days-curriculum/")
        sys.exit(1)

    target_path = Path(sys.argv[1])

    if not target_path.exists():
        print(f"❌ パスが見つかりません: {target_path}")
        sys.exit(1)

    # Markdownファイル取得
    if target_path.is_dir():
        md_files = sorted(target_path.glob('day*.md'))
    else:
        md_files = [target_path]

    if not md_files:
        print(f"⚠️  Markdownファイルが見つかりません: {target_path}")
        sys.exit(0)

    print("=" * 70)
    print("🎨 ビジュアル化要素チェックスクリプト")
    print("=" * 70)
    print()

    files_with_issues = 0

    for md_file in md_files:
        tables, mermaid, screenshots, code_blocks, issues = check_file(md_file)

        if issues:
            files_with_issues += 1

        # 常に表示
        status = "⚠️ " if issues else "✅"
        print(f"{status} {md_file.name}")
        print(f"   📊 表: {tables}個 | 📈 Mermaid: {mermaid}個 | 📸 スクショ: {screenshots}個 | 💻 コード: {code_blocks}個")

        if issues:
            for issue in issues:
                print(f"   ⚠️  {issue}")

        print()

    print("=" * 70)
    if files_with_issues == 0:
        print("✅ 全てのファイルが基準を満たしています！")
        print("=" * 70)
        sys.exit(0)
    else:
        print(f"⚠️  {files_with_issues}ファイルが改善必要です")
        print("   目標: 表4個以上、Mermaid図1個以上")
        print("=" * 70)
        sys.exit(1)

if __name__ == '__main__':
    main()
