#!/usr/bin/env python3
"""視覚化チェックスクリプト
- 表が4つ以上あるか
- スクショ位置が3箇所以上あるか
- 同一ファイル内で同じ画像を貼り回していないか
- Mermaid図が適切か（該当Dayのみ）

## 同一日での画像重複について（既定は WARNING）

「スクショ位置3箇所以上」という下限だけを機械で要求すると、同じ画像を3回貼って
数を満たす逃げ道が残る。実際にこの corpus では Step 3 の結果として貼られた画像が
Step 9 の完成形と同じになっている箇所があり、買い手から見れば「Step ごとに
撮っていない」と分かる。そのため「3箇所が別々の画像であること」も検査する。

ただし撮り直しが済むまでは FAIL にすると corpus 全体が落ちて作業が止まるので、
既定では警告に留める。撮り直し完了後は、次のどちらかで FAIL に切り替える。

  1. 環境変数: CURRICULUM_QA_FAIL_ON_DUPLICATE_IMAGE=1
     （check_quality.sh / CI からまとめて有効化する場合はこちら）
  2. CLI フラグ: python3 check_visualization.py --fail-on-duplicate-image <file>

恒久的に FAIL へ上げるときは、この関数の引数 fail_on_duplicate_image の
既定値を True に変え、test_check_visualization.py の既定モードのケースを
合わせて更新する。経緯は doc/review-handoff/ の記録を参照。
"""

import os
import sys
import re

# 重複判定を FAIL に格上げするための環境変数名。撮り直し完了後に CI 側で立てる。
FAIL_ON_DUPLICATE_IMAGE_ENV = 'CURRICULUM_QA_FAIL_ON_DUPLICATE_IMAGE'

# 重複を数える画像。スクショ位置の判定に使うパターンと同じ範囲に揃えてある
# （「3箇所が別々の画像か」を見る検査なので、母集団がずれると意味が変わる）。
IMAGE_LINK_PATTERN = r'!\[[^\]]*\]\(([^)]+)\)'
SCREENSHOT_IMAGE_PATTERNS = (
    r'\.png$',
    r'\.jpg$',
    r'screenshot',
)


def collect_screenshot_images(content):
    """本文中の画像リンクから、スクショとして数える画像パスを順に返す。"""
    images = []
    for path in re.findall(IMAGE_LINK_PATTERN, content):
        target = path.split()[0] if path.split() else path
        if any(re.search(p, target, re.IGNORECASE) for p in SCREENSHOT_IMAGE_PATTERNS):
            images.append(target)
    return images


def find_duplicate_images(content):
    """同一ファイル内で2回以上参照されている画像を (パス, 回数) の昇順リストで返す。"""
    counts = {}
    for path in collect_screenshot_images(content):
        counts[path] = counts.get(path, 0) + 1
    return sorted((path, n) for path, n in counts.items() if n > 1)


def check_visualization(filepath, fail_on_duplicate_image=False):
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

    duplicates = find_duplicate_images(content)
    duplicate_count = len(duplicates)

    print(f"表の数: {table_count}")
    print(f"スクショ位置: {screenshot_count}")
    print(f"Mermaid図: {mermaid_count}")
    print(f"重複画像: {duplicate_count}")

    errors = []

    if table_count < 4:
        errors.append(f"❌ 表が不足（{table_count}/4以上）")
    else:
        print("✅ 表の数OK")

    if screenshot_count < 3:
        errors.append(f"❌ スクショ位置が不足（{screenshot_count}/3以上）")
    else:
        print("✅ スクショ位置OK")

    if duplicates:
        detail = '、'.join(f'{path}（{n}回）' for path, n in duplicates)
        message = f"同一日で同じ画像を貼り回しています: {detail}"
        if fail_on_duplicate_image:
            errors.append(f"❌ {message}")
        else:
            # 撮り直しが終わるまでは落とさない。切り替え方は本ファイル冒頭の docstring 参照。
            print(f"⚠️ {message}")
            print(f"   （{FAIL_ON_DUPLICATE_IMAGE_ENV}=1 または --fail-on-duplicate-image で FAIL 化）")
    else:
        print("✅ 画像の重複なし")

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


def duplicate_image_is_fatal(argv):
    """CLI フラグと環境変数のどちらかが立っていれば重複を FAIL 扱いにする。"""
    if '--fail-on-duplicate-image' in argv:
        return True
    return os.environ.get(FAIL_ON_DUPLICATE_IMAGE_ENV, '') not in ('', '0', 'false', 'False')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--fail-on-duplicate-image']
    if len(args) < 1:
        print("使用法: python check_visualization.py [--fail-on-duplicate-image] <filepath>")
        sys.exit(1)

    check_visualization(args[0], fail_on_duplicate_image=duplicate_image_is_fatal(sys.argv[1:]))
