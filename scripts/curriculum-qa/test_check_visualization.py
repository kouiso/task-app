#!/usr/bin/env python3
"""check_visualization.py の退行テスト。

このチェッカーもテストが無いまま運用されていた。check_tone.py で
「正規表現が日本語では成立せず一度も検出していなかった」が起きたのと同じ穴が
ここにも空いている。中核は次の3つで、どれも黙って空振りしうる。

  1. 表の数（3本以上のパイプを含む行を数え、'---' を含む行は除く / 4以上）
  2. スクショ位置（5パターンのどれかに当たる行を数える / 3以上）
  3. Mermaid 図（Day 4,7,9,13,16,21,27 だけ必須）

check_visualization は純粋関数を切り出していないので、一時ファイルに書いて
本体を丸ごと動かし、標準出力の件数と終了コードの両方を突き合わせる。
件数を見るのは、しきい値を跨がない壊れ方（重複除去の消滅など）を
終了コードだけでは取り逃がすため。
"""

import io
import re
import shutil
import sys
import tempfile
from contextlib import redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_visualization import check_visualization  # noqa: E402

REQUIRED_MERMAID_DAYS = {4, 7, 9, 13, 16, 21, 27}

TABLE_SEPARATOR = '| --- | --- |'
TABLE_ROW = '| セル | 値 |'
MERMAID_BLOCK = '```mermaid\ngraph TD\n  A --> B\n```\n'


def table_rows(count: int) -> str:
    """数えられる表の行を count 行ぶん作る。区切り行は '---' を含むので数に入らない。"""
    return TABLE_SEPARATOR + '\n' + ''.join(TABLE_ROW + '\n' for _ in range(count))


def camera_lines(count: int) -> str:
    return ''.join(f'📸 一覧画面のスクショ{i}\n' for i in range(count))


BASE = table_rows(4) + camera_lines(3)


def make_tempdir() -> str:
    """一時ディレクトリ名に day+数字 が紛れると Day 判定がそちらに先食いされるため、
    当たらない名前が出るまで引き直す。"""
    while True:
        directory = tempfile.mkdtemp()
        if not re.search(r'day(\d+)', directory.lower()):
            return directory
        shutil.rmtree(directory)


def run_checker(filename: str, content: str) -> tuple[int, tuple[int, int, int]]:
    """(終了コード, (表, スクショ, Mermaid)) を返す。"""
    directory = make_tempdir()
    try:
        path = Path(directory) / filename
        path.write_text(content, encoding='utf-8')
        buffer = io.StringIO()
        exit_code = 0
        with redirect_stdout(buffer):
            try:
                check_visualization(str(path))
            except SystemExit as exc:
                exit_code = exc.code if isinstance(exc.code, int) else 1
        return exit_code, parse_counts(buffer.getvalue())
    finally:
        shutil.rmtree(directory)


def parse_counts(output: str) -> tuple[int, int, int]:
    labels = ('表の数', 'スクショ位置', 'Mermaid図')
    values = []
    for label in labels:
        found = re.search(rf'{label}: (\d+)', output)
        # 件数の出力自体が消えたら、以降の突き合わせが全部無意味になるので即失敗させる。
        values.append(int(found.group(1)) if found else -1)
    return tuple(values)


# (テスト名, ファイル名, 本文, 期待する終了コード, 期待する (表, スクショ, Mermaid))
CASES: list[tuple[str, str, str, int, tuple[int, int, int]]] = [
    (
        '表4・スクショ3で通る',
        'day01_setup.md',
        BASE,
        0,
        (4, 3, 0),
    ),
    (
        '表が3行だと落ちる（境界）',
        'day01_setup.md',
        table_rows(3) + camera_lines(3),
        1,
        (3, 3, 0),
    ),
    (
        'スクショが2件だと落ちる（境界）',
        'day01_setup.md',
        table_rows(4) + camera_lines(2),
        1,
        (4, 2, 0),
    ),
    (
        '区切り行だけ並べても表に数えない',
        'day01_setup.md',
        (TABLE_SEPARATOR + '\n') * 4 + camera_lines(3),
        1,
        (0, 3, 0),
    ),
    (
        'パイプが2本しかない行は表に数えない',
        'day01_setup.md',
        ('| セル |\n') * 4 + camera_lines(3),
        1,
        (0, 3, 0),
    ),
    (
        '旧形式【スクリーンショット】もコロン有無どちらも数える',
        'day01_setup.md',
        table_rows(4)
        + '【スクリーンショット: 一覧画面】\n'
        + '【スクリーンショット】\n'
        + '【スクリーンショット:詳細画面】\n',
        0,
        (4, 3, 0),
    ),
    (
        'png の画像リンクを数える',
        'day01_setup.md',
        table_rows(4) + ''.join(f'![一覧](./shots/list{i}.png)\n' for i in range(3)),
        0,
        (4, 3, 0),
    ),
    (
        'jpg の画像リンクも数える',
        'day01_setup.md',
        table_rows(4) + ''.join(f'![一覧](./shots/list{i}.jpg)\n' for i in range(3)),
        0,
        (4, 3, 0),
    ),
    (
        'パスに screenshot を含めば拡張子は問わない',
        'day01_setup.md',
        table_rows(4) + ''.join(f'![一覧](./assets/screenshot-{i}.webp)\n' for i in range(3)),
        0,
        (4, 3, 0),
    ),
    (
        'png/jpg/screenshot 以外の画像は数えない（誤検知防止）',
        'day01_setup.md',
        table_rows(4) + ''.join(f'![図](./assets/diagram-{i}.svg)\n' for i in range(3)),
        1,
        (4, 0, 0),
    ),
    (
        '1行に複数マーカーが並んでも1件として数える',
        'day01_setup.md',
        table_rows(4)
        + ''.join(f'📸 ![一覧](./shots/list{i}.png) 【スクリーンショット】\n' for i in range(3)),
        0,
        (4, 3, 0),
    ),
    (
        'Mermaid 必須 Day で図が無ければ落ちる',
        'day04_state.md',
        BASE,
        1,
        (4, 3, 0),
    ),
    (
        'Mermaid 必須 Day で図があれば通る',
        'day04_state.md',
        BASE + MERMAID_BLOCK,
        0,
        (4, 3, 1),
    ),
    (
        'Day 13 も Mermaid 必須',
        'day13_router.md',
        BASE,
        1,
        (4, 3, 0),
    ),
    (
        'Day 27 も Mermaid 必須',
        'day27_deploy.md',
        BASE,
        1,
        (4, 3, 0),
    ),
    (
        'Mermaid 不要 Day は図が無くても通る',
        'day05_form.md',
        BASE,
        0,
        (4, 3, 0),
    ),
    (
        'ファイル名に Day 番号が無ければ Mermaid を要求しない',
        'overview.md',
        BASE,
        0,
        (4, 3, 0),
    ),
    (
        'コードフェンスの外に出てくる mermaid の語は図に数えない',
        'day04_state.md',
        BASE + 'ここでは mermaid 記法そのものには踏み込みません。\n',
        1,
        (4, 3, 0),
    ),
    (
        '言語名が途中までのフェンスは Mermaid 図に数えない',
        'day04_state.md',
        BASE + '```merma\ngraph TD\n  A --> B\n```\n',
        1,
        (4, 3, 0),
    ),
    (
        'Mermaid ブロックは書いた数だけ数える',
        'day04_state.md',
        BASE + MERMAID_BLOCK + MERMAID_BLOCK,
        0,
        (4, 3, 2),
    ),
]


def required_days_in_source() -> set[int]:
    """本体の必須 Day リストを読み出す。関数内のローカル変数なので import できない。"""
    source = Path(__file__).with_name('check_visualization.py').read_text(encoding='utf-8')
    found = re.search(r'required_mermaid_days\s*=\s*\[([^\]]*)\]', source)
    if not found:
        return set()
    return {int(value) for value in re.findall(r'\d+', found.group(1))}


def main() -> int:
    failed = 0

    for name, filename, content, expected_code, expected_counts in CASES:
        code, counts = run_checker(filename, content)
        if (code, counts) != (expected_code, expected_counts):
            failed += 1
            print(
                f'  ❌ {name}: 期待 exit={expected_code} {expected_counts} / '
                f'実際 exit={code} {counts}'
            )

    # 必須 Day がこっそり削られると、図の抜けた教材が黙って通るようになる。
    days = required_days_in_source()
    if days != REQUIRED_MERMAID_DAYS:
        failed += 1
        print(f'  ❌ required_mermaid_days が {sorted(days)} に変えられています')

    total = len(CASES) + 1
    if failed:
        print(f'❌ check_visualization 自己テスト {failed}/{total} 失敗')
        return 1
    print(f'✅ check_visualization 自己テスト {total}/{total} 合格')
    return 0


if __name__ == '__main__':
    sys.exit(main())
