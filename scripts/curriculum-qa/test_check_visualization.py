#!/usr/bin/env python3
"""check_visualization.py の退行テスト。

このチェッカーもテストが無いまま運用されていた。check_tone.py で
「正規表現が日本語では成立せず一度も検出していなかった」が起きたのと同じ穴が
ここにも空いている。中核は次の3つで、どれも黙って空振りしうる。

  1. 表の数（3本以上のパイプを含む行を数え、'---' を含む行は除く / 4以上）
  2. スクショ位置（5パターンのどれかに当たる行を数える / 3以上）
  3. Mermaid 図（Day 4,7,9,13,16,21,27 だけ必須）
  4. 同一ファイル内の画像重複（既定は FAIL、フラグ/環境変数で WARNING へ落とせる）

4 は既定と WARNING 化の両モードを固定する。既定が黙って WARNING へ戻ると、検査は
動いているのにゲートが素通りする。逆に WARNING 化の経路が壊れると、撮り直しの途中で
一時的に落とせなくなって作業が止まる。

check_visualization は純粋関数を切り出していないので、一時ファイルに書いて
本体を丸ごと動かし、標準出力の件数と終了コードの両方を突き合わせる。
件数を見るのは、しきい値を跨がない壊れ方（重複除去の消滅など）を
終了コードだけでは取り逃がすため。
"""

import io
import os
import re
import shutil
import sys
import tempfile
from contextlib import redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_visualization import (  # noqa: E402
    WARN_ON_DUPLICATE_IMAGE_ENV,
    check_visualization,
    duplicate_image_is_fatal,
)

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


def run_checker(
    filename: str, content: str, fail_on_duplicate_image: bool = True
) -> tuple[int, tuple[int, int, int], int]:
    """(終了コード, (表, スクショ, Mermaid), 重複画像件数) を返す。"""
    directory = make_tempdir()
    try:
        path = Path(directory) / filename
        path.write_text(content, encoding='utf-8')
        buffer = io.StringIO()
        exit_code = 0
        with redirect_stdout(buffer):
            try:
                check_visualization(str(path), fail_on_duplicate_image=fail_on_duplicate_image)
            except SystemExit as exc:
                exit_code = exc.code if isinstance(exc.code, int) else 1
        output = buffer.getvalue()
        return exit_code, parse_counts(output), parse_duplicate_count(output)
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


def parse_duplicate_count(output: str) -> int:
    """重複画像の件数。出力が消えたら -1 を返して必ず失敗させる。"""
    found = re.search(r'重複画像: (\d+)', output)
    return int(found.group(1)) if found else -1


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


# 同じ画像を貼り回していないかの検査。既定は FAIL、フラグを落とすと WARNING。
# (テスト名, ファイル名, 本文, FAIL化フラグ, 期待する終了コード,
#  期待する (表, スクショ, Mermaid), 期待する重複画像件数)
DUPLICATE_CASES: list[tuple[str, str, str, bool, int, tuple[int, int, int], int]] = [
    (
        'スクショ3枚が別画像なら重複ゼロ',
        'day01_setup.md',
        table_rows(4) + ''.join(f'![一覧](./screenshots/list{i}.png)\n' for i in range(3)),
        True,
        0,
        (4, 3, 0),
        0,
    ),
    (
        # 綴り違いで同じ1枚を3回貼る。素の文字列で数えると別物に見えて、
        # 「スクショ位置3箇所」を満たしつつ重複0で通ってまう。
        '同じ画像を綴り違いで3回貼っても重複として落ちる',
        'day01_setup.md',
        table_rows(4)
        + '![一覧](./screenshots/list.png)\n'
        + '![一覧](screenshots/list.png)\n'
        + '![一覧](screenshots/../screenshots/list.png)\n',
        True,
        1,
        (4, 3, 0),
        1,
    ),
    (
        '同じ画像を3回貼るとフラグ有効時は落ちる',
        'day01_setup.md',
        table_rows(4) + '![一覧](./screenshots/list.png)\n' * 3,
        True,
        1,
        (4, 3, 0),
        1,
    ),
    (
        '同じ画像を3回貼ってもフラグを落とせば通る（撮り直し中の暫定運用）',
        'day01_setup.md',
        table_rows(4) + '![一覧](./screenshots/list.png)\n' * 3,
        False,
        0,
        (4, 3, 0),
        1,
    ),
    (
        '2回目から重複とみなす（境界）',
        'day01_setup.md',
        table_rows(4)
        + '![一覧](./screenshots/list.png)\n' * 2
        + '![詳細](./screenshots/detail.png)\n',
        True,
        1,
        (4, 3, 0),
        1,
    ),
    (
        '別々の画像が2組重複していれば2件と数える',
        'day01_setup.md',
        table_rows(4)
        + '![一覧](./screenshots/list.png)\n' * 2
        + '![詳細](./screenshots/detail.png)\n' * 2,
        True,
        1,
        (4, 4, 0),
        2,
    ),
    (
        'jpg も重複の対象',
        'day01_setup.md',
        table_rows(4) + '![一覧](./screenshots/list.jpg)\n' * 3,
        True,
        1,
        (4, 3, 0),
        1,
    ),
    (
        'パスに screenshot を含む拡張子違いも重複の対象',
        'day01_setup.md',
        table_rows(4) + '![一覧](./assets/screenshot-list.webp)\n' * 3,
        True,
        1,
        (4, 3, 0),
        1,
    ),
    (
        'png/jpg/screenshot 以外の画像は重複に数えない（スクショ位置と母集団を揃える）',
        'day01_setup.md',
        table_rows(4)
        + camera_lines(3)
        + '![図](./assets/diagram.svg)\n' * 3,
        True,
        0,
        (4, 3, 0),
        0,
    ),
    (
        '📸 や【スクリーンショット】だけの日は画像パスが無いので重複ゼロ',
        'day01_setup.md',
        BASE,
        True,
        0,
        (4, 3, 0),
        0,
    ),
    (
        '重複が唯一の違反なら、フラグ無効時は exit 0 のまま',
        'day05_form.md',
        table_rows(4) + '![一覧](./screenshots/list.png)\n' * 4,
        False,
        0,
        (4, 4, 0),
        1,
    ),
]


def default_is_fatal() -> bool:
    """本体の既定が「重複は FAIL」のままかを見る。

    ここが黙って WARNING へ戻ると、検査は動いているのにゲートが素通りする。防ぐために
    作った退行が、誰にも気づかれずに戻ってこられる状態になる。逆に、撮り直しの途中で
    一時的に落とす経路（環境変数 / CLI フラグ）が壊れると、作業中に全体が止まる。
    """
    # 引数を渡さずに呼ぶ。run_checker の既定ではなく、本体の既定を見たいので
    # ここだけは直接呼ぶ。run_checker 経由やと本体を戻しても落ちん飾りになる。
    directory = make_tempdir()
    try:
        path = Path(directory) / 'day01_setup.md'
        path.write_text(
            table_rows(4) + '![一覧](./screenshots/list.png)\n' * 3, encoding='utf-8'
        )
        default_fails = False
        with redirect_stdout(io.StringIO()):
            try:
                check_visualization(str(path))
            except SystemExit as exc:
                default_fails = bool(exc.code)
    finally:
        shutil.rmtree(directory)
    flag_ok = not duplicate_image_is_fatal(['--warn-on-duplicate-image', 'x.md'])
    saved = os.environ.get(WARN_ON_DUPLICATE_IMAGE_ENV)
    try:
        os.environ[WARN_ON_DUPLICATE_IMAGE_ENV] = '1'
        env_ok = not duplicate_image_is_fatal(['x.md'])
        os.environ[WARN_ON_DUPLICATE_IMAGE_ENV] = '0'
        env_off_ok = duplicate_image_is_fatal(['x.md'])
        # `FALSE` は「落とさん」の意思表示なので FAIL のままでないとあかん。
        # 大文字を弾いて WARNING へ落ちると、落としたつもりのない人がゲートを失う。
        os.environ[WARN_ON_DUPLICATE_IMAGE_ENV] = 'FALSE'
        env_upper_ok = duplicate_image_is_fatal(['x.md'])
        os.environ[WARN_ON_DUPLICATE_IMAGE_ENV] = ' 1 '
        env_pad_ok = not duplicate_image_is_fatal(['x.md'])
        # 想定してへん値は FAIL のまま。綴り間違いを WARNING 扱いにすると、
        # 落としたつもりのない人がゲートを失う。
        os.environ[WARN_ON_DUPLICATE_IMAGE_ENV] = 'ture'
        env_typo_ok = duplicate_image_is_fatal(['x.md'])
    finally:
        if saved is None:
            os.environ.pop(WARN_ON_DUPLICATE_IMAGE_ENV, None)
        else:
            os.environ[WARN_ON_DUPLICATE_IMAGE_ENV] = saved
    return default_fails and flag_ok and env_ok and env_off_ok and env_upper_ok and env_pad_ok and env_typo_ok


def required_days_in_source() -> set[int]:
    """本体の必須 Day リストを読み出す。関数内のローカル変数なので import できない。"""
    source = Path(__file__).with_name('check_visualization.py').read_text(encoding='utf-8')
    found = re.search(r'required_mermaid_days\s*=\s*\[([^\]]*)\]', source)
    if not found:
        return set()
    return {int(value) for value in re.findall(r'\d+', found.group(1))}


def check_screenshot_exemption() -> list[str]:
    """写真の下限を免除する日の扱い。

    免除は「視覚化そのものを免除する」やない。図の下限は課したままで、
    しかも理由の文言を必ず持たせる。空の理由で骨抜きにされんため。
    """
    from check_visualization import MIN_MERMAID_WHEN_EXEMPT, SCREENSHOT_EXEMPT

    fails: list[str] = []
    if not SCREENSHOT_EXEMPT:
        return ['❌ 免除の表が空になっている（day04 の登録が消えている）']
    for name, reason in SCREENSHOT_EXEMPT.items():
        if not isinstance(reason, str) or len(reason.strip()) < 8:
            fails.append(f'❌ {name} の免除に理由が書かれていない')

    target = next(iter(SCREENSHOT_EXEMPT))
    tables = '\n'.join('| a | b |' for _ in range(5))
    figures = '\n'.join('```mermaid\nflowchart LR\n  A --> B\n```' for _ in range(MIN_MERMAID_WHEN_EXEMPT))
    # 図が足りていれば、写真1枚でも通る。
    code, counts, _ = run_checker(target, f'{tables}\n\n{figures}\n\n![a](./screenshots/x.png)\n')
    if code != 0:
        fails.append(f'❌ 免除した日が落ちている（{counts}）')
    # 図が足りなければ、免除していても落ちる。
    code, _, _ = run_checker(target, f'{tables}\n\n```mermaid\nflowchart LR\n  A --> B\n```\n')
    if code == 0:
        fails.append('❌ 図が足りんのに免除だけで通している')
    # 登録の無い日は、これまでどおり写真3箇所を要求する。
    code, _, _ = run_checker('day99_未登録.md', f'{tables}\n\n{figures}\n\n![a](./screenshots/x.png)\n')
    if code == 0:
        fails.append('❌ 登録の無い日まで免除している')
    return fails


def main() -> int:
    failed = 0

    for name, filename, content, expected_code, expected_counts in CASES:
        code, counts, duplicates = run_checker(filename, content)
        # 既存ケースは全て別画像なので、重複0が崩れたら重複判定の母集団がずれている。
        if (code, counts, duplicates) != (expected_code, expected_counts, 0):
            failed += 1
            print(
                f'  ❌ {name}: 期待 exit={expected_code} {expected_counts} 重複0 / '
                f'実際 exit={code} {counts} 重複{duplicates}'
            )

    for name, filename, content, fatal, expected_code, expected_counts, expected_dup in (
        DUPLICATE_CASES
    ):
        code, counts, duplicates = run_checker(filename, content, fail_on_duplicate_image=fatal)
        if (code, counts, duplicates) != (expected_code, expected_counts, expected_dup):
            failed += 1
            print(
                f'  ❌ {name}: 期待 exit={expected_code} {expected_counts} '
                f'重複{expected_dup} / 実際 exit={code} {counts} 重複{duplicates}'
            )

    if not default_is_fatal():
        failed += 1
        print('  ❌ 重複判定の既定が FAIL でない、または警告へ落とす切り替えが壊れています')

    # 必須 Day がこっそり削られると、図の抜けた教材が黙って通るようになる。
    days = required_days_in_source()
    if days != REQUIRED_MERMAID_DAYS:
        failed += 1
        print(f'  ❌ required_mermaid_days が {sorted(days)} に変えられています')

    for message in check_screenshot_exemption():
        failed += 1
        print(f'  {message}')

    total = len(CASES) + len(DUPLICATE_CASES) + 3
    if failed:
        print(f'❌ check_visualization 自己テスト {failed}/{total} 失敗')
        return 1
    print(f'✅ check_visualization 自己テスト {total}/{total} 合格')
    return 0


if __name__ == '__main__':
    sys.exit(main())
