#!/usr/bin/env python3
"""販売ZIPに入らないものと「見比べて確認してください」と書いていないかを見る。

30周目に見つかった最も重い1件。8箇所が「このリポジトリの `src/...` と見比べて
確認してください」と書いていた。`scripts/build-zip.sh` は完成アプリの `src/`
`prisma/` `package.json` を入れない。買った人は30日ためた自分のファイルを照合できない。
同じ教材の day20 では著者が正しく書いており、言うことが割れていた。

判定は「照合を指示する語」と「ZIP に入らない置き場」の同居に絞る。`src/` を挙げる
だけの文は対象にしない。`src/app/dashboard` フォルダを作る指示や、
`src/app/error.tsx` を作る手順表は正しい記述で、現物に4件ある。照合先として
挙げているかどうかが分かれ目になる。

ZIP に何が入るかは `sale_package` が `build-zip.sh` から読む。梱包内容を変えたら
この判定も一緒に動く。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from markdown_scan import paragraph_line, paragraph_text, paragraphs
from sale_package import comparable_src_paths, zip_top_level

# 「手元の物と突き合わせろ」と読者に言う語。
COMPARE = re.compile(r"見比べ|見くらべ|照合|突き合わせ|突合|比較して(?:確認|見)|と比べて(?:確認|み)")
# 文中に現れる置き場。バッククォート内でも地の文でも拾いたいので、
# インラインコードは潰さずに走査する。`src/` だけの言及は置き場を指さないので取らない。
#
# 教材はリポジトリ直下からの相対でも同じ置き場を書く（`./src/app/page.tsx`、
# `/src/app/page.tsx`、`task-app/src/app/page.tsx`）。前置きを取らずに直前の文字だけを
# 見ていると、`.` や `/` に続く形が全部この判定の外へ出る。買った人の手元に無い
# 照合先を指しているのは同じなので、前置きを剥がしてから同じ判定へ掛ける。
REPO_PREFIX = r"(?:\.{1,2}/|/|task-app/)?"
LOCATION = re.compile(
    rf"(?<![\w/.-]){REPO_PREFIX}"
    r"((?:src|prisma)/[\w.\[\]-]+(?:/[\w.\[\]-]+)*|package\.json)"
)
# 断りの及ぶ範囲を決めるために拾う語。LOCATION と違い、末尾の階層が無い
# `src/` `prisma/` も取る。断り書きは個別のファイルではなく
# 「完成版の `src/` は入っていません」と大きく書くのが普通なので、
# ここを取らないと断りがどのファイルにも結び付かない。
DISCLAIM_SCOPE = re.compile(
    rf"(?<![\w/.-]){REPO_PREFIX}"
    r"((?:src|prisma)/(?:[\w.\[\]-]+(?:/[\w.\[\]-]+)*)?|package\.json)"
)
# 「ZIP には入っていません」と断ってある文は、読者を存在しない物へ送らない。
# 30周目の修正はこの断りを添える形で入れたので、断りごと赤くしては直した意味が消える。
DISCLAIMED = re.compile(r"ZIP\s*(?:に|には)[^。]{0,40}(?:入って?い?ません|入りません|含まれ(?:て?い?)?ません)")
# 断りの効く範囲を切る区切り。段落まるごとを免除にすると、
# 「`src/a.tsx` は ZIP に入っていません。一方 `src/b.tsx` と見比べてください。」の
# 後半まで一緒に免除され、実害のある指示が黙って通る。
SENTENCE_END = "。"
# 照合を指示する文が、自分で照合先を名指ししているかを見るための語。ZIP に入るか
# どうかは問わない。名指ししていれば、段落の他の文が挙げた置き場は照合先ではない。
# 名指ししていなければ照合先は前の文にある（「…と同じです。手元のコードと見比べて
# ください。」）ので、段落全体から探す。
# 拡張子だけで判定すると `Next.js` のような地の文の語まで照合先になるので、
# インラインコードの中に在る形か、`/` を含む形に絞る。URL は照合先ではないので外す。
INLINE_CODE = re.compile(r"`+([^`]+)`+")
URL = re.compile(r"https?://\S+")
NAMED_FILE = re.compile(r"[\w.\[\]-]+\.[A-Za-z0-9]{1,6}\b")
NAMED_PATH = re.compile(r"[\w.\[\]-]+/[\w./\[\]-]*")
# 照合を打ち消す語。「`src/app/page.tsx` と見比べる必要はありません」は、読者を
# 存在しない照合先へ送らないための正しい案内である。照合の語だけで一致を取ると、
# 30周目の修正で足したこの案内ごと赤くなる。語の直後に続く形だけを見る。
NEGATED = re.compile(
    r"\n?(?:する|し|せ|る|す|て|た)?[はをも]?\n?"
    r"(?:必要(?:は)?(?:あり|ござい)?ませ[んぬ]|必要(?:は)?な(?:い|く)|不要"
    r"|ないで|なくて|ずに|ません)"
)


def not_in_zip(location: str) -> bool:
    """その置き場が販売ZIPに入らないなら True。

    `src/` 配下でも、scaffold が最初から配るファイルは読者の手元に在る。
    `src/server/api/routers/_helpers/select.ts` がその例で、照合先として正しい。

    ただし「手元に在る」だけでは足りない。配る版とこのリポジトリの版が違えば、
    読者は自分が持っていない版を見に行かされる。`prisma/schema.prisma` が
    それで、配る版と完成版は別物である。中身まで一致するものだけを通す。
    """
    if location in zip_top_level() or location in comparable_src_paths():
        return False
    return location.startswith(("src/", "prisma/")) or location == "package.json"


def _demands_compare(joined: str) -> bool:
    """その文が照合を指示しているなら True。打ち消しで続く言い回しは数えない。"""
    return any(not NEGATED.match(joined, m.end()) for m in COMPARE.finditer(joined))


def _names_target(sentence: str) -> bool:
    """その文が照合先を自分で名指ししているなら True。"""
    without_url = URL.sub(" ", sentence)
    if NAMED_PATH.search(without_url):
        return True
    return any(NAMED_FILE.search(m.group(1)) for m in INLINE_CODE.finditer(without_url))


def _sentences(joined: str) -> list[tuple[int, str]]:
    """段落を句点で切る。(段落内の開始位置, 文) を返す。切れ目の句点は前の文に残す。

    開始位置を添えるのは、文の中で見つけた位置を段落全体の位置へ戻して
    行番号を引くためである。
    """
    out: list[tuple[int, str]] = []
    start = 0
    while True:
        i = joined.find(SENTENCE_END, start)
        if i < 0:
            break
        out.append((start, joined[start : i + 1]))
        start = i + 1
    if joined[start:]:
        out.append((start, joined[start:]))
    return out


def disclaimed_locations(joined: str) -> set[str]:
    """断りが効いている置き場を返す。

    断りは、それを書いた文が名指ししている置き場にだけ効かせる。段落まるごとを
    免除にすると、断った置き場の隣に並んだ別の置き場まで一緒に免除される。

    断り書きは個別のファイル名ではなく「完成版の `src/` は入っていません」と
    大きく書くことが多い。末尾が `/` の語はその配下すべてを指す断りとして扱う。
    """
    out: set[str] = set()
    for _, sentence in _sentences(joined):
        if not DISCLAIMED.search(sentence):
            continue
        out.update(m.group(1) for m in DISCLAIM_SCOPE.finditer(sentence))
    return out


def _is_disclaimed(location: str, disclaimed: set[str]) -> bool:
    return any(
        location == d or (d.endswith("/") and location.startswith(d)) for d in disclaimed
    )


def find_refs(paths: list[Path]) -> list[tuple[str, int, str, str]]:
    """(ファイル名, 行番号, 置き場, 該当行) を返す。

    照合の指示は、それを書いた文が名指ししている置き場にだけ結び付ける。段落まるごとを
    照合先の範囲にすると、「`src/app/missing/page.tsx` を作ります。次に `README.md` と
    見比べて確認してください。」の作成の指示まで照合先として挙がる。照合されているのは
    ZIP に入る `README.md` だけなので、これは誤検知である。

    照合を指示する文が照合先を名指ししていないときだけ、段落全体を照合先の範囲にする。
    「…`src/app/x.tsx` と同じです。手元のコードと見比べてください。」は照合先が前の文に
    在るので、文だけを見ると実害のある指示を落とす。

    断りの範囲は段落全体のままにする。断り書きは照合を指示する文とは別の文に
    置かれるのが普通である。
    """
    hits: list[tuple[str, int, str, str]] = []
    for path in paths:
        for para in paragraphs(path.read_text(encoding="utf-8")):
            joined = paragraph_text(para)
            disclaimed = disclaimed_locations(joined)
            seen: set[str] = set()
            for start, sentence in _sentences(joined):
                if not _demands_compare(sentence):
                    continue
                scope, base = (sentence, start) if _names_target(sentence) else (joined, 0)
                for m in LOCATION.finditer(scope):
                    loc = m.group(1)
                    if loc in seen or not not_in_zip(loc) or _is_disclaimed(loc, disclaimed):
                        continue
                    seen.add(loc)
                    lineno, line = paragraph_line(para, base + m.start())
                    hits.append((path.name, lineno, loc, line.strip()))
    return hits


def main(argv: list[str]) -> int:
    args = argv[1:] or ["material/30days-curriculum"]
    targets: list[Path] = []
    for a in args:
        p = Path(a)
        if p.is_dir():
            targets.extend(sorted(p.glob("*.md")))
        elif p.is_file():
            targets.append(p)
        else:
            print(f"❌ 見つかりません: {a}", file=sys.stderr)
            return 2
    if not targets:
        print("❌ 対象ファイルがありません", file=sys.stderr)
        return 2

    findings = find_refs(targets)
    if findings:
        print(f"❌ 販売ZIPに無いものとの照合を指示している {len(findings)} 件")
        for name, lineno, loc, line in findings:
            print(f"  {name}:{lineno} [{loc}] {line[:70]}")
        print("  買った人の手元にその照合先はありません。ZIP に入らない旨を添えてください。")
        return 1

    print(f"✅ 照合先 OK（{len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
