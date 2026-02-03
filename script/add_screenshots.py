#!/usr/bin/env python3
"""
全教材にスクリーンショット位置を自動追加
各Stepの直後に【スクリーンショット: xxx】を挿入
"""

import sys
import re
from pathlib import Path

def add_screenshots_to_file(filepath):
    """指定されたファイルにスクリーンショット位置を追加"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 既にスクリーンショット位置が3つ以上ある場合はスキップ
    screenshot_count = len(re.findall(r'\[スクリーンショット:', content))
    if screenshot_count >= 3:
        print(f"✅ {filepath.name}: 既に{screenshot_count}箇所のスクリーンショット位置あり")
        return False

    # 今日のゴールセクションにスクリーンショットを追加
    if '【スクリーンショット:' not in content.split('## 🤔')[0]:
        content = re.sub(
            r'(## 🎯 今日のゴール\n\n.*?\n)',
            r'\1\n【スクリーンショット: 完成画面】\n',
            content,
            count=1
        )

    # 各Stepの確認ポイント後にスクリーンショットを追加
    # パターン: "✅ **確認ポイント**:" の後、次のセクション（---または📝）の前
    lines = content.split('\n')
    new_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]
        new_lines.append(line)

        # 確認ポイントセクションを検出
        if line.strip().startswith('✅ **確認ポイント**'):
            # 確認ポイントの内容をスキップ（次の空行まで）
            i += 1
            while i < len(lines) and lines[i].strip():
                new_lines.append(lines[i])
                i += 1

            # 空行の後にスクリーンショットを追加（既になければ）
            if i < len(lines) - 1:
                if i + 1 < len(lines) and '【スクリーンショット:' not in lines[i + 1]:
                    new_lines.append('')  # 空行
                    new_lines.append('【スクリーンショット: 確認画面】')
                    screenshot_count += 1
                    continue

        i += 1

    content = '\n'.join(new_lines)

    # ファイルに書き戻し
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    new_screenshot_count = len(re.findall(r'\[スクリーンショット:', content))
    added_count = new_screenshot_count - screenshot_count

    if added_count > 0:
        print(f"✅ {filepath.name}: {added_count}箇所のスクリーンショット位置を追加（合計: {new_screenshot_count}）")
        return True
    else:
        print(f"⚠️  {filepath.name}: スクリーンショット位置を追加できませんでした")
        return False

def main():
    curriculum_dir = Path('material/30days-curriculum')

    if not curriculum_dir.exists():
        print("❌ エラー: material/30days-curriculum/ が見つかりません")
        sys.exit(1)

    day_files = sorted(curriculum_dir.glob('day*.md'))

    if not day_files:
        print("❌ エラー: day*.md ファイルが見つかりません")
        sys.exit(1)

    print(f"🔍 {len(day_files)}個の教材ファイルを処理します...\n")

    modified_count = 0
    for filepath in day_files:
        if add_screenshots_to_file(filepath):
            modified_count += 1

    print(f"\n✅ 完了: {modified_count}/{len(day_files)}ファイルを更新しました")

if __name__ == '__main__':
    main()
