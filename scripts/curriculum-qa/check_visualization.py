#!/usr/bin/env python3
"""視覚化チェックスクリプト
- 表が4つ以上あるか
- スクショ位置が3箇所以上あるか
- 同一ファイル内で同じ画像を貼り回していないか
- Mermaid図が適切か（該当Dayのみ）

## 同一日での画像重複について（既定は FAIL）

「スクショ位置3箇所以上」という下限だけを機械で要求すると、同じ画像を3回貼って
数を満たす逃げ道が残る。実際にこの corpus では Step 3 の結果として貼られた画像が
Step 9 の完成形と同じになっている箇所があり、買い手から見れば「Step ごとに
撮っていない」と分かる。そのため「3箇所が別々の画像であること」も検査する。

作り始めた時点では corpus に重複が残っていたので既定を WARNING にしていた。いまは
36本すべてで同一ファイル内の重複が0件になったので、既定を FAIL へ上げた。警告のまま
置いておくと、検査は完成しているのにゲートが素通りする。防ぐために作った退行が、
黙って戻ってこられる状態になる。

撮り直しの途中で一時的に警告へ落としたいときだけ、次のどちらかを使う。

  1. 環境変数: CURRICULUM_QA_WARN_ON_DUPLICATE_IMAGE=1
  2. CLI フラグ: python3 check_visualization.py --warn-on-duplicate-image <file>
"""

import glob
import os
import sys
import re

# 重複判定を WARNING へ落とすための環境変数名。既定は FAIL なので、撮り直しの
# 途中で一時的に緩めたいときだけ立てる。
WARN_ON_DUPLICATE_IMAGE_ENV = 'CURRICULUM_QA_WARN_ON_DUPLICATE_IMAGE'

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


# 画面写真を3箇所そろえられん日と、その理由。
#
# 「スクショ位置3箇所以上」は「その日には新しいアプリの画面がある」を前提にしとる。
# day04 はデプロイの日で、主役は Vercel の管理画面（この環境からは撮れん）であり、
# アプリの画面は Day 02 から1ドットも変わらん。撮っても Day 01・02 の写真と
# md5 が一致するだけで、貼り回しの検査と正面からぶつかる。
# 以前はここを手描きのモックで埋めとったが、そのモックが「今日はやらない: 本番公開」と
# 書いてあるのに本文は「実際の URL で公開します」で、真っ向から食い違っていた。
# モックをやめて図2枚へ置き換え、代わりにこの表へ理由つきで登録する。
#
# 免除しても図の下限（2枚）は課す。視覚化そのものを免除するわけやない。
SCREENSHOT_EXEMPT = {
    'day04_ネットに公開.md': 'デプロイの日。主役は Vercel の管理画面で撮れず、アプリの画面は Day 02 から変わらん',
}
MIN_MERMAID_WHEN_EXEMPT = 2


def check_visualization(filepath, fail_on_duplicate_image=True):
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

    exempt_reason = SCREENSHOT_EXEMPT.get(os.path.basename(filepath))
    if exempt_reason:
        if mermaid_count < MIN_MERMAID_WHEN_EXEMPT:
            errors.append(
                f"❌ 写真の下限を免除しとる日やのに図が不足（{mermaid_count}/{MIN_MERMAID_WHEN_EXEMPT}以上）"
            )
        else:
            print(f"✅ スクショ位置は免除（{exempt_reason}）")
    elif screenshot_count < 3:
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
            print(f"   （{WARN_ON_DUPLICATE_IMAGE_ENV}=1 または --warn-on-duplicate-image で警告に落とした状態）")
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
    """重複を FAIL 扱いにするか。既定は FAIL で、明示的に落としたときだけ WARNING。"""
    if '--warn-on-duplicate-image' in argv:
        return False
    # 大文字小文字と前後の空白を落としてから見る。`FALSE` を渡した人が、
    # 落としたつもりのない WARNING へ黙って落ちるのを防ぐ。
    raw = os.environ.get(WARN_ON_DUPLICATE_IMAGE_ENV, '').strip().lower()
    return raw in ('', '0', 'false')


def collect_targets(target):
    """ディレクトリを渡された場合は配下の教材 md を対象にする。

    corpus 全体の重複状況を一度に見たい（撮り直しの進み具合を測る）ため、
    他の corpus 系チェッカーと同じくディレクトリ引数を受ける。
    """
    if not os.path.isdir(target):
        return [target]
    patterns = ('day[0-9][0-9]_*.md', 'appendix_*.md')
    files = []
    for pattern in patterns:
        files.extend(glob.glob(os.path.join(target, pattern)))
    return sorted(files)


def main(argv):
    fail_on_duplicate_image = duplicate_image_is_fatal(argv)
    args = [a for a in argv if a != '--warn-on-duplicate-image']
    if len(args) < 1:
        print("使用法: python check_visualization.py [--warn-on-duplicate-image] <filepath|dir>")
        return 1

    targets = collect_targets(args[0])
    if not targets:
        print(f"❌ 対象ファイルが見つかりません: {args[0]}")
        return 1

    failed = []
    for target in targets:
        if len(targets) > 1:
            print(f"\n--- {target} ---")
        try:
            check_visualization(target, fail_on_duplicate_image=fail_on_duplicate_image)
        except SystemExit as exc:
            if exc.code:
                failed.append(target)

    if len(targets) > 1:
        print(f"\n対象 {len(targets)} 件 / FAIL {len(failed)} 件")
        for target in failed:
            print(f"  ❌ {target}")
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
