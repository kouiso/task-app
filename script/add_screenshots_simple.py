#!/usr/bin/env python3
"""スクリーンショット位置を自動追加（シンプル版）"""

import sys
import re
from pathlib import Path


def add_screenshots_to_file(filepath):
    """指定されたファイルにスクリーンショット位置を追加"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    modified = False

    # 1. 今日のゴールセクションにスクリーンショットを追加
    if '## 🎯 今日のゴール' in content:
        goal_section = re.search(
            r'(## 🎯 今日のゴール\n\n.+?\n)\n(## 🤔)',
            content,
            re.DOTALL
        )
        if goal_section and '【スクリーンショット:' not in goal_section.group(1):
            content = content.replace(
                goal_section.group(0),
                f"{goal_section.group(1)}\n【スクリーンショット: 完成画面】\n\n{goal_section.group(2)}"
            )
            modified = True

    # 2. 各Stepの確認ポイント後にスクリーンショットを追加
    # パターン: "✅ **確認ポイント**:" から "📝 **学んだこと**:" の間
    step_sections = list(re.finditer(
        r'(✅ \*\*確認ポイント\*\*:.*?)\n\n(📝 \*\*学んだこと\*\*:)',
        content,
        re.DOTALL
    ))

    for match in reversed(step_sections):  # 後ろから置換して位置がずれないようにする
        confirmation_part = match.group(1)
        learned_part = match.group(2)

        if '【スクリーンショット:' not in confirmation_part:
            replacement = f"{confirmation_part}\n\n【スクリーンショット: 確認画面】\n\n{learned_part}"
            content = content[:match.start()] + replacement + content[match.end():]
            modified = True

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        new_count = len(re.findall(r'\[スクリーンショット:', content))
        print(f"✅ {filepath.name}: {new_count}箇所のスクリーンショット位置")
        return True
    else:
        old_count = len(re.findall(r'\[スクリーンショット:', original_content))
        if old_count >= 3:
            print(f"✓  {filepath.name}: 既に{old_count}箇所あり")
        else:
            print(f"⚠️  {filepath.name}: 追加できませんでした")
        return False


def main():
    curriculum_dir = Path('material/30days-curriculum')
    day_files = sorted(curriculum_dir.glob('day*.md'))

    print(f"🔍 {len(day_files)}個の教材ファイルを処理します...\n")

    modified_count = 0
    for filepath in day_files:
        if add_screenshots_to_file(filepath):
            modified_count += 1

    print(f"\n✅ 完了: {modified_count}/{len(day_files)}ファイルを更新しました")


if __name__ == '__main__':
    main()
