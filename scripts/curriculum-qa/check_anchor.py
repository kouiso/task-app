#!/usr/bin/env python3
"""コードブロックの書き込み先が、そのブロックだけを見て分かるかを見る。

読者は1日分を頭から順に読むとは限らない。目次のリンクから飛んでくるし、詰まった日だけを
後から開き直す。そのとき `// filepath: 続き` とだけ書いてあると、何の続きなのか分からない。
上へ遡って最初に見つかるファイル名が正解とも限らず、実測では156行上の読み比べ用コードを
指しているように読める箇所があった。

判定は「`// filepath:` の値が指示語だけで終わっていないか」に絞る。実ファイル名が入って
いれば、続きであることを添えていても通す。散文側の「上のコード」「さきほど」は語の形が
一定せず機械では判定できないので、この検査の対象にしない。
"""

import re
import sys
from pathlib import Path

from markdown_scan import fence_states

FILEPATH = re.compile(r"^\s*(?:\{/\*\s*filepath:\s*(.+?)\s*\*/\}|(?://|#)\s*filepath:\s*(.+?))\s*$")


def filepath_value(match):
    # 2つの書き方を1つの正規表現で受けるため捕獲群が2本になる。どちらが埋まるかは
    # 書き方で決まるので、呼び出し側に群番号を意識させず値だけを返す。
    return match.group(1) if match.group(1) is not None else match.group(2)
# 「続き」「同上」だけで、どのファイルなのかを名乗っていない値。
# 「読み比べ用サンプル」は実ファイルを持たないと明言しているので通す。
VAGUE = re.compile(r"^(続き|同上|前の続き|上記の続き|同じファイル)[（(]?[^）)]*[）)]?$")
# 同じ注記が2回以上ぶら下がった値。実測で、上の行を書き換えながら下の行を作る処理が
# 書き換え済みの値を拾い直し、`（同じファイルの続き）` が最大6回積み上がっていた。
# 指示語ではないので VAGUE では捕まらず、読者が写経する欄にそのまま残る。
REPEATED = re.compile(r"([（(][^）)]+[）)])\1")


def find(text: str) -> list[tuple[int, str]]:
    """(行番号, 値) を返す。行番号は1始まり。"""
    hits: list[tuple[int, str]] = []
    for i, line, state, _ in fence_states(text):
        if state != "inside":
            continue
        fp = FILEPATH.match(line)
        if fp and (VAGUE.match(filepath_value(fp)) or REPEATED.search(filepath_value(fp))):
            hits.append((i, filepath_value(fp)))
    return hits


def find_sample_with_real_path(text: str) -> list[tuple[int, str]]:
    """読み比べ用の節にあるのに、実ファイル名を名乗っているブロックを返す。

    「Before（改善前のコード）」「After（プロが書くコード）」の中のコードは、写経の対象では
    ない。実測では、続きのブロックだけが読み比べ用と書かれていて、先頭だけ実ファイル名を
    名乗っていた。読者は30日ずっと `// filepath:` に従って写しているので、そこに本物の
    パスがあれば、改善前のコードを本物のファイルへ貼る。しかもどれも閉じていない断片になる。

    見出しの判定はフェンスの外だけで行う。Bash のブロックは `# filepath: scripts/foo.sh`
    という行そのものが `#` 始まりなので、フェンスの中でも見出しとして数えると
    その行が in_sample を落とし、直後に自分自身を検査する前に対象から外れていた。
    """
    hits: list[tuple[int, str]] = []
    in_sample = False
    for i, line, state, _ in fence_states(text):
        if state == "outside":
            if line.startswith("#"):
                in_sample = ("Before" in line) or ("After" in line)
            continue
        if state != "inside" or not in_sample:
            continue
        fp = FILEPATH.match(line)
        if not fp:
            continue
        value = filepath_value(fp)
        if value.startswith(("src/", "prisma/", "scripts/")):
            hits.append((i, value))
    return hits


def find_missing(text: str, root: Path) -> list[tuple[int, str]]:
    """完成版に存在しないファイルを書き込み先として挙げている行を返す。

    実測で day30 の読み比べ用コードが `src/app/graduation/page.tsx` を名乗っていた。
    完成版にその画面は無い。見出しに「例です」と書いても、コードを写す瞬間には
    視界に入らないので、読者はそのパスのファイルを作りにいく。
    """
    hits: list[tuple[int, str]] = []
    for i, line, state, _ in fence_states(text):
        if state != "inside":
            continue
        fp = FILEPATH.match(line)
        if not fp:
            continue
        value = filepath_value(fp).split("（")[0].split("(")[0].strip()
        if not value.startswith(("src/", "prisma/", "scripts/")):
            continue
        if not (root / value).exists():
            hits.append((i, value))
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

    # リポジトリの根。この検査は scripts/curriculum-qa/ に置いてある。
    root = Path(__file__).resolve().parents[2]

    findings: list[tuple[str, int, str]] = []
    missing: list[tuple[str, int, str]] = []
    samples: list[tuple[str, int, str]] = []
    for path in targets:
        text = path.read_text(encoding="utf-8")
        for line, value in find(text):
            findings.append((path.name, line, value))
        for line, value in find_missing(text, root):
            missing.append((path.name, line, value))
        for line, value in find_sample_with_real_path(text):
            samples.append((path.name, line, value))

    status = 0
    if findings:
        print(f"❌ 書き込み先が分からないコードブロック {len(findings)} 件")
        for name, line, value in findings:
            print(f"  {name}:{line} filepath: {value}")
        print("  実ファイル名を書くか、実ファイルを持たない旨を書いてください。")
        status = 1
    if missing:
        print(f"❌ 完成版に存在しないファイルを書き込み先にしている {len(missing)} 件")
        for name, line, value in missing:
            print(f"  {name}:{line} filepath: {value}")
        print("  読み比べ用なら、その旨をコード欄の中に書いてください。")
        status = 1
    if samples:
        print(f"❌ 読み比べ用の節が実ファイル名を名乗っている {len(samples)} 件")
        for name, line, value in samples:
            print(f"  {name}:{line} filepath: {value}")
        print("  読み比べ用サンプルである旨を書いてください。")
        status = 1
    if status:
        return status

    print(f"✅ コードブロックの書き込み先 OK（{len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
