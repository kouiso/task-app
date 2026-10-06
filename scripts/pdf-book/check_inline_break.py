#!/usr/bin/env python3
"""行内コードの組版前処理と組版結果が直っているかを、生成物から数える。

Issue #472 の完成の定義にある6項目を集計する。入力は `dist/.pdf-book-build/` の
`*.html`（組版へ渡した注釈済みHTML）と `*.inline-manifest.json` /
`*.inline-layout.json` / `*.inline-adjustment.json`（組版中の監査の記録）。

失敗にするのは次の4項目で、どれかが1件でもあれば終了コード1。

  1. `pdf-tail` スパンの直後に行内コードが来ている所
  2. 前で改行できない字で始まるのに直前に `<wbr>` が無いコード
  3. 分割対象なのに1つの `<code>` のまま残っているコード
  4. 分割対象のコードが本文より0.1pt以上小さく組まれた所

「前の行の右の空き」と「4文字以下の行のすぐ後にコードの行」は
出るだけにして合否には使わない（空白の無いコードとコマンドには
空きが残る決まりなので、0にはならない）。

判定に使う一覧（改行できない15字・コマンド名・分割の閾値）は
inline_break.py のものをそのまま読む。組版と検査が別の一覧を持つと、
変えたときに組版だけが新しい一覧で動いて検査が黙ってすり抜ける。
"""

from __future__ import annotations

import html
import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "pdf-book"))

from inline_break import (  # noqa: E402
    COUNT_EXCLUDED_ANCESTORS,
    needs_wbr,
    is_split_target,
)
from inline_layout import HTML_VOID_ELEMENTS  # noqa: E402
from table_latin import INLINE_TAIL_SIBLINGS  # noqa: E402

DEFAULT_BUILD_DIR = REPO_ROOT / "dist" / ".pdf-book-build"

# `day01-bf910a.html` のような内容ハッシュの接尾辞。同じ冊を組み直した
# 古い成果物が残ると2重に数えるので、冊ごとに新しいものだけを見る
_HASH_SUFFIX_RE = re.compile(r"-[0-9a-f]{6}$")

# 「行頭がコード」判定で、コードの左端と行の左端がこの差以内なら同じ位置とみなす
_LINE_START_EPSILON_PX = 1.5
# 「前の行の右の空き」の閾値。1行は版面の幅 166mm、その 1/4
_GAP_QUARTER_LINE_MM = 41.5
_MM_TO_PX = 96 / 25.4
_PT_TO_PX = 96 / 72
# 「4文字以下の行」は行の字の幅の合計が全角4文字以下のもの。行の枠の幅が
# そのまま字の幅の合計なので、本文の字の大きさの4倍と比べる
_FULL_WIDTH_CHARS = 4
_SHORT_LINE_EPSILON_PX = 0.5
# 本文の字の大きさが取れなかったときの予備。テーマの本文は 12.75pt
_FALLBACK_BODY_PT = 12.75
_SHRINK_EPSILON_PT = 0.1

# レイアウト側の数え方も「段落と箇条書きの中」にそろえる。
# flow_geometry.dom_path は `nav > ol > li > div` のような祖先の並び
_SCOPE_PATH_TAGS = frozenset({"p", "li"})
_DOM_PATH_TAGS_RE = re.compile(r"([a-zA-Z][\w-]*)")


def _dom_path_tags(dom_path: str) -> list[str]:
    """`li:nth-of-type(1) > a` のような経路からタグ名だけを抜く。"""
    return [match.lower() for match in _DOM_PATH_TAGS_RE.findall(dom_path)]


def _in_split_scope(dom_path: str) -> bool:
    """ドキュメント上の位置が③の対象範囲（段落・箇条書きの中）か。"""
    tags = _dom_path_tags(dom_path)
    return any(tag in _SCOPE_PATH_TAGS for tag in tags) and not any(
        tag in COUNT_EXCLUDED_ANCESTORS for tag in tags
    )


class _HtmlMetrics(HTMLParser):
    """1冊のHTMLから 1〜3 の項目を数える。"""

    def __init__(self, markup: str):
        super().__init__(convert_charrefs=False)
        self.markup = markup
        self.line_starts = [0] + [
            i + 1 for i, c in enumerate(markup) if c == "\n"
        ]
        # (タグ名, class一覧) の対になった祖先の積み上げ
        self.stack: list[tuple[str, str]] = []
        self.counts = Counter()
        # 直前の表示文字と、その文字が pdf-tail の内側にあったか。
        # 要素の境界は表示上の字を区切らないので、タグでは戻さない
        self.last_char: str | None = None
        self.last_char_in_tail = False
        # <wbr> の直後か。<wbr> と code の間に字や要素が挟まれば直前ではない
        self.wbr_before = False
        # 今読んでいる code の本文（実体参照は解いて数える）
        self._code_text: list[str] | None = None

    def _flow_boundary(self, tag: str) -> None:
        # 行内要素の往復（</em><code> 等）の間だけは「直後」を保つ。
        # ブロック要素の開閉や wbr/br は表示上の連続を切るので、
        # 越えた先の code は「直前の字」も「pdf-tail の直後」も持たない
        if tag not in INLINE_TAIL_SIBLINGS:
            self.last_char = None
            self.last_char_in_tail = False

    def _position(self) -> int:
        row, column = self.getpos()
        return self.line_starts[row - 1] + column

    def _counted(self) -> bool:
        """今いる位置が集計対象（pre・表のセル・見出しの外）か。"""
        return not any(
            tag in COUNT_EXCLUDED_ANCESTORS for tag, _ in self.stack
        )

    def _in_tail(self) -> bool:
        return any("pdf-tail" in classes.split() for _, classes in self.stack)

    def _first_char_after(self, open_tag: str) -> str | None:
        rest = self.markup[self._position() + len(open_tag) :]
        if not rest or rest.startswith("<"):
            return None
        match = re.match(r"&(?:#\d+|#x[0-9A-Fa-f]+|[A-Za-z][\w.-]*);", rest)
        if match:
            decoded = html.unescape(match.group())
            return decoded[0] if decoded else None
        if rest.startswith("&"):
            return "&"
        return rest[0]

    def handle_starttag(self, tag, attrs):
        classes = dict(attrs).get("class") or ""
        if tag == "code" and self._counted() and "pre" not in self.stack:
            if self.last_char_in_tail:
                self.counts["tail_before_code"] += 1
            first = self._first_char_after(self.get_starttag_text() or "<code>")
            if needs_wbr(self.last_char, first) and not self.wbr_before:
                self.counts["missing_wbr"] += 1
            if self._code_text is None:
                self._code_text = []
        self.wbr_before = tag == "wbr"
        self._flow_boundary(tag)
        if tag not in HTML_VOID_ELEMENTS:
            self.stack.append((tag, classes))

    def handle_startendtag(self, tag, attrs):
        self.wbr_before = tag == "wbr"
        self._flow_boundary(tag)

    def handle_endtag(self, tag):
        if tag == "code" and self._code_text is not None:
            if is_split_target("".join(self._code_text)):
                self.counts["unsplit_target"] += 1
            self._code_text = None
        self.wbr_before = False
        self._flow_boundary(tag)
        if self.stack and self.stack[-1][0] == tag:
            self.stack.pop()

    def _data_seen(self, text: str):
        if not text:
            return
        if self._code_text is not None:
            self._code_text.append(text)
        self.last_char = text[-1]
        # 空白だけの字は「直後」を切らない。`…。</span> <code>` も
        # 直後と同じ見え方になるので、字があるときだけ pdf-tail の印を更新する
        if text.strip():
            self.last_char_in_tail = self._in_tail()
        self.wbr_before = False

    def handle_data(self, data):
        self._data_seen(data)

    def handle_entityref(self, name):
        self._data_seen(html.unescape(f"&{name};"))

    def handle_charref(self, name):
        self._data_seen(html.unescape(f"&#{name};"))


def count_html_metrics(markup: str) -> Counter:
    """生成HTMLから ①②③ に関する件数を返す。"""
    scanner = _HtmlMetrics(markup)
    scanner.feed(markup)
    scanner.close()
    return scanner.counts


def _document_stem(path: Path) -> str:
    """`day01-bf910a.html` → `day01`。ハッシュ無しならそのまま。"""
    stem = path.name.split(".", 1)[0]
    return _HASH_SUFFIX_RE.sub("", stem)


def _latest_per_document(paths: list[Path]) -> list[Path]:
    """同じ冊の古い成果物を落とし、冊ごとに最新の1件に絞る。"""
    latest: dict[str, Path] = {}
    for path in paths:
        stem = _document_stem(path)
        if stem not in latest or path.stat().st_mtime > latest[stem].stat().st_mtime:
            latest[stem] = path
    return list(latest.values())


def _counted_code(entry: dict) -> bool:
    """manifest の項目が「本文の行内コード」か。欧文保護の span は除く。"""
    return entry.get("context") == "flow" and entry.get("plain_latin") is not True


def _assign_lines(prose_lines: list[dict], code_rects: list[dict]) -> list[dict]:
    """行の枠とコードの枠を縦位置で1行にまとめる。

    prose_lines の枠はその行のテキスト部分だけを囲む。コードが行頭に来る行は
    枠の左がコードの右側から始まるので、コードの枠を突き合わせて
    「その行の一番左がコード」で行頭判定する。コードしか無い行は
    prose_lines に無いので、コードの枠から行を足す。
    """
    lines = [
        {
            "left": line["rect"]["left"],
            "right": line["rect"]["right"],
            "top": line["rect"]["top"],
            "bottom": line["rect"]["bottom"],
            "width": line["rect"]["width"],
            "has_code": False,
            "starts_with_code": False,
        }
        for line in prose_lines
    ]
    for rect in code_rects:
        center = (rect["top"] + rect["bottom"]) / 2
        hit = None
        for line in lines:
            if line["top"] - _LINE_START_EPSILON_PX <= center <= line["bottom"] + _LINE_START_EPSILON_PX:
                hit = line
                break
        if hit is None:
            # テキストを持たない、コードだけの行
            lines.append({
                "left": rect["left"], "right": rect["right"],
                "top": rect["top"], "bottom": rect["bottom"],
                "width": rect["width"],
                "has_code": True, "starts_with_code": True,
            })
            continue
        hit["has_code"] = True
        if rect["left"] <= hit["left"] + _LINE_START_EPSILON_PX:
            hit["starts_with_code"] = True
        hit["left"] = min(hit["left"], rect["left"])
        hit["right"] = max(hit["right"], rect["right"])
        hit["top"] = min(hit["top"], rect["top"])
        hit["bottom"] = max(hit["bottom"], rect["bottom"])
    return sorted(lines, key=lambda line: line["top"])


def count_layout_metrics(
    layout: dict, manifest: dict, adjustments: list[dict]
) -> Counter:
    """組版の記録から ④⑤⑥ の項目を数える。"""
    counts = Counter()
    entries = {entry["id"]: entry for entry in manifest.get("entries", [])}
    observed = layout.get("dom_audit", {}).get("observed") or []

    # 観測された code のうち③の対象範囲（段落・箇条書き）にいるもの
    in_scope: dict[str, bool] = {}
    body_pt = _FALLBACK_BODY_PT
    sizes: list[float] = []
    paragraphs: dict[tuple, dict] = {}
    for element in observed:
        entry = entries.get(element.get("id"))
        if not entry or not _counted_code(entry):
            continue
        for item in element.get("items", []):
            size = item.get("font_size_pt")
            if isinstance(size, (int, float)):
                sizes.append(size)
            geometry = item.get("flow_geometry") or {}
            dom_path = geometry.get("dom_path") or ""
            in_scope[element["id"]] = _in_split_scope(dom_path)
            if not geometry.get("prose_lines") or not in_scope[element["id"]]:
                continue
            key = (dom_path, round(geometry["rect"]["top"], 1))
            paragraph = paragraphs.setdefault(
                key, {"geometry": geometry, "code_rects": []}
            )
            paragraph["code_rects"] += item.get("line_rects") or []
    if sizes:
        # コードは本文より大きくならないので、観測の最大が本文の大きさ
        body_pt = max(sizes)
    full_width_px = body_pt * _PT_TO_PX * _FULL_WIDTH_CHARS

    for adjustment in adjustments:
        shrunk = (
            adjustment.get("from_pt", 0) - adjustment.get("to_pt", 0)
            >= _SHRINK_EPSILON_PT
        )
        if not shrunk:
            continue
        entry = entries.get(adjustment.get("id"))
        if (
            entry
            and _counted_code(entry)
            and in_scope.get(entry["id"], True)
            and is_split_target(entry.get("expected_text") or "")
        ):
            counts["shrunk_split_target"] += 1

    gap_threshold_px = _GAP_QUARTER_LINE_MM * _MM_TO_PX
    for paragraph in paragraphs.values():
        geometry = paragraph["geometry"]
        marked = _assign_lines(geometry["prose_lines"], paragraph["code_rects"])
        right_edge = (geometry.get("content_rect") or geometry["rect"])["right"]
        for index in range(1, len(marked)):
            line = marked[index]
            if not line["starts_with_code"]:
                continue
            previous = marked[index - 1]
            if right_edge - previous["right"] >= gap_threshold_px:
                counts["quarter_line_gap"] += 1
            if (
                not previous["has_code"]
                and previous["right"] - previous["left"]
                <= full_width_px + _SHORT_LINE_EPSILON_PX
            ):
                counts["short_line_before_code"] += 1
    return counts


def main(argv: list[str]) -> int:
    args = argv[1:] or [str(DEFAULT_BUILD_DIR)]
    if len(args) != 1 or not Path(args[0]).is_dir():
        print("❌ ビルド成果物のディレクトリを1つ指定してください", file=sys.stderr)
        return 2
    build_dir = Path(args[0])

    totals = Counter()
    for html_file in _latest_per_document(sorted(build_dir.glob("*.html"))):
        totals += count_html_metrics(html_file.read_text(encoding="utf-8"))

    manifests = {
        _document_stem(path): path
        for path in _latest_per_document(
            sorted(build_dir.glob("*.inline-manifest.json"))
        )
    }
    layouts = {
        _document_stem(path): path
        for path in _latest_per_document(
            sorted(build_dir.glob("*.inline-layout.json"))
        )
    }
    adjustments = {
        _document_stem(path): path
        for path in _latest_per_document(
            sorted(build_dir.glob("*.inline-adjustment.json"))
        )
    }
    for stem, manifest_path in sorted(manifests.items()):
        layout_path = layouts.get(stem)
        if layout_path is None:
            continue
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        layout = json.loads(layout_path.read_text(encoding="utf-8"))
        adjustment_path = adjustments.get(stem)
        adjustment_rows = (
            json.loads(adjustment_path.read_text(encoding="utf-8"))
            if adjustment_path
            else []
        )
        totals += count_layout_metrics(layout, manifest, adjustment_rows)

    labels = {
        "tail_before_code": "pdf-tail の直後に行内コードがある所",
        "missing_wbr": "改行できない字で始まるのに <wbr> が無いコード",
        "unsplit_target": "分割対象なのに1つの code のままのコード",
        "shrunk_split_target": "分割対象なのに本文より0.1pt以上小さいコード",
        "quarter_line_gap": "前の行の右に1/4行以上の空きがある所",
        "short_line_before_code": "4文字以下の行のすぐ後にコードの行がある所",
    }
    failing = {
        "tail_before_code",
        "missing_wbr",
        "unsplit_target",
        "shrunk_split_target",
    }
    for key, label in labels.items():
        mark = "❌" if key in failing and totals[key] else "  "
        print(f"{mark} {label}: {totals[key]} 件")
    if any(totals[key] for key in failing):
        print("❌ 行内コードの組版がまだ直っていない所があります")
        return 1
    print("✅ 行内コードの組版前処理と縮小の条件をすべて満たしています")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
