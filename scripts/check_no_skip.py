#!/usr/bin/env python3
"""
AIの「手抜き」検出スクリプト

禁止ワード（ステップを飛ばす表現）をMarkdownファイルから検出します。
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple

# 禁止ワードのパターン
FORBIDDEN_PATTERNS = [
    (r'同様に', '「同様に」はステップ飛ばしの代表例です。具体的なコードを書いてください。'),
    (r'残りも', '「残りも」で実装を省略しないでください。全てのファイルを明示してください。'),
    (r'以下同じ', '「以下同じ」で省略しないでください。全て書いてください。'),
    (r'以下略', '「以下略」で省略しないでください。全て書いてください。'),
    (r'その他も', '「その他も」で省略しないでください。全て書いてください。'),
    (r'同じように', '「同じように」で省略しないでください。具体的に書いてください。'),
    (r'同様の手順で', '「同様の手順で」は禁止です。具体的なステップを書いてください。'),
    (r'同じ方法で', '「同じ方法で」は禁止です。具体的に書いてください。'),
    (r'簡単です', '「簡単です」という主観的表現は禁止です。'),
    (r'すぐできます', '「すぐできます」は禁止です。具体的な手順を書いてください。'),
    (r'おなじ', '「おなじ」で省略しないでください。'),
]

def check_file(filepath: Path) -> Tuple[int, List[Tuple[int, str, str]]]:
    """
    ファイルをチェックして禁止ワードの出現箇所を返す。

    Returns:
        (総エラー数, [(行番号, 禁止ワード, メッセージ), ...])
    """
    errors: List[Tuple[int, str, str]] = []

    try:
        content = filepath.read_text(encoding='utf-8')
    except Exception as e:
        print(f"❌ ファイル読込エラー: {filepath}")
        print(f"   {e}")
        return 0, []

    lines = content.split('\n')

    for line_num, line in enumerate(lines, 1):
        # コードブロック内は検査対象外
        if line.strip().startswith('```'):
            continue

        for pattern, message in FORBIDDEN_PATTERNS:
            if re.search(pattern, line):
                errors.append((line_num, pattern, message))

    return len(errors), errors

def main():
    """メイン処理"""
    if len(sys.argv) < 2:
        print("使用法: python check_no_skip.py <directory_or_file>")
        print("例: python check_no_skip.py material/30days-curriculum/")
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
    print("🔍 禁止ワード検出スクリプト")
    print("=" * 70)
    print()

    total_errors = 0
    files_with_errors = 0

    for md_file in md_files:
        error_count, errors = check_file(md_file)
        total_errors += error_count

        if errors:
            files_with_errors += 1
            print(f"⚠️  {md_file.name}: {error_count}個の問題")
            for line_num, pattern, message in errors:
                print(f"   L{line_num}: '{pattern}' → {message}")
            print()

    print("=" * 70)
    if total_errors == 0:
        print("✅ 禁止ワードは見つかりませんでした！")
        print("=" * 70)
        sys.exit(0)
    else:
        print(f"❌ {files_with_errors}ファイルに {total_errors}個の問題が見つかりました")
        print("=" * 70)
        sys.exit(1)

if __name__ == '__main__':
    main()
