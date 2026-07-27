#!/usr/bin/env python3
"""同じ概念に2通りの書き方が混ざっていないかを検出する。

30日ぶんを別々に書くと、同じものが「ハンドラー」と「ハンドラ」に割れる。
1日ずつ読む限りどちらも正しく見えるので、通して読んだときだけ違和感が出る。
読者は「別のものか」と考え込むことになる。

検出そのものに辞書は要らない。教材から拾ったカタカナ語を正規化して束ねるだけで、
1つの束に2通り以上の表記が入っていれば揺れとして報告する。
新しい用語が増えても、何も登録せずに検出が効く。
辞書が必要になるのは除外側だけで、意図的に使い分けている表記を
ALLOW へ (鍵, 表記) 単位で登録したときに限り、その表記1つだけを見逃す。

対象はカタカナ語どうしの揺れに限る。表記系をまたぐ揺れ
（「コンポーネント」と "component"）は検出できない。範囲外とする。
"""

import re
import sys
from collections import defaultdict
from pathlib import Path

# 意図的に使い分けている (正規化した鍵, 実際の表記) の組。
# 束ごとではなく組で除外する。束ごと外すと、同じ束に紛れ込んだ誤記まで隠れるため。
ALLOW: set[tuple[str, str]] = set()

KATAKANA = re.compile(r"[ァ-ヶー]{3,}")

# ヴは後ろの小書きかなと組で読み替わる。単独のヴだけをブに直すと
# 「ヴァリデーション」が「ブアリデーション」になり、「バリデーション」と別の束に落ちる。
# 先に組を潰してから、残った単独のヴをブにする。
VU_DIGRAPHS = {
    "ヴァ": "バ",
    "ヴィ": "ビ",
    "ヴゥ": "ブ",
    "ヴェ": "ベ",
    "ヴォ": "ボ",
    "ヴャ": "ビャ",
    "ヴュ": "ビュ",
    "ヴョ": "ビョ",
}

# 小書きかなは大書きへ寄せる。「ウェブ」と「ウエブ」を同じ束に入れるため。
SMALL_TO_LARGE = str.maketrans("ァィゥェォャュョヮッ", "アイウエオヤユヨワツ")

# エ段のかなに続く「イ」は長音の代用。
# 「インターフェイス」を「インターフェース」と同じ束に入れるため。
E_ROW = "エケセテネヘメレゲゼデベペ"

FENCE = re.compile(r"^\s*(```|~~~)")


def normalize(term: str) -> str:
    """表記の割れやすい軸をつぶして、同じ概念を1つの鍵にまとめる。

    畳む軸は4つ。ヴ→バ行、小書きかな→大書きかな、エ段+イ→長音、長音記号の削除。
    NFKC と小文字化は入れていない。対象が [ァ-ヶー] だけなので、
    どちらもこのスクリプトが実際に拾う語を1文字も変えないため。
    """
    text = term
    for digraph, plain in VU_DIGRAPHS.items():
        text = text.replace(digraph, plain)
    folded: list[str] = []
    for char in text.replace("ヴ", "ブ").translate(SMALL_TO_LARGE):
        if char == "イ" and folded and folded[-1] in E_ROW:
            continue
        folded.append(char)
    return "".join(folded).replace("ー", "")


def strip_code(text: str) -> str:
    """コードブロックとインラインコードを除く。読者が書く対象なので表記統一の対象外。

    ``` と ~~~ の両方を扱い、字下げされた開始記号も認める。
    開いた記号を覚えておき、違う記号では閉じない。
    """
    out: list[str] = []
    marker: str | None = None
    for line in text.split("\n"):
        fence = FENCE.match(line)
        if marker is None:
            if fence:
                marker = fence.group(1)
            else:
                out.append(re.sub(r"`[^`]*`", "", line))
            continue
        if fence and fence.group(1) == marker:
            marker = None
    return "\n".join(out)


def main(argv: list[str]) -> int:
    root = Path(argv[1]) if len(argv) > 1 else Path("material/30days-curriculum")
    if not root.is_dir():
        print(f"❌ ディレクトリが見つかりません: {root}", file=sys.stderr)
        return 2

    files = (
        sorted(root.glob("00*.md"))
        + sorted(root.glob("day[0-9][0-9]_*.md"))
        + sorted(root.glob("appendix_*.md"))
    )
    if not files:
        print(f"❌ 教材ファイルが見つかりません: {root}", file=sys.stderr)
        return 2

    # 正規化した鍵 → 実際の表記 → 出現回数
    groups: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    where: dict[tuple[str, str], set[str]] = defaultdict(set)

    for path in files:
        try:
            raw = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            print(f"❌ UTF-8 で読めません: {path}", file=sys.stderr)
            return 2
        for term in KATAKANA.findall(strip_code(raw)):
            key = normalize(term)
            if (key, term) in ALLOW:
                continue
            groups[key][term] += 1
            where[(key, term)].add(path.name)

    findings = []
    for key, variants in groups.items():
        if len(variants) < 2:
            continue
        major = max(variants, key=lambda v: variants[v])
        for term, count in sorted(variants.items(), key=lambda kv: kv[1]):
            if term == major:
                continue
            findings.append((key, major, variants[major], term, count, sorted(where[(key, term)])))

    if findings:
        print(f"❌ 用語の表記ゆれ {len(findings)} 件")
        for key, major, major_count, minor, minor_count, files_ in findings:
            head = "、".join(files_[:3]) + ("…" if len(files_) > 3 else "")
            print(f'  「{major}」{major_count}回 に対して「{minor}」{minor_count}回 — {head}')
            print(f'      意図的な使い分けなら ALLOW に ("{key}", "{minor}") を追加')
        print()
        print("  そうでなければ多数派の表記に寄せてください。")
        return 1

    print(f"✅ 用語の表記ゆれなし（{len(files)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
