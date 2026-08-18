#!/usr/bin/env python3
"""教材Markdownから、そのまま販売できる体裁のPDFを1日1冊ずつ組む。

PDFは商品そのもの（購入者が読む成果物）だが、これまでは Markdown を書いたあと
Google Docs に手で貼り付けて体裁を整えてから書き出していた。36本ぶん、原稿を
1行直すたびに同じ作業が発生していた。ここを消すためのスクリプト。

既存の `make pdf-all`（md-mermaid-to-pdf）を置き換えるものではなく併存させる。
既存経路は出力に実測で以下の欠陥があり、商品として出せなかった:
  - 長いコード行の末尾が消える（`overflow-x: auto` は紙ではスクロールできない）
  - 表紙・目次・柱・ノンブル・図表番号が無い
  - フォント指定に Linux 用のエントリが無く、生成機械で見た目が変わる

組版は Vivliostyle（CSS組版）に任せる。このスクリプトの仕事は、素の Markdown を
「本」にするために足りない部分だけを補うこと:
  1. H1 から表紙を起こす
  2. H2 を拾って、ページ番号付きの目次を作る
  3. mermaid を SVG へ焼く（Vivliostyle は mermaid を解釈しない）
  4. 柱の文字列と、埋め込みフォントの @font-face を1冊ぶんのCSSとして書き出す

出力先は material/ の外（dist/pdf/）に置く。scripts/build-zip.sh は material/ を
除外なしで rsync するため、material/ 配下に置くと販売ZIPに商品外のPDFが混入する。
フィルタで防ぐのではなく、置き場所で構造的に起こり得なくする。
"""

from __future__ import annotations

import base64
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import sys
from functools import cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

# フェンスの開閉判定は curriculum-qa の共通処理を使う。自前で数え直すと、
# チルダのフェンスや入れ子の4連フェンスで対応が1つずれる（あのモジュールが
# 8本の検査から切り出された理由がそれ）。
sys.path.insert(0, str(REPO_ROOT / "scripts" / "curriculum-qa"))
from markdown_scan import fence_states  # noqa: E402

SRC_DIR = REPO_ROOT / "material" / "30days-curriculum"
BOOK_CSS = REPO_ROOT / "material" / "style" / "book.css"
OUT_DIR = REPO_ROOT / "dist" / "pdf"
WORK_DIR = REPO_ROOT / "dist" / ".pdf-book-build"

# 組版と作図の道具は devDependencies に入れず、バージョンを固定して npx で都度呼ぶ。
#
# @vivliostyle/cli は依存ツリーに high 3件（vfm → remark-parse → trim の ReDoS）を
# 持ち込み、`npm audit --audit-level=high` の CI を通らない。
# @mermaid-js/mermaid-cli は puppeteer(フル版)を連れてきて Chrome を約650MB 落とす。
# どちらも教材PDFを組むときだけ要る道具で、`npm ci` が走る CI と Vercel には要らない。
# 再現性はここのバージョン固定で担保する。
VIVLIOSTYLE_CLI = "@vivliostyle/cli@11.1.0"
THEME = "@vivliostyle/theme-techbook@2.0.2"
MERMAID_CLI = "@mermaid-js/mermaid-cli@11.16.0"
# 外部プロセスが返らんときの上限。36本を通しで回すので、1本の停止で全体を落とさない
BUILD_TIMEOUT = 900
MERMAID_TIMEOUT = 180

# 埋め込むフォント (npmパッケージ, パッケージ内のパス, @font-face の family, weight, format)。
#
# 本文と等幅は「分割していない全部入り」を使う。@fontsource の日本語・latin サブセットは
# 罫線(─ │ └ ├)と矢印(→ ←)を落としており、教材ではその2種だけで 400回以上出る。
# ディレクトリ図の罫線が等幅フォントから外れると桁が揃わず、図として読めなくなる。
# 記号と絵文字は本体側に無いので、不足分だけを後ろに足す。
FONT_SOURCES = (
    ("@expo-google-fonts/biz-udpgothic", "400Regular/BIZUDPGothic_400Regular.ttf",
     "BIZ UDPGothic", 400, "truetype"),
    ("@expo-google-fonts/biz-udpgothic", "700Bold/BIZUDPGothic_700Bold.ttf",
     "BIZ UDPGothic", 700, "truetype"),
    ("@expo-google-fonts/jetbrains-mono", "400Regular/JetBrainsMono_400Regular.ttf",
     "JetBrains Mono", 400, "truetype"),
    ("@expo-google-fonts/jetbrains-mono", "700Bold/JetBrainsMono_700Bold.ttf",
     "JetBrains Mono", 700, "truetype"),
    # ✅ ❌ ⚠ ▪ 用。カラー絵文字だと環境ごとに絵柄が変わるので単色版を積む。
    ("@fontsource/noto-emoji", "files/noto-emoji-emoji-400-normal.woff2",
     "Noto Emoji", 400, "woff2"),
    # ☐ 用。上のどれにも無い文字の最後の受け皿でもある。
    ("@fontsource/dejavu-sans", "files/dejavu-sans-latin-400-normal.woff2",
     "DejaVu Sans", 400, "woff2"),
)

# 「絵文字として描け」を意味する異体字セレクタ16。教材では ⚠ の直後に付く。
EMOJI_VARIATION_SELECTOR = "\ufe0f"

SERIES_NAME = "task-app 30日間カリキュラム"
COLOPHON = "Next.js 15 / TypeScript / Prisma / tRPC"

H1_RE = re.compile(r"^#\s+(.+?)\s*$")
H2_RE = re.compile(r"^##\s+(?!#)(.+?)\s*$")
HEADING_RE = re.compile(r"^#{2,6}\s+(.+?)\s*$")
ANCHOR_SUFFIX_RE = re.compile(r"\s*\{#[^}]*\}\s*$")
DAY_RE = re.compile(r"^(Day\s*\d+)\s*[:：]\s*(.+)$")
# 目次の見出し文字列から、行内マークダウンの記号だけ落とす
INLINE_MD_RE = re.compile(r"`([^`]*)`|\*\*([^*]*)\*\*|\[([^\]]*)\]\([^)]*\)")


def find_browser() -> str | None:
    """Chromium の実行ファイルを探す。見つからなければ None。

    見つからない場合は Vivliostyle が自前で取得するので、失敗にはしない。
    """
    explicit = os.environ.get("PDF_BOOK_BROWSER")
    if explicit:
        if Path(explicit).exists():
            return explicit
        # 黙って別のブラウザへ落ちると、指定したつもりの環境と別の字形で組まれる
        print(f"⚠️  PDF_BOOK_BROWSER のパスが見つかりません: {explicit}", file=sys.stderr)
        print("   指定を無視して探索を続けます", file=sys.stderr)
    roots = [Path(os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers"))]
    roots.append(Path.home() / "Library" / "Caches" / "ms-playwright")
    for root in roots:
        # Playwright 1.53 以降の Chrome for Testing は chrome-linux64 に入る。
        # 旧レイアウト(chrome-linux)も残るので両方見る
        for pattern in ("chromium-*/chrome-linux/chrome",
                        "chromium-*/chrome-linux64/chrome",
                        "chromium-*/chrome-mac/Chromium.app/Contents/MacOS/Chromium"):
            hits = sorted(root.glob(pattern)) if root.is_dir() else []
            if hits:
                return str(hits[-1])
    for mac in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",):
        if Path(mac).exists():
            return mac
    return None


def strip_inline_markdown(text: str) -> str:
    """見出しから行内マークダウンの記号を落とす。目次に記号を出さないため。"""
    return INLINE_MD_RE.sub(lambda m: next(g for g in m.groups() if g is not None), text)


def split_title(title: str) -> tuple[str, str]:
    """H1 を（表紙の大見出し, 副題）に割る。

    day 教材は `# Day 01: 副題` だが、付録や目次は `# 用語集` のように
    Day 番号を持たない。後者は大見出しを空にして副題だけ出す。
    """
    matched = DAY_RE.match(title)
    if matched:
        return matched.group(1).strip(), matched.group(2).strip()
    return "", title


def parse_source(text: str) -> tuple[str, list[str], list[tuple[str, str]]]:
    """本文を1度なめて、H1・本文行・目次項目を取り出す。

    フェンスの開閉は markdown_scan に任せる。教材には `## ` で始まる行を含む
    コードブロックがあり、素の正規表現では拾ってしまう。チルダのフェンスや
    入れ子の4連フェンスまで正しく数えるのは、あのモジュールの担当。
    """
    title = ""
    body: list[str] = []
    toc: list[tuple[str, str]] = []

    for _, line, state, _ in fence_states(text):
        if state != "outside":
            body.append(line)
            continue

        if not title:
            h1 = H1_RE.match(line)
            if h1:
                title = h1.group(1)
                continue

        h2 = H2_RE.match(line)
        if h2:
            anchor = f"s{len(toc) + 1}"
            toc.append((anchor, strip_inline_markdown(h2.group(1))))
            body.append(f"## {h2.group(1)} {{#{anchor}}}")
            continue

        body.append(line)

    return title, body, toc


def convert_mermaid(body: list[str], stem: str, work: Path,
                    env: dict[str, str]) -> tuple[list[str], int, list[str]]:
    """```mermaid ブロックを SVG に焼いて画像参照へ置き換える。

    SVG は work（dist 配下）へ出す。material/ 配下に置くと
    check_unused_image.py が「参照されていない画像」として弾く。
    """
    out: list[str] = []
    errors: list[str] = []
    buffer: list[str] = []
    in_mermaid = False
    count = 0
    # 図のキャプションには直前の見出しを使う。テーマが付ける「図N: 」の後ろに
    # 何を置くかであり、ここに「図1」と書くと「図 1: 図1」と二重になる。
    caption = "図解"

    for _, line, state, fence in fence_states("\n".join(body)):
        if state == "outside":
            heading = HEADING_RE.match(line)
            if heading:
                # parse_source が H2 に付けた {#sN} は見出し文ではないので落とす
                text = ANCHOR_SUFFIX_RE.sub("", heading.group(1))
                caption = strip_inline_markdown(text).replace("[", "").replace("]", "")
            out.append(line)
            continue

        if state == "open":
            in_mermaid = fence.lang == "mermaid"
            buffer = []
            if not in_mermaid:
                out.append(line)
            continue

        if state == "inside":
            (buffer if in_mermaid else out).append(line)
            continue

        # state == "close"
        if not in_mermaid:
            out.append(line)
            continue
        count += 1
        svg = work / f"{stem}-{count}.svg"
        source = work / f"{stem}-{count}.mmd"
        source.write_text("\n".join(buffer) + "\n", encoding="utf-8")
        try:
            result = subprocess.run(
                ["npx", "--yes", MERMAID_CLI,
                 "-i", str(source), "-o", str(svg), "-b", "transparent",
                 "-c", str(work / "mermaid.json"),
                 "-p", str(work / "puppeteer.json")],
                capture_output=True, text=True, cwd=work, env=env,
                timeout=MERMAID_TIMEOUT,
            )
        except subprocess.TimeoutExpired:
            # 図が出ないだけで本文は組める。既存の失敗経路に合流させ、原文を残す
            result = subprocess.CompletedProcess(
                args=[], returncode=1, stdout="",
                stderr=f"{MERMAID_TIMEOUT}秒を超えても描画が返りませんでした",
            )
        except OSError as error:
            # npx が無い環境でも、図を諦めれば本文は組める
            result = subprocess.CompletedProcess(
                args=[], returncode=1, stdout="",
                stderr=f"mermaid-cli を起動できません: {error}",
            )
        if svg.exists():
            embed_font(svg)
            out += ["", f"![{caption}]({svg.name})", ""]
        else:
            errors.append(
                f"図{count} の描画に失敗: "
                f"{(result.stderr or result.stdout).strip()[-200:]}"
            )
            out.extend(["```mermaid", *buffer, "```"])
        in_mermaid = False

    return out, count, errors


@cache
def diagram_font_face() -> str:
    """図の中で使う書体を、data URI にした @font-face として返す。

    SVG は <img> として読まれるため独立した文書になり、本文側の @font-face が届かない。
    mermaid 既定の書体（trebuchet ms / verdana / arial）はどれも手元に無いので、
    組む機械のフォントへ落ちる。実測では図を含む全冊に LiberationSans と
    WenQuanYiZenHei が混ざり、図の中の日本語だけ中国語字形になっていた。

    画像として読まれた SVG は外部URLを取りに行けないが、data URI なら使える。
    本文と同じ実体を SVG の中へ入れて、図と本文の書体を一致させる。
    """
    ttf = REPO_ROOT / "node_modules" / FONT_SOURCES[0][0] / FONT_SOURCES[0][1]
    encoded = base64.b64encode(ttf.read_bytes()).decode("ascii")
    return (
        "<style>@font-face{"
        f"font-family:'{FONT_SOURCES[0][2]}';font-style:normal;font-weight:400;"
        f"src:url(data:font/ttf;base64,{encoded}) format('truetype');"
        "}</style>"
    )


def embed_font(svg: Path) -> None:
    """SVG の開始タグ直後に @font-face を差し込む。"""
    markup = svg.read_text(encoding="utf-8")
    svg.write_text(
        re.sub(r"(<svg\b[^>]*>)", lambda m: m.group(1) + diagram_font_face(),
               markup, count=1),
        encoding="utf-8",
    )


def build_front_matter(title: str, toc: list[tuple[str, str]]) -> str:
    """表紙と目次を組み立てる。

    目次は id="toc" role="doc-toc" を付ける。theme-base がこのセレクタに対して
    リーダー点とページ番号（target-counter）を実装しており、自前で書くより正確。
    """
    day, subtitle = split_title(title)
    day_line = f'<p class="day">{html.escape(day)}</p>\n' if day else ""
    items = "\n".join(
        f'<li><a href="#{anchor}">{html.escape(text)}</a></li>' for anchor, text in toc
    )
    return (
        '<div class="cover">\n'
        f'<p class="series">{html.escape(SERIES_NAME)}</p>\n'
        f"{day_line}"
        f'<p class="title">{html.escape(subtitle)}</p>\n'
        f'<p class="meta">{html.escape(COLOPHON)}</p>\n'
        "</div>\n\n"
        '<nav id="toc" role="doc-toc">\n\n'
        "## 目次\n\n"
        f"<ol>\n{items}\n</ol>\n\n"
        "</nav>\n\n"
    )


def build_book_css(running_header: str) -> str:
    """1冊ぶんのCSS。埋め込みフォントと柱の文字列だけを持つ。"""
    faces = "\n".join(
        f"@font-face {{\n"
        f"  font-family: '{family}';\n"
        f"  font-style: normal;\n"
        f"  font-weight: {weight};\n"
        f"  font-display: block;\n"
        f"  src: url('fonts/{Path(path).name}') format('{fmt}');\n"
        f"}}"
        for _, path, family, weight, fmt in FONT_SOURCES
    )
    header = running_header.replace("\\", "\\\\").replace('"', '\\"')
    return (
        "/* build_pdf_book.py が1冊ごとに生成する。手で編集しない。 */\n\n"
        "/* システム導入フォントに依存させない。依存させると mac と CI で書体が変わる */\n"
        f"{faces}\n\n"
        "/* 1冊=1日なので柱は固定文字列でよい。見開きの左右どちらにも同じ文字を出す */\n"
        ":root {\n"
        f'  --vs-theme--page-top-left-content: "{header}";\n'
        f'  --vs-theme--page-top-right-content: "{header}";\n'
        "}\n"
    )


def prepare_work_dir() -> None:
    """作業ディレクトリを作り直し、フォントと画像を配置する。"""
    if WORK_DIR.exists():
        shutil.rmtree(WORK_DIR)
    (WORK_DIR / "fonts").mkdir(parents=True)
    for package, path, _, _, _ in FONT_SOURCES:
        source = REPO_ROOT / "node_modules" / package / path
        if not source.exists():
            raise FileNotFoundError(f"{source} が無い。npm install を先に実行する")
        shutil.copy2(source, WORK_DIR / "fonts" / source.name)
    # 原稿は ./screenshots/... の相対参照なので、同じ位置関係を作る
    (WORK_DIR / "screenshots").symlink_to(SRC_DIR / "screenshots")
    # -T に作業ディレクトリの外を指す絶対パスを渡すと、Vivliostyle は
    # そのCSSを黙って無視する（ビルドは成功し、テーマ既定の見た目で出てしまう）。
    # 原稿と同じ場所に置いて相対パスで渡す。
    shutil.copy2(BOOK_CSS, WORK_DIR / "book.css")
    # root で走るコンテナ・CI では Chromium がサンドボックスを張れず起動に失敗する。
    # 非rootの手元環境ではサンドボックスを外さない。
    args = ["--no-sandbox"] if hasattr(os, "geteuid") and os.geteuid() == 0 else []
    (WORK_DIR / "puppeteer.json").write_text(
        json.dumps({"args": args}), encoding="utf-8"
    )
    # 図の中の書体を本文に合わせる。指定しないと mermaid 既定の
    # trebuchet ms / verdana / arial になり、どれも無い環境では別の書体に落ちる。
    (WORK_DIR / "mermaid.json").write_text(
        json.dumps({"themeVariables": {"fontFamily": FONT_SOURCES[0][2]}}),
        encoding="utf-8",
    )


def work_slug(stem: str) -> str:
    """作業ディレクトリ側で使う短い ASCII 名を返す。

    Vivliostyle は中間ファイルの URL から要素 ID（viv-id-...）を組み立て、それをそのまま
    PDF の name token に書く。日本語のファイル名はここでパーセントエンコードされて
    1文字あたり7バイトに膨らみ、`day05_ログイン画面のUI` で 263 バイトに達する。
    PDF 仕様の name token 上限 127 バイトを超えるため、poppler は読むたびに
    「name token is longer than what the specification says」を出し続ける。
    出力 PDF の名前は日本語のまま残したいので、作業側だけを ASCII に落とす。

    先頭の ASCII 部分だけでは appendix_* の4本が衝突する。元の名前のハッシュを足して
    一意にする。1本だけ組む経路でも同じ名前が出るよう、ハッシュはバッチ全体ではなく
    ファイル名だけから決める。

    頭を6文字で切るのは、`day03_GitHub` のように題名側にも ASCII が続く名前があるため。
    切らないと ID が 128 バイトに達して上限を1バイト超える。ID には URL とタイムスタンプと
    見出しアンカーで約110バイトが先に埋まっており、名前に使えるのは残りだけになる。
    """
    head = re.match(r"[A-Za-z0-9_-]*", stem).group(0)[:6].strip("_-") or "book"
    return f"{head}-{hashlib.sha256(stem.encode('utf-8')).hexdigest()[:6]}"


def build_one(path: Path, browser: str | None, env: dict[str, str]) -> list[str]:
    """1本を PDF にする。問題があれば説明の一覧を返す（空なら成功）。"""
    stem = path.stem
    slug = work_slug(stem)
    # U+FE0F（異体字セレクタ16）は「絵文字として描け」という指定。付いていると
    # Chromium が単色の Noto Emoji を無視してシステムのカラー絵文字フォントを呼び、
    # 生成機械に依存する上に Type 3 で埋め込まれる。紙面では単色でよいので外す。
    title, body, toc = parse_source(
        path.read_text(encoding="utf-8").replace(EMOJI_VARIATION_SELECTOR, "")
    )
    if not title:
        return [f"{path.name}: H1 が無い"]

    body, figures, problems = convert_mermaid(body, slug, WORK_DIR, env)

    document = WORK_DIR / f"{slug}.md"
    document.write_text(
        build_front_matter(title, toc) + "\n".join(body), encoding="utf-8"
    )
    per_book_css = WORK_DIR / f"{slug}.css"
    per_book_css.write_text(build_book_css(title), encoding="utf-8")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    output = OUT_DIR / f"{stem}.pdf"
    command = [
        "npx", "--yes", VIVLIOSTYLE_CLI, "build", document.name,
        # -T を並べる。自前CSSの @import でテーマを読むと解決されず、
        # テーマ由来の @page 定義ごと失われて柱とノンブルが全ページから消える。
        # パスは作業ディレクトリからの相対にする（絶対パスは無視される）。
        "-T", THEME, "-T", "./book.css", "-T", f"./{per_book_css.name}",
        "-s", "A4",
        # 図表番号の「図N:」「表N:」は theme-base の :root:lang(ja) に入っている。
        # lang を渡さないと英語の "Figure N: " が出る。
        "-l", "ja",
        # 渡さないと Vivliostyle が最初の見出しを拾い、PDFのタイトル欄が「目次」になる
        "--title", title,
        "-o", str(output),
    ]
    if browser:
        command += ["--executable-browser", browser]

    if output.exists():
        output.unlink()
    try:
        result = subprocess.run(
            command, capture_output=True, text=True, cwd=WORK_DIR, env=env,
            timeout=BUILD_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        # 例外のまま抜けると、ここまでに集めた他の冊の問題ごと落ちる
        problems.append(f"{path.name}: 組版が{BUILD_TIMEOUT}秒を超えました")
        return problems
    except OSError as error:
        problems.append(f"{path.name}: 組版コマンドを起動できません: {error}")
        return problems
    if not output.exists():
        problems.append(
            f"{path.name}: 組版に失敗: {(result.stderr or result.stdout).strip()[-300:]}"
        )
        return problems

    # ページ数は進捗表示のためだけに読む。poppler が無い環境でも組版は続ける
    try:
        pages = subprocess.run(
            ["pdfinfo", str(output)], capture_output=True, text=True, timeout=60
        ).stdout
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pages = ""
    page_count = pages.split("Pages:")[1].split()[0] if "Pages:" in pages else "?"
    print(f"  {stem}  {page_count}ページ / 見出し{len(toc)} / 図{figures}", flush=True)
    return problems


def main(argv: list[str]) -> int:
    targets = [Path(a) for a in argv[1:]] or sorted(SRC_DIR.glob("*.md"))
    if not targets:
        print(f"対象の Markdown が無い: {SRC_DIR}", file=sys.stderr)
        return 2
    missing = [t for t in targets if not t.is_file()]
    if missing:
        print("見つからない: " + ", ".join(str(m) for m in missing), file=sys.stderr)
        return 2
    browser = find_browser()
    env = dict(os.environ)
    if browser:
        # 手元の Chromium を使い回す。指定しないと mermaid-cli の puppeteer が
        # 約650MB の Chrome を毎回取りに行く。
        env["PUPPETEER_EXECUTABLE_PATH"] = browser
        env["PUPPETEER_SKIP_DOWNLOAD"] = "true"

    try:
        prepare_work_dir()
    except OSError as error:
        print(f"作業ディレクトリを用意できない: {error}", file=sys.stderr)
        return 2
    print(f"{len(targets)}本を組む（出力: {OUT_DIR.relative_to(REPO_ROOT)}）", flush=True)

    problems: list[str] = []
    for path in targets:
        problems += build_one(path, browser, env)

    if problems:
        print("\n以下が未解決:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    print(f"\n{len(targets)}本すべて生成した", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
