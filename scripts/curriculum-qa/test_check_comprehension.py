#!/usr/bin/env python3
"""check_comprehension.py の退行テスト。

このチェッカーは367行あって責務が4つに分かれているのに、テストが無いまま
運用されていた。check_tone.py では正規表現の `\\b` が日本語で成立せず検出が
一度も動いていなかった、という実例が出ている。空振りしても誰も気づかない、
という同じ穴をここで塞ぐ。

見るのは次の6つ。
  1. 注釈判定の7つの形（括弧・リンク・見出し・とは・「」・行頭コロン・表）
  2. 注釈と認めてはいけない形（用語から離れた括弧、コードブロック内の注釈、
     初出から ANNOTATION_WINDOW_LINES 行より遠い注釈）
  3. 禁止表現の全語に検出例があること、コードブロック内は見逃すこと
  4. Step ごとの確認ポイント判定（タイトル行だけで合格しないこと）
  5. カリキュラム順序と「先に教えたファイル」の判定、前後ファイル探索
  6. しきい値・用語リスト・禁止語リストが緩められていないこと

3 と 1 は網羅チェックにしてあるので、パターンや語を足して検出例を書き忘れると
このテストが落ちる。
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_comprehension import (  # noqa: E402
    ANNOTATION_WINDOW_LINES,
    BEGINNER_NEGATIVE,
    FORBIDDEN_PHRASES,
    TECH_TERMS,
    annotation_patterns_for,
    check_confirmation_points,
    check_forbidden_phrases,
    check_unannotated_terms,
    code_block_lines,
    curriculum_order_key,
    find_later_annotation,
    find_prior_annotation,
    is_teaching_file,
    term_annotated,
)

ALL_FORBIDDEN = FORBIDDEN_PHRASES + BEGINNER_NEGATIVE

# 注釈と認めるべき7つの形。annotation_patterns_for の各パターンに1つずつ対応する。
# パターンを足したら例も足す。足さないと下の網羅チェックが落ちる。
ANNOTATION_SAMPLES: list[tuple[str, str]] = [
    ('Next.js', 'Next.js（Webアプリを作る土台）を使います。'),
    ('Next.js', '[Next.js](https://nextjs.org)（Webアプリを作る土台）を使います。'),
    ('Next.js', '## Next.js\n\nWebアプリを作るための土台です。'),
    ('Next.js', 'Next.js とは、Webアプリを作る土台のことです'),
    ('Next.js', '「Next.js」はWebアプリを作る土台です'),
    ('Next.js', 'Next.js: Webアプリを作る土台'),
    ('Next.js', '| Next.js | ネクストジェイエス | 画面を作る土台 |'),
    # 短いASCII接尾辞ごと注釈に結び付ける形。`shadcn/ui（...）` を落とさないための猶予。
    ('shadcn', 'shadcn/ui（貼って使える画面部品の詰め合わせ）を入れます。'),
]

# 注釈と認めてはいけない形。ここが緩むと「用語を並べただけの文」が通る。
NOT_ANNOTATION_SAMPLES: list[tuple[str, str]] = [
    ('Next.js', 'Next.js を使います。私は昼食を食べました（美味しかった）。'),
    ('Next.js', 'Next.js（略）'),
    ('Prisma', 'Prisma を入れます。設定は後で書きます。'),
]

# (テスト名, 本文, 期待する [(用語, 行番号)])
UNANNOTATED_CASES: list[tuple[str, str, list[tuple[str, int]]]] = [
    (
        '注釈があれば挙げない',
        'Next.js（Webアプリを作る土台）を使います。\n',
        [],
    ),
    (
        '注釈がなければ初出行で挙げる',
        '本文です。\nNext.js を使います。\n',
        [('Next.js', 2)],
    ),
    (
        'コードブロック内の用語は初出に数えない',
        '```ts\nimport next from "Next.js";\n```\n',
        [],
    ),
    (
        'コードブロック内の注釈は注釈に数えない',
        'Next.js を使います。\n\n```text\nNext.js（Webアプリを作る土台）\n```\n',
        [('Next.js', 1)],
    ),
    (
        f'初出から{ANNOTATION_WINDOW_LINES}行以内の注釈は有効',
        # 注釈が窓の内側ぎりぎり（初出＋窓の行数ちょうど）に来るよう定数から導く。
        # 固定値にするとケース名と本文がずれ、落ちたときに原因を読み取れない。
        'Next.js を使います。\n'
        + '\n' * (ANNOTATION_WINDOW_LINES - 1)
        + 'Next.js（Webアプリを作る土台）です。\n',
        [],
    ),
    (
        f'初出から{ANNOTATION_WINDOW_LINES}行より遠い注釈は無効',
        'Next.js を使います。\n' + '\n' * (ANNOTATION_WINDOW_LINES + 10)
        + 'Next.js（Webアプリを作る土台）です。\n',
        [('Next.js', 1)],
    ),
    (
        '未注釈の用語が複数あれば全部挙げる',
        'Next.js と Prisma を使います。\n',
        [('Next.js', 1), ('Prisma', 1)],
    ),
    # 同じ用語が何度出ても、報告するのは地の文の初出1件だけ。ここが崩れると
    # 1つの未注釈用語が出現回数ぶん重複して並び、FAIL 件数が実態とずれる。
    (
        '同じ用語が何度出ても初出1件だけ挙げる',
        'Next.js を使います。\nもう一度 Next.js を使います。\nさらに Next.js です。\n',
        [('Next.js', 1)],
    ),
]

# 禁止表現の検出例。1語につき1文。語をリストから消すと、その文が素通りして落ちる。
FORBIDDEN_SAMPLES: list[str] = [
    '当然この設定が要ります。',
    'ご存知の通り設定が要ります。',
    'ご存じの通り設定が要ります。',
    'ここでは省略します。',
    '詳細は割愛します。',
    'エラーが出たらググってください。',
    'エラーが出たら検索してください。',
    'この動きは自明です。',
    '言うまでもなく設定が要ります。',
    'もちろん設定が要ります。',
    'ログを見れば簡単にわかります。',
    'この設定は簡単です。',
    '設定は簡単に終わります。',
    'ログを見れば一目でわかる。',
    'この画面は誰でもわかる。',
]

# 禁止語を含まない文。substring 一致なので、ここが壊れると執筆が止まる。
FORBIDDEN_NEGATIVE_SAMPLES: list[str] = [
    'ここで設定ファイルを保存します。',
    'エラーメッセージを読んで原因を探します。',
]

# (テスト名, 本文, 期待する {steps, without_checkpoints})
CONFIRMATION_CASES: list[tuple[str, str, tuple[int, int]]] = [
    ('Step が無ければ検査しない', '本文だけです。\n', (0, 0)),
    ('✅ を確認ポイントに数える', '## Step 1: 作る\n\n✅ 画面が出る\n', (1, 0)),
    ('チェックボックスを数える', '## Step 1: 作る\n\n- [ ] 画面が出る\n', (1, 0)),
    ('確認: を数える', '## Step 1: 作る\n\n確認: 画面が出る\n', (1, 0)),
    ('確認ポイント見出しを数える', '## Step 1: 作る\n\n**確認ポイント**\n\n画面が出る\n', (1, 0)),
    ('期待する結果の見出しを数える', '## Step 1: 作る\n\n### 期待する結果\n\n画面が出る\n', (1, 0)),
    ('成功判定の見出しを数える', '## Step 1: 作る\n\n### 成功判定\n\n画面が出る\n', (1, 0)),
    ('本文に検証手段が無ければ落とす', '## Step 1: 作る\n\nファイルを置きます。\n', (1, 1)),
    # Step のタイトル行に「確認」が入っているだけで合格すると、検証手段ゼロの節が通る。
    ('タイトル行だけでは合格させない', '## Step 1: 動作を確認する\n\nファイルを置きます。\n', (1, 1)),
    ('ステップ表記も Step として数える', '## ステップ1: 作る\n\nファイルを置きます。\n', (1, 1)),
    ('手順表記も Step として数える', '### 手順 2: 作る\n\nファイルを置きます。\n', (1, 1)),
    (
        '複数 Step は欠けている方だけ落とす',
        '## Step 1: 作る\n\n✅ 出た\n\n## Step 2: 次\n\nファイルを置きます。\n',
        (2, 1),
    ),
]


def unannotated(text: str) -> list[tuple[str, int]]:
    """検出結果を (用語, 行番号) に落とす。突き合わせの失敗時に中身を見るため。"""
    return [
        (issue['term'], issue['line'])
        for issue in check_unannotated_terms(text, text.splitlines())
    ]


def annotated(term: str, text: str) -> bool:
    return term_annotated(text, code_block_lines(text.splitlines()), term)


def uncovered_pattern_indexes() -> list[int]:
    """ANNOTATION_SAMPLES のどれにも当たらない注釈パターンの位置を返す。"""
    covered = set()
    for term, text in ANNOTATION_SAMPLES:
        for i, pattern in enumerate(annotation_patterns_for(term)):
            if pattern.search(text):
                covered.add(i)
    total = len(annotation_patterns_for('Next.js'))
    return [i for i in range(total) if i not in covered]


def check_cross_file() -> list[str]:
    """カリキュラム内の前後ファイル探索を、実物の教材に依存せず一時ディレクトリで見る。"""
    errors = []
    with tempfile.TemporaryDirectory() as tmp:
        d = Path(tmp)
        # 目次は注釈済みだが「教えた」とは認めない側の例。
        (d / '00_index.md').write_text(
            'Next.js（Webアプリを作る土台）の目次\n', encoding='utf-8')
        (d / 'day01_start.md').write_text(
            'Prisma（データベースを扱う道具）を入れます。\n', encoding='utf-8')
        (d / 'day02_next.md').write_text(
            'Prisma を使います。Next.js も使います。\n', encoding='utf-8')
        (d / 'day03_last.md').write_text(
            'Next.js（Webアプリを作る土台）を使います。\n', encoding='utf-8')
        target = str(d / 'day02_next.md')

        if find_prior_annotation(target, 'Prisma') != 'day01_start.md':
            errors.append(
                f'  ❌ 前の day の注釈を見つけられていない: '
                f'{find_prior_annotation(target, "Prisma")}')
        # 目次の箇条書きを「先に教えた」に数えると、未注釈の初出が WARNING に格下げされる。
        if find_prior_annotation(target, 'Next.js') is not None:
            errors.append(
                f'  ❌ 目次を教材として数えている: '
                f'{find_prior_annotation(target, "Next.js")}')
        if find_later_annotation(target, 'Next.js') != 'day03_last.md':
            errors.append(
                f'  ❌ 後のファイルの注釈を見つけられていない: '
                f'{find_later_annotation(target, "Next.js")}')

        order = [
            curriculum_order_key(d / '00_index.md'),
            curriculum_order_key(d / 'day01_start.md'),
            curriculum_order_key(d / 'day03_last.md'),
            curriculum_order_key(d / 'appendix_a.md'),
        ]
        if order != sorted(order):
            errors.append(f'  ❌ カリキュラム順序が壊れています: {order}')

        teaching = (
            is_teaching_file(Path('00_index.md')),
            is_teaching_file(Path('day01_start.md')),
            is_teaching_file(Path('appendix_a.md')),
        )
        if teaching != (False, True, True):
            errors.append(f'  ❌ 教材ファイル判定が壊れています: {teaching}')
    return errors


CROSS_FILE_CHECKS = 5


def main() -> int:
    """全チェックを走らせ、1つでも失敗したら 1 を返す。"""
    failed = 0

    # 1. 注釈と認めるべき形。パターンを消すとここが落ちる。
    for term, text in ANNOTATION_SAMPLES:
        if not annotated(term, text):
            failed += 1
            print(f'  ❌ 注釈と認められるべき文が素通り: {text!r}')

    # 2. 注釈パターンに検出例があるか。ここが落ちたら ANNOTATION_SAMPLES に例を足す。
    for index in uncovered_pattern_indexes():
        failed += 1
        print(f'  ❌ 検出例の無い注釈パターン: {index} 番目')

    # 3. 注釈と認めてはいけない形。
    for term, text in NOT_ANNOTATION_SAMPLES:
        if annotated(term, text):
            failed += 1
            print(f'  ❌ 注釈でない文を注釈と認めています: {text!r}')

    # 4. 初出検出・コードブロック除外・注釈の有効範囲。
    for name, text, expected in UNANNOTATED_CASES:
        got = unannotated(text)
        if got != expected:
            failed += 1
            print(f'  ❌ {name}: 期待 {expected} / 実際 {got}')

    # 5. 禁止表現の全語に検出例があるか。
    for phrase in ALL_FORBIDDEN:
        if not any(phrase in sample for sample in FORBIDDEN_SAMPLES):
            failed += 1
            print(f'  ❌ 検出例の無い禁止語: 「{phrase}」')

    # 6. 検出例が本当に検出されるか（語がリストから消えていないか）。
    for sample in FORBIDDEN_SAMPLES:
        if not check_forbidden_phrases(sample + '\n', [sample]):
            failed += 1
            print(f'  ❌ 検出されるべき禁止表現が素通り: {sample}')

    # 7. 禁止語を含まない文を拾わないこと。
    for sample in FORBIDDEN_NEGATIVE_SAMPLES:
        got = check_forbidden_phrases(sample + '\n', [sample])
        if got:
            failed += 1
            print(f'  ❌ 禁止表現の誤検知: {sample} → {got}')

    # 8. コードブロック内の禁止語は見逃す（写経対象のコードを壊さないため）。
    code = '```text\n当然この設定が要ります。\n```\n'
    if check_forbidden_phrases(code, code.splitlines()):
        failed += 1
        print('  ❌ コードブロック内の禁止表現を拾っています')

    # 9. Step ごとの確認ポイント。
    for name, text, expected in CONFIRMATION_CASES:
        result = check_confirmation_points(text)
        got = (result['steps'], result['without_checkpoints'])
        if got != expected:
            failed += 1
            print(f'  ❌ {name}: 期待 {expected} / 実際 {got}')

    # 10. カリキュラム内の前後ファイル探索。
    for message in check_cross_file():
        failed += 1
        print(message)

    # 11. しきい値と対象リストがこっそり緩められていないか見る。
    # 上の境界ケースは本文を定数から導くので、窓が動いてもケース自体は通ってしまう。
    # 窓の増減はどちらも仕様変更なので、値そのものをここで固定する。
    if ANNOTATION_WINDOW_LINES != 50:
        failed += 1
        print(f'  ❌ ANNOTATION_WINDOW_LINES が {ANNOTATION_WINDOW_LINES} に変えられています')
    required_terms = {'Next.js', 'React', 'TypeScript', 'Prisma', 'API', 'コンポーネント'}
    missing_terms = required_terms - set(TECH_TERMS)
    if missing_terms:
        failed += 1
        print(f'  ❌ TECH_TERMS から外された用語があります: {sorted(missing_terms)}')
    required_phrases = {'当然', 'ググってください', '自明', '簡単です'}
    missing_phrases = required_phrases - set(ALL_FORBIDDEN)
    if missing_phrases:
        failed += 1
        print(f'  ❌ 禁止語から外された語があります: {sorted(missing_phrases)}')

    total = (
        len(ANNOTATION_SAMPLES)
        + len(annotation_patterns_for('Next.js'))
        + len(NOT_ANNOTATION_SAMPLES)
        + len(UNANNOTATED_CASES)
        + len(ALL_FORBIDDEN)
        + len(FORBIDDEN_SAMPLES)
        + len(FORBIDDEN_NEGATIVE_SAMPLES)
        + 1
        + len(CONFIRMATION_CASES)
        + CROSS_FILE_CHECKS
        + 3
    )
    if failed:
        print(f'❌ check_comprehension 自己テスト {failed}/{total} 失敗')
        return 1
    print(f'✅ check_comprehension 自己テスト {total}/{total} 合格')
    return 0


if __name__ == '__main__':
    sys.exit(main())
