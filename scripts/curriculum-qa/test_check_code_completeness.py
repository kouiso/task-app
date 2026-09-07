#!/usr/bin/env python3
"""check_code_completeness.py の退行テスト。

check_tone.py で「テストの無いチェッカーは、壊れて一度も検出しないまま素通りして
いても誰も気づかない」という実例が出た。同じ穴をこのチェッカーにも空けないため、
本体が実際に見ている3点を固定する。

  1. filepath: コメントの有無（言語ごとに要否が違う）
  2. パート分割形式の禁止（errors → FAIL）
  3. 省略コメントの禁止（errors → FAIL）

検査対象は文字列から組み立てて一時ファイルへ書く。実在の教材に依存させると、
教材を直しただけでテストの意味が変わってしまうためである。
"""

import ast
import io
import re
import sys
import tempfile
from contextlib import redirect_stdout
from pathlib import Path
from typing import NamedTuple

sys.path.insert(0, str(Path(__file__).parent))

from check_code_completeness import check_code_completeness  # noqa: E402

CHECKER = Path(__file__).parent / 'check_code_completeness.py'

# 集計行の書式。本体の print と1文字でもずれたら数えられなくなるので定数で持つ。
TOTAL_PREFIX = 'コードブロック数: '
FILEPATH_PREFIX = 'filepath:コメント付き: '
ERROR_LINE = re.compile(r'^❌ コードブロック \d+: ')
WARNING_LINE = re.compile(r'^⚠️ コードブロック \d+: ')

FP = '// filepath: src/app/page.tsx'

# filepath: が無いと警告が出る言語。1つ外されると警告が消えて教材が素通りする。
FILEPATH_REQUIRED_LANGS = ('typescript', 'javascript', 'tsx', 'jsx', 'ts', 'js')
# filepath 目印を求めない言語。求めないのはその1点だけで、省略コメントと
# パート分割は言語に関わらず見る。以前はここでブロックごと `continue` していて、
# `bash` に `// 省略` と書いた教材が素通りしていた（#369 ①）。
FILEPATH_EXEMPT_LANGS = ('mermaid', 'bash', 'shell', 'sh', 'zsh')

# 本体に登録されている禁止パターンの数。減っていたら検出が緩められている。
PART_PATTERN_COUNT = 4
SKIP_PATTERN_COUNT = 7


class Result(NamedTuple):
    """チェッカーの出力を突き合わせ可能な数値へ畳んだもの。

    total と with_filepath の -1 は「集計行そのものが出ていない」を表す。
    コードブロックが1つも無いときの早期 return がこれに当たる。
    """

    ok: bool
    total: int
    with_filepath: int
    errors: int
    warnings: int


def block(lang: str, *lines: str) -> str:
    """コードブロック1つ分の Markdown を組み立てる。"""
    return '```' + lang + '\n' + '\n'.join(lines) + '\n```\n'


def _number(lines: list[str], prefix: str) -> int:
    for line in lines:
        if line.startswith(prefix):
            return int(line[len(prefix):])
    return -1


def run(text: str) -> Result:
    """本文を一時ファイルへ書いてチェッカーを通す。

    本体は「パスを受け取って標準出力へ書く」形なので、戻り値だけでは何件検出したか
    分からない。出力を捕まえて件数まで見る。
    """
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / 'day00_sample.md'
        path.write_text(text, encoding='utf-8')
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            ok = check_code_completeness(str(path))
    lines = buffer.getvalue().splitlines()
    return Result(
        ok=ok,
        total=_number(lines, TOTAL_PREFIX),
        with_filepath=_number(lines, FILEPATH_PREFIX),
        errors=sum(1 for line in lines if ERROR_LINE.match(line)),
        warnings=sum(1 for line in lines if WARNING_LINE.match(line)),
    )


# 登録されている禁止パターンを1つ以上覆う検出例。パターンを足したらここにも足す。
# 足さないと下の網羅チェックが落ちる。
DETECTION_SAMPLES: list[str] = [
    # パート分割
    'パート1/2',
    'Part 1 / 2',
    '（パート2）',
    '(Part 2)',
    # 省略コメント
    '// ...残り',
    '// 省略',
    '// 以下略',
    '// etc',
    '/* ... */',
    '// 同様に',
    '// 残りは同じ',
    # 本体は全パターンを re.IGNORECASE で当てている。英字を含むパターンだけが
    # その影響を受けるので、大文字表記の例を置いて IGNORECASE の脱落を捕まえる。
    '// ETC',
    'part 1/2',
    '(PART 2)',
]

# 検出してはいけない行。誤検知が入ると正しい教材が書けなくなるので、ここで固定する。
NON_DETECTION_SAMPLES: list[str] = [
    '// 同様の処理は tasks.ts にもある',
    '// 残りのタスクを配列で持つ',
    '/* 引数の意味 */',
    'const parts = total / 2;',
    'const partial = items.slice(0, 2);',
    '// 3部構成のうちの1つ目',
]

CASES: list[tuple[str, str, Result]] = [
    (
        'filepath 付きの tsx は警告なしで通る',
        block('tsx', FP, 'export const Page = () => null;'),
        Result(True, 1, 1, 0, 0),
    ),
    (
        'filepath の無い tsx は警告になるが FAIL はしない',
        block('tsx', 'export const Page = () => null;'),
        Result(True, 1, 0, 0, 1),
    ),
    (
        'filepath を要求しない言語では警告を出さない',
        block('python', 'x = 1'),
        Result(True, 1, 0, 0, 0),
    ),
    (
        '言語指定の無いブロックは filepath を要求しない',
        block('', 'const a = 1;'),
        Result(True, 1, 0, 0, 0),
    ),
    (
        '言語指定が無くても省略コメントは捕まえる',
        block('', '// 省略'),
        Result(False, 1, 0, 1, 0),
    ),
    (
        '検査対象外の言語に入っていない text も省略コメントを捕まえる',
        block('text', '// 省略'),
        Result(False, 1, 0, 1, 0),
    ),
    (
        'コードブロックが無ければ集計せずに通る',
        'この節には手を動かす場所がありません。\n',
        Result(True, -1, -1, 0, 0),
    ),
    (
        '省略コメントが1つあれば FAIL',
        block('tsx', FP, '// 省略'),
        Result(False, 1, 1, 1, 0),
    ),
    (
        '同じブロックの別種の省略コメントは種類ごとに数える',
        block('tsx', FP, '// 省略', '// 以下略'),
        Result(False, 1, 1, 2, 0),
    ),
    (
        '同じ種類が2回出ても報告は1件',
        block('tsx', FP, '// 省略', '// 省略'),
        Result(False, 1, 1, 1, 0),
    ),
    (
        'パート分割形式は FAIL',
        block('tsx', FP, '// パート1/2'),
        Result(False, 1, 1, 1, 0),
    ),
    (
        '2ブロックのうち片方だけ違反なら1件',
        block('tsx', FP, 'const a = 1;') + block('tsx', FP, '// 以下略'),
        Result(False, 2, 2, 1, 0),
    ),
    (
        'コードブロックの外のパート表記は検査しない',
        block('tsx', FP, 'const a = 1;') + 'この節はパート1/2に分けています。\n',
        Result(True, 1, 1, 0, 0),
    ),
    # 属性付きフェンス。自前の ```` ```(\w+)?\n ```` では開きフェンスが本文扱いになり、
    # 以降の対がずれてブロック数が 1 に落ちていた。ずれた先は丸ごと無検査になる（#369 ②）。
    (
        '属性付きフェンスでもフェンスの対がずれない',
        '```text title="post"\n// 省略\n```\n\n' + block('tsx', 'const a = 1;'),
        Result(False, 2, 0, 1, 1),
    ),
    (
        'チルダのフェンスも1ブロックとして数える',
        '~~~text\n// 省略\n~~~\n',
        Result(False, 1, 0, 1, 0),
    ),
    (
        'JSX コメント形式の filepath も数える',
        block('tsx', '{/* filepath: src/app/page.tsx */}', 'const a = 1;'),
        Result(True, 1, 1, 0, 0),
    ),
    (
        '閉じの無い壊れた filepath 目印は数えない',
        block('tsx', '{/* filepath: src/app/page.tsx', 'const a = 1;'),
        Result(True, 1, 0, 0, 1),
    ),
    (
        'filepath 行が先頭でなくても数える',
        block('tsx', "'use client';", FP, 'const a = 1;'),
        Result(True, 1, 1, 0, 0),
    ),
    (
        '言語名が大文字でも filepath 警告は出る',
        block('TSX', 'const a = 1;'),
        Result(True, 1, 0, 0, 1),
    ),
    (
        '言語名が大文字でも検査対象外の言語は飛ばす',
        block('BASH', '# filepath: scripts/setup.sh', 'npm install'),
        Result(True, 1, 0, 0, 0),
    ),
]


def literal_patterns(name: str) -> list[str]:
    """チェッカー本体の name に代入されている正規表現リテラルを取り出す。

    パターンは関数の中のローカル変数なので import できない。構文木から拾うことで、
    「本体に在るのに検出例が無いパターン」を機械的に見つけられるようにする。
    """
    tree = ast.parse(CHECKER.read_text(encoding='utf-8'))
    out: list[str] = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Assign):
            continue
        if not any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            continue
        if not isinstance(node.value, ast.List):
            continue
        for elt in node.value.elts:
            # 省略コメント側は (正規表現, 表示名) の組で持っている。
            if isinstance(elt, ast.Tuple) and elt.elts:
                elt = elt.elts[0]
            if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                out.append(elt.value)
    return out


def uncovered_patterns(patterns: list[str]) -> list[str]:
    """DETECTION_SAMPLES のどれにも当たらないパターンを返す。"""
    return [
        rx
        for rx in patterns
        if not any(re.search(rx, sample, re.IGNORECASE) for sample in DETECTION_SAMPLES)
    ]


def main() -> int:
    """全チェックを走らせ、1つでも失敗したら 1 を返す。"""
    failed = 0
    part_patterns = literal_patterns('part_patterns')
    skip_patterns = literal_patterns('skip_patterns')
    patterns = part_patterns + skip_patterns

    # 1. 本体の全パターンに検出例があるか。落ちたら DETECTION_SAMPLES に例を足す。
    for regex in uncovered_patterns(patterns):
        failed += 1
        print(f'  ❌ 検出例の無いパターン: {regex}')

    # 2. 検出例が本当に FAIL になるか（除外条件で握り潰されていないか）。
    for sample in DETECTION_SAMPLES:
        got = run(block('tsx', FP, sample))
        if got.ok or got.errors < 1:
            failed += 1
            print(f'  ❌ 検出されるべき行が素通り: {sample} → {got}')

    # 3. 誤検知しないこと。
    for sample in NON_DETECTION_SAMPLES:
        got = run(block('tsx', FP, sample))
        if not got.ok or got.errors or got.warnings:
            failed += 1
            print(f'  ❌ 誤検知: {sample} → {got}')

    # 4. filepath: を要求する言語が減らされていないか。
    for lang in FILEPATH_REQUIRED_LANGS:
        got = run(block(lang, 'const a = 1;'))
        if got.warnings != 1 or got.with_filepath != 0:
            failed += 1
            print(f'  ❌ {lang} で filepath 警告が出ていません → {got}')

    # 5. filepath 目印を求めない言語が増やされていないか。増えるとその言語は
    #    filepath 欠落を報告しなくなる。
    for lang in FILEPATH_EXEMPT_LANGS:
        got = run(block(lang, '# filepath: scripts/setup.sh', 'echo hi'))
        if got.with_filepath != 0 or got.errors or got.warnings:
            failed += 1
            print(f'  ❌ {lang} で filepath 目印が要求されています → {got}')

    # 5b. filepath を求めない言語でも、省略コメントは見る。ここを飛ばすと
    #     `bash` に `// 省略` と書いた教材が緑のまま出荷される（#369 ①）。
    for lang in FILEPATH_EXEMPT_LANGS:
        got = run(block(lang, '// 省略'))
        if got.ok or got.errors != 1:
            failed += 1
            print(f'  ❌ {lang} の省略コメントが見逃されています → {got}')

    # 6. 表駆動のふるまい確認。
    for name, text, expected in CASES:
        got = run(text)
        if got != expected:
            failed += 1
            print(f'  ❌ {name}: 期待 {expected} / 実際 {got}')

    # 7. パターンの本数がこっそり減らされていないか見る。
    if len(part_patterns) < PART_PATTERN_COUNT:
        failed += 1
        print(f'  ❌ パート分割パターンが {len(part_patterns)} 本へ減らされています')
    if len(skip_patterns) < SKIP_PATTERN_COUNT:
        failed += 1
        print(f'  ❌ 省略コメントパターンが {len(skip_patterns)} 本へ減らされています')

    total = (
        len(patterns)
        + len(DETECTION_SAMPLES)
        + len(NON_DETECTION_SAMPLES)
        + len(FILEPATH_REQUIRED_LANGS)
        + len(FILEPATH_EXEMPT_LANGS)
        + len(FILEPATH_EXEMPT_LANGS)
        + len(CASES)
        + 2
    )
    if failed:
        print(f'❌ check_code_completeness 自己テスト {failed}/{total} 失敗')
        return 1
    print(
        f'✅ check_code_completeness 自己テスト {total}/{total} 合格'
        f'（パターン {len(patterns)} 件すべてに検出例あり）'
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
