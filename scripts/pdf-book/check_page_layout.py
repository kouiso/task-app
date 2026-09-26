#!/usr/bin/env python3
"""組んだ紙面が崩れていないかを、ページの絵と座標から確かめる。

`check_pdf_book.py` は本文を文字列として取り出して見ている。文字が「出ているか」は
分かるが、「どこに出ているか」は見ていない。だから次の欠陥は全部そこを素通りする。

  - 版面からはみ出す（余白を越えて紙の端へ墨が出る）
  - 要素が重なる（表と図、本文とノンブル）
  - 表の列が潰れる（幅が1文字ぶんになり、文字が縦一列に積まれる）
  - 写真が小さすぎる・縦横比が崩れる（画像の検査は既存に1件も無い）
  - 端切れ（1〜3文字だけの行）

実際に day26 の5列表で、5列目が幅 4.5mm に潰れて版面の右外へ 7.2mm はみ出し、
1行のセルが1ページを丸ごと食う状態が出ていた。文字は全部出ているので、
既存の検査は緑のまま通していた。

判定は poppler だけで行う（pdftoppm / pdfimages / pdftotext / pdfinfo）。
Pillow も numpy も使わない。追加の依存を増やすと、検査を動かすほうが面倒になって
回されなくなる。pdftoppm の PGM（P5）は素の bytes なので標準ライブラリで読める。

見ないもの: 紙面の「形」だけを見て、中身の正しさは見ない。文字が正しいかは
check_pdf_book.py と verify_pdf_copy.py、リンクが正しい先を指すかは
release_manifest.py が分担する。スクショの撮り間違い（別画面の画像が
入っている）のような内容の齟齬は、どの機械検査も見ていない。

版面の矩形をどう決めたか（両方やった。片方だけでは足りない）
--------------------------------------------------------------
1. CSS から導いた。用紙は A4（210×297mm）。余白は @vivliostyle/theme-techbook が
   天地 25mm・左右 22mm を指定しており、`material/style/book.css` のコメントも
   版面を「166mm × 247mm」として同じ値を記録している。よって
   版面 = x∈[22,188]mm, y∈[25,272]mm。
2. 組んだPDFで実測して裏を取った。day01 を 72dpi で描画したときの墨の位置は
   左 21.9mm / 右 188.0mm、本文の先頭 25.4mm、柱の帯 10.2〜14.5mm、
   ノンブルの帯 282.2〜286.1mm。1 の値と一致した。

CSS の値だけを信じると、テーマが余白を変えたときに検査が黙って嘘をつく。
実測だけで決めると、はみ出しているPDFを「これが版面や」と学習してしまう。
だから CSS を正とし、実測は一致の確認に使う。

柱とノンブルは版面の外（余白のマージンボックス）に正しく置かれる。ここを
はみ出しとして数えると全ページが赤くなるので、帯として除外する。除外するのは
天 0〜20mm と地 278〜297mm だけで、その内側（20〜24mm・273〜278mm）に墨が来たら
本文が余白へあふれたと判定する。実測の空き（14.5〜25.4mm・272〜282.2mm）より
狭く取っているので、正常なPDFがここに掛かることはない。

`material-gate.yml` には入れない。理由は `check_pdf_book.py` と同じで、先にPDFを
組む必要があり Chromium と時間を食う。
"""

from __future__ import annotations

import json
import re
import shutil
import statistics
import sys
import tempfile
from pathlib import Path
from xml.etree import ElementTree

sys.path.insert(0, str(Path(__file__).parent))
from check_pdf_book import ToolFailure, run_tool  # noqa: E402
from build_pdf_book import work_slug  # noqa: E402
from breakable_code import BREAKABLE_MIN_LINES  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PDF_DIR = REPO_ROOT / "dist" / "pdf"
# 組版計測の記録。縦並び表の行がページを跨いでいないかの照合に使う
BUILD_DIR = REPO_ROOT / "dist" / ".pdf-book-build"

REQUIRED_TOOLS = ("pdftoppm", "pdfimages", "pdftotext", "pdfinfo")

# ── 版面（上の docstring 参照） ──────────────────────────────
TEXT_LEFT_MM = 22.0
TEXT_RIGHT_MM = 188.0
TEXT_TOP_MM = 25.0
TEXT_BOTTOM_MM = 272.0
# 柱とノンブルが正しく入る余白の帯。ここの墨は版面外でも問題にしない
HEAD_BAND_BOTTOM_MM = 20.0
FOLIO_BAND_TOP_MM = 278.0
# 罫線・背景の縁と描画のアンチエイリアスで、版面ちょうどの要素が 0.5mm ほど外へ出る。
# 実測の最大が右 188.0mm（版面の縁ちょうど）なので、1mm を超えたぶんだけを見る
EDGE_TOLERANCE_MM = 1.0

# ぶら下げ組。和文では行末の句読点や閉じ括弧を版面の外へ出すのが正しい組み方で、
# 崩れではない。実測（36冊）でも、右へ 2.2mm 出ている本文の行はどれもこれだった。
# 出てよいのは1文字ぶんまでで、それを超えたら別の原因なので報告する。
HANGING_PUNCTUATION = "、。，．,.」』）〕】〉》〟’”!?！？：；:;"
# 行頭の始め括弧も同じ。和文では行の先頭に来た `（` `「` を左へ半角ぶん出して組む。
# 実測（36冊）で左へ 2.3mm 出ていた行は、どれも `（` で始まっていた。
LINE_HEAD_BRACKETS = "（(「『［〔【〈《“‘"
HANGING_MAX_MM = 3.5

# 描画の解像度。72dpi にすると 1px = 1pt = PDF の座標そのものになり、
# 画素と座標の対応を計算で歪めずに済む。1px = 0.353mm で、上の許容 1mm の1/3
RENDER_DPI = 72
# 紙は白（255）。淡い地色（引用の #f6f8fa、インラインコードの #eef1f4）は 240 前後で、
# これを墨に数えると版面いっぱいの地色で全ページが引っかかる。間を取って 230
INK_LEVEL = 230

# コードブロックは地色が濃いので、行のほとんどの画素が墨として数えられる。
# 地の文は白地に字なので、同じ行でも墨は一部にしか出ない。この差で見分ける。
CODE_BAND_DARK_RATIO = 0.6
# 版面の上端・下端からこの範囲に濃い帯があれば、そこで途切れているとみなす。
CODE_BAND_EDGE_MM = 3.0
# 表の罫線も版面いっぱいに横へ伸びる濃い線なので、1行だけ見るとコードの地色と
# 区別が付かない（実測: day28 p55 の表の下罫が拾われた）。地色は必ず厚みを持つので、
# 端から内側へこの厚みぶん濃い行が続いていることを条件にする。
CODE_BAND_MIN_THICK_MM = 3.0

# ページの境を跨いだコードの断片がこの厚み未満なら端切れとして咎める。
# 断片の帯には塊の外側のパディング（pre の 1em ≒ 4mm）も入るので、
# orphans / widows が保つ4行ぶんの断片は約37mm、3行の端切れは約29mmになる
# （コード1行は約8.3mm）。その間に置くと、保証が効いた分割は通し、
# 1〜3行だけが残る端切れだけを拾える。
CODE_SPLIT_MIN_MM = 33.0

# ── 表の潰れ ────────────────────────────────────────────────
# 潰れた列は「1文字だけの行」が行送りの間隔でびっしり縦に積まれる。
# 幅の広い列にたまたま1文字が入るのとは、積まれた本数と間隔で見分ける。
COLLAPSED_WIDTH_MM = 8.0
COLLAPSED_MIN_STACK = 8
# 行送りは本文 12.75pt × 2.05 ≒ 9.2mm。表の行が変わる間隔（実測 16〜21mm）とは
# 倍近く離れるので、12mm で切ると「同じセルの中で折り返された」ものだけが残る
COLLAPSED_MAX_PITCH_MM = 12.0

# 潰れた列は、縦に積まれた文字を読むと元の語になる（実測: 「成功状態ErrorBoun」）。
# 一方、○×だけの「必須」列や、木構造図の `│` が並ぶコードブロックは、
# 同じ形に見えても字の種類が少ない。種類の数で分ける。
COLLAPSED_MIN_DISTINCT = 4

# 端切れとして数える塊の条件。表のセルを外すためのもの。
ORPHAN_BLOCK_MIN_RATIO = 0.6
ORPHAN_PREV_MIN_RATIO = 0.9

# ── 脚注URLと欧文の折返し ──────────────────────────────────
# 脚注の表示URLは生成側で「/ ? & =」の直後だけに折り返しを許している。
# それ以外の位置（語の途中）で切れていたら、表示URLの接着が効いていない証拠。
URL_BREAK_ALLOWED_AFTER = "/?&="
FOOTNOTE_URL_START = re.compile(r"^\s*\d+\.\s*https?://")
# URLの続きとしてあり得る行（空白を含まずURL文字だけ）
URL_CONTINUATION = re.compile(r"^[A-Za-z0-9_?&=./:%#~+@()\[\],!*;'\-]+$")
# 生成器が差し込む改行制御用の不可視文字（ZWSP・WJ・BOM・SOFT HYPHEN）。
# 行の端の判定は見えない文字を取り除いてから行う
INVISIBLE_BREAK_MARKS = "\u200b\u2060\ufeff\u00ad"
INVISIBLE_TABLE = str.maketrans("", "", INVISIBLE_BREAK_MARKS)


def visible_text(text: str) -> str:
    return text.translate(INVISIBLE_TABLE)

# ── 重なり ──────────────────────────────────────────────────
# 別々のブロックの行同士が重なったら組版の事故。同じブロックの中の行は
# 行送りで並ぶだけなので対象にしない
OVERLAP_MIN_SIDE_MM = 1.0
OVERLAP_MIN_RATIO = 0.5

# ── 画像 ────────────────────────────────────────────────────
# book.css は写真を版面いっぱい（166mm）に置く。壊れて元の image-resolution: 300dpi へ
# 戻ると、横長で 110〜120mm、縦長のモバイル画面で 24〜33mm まで縮む（book.css の記録）。
# 130mm で切ると、その両方を拾い、今の実測（最小 152.4mm）には掛からない
MIN_IMAGE_WIDTH_MM = 130.0
# 縦長の写真は、幅ではなく高さで頭打ちになる（book.css の max-block-size: 150mm）。
# 携帯の画面（390×844）や中央寄せのカードは、紙の上で幅が 70〜110mm になるが、
# それは崩れではなく元の画面の形。高さが十分にあるかで見る。
MIN_IMAGE_HEIGHT_MM = 120.0
# 紙で図中のUI文字が読める下限。1440px を版面幅いっぱいに置くと 220ppi になる
MIN_IMAGE_PPI = 120
# object-fit: contain が外れて引き伸ばされたら、縦横の実効解像度がずれる
MAX_PPI_SKEW = 0.02
# 版面より大きい画像は紙からはみ出す。pdfimages の ppi は整数に丸められるため、
# 版面いっぱい（166.3mm と出る）を誤検出しないよう 2mm 見る
MAX_IMAGE_WIDTH_MM = TEXT_RIGHT_MM - TEXT_LEFT_MM + 2.0
# book.css の figure img[src$=".png"] は max-block-size: 150mm
MAX_IMAGE_HEIGHT_MM = 152.0

# ── 端切れ ──────────────────────────────────────────────────
# 定義は book.css の記録に合わせる。「1〜3文字だけの行」。折り返しの結果か
# 元から短いセルかは区別しない（区別すると数え方が変わり、過去の実測と比べられなくなる）
ORPHAN_MAX_CHARS = 3
# day01（読めるが窮屈）が 8.3%、day26（5列表が潰れて崩壊）が 21.0%。その間で、
# 窮屈なほうに寄せすぎない位置に置く。36冊を組んだら実測で見直すこと
ORPHAN_RATE_LIMIT = 0.15

MM_PER_PT = 25.4 / 72.0

# コードの行送り。book.css: 本文 12.75pt、行高 2.05、pre の級数はその 90%。
# 表示1行 = 12.75 × 0.9 × 2.05 ≒ 23.5pt ≒ 8.3mm
CODE_LINE_PITCH_MM = 12.75 * 0.9 * 2.05 * MM_PER_PT
# 境で切れた断片の帯には、塊の外側に残る pre のパディング（1em ≒ 4.05mm）が
# 1つぶん入る（切れ目の内側のパディングはスライスで落ちる）
PRE_FRAGMENT_PAD_MM = 12.75 * 0.9 * MM_PER_PT

# 分割してよいのは生成器が pdf-breakable を付けた塊（表示
# BREAKABLE_MIN_LINES 行以上）だけ。境の断片の合計（前ページ下端＋
# 次ページ上端）は、その塊の高さ ≒ 18行×8.3mm＋両断片のパディング
# ≒ 157mm を必ず超える。一方、丸送りのはずの塊（17行以下）が切れた
# ときの合計は高々 149mm。その間に下限を置くと、keep-together が
# 掛け忘れやテーマ更新で効かなくなった塊の分割を拾える。
CODE_SPLIT_BLOCK_MIN_MM = (
    BREAKABLE_MIN_LINES * CODE_LINE_PITCH_MM + PRE_FRAGMENT_PAD_MM
)


def mm_from_px(value: int) -> float:
    """描画した画素の位置を mm に直す。"""
    return value * 25.4 / RENDER_DPI


def read_pgm(data: bytes) -> tuple[int, int, bytes]:
    """pdftoppm -gray が書く PGM(P5) を (幅, 高さ, 画素) にほどく。

    読めない形を空データで返してはいけない。「墨が無い」と「読めなかった」が
    同じ結果になり、崩れたページを合格として出してしまう。
    """
    parts = data.split(b"\n", 3)
    if len(parts) != 4 or parts[0] != b"P5":
        raise ToolFailure("pdftoppm の出力が PGM(P5) ではない")
    try:
        width, height = (int(n) for n in parts[1].split())
    except ValueError:
        raise ToolFailure(f"PGM の大きさを読めない: {parts[1]!r}") from None
    pixels = parts[3]
    if len(pixels) < width * height:
        raise ToolFailure(f"PGM の画素が足りない: {len(pixels)} < {width * height}")
    return width, height, pixels


# 明るさの判定を1画素ずつ Python で回すと、1冊で3千万回の比較になる。
# 変換表を使えば bytes.translate / find / rfind に落ちて、全部 C 側で終わる
INK_TABLE = bytes(1 if level < INK_LEVEL else 0 for level in range(256))


def ink_rows(width: int, height: int, pixels: bytes) -> list[tuple[int, int, int]]:
    """墨のある行だけを (y, 左端x, 右端x) で返す。単位は画素。"""
    marked = pixels.translate(INK_TABLE)
    rows: list[tuple[int, int, int]] = []
    for y in range(height):
        line = marked[y * width:(y + 1) * width]
        left = line.find(1)
        if left >= 0:
            rows.append((y, left, line.rfind(1)))
    return rows


def code_band_at_edges(width: int, height: int, pixels: bytes) -> tuple[int, int]:
    """コードブロックの濃い帯が版面の上端・下端で持つ厚み（画素）を返す。

    写経が前提の教材で、コードブロックがページの境で切れると、読者は
    打ちながら紙をめくることになる。版面いっぱいを占める大きな塊は
    book.css の `pdf-breakable` で境での流し込みを許すが、分割は
    orphans / widows が両側4行を保つ。帯の厚みは断片の行数に比例するので、
    出来上がった紙面の側から「薄い切れ端」を見張れる。

    返すのは (上端の帯の厚み, 下端の帯の厚み)。帯が端に接していないか
    罫線程度に薄いときは 0。
    """
    marked = pixels.translate(INK_TABLE)
    left_px = int(TEXT_LEFT_MM * RENDER_DPI / 25.4)
    right_px = int(TEXT_RIGHT_MM * RENDER_DPI / 25.4)
    span = max(1, right_px - left_px)

    def is_code_row(y: int) -> bool:
        if not 0 <= y < height:
            return False
        row = marked[y * width + left_px:y * width + right_px]
        return sum(row) >= span * CODE_BAND_DARK_RATIO

    def band_length(y_probe: int) -> int:
        """y_probe を含む連続した濃い帯の厚み（画素）。"""
        if not is_code_row(y_probe):
            return 0
        start = y_probe
        while is_code_row(start - 1):
            start -= 1
        end = y_probe
        while is_code_row(end + 1):
            end += 1
        return end - start + 1

    thick_px = max(1, int(CODE_BAND_MIN_THICK_MM * RENDER_DPI / 25.4))
    top_y = int((TEXT_TOP_MM + CODE_BAND_EDGE_MM / 2) * RENDER_DPI / 25.4)
    bottom_y = int((TEXT_BOTTOM_MM - CODE_BAND_EDGE_MM / 2) * RENDER_DPI / 25.4)
    starts = band_length(top_y)
    ends = band_length(bottom_y)
    return (
        starts if starts >= thick_px else 0,
        ends if ends >= thick_px else 0,
    )


def find_ink_overflow(rows: list[tuple[int, int, int]]) -> list[str]:
    """版面からはみ出した墨を挙げる。人が見に行けるよう位置を mm で書く。"""
    if not rows:
        return []
    problems: list[str] = []
    left = min(mm_from_px(row[1]) for row in rows)
    right = max(mm_from_px(row[2]) for row in rows)
    # 左右は1文字ぶんまで見逃す。ぶら下げた句読点や行頭の始め括弧が
    # 版面の外へ出るのは正しい組み方で、墨の位置だけでは区別が付かない。
    # どの字が出ているかを見る find_text_overflow が、その範囲を受け持つ。
    if left < TEXT_LEFT_MM - HANGING_MAX_MM:
        problems.append(
            f"左余白へ {TEXT_LEFT_MM - left:.1f}mm はみ出す墨がある"
            f"（x={left:.1f}mm / 版面左端 {TEXT_LEFT_MM:.1f}mm）"
        )
    if right > TEXT_RIGHT_MM + HANGING_MAX_MM:
        problems.append(
            f"右余白へ {right - TEXT_RIGHT_MM:.1f}mm はみ出す墨がある"
            f"（x={right:.1f}mm / 版面右端 {TEXT_RIGHT_MM:.1f}mm）"
        )
    above = [mm_from_px(row[0]) for row in rows
             if HEAD_BAND_BOTTOM_MM < mm_from_px(row[0]) < TEXT_TOP_MM - EDGE_TOLERANCE_MM]
    if above:
        problems.append(
            f"柱の帯と版面の間に墨がある（y={min(above):.1f}mm / 版面上端 {TEXT_TOP_MM:.1f}mm）"
        )
    below = [mm_from_px(row[0]) for row in rows
             if TEXT_BOTTOM_MM + EDGE_TOLERANCE_MM < mm_from_px(row[0]) < FOLIO_BAND_TOP_MM]
    if below:
        problems.append(
            f"版面とノンブルの帯の間に墨がある"
            f"（y={max(below):.1f}mm / 版面下端 {TEXT_BOTTOM_MM:.1f}mm）"
        )
    return problems


class Line:
    """PDF から取り出した1行。座標は mm、原点はページの左上。"""

    __slots__ = ("page", "block", "left", "top", "right", "bottom", "text")

    def __init__(self, page: int, block: int, left: float, top: float,
                 right: float, bottom: float, text: str) -> None:
        self.page = page
        self.block = block
        self.left = left
        self.top = top
        self.right = right
        self.bottom = bottom
        self.text = text

    @property
    def width(self) -> float:
        return self.right - self.left

    @property
    def area(self) -> float:
        return max(0.0, self.right - self.left) * max(0.0, self.bottom - self.top)

    def __repr__(self) -> str:  # 失敗したテストの出力を読める形にする
        return (f"Line(p{self.page} b{self.block} "
                f"{self.left:.1f},{self.top:.1f}-{self.right:.1f},{self.bottom:.1f} "
                f"{self.text!r})")


def parse_line_boxes(xml_text: str) -> list[Line]:
    """`pdftotext -bbox-layout` の出力を行の一覧にほどく。

    DOCTYPE より前を落としてから読む。名前空間は poppler の版で付いたり付かなかったり
    するので、根の tag から実際の接頭辞を取って使う（決め打ちすると空を返す）。
    """
    start = xml_text.find("<html")
    if start < 0:
        raise ToolFailure("pdftotext -bbox-layout の出力に <html> が無い")
    root = ElementTree.fromstring(xml_text[start:])
    namespace = root.tag[:root.tag.index("}") + 1] if "}" in root.tag else ""
    pages = root.iter(f"{namespace}page")
    lines: list[Line] = []
    for number, page in enumerate(pages, start=1):
        for block, element in enumerate(page.iter(f"{namespace}block")):
            for line in element.findall(f"{namespace}line"):
                text = "".join(
                    word.text or "" for word in line.findall(f"{namespace}word")
                )
                lines.append(Line(
                    number, block,
                    float(line.get("xMin", "0")) * MM_PER_PT,
                    float(line.get("yMin", "0")) * MM_PER_PT,
                    float(line.get("xMax", "0")) * MM_PER_PT,
                    float(line.get("yMax", "0")) * MM_PER_PT,
                    text,
                ))
    return lines


def find_text_overflow(lines: list[Line]) -> list[str]:
    """版面の左右からはみ出した文字を挙げる。

    墨の検査（find_ink_overflow）が拾うのは位置だけで、何がはみ出したかは分からない。
    こちらは字を引用できるので、人がそのページを開いて確かめられる。
    淡い地色は墨に数えないため、背景の無い文字だけが外へ出た場合もここで捕まる。
    上下は柱とノンブルが正しく余白に入るので、行の座標だけでは正常と区別できない。
    左右に絞る。

    1文字ずつ挙げると、潰れた列1本で20行の指摘になって読めなくなる。
    ページと向きでまとめ、いちばん出ている行を証拠に添える。
    """
    worst: dict[tuple[int, str], tuple[float, int, Line]] = {}
    for line in lines:
        if not line.text.strip():
            continue
        if line.right > TEXT_RIGHT_MM + EDGE_TOLERANCE_MM:
            over_right = line.right - TEXT_RIGHT_MM
            # ぶら下げた句読点は正しい組み方なので数えない。
            if (
                over_right <= HANGING_MAX_MM
                and line.text.rstrip()[-1:] in HANGING_PUNCTUATION
            ):
                continue
            key, over = (line.page, "右"), over_right
        elif line.left < TEXT_LEFT_MM - EDGE_TOLERANCE_MM:
            over_left = TEXT_LEFT_MM - line.left
            # 行頭へ出した始め括弧は正しい組み方なので数えない。
            if (
                over_left <= HANGING_MAX_MM
                and line.text.lstrip()[:1] in LINE_HEAD_BRACKETS
            ):
                continue
            key, over = (line.page, "左"), over_left
        else:
            continue
        previous = worst.get(key)
        if previous is None:
            worst[key] = (over, 1, line)
        elif over > previous[0]:
            worst[key] = (over, previous[1] + 1, line)
        else:
            worst[key] = (previous[0], previous[1] + 1, previous[2])
    problems: list[str] = []
    for (page, side), (over, count, line) in sorted(worst.items()):
        problems.append(
            f"p{page}: 文字が版面の{side}へ最大 {over:.1f}mm はみ出す（{count}行）。"
            f"いちばん出ているのは y={line.top:.1f}mm の「{line.text[:20]}」"
        )
    return problems


def find_overlaps(lines: list[Line]) -> list[str]:
    """別のブロックの行同士が重なっている箇所を挙げる。

    同じブロックの行は行送りで並ぶだけなので対象外。面積の割合で見るのは、
    罫線と文字が 0.1mm 触れただけのものを事故として数えないため。
    """
    problems: list[str] = []
    by_page: dict[int, list[Line]] = {}
    for line in lines:
        if line.text.strip():
            by_page.setdefault(line.page, []).append(line)
    for page in sorted(by_page):
        group = by_page[page]
        for index, first in enumerate(group):
            for second in group[index + 1:]:
                if first.block == second.block:
                    continue
                across = min(first.right, second.right) - max(first.left, second.left)
                down = min(first.bottom, second.bottom) - max(first.top, second.top)
                if across < OVERLAP_MIN_SIDE_MM or down < OVERLAP_MIN_SIDE_MM:
                    continue
                smaller = min(first.area, second.area)
                if smaller <= 0 or across * down / smaller < OVERLAP_MIN_RATIO:
                    continue
                problems.append(
                    f"p{page}: 要素が {across:.1f}×{down:.1f}mm 重なっている"
                    f"（x={max(first.left, second.left):.1f}mm,"
                    f" y={max(first.top, second.top):.1f}mm）"
                    f"「{first.text[:16]}」と「{second.text[:16]}」"
                )
    return problems


def find_collapsed_columns(lines: list[Line]) -> list[str]:
    """幅が潰れて、文字が1文字ずつ縦に積まれている列を挙げる。

    book.css は表の列幅を th:nth-child(1..4) に 20/21/25/34% で固定している。
    5列目には残りが回らないので、5列表では最後の列が消える。3列表では按分されて
    破綻しないが、その前提が崩れたときにここで気づけるようにする。
    """
    narrow: dict[tuple[int, int], list[Line]] = {}
    for line in lines:
        if len(line.text.strip()) == 1 and line.width <= COLLAPSED_WIDTH_MM:
            narrow.setdefault((line.page, round(line.left)), []).append(line)
    problems: list[str] = []
    for (page, _), stack in sorted(narrow.items()):
        if len(stack) < COLLAPSED_MIN_STACK:
            continue
        stack.sort(key=lambda line: line.top)
        pitches = [b.top - a.top for a, b in zip(stack, stack[1:])]
        if statistics.median(pitches) > COLLAPSED_MAX_PITCH_MM:
            # 表の行が変わる間隔で並んどるだけ（1文字の値が入った普通の列）
            continue
        if len({line.text.strip() for line in stack}) < COLLAPSED_MIN_DISTINCT:
            # ○×だけの列や、木構造図の `│` の並び。潰れた列なら語が読めるはず。
            continue
        width = max(line.width for line in stack)
        problems.append(
            f"p{page}: 列が幅 {width:.1f}mm に潰れ、{len(stack)}行が1文字ずつ縦に積まれている"
            f"（x={stack[0].left:.1f}mm, y={stack[0].top:.1f}〜{stack[-1].top:.1f}mm）"
        )
    return problems


def _orphan_details(lines: list[Line]) -> tuple[list[Line], int]:
    """端切れ（折返しの結果、行末に1〜3文字だけ残った行）の一覧と総行数を返す。

    数える相手は「折返しの結果」に限る。短いだけの行は端切れではない。
    実測（day12 p8）では、5列の権限表に並ぶ `✅` `✖` のセルが1文字の行として
    33行数えられ、それだけで1冊の率を押し上げていた。表のセルは折返しの
    結果ではないので、次の2つを満たす行だけを端切れとする。

      1. その塊（block）が版面の幅の 60% 以上を使っている
         → 表のセルは列の幅しか無いので外れる。地の文とコードだけが残る
      2. 同じ塊の中で、直前の行が塊いっぱいまで伸びている
         → 折返して溢れた行だけが残る。段落の最終行が短いだけの場合は
           直前の行も短いことがあり、そこは数えない
    """
    total = 0
    orphan_lines: list[Line] = []

    inside = [
        line for line in lines
        if not (line.top < TEXT_TOP_MM - EDGE_TOLERANCE_MM or line.bottom > TEXT_BOTTOM_MM)
        and line.text.strip()
    ]
    blocks: dict[tuple[int, int], list[Line]] = {}
    for line in inside:
        blocks.setdefault((line.page, line.block), []).append(line)

    text_width = TEXT_RIGHT_MM - TEXT_LEFT_MM
    for block_lines in blocks.values():
        block_lines.sort(key=lambda line: line.top)
        widest = max(line.width for line in block_lines)
        wide_enough = widest >= text_width * ORPHAN_BLOCK_MIN_RATIO
        for index, line in enumerate(block_lines):
            total += 1
            if len(visible_text(line.text).strip()) > ORPHAN_MAX_CHARS or not wide_enough:
                continue
            if index == 0:
                continue
            if block_lines[index - 1].width < widest * ORPHAN_PREV_MIN_RATIO:
                continue
            # 図の中のラベル（mermaid）は中央寄せなので、段落の折返しと違って
            # 左端が揃わない。折返しの端切れだけを数えるため、左端が違う行は除く
            if abs(block_lines[index - 1].left - line.left) > 1.0:
                continue
            orphan_lines.append(line)
    return orphan_lines, total


def count_orphan_lines(lines: list[Line]) -> tuple[int, int, list[tuple[int, int]]]:
    """端切れを数える。返すのは (端切れの行数, 版面の中の行数, ページごとの多い順)。

    柱とノンブルは版面の外なので数えない。ノンブルを入れると全ページが
    1件ずつ端切れになる。
    """
    orphan_lines, total = _orphan_details(lines)
    per_page: dict[int, int] = {}
    for line in orphan_lines:
        per_page[line.page] = per_page.get(line.page, 0) + 1
    worst = sorted(per_page.items(), key=lambda item: (-item[1], item[0]))
    return len(orphan_lines), total, worst


def find_orphan_problems(lines: list[Line]) -> list[str]:
    """端切れが多すぎる本を挙げる。多いページを証拠として並べる。"""
    orphans, total, worst = count_orphan_lines(lines)
    if total == 0 or orphans / total <= ORPHAN_RATE_LIMIT:
        return []
    pages = "、".join(f"p{page}({count}行)" for page, count in worst[:5])
    return [
        f"端切れが {orphans}/{total} 行（{orphans / total * 100:.1f}%）で"
        f" {ORPHAN_RATE_LIMIT * 100:.0f}% を超える。多い順: {pages}"
    ]


def find_single_orphan_problems(lines: list[Line]) -> list[str]:
    """1文字だけ次の行へ残った端切れを挙げる。

    率ではなく1件でも出たら組版の事故として報告する（issue #425 で
    目次に「…を呼び出」→「す」が実際に出ていた）。
    """
    orphan_lines, _ = _orphan_details(lines)
    singles = [line for line in orphan_lines if len(visible_text(line.text).strip()) == 1]
    return [
        f"p{line.page}: 1文字だけの行「{visible_text(line.text).strip()}」"
        f"が残っている（y={line.top:.1f}mm）"
        for line in singles[:5]
    ]


def find_url_wrap_problems(lines: list[Line]) -> list[str]:
    """脚注の表示URLが、許した区切り（/ ? & =）以外の位置で折れている箇所を挙げる。

    `1. https://…` で始まる行を見つけ、同じ塊の中で続くURLだけの行までを
    折返しとみなす。続き行に進む直前の行の末尾が許可した区切りでなければ、
    語の途中で切れたということ。
    """
    blocks: dict[tuple[int, int], list[Line]] = {}
    for line in lines:
        blocks.setdefault((line.page, line.block), []).append(line)
    problems: list[str] = []
    for block_lines in blocks.values():
        block_lines.sort(key=lambda line: line.top)
        for index, line in enumerate(block_lines):
            if not FOOTNOTE_URL_START.match(visible_text(line.text)):
                continue
            previous = line
            for continuation in block_lines[index + 1:]:
                text = visible_text(continuation.text).strip()
                if not text or not URL_CONTINUATION.match(text):
                    break
                tail = visible_text(previous.text).rstrip()
                if tail[-1:] not in URL_BREAK_ALLOWED_AFTER:
                    problems.append(
                        f"p{previous.page}: 脚注URLが区切り以外で折れている"
                        f"（「{tail[-24:]}」の次が「{text[:16]}」）"
                    )
                previous = continuation
    return problems


def find_hyphen_break_problems(lines: list[Line]) -> list[str]:
    """欧文の語がハイフンの所で次の行へ折れている箇所を挙げる（react-hook-form 型）。"""
    blocks: dict[tuple[int, int], list[Line]] = {}
    for line in lines:
        blocks.setdefault((line.page, line.block), []).append(line)
    problems: list[str] = []
    for block_lines in blocks.values():
        block_lines.sort(key=lambda line: line.top)
        for first, second in zip(block_lines, block_lines[1:]):
            before = visible_text(first.text).rstrip()
            after = visible_text(second.text).lstrip()
            if not before or not after:
                continue
            # 図の中のラベル（mermaid）は中央寄せで箱の幅に合わせて折れる。
            # 左端が揃っていない2行は段落の折返しではないので、組版の割れとは扱わない
            if abs(first.left - second.left) > 1.0:
                continue
            split = (re.search(r'[A-Za-z0-9]-$', before) and re.match(r'[A-Za-z]', after)) \
                or (re.search(r'[A-Za-z0-9]$', before) and re.match(r'-[A-Za-z]', after))
            if split:
                problems.append(
                    f"p{first.page}: 欧文の語がハイフンの所で折れている"
                    f"（「{before[-24:]}」の次が「{after[:16]}」）"
                )
    return problems


def find_stacked_split_problems(report: dict) -> list[str]:
    """組版計測の記録から、縦並び表の1行がページを跨いでいる箇所を挙げる。

    `verify-inline-layout.mjs` が各ページの断片に記録した行番号を集計し、
    同じ行が2ページ以上に散らばっていたら分割されている。
    """
    rows: dict[str, set] = {}
    audit = report.get('dom_audit', {})
    for table in audit.get('stacked_inventory', []):
        for fragment in table.get('fragments', []):
            page = fragment.get('page_index')
            for cell in fragment.get('cells', []):
                row = cell.get('row')
                if row is None or not isinstance(page, int):
                    continue
                rows.setdefault(row, set()).add(page)
    return [
        f"縦並びの表の行「{row}」がページ {sorted(pages)} に分かれている"
        for row, pages in sorted(rows.items())
        if len(pages) > 1
    ]


def parse_image_table(output: str) -> list[dict[str, float | int | str]]:
    """`pdfimages -list` の表をほどく。

    列は左右の両端から数える。`object ID` だけが見出し2語・値2語で、真ん中の
    列数が見出しと合わない（poppler の出力の癖）。両端は安定しているので、
    前から page/num/type/width/height、後ろから ratio/size/y-ppi/x-ppi を取る。
    """
    rows: list[dict[str, float | int | str]] = []
    lines = [line for line in output.split("\n") if line.strip()]
    if len(lines) < 2 or not lines[0].split()[:1] == ["page"]:
        raise ToolFailure("pdfimages -list の見出しを読めない")
    for line in lines[2:]:
        cells = line.split()
        if len(cells) < 10:
            raise ToolFailure(f"pdfimages -list の行を読めない: {line.strip()[:80]}")
        try:
            rows.append({
                "page": int(cells[0]),
                "width": int(cells[3]),
                "height": int(cells[4]),
                "x_ppi": float(cells[-4]),
                "y_ppi": float(cells[-3]),
            })
        except ValueError:
            raise ToolFailure(f"pdfimages -list の数値を読めない: {line.strip()[:80]}") from None
    return rows


def find_image_problems(rows: list[dict[str, float | int | str]]) -> list[str]:
    """紙面での写真の大きさと粗さを見る。

    実効 ppi は pdfimages が出す（元の画素数 ÷ 紙面での寸法）。紙面での寸法は
    そこから逆算する（画素数 ÷ ppi）。描画した絵から写真の輪郭を拾う手もあるが、
    表の地色や図と見分けがつかず当て推量になるので、正確な数のほうを使う。
    """
    problems: list[str] = []
    for row in rows:
        page = row["page"]
        x_ppi = float(row["x_ppi"])
        y_ppi = float(row["y_ppi"])
        if x_ppi <= 0 or y_ppi <= 0:
            problems.append(f"p{page}: 画像の実効解像度を読めない（{x_ppi}×{y_ppi}ppi）")
            continue
        width_mm = int(row["width"]) / x_ppi * 25.4
        height_mm = int(row["height"]) / y_ppi * 25.4
        # 幅で見るのは横長の写真だけ。縦長は高さで頭打ちになるので、
        # 幅が足りないのは当たり前で、そこを咎めても直しようがない。
        if height_mm > width_mm:
            if height_mm < MIN_IMAGE_HEIGHT_MM:
                problems.append(
                    f"p{page}: 縦長の写真が高さ {height_mm:.1f}mm しかない"
                    f"（下限 {MIN_IMAGE_HEIGHT_MM:.0f}mm）"
                )
        elif width_mm < MIN_IMAGE_WIDTH_MM:
            problems.append(
                f"p{page}: 写真が幅 {width_mm:.1f}mm しかない"
                f"（版面 {TEXT_RIGHT_MM - TEXT_LEFT_MM:.0f}mm / 下限 {MIN_IMAGE_WIDTH_MM:.0f}mm）"
            )
        if width_mm > MAX_IMAGE_WIDTH_MM:
            problems.append(f"p{page}: 写真が幅 {width_mm:.1f}mm で版面をはみ出す")
        if height_mm > MAX_IMAGE_HEIGHT_MM:
            problems.append(f"p{page}: 写真が高さ {height_mm:.1f}mm で紙面の上限を超える")
        if min(x_ppi, y_ppi) < MIN_IMAGE_PPI:
            problems.append(
                f"p{page}: 写真が粗い（実効 {x_ppi:.0f}×{y_ppi:.0f}ppi /"
                f" 下限 {MIN_IMAGE_PPI}ppi）"
            )
        skew = abs(x_ppi - y_ppi) / max(x_ppi, y_ppi)
        if skew > MAX_PPI_SKEW:
            problems.append(
                f"p{page}: 写真の縦横比が崩れている"
                f"（実効 {x_ppi:.0f}×{y_ppi:.0f}ppi / ずれ {skew * 100:.1f}%）"
            )
    return problems


def page_count(pdf: Path) -> int:
    for line in run_tool(["pdfinfo", str(pdf)]).split("\n"):
        if line.startswith("Pages:"):
            return int(line.split(":", 1)[1].strip())
    raise ToolFailure("pdfinfo がページ数を返さない")


def code_split_problem(tail_px: int, head_px: int) -> str:
    """ページ境を跨いだコード帯の断片（前ページ下端・次ページ上端の画素厚み）
    から、咎めるべき切れ方だけを文言にして返す。問題なければ空文字。

    分割してよいのは pdf-breakable の塊（表示 BREAKABLE_MIN_LINES 行
    以上）だけで、分割は orphans / widows が両側4行を保つ。
    境で拾えた断片がそのどちらの形にも合わないとき、keep-together が
    効くはずの塊が掛け忘れやテーマ更新で静かに切れている証拠になる。
    """
    fragment_mm = mm_from_px(min(tail_px, head_px))
    if fragment_mm < CODE_SPLIT_MIN_MM:
        return (f"コードブロックがページの境で薄く切れている"
                f"（境の断片 {fragment_mm:.1f}mm）。"
                "写経しながら紙をめくることになる")
    total_mm = mm_from_px(tail_px + head_px)
    if total_mm < CODE_SPLIT_BLOCK_MIN_MM:
        return (f"keep-together の効くはずのコードブロックがページの境で"
                f"切れている（境の断片の合計 {total_mm:.1f}mm は"
                f" {BREAKABLE_MIN_LINES} 行の塊の高さに足りない）")
    return ""


def render_problems(pdf: Path, total: int) -> list[str]:
    """全ページを描画して、版面からはみ出した墨を挙げる。"""
    with tempfile.TemporaryDirectory() as work:
        run_tool(["pdftoppm", "-gray", "-r", str(RENDER_DPI), str(pdf),
                  str(Path(work) / "page")])
        images = sorted(Path(work).glob("page-*.pgm"))
        if len(images) != total:
            raise ToolFailure(f"{total} ページ中 {len(images)} ページしか描画できない")
        problems: list[str] = []
        previous_code_tail = 0
        for number, image in enumerate(images, start=1):
            width, height, pixels = read_pgm(image.read_bytes())
            for problem in find_ink_overflow(ink_rows(width, height, pixels)):
                problems.append(f"p{number}: {problem}")
            starts, ends = code_band_at_edges(width, height, pixels)
            if previous_code_tail and starts:
                problem = code_split_problem(previous_code_tail, starts)
                if problem:
                    problems.append(f"p{number - 1}〜p{number}: {problem}")
            previous_code_tail = ends
        return problems


def check_one(pdf: Path) -> list[str]:
    """1冊の紙面を見て、見つかった問題を並べる。"""
    total = page_count(pdf)
    if total == 0:
        return [f"{pdf.name}: ページが無い"]

    problems = render_problems(pdf, total)

    lines = parse_line_boxes(run_tool(["pdftotext", "-bbox-layout", str(pdf), "-"]))
    if not lines:
        # 1行も取れないのは「文字が無い」のではなく取り出しに失敗した形。
        # 空のまま次の検査へ渡すと、全部が「問題なし」になって通ってしまう
        return [f"{pdf.name}: 行の座標を1件も取り出せない"]
    problems += find_text_overflow(lines)
    problems += find_overlaps(lines)
    problems += find_collapsed_columns(lines)
    problems += find_orphan_problems(lines)
    problems += find_single_orphan_problems(lines)
    problems += find_url_wrap_problems(lines)
    problems += find_hyphen_break_problems(lines)

    # 組んだ冊と同じ内容で残った計測記録があれば、縦並び表の行の分割も照合する。
    # 作業名は日本語を外した slug になるので、PDF の名前と同じ規則で復元する
    layout_reports = sorted(BUILD_DIR.glob(f"{work_slug(pdf.stem)}.inline-layout.json"),
                            key=lambda path: path.stat().st_mtime)
    if layout_reports:
        problems += find_stacked_split_problems(
            json.loads(layout_reports[-1].read_text(encoding="utf-8")))

    problems += find_image_problems(parse_image_table(
        run_tool(["pdfimages", "-list", str(pdf)])
    ))

    return [f"{pdf.name}: {problem}" for problem in problems]


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
        print(f"❌ {len(pdfs)}冊の紙面に {len(problems)} 件の問題があります")
        for problem in problems:
            print(f"  {problem}")
        return 1

    print(f"✅ {len(pdfs)}冊すべて紙面が崩れていません")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
