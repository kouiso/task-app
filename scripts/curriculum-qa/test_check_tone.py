#!/usr/bin/env python3
"""check_tone.py の退行テスト。

このチェッカーは22本あるうちテストが無いまま運用されていた。素通りしていた
抜け穴（SKILL.md の表に載っているのにパターンが無い形）を塞いだあと、
塞いだままであることをここで見る。

見るのは次の4つ。
  1. コードブロックの扱い（```text だけ中身を検査する）
  2. 禁止カテゴリの検出（関西弁・常体・AI典型構文・直訳調・重言）
  3. 同じ理由の語尾が1行に並ぶリズムの単調さ
  4. しきい値と除外条件が緩められていないこと
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_tone import (  # noqa: E402
    MAX_SAME_REASON_PER_LINE,
    REASON_ENDINGS,
    collect_findings,
    find_repeated_reason,
)


def descriptions(text: str) -> list[str]:
    """検出結果の説明だけを取り出す。行番号や本文はここでは見ない。"""
    return [description for _lineno, description, _fix, _text in collect_findings(text)]


def detected(text: str) -> bool:
    return bool(collect_findings(text))


# (テスト名, 本文, 何件検出されるべきか)
CASES: list[tuple[str, str, int]] = [
    # --- コードブロックの扱い ---
    ('敬体の地の文は素通りする', '初期セットアップが完了しました。\n', 0),
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
        'インラインコードの中は検査しない',
        '変数の名前は `yade` です。\n',
        0,
    ),
    ('引用行は素通りする', '> 完了やで。\n', 0),
    # --- 禁止カテゴリ ---
    ('関西弁の語尾を捕まえる', 'サーバー側がまだないからや。\n', 1),
    # `\b` は日本語で成立しないため、助詞が続く「ワイ」を長らく取りこぼしていた。
    ('関西弁一人称「ワイ」を助詞付きで捕まえる', 'ワイも計っていません。\n', 1),
    ('「ホワイトボード」は誤検知しない', 'ホワイトボードに貼ります。\n', 0),
    ('「ワイド」は誤検知しない', 'ワイドモニターで開きます。\n', 0),
    # 除外語を並べる書き方では取りこぼしていた語。教材で出てもおかしくない。
    ('「ワイルドカード」は誤検知しない', 'ワイルドカードで指定します。\n', 0),
    ('「ワイヤーフレーム」は誤検知しない', 'ワイヤーフレームを描きます。\n', 0),
    ('「ハワイ」は誤検知しない', 'ハワイが好きです。\n', 0),
    ('命令形「書けよ。」を捕まえる', '早く書けよ。\n', 1),
    ('常体の文末を捕まえる', 'ここでファイルを作る。\n', 1),
    # textlint の no-mix-dearu-desumasu が捕まえるのは「である」だけで、
    # 以下はどれも素通りしていた（実測）。ここが最後の砦になる。
    ('常体「だ。」を捕まえる', 'これは設定ファイルだ。\n', 1),
    ('常体「だった。」を捕まえる', '原因は綴りの間違いだった。\n', 1),
    ('常体「だろう。」を捕まえる', 'これで動くだろう。\n', 1),
    ('命令形「しろ。」を捕まえる', 'ここで確認しろ。\n', 1),
    ('命令形「使え。」を捕まえる', '次のコマンドを使え。\n', 1),
    ('敬体の可能形は誤検知しない', 'ここに書けます。この方法が使えます。\n', 0),
    (
        '表の行は常体チェックの対象外',
        '| `useState` | 画面が覚えておく値を作る。 |\n',
        0,
    ),
    ('AI典型構文を捕まえる', 'これにより画面が更新されます。\n', 1),
    ('直訳調「することは可能です」を捕まえる', '認証することは可能です。\n', 1),
    # 「を実施することができます」しか見ていなかったため素通りしていた形。
    ('直訳調「を実施します」を捕まえる', '認証を実施します。\n', 1),
    ('直訳調「という点に注意」を捕まえる', '順番が変わるという点に注意します。\n', 1),
    ('重言「まず最初に」を捕まえる', 'まず最初にファイルを開きます。\n', 1),
    ('重言「返り値を返す」を捕まえる', 'この関数は返り値を返します。\n', 1),
    ('重言「約〜程度」を捕まえる', '所要時間は約5分程度です。\n', 1),
    # --- リズムの単調さ ---
    (
        '同じ理由の語尾が2回なら通す',
        'A を置くのは B のためです。C を置くのは D のためです。\n',
        0,
    ),
    (
        '同じ理由の語尾が3回で捕まえる',
        'A は B のためです。C は D のためです。E は F のためです。\n',
        1,
    ),
    (
        '理由の語尾が違えば3文でも通す',
        'A は B のためです。C は D のためです。E は F だからです。\n',
        0,
    ),
]


def main() -> int:
    failed = 0

    for name, text, expected in CASES:
        got = len(collect_findings(text))
        if got != expected:
            failed += 1
            print(f'  ❌ {name}: 期待 {expected} 件 / 実際 {got} 件 {descriptions(text)}')

    # 同じ語尾が2種類とも並ぶ行は、種類ごとに1件ずつ報告する。
    both = 'A は B のためです。C は D のためです。E は F のためです。' \
           'G は H だからです。I は J だからです。K は L だからです。'
    if len(find_repeated_reason(both)) != 2:
        failed += 1
        print(f'  ❌ 2種類が並ぶ行: 期待 2 件 / 実際 {len(find_repeated_reason(both))} 件')

    # しきい値と対象がこっそり緩められていないか見る。
    if MAX_SAME_REASON_PER_LINE > 2:
        failed += 1
        print(f'  ❌ MAX_SAME_REASON_PER_LINE が {MAX_SAME_REASON_PER_LINE} に上げられています')
    if set(REASON_ENDINGS) != {'ためです', 'からです'}:
        failed += 1
        print(f'  ❌ REASON_ENDINGS が {REASON_ENDINGS} に変えられています')
    # 検出が丸ごと無効化されていないことの確認。
    if not detected('完了やで。\n'):
        failed += 1
        print('  ❌ 関西弁の検出そのものが効いていません')

    total = len(CASES) + 4
    if failed:
        print(f'❌ check_tone 自己テスト {failed}/{total} 失敗')
        return 1
    print(f'✅ check_tone 自己テスト {total}/{total} 合格')
    return 0


if __name__ == '__main__':
    sys.exit(main())
