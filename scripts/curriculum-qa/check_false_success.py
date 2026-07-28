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

from check_tag_balance import collect, find_unclosed
from curriculum_blocks import day_number, iter_blocks
from markdown_scan import iter_prose

# 28周目に corpus 全体から抽出した言い回しを、語幹でまとめ直したもの。
CLAIM = re.compile(
    r"エラーが(?:出なくなり|消え|なくなり|無くなり)"
    r"|エラーは(?:出ません|表示されません|消えます)"
    r"|エラーが出ていないこと"
    r"|(?:これで|ここで)(?:すべて|全て)(?:の)?(?:タグ|括弧|かっこ)?を?閉じ"
    r"|構文エラーは(?:解消|なくなり|消え)"
)


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
        for lineno, line in iter_prose(text):
            if CLAIM.search(line):
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
