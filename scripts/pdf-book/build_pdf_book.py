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
import tempfile
from datetime import datetime, timezone
from functools import cache
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

# フェンスの開閉判定は curriculum-qa の共通処理を使う。自前で数え直すと、
# チルダのフェンスや入れ子の4連フェンスで対応が1つずれる（あのモジュールが
# 8本の検査から切り出された理由がそれ）。
sys.path.insert(0, str(REPO_ROOT / "scripts" / "curriculum-qa"))
sys.path.insert(0, str(REPO_ROOT / "scripts" / "pdf-book"))
from markdown_scan import fence_states  # noqa: E402
from code_wrap import unsafe_runs, wrap_code_in_html  # noqa: E402
from inline_layout import annotate_inline_code, validate_annotated_html  # noqa: E402
from table_latin import keep_block_tails, protect_prose_latin, protect_table_latin
from table_structure import restructure_tables, measured_tables_to_stack  # noqa: E402
from inline_layout_css import (  # noqa: E402
    HEADING_INLINE_CSS,
    NOWRAP_CSS,
    derive_flow_css,
    derive_table_css,
)
from table_layout_override import (  # noqa: E402
    derive_reviewed_table_css,
    load_table_layout_overrides,
    validate_override_document_catalog,
)

SRC_DIR = REPO_ROOT / "material" / "30days-curriculum"
BOOK_CSS = REPO_ROOT / "material" / "style" / "book.css"
TABLE_LAYOUT_OVERRIDES = Path(__file__).with_name("table-layout.json")
OUT_DIR = REPO_ROOT / "dist" / "pdf"
WORK_DIR = REPO_ROOT / "dist" / ".pdf-book-build"
RELEASE_RECEIPT = REPO_ROOT / "dist" / "release-build-receipt.json"
TOOLCHAIN_DIR = REPO_ROOT / "dist" / ".pdf-book-toolchain"
EXPECTED_RELEASE_BOOKS = 36

# 組版と作図の道具は devDependencies に入れず、バージョンを固定して npx で都度呼ぶ。
#
# @vivliostyle/cli は依存ツリーに high 3件（vfm → remark-parse → trim の ReDoS）を
# 持ち込み、`npm audit --audit-level=high` の CI を通らない。
# @mermaid-js/mermaid-cli は puppeteer(フル版)を連れてきて Chrome を約650MB 落とす。
# どちらも教材PDFを組むときだけ要る道具で、`npm ci` が走る CI と Vercel には要らない。
# 要求する版はここで固定する。全冊ビルドでは隔離環境へ解決したあと、その実バイトも
# receipt に含めるため、同じ識別文字列から別の内容が実行された場合も区別できる。
VIVLIOSTYLE_CLI = "@vivliostyle/cli@11.1.0"
# cli@11.1.0 が内部で使う vfm と同じ版。md→HTML を自前で回して <wbr> を挿入するため、
# 別版で変換すると Prism の出力構造がずれ得るので版を合わせる
VFM_CLI = "@vivliostyle/vfm@2.7.0"
THEME = "@vivliostyle/theme-techbook@2.0.2"
MERMAID_CLI = "@mermaid-js/mermaid-cli@11.16.0"
# 外部プロセスが返らんときの上限。36本を通しで回すので、1本の停止で全体を落とさない
BUILD_TIMEOUT = 900
MERMAID_TIMEOUT = 180
VFM_TIMEOUT = 120

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

IMAGE_RE = re.compile(r"!\[[^\]]*\]\(\s*<?([^\s)>]+)>?")


def _hash_file_stably(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        before = os.fstat(stream.fileno())
        size = 0
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
            size += len(chunk)
        after = os.fstat(stream.fileno())
    before_signature = (
        before.st_dev, before.st_ino, before.st_mode, before.st_size,
        before.st_mtime_ns, before.st_ctime_ns,
    )
    after_signature = (
        after.st_dev, after.st_ino, after.st_mode, after.st_size,
        after.st_mtime_ns, after.st_ctime_ns,
    )
    if before_signature != after_signature or size != before.st_size:
        raise OSError(f"ハッシュ計算中にファイルが変わった: {path}")
    return digest.hexdigest(), size


def sha256_file(path: Path) -> str:
    return _hash_file_stably(path)[0]


def _framed(digest, value: bytes) -> None:
    digest.update(len(value).to_bytes(8, "big"))
    digest.update(value)


def _record_file(path: Path, label: str, digest) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f"リリース入力が無い: {label}")
    file_sha, size = _hash_file_stably(path)
    _framed(digest, label.encode("utf-8"))
    _framed(digest, bytes.fromhex(file_sha))
    return {"file": label, "size": size, "sha256": file_sha}


def _hash_tree_stably(root: Path) -> dict:
    """実行時に解決した npm パッケージ群の名前・リンク先・実バイトを固定する。"""
    if not root.is_dir():
        raise FileNotFoundError(f"パッケージ実体が無い: {root}")
    digest = hashlib.sha256()
    count = 0
    size = 0
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root).as_posix().encode("utf-8")
        if path.is_symlink():
            try:
                resolved = path.resolve(strict=True)
                resolved.relative_to(root.resolve(strict=True))
            except (FileNotFoundError, ValueError) as error:
                raise OSError(f"toolchain外または壊れたsymlinkを拒否: {path}") from error
            _framed(digest, b"symlink")
            _framed(digest, relative)
            _framed(digest, os.readlink(path).encode("utf-8"))
            count += 1
        elif path.is_file():
            file_sha, file_size = _hash_file_stably(path)
            _framed(digest, b"file")
            _framed(digest, relative)
            _framed(digest, bytes.fromhex(file_sha))
            count += 1
            size += file_size
    return {"file_count": count, "size": size, "sha256": digest.hexdigest()}


def _toolchain_paths(root: Path) -> dict[str, str]:
    modules = root / "node_modules"
    return {
        "root": str(root),
        "vivliostyle_bin": str(modules / ".bin" / "vivliostyle"),
        "vfm_bin": str(modules / ".bin" / "vfm"),
        "mermaid_bin": str(modules / ".bin" / "mmdc"),
        "theme_path": str(modules / "@vivliostyle" / "theme-techbook"),
    }


def prepare_release_toolchain(env: dict[str, str]) -> dict[str, str]:
    """全冊証跡用の隔離環境へ固定版を解決し、その実体を直接実行できる形で返す。"""
    TOOLCHAIN_DIR.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=".pdf-book-toolchain-", dir=TOOLCHAIN_DIR.parent))
    identifiers = [VIVLIOSTYLE_CLI, VFM_CLI, THEME, MERMAID_CLI]
    dependencies = {identifier.rsplit("@", 1)[0]: identifier.rsplit("@", 1)[1]
                    for identifier in identifiers}
    (staging / "package.json").write_text(
        json.dumps({"private": True, "dependencies": dependencies}) + "\n",
        encoding="utf-8",
    )
    try:
        result = subprocess.run(
            ["npm", "install", "--ignore-scripts", "--package-lock=true"],
            cwd=staging, env=env, capture_output=True, text=True, timeout=BUILD_TIMEOUT,
        )
        if result.returncode != 0:
            raise OSError(f"PDFツールの解決に失敗: {(result.stderr or result.stdout)[-300:]}")
        if TOOLCHAIN_DIR.exists():
            shutil.rmtree(TOOLCHAIN_DIR)
        staging.replace(TOOLCHAIN_DIR)
    except Exception:
        shutil.rmtree(staging, ignore_errors=True)
        raise

    modules = TOOLCHAIN_DIR / "node_modules"
    for identifier in identifiers:
        expected_name, expected_version = identifier.rsplit("@", 1)
        package_json = modules / expected_name / "package.json"
        try:
            package = json.loads(package_json.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            shutil.rmtree(TOOLCHAIN_DIR, ignore_errors=True)
            raise OSError(f"PDFツールのpackage.jsonを読めません: {identifier}") from error
        if package.get("name") != expected_name or package.get("version") != expected_version:
            shutil.rmtree(TOOLCHAIN_DIR, ignore_errors=True)
            raise OSError(
                f"PDFツールの解決版が指定と違います: {identifier} -> "
                f"{package.get('name')}@{package.get('version')}"
            )
    toolchain = _toolchain_paths(TOOLCHAIN_DIR)
    for key in ("vivliostyle_bin", "vfm_bin", "mermaid_bin"):
        if not Path(toolchain[key]).exists():
            raise FileNotFoundError(f"PDFツールの実行ファイルが無い: {toolchain[key]}")
    if not Path(toolchain["theme_path"]).is_dir():
        raise FileNotFoundError(f"PDFテーマの実体が無い: {toolchain['theme_path']}")
    # .bin やパッケージ内のリンクが隔離環境の外へ抜けると、receipt がリンク文字列しか
    # 固定せず実行バイトを拘束できない。全リンクの解決先が内部にあることを先に確かめる。
    _hash_tree_stably(TOOLCHAIN_DIR)
    return toolchain


def referenced_images(sources: list[Path]) -> list[Path]:
    # 組版時は screenshots ディレクトリ全体を作業領域へ見せる。参照記法の種類に
    # 左右されず、その実入力をすべて証跡へ含める。
    screenshots = SRC_DIR / "screenshots"
    images: set[Path] = (
        {path.resolve() for path in screenshots.rglob("*") if path.is_file()}
        if screenshots.is_dir()
        else set()
    )
    for source in sources:
        text = source.read_text(encoding="utf-8")
        for match in IMAGE_RE.finditer(text):
            target = match.group(1)
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc or target.startswith("#"):
                continue
            path = (source.parent / unquote(parsed.path)).resolve()
            try:
                path.relative_to(SRC_DIR.resolve())
            except ValueError as error:
                raise ValueError(f"教材外の画像参照: {source.name}: {target}") from error
            images.add(path)
    return sorted(images)


def release_input_snapshot(
    sources: list[Path], link_map_filename: str | None, browser: str | None,
    toolchain: dict[str, str] | None = None,
) -> dict:
    """全冊PDFを左右する入力実体を、ビルド前後で比較できる形にする。"""
    if toolchain is None and TOOLCHAIN_DIR.is_dir():
        # release_manifest から現在値を再計算するときも、実ビルドが残した同じ
        # 解決済み環境を含める。消失していれば aggregate が一致せず出荷を止める。
        toolchain = _toolchain_paths(TOOLCHAIN_DIR)
    digest = hashlib.sha256()
    files: list[dict] = []
    fixed = [
        Path(__file__).resolve(),
        Path(__file__).with_name("code_wrap.py").resolve(),
        Path(__file__).with_name("inline_layout.py").resolve(),
        Path(__file__).with_name("table_structure.py").resolve(),
        Path(__file__).with_name("table_latin.py").resolve(),
        Path(__file__).with_name("inline_layout_css.py").resolve(),
        Path(__file__).with_name("table_layout_override.py").resolve(),
        TABLE_LAYOUT_OVERRIDES.resolve(),
        Path(__file__).with_name("verify-inline-layout.mjs").resolve(),
        Path(__file__).with_name("verify-inline-pdf.mjs").resolve(),
        (REPO_ROOT / "scripts" / "curriculum-qa" / "markdown_scan.py").resolve(),
        BOOK_CSS.resolve(),
        (REPO_ROOT / "package-lock.json").resolve(),
    ]
    file_inputs = [*sorted(sources), *referenced_images(sources), *fixed]
    for package, path, _, _, _ in FONT_SOURCES:
        file_inputs.append((REPO_ROOT / "node_modules" / package / path).resolve())
    link_map_path = Path(link_map_filename).resolve() if link_map_filename else None
    if link_map_path:
        file_inputs.append(link_map_path)

    for path in file_inputs:
        try:
            label = str(path.relative_to(REPO_ROOT.resolve()))
        except ValueError:
            label = str(path)
        files.append(_record_file(path, label, digest))

    tool_identifiers = {
        "vivliostyle_cli": VIVLIOSTYLE_CLI,
        "vfm": VFM_CLI,
        "theme": THEME,
        "mermaid_cli": MERMAID_CLI,
    }
    tools = []
    for name, identifier in sorted(tool_identifiers.items()):
        identifier_sha = hashlib.sha256(identifier.encode()).hexdigest()
        _framed(digest, f"tool:{name}".encode())
        _framed(digest, bytes.fromhex(identifier_sha))
        tools.append({
            "name": name,
            "identifier": identifier,
            "identifier_sha256": identifier_sha,
        })
    resolved_toolchain = None
    if toolchain:
        root = Path(toolchain["root"]).resolve()
        resolved_toolchain = _hash_tree_stably(root)
        resolved_toolchain["root"] = str(root)
        _framed(digest, b"resolved-toolchain")
        _framed(digest, bytes.fromhex(resolved_toolchain["sha256"]))
        for item in tools:
            package_name = item["identifier"].rsplit("@", 1)[0]
            package_root = root / "node_modules" / package_name
            package_record = _hash_tree_stably(package_root)
            item["resolved"] = {
                "path": str(package_root),
                **package_record,
            }
            _framed(digest, f"resolved:{item['name']}".encode())
            _framed(digest, bytes.fromhex(package_record["sha256"]))
        if _hash_tree_stably(root) != {
            key: resolved_toolchain[key] for key in ("file_count", "size", "sha256")
        }:
            raise OSError("解決済みPDFツールをハッシュ中に実体が変わりました")
    browser_record = None
    if browser:
        browser_path = Path(browser).resolve()
        browser_record = _record_file(browser_path, "tool:browser", digest)
        browser_record["path"] = str(browser_path)

    return {
        "source_count": len(sources),
        "source_pdf_names": [path.with_suffix(".pdf").name for path in sorted(sources)],
        "link_map_file": str(link_map_path) if link_map_path else None,
        "files": files,
        "tools": tools,
        "resolved_toolchain": resolved_toolchain,
        "browser": browser_record,
        "aggregate_sha256": digest.hexdigest(),
    }


def release_output_snapshot(sources: list[Path]) -> list[dict]:
    outputs = []
    for source in sorted(sources):
        output = OUT_DIR / source.with_suffix(".pdf").name
        if not output.is_file() or output.stat().st_size <= 0:
            raise FileNotFoundError(f"全冊ビルドの出力が無いか空: {output.name}")
        output_sha, output_size = _hash_file_stably(output)
        outputs.append({
            "name": output.name,
            "size": output_size,
            "sha256": output_sha,
        })
    return outputs


def write_release_receipt(inputs: dict, outputs: list[dict]) -> None:
    receipt = {
        "version": 1,
        "scope": "full-36-book-build",
        "built_at": datetime.now(timezone.utc).isoformat(),
        "inputs": inputs,
        "outputs": outputs,
    }
    RELEASE_RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    temporary = RELEASE_RECEIPT.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(RELEASE_RECEIPT)

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


LINK_MAP_HELP = (
    'PDF_BOOK_LINK_MAP に配布先JSONを指定してください。'
    '例: PDF_BOOK_LINK_MAP=/absolute/path/metadata.json make book-pdf '
    '（PDFファイル名→HTTPS URLの辞書、またはname/urlを持つ配列）'
)


def load_link_map(filename: str | None) -> dict[str, str]:
    """IDを原稿へ埋めず、配布時に確定したURLだけを受け取る。"""
    if not filename:
        return {}
    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f'リンクマップJSONのキーが重複しています: {key}')
            result[key] = value
        return result

    with Path(filename).open(encoding='utf-8') as stream:
        data = json.load(stream, object_pairs_hook=unique_object)
    if isinstance(data, dict):
        entries = list(data.items())
    elif isinstance(data, list):
        entries = [(entry.get('name'), entry.get('url')) for entry in data
                   if isinstance(entry, dict)]
        if len(entries) != len(data):
            raise ValueError('リンクマップの各要素にはname/urlが必要です')
    else:
        raise ValueError('リンクマップは辞書またはname/urlを持つ配列にしてください')
    mapping: dict[str, str] = {}
    for name, url in entries:
        if not isinstance(name, str) or Path(name).name != name or not name.endswith('.pdf'):
            raise ValueError(f'リンクマップのキーはPDFファイル名にしてください: {name!r}')
        if name in mapping:
            raise ValueError(f'リンクマップに重複があります: {name}')
        if not isinstance(url, str):
            raise ValueError(f'リンク先URLが文字列ではありません: {name}')
        parsed = urlsplit(url)
        if (parsed.scheme != 'https' or not parsed.hostname
                or parsed.hostname in {'localhost', '127.0.0.1', '::1'}
                or parsed.username or parsed.password or parsed.fragment
                or unquote(parsed.path).lower().endswith('.md')
                or '/vivliostyle/' in unquote(parsed.path)
                or any(char.isspace() or char in '<>"' for char in url)):
            raise ValueError(f'配布用HTTPS URLではありません: {name}: {url}')
        mapping[name] = url
    return mapping


# 既存のtextlintパーサーで実リンクだけを拾う。コードや画像を正規表現で巻き込まない。
# rangeはUTF-16なので、Pythonへ渡す前にUnicodeコードポイント数へ換算する。
LINK_SCAN_JS = r'''
const fs = require('node:fs');
const { parse } = require('@textlint/markdown-to-ast');
const text = fs.readFileSync(0, 'utf8');
const ast = parse(text);
const definitions = new Map();
const walk = (node, visit) => {
  visit(node);
  for (const child of node.children || []) walk(child, visit);
};
walk(ast, node => {
  if (node.type === 'Definition' && !definitions.has(node.identifier)) {
    definitions.set(node.identifier, node);
  }
});
const links = [];
const offset = index => Array.from(text.slice(0, index)).length;
walk(ast, node => {
  if (node.type === 'Html' || node.type === 'HtmlBlock') {
    links.push({ html: node.raw });
  }
  if (node.type !== 'Link' && node.type !== 'LinkReference') return;
  const definition = node.type === 'Link' ? node : definitions.get(node.identifier);
  if (!definition) throw new Error(`未定義のリンク参照: ${node.identifier}`);
  const children = node.children || [];
  const label = children.length
    ? text.slice(children[0].range[0], children[children.length - 1].range[1]) : '';
  links.push({start: offset(node.range[0]), end: offset(node.range[1]),
    label, url: definition.url, title: definition.title});
});
process.stdout.write(JSON.stringify(links));
'''


class HtmlLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'a':
            self.links += [value for key, value in attrs if key == 'href' and value is not None]


PDF_FOOTNOTE_ATTRIBUTE = 'data-pdf-footnote'
PDF_FOOTNOTE_DISPLAY_ATTRIBUTE = 'data-pdf-footnote-display'
HTML_VOID_ELEMENTS = {
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
    'param', 'source', 'track', 'wbr',
}


def footnote_display_url(href: str) -> str:
    """脚注に印刷する表示用のURLを作る。リンク先（href）自体は変えない。

    共有パラメータ `usp` は紙面で読む価値が無いので表示から外す。
    折り返しは `/` `?` `&` `=` の直後だけに許し、それ以外の区切り記号
    （`.` `-` `:` など）は行継ぎ禁止文字で接着する。テーマ側の
    `word-break: break-all` がどこでも切るため、単語の途中で折れていた。
    """
    head, _, fragment = href.partition('#')
    base, _, query = head.partition('?')
    params = [param for param in query.split('&')
              if param and param.split('=', 1)[0] != 'usp']
    display = base + (('?' + '&'.join(params)) if params else '')
    display += '#' + fragment if fragment else ''
    pieces = []
    for character in display:
        if character in '/?&=':
            pieces.append(character + '\u200b')
        elif character.isascii() and character.isalnum():
            pieces.append(character)
        else:
            # CJK やパーセント記号は isalnum では素通りできない。CJK はどこでも
            # 折れてしまうので、ハイフン等の区切りと同じくこちらで接着する
            pieces.append('\u2060' + character + '\u2060')
    return html.escape(''.join(pieces))


class ExternalLinkFootnotes(HTMLParser):
    """外部リンクの開始タグを変えず、印刷用の通し番号だけ差し込む。"""

    def __init__(self, markup: str):
        super().__init__(convert_charrefs=False)
        self.line_starts = [0]
        for index, character in enumerate(markup):
            if character == '\n':
                self.line_starts.append(index + 1)
        self.parent_classes: list[set[str]] = []
        self.edits: list[tuple[int, str]] = []
        self.number = 0

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        parent_classes = self.parent_classes[-1] if self.parent_classes else set()
        href = attributes.get('href')
        if tag == 'a' and href and href.startswith(('http://', 'https://')):
            if PDF_FOOTNOTE_ATTRIBUTE in attributes or PDF_FOOTNOTE_DISPLAY_ATTRIBUTE in attributes:
                raise ValueError(
                    f'予約属性 {PDF_FOOTNOTE_ATTRIBUTE} / {PDF_FOOTNOTE_DISPLAY_ATTRIBUTE}'
                    ' は原稿で使用できません'
                )
            # theme-base の `:not(.footnote) > a[href^="http"]` と対象をそろえる。
            # 明示脚注の中のリンクまで数えると、紙面に出ない欠番が生じる。
            if 'footnote' not in parent_classes:
                self.number += 1
                line, column = self.getpos()
                insertion = self.line_starts[line - 1] + column + 2
                self.edits.append(
                    (insertion,
                     f' {PDF_FOOTNOTE_ATTRIBUTE}="{self.number}"'
                     f' {PDF_FOOTNOTE_DISPLAY_ATTRIBUTE}="{footnote_display_url(href)}"')
                )
        if tag not in HTML_VOID_ELEMENTS:
            self.parent_classes.append(set((attributes.get('class') or '').split()))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in HTML_VOID_ELEMENTS:
            self.parent_classes.pop()

    def handle_endtag(self, tag):
        if tag not in HTML_VOID_ELEMENTS and self.parent_classes:
            self.parent_classes.pop()


def number_external_link_footnotes(markup: str) -> str:
    """自動印刷脚注になる外部リンクへ、1冊内で安定した通し番号を付ける。"""
    parser = ExternalLinkFootnotes(markup)
    parser.feed(markup)
    parser.close()
    for offset, attribute in reversed(parser.edits):
        markup = markup[:offset] + attribute + markup[offset:]
    return markup


def _is_cjk(char: str) -> bool:
    """日本語の組版で、改行を半角スペースへ化けさせたくない文字か。"""
    code = ord(char)
    return (
        0x3000 <= code <= 0x30FF      # CJK句読点・ひらがな・カタカナ・ー・々
        or 0x3400 <= code <= 0x4DBF   # CJK統合漢字 拡張A
        or 0x4E00 <= code <= 0x9FFF   # CJK統合漢字
        or 0xF900 <= code <= 0xFAFF   # CJK互換漢字
        or 0xFF00 <= code <= 0xFFEF   # 全角英数・全角記号
        or 0x2013 <= code <= 0x2015   # – — ―
        or 0x2025 <= code <= 0x2026   # ‥ …
        or 0x20000 <= code <= 0x2FA1F  # CJK統合漢字 拡張B以降
    )


class CjkSoftBreaks(HTMLParser):
    """ブロックの区切りで分かれた可視テキスト区間を集める。

    <strong> や <a> のような行内タグは区間を分断しないので、
    「漢字\n<strong>漢字</strong>」では改行の両隣がどちらも漢字と分かる。
    テキスト区間だけを並べれば、タグを挟んだソフト改行も拾える。
    vfm は箇条書きの項目を <p> で包まず <li> に直接流すので、
    <p> だけを見ると項目内のソフト改行を取りこぼす。
    """

    # 区間を分断しない行内要素。これらはタグとしてしか出てこない。
    PHRASING_TAGS = {
        "a", "abbr", "b", "bdi", "bdo", "br", "button", "cite", "code",
        "data", "dfn", "em", "i", "img", "ins", "kbd", "mark", "q", "rp",
        "rt", "ruby", "s", "samp", "small", "span", "strong", "sub", "sup",
        "time", "u", "var", "wbr",
    }
    # 中身の改行が印字結果そのものになる要素。中の改行は消さない。
    RAW_TEXT_TAGS = {"pre", "script", "style", "textarea"}

    def __init__(self, markup: str):
        super().__init__(convert_charrefs=False)
        self.line_starts = [0]
        for index, char in enumerate(markup):
            if char == "\n":
                self.line_starts.append(index + 1)
        self.in_raw_text = 0
        self.region_open = False
        # 区切りで分かれたテキスト区間ごとの (開始オフセット, 終了オフセット) の並び
        self.regions: list[list[tuple[int, int]]] = []

    def _offset(self) -> int:
        line, column = self.getpos()
        return self.line_starts[line - 1] + column

    def _close_region(self, tag: str) -> None:
        if tag not in self.PHRASING_TAGS:
            self.region_open = False

    def handle_starttag(self, tag, attrs):
        self._close_region(tag)
        if tag in self.RAW_TEXT_TAGS:
            self.in_raw_text += 1

    def handle_startendtag(self, tag, attrs):
        # 空要素は内容を持たないので深さは変えない
        self._close_region(tag)

    def handle_endtag(self, tag):
        if tag in self.RAW_TEXT_TAGS and self.in_raw_text:
            self.in_raw_text -= 1
        self._close_region(tag)

    def _record(self, length: int) -> None:
        if self.in_raw_text:
            return
        if not self.region_open:
            self.region_open = True
            self.regions.append([])
        start = self._offset()
        self.regions[-1].append((start, start + length))

    def handle_data(self, data):
        self._record(len(data))

    def handle_entityref(self, name):
        # &amp; のような実体参照も画面上は1文字。隣の改行の両側判定から外さない。
        self._record(len(name) + 2)

    def handle_charref(self, name):
        self._record(len(name) + 3)


def join_cjk_soft_breaks(markup: str) -> str:
    """テキストが流れる領域で CJK 同士に挟まれた改行を取り除く。

    vfm は段落中のソフト改行をそのまま改行文字として残し、組版の Chromium が
    それを U+0020（半角スペース）へ置き換える。「仕上げたら\nブラウザで」が
    「仕上げたら ブラウザで」と文が分断されるので、組版へ渡す前に詰める。
    CJK でない文字が片側にある改行は残す（英語側は空白が要る）。
    """
    parser = CjkSoftBreaks(markup)
    parser.feed(markup)
    parser.close()
    edits: list[tuple[int, int]] = []
    for spans in parser.regions:
        visible: list[tuple[str, int]] = []
        for start, end in spans:
            visible.extend((markup[pos], pos) for pos in range(start, end))
        index = 0
        while index < len(visible):
            if visible[index][0] not in " \t\n\r":
                index += 1
                continue
            run_start = index
            while index < len(visible) and visible[index][0] in " \t\n\r":
                index += 1
            run = visible[run_start:index]
            # 改行を含まない空白は原稿で打たれたもの。消すと字がくっつくので残す
            if not any(char == "\n" for char, _ in run):
                continue
            # 段落の先頭・末尾にある整形用の空白も対象外
            if run_start == 0 or index >= len(visible):
                continue
            if _is_cjk(visible[run_start - 1][0]) and _is_cjk(visible[index][0]):
                # タグを挟む空白かたまりはバイト列では連続していない。
                # タグを消さないよう、空白の文字位置だけを1つずつ消す
                edits.extend((pos, pos + 1) for _, pos in run)
    # 連続する文字位置をまとめてから適用する
    edits.sort()
    merged: list[tuple[int, int]] = []
    for start, end in edits:
        if merged and merged[-1][1] == start:
            merged[-1] = (merged[-1][0], end)
        else:
            merged.append((start, end))
    for start, end in reversed(merged):
        # ずれた位置を消すと HTML が壊れるので、空白だけを消すことを保証する
        if markup[start:end].strip(" \t\n\r"):
            continue
        markup = markup[:start] + markup[end:]
    return markup


def rewrite_book_links(text: str, source: Path, mapping: dict[str, str]) -> str:
    """実在する同梱原稿へのリンクを、明示された配布先へ解決する。"""
    result = subprocess.run(
        ['node', '-e', LINK_SCAN_JS], input=text, text=True, capture_output=True,
        cwd=REPO_ROOT, timeout=60,
    )
    if result.returncode:
        raise ValueError(f'リンクを解析できません。npm installを確認してください: {result.stderr[-300:]}')
    edits = []
    for link in json.loads(result.stdout):
        if 'html' in link:
            parser = HtmlLinks()
            parser.feed(link['html'])
            for url in parser.links:
                if not url.startswith('#') and urlsplit(url).scheme not in {'http', 'https', 'mailto', 'tel'}:
                    raise ValueError(f'HTMLのローカルリンクはMarkdownリンクへ変更してください: {url}')
            continue
        url = link['url']
        parsed = urlsplit(url)
        if url.startswith('#') or parsed.scheme in {'https', 'http', 'mailto', 'tel'}:
            continue
        if parsed.scheme or parsed.netloc or not parsed.path or parsed.query:
            raise ValueError(f'未対応のローカルリンクです: {url}')
        target = (source.parent / unquote(parsed.path)).resolve()
        if target.parent != source.parent.resolve() or target.suffix != '.md' or not target.is_file():
            raise ValueError(f'配布対象の原稿に解決できません: {url}')
        if target == source.resolve() and parsed.fragment:
            destination = '#' + parsed.fragment
        else:
            if parsed.fragment:
                raise ValueError(f'別冊の見出し位置はPDF配布先で保証できません: {url}')
            filename = target.with_suffix('.pdf').name
            if filename not in mapping:
                raise ValueError(f'配布先が未登録です: {filename}。{LINK_MAP_HELP}')
            destination = mapping[filename]
        title = ''
        if link.get('title') is not None:
            title = ' "' + link['title'].replace('\\', '\\\\').replace('"', '\\"') + '"'
        edits.append((link['start'], link['end'], f'[{link["label"]}](<{destination}>{title})'))
    for start, end, replacement in sorted(edits, reverse=True):
        text = text[:start] + replacement + text[end:]
    return text


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
        # 近年の Playwright が入れる Chrome for Testing は chrome-linux64 に置かれる。
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
    for command in ("google-chrome", "chromium", "chromium-browser"):
        executable = shutil.which(command)
        if executable:
            return executable
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
            mermaid_command = (
                [env["PDF_BOOK_MERMAID_BIN"]]
                if "PDF_BOOK_MERMAID_BIN" in env
                else ["npx", "--yes", MERMAID_CLI]
            )
            result = subprocess.run(
                [*mermaid_command,
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
    # mermaid が出す width="100%" は、<img> の固有サイズが viewBox ではなく
    # 配置先の幅へ解決される。縦長の図は高さが版面を超えて下端で切れる
    # （実測: 220×694 の図が5ノード目で切断）。viewBox の実寸を width/height へ
    # 書き戻し、固有サイズを確定させる。book.css の max-block-size と
    # object-fit: contain が効く形になる。
    viewbox = re.search(
        r'viewBox="[\d.]+\s[\d.]+\s([\d.]+)\s([\d.]+)"', markup)
    if viewbox and 'width="100%"' in markup:
        markup = markup.replace(
            'width="100%"',
            f'width="{viewbox.group(1)}px" height="{viewbox.group(2)}px"',
            1,
        )
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
    # mermaid-cli は Chromium で図を描いてから箱の大きさを決める。その Chromium に
    # BIZ UDPGothic が無いと、代わりの細い書体で幅を測って箱を作り、あとから
    # embed_font が本物を差し込むので、文字が箱からはみ出して切れる（実測: Docker →
    # 「Docke」）。fontconfig は $XDG_DATA_HOME/fonts を見るので、そこへ実体を置いて
    # 測る側と描く側の書体をそろえる。
    xdg_fonts = WORK_DIR / "xdg" / "fonts"
    xdg_fonts.mkdir(parents=True)
    for name in {Path(path).name for _, path, _, _, fmt in FONT_SOURCES
                 if fmt == "truetype"}:
        shutil.copy2(WORK_DIR / "fonts" / name, xdg_fonts / name)


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


def build_one(path: Path, browser: str | None, env: dict[str, str],
              link_map: dict[str, str] | None = None) -> list[str]:
    """1本を PDF にする。問題があれば説明の一覧を返す（空なら成功）。"""
    stem = path.stem
    output = OUT_DIR / f"{stem}.pdf"
    # 前段の変換失敗でも、前回のPDFを今回の生成物に見せない。
    output.unlink(missing_ok=True)
    slug = work_slug(stem)
    binding_file = WORK_DIR / f"{slug}.evidence-binding.json"
    binding_file.unlink(missing_ok=True)
    source_sha256 = sha256_file(path)
    # U+FE0F（異体字セレクタ16）は「絵文字として描け」という指定。付いていると
    # Chromium が単色の Noto Emoji を無視してシステムのカラー絵文字フォントを呼び、
    # 生成機械に依存する上に Type 3 で埋め込まれる。紙面では単色でよいので外す。
    try:
        source = rewrite_book_links(path.read_text(encoding="utf-8"), path, link_map or {})
    except (ValueError, OSError, subprocess.TimeoutExpired) as error:
        return [f"{path.name}: {error}"]
    title, body, toc = parse_source(source.replace(EMOJI_VARIATION_SELECTOR, ""))
    if not title:
        return [f"{path.name}: H1 が無い"]

    body, figures, problems = convert_mermaid(body, slug, WORK_DIR, env)

    document = WORK_DIR / f"{slug}.md"
    document.write_text(
        build_front_matter(title, toc) + "\n".join(body), encoding="utf-8"
    )
    per_book_css = WORK_DIR / f"{slug}.css"
    base_css = build_book_css(title) + "\n" + HEADING_INLINE_CSS
    per_book_css.write_text(base_css + NOWRAP_CSS, encoding="utf-8")

    # Vivliostyle は行長だけで pre を割るため、空白があっても語の途中で折れる。
    # 先に vfm で HTML へ変換し、構文を保てる位置で明示改行してから組版へ渡す。
    # 改行できない行は8ptを下回らない範囲で縮小し、収まらなければ生成を止める。
    try:
        vfm_command = (
            [env["PDF_BOOK_VFM_BIN"]]
            if "PDF_BOOK_VFM_BIN" in env
            else ["npx", "--yes", VFM_CLI]
        )
        converted = subprocess.run(
            [*vfm_command, "--language", "ja", "--title", title, document.name],
            capture_output=True, text=True, cwd=WORK_DIR, env=env,
            timeout=VFM_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        problems.append(f"{path.name}: HTML変換が{VFM_TIMEOUT}秒を超えました")
        return problems
    except OSError as error:
        problems.append(f"{path.name}: HTML変換コマンドを起動できません: {error}")
        return problems
    if converted.returncode != 0 or not converted.stdout.strip():
        problems.append(
            f"{path.name}: HTML変換に失敗: "
            f"{(converted.stderr or converted.stdout).strip()[-300:]}"
        )
        return problems

    html_doc = WORK_DIR / f"{slug}.html"
    structure_file = WORK_DIR / f"{slug}.table-structure.json"
    forced_tables: dict[int, str] = {}

    def prepare_html():
        protected = protect_prose_latin(
            protect_table_latin(join_cjk_soft_breaks(converted.stdout))
        )
        structured, table_structure = restructure_tables(protected, forced_tables)
        # 縦展開で生まれた dd/dt も含めて、全ブロックの末尾を接着してから監査へ渡す
        structured = keep_block_tails(structured)
        annotated, manifest = annotate_inline_code(structured, slug)
        residuals: list[str] = []
        markup = wrap_code_in_html(annotated, residuals)
        if residuals:
            raise ValueError(f"コピー安全に組版できないコード行: {residuals[0][:80]}")
        unsafe = unsafe_runs(markup)
        if unsafe:
            raise ValueError(f"コード行に折返し候補を作れません: {unsafe[0][:80]}")
        markup = number_external_link_footnotes(markup)
        validate_annotated_html(markup, manifest)
        html_doc.write_text(markup, encoding="utf-8")
        (WORK_DIR / f"{slug}.inline-manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        structure_file.write_text(json.dumps({
            "schema_version": 1, "document_id": slug,
            "source_sha256": source_sha256, "tables": table_structure,
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return manifest, table_structure

    try:
        inline_manifest, table_structure = prepare_html()
    except ValueError as error:
        return [f"{path.name}: HTML組版準備に失敗: {error}"]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # HTMLの直接入力ではテーマの準備経路を通らないため、原稿として登録する。
    config_file = WORK_DIR / f"{slug}.config.cjs"
    config = {
        "title": title,
        "language": "ja",
        "entry": [{"path": html_doc.name, "title": title}],
        "theme": [env.get("PDF_BOOK_THEME_PATH", THEME),
                  "./book.css", f"./{per_book_css.name}"],
        "workspaceDir": f".vivliostyle-{slug}",
    }
    config_file.write_text(
        "module.exports = " + json.dumps(config, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    vivliostyle_command = [
        "node", str(Path(__file__).with_name("verify-inline-layout.mjs"))
    ]
    command = [
        *vivliostyle_command, "build", "-c", config_file.name,
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

    manifest_file = WORK_DIR / f"{slug}.inline-manifest.json"
    measurement_file = WORK_DIR / f"{slug}.inline-measurement.json"
    measurement_pdf = WORK_DIR / f"{slug}.inline-measurement.pdf"
    audit_env = {
        **env,
        "PDF_BOOK_TOOLCHAIN_DIR": str(TOOLCHAIN_DIR),
        "PDF_BOOK_INLINE_LAYOUT_MANIFEST": str(manifest_file),
        "PDF_BOOK_INLINE_LAYOUT_REPORT": str(measurement_file),
    }
    measurement_file.unlink(missing_ok=True)
    measure_command = command.copy()
    measure_command[measure_command.index("-o") + 1] = str(measurement_pdf)
    try:
        # 変換後は同じHTMLを再計測し、古い表の寸法を最終PDFへ流用しない。
        for attempt in range(len(table_structure) + 1):
            measurement_file.unlink(missing_ok=True)
            subprocess.run(
                measure_command, capture_output=True, text=True, cwd=WORK_DIR,
                env=audit_env, timeout=BUILD_TIMEOUT,
            )
            measured = json.loads(measurement_file.read_text(encoding="utf-8"))
            remaining_orders = [t["source_order"] for t in table_structure if t["layout"] == "table"]
            to_stack = measured_tables_to_stack(inline_manifest, measured, remaining_orders)
            if to_stack:
                table_css, table_changes, unresolved_tables = '', [], []
            else:
                table_css, table_changes, unresolved_tables = derive_table_css(inline_manifest, measured)
            (WORK_DIR / f"{slug}.table-adjustment.json").write_text(json.dumps({
                "adjustments": table_changes, "unresolved": unresolved_tables,
                "restructure_requested": to_stack,
            }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            id_to_order = {t["id"]: order for t, order in zip(inline_manifest["tables"], remaining_orders)}
            # 別の列から幅を奪う配分案は使わず、行ごとの全幅表示へ変える。
            for change in table_changes:
                to_stack[id_to_order[change["table_id"]]] = "measured_inline_code_needs_more_width"
            for unresolved in unresolved_tables:
                if unresolved["reason"] not in {"minimum_width_sum_exceeds_table", "code_free_column_width_not_proven", "no_width_change_derived"}:
                    raise ValueError(f"表の寸法を証明できません: {unresolved}")
                to_stack[id_to_order[unresolved["table_id"]]] = unresolved["reason"]
            if to_stack:
                forced_tables.update(to_stack)
                inline_manifest, table_structure = prepare_html()
                per_book_css.write_text(base_css + NOWRAP_CSS, encoding="utf-8")
                continue
            candidate_css, changes = derive_flow_css(inline_manifest, measured)
            break
        else:
            raise ValueError("表の自動変換が収束しません")
        per_book_css.write_text(base_css + candidate_css + table_css, encoding="utf-8")
        (WORK_DIR / f"{slug}.inline-adjustment.json").write_text(
            json.dumps(changes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        reviewed_css, reviewed_tables = derive_reviewed_table_css(
            load_table_layout_overrides(TABLE_LAYOUT_OVERRIDES),
            path, inline_manifest, measured,
        )
        per_book_css.write_text(base_css + candidate_css + table_css + reviewed_css, encoding="utf-8")
        (WORK_DIR / f"{slug}.table-adjustment.json").write_text(
            json.dumps(
                {
                    "adjustments": table_changes,
                    "unresolved": unresolved_tables,
                    "reviewed_overrides": reviewed_tables,
                },
                ensure_ascii=False, indent=2,
            ) + "\n", encoding="utf-8"
        )
    except (OSError, ValueError, subprocess.TimeoutExpired) as error:
        problems.append(f"{path.name}: 行内コードの実測または縮小候補の計算に失敗: {error}")
        return problems
    finally:
        measurement_pdf.unlink(missing_ok=True)
    audit_env["PDF_BOOK_INLINE_LAYOUT_REPORT"] = str(WORK_DIR / f"{slug}.inline-layout.json")
    if output.exists():
        output.unlink()
    try:
        result = subprocess.run(
            command, capture_output=True, text=True, cwd=WORK_DIR, env=audit_env,
            timeout=BUILD_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        # 例外のまま抜けると、ここまでに集めた他の冊の問題ごと落ちる
        problems.append(f"{path.name}: 組版が{BUILD_TIMEOUT}秒を超えました")
        return problems
    except OSError as error:
        problems.append(f"{path.name}: 組版コマンドを起動できません: {error}")
        return problems
    if result.returncode != 0 or not output.exists() or output.stat().st_size <= 0:
        problems.append(
            f"{path.name}: 組版に失敗: {(result.stderr or result.stdout).strip()[-300:]}"
        )
        if output.exists():
            output.unlink()
        return problems

    pdf_audit_file = WORK_DIR / f"{slug}.inline-pdf.json"
    pdf_audit_file.unlink(missing_ok=True)
    try:
        audited = subprocess.run(
            ["node", str(Path(__file__).with_name("verify-inline-pdf.mjs")),
             "--manifest", str(manifest_file),
             "--dom-report", audit_env["PDF_BOOK_INLINE_LAYOUT_REPORT"],
             "--pdf", str(output), "--toolchain", str(TOOLCHAIN_DIR),
             "--report", str(pdf_audit_file)],
            capture_output=True, text=True, cwd=WORK_DIR, env=env, timeout=BUILD_TIMEOUT,
        )
        pdf_audit = json.loads(pdf_audit_file.read_text(encoding="utf-8"))
        if audited.returncode != 0 or pdf_audit.get("result") != "pass":
            raise ValueError("生成PDFと行内コードの文字・配置が一致しません")
    except (OSError, ValueError, subprocess.TimeoutExpired) as error:
        problems.append(f"{path.name}: PDF生成後の行内コード検査に失敗: {error}")
        output.unlink(missing_ok=True)
        return problems

    if sha256_file(path) != source_sha256:
        output.unlink(missing_ok=True)
        return [f"{path.name}: 組版中に原稿が変更されました"]
    artifacts = {
        "source": path, "html": html_doc, "inline_manifest": manifest_file,
        "inline_layout": Path(audit_env["PDF_BOOK_INLINE_LAYOUT_REPORT"]),
        "inline_pdf": pdf_audit_file, "pdf": output, "table_structure": structure_file,
        "per_book_css": per_book_css, "config": config_file,
        "book_css": WORK_DIR / "book.css", "source_book_css": BOOK_CSS,
    }
    binding_file.write_text(json.dumps({
        "schema_version": 1, "document_id": slug,
        "artifacts": {name: {"path": str(file.resolve()), "sha256": sha256_file(file)}
                      for name, file in artifacts.items()},
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

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
    all_sources = sorted(SRC_DIR.glob("*.md"))
    targets = [Path(a) for a in argv[1:]] or all_sources
    if not targets:
        print(f"対象の Markdown が無い: {SRC_DIR}", file=sys.stderr)
        return 2
    missing = [t for t in targets if not t.is_file()]
    if missing:
        print("見つからない: " + ", ".join(str(m) for m in missing), file=sys.stderr)
        return 2
    try:
        link_map_filename = os.environ.get('PDF_BOOK_LINK_MAP')
        link_map = load_link_map(link_map_filename)
        # 1冊の未解決リンクで既存の全作業領域を消さないよう、準備前に全対象を検査する。
        for target in targets:
            rewrite_book_links(target.read_text(encoding='utf-8'), target, link_map)
    except (ValueError, OSError, subprocess.TimeoutExpired) as error:
        print(f'リンクを解決できません: {error}', file=sys.stderr)
        return 2
    try:
        validate_override_document_catalog(
            load_table_layout_overrides(TABLE_LAYOUT_OVERRIDES),
            [work_slug(path.stem) for path in all_sources],
        )
    except (ValueError, OSError) as error:
        print(f'表幅設定を正本冊子と照合できません: {error}', file=sys.stderr)
        return 2
    browser = find_browser()
    # symlink 越しの別名を正本36冊の指定と認めると、別名PDFだけを生成したあとに
    # 古い正本PDFへ証跡を発行できる。正本パスそのものだけを全冊ビルドとする。
    release_source_paths = {path.absolute() for path in all_sources}
    target_paths = {path.absolute() for path in targets}
    full_release_build = (
        len(all_sources) == EXPECTED_RELEASE_BOOKS
        and target_paths == release_source_paths
        and len(targets) == len(all_sources)
    )
    touches_release_outputs = bool(target_paths & release_source_paths)
    env = dict(os.environ)
    # mermaid-cliはpuppeteerをpeer dependencyとして要求する。アプリ用npm設定で省略させない。
    env['npm_config_legacy_peer_deps'] = 'false'
    if browser:
        # 手元の Chromium を使い回す。指定しないと mermaid-cli の puppeteer が
        # 約650MB の Chrome を毎回取りに行く。
        env["PUPPETEER_EXECUTABLE_PATH"] = browser
        env["PUPPETEER_SKIP_DOWNLOAD"] = "true"
    # prepare_work_dir が置いた実体を mermaid-cli の Chromium から見えるようにする
    env["XDG_DATA_HOME"] = str(WORK_DIR / "xdg")

    before_inputs = None
    toolchain = None
    if full_release_build and browser is None:
        print(
            "全冊ビルド証跡にはハッシュ可能なChrome/Chromiumが必要です",
            file=sys.stderr,
        )
        return 2
    try:
        toolchain = prepare_release_toolchain(env)
        env["PDF_BOOK_VIVLIOSTYLE_BIN"] = toolchain["vivliostyle_bin"]
        env["PDF_BOOK_VFM_BIN"] = toolchain["vfm_bin"]
        env["PDF_BOOK_MERMAID_BIN"] = toolchain["mermaid_bin"]
        env["PDF_BOOK_THEME_PATH"] = toolchain["theme_path"]
        if full_release_build:
            before_inputs = release_input_snapshot(
                all_sources, link_map_filename, browser, toolchain
            )
    except (OSError, ValueError) as error:
        print(f"PDF生成ツールと入力を固定できません: {error}", file=sys.stderr)
        return 2

    # この先はPDFを上書きし得る。部分ビルドや失敗のあとに、過去の全冊証跡を
    # 現在の出力へ流用させないため、実行直前に失効させる。
    if touches_release_outputs:
        RELEASE_RECEIPT.unlink(missing_ok=True)

    try:
        prepare_work_dir()
    except OSError as error:
        print(f"作業ディレクトリを用意できない: {error}", file=sys.stderr)
        return 2
    print(f"{len(targets)}本を組む（出力: {OUT_DIR.relative_to(REPO_ROOT)}）", flush=True)

    problems: list[str] = []
    built_outputs: list[dict] = []
    for path in targets:
        book_problems = build_one(path, browser, env, link_map)
        problems += book_problems
        if full_release_build and not book_problems:
            try:
                built_outputs += release_output_snapshot([path])
            except OSError as error:
                problems.append(f"{path.name}: 生成直後のPDFを固定できません: {error}")

    if problems:
        print("\n以下が未解決:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    if full_release_build and before_inputs is not None:
        try:
            after_inputs = release_input_snapshot(
                all_sources, link_map_filename, browser, toolchain
            )
            if after_inputs["aggregate_sha256"] != before_inputs["aggregate_sha256"]:
                print("全冊ビルド中に入力が変わったため、証跡を発行しません", file=sys.stderr)
                return 1
            outputs = release_output_snapshot(all_sources)
            if sorted(outputs, key=lambda item: item["name"]) != sorted(
                built_outputs, key=lambda item: item["name"]
            ):
                print(
                    "生成後から証跡発行までにPDFが変わったため、証跡を発行しません",
                    file=sys.stderr,
                )
                return 1
            write_release_receipt(before_inputs, outputs)
        except (OSError, ValueError) as error:
            print(f"全冊ビルド証跡を発行できません: {error}", file=sys.stderr)
            return 1
    print(f"\n{len(targets)}本すべて生成した", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
