#!/usr/bin/env python3
"""check_tone.py の退行テスト。

このチェッカーは22本あるうちテストが無いまま運用されていた。素通りしていた
抜け穴（SKILL.md の表に載っているのにパターンが無い形）を塞いだあと、
塞いだままであることをここで見る。

見るのは次の5つ。
  1. 登録されている全パターンに検出例があること（COVERAGE_SAMPLES）
  2. コードブロックの扱い（```text だけ中身を検査する）
  3. 誤検知しないこと（複合語・敬体の可能形など）
  4. 同じ理由の語尾が1行に並ぶリズムの単調さ
  5. しきい値と除外条件が緩められていないこと

1 があるので、新しいパターンを足して検出例を書き忘れると、このテストが落ちる。
AGENTS.md の「3表の全項目が検出対象に入っている」という記述は、ここで担保する。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_tone import (  # noqa: E402
    AI_PHRASE_PATTERNS,
    CASUAL_PATTERNS,
    KANSAI_PATTERNS,
    MAX_SAME_REASON_PER_LINE,
    REASON_ENDINGS,
    REDUNDANCY_PATTERNS,
    TRANSLATION_PATTERNS,
    collect_findings,
    find_repeated_reason,
)

ALL_SPECS = (
    KANSAI_PATTERNS
    + CASUAL_PATTERNS
    + AI_PHRASE_PATTERNS
    + TRANSLATION_PATTERNS
    + REDUNDANCY_PATTERNS
)

# 登録されている全パターンを1つ以上覆う検出例。SKILL.md の3表と手順6に対応する。
# パターンを足したらここにも例を足す。足さないと下の網羅チェックが落ちる。
COVERAGE_SAMPLES: list[str] = [
    # 関西弁
    '初期セットアップは完了やで。',
    'そこが違うやな。',
    'サーバー側がまだないやねん。',
    'サーバー側がまだないからや。',
    '締め切りは今日や。',
    'それはちゃう。',
    '見栄えだけがええわけやない。',
    'ワイも計っていません。',
    '同じ形で動くやんか。',
    'ここで消したらあかん。',
    'そうやけど、順番が違います。',
    'せやから順番を変えます。',
    # 常体・命令形
    'ここでファイルを作る。',
    '同じエラーは起きない。',
    'これは設定ファイルである。',
    '設定を変える必要はない。',
    'これは設定ファイルだ。',
    '原因は綴りの間違いだった。',
    'ここで確認しろ。',
    '早く書けよ。',
    # AI典型構文
    '設定を保存することができます。',
    'これにより画面が更新されます。',
    'この方法が安全と言えるでしょう。',
    'この形が便利ではないでしょうか。',
    'いかがでしたでしょうか。',
    'ここでは認証について解説します。',
    'さまざまな場面で使います。',
    '言うまでもありません。',
    'あらゆる観点から確認します。',
    'この結果は重要な示唆を与えています。',
    'この計測が問題を浮き彫りにしています。',
    'この違いは注目に値する点です。',
    # 英語直訳調
    '認証することは可能です。',
    'セッションについて言及しました。',
    '削除に関しても同様です。',
    '認証を実施することができます。',
    '認証を実施します。',
    '順番が変わるという点に注意します。',
    '先に設定を行うことが必要です。',
    # 重言
    'まず最初にファイルを開きます。',
    '所要時間は約5分程度です。',
    'この関数は返り値を返します。',
]

# 検出してはいけない文。誤検知が入り込むと教材の執筆が止まるので、ここで固定する。
NON_DETECTION_SAMPLES: list[str] = [
    '初期セットアップが完了しました。',
    '変数の名前は `yade` です。',
    'ホワイトボードに貼ります。',
    'ワイドモニターで開きます。',
    'ワイルドカードで指定します。',
    'ワイヤーフレームを描きます。',
    'ハワイが好きです。',
    'ここに書けます。この方法が使えます。',
    '| `useState` | 画面が覚えておく値を作る。 |',
    '> 完了やで。',
    'A を置くのは B のためです。C を置くのは D のためです。',
    'A は B のためです。C は D のためです。E は F だからです。',
]

# (テスト名, 本文, 何件検出されるべきか)
CASES: list[tuple[str, str, int]] = [
    (
        'tsx のコードブロックの中身は検査しない',
        '```tsx\nconst a = 1; // 完了やで\n```\n',
        0,
    ),
    (
        'text のコードブロックの中身は検査する',
        '```text\n初期セットアップは完了やで。\n```\n',
        1,
    ),
    (
        'text に属性が付いていても中身を検査する',
        '```text title="post"\n初期セットアップは完了やで。\n```\n',
        1,
    ),
    (
        '同じ理由の語尾が3回で捕まえる',
        'A は B のためです。C は D のためです。E は F のためです。\n',
        1,
    ),
]


def descriptions(text: str) -> list[str]:
    """検出結果の説明だけを取り出す。突き合わせの失敗時に何が出たかを見るため。"""
    return [description for _lineno, description, _fix, _text in collect_findings(text)]


def uncovered_patterns() -> list[str]:
    """COVERAGE_SAMPLES のどれにも当たらないパターンの正規表現を返す。"""
    return [
        pattern.pattern
        for pattern, _description, _fix in ALL_SPECS
        if not any(pattern.search(sample) for sample in COVERAGE_SAMPLES)
    ]


def main() -> int:
    """全チェックを走らせ、1つでも失敗したら 1 を返す。"""
    failed = 0

    # 1. 全パターンに検出例があるか。ここが落ちたら COVERAGE_SAMPLES に例を足す。
    for regex in uncovered_patterns():
        failed += 1
        print(f'  ❌ 検出例の無いパターン: {regex}')

    # 2. 検出例が本当に検出されるか（除外条件で握り潰されていないか）。
    for sample in COVERAGE_SAMPLES:
        if not collect_findings(sample + '\n'):
            failed += 1
            print(f'  ❌ 検出されるべき文が素通り: {sample}')

    # 3. 誤検知しないこと。
    for sample in NON_DETECTION_SAMPLES:
        got = collect_findings(sample + '\n')
        if got:
            failed += 1
            print(f'  ❌ 誤検知: {sample} → {descriptions(sample + chr(10))}')

    # 4. コードブロックの扱いとリズムの単調さ。
    for name, text, expected in CASES:
        got = len(collect_findings(text))
        if got != expected:
            failed += 1
            print(f'  ❌ {name}: 期待 {expected} 件 / 実際 {got} 件 {descriptions(text)}')

    # 5. 同じ語尾が2種類とも並ぶ行は、種類ごとに1件ずつ報告する。
    both = (
        'A は B のためです。C は D のためです。E は F のためです。'
        'G は H だからです。I は J だからです。K は L だからです。'
    )
    if len(find_repeated_reason(both)) != 2:
        failed += 1
        print(f'  ❌ 2種類が並ぶ行: 期待 2 件 / 実際 {len(find_repeated_reason(both))} 件')

    # 6. しきい値と対象がこっそり緩められていないか見る。
    if MAX_SAME_REASON_PER_LINE > 2:
        failed += 1
        print(f'  ❌ MAX_SAME_REASON_PER_LINE が {MAX_SAME_REASON_PER_LINE} に上げられています')
    if set(REASON_ENDINGS) != {'ためです', 'からです'}:
        failed += 1
        print(f'  ❌ REASON_ENDINGS が {REASON_ENDINGS} に変えられています')

    total = (
        len(ALL_SPECS)
        + len(COVERAGE_SAMPLES)
        + len(NON_DETECTION_SAMPLES)
        + len(CASES)
        + 3
    )
    if failed:
        print(f'❌ check_tone 自己テスト {failed}/{total} 失敗')
        return 1
    print(f'✅ check_tone 自己テスト {total}/{total} 合格（パターン {len(ALL_SPECS)} 件すべてに検出例あり）')
    return 0


if __name__ == '__main__':
    sys.exit(main())
