#!/usr/bin/env python3
"""構造が閉じていない日で「これでエラーが出なくなります」と書いていないかを見る。

28周目の記録から。day18 と day29 は、読者が開いた箱を閉じきっていない時点で
「エラーが出なくなります」と書いていた。書いた本人が閉じ数を数えていなかった。
読者はエラーが消えるまで自分を疑い続けることになる。

文言そのものは欠陥ではない。本当に閉じた後なら正しい案内である。欠陥になるのは
「閉じていない」と「閉じた」が同じ日に同居したときだけなので、判定は
`check_tag_balance.py` の結果と組にする。片方だけでは、正しい案内まで赤くなる。

逆向きの文（「この時点では構文エラーが残ります」）は対象にしない。あれは正確な断りで、
28周目の時点で corpus に20箇所あった。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Iterator

from check_tag_balance import collect, find_unclosed
from curriculum_blocks import day_number, iter_blocks
from markdown_scan import mask_inline_code, paragraph_line, paragraph_text, paragraphs

# 28周目に corpus 全体から抽出した言い回しを、語幹でまとめ直したもの。
CLAIM = re.compile(
    r"エラーが(?:出なくなり|消え|なくなり|無くなり)"
    r"|エラーは(?:出ません|表示されません|消えます)"
    r"|エラーが出ていないこと"
    r"|(?:これで|ここで)(?:すべて|全て)(?:の)?(?:タグ|括弧|かっこ)?を?閉じ"
    r"|構文エラーは(?:解消|なくなり|消え)"
)

# 語幹の直後に来る打ち消し。「まだエラーが消えません」「ここですべてのタグを
# 閉じていません」は完了宣言ではなく、むしろ著者に足してほしい正確な断りである。
# 語幹だけで一致を取ると、この断りごと赤くなる。docstring が言う
# 「逆向きの文は対象にしない」を、語幹一致の後ろまで効かせる。
# `エラーが出なくなります` の `なく` は語幹側に含まれているので、ここには来ない。
# `^` は付けない。`Pattern.match(s, pos)` は pos に固定して照合するが、
# `^` は pos ではなく文字列の先頭を見るため、付けると必ず外れる。
NEGATED = re.compile(r"(?:て|で)?(?:い|お)?(?:ませ|ない|なく|なかっ|ず|ぬ|られ(?:ませ|ない))")


def _claims_in(text: str) -> Iterator[re.Match[str]]:
    """完了を宣言している一致を返す。打ち消しで終わる言い回しは数えない。"""
    return (m for m in CLAIM.finditer(text) if not NEGATED.match(text, m.end()))


def find_claims(paths: list[Path]) -> list[tuple[str, int, str, str]]:
    """(ファイル名, 行番号, 開いたままのタグ, 該当行) を返す。"""
    unclosed = find_unclosed(paths)
    if not unclosed:
        return []
    # 構造が閉じていない書き込み先を、その日ごとに引けるようにする。
    broken: dict[int, list[str]] = {}
    for target, name, days in unclosed:
        for d in days:
            broken.setdefault(d, []).append(f"{target} の <{name}>")

    hits: list[tuple[str, int, str, str]] = []
    for path in paths:
        day = day_number(path.name)
        if day not in broken:
            continue
        text = path.read_text(encoding="utf-8")
        # その日が実際に触っている書き込み先だけを理由として挙げる。
        touched = {b.target for b in iter_blocks(text, path.name)}
        reasons = [r for r in broken[day] if r.split(" の <")[0] in touched]
        if not reasons:
            continue
        # 段落へまとめてから照合する。`保存すればエラーが` の次の行に
        # `出なくなります。` が来る折り返しでは、行単位の一致はどちらの行でも
        # 語幹が途切れているため、宣言がそのまま通る。
        for para in paragraphs(text):
            joined = paragraph_text(para, sep="")
            # 文言そのものを話題にしている行がある。
            # 「`エラーが出なくなります` とは書かないでください。」は執筆側への注意で、
            # 読者への完了宣言ではない。インラインコードは潰してから照合する。
            # 潰す側は文字数を変えない。行番号は一致位置から引くので、
            # 位置がずれる潰し方をすると、別の行を指した報告になる。
            for m in _claims_in(mask_inline_code(joined)):
                lineno, line = paragraph_line(para, m.start(), sep="")
                hits.append((path.name, lineno, "／".join(reasons), line.strip()))
    return hits


def main(argv: list[str]) -> int:
    targets = collect(argv)
    if isinstance(targets, int):
        return targets

    findings = find_claims(targets)
    if findings:
        print(f"❌ 閉じていない構造を残したまま完了を宣言している {len(findings)} 件")
        for name, lineno, reason, line in findings:
            print(f"  {name}:{lineno} {line[:60]}")
            print(f"    開いたまま: {reason}")
        return 1

    print(f"✅ 偽の完了宣言なし（{len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
