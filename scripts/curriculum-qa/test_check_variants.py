#!/usr/bin/env python3
"""check_variants.py の退行テスト。

書いた本人が手で確かめるだけでは、除外の条件をあとから壊しても気づけない。実際に
「早わかり」を巻き込む書き方を一度書いてしまい、見出しが壊れかけた。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_variants import find  # noqa: E402

CASES: list[tuple[str, str, int]] = [
    ("揺れた書き方を見つける", "既にファイルがある場合は上書きします。", 1),
    ("正とする書き方は通す", "すでにファイルがある場合は上書きします。", 0),
    ("複数の語が同じ行にあれば両方数える", "全て既に終わっています。", 2),
    ("コードブロックの中は見ない", "```ts\nmessage: 'このメールは既に使われています',\n```\n", 0),
    ("4連バッククォートのブロックも見ない", "````md\n既に\n````\n", 0),
    ("早わかり は複合名詞なので直さない", "### 今日の新語（早わかり）", 0),
    ("早わかり 以外の わかり は直す", "この部分が一番わかりにくいところです。", 1),
    ("わかる も同じ扱い", "画面を見ればわかるようになります。", 1),
    ("閉じていないブロックの後ろは見ない", "```ts\n既に\n", 0),
    ("表の行も本文として見る", "| メール重複 | 既に使われている |", 1),
]


def main() -> int:
    failed = 0
    for name, text, expected in CASES:
        got = len(list(find(text)))
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} 件 / 実際 {got} 件")
    if failed:
        print(f"❌ check_variants 自己テスト {failed}/{len(CASES)} 失敗")
        return 1
    print(f"✅ check_variants 自己テスト {len(CASES)}/{len(CASES)} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
