#!/usr/bin/env python3
"""check_tech_stack.py の退行テスト。

check_tone.py で「テストの無いチェッカーは、検出が一度も動いていなくても
誰も気づかない」という実例が出た。このチェッカーも同じ状態だったので、
壊れたら落ちる形で振る舞いを固定する。

見るのは次の5つ。
  1. 禁止パターン全件に検出例があること（MUI_SAMPLES が mui_patterns を覆う）
  2. 除外言語（mermaid/bash/shell/sh）だけが検査を飛ばされること
  3. shadcn/ui 判定と警告の出方
  4. 同じ違反を複数ブロックで書いても報告は1件にまとまること
  5. 除外条件そのものが広げられていないこと

1 と 5 は本体の関数内ローカル変数が相手なので import できない。ソースを
AST で読んで突き合わせている。本体の書き方を変えたら抽出も落ちるが、
その時は除外条件が動いた時なので、気づかず素通りするより落ちた方がよい。
"""

import ast
import io
import subprocess
import sys
import tempfile
from contextlib import redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import check_tech_stack as checker  # noqa: E402

MUI_PREFIX = '❌ MUI使用禁止: '
WARN_LINE = '⚠️ shadcn/uiパターンが検出されませんでした'
SHADCN_LINE = '✅ shadcn/ui パターン検出'
FAIL_LINE = '❌ 技術スタックチェックFAIL'
PASS_LINE = '✅ 技術スタックチェックPASS'

CHECKER_PATH = Path(checker.__file__)

# 除外してよい言語。ここを広げると教材のコードが素通りするので固定する。
EXPECTED_SKIPPED_LANGS = frozenset({'mermaid', 'bash', 'shell', 'sh'})

# 禁止パターン1件につき検出例を1つ。パターンを足したらここにも足す。
# 足さないと下の網羅チェックが落ちる。
MUI_SAMPLES: list[tuple[str, str]] = [
    ('@mui/material', "import { Button } from '@mui/material';"),
    ('@mui/icons-material', "import AddIcon from '@mui/icons-material';"),
    ('@mui/system', "import { styled } from '@mui/system';"),
    ('@emotion/react', "import { css } from '@emotion/react';"),
    ('@emotion/styled', "import styled from '@emotion/styled';"),
    ('<Box> (MUI)', '<Box p={2}>中身</Box>'),
    ('<Typography> (MUI)', '<Typography variant="h1">見出し</Typography>'),
    ('<TextField> (MUI)', '<TextField label="名前" />'),
    ('sx={{ }} (MUI style prop)', '<Chip sx={{ m: 1 }} />'),
]


# 同じ禁止パターンの「別の書き方」。MUI_SAMPLES と1件ずつ対になっている。
#
# 検出例が1パターンにつき1件しか無いと、正規表現をその1件だけ通る形に狭めても
# テストが素通りする。実際に変異試験で <Box\s → <Box\s+p= / sx=\{ → sx=\{\{ /
# @/components/ui/ → @/components/ui/button の3件がすり抜けた。
# 属性の順番・引用符・改行の位置を変えた第2の例を置いて、
# 「サンプル文そのもの」に寄せた正規表現では通らないようにする。
MUI_EXTRA_SAMPLES: list[tuple[str, str]] = [
    ('@mui/material', 'import { Card } from "@mui/material";'),
    ('@mui/icons-material', 'import { Delete } from "@mui/icons-material";'),
    ('@mui/system', 'import { spacing } from "@mui/system";'),
    ('@emotion/react', 'import { ClassNames } from "@emotion/react";'),
    ('@emotion/styled', 'import styled from "@emotion/styled"'),
    # 属性が p= 以外、かつ改行区切り
    ('<Box> (MUI)', '<Box\n  display="flex"\n>中身</Box>'),
    ('<Typography> (MUI)', '<Typography color="primary">本文</Typography>'),
    ('<TextField> (MUI)', '<TextField fullWidth />'),
    # sx の値が変数参照（波括弧1重）。sx=\{\{ に狭めると落ちる
    ('sx={{ }} (MUI style prop)', '<Stack sx={styles.root} />'),
]


def fence(lang: str, code: str) -> str:
    """コードブロック1つ分の文字列を組み立てる。"""
    return f'```{lang}\n{code}\n```\n'


MUI_IMPORT = "import { Button } from '@mui/material';"
SHADCN_IMPORT = 'import { Button } from "@/components/ui/button";'

# (テスト名, 本文, 期待する MUI 検出名, 警告が出るか, shadcn 検出行が出るか)
CASES: list[tuple[str, str, set[str], bool, bool]] = [
    (
        'bash ブロックの中身は検査しない',
        fence('bash', MUI_IMPORT),
        set(),
        True,
        False,
    ),
    (
        '大文字の BASH でも除外される',
        fence('BASH', MUI_IMPORT),
        set(),
        True,
        False,
    ),
    (
        'mermaid ブロックの中身は検査しない',
        fence('mermaid', MUI_IMPORT),
        set(),
        True,
        False,
    ),
    (
        'sh ブロックの中身は検査しない',
        fence('sh', MUI_IMPORT),
        set(),
        True,
        False,
    ),
    (
        'shell ブロックの中身は検査しない',
        fence('shell', MUI_IMPORT),
        set(),
        True,
        False,
    ),
    (
        'tsx ブロックは検査する',
        fence('tsx', MUI_IMPORT),
        {'@mui/material'},
        True,
        False,
    ),
    (
        'text ブロックも検査する（除外は4言語だけ）',
        fence('text', MUI_IMPORT),
        {'@mui/material'},
        True,
        False,
    ),
    (
        '言語指定なしのブロックも検査する',
        fence('', MUI_IMPORT),
        {'@mui/material'},
        True,
        False,
    ),
    (
        '地の文の @mui/material は検出しない',
        'MUI（@mui/material）は使いません。sx={ } も書きません。\n',
        set(),
        False,
        False,
    ),
    (
        'コードブロックが無ければ警告も出さない',
        'この日はまだコードを書きません。\n',
        set(),
        False,
        False,
    ),
    (
        'shadcn の import があれば警告は出ない',
        fence('tsx', SHADCN_IMPORT),
        set(),
        False,
        True,
    ),
    (
        'button 以外の ui/ import も shadcn 側として数える',
        fence('tsx', 'import { Dialog } from "@/components/ui/dialog";'),
        set(),
        False,
        True,
    ),
    (
        '単数形 @/component/ui/ も shadcn 側として数える',
        fence('tsx', 'import { Input } from "@/component/ui/input";'),
        set(),
        False,
        True,
    ),
    (
        'lucide-react も shadcn 側として数える',
        fence('tsx', "import { Plus } from 'lucide-react';"),
        set(),
        False,
        True,
    ),
    (
        'className だけでも shadcn 側として数える',
        fence('tsx', '<button className="rounded">保存</button>'),
        set(),
        False,
        True,
    ),
    (
        '除外言語ブロックの className は shadcn として数えない',
        fence('bash', 'echo \'<button className="x" />\''),
        set(),
        True,
        False,
    ),
    (
        '同じ違反が2ブロックあっても報告は1件',
        fence('tsx', MUI_IMPORT) + fence('tsx', MUI_IMPORT),
        {'@mui/material'},
        True,
        False,
    ),
    (
        'shadcn が同居していても MUI があれば FAIL',
        fence('tsx', SHADCN_IMPORT + '\n' + MUI_IMPORT),
        {'@mui/material'},
        False,
        True,
    ),
]


def run(text: str) -> tuple[bool, list[str]]:
    """一時ファイルへ書いてチェッカーを走らせ、(戻り値, 出力行) を返す。

    リポジトリ内に検証用ファイルを置かないため tempfile を使う。
    """
    buf = io.StringIO()
    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / 'sample.md'
        path.write_text(text, encoding='utf-8')
        with redirect_stdout(buf):
            passed = checker.check_tech_stack(str(path))
    return passed, buf.getvalue().splitlines()


def mui_lines(lines: list[str]) -> list[str]:
    """MUI 違反の報告行から違反名だけ取り出す。重複判定にも使うので list で返す。"""
    return [line[len(MUI_PREFIX):] for line in lines if line.startswith(MUI_PREFIX)]


def run_cli(text: str) -> int:
    """CLI として起動したときの終了コードを返す。

    check_tech_stack() を直接呼ぶだけでは __main__ の sys.exit が一度も動かない。
    教材の一括チェックは終了コードで合否を見ているので、ここが常に 0 になる
    壊れ方（sys.exit(0 if success else 1) → sys.exit(0)）を捕まえられるようにする。
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / 'sample.md'
        path.write_text(text, encoding='utf-8')
        proc = subprocess.run(
            [sys.executable, str(CHECKER_PATH), str(path)],
            capture_output=True, text=True,
        )
    return proc.returncode


def source_tree() -> ast.Module:
    return ast.parse(Path(checker.__file__).read_text(encoding='utf-8'))


def declared_mui_names() -> list[str]:
    """本体の mui_patterns に登録されている違反名を取り出す。"""
    for node in ast.walk(source_tree()):
        if not isinstance(node, ast.Assign):
            continue
        if not any(isinstance(t, ast.Name) and t.id == 'mui_patterns' for t in node.targets):
            continue
        if not isinstance(node.value, ast.List):
            return []
        names = []
        for element in node.value.elts:
            if isinstance(element, ast.Tuple) and len(element.elts) == 2:
                label = element.elts[1]
                if isinstance(label, ast.Constant):
                    names.append(label.value)
        return names
    return []


def declared_skipped_langs() -> frozenset[str]:
    """本体が検査を飛ばしている言語の集合を取り出す。"""
    for node in ast.walk(source_tree()):
        if not isinstance(node, ast.Compare) or len(node.ops) != 1:
            continue
        if not isinstance(node.ops[0], ast.In):
            continue
        target = node.comparators[0]
        if isinstance(target, (ast.Tuple, ast.List, ast.Set)) and all(
            isinstance(e, ast.Constant) for e in target.elts
        ):
            return frozenset(e.value for e in target.elts)
    return frozenset()


def main() -> int:
    failed = 0

    # 1. 禁止パターン全件に検出例があるか。落ちたら MUI_SAMPLES に例を足す。
    declared = declared_mui_names()
    covered = {name for name, _code in MUI_SAMPLES}
    if not declared:
        failed += 1
        print('  ❌ mui_patterns を本体から読み取れません（構造が変わった可能性）')
    for name in declared:
        if name not in covered:
            failed += 1
            print(f'  ❌ 検出例の無い禁止パターン: {name}')
    for name in covered - set(declared):
        failed += 1
        print(f'  ❌ 本体から消えた禁止パターン: {name}')

    # 2. 検出例が本当に1件ずつ検出されるか（正規表現が空振りしていないか）。
    for name, code in MUI_SAMPLES:
        passed, lines = run(fence('tsx', code))
        got = mui_lines(lines)
        if got != [name]:
            failed += 1
            print(f'  ❌ {name} の検出: 期待 [{name}] / 実際 {got}')
        if passed:
            failed += 1
            print(f'  ❌ {name} を検出したのに PASS を返しています')

    # 2b. 同じパターンの別の書き方でも検出できるか（正規表現をサンプル文に
    #     寄せて狭める壊し方を捕まえる）。
    for name, code in MUI_EXTRA_SAMPLES:
        passed, lines = run(fence('tsx', code))
        got = mui_lines(lines)
        if got != [name]:
            failed += 1
            print(f'  ❌ {name} の別表記の検出: 期待 [{name}] / 実際 {got}')
        if passed:
            failed += 1
            print(f'  ❌ {name} の別表記を検出したのに PASS を返しています')

    # 3. 言語の除外・警告・重複まとめ。
    for name, text, expected_mui, expect_warn, expect_shadcn in CASES:
        passed, lines = run(text)
        got = mui_lines(lines)
        if set(got) != expected_mui:
            failed += 1
            print(f'  ❌ {name}: 期待 {sorted(expected_mui)} / 実際 {got}')
        elif len(got) != len(expected_mui):
            failed += 1
            print(f'  ❌ {name}: 同じ違反が {len(got)} 行に重複しています')
        if passed != (not expected_mui):
            failed += 1
            print(f'  ❌ {name}: 戻り値が {passed} になっています')
        if (WARN_LINE in lines) != expect_warn:
            failed += 1
            print(f'  ❌ {name}: 警告の有無が期待と違います（期待 {expect_warn}）')
        if (SHADCN_LINE in lines) != expect_shadcn:
            failed += 1
            print(f'  ❌ {name}: shadcn 検出行の有無が期待と違います（期待 {expect_shadcn}）')

    # 4. 全パターンを1ファイルに入れたら全部並ぶ（先勝ちで打ち切っていないか）。
    all_code = '\n'.join(code for _name, code in MUI_SAMPLES)
    passed, lines = run(fence('tsx', all_code))
    if set(mui_lines(lines)) != covered:
        failed += 1
        print(f'  ❌ 全部入り: 期待 {len(covered)} 種 / 実際 {sorted(set(mui_lines(lines)))}')
    if passed:
        failed += 1
        print('  ❌ 全部入りなのに PASS を返しています')

    # 5. 除外言語がこっそり広げられていないか見る。
    skipped = declared_skipped_langs()
    if skipped != EXPECTED_SKIPPED_LANGS:
        failed += 1
        print(f'  ❌ 除外言語が {sorted(skipped)} に変えられています')

    # 6. 合否バナーが出ているか。運用者はこの行を見て判断する。
    _, ng_lines = run(fence('tsx', MUI_IMPORT))
    _, ok_lines = run(fence('tsx', SHADCN_IMPORT))
    if FAIL_LINE not in ng_lines or PASS_LINE in ng_lines:
        failed += 1
        print(f'  ❌ 違反ありのバナーが異常です: {ng_lines}')
    if PASS_LINE not in ok_lines or FAIL_LINE in ok_lines:
        failed += 1
        print(f'  ❌ 違反なしのバナーが異常です: {ok_lines}')

    # 7. CLI の終了コード。教材の一括チェックはここだけを見ている。
    if run_cli(fence('tsx', MUI_IMPORT)) != 1:
        failed += 1
        print('  ❌ 違反ありなのに CLI が exit 1 を返していません')
    if run_cli(fence('tsx', SHADCN_IMPORT)) != 0:
        failed += 1
        print('  ❌ 違反なしなのに CLI が exit 0 を返していません')

    total = (
        1 + len(declared) + len(MUI_SAMPLES) + len(MUI_EXTRA_SAMPLES)
        + len(CASES) + 2 + 1 + 2 + 2
    )
    if failed:
        print(f'❌ check_tech_stack 自己テスト {failed}/{total} 失敗')
        return 1
    print(
        f'✅ check_tech_stack 自己テスト {total}/{total} 合格'
        f'（禁止パターン {len(declared)} 件すべてに検出例あり）'
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
