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

# 「`TaskCard` は Day 13 で import 済みです」のように、語が先で Day が後に来る書き方。
# CLAIM は Day が先の並びしか拾わないので、この形は一度も照合されていなかった。
# 文の区切りをまたがせない条件は CLAIM と同じ。
#
# 「Day NN の」を受けないのは、その形の Day が語ではなく後ろの名詞に係るため。実例:
#   「`lg:grid-cols-2` は Day 09 のグリッドと同じ考え方で、…」
#   これは Day 09 に grid があると言っているだけで、この語がそこに在るとは述べていない。
# 「のような」を弾くのは、そこが例示であって参照ではないため。実例:
#   「ここで `bg-white` のような色を直接書くと、Day 01 で用意した配色から外れて…」
TOKEN_CLAIM = re.compile(
    r"`([^`]+)`\s*(?:は|が|も|を|の)(?!よう|みたい)"
    r"[^\n`。！？：（）()|]{0,40}?[Dd]ay\s*(\d{1,4})\s*(?:で|に|は|では|から)"
)

# Day のあとに別の語が続くときは、その語が主張の対象になる。実例:
#   「`bulkComplete` を、Day 16 で書いた `addTime` の直後に足します。」
#   Day 16 に在るのは `addTime` であって `bulkComplete` ではない。
ANCHOR_AFTER = re.compile(r"^[^\n。！？：（）()|]{0,24}`")

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


DAY_MENTION = re.compile(r"[Dd]ay\s*(\d{1,2})")


def has_own_evidence(body: str, token: str, day: int) -> bool:
    """その day に token が「ある」と言えるかを、行単位で判定する。

    単純な包含だと、先送りを述べた文まで証拠に数えてしまう。実例:
      day09「`create` や `update` は、それを実際に使う Day 10 以降で1つずつ足していきます」
    この行を根拠に「Day 09 の `update`」を実在と判定すると、参照切れを見逃す。
    そこで、別の day を指している行は証拠から外し、それ以外の行が1つでも要る。

    ただし、その行が対象の day 自身にも触れているなら先送りではない。実例:
      day10「Day 10 の `foo` は Day 11 でも使います」
    ここで `foo` が在るのは Day 10 なので、Day 11 への言及を理由に落とすと誤検出になる。

    行の見方は参照元と同じ `logical_lines` にそろえる。教材は1文を折り返して書くため、
    生の行で見ると「Day 11 で作った」と「`Foo`」が別々の行になり、
    後ろの行が day 指定なしの証拠として通ってしまう。
    """
    for line in logical_lines(body):
        if not contains(line, token):
            continue
        mentioned = {int(m.group(1)) for m in DAY_MENTION.finditer(line)}
        if not (mentioned - {day}) or day in mentioned:
            return True
    return False


# 行頭がこれで始まる行は、前の行と地続きの文ではない。
# 見出し・箇条書き・表・引用をつなぐと、別々の項目が1文に化けてしまう。
STRUCTURAL = re.compile(r"^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|\||>|\[!)")


def logical_lines(text: str):
    """折り返された地の文を1つにつないで返す。

    教材は1文を複数行に折り返して書く。実例（day19）:
        Day 18 で作った
        `src/server/api/routers/comment.ts` に
    行ごとに見ると Day 18 とファイル名が別々の行にあるため、参照として拾えない。
    句点をまたがせない条件は正規表現側が持っているので、つないでも文はまたがない。

    箇条書きも同じ形で折り返される。実例:
        - Day 01 で作った
          `MissingToken` を使います。
    項目の行だけを単独で流すと、続きの行が別のかたまりになり参照として拾えない。
    そこで、箇条書きの行はそこで打ち切らず、続きの行を同じかたまりへ足していく。
    """
    fence_marker: str | None = None
    buf: list[str] = []

    def flush():
        nonlocal buf
        if buf:
            joined = " ".join(buf)
            buf = []
            return joined
        return None

    for line in text.split("\n"):
        stripped = line.strip()
        fence = FENCE.match(line)
        # コードブロックの中は1行ずつそのまま返す。つないでしまうと、
        # 定義の行と「Day NN で置き換え」というコメント行が1つになり、
        # 定義が別の day のものに見えてしまう（day11 の仮定義で実測）。
        if fence_marker is not None:
            pending = flush()
            if pending is not None:
                yield pending
            yield line
            if fence and fence.group(1) == fence_marker:
                fence_marker = None
            continue
        if fence:
            pending = flush()
            if pending is not None:
                yield pending
            yield line
            fence_marker = fence.group(1)
            continue
        if not stripped:
            pending = flush()
            if pending is not None:
                yield pending
            yield line
            continue
        if STRUCTURAL.match(line):
            pending = flush()
            if pending is not None:
                yield pending
            # 箇条書きは続きの行を持つので、ここで確定させずに次の行を待つ。
            if re.match(r"^\s*([-*+]\s|\d+[.)]\s)", line):
                buf.append(stripped)
            else:
                yield line
            continue
        buf.append(stripped)
    pending = flush()
    if pending is not None:
        yield pending


def day_files(root: Path) -> dict[int, Path]:
    """day 番号をキーにファイルを引けるようにする。

    同じ番号のファイルが2つあると、後から入れた方だけが残り、もう一方は
    参照元としても参照先としても検査対象から消える。消えたファイルの参照切れは
    誰も見ないまま緑になるので、黙って上書きせずその場で止める。
    """
    found: dict[int, Path] = {}
    for p in sorted(root.glob("day[0-9][0-9]_*.md")):
        num = int(p.name[3:5])
        if num in found:
            raise ValueError(f"day {num:02d} のファイルが2つあります: {found[num].name} / {p.name}")
        found[num] = p
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

    try:
        targets = day_files(root)
    except ValueError as e:
        print(f"❌ {e}", file=sys.stderr)
        return 2
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

    seen: set[tuple[str, str, str]] = set()

    for path in sources:
        for line in logical_lines(strip_fences(texts[path])):
            # Day が先の形と語が先の形を同じ土俵に乗せる。
            # 語が先の形では Day が後ろに来るので、後ろの Day へ付け替える REANCHOR は当てない。
            claims = [(m.group(1), m.group(2), m.end(), True) for m in CLAIM.finditer(line)]
            claims += [(m.group(2), m.group(1), m.end(), False) for m in TOKEN_CLAIM.finditer(line)]
            for digits, raw, end, allow_reanchor in claims:
                token = raw.strip()
                if token.endswith("()"):
                    token = token[:-2].strip()
                if len(token) < 3 or token in IGNORE:
                    continue
                if CJK.search(token) or NOT_IDENTIFIER.search(token) or too_many_words(token):
                    continue
                tail = line[end:]
                if NEGATED.match(tail):
                    continue
                if allow_reanchor:
                    reanchored = REANCHOR.match(tail)
                    if reanchored:
                        digits = reanchored.group(1)
                elif ANCHOR_AFTER.match(tail):
                    continue
                if (path.name, token, digits) in seen:
                    continue
                seen.add((path.name, token, digits))
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
                if not has_own_evidence(bodies[target], token, target):
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
