#!/usr/bin/env python3
"""check_step_length.py の退行テスト。

check_tone.py で「テストの無いチェッカーは、壊れて空振りしていても誰も
気づかない」（日本語に \\b が効かず検出が一度も動いていなかった）という実例が
出た。このチェッカーも同じ状態だったので、中核の3点を固定する。

  1. しきい値 25 行（ちょうどは通す・1行超えたら落とす）
  2. コードブロックの数え方（フェンスの抽出・前後の空行の扱い・ブロック番号）
  3. 違反時の終了コード 1 と報告フォーマット

チェッカーはファイルパスしか受け取らないので、教材本体には依存させず
tempfile に書いて走らせる。
"""

import contextlib
import io
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_step_length import check_code_blocks  # noqa: E402

CHECKER = Path(__file__).parent / 'check_step_length.py'

# チェッカーが定めている上限。下の BOUNDARY がこの値を境に挙動を固定する。
LIMIT = 25


def body(count: int) -> str:
    """行番号が見分けられる count 行のコードを作る。抜粋の検査に使うため中身を一意にする。"""
    return '\n'.join(f'const v{i} = {i};' for i in range(1, count + 1))


def fence(count: int, info: str = '') -> str:
    return f'```{info}\n{body(count)}\n```\n'


def run(text: str) -> tuple[int, str]:
    """本文を一時ファイルに書いて検査し、(終了コード, 標準出力) を返す。"""
    with tempfile.TemporaryDirectory() as tmpdir:
        target = Path(tmpdir) / 'sample.md'
        target.write_text(text, encoding='utf-8')
        buffer = io.StringIO()
        code = 0
        with contextlib.redirect_stdout(buffer):
            try:
                check_code_blocks(str(target))
            except SystemExit as exit_signal:
                code = exit_signal.code or 0
        return code, buffer.getvalue()


def passed_block_count(output: str) -> int | None:
    """成功時の「全N個」を取り出す。ブロックの数え方が壊れたらここがズレる。"""
    matched = re.search(r'✅ 全(\d+)個', output)
    return int(matched.group(1)) if matched else None


# 途中の空行も1行として数えるかを見るための本文。24行のコード＋空行2 = 26行。
BLANK_INSIDE = '\n'.join(
    [f'const v{i} = {i};' for i in range(1, 13)]
    + ['', '']
    + [f'const v{i} = {i};' for i in range(13, 25)]
)

# (テスト名, 本文, 期待する終了コード, 期待するブロック数, 出力に必ず含まれる文字列, 含まれてはいけない文字列)
CASES: list[tuple[str, str, int, int | None, list[str], list[str]]] = [
    (
        '言語指定つきのブロックも中身を数える',
        fence(LIMIT + 1, 'tsx'),
        1,
        None,
        ['#1', '26行'],
        [],
    ),
    (
        'フェンス直後と直前の空行は数えない',
        f'```\n\n{body(LIMIT)}\n\n```\n',
        0,
        1,
        [],
        [],
    ),
    (
        '途中の空行は1行として数える',
        f'```\n{BLANK_INSIDE}\n```\n',
        1,
        None,
        ['26行'],
        [],
    ),
    (
        'フェンスが無ければ検査対象は0個',
        'これは地の文です。\n' * 40,
        0,
        0,
        [],
        [],
    ),
    (
        '離れた2ブロックを1つに繋げない',
        fence(3) + '\n間に入る説明の文です。\n\n' + fence(4),
        0,
        2,
        [],
        [],
    ),
    (
        '2つ目だけ長ければ #2 と報告する',
        fence(3) + '\n間に入る説明の文です。\n\n' + fence(LIMIT + 1),
        1,
        None,
        ['#2', '26行'],
        ['#1'],
    ),
    (
        '違反が複数あれば合計件数を出す',
        fence(LIMIT + 1) + '\n説明の文です。\n\n' + fence(LIMIT + 5),
        1,
        None,
        ['合計2個', '26行', '30行'],
        [],
    ),
    (
        '違反ブロックは先頭3行と末尾3行を抜粋する',
        fence(LIMIT + 1),
        1,
        None,
        ['const v1 = 1;', 'const v3 = 3;', '...', 'const v24 = 24;', 'const v26 = 26;'],
        ['const v10 = 10;'],
    ),
]

# しきい値ガード。25 を動かすと（緩めても厳しくしても）この5件のどれかが必ず落ちる。
# 最後の 120 行は上限側の逃げ道よけ。境界の近くだけ固定すると
# 「25行超だが100行未満だけ違反」のような上限つき条件が素通りしてしまい、
# 一番長い＝一番直したいブロックが検査から漏れる。
BOUNDARY: list[tuple[int, int]] = [
    (LIMIT - 1, 0),
    (LIMIT, 0),
    (LIMIT + 1, 1),
    (LIMIT + 5, 1),
    (120, 1),
]


def main() -> int:
    failed = 0

    for name, text, want_code, want_blocks, must_have, must_not_have in CASES:
        code, output = run(text)
        if code != want_code:
            failed += 1
            print(f'  ❌ {name}: 終了コード 期待 {want_code} / 実際 {code}')
            continue
        got_blocks = passed_block_count(output)
        if got_blocks != want_blocks:
            failed += 1
            print(f'  ❌ {name}: ブロック数 期待 {want_blocks} / 実際 {got_blocks}')
            continue
        missing = [needle for needle in must_have if needle not in output]
        extra = [needle for needle in must_not_have if needle in output]
        if missing or extra:
            failed += 1
            print(f'  ❌ {name}: 欠けている {missing} / 出てはいけない {extra}')

    for lines, want_code in BOUNDARY:
        code, output = run(fence(lines))
        if code != want_code:
            failed += 1
            verb = '通す' if want_code == 0 else '落とす'
            print(f'  ❌ しきい値ガード: {lines}行は{verb}はずが 終了コード {code}')
        elif want_code == 1 and f'{lines}行' not in output:
            failed += 1
            print(f'  ❌ しきい値ガード: {lines}行の報告に行数が出ていない')

    # 引数無しで叩かれたときに黙って成功しないこと。CI から素通りされる事故を防ぐ。
    result = subprocess.run(
        [sys.executable, str(CHECKER)], capture_output=True, text=True
    )
    cli_total = 1
    if result.returncode != 1 or '使用法' not in result.stdout:
        failed += 1
        print(f'  ❌ 引数無しの実行: 終了コード {result.returncode} / 出力 {result.stdout!r}')

    total = len(CASES) + len(BOUNDARY) + cli_total
    if failed:
        print(f'❌ check_step_length 自己テスト {failed}/{total} 失敗')
        return 1
    print(f'✅ check_step_length 自己テスト {total}/{total} 合格')
    return 0


if __name__ == '__main__':
    sys.exit(main())
