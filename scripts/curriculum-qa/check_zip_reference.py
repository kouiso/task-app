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
    """その段落が照合を指示しているなら True。打ち消しで続く言い回しは数えない。"""
    return any(not NEGATED.match(joined, m.end()) for m in COMPARE.finditer(joined))


def _sentences(joined: str) -> list[str]:
    """段落を句点で切る。切れ目の句点は前の文に残す。"""
    out: list[str] = []
    start = 0
    while True:
        i = joined.find(SENTENCE_END, start)
        if i < 0:
            break
        out.append(joined[start : i + 1])
        start = i + 1
    if joined[start:]:
        out.append(joined[start:])
    return out


def disclaimed_locations(joined: str) -> set[str]:
    """断りが効いている置き場を返す。

    断りは、それを書いた文が名指ししている置き場にだけ効かせる。段落まるごとを
    免除にすると、断った置き場の隣に並んだ別の置き場まで一緒に免除される。

    断り書きは個別のファイル名ではなく「完成版の `src/` は入っていません」と
    大きく書くことが多い。末尾が `/` の語はその配下すべてを指す断りとして扱う。
    """
    out: set[str] = set()
    for sentence in _sentences(joined):
        if not DISCLAIMED.search(sentence):
            continue
        out.update(m.group(1) for m in DISCLAIM_SCOPE.finditer(sentence))
    return out


def _is_disclaimed(location: str, disclaimed: set[str]) -> bool:
    return any(
        location == d or (d.endswith("/") and location.startswith(d)) for d in disclaimed
    )


def find_refs(paths: list[Path]) -> list[tuple[str, int, str, str]]:
    """(ファイル名, 行番号, 置き場, 該当行) を返す。"""
    hits: list[tuple[str, int, str, str]] = []
    for path in paths:
        for para in paragraphs(path.read_text(encoding="utf-8")):
            joined = paragraph_text(para)
            if not _demands_compare(joined):
                continue
            disclaimed = disclaimed_locations(joined)
            seen: set[str] = set()
            for m in LOCATION.finditer(joined):
                loc = m.group(1)
                if loc in seen or not not_in_zip(loc) or _is_disclaimed(loc, disclaimed):
                    continue
                seen.add(loc)
                lineno, line = paragraph_line(para, m.start())
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
