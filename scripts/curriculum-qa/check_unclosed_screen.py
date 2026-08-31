#!/usr/bin/env python3
"""まだ閉じ切っていないファイルの画面を、読者に見せようとしていないかを見る。

教材は1つの Step を4〜7個のコードブロックへ割って貼らせる。割ること自体は正しい。
問題は、割った途中に画面の絵を挟んだときに起きる。読者の手元のファイルは波かっこも
JSX タグも開いたままで、その状態の Next.js は画面を描かずに構文エラーを出す。
絵のとおりにならないので読者はそこで止まる。止まった読者は自分の写経を疑って
前へ戻り、何も間違えていない行を何度も読み直す。

走査するのは `day[0-9][0-9]_*.md` の30本で、目次と付録は対象外である（`collect` の
規定）。実測（2026-08-31 時点）で、この形の場所は day07・day10・day14・day25・day29 の
5日、行にして12行あった。いちばん分かりやすいのが day10 で、
`src/component/project/project-dialog.tsx` の絵を Step 5 の末尾に置いている。
その時点で `</Dialog>` は書かれておらず（Step 6）、画面へ組み込むのも先（Step 7）である。
12行とも教材の側が「この時点ではまだ画面に出せません」と断りを入れており、断りを
消すとこの検査が鳴る。つまりここで守っているのは、断りが外れたときに気づけることである。

## 判定の作り

画像参照と「スクリーンショット:」の行を「画面を見せる地点」とし、その行より前の
コードブロックだけを `concat_by_file` の分け方で書き込み先ごとに連結して、
波かっこ・丸かっこ・角かっこと JSX タグの収支を見る。開きっぱなしの書き込み先が
1つでもあれば、その時点のアプリは組み上がらない。

## 途中で閉じていないのは正常である

割って貼らせる以上、ブロックの切れ目で閉じていないのは当たり前で、それ自体は
欠陥ではない。報告するのは「画面を見せる地点で閉じ切っていない」場合だけである。

## 収支を素直に数えられない書き込み先は、はじめから見ない

教材のブロックには「追記」だけでなく「既存行の書き換え」も混ざる。書き換えの再掲は
片側のかっこだけを増やしたり減らしたりするので、連結した収支は完成状態でも 0 にならない
（`check_tag_balance.py` の docstring が同じ理由で括弧の収支を採用しなかった経緯を書いている）。
そこでこの検査は、30日ぶんのブロックを全部繋いだ状態で収支が合う書き込み先だけを見る。
合わない書き込み先は、教材が最後まで書ききっても釣り合わない＝断片の寄せ集めなので、
途中の状態を判定する足場が無い。現物では書き込み先47個のうち3個が該当し、
全部この理由で対象外になる（`src/app/task/page.tsx`／
`src/component/task/task-detail-dialog.tsx`／`src/server/api/routers/user.ts` の
注記つきの片割れ）。残る44個を判定する。

## この検査で捕まえられないもの

- 対象外にした3つの書き込み先。そこで同じ欠陥が起きても鳴らない。足場が無いので
  「鳴らない」を選んでいる。弱い判定で鳴らすより、鳴らないことを書いておくほうがましである。
- 断りの中身が正しいかは見ない。「まだ画面に出せません」と書いてあれば、それが
  その画面について正確かどうかに関わらず通す。断り文の正確さは人が読むしかない。
- 構文が通ることと画面が出ることは別である。閉じ切っていても、そのファイルがまだ
  どこからも呼ばれていなければ画面には出ない。ここでは「組み上がらない」ほうだけを見る。
- 断りは、その絵が属する Step 節の中からしか探さない。日ぶん全体を範囲にすると、
  30日のうち20日が何らかの断りを持つため、1行の断りがその日の絵を全部通してしまい、
  検査は事実上どこも見なくなる。例外は「Step 1 から Step 4 のあいだ、アプリは
  動かない」の形だけで、これは節をまたぐ断りなので Step 番号の範囲で当てる
  （day07 がこの形。断りは Step 1 の頭、絵は 743 行離れた Step 3 に在る）。
  逆に言うと、節の外に別の言い方で書かれた断りは拾えず、誤って報告する。

## scaffold が配るファイルも対象にしている（`check_tag_balance.py` との違い）

`check_tag_balance.py` は `scaffold_src_paths()` のファイルを対象から外す。読者の手元に
写経していない行が既に在るからである。この検査は外していない。day10 が
「`project-dialog.tsx` は配布済みですが、今日は Step 1 から Step 6 で中身を自分の手で
書き直します」、day07 が「すでに動いている6つのファイルの中身を書き直します」、
day14 が「開いて中身をすべて書き換えます」と書いており、書き直しの最中は配布物の
中身が残っていないためである。実測で鳴った5つのうち3つがこの種のファイルなので、
外すとこの検査は day10 の形を原理的に見られなくなる。

ただしこれは教材の記述を信じた判断である。`build_day_snapshots.py` は逆に
「scaffold が配るファイルは上書きしない」という前提でツリーを組んでおり、2つの前提は
食い違っている。どちらが正しいかはこの検査では決められない。食い違いが解消されて
「配布物はそのまま残る」が正になった場合、ここは対象から外す必要がある。
"""

from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

from check_tag_balance import allows_jsx, collect, scan_tags
from curriculum_blocks import Block, concat_by_file, day_number, mask_code
from markdown_scan import iter_prose

# 画面を見せる地点。画像そのものと、その手前に置く「スクリーンショット:」の案内。
# 案内だけで画像が別行に来る書き方（`> スクリーンショット: ...` の引用も含む）が
# あるので両方を拾う。同じ絵について2行が鳴っても、指す欠陥は1つである。
IMAGE_REF = re.compile(r"!\[[^\]]*\]\([^)]*screenshots/[^)]*\)")
SHOT_LINE = re.compile(r"^\s*>?\s*(?:\*\*)?[【\[]?スクリーンショット[】\]]?\s*[:：]")

# 「この絵はいまの自分の画面ではない」と教材が断っている形。断り方は日によって違うので、
# 意味の同じものを並べる。ここに無い書き方で断ると誤って報告するので、増えたら足す。
#
# どれも「画面」「画像」に触れていることを条件に入れてある。条件を外すと
# 「これで Day 02 の完成形です」（コードの完成形の話）や「トーストは出ません」（描画の
# 話ではない）まで断りとして数えられ、その節の絵が全部素通りする。
DISCLAIMERS = (
    # 「この時点ではまだ画面に出せません」「押すボタンはまだ画面に出ません」
    re.compile(r"まだ[^。]{0,30}?(?:画面|ブラウザ|ページ)[^。]{0,20}?(?:出せません|出ません|表示されません|見えません)"),
    # 「（この時点ではまだ描画されません）」
    re.compile(r"まだ[^。]{0,20}?描画されません"),
    # 「画面へ出すのは Step 8 です」「一覧へ組み込むのは Step 7」
    re.compile(r"(?:出す|組み込む|描画する|表示する)のは\s*(?:Step|ステップ)"),
    # 「画面での確認は、`</form>` を書き終える Step 14 の動作確認で行う」
    re.compile(r"画面での確認は[^。]{0,60}?(?:Step|ステップ)"),
)
# 「下の画像は Step 9 まで書き終えた完成後の画面です」。絵そのものを指して
# 「これは完成状態であって、いまのあなたの画面ではない」と言う形。画像を指す語を
# 同じ行に持つことを条件にする。
FINISHED_IMAGE = re.compile(r"完成(?:後|形)")
IMAGE_WORD = re.compile(r"下の画像|スクリーンショット")

# 「Step 1 から Step 4 のあいだ、アプリは動かない状態になります」。
# 節をまたいで効く断りなので、日ぶん全体から拾って Step 番号の範囲で当てる。
DEAD_RANGE = re.compile(
    r"Step\s*(\d+)\s*から\s*Step\s*(\d+)\s*のあいだ[^。]{0,40}?アプリは動かない"
)

# `### Step 3: ...` と `## Step 1: ...`。check_step_ref.py と同じ形を受ける。
STEP_HEADING = re.compile(r"^#{2,3}\s+Step\s*(\d+)[\d.]*\s*[:：]")

BRACKETS = {"{": "}", "(": ")", "[": "]"}


class Pending(Counter):
    """閉じ切っていない開き記号の数え上げ。空なら釣り合っている。"""


def pending(blocks: list[Block]) -> Pending:
    """ブロック列を連結した時点で、開いたまま残っている記号とタグを返す。

    mask_code はブロックごとに掛ける。連結してから1回で掛けると、ある日の断片に
    閉じていない `/*` が1つあるだけで、そこから後ろのコードがまるごと空白になる
    （`check_tag_balance.find_unclosed` が同じ理由でブロック単位に掛けている）。
    """
    if not blocks:
        return Pending()
    code = "\n".join(mask_code("\n".join(b.lines)) for b in blocks)
    counts = Counter(ch for ch in code if ch in "{}()[]")
    out = Pending()
    for open_ch, close_ch in BRACKETS.items():
        extra = counts[open_ch] - counts[close_ch]
        if extra > 0:
            out[open_ch] = extra
    opened, closed = scan_tags(
        code, jsx=allows_jsx(blocks[0].target, {b.lang for b in blocks})
    )
    for name, n in opened.items():
        if n > closed[name]:
            out[f"<{name}>"] = n - closed[name]
    return out


def judgeable_targets(by_target: dict[str, list[Block]]) -> dict[str, list[Block]]:
    """30日ぶんを全部繋いで収支が合う書き込み先だけを残す。

    合わないものは、教材が最後まで書いても釣り合わない断片の寄せ集めである。
    途中の状態を比べる足場が無いので、途中も判定しない。
    """
    return {t: bs for t, bs in by_target.items() if not pending(bs)}


def screen_points(text: str) -> list[tuple[int, str]]:
    """画面を見せている地の文の (行番号, 行) を返す。コードブロックの中は見ない。"""
    return [
        (lineno, line)
        for lineno, line in iter_prose(text)
        if IMAGE_REF.search(line) or SHOT_LINE.match(line)
    ]


def step_of(prose: list[tuple[int, str]], lineno: int) -> int:
    """その行が属する Step 番号を返す。最初の Step より前は -1。"""
    current = -1
    for n, line in prose:
        if n > lineno:
            break
        m = STEP_HEADING.match(line)
        if m:
            current = int(m.group(1))
    return current


def _section_span(prose: list[tuple[int, str]], lineno: int) -> tuple[int, int]:
    """その行が属する Step 節の (開始行, 終了行)。終了行は次の Step 見出しの手前。"""
    start, end = 0, 10**9
    for n, line in prose:
        if not STEP_HEADING.match(line):
            continue
        if n <= lineno:
            start = n
        else:
            end = n
            break
    return start, end


def disclaimed(prose: list[tuple[int, str]], lineno: int) -> bool:
    """その絵について「いまは画面に出ない」旨の断りがあるなら True。

    探す範囲は、その絵が属する Step 節。ただし「Step 1 から Step 4 のあいだ、
    アプリは動かない」のように節をまたいで効く断りだけは、日ぶん全体から拾って
    Step 番号の範囲で当てる。day07 は Step 1 の頭で断り、絵は Step 3 に在る。
    """
    here = step_of(prose, lineno)
    for _n, line in prose:
        m = DEAD_RANGE.search(line)
        if m and int(m.group(1)) <= here <= int(m.group(2)):
            return True

    start, end = _section_span(prose, lineno)
    for n, line in prose:
        if not start <= n < end:
            continue
        if any(pattern.search(line) for pattern in DISCLAIMERS):
            return True
        if FINISHED_IMAGE.search(line) and IMAGE_WORD.search(line):
            return True
    return False


def find_unclosed_screens(paths: list[Path]) -> list[tuple[str, int, str, Pending]]:
    """(ファイル名, 行番号, 書き込み先, 開いたまま残っているもの) を返す。"""
    ordered = sorted(paths, key=lambda p: (day_number(p.name), p.name))
    by_target = judgeable_targets(concat_by_file(ordered))

    hits: list[tuple[str, int, str, Pending]] = []
    for path in ordered:
        text = path.read_text(encoding="utf-8")
        day = day_number(path.name)
        prose = list(iter_prose(text))
        for lineno, _line in screen_points(text):
            if disclaimed(prose, lineno):
                continue
            for target, blocks in sorted(by_target.items()):
                prefix = [b for b in blocks if (b.day, b.lineno) < (day, lineno)]
                left = pending(prefix)
                if left:
                    hits.append((path.name, lineno, target, left))
    return hits


def main(argv: list[str]) -> int:
    targets = collect(argv)
    if isinstance(targets, int):
        return targets

    findings = find_unclosed_screens(targets)
    if findings:
        print(f"❌ 閉じ切っていないファイルの画面を見せている {len(findings)} 件")
        for name, lineno, target, left in findings:
            rest = "・".join(f"{k}×{v}" for k, v in sorted(left.items()))
            print(f"  {name}:{lineno} {target} が開いたまま（{rest}）")
        print("  読者の画面は構文エラーになります。閉じてから見せるか、まだ出ない旨を書いてください。")
        return 1

    print(f"✅ 画面を見せる地点の構文 OK（{len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
