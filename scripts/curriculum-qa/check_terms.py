#!/usr/bin/env python3
"""同じ概念に2通りの書き方が混ざっていないかを検出する。

30日ぶんを別々に書くと、同じものが「ハンドラー」と「ハンドラ」に割れる。
1日ずつ読む限りどちらも正しく見えるので、通して読んだときだけ違和感が出る。
読者は「別のものか」と考え込むことになる。

手書きの辞書は作らない。教材そのものから表記を集め、
同じ語の変種のうち少数派が全体の一定割合未満なら、揺れとみなす。
辞書のメンテナンスが要らないので、新しい用語が増えても検出が効き続ける。
"""

import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

# 少数派がこの割合未満なら「揺れ」とみなす。
# 例: ハンドラー90回 対 ハンドラ3回 → 3/93 = 3.2% で検出。
MINORITY_RATIO = 0.15

# 2文字以下は略語や助詞の一部を拾うので対象外。
MIN_LEN = 3

# 意図的に使い分けている語。揺れではないので除外する。
ALLOW = {
    "db",  # コード中の識別子とプロセス名。「データベース」と併存してよい
}

KATAKANA = re.compile(r"[ァ-ヶー]{3,}")


def normalize(term: str) -> str:
    """長音・全角半角・大小文字を落として、同じ概念を1つの鍵にまとめる。"""
    t = unicodedata.normalize("NFKC", term).lower()
    return t.replace("ー", "").replace("・", "")


def strip_code(text: str) -> str:
    """コードブロックとインラインコードを除く。読者が書く対象なので表記統一の対象外。"""
    out, infence = [], False
    for line in text.split("\n"):
        if line.startswith("```"):
            infence = not infence
            continue
        if infence:
            continue
        out.append(re.sub(r"`[^`]*`", "", line))
    return "\n".join(out)


def main(argv: list[str]) -> int:
    root = Path(argv[1]) if len(argv) > 1 else Path("material/30days-curriculum")
    files = sorted(root.glob("day[0-9][0-9]_*.md")) + sorted(root.glob("appendix_*.md"))
    if not files:
        print(f"❌ 教材ファイルが見つかりません: {root}", file=sys.stderr)
        return 2

    # 正規化した鍵 → 実際の表記 → 出現ファイルと回数
    groups: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    where: dict[tuple[str, str], set[str]] = defaultdict(set)

    for path in files:
        prose = strip_code(path.read_text(encoding="utf-8"))
        for term in KATAKANA.findall(prose):
            if len(term) < MIN_LEN:
                continue
            key = normalize(term)
            if key in ALLOW:
                continue
            groups[key][term] += 1
            where[(key, term)].add(path.name)

    findings = []
    for key, variants in groups.items():
        if len(variants) < 2:
            continue
        total = sum(variants.values())
        major = max(variants, key=lambda v: variants[v])
        for term, count in sorted(variants.items(), key=lambda kv: kv[1]):
            if term == major:
                continue
            if count / total < MINORITY_RATIO:
                findings.append((major, variants[major], term, count, sorted(where[(key, term)])))

    if findings:
        print(f"❌ 用語の表記ゆれ {len(findings)} 件")
        for major, mc, minor, nc, files_ in findings:
            head = "、".join(files_[:3]) + ("…" if len(files_) > 3 else "")
            print(f"  「{major}」{mc}回 に対して「{minor}」{nc}回 — {head}")
        print()
        print("  多数派に寄せるか、意図的な使い分けなら ALLOW に追加してください。")
        return 1

    print(f"✅ 用語の表記ゆれなし（{len(files)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
