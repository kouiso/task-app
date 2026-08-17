#!/usr/bin/env python3
"""生成した教材PDFが商品として出せる状態かを、出力そのものから確かめる。

PDFは商品そのものだが、これまで出力を検査する仕組みが無かった。品質ゲート24本は
Markdown のテキストだけを見ており、組版した結果は誰も見ていない。実際、旧経路には
「長いコード行の末尾が消える」「表の手前に空白ページが出る」「mermaid が図にならず
原文が本文に出る」という欠陥が同時に存在したまま、ビルドは成功し続けていた。

組版の失敗はビルドエラーにならない。だから出力側で見る。

判定は poppler（pdftotext / pdfinfo / pdffonts）だけで行う。追加の依存を増やすと、
検査を動かすほうが面倒になって回されなくなる。

`material-gate.yml` の Gate 4 には**入れない**。この検査は先に PDF を組む必要があり、
Chromium と10分前後のビルド時間を要求する。教材の文章を1行直すたびにそれを回すのは
割に合わない。CI に載せるかどうかは別途判断する（だからこのファイルは
scripts/curriculum-qa/ ではなく scripts/pdf-book/ に置いている）。
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

sys.path.insert(0, str(REPO_ROOT / "scripts" / "curriculum-qa"))
from markdown_scan import code_blocks, iter_prose  # noqa: E402

SRC_DIR = REPO_ROOT / "material" / "30days-curriculum"
DEFAULT_PDF_DIR = REPO_ROOT / "dist" / "pdf"

A4_SIZE = "595.276 x 841.89 pts"
# 検査に使う poppler のコマンド。1本でも欠けると全冊が読めないので先に確かめる
REQUIRED_TOOLS = ("pdftotext", "pdfinfo", "pdffonts")
TOOL_TIMEOUT = 120
# 商品として埋め込んでよい書体。ここを許可リストにしているのは、WenQuanYi だけを
# 弾いても足りないため。生成した機械にたまたま入っていた DejaVu や Liberation が
# 混ざれば、別の機械で組んだPDFと見た目が変わる。
ALLOWED_FONTS = frozenset({
    "BIZUDPGothic-Regular",
    "BIZUDPGothic-Bold",
    "JetBrainsMono-Regular",
    "JetBrainsMono-Bold",
    "NotoEmoji-Regular",
    "DejaVuSans",
    # Chromium が埋め込みフォントから作り直した面に付ける名前。名前が消えるだけで
    # 中身は上のどれか。fontconfig を空にしてシステムフォントを1つも見せずに組んでも、
    # 文字は正しく出たままこの名前が残ることを実測で確認した（＝環境依存の代替ではない）。
    "OTS-derived-font",
})
SUBSET_PREFIX = re.compile(r"^[A-Z]{6}\+")

# 「グラフ」「フロー」という語は本文に普通に出る。語彙ではなく mermaid の構文で拾う。
# graph / flowchart は方向の指定が必須なので、地の文と衝突しない。
MERMAID_LEAK = re.compile(
    r"^\s*(?:graph|flowchart)\s+(?:TD|TB|BT|RL|LR)\b"
    r"|^\s*(?:sequenceDiagram|classDiagram|erDiagram|stateDiagram(?:-v2)?"
    r"|gantt|journey|gitGraph)\b"
    r"|^\s*```\s*mermaid\b",
    re.M,
)

# 写経できないコードを商品に載せないための閾値。85文字超の行は329行/25ファイルある。
LONG_CODE = 85
# 図にしたコードは本文に出ない。比較の対象から外す。
NON_TEXT_LANGS = frozenset({"mermaid"})


def strip_subset(name: str) -> str:
    """pdffonts が付けるサブセット接頭辞（ABCDEF+）を落とす。"""
    return SUBSET_PREFIX.sub("", name)


def find_font_problems(rows: list[tuple[str, str, str]]) -> list[str]:
    """(書体名, 種別, 埋め込み) の一覧から、商品として出せない書体を挙げる。

    Type 3 を弾くのは、字形をPDF内の描画命令へ分解して埋める形式で、
    容量が跳ね上がり、閲覧環境によっては文字が選択・検索できなくなるため。
    """
    problems: list[str] = []
    for name, kind, embedded in rows:
        base = strip_subset(name)
        if base not in ALLOWED_FONTS:
            problems.append(f"許可していない書体が混ざっている: {base}")
        if kind == "Type 3":
            problems.append(f"Type 3 で埋め込まれている: {base}")
        if embedded != "yes":
            problems.append(f"埋め込まれていない: {base}")
    return sorted(set(problems))


def flatten(text: str) -> str:
    """空白を全部落とす。

    poppler は数字と日本語の間に半角空白を入れる（「30日」→「30 日」）。
    原文とそのまま突き合わせると、正しく出ているものまで欠落に見える。
    """
    return re.sub(r"\s", "", text)


def page_residue(text: str, header: str, page_number: int) -> str:
    """柱とノンブルを取り除いた、そのページの中身。

    「文字が無いページ」で空白を判定すると1件も見つからない。表紙以外の全ページに
    柱とノンブルが入るため、白紙でも文字は取れる。差し引いてから見る。
    """
    lines = [line for line in text.split("\n") if line.strip() != str(page_number)]
    return flatten("\n".join(lines)).replace(flatten(header), "")


def find_blank_pages(pages: list[str], header: str) -> list[int]:
    """中身が無いページの番号を返す。表紙（1ページ目）は対象外。"""
    return [
        number
        for number, text in enumerate(pages, start=1)
        if number > 1 and not page_residue(text, header, number)
    ]


def find_mermaid_leaks(pages: list[str]) -> list[int]:
    """mermaid の原文が本文に出ているページの番号を返す。"""
    return [
        number
        for number, text in enumerate(pages, start=1)
        if MERMAID_LEAK.search(text)
    ]


def has_folio(text: str, page_number: int) -> bool:
    """そのページにノンブル（ページ番号だけの行）があるか。"""
    return any(line.strip() == str(page_number) for line in text.split("\n"))


def find_furniture_problems(pages: list[str], header: str) -> list[str]:
    """柱とノンブルの欠けを挙げる。表紙には両方出ないのが正しい。

    表紙で柱の有無を文字列で見ると、表紙に印刷された書名そのものと区別できない
    （付録は書名がそのまま表紙の題字になる）。テーマは表紙のマージンボックスを
    まとめて隠すので、ノンブルの有無で代表させる。
    """
    problems: list[str] = []
    flat_header = flatten(header)
    for number, text in enumerate(pages, start=1):
        if number == 1:
            if has_folio(text, number):
                problems.append("表紙にノンブルが出ている")
            continue
        if flat_header not in flatten(text):
            problems.append(f"p{number}: 柱が無い")
        if not has_folio(text, number):
            problems.append(f"p{number}: ノンブルが無い")
    return problems


TOC_ENTRY = re.compile(r"\.{3,}\s*(\d+)\s*$", re.M)
H2 = re.compile(r"^##\s+(?!#)(.+)$")


def toc_entries(pages: list[str]) -> tuple[list[int], int]:
    """目次に並ぶページ番号と、目次が終わるページ番号を返す。

    ページを跨いで連結してから数えると、前ページの末尾と次ページの先頭が1行に
    繋がって実在しない項目を1件拾う。ページ単位で数える。
    目次は表紙の次から始まり、リーダー行が無いページに当たったところで終わる。
    """
    numbers: list[int] = []
    last = 1
    for number, text in enumerate(pages[1:], start=2):
        found = [int(n) for n in TOC_ENTRY.findall(text)]
        if not found:
            break
        numbers += found
        last = number
    return numbers, last


def toc_key(heading: str) -> str:
    """目次と見出しを突き合わせるための照合キー。

    行内マークダウンの記号は目次に出ないので落とす。長い見出しは目次で折り返されて
    2行になるため、頭の一定文字数だけで見る。
    """
    return flatten(re.sub(r"[`*_]", "", heading))[:12]


def find_toc_problems(pages: list[str], total_pages: int,
                      headings: list[str]) -> list[str]:
    """目次が見出しを網羅し、ページ番号が解決できているかを見る。

    target-counter は参照先の id が無いと 0 になる。組版は成功したまま、
    目次だけが役に立たない状態で出荷される。

    件数ではなく見出しの文字で突き合わせるのは、長い見出しが目次で折り返されると
    リーダー点と番号が2行目に回り、行数と項目数が一致しなくなるため。
    """
    numbers, last = toc_entries(pages)
    listed = flatten("".join(pages[1:last]))
    problems = [
        f"目次に出ていない見出し: {heading[:24]}"
        for heading in headings
        if toc_key(heading) not in listed
    ]
    if not numbers:
        problems.append("目次にページ番号が無い")
    for number in numbers:
        if not last < number <= total_pages:
            problems.append(f"目次のページ番号が範囲外: {number}")
    return sorted(set(problems))


def long_code_lines(source: str) -> list[str]:
    """原稿から、折り返しが要る長さのコード行を集める。"""
    lines: list[str] = []
    for lang, block in code_blocks(source):
        if lang in NON_TEXT_LANGS:
            continue
        lines += [line for _, line in block if len(line) > LONG_CODE]
    return lines


def normalize_code(text: str) -> str:
    """コード比較用に、抽出側の癖を吸収した形にする。

    空白を落とすのは、紙面で折り返された行に改行が入るため。
    ハイフンも落とす。pdftotext は行末のハイフンを「単語の分割」とみなして
    結合時に取り除く。`border-border` が折り返し位置に当たると `borderborder`
    として出てくるので、そのままでは欠落と区別がつかない。
    ハイフンの有無だけが違う行を見逃す代わりに、誤検出をゼロにする。
    """
    return flatten(text).replace("-", "")


def find_truncated_code(source: str, body_text: str) -> list[str]:
    """PDF から末尾が消えたコード行を挙げる。

    渡すのは柱とノンブルを抜いた本文。抜かずに繋ぐと、改ページを跨いだコード行の
    途中に柱が挟まって、正しく出ているものまで欠落に見える。
    """
    flat = normalize_code(body_text)
    missing: list[str] = []
    for line in long_code_lines(source):
        if normalize_code(line) not in flat:
            missing.append(line.strip())
    return missing


class ToolFailure(RuntimeError):
    """poppler のコマンドが結果を返せんかった。"""


def run_tool(command: list[str]) -> str:
    """poppler のコマンドを1つ動かして標準出力を返す。

    失敗を空文字で返してはいけない。「読めなかった」と「問題が無かった」が
    区別できなくなり、書体を1行も読めなかったPDFが合格として出てしまう。
    検査が見逃す形の失敗が一番たちが悪いので、必ず例外にして問題一覧へ載せる。
    """
    try:
        done = subprocess.run(
            command, capture_output=True, text=True, timeout=TOOL_TIMEOUT
        )
    except subprocess.TimeoutExpired:
        raise ToolFailure(f"{command[0]} が{TOOL_TIMEOUT}秒を超えても返らない") from None
    except OSError as error:
        raise ToolFailure(f"{command[0]} を起動できない: {error}") from error
    if done.returncode != 0:
        detail = done.stderr.strip()[:200] or "詳細なし"
        raise ToolFailure(f"{command[0]} が異常終了({done.returncode}): {detail}")
    return done.stdout


def read_pages(pdf: Path, count: int) -> list[str]:
    """ページごとの本文を返す。

    pdftotext はページの区切りに改ページ文字を入れる。ページ単位で呼び分けると
    36冊で2500回プロセスを起こすことになるので、1冊1回で取って割る。
    """
    pages = run_tool(["pdftotext", str(pdf), "-"]).split("\f")
    # 末尾の改ページ文字の後ろに空文字が1つ残る
    return pages[:count]


def read_info(pdf: Path) -> dict[str, str]:
    output = run_tool(["pdfinfo", str(pdf)])
    info: dict[str, str] = {}
    for line in output.split("\n"):
        if ":" in line:
            key, value = line.split(":", 1)
            info[key.strip()] = value.strip()
    return info


def parse_font_table(output: str) -> list[tuple[str, str, str]]:
    """pdffonts の表を (書体名, 種別, 埋め込み) にほどく。

    列は固定位置で数えん。区切り線の `-` の並びから列の範囲を読み、見出し行と
    突き合わせて名前で引く。pdffonts は実装で列構成が違い、poppler は
    `name type encoding emb sub uni object ID`、xpdf は encoding が無く代わりに
    prob が入る。端から数える書き方だと、片方で emb ではなく隣の列を読む。
    """
    lines = output.split("\n")
    ruler = next(
        (n for n, line in enumerate(lines)
         if "-" in line and set(line) <= {"-", " "}),
        -1,
    )
    if ruler < 1:
        return []
    spans: list[tuple[int, int]] = []
    start: int | None = None
    for index, char in enumerate(lines[ruler] + " "):
        if char == "-" and start is None:
            start = index
        elif char != "-" and start is not None:
            spans.append((start, index))
            start = None
    header = [lines[ruler - 1][a:b].strip() for a, b in spans]
    rows: list[tuple[str, str, str]] = []
    for line in lines[ruler + 1:]:
        if not line.strip():
            continue
        cells = dict(zip(header, (line[a:b].strip() for a, b in spans)))
        # 読めなかった列は空文字で残す。埋め込み判定は「yes 以外は不合格」なので、
        # 取り違えたときは黙って通さず必ず落ちる側へ倒れる。
        rows.append((cells.get("name", ""), cells.get("type", ""), cells.get("emb", "")))
    return rows


def read_fonts(pdf: Path) -> list[tuple[str, str, str]]:
    return parse_font_table(run_tool(["pdffonts", str(pdf)]))


def check_one(pdf: Path) -> list[str]:
    """1冊を見て、見つかった問題を並べる。"""
    problems: list[str] = []
    info = read_info(pdf)
    total = int(info.get("Pages", "0"))
    if total == 0:
        return [f"{pdf.name}: ページが無い"]
    if A4_SIZE not in info.get("Page size", ""):
        problems.append(f"用紙が A4 でない: {info.get('Page size')}")

    header = info.get("Title", "")
    if not header:
        problems.append("タイトルが空（柱とPDFのプロパティに出る）")

    pages = read_pages(pdf, total)
    if len(pages) != total:
        return [f"{pdf.name}: 本文を {len(pages)} ページ分しか取り出せない（全 {total}）"]
    problems += [f"p{n}: 中身が無い" for n in find_blank_pages(pages, header)]
    problems += [f"p{n}: mermaid の原文が出ている" for n in find_mermaid_leaks(pages)]
    problems += find_furniture_problems(pages, header)
    fonts = read_fonts(pdf)
    # 表が空でも書体検査は「問題なし」を返す。読めなかったのか本当に無いのかを
    # 区別できんまま通すと、埋め込みを一度も見ていないPDFが合格になる。
    if not fonts:
        problems.append("書体を1つも読み取れない")
    problems += find_font_problems(fonts)

    source = SRC_DIR / f"{pdf.stem}.md"
    if source.is_file():
        text = source.read_text(encoding="utf-8")
        # コードブロックの中にも `## ` で始まる行があるので、地の文だけを拾う
        headings = [
            matched.group(1).strip()
            for matched in (H2.match(line) for _, line in iter_prose(text))
            if matched
        ]
        problems += find_toc_problems(pages, total, headings)
        body = "".join(
            page_residue(page, header, number)
            for number, page in enumerate(pages, start=1)
        )
        for line in find_truncated_code(text, body):
            problems.append(f"コード行が欠けている: {line[:60]}…")
    else:
        problems.append(f"対応する原稿が見つからない: {source.name}")

    return [f"{pdf.name}: {p}" for p in problems]


def main(argv: list[str]) -> int:
    missing = [tool for tool in REQUIRED_TOOLS if shutil.which(tool) is None]
    if missing:
        print(f"❌ poppler のコマンドが見つかりません: {', '.join(missing)}", file=sys.stderr)
        print("   macOS: brew install poppler / Debian系: apt install poppler-utils",
              file=sys.stderr)
        return 2

    args = argv[1:] or [str(DEFAULT_PDF_DIR)]
    if len(args) != 1 or not Path(args[0]).is_dir():
        print("❌ PDF のディレクトリを1つ指定してください", file=sys.stderr)
        return 2
    pdfs = sorted(Path(args[0]).glob("*.pdf"))
    if not pdfs:
        print(f"❌ PDF がありません: {args[0]}", file=sys.stderr)
        return 2

    problems: list[str] = []
    for pdf in pdfs:
        try:
            problems += check_one(pdf)
        except ToolFailure as failure:
            # 1冊が読めんかっただけで残りの検査ごと落とさない
            problems.append(f"{pdf.name}: 検査できない: {failure}")

    if problems:
        print(f"❌ {len(pdfs)}冊中に {len(problems)} 件の問題があります")
        for problem in problems:
            print(f"  {problem}")
        return 1

    print(f"✅ {len(pdfs)}冊すべて商品として出せる状態です")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
