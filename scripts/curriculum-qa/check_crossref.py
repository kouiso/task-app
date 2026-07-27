#!/usr/bin/env python3
"""day間の参照が実在するかを照合する。

教材は「Day 13 で作った `TaskCard` を…」のように前の日を指す文を持つ。
指した先にその名前が無いと、読者は探しても見つからず手が止まる。
識別子のリネームや節の入れ替えをしたとき、参照する側だけが古いまま残ると
この壊れ方をする。人の目では、離れた2日を並べて読まない限り気付けない。

このスクリプトは本文中の「Day NN … `token`」という主張を集め、
token が対象 day のファイルに存在するかを確認する。

コードブロックの扱いは参照元と参照先で逆になる。
主張を探すときは除く（写経用のコードは前の日への言及ではないため）。
存在するかを確かめるときは含める（定義そのものがコードブロックの中にあるため）。
"""

import re
import sys
from pathlib import Path

# 「Day 13 で作った `TaskCard`」のように、その日に何かを作った／置いたと述べる文を拾う。
#
# 句点をまたぐと別の文の単語を拾ってしまう。実例:
#   「`page.tsx` は Day 02 で書き換えました。`package.json` などその他のファイルは Day 01 の…」
#   ここで Day 02 と `package.json` を結び付けるのは誤り。両者は別の文に属している。
# 同じ理由で、感嘆符・疑問符・コロン・括弧・表の縦線もまたがせない。
# 読点だけは同じ文の中に留まるので許す。
CLAIM = re.compile(r"[Dd]ay\s*(\d{1,4})\s*(?:の|で|に|は|では|から)[^\n`。！？：（）()|]{0,40}?`([^`]+)`")

# 照合対象から外す語。汎用すぎて存在確認に意味がないもの。
IGNORE = {"npm", "src", "app", "page.tsx", "layout.tsx", "README.md"}

# 識別子としても短いコマンドとしても照合できない書き方。弾かないと誤検出になる。
#   矢印・記号入り: `auth → project → task` の流れ説明、`useForm + zodResolver` の並記
#   タグの省略形  : `<main>...</main>` は本文の言い回しであって識別子ではない
#   コード片      : 宣言文の引用は写経先で書き方が変わるため一致しない
NOT_IDENTIFIER = re.compile(r"[→…+]|\.{3}|^<|=|;")

# 日本語の見出しやUIラベルがバッククォートで囲まれることがある。
# 空白で区切れないので語数では落とせず、識別子として引くと必ず外れる。
CJK = re.compile(r"[　-ヿ㐀-䶿一-鿿＀-￯]")

# 区切り文字を含む語は語境界を置けないので、単純包含で見るしかない。
NEEDS_LOOSE_LOOKUP = re.compile(r"[/. ]")

# 語のあとに助詞と、その語自身の Day 参照が続くことがある。
# このとき語が属するのは後ろの Day であって、読点の手前の Day ではない。実例:
#   「Day 14 のタスクフォームと同じ組み合わせで、`Suspense` は Day 09 の…」
#   「`TaskCard` は Day 13 のタスク一覧、`DeleteConfirmDialog` は Day 11 の削除確認で作りました。」
# 手前の Day に結び付けると、実在するのに「無い」と報告してしまう。
REANCHOR = re.compile(
    r"^\s*(?:は|が|も)[^\n。！？：（）()|]{0,40}?[Dd]ay\s*(\d{1,4})\s*(?:の|で|に|は|では|から)"
)

# 語が否定される文は、そこに在るという主張ではない。実例:
#   「Day 7 で設定したログイン Cookie には `domain` を指定していないため、…」
#   これは day07 に `domain` が無いことを承知で書いている文で、参照切れではない。
NEGATED = re.compile(r"^[^\n。！？]{0,20}?(?:ていない|ていません|ません|ありません)")

FENCE = re.compile(r"^\s*(```|~~~)")


def too_many_words(token: str) -> bool:
    """5語以上は文の引用とみなす。写経先では言い回しが変わるため照合できない。

    `npm run dev` や `npx prisma migrate dev` のようなコマンドは
    実在確認に意味があるので通す。
    """
    return len(token.split()) >= 5


def contains(body: str, token: str) -> bool:
    """token が body に単体で登場するかを見る。

    識別子は前後を語境界で挟む。`TaskCard` を探しているのに
    `TaskCardProvider` しか無い状態を「ある」と数えないため。
    """
    if NEEDS_LOOSE_LOOKUP.search(token):
        return token in body
    pattern = rf"(?<![0-9A-Za-z_$]){re.escape(token)}(?![0-9A-Za-z_$])"
    return re.search(pattern, body) is not None


def day_files(root: Path) -> dict[int, Path]:
    found = {}
    for p in sorted(root.glob("day[0-9][0-9]_*.md")):
        found[int(p.name[3:5])] = p
    return found


def strip_fences(text: str) -> str:
    """``` と ~~~ の両方を閉じ記号として扱い、字下げされた開始記号も認める。

    開いた記号を覚えておくので、~~~ が ``` のブロックを閉じることはない。
    """
    out: list[str] = []
    marker: str | None = None
    for line in text.split("\n"):
        fence = FENCE.match(line)
        if marker is None:
            if fence:
                marker = fence.group(1)
            else:
                out.append(line)
            continue
        if fence and fence.group(1) == marker:
            marker = None
    return "\n".join(out)


def main(argv: list[str]) -> int:
    root = Path(argv[1]) if len(argv) > 1 else Path("material/30days-curriculum")
    if not root.is_dir():
        print(f"❌ ディレクトリが見つかりません: {root}", file=sys.stderr)
        return 2

    targets = day_files(root)
    if not targets:
        print(f"❌ dayファイルが見つかりません: {root}", file=sys.stderr)
        return 2

    # 参照する側は目次・付録も読む。参照される側は day のみ。
    sources = (
        sorted(root.glob("00*.md"))
        + [targets[n] for n in sorted(targets)]
        + sorted(root.glob("appendix_*.md"))
    )

    texts: dict[Path, str] = {}
    for path in sources:
        try:
            texts[path] = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            print(f"❌ UTF-8 で読めません: {path}", file=sys.stderr)
            return 2

    bodies = {num: texts[path] for num, path in targets.items()}
    own_day = {path: num for num, path in targets.items()}
    failures = []

    for path in sources:
        for line in strip_fences(texts[path]).split("\n"):
            for m in CLAIM.finditer(line):
                digits, token = m.group(1), m.group(2).strip()
                if token.endswith("()"):
                    token = token[:-2].strip()
                if len(token) < 3 or token in IGNORE:
                    continue
                if CJK.search(token) or NOT_IDENTIFIER.search(token) or too_many_words(token):
                    continue
                tail = line[m.end() :]
                if NEGATED.match(tail):
                    continue
                reanchored = REANCHOR.match(tail)
                if reanchored:
                    digits = reanchored.group(1)
                if len(digits) >= 3:
                    failures.append(
                        (path.name, token, f"Day {digits} は day 番号として桁数が不正です")
                    )
                    continue
                target = int(digits)
                if own_day.get(path) == target:
                    continue
                if target not in bodies:
                    failures.append((path.name, token, f"Day {target:02d} が存在しません"))
                    continue
                if not contains(bodies[target], token):
                    failures.append(
                        (path.name, token, f"Day {target:02d} に `{token}` がありません")
                    )

    if failures:
        print(f"❌ day間の参照切れ {len(failures)} 件")
        for name, token, reason in failures:
            print(f"  {name}: `{token}` — {reason}")
        return 1

    print(f"✅ day間の参照 OK（{len(sources)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
