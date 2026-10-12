#!/usr/bin/env python3
"""Day教材のコードブロックを抽出してターゲットディレクトリに写経する。

Usage:
  python3 apply_day.py <day_md_file> <target_app_dir> [--oracle ORACLE_DIR] [--tag TAG] [--ledger PATH]
  python3 apply_day.py --restore <tag> <target_app_dir> [--backup-root DIR]

Gate B 機械写経のための3系統を持つ:
  1. 完成版/全量リスティング -> WRITE (候補を構築してパース可能なものを採用)
  2. 位置指示フェンス（「X の前に追加」「X の直後に追加」「X を置き換える」等）
     -> 宣言境界アンカーで SPLICE。宣言の開始行・終了行を基準にするため
        ブロックの中へ誤挿入しない。
  3. 指示のない断片 -> oracle(完成版アプリ) 上の文脈アンカーで一意照合できた時だけ SPLICE。

全ファイル適用はトランザクション化する。1断片でも置き場を解決できなければ
そのファイルは当日適用前の内容へ巻き戻すため、壊れた baseline が翌日へ連鎖しない。
各日の適用前スナップショットは <target>.apply-backups/<tag>/ に保存し、
verify_day.py 後の失敗でも `--restore` で正常 baseline へ戻せる。
"""

import argparse
import difflib
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Sequence


REPO_DIR = Path(__file__).resolve().parents[2]

SKIP_LANGS = {
    "bash", "shell", "sh", "zsh", "console", "terminal", "output",
    "mermaid", "diff", "sql", "dockerfile", "makefile", "text",
}
SHELLISH = SKIP_LANGS | {"yaml", "yml", "json", "jsonc"}
FAMILY = {
    "ts": {"ts", "typescript"}, "tsx": {"tsx", "ts", "typescript", "jsx"},
    "js": {"js", "javascript", "mjs", "jsx"}, "mjs": {"mjs", "js", "javascript"},
    "jsx": {"jsx", "tsx", "ts", "typescript"},
    "css": {"css"}, "prisma": {"prisma"}, "json": {"json"},
    "md": {"md", "markdown"},
    "example": {"env", "text", "txt", ""}, "env": {"env", "text", "txt", ""},
}

# 教材が書き込み指示を出すルート直下ファイルの限定許可。
# src/ prisma/ public/ 以外を無条件に通すと「ターミナル」等のラベルが
# 実ファイルへ化けるため、実教材で使う名前だけを列挙する。
SAFE_ROOT_FILES = {
    ".env.example", ".env.local.example", "docker-compose.yml", "docker-compose.yaml",
    "next.config.ts", "next.config.js", "next.config.mjs",
    "vitest.config.ts", "vitest.config.mts", "tailwind.config.ts", "tailwind.config.js",
    "postcss.config.mjs", "postcss.config.js", "components.json", "middleware.ts",
    "tsconfig.json", "playwright.config.ts",
}
SAFE_PREFIXES = ("src/", "prisma/", "public/", "scripts/", "e2e/")

FP_RE = re.compile(r"filepath:\s*([^\s（)\u3000]+)")
PATH_OK = re.compile(r"^[A-Za-z0-9_./\-]+$")
CONTINUE_PATTERN = re.compile(r"^(.+?)（.*続き.*）\s*$")
KANSEI_RE = re.compile(r"完成版|完成形")
# 「完成版: …」「完成形: …」のラベル行。コードではなく写経ツール用の目印なので、
# WRITE の全量書き出し・SPLICE の挿入ペイロードからは取り除く。
#（そのまま挿すと成果物ファイルに目印コメントが混入する）
KANSEI_LABEL = re.compile(r"^\s*(?://+|/\*+|\{\s*/\*)\s*完成[版形][:：]")
JP_RE = re.compile(r"[\u3040-\u30ff\u4e00-\u9fff（）]")

# `...IDENT` / `...(` は JS/TS のスプレッド構文であって省略記号ではない。
# 省略はコメント頭の …/...・日本語の省略語・点だけの行だけを認める。
ELLIP_C = re.compile(r'^\s*(?://|/\*|\{/\*|<!--|#)\s*(?:…|\.{3}(?![A-Za-z0-9_$([{\'"`]))')
ELLIP_W = re.compile(r"^\s*(?://|/\*|\{/\*|<!--|#)?\s*（?(?:変更|既存|省略|中略|前略|後略|以降は同じ|同様|以下略)")
ELLIP_B = re.compile(r"^\s*(?:…|\.{3,})\s*$")

WRITE_PROSE = re.compile(r"全体|全て|すべて|全消|書き換え|完成形|完成版|最終形|新規作成|ファイルを作成")
FRAG_PROSE = re.compile(r"追加|追記|末尾に|先頭に|途中に|変更|修正|差し替え|差分|一部|該当箇所|import へ|importへ|を挿入")

# 「抜粋」「作成済みの確認」は写経しない参照用提示。
EXCERPT_RE = re.compile(r"抜粋|作成済み|読み比べ|確認用|実ファイルには対応しません|写経しません")

IDENT_RE = re.compile(r"^[A-Za-z_$][\w$]*$")


def is_safe_rel_path(rel_path: str) -> bool:
    if ".." in rel_path or rel_path.startswith("/"):
        return False
    return rel_path.startswith(SAFE_PREFIXES) or rel_path in SAFE_ROOT_FILES


def apply_safe_shell_ops(body: str, target_dir: Path,
                         backup_root: Path, tag: str
                         ) -> tuple[list[str], list[str]]:
    written: list[str] = []
    skipped: list[str] = []
    for raw_line in body.split("\n"):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        try:
            parts = shlex.split(line)
        except ValueError:
            if line.startswith("mv "):
                skipped.append(f"skipped unparsable shell move: {line}")
            continue
        if parts[0] != "mv" or len(parts) != 3:
            continue
        src, dest = parts[1], parts[2]
        if not is_safe_rel_path(src) or not is_safe_rel_path(dest):
            skipped.append(f"skipped unsafe shell move: {src} -> {dest}")
            continue
        src_path, dest_path = target_dir / src, target_dir / dest
        if not src_path.exists():
            skipped.append(f"skipped missing shell move source: {src}")
            continue
        # mv はスナップショット対象外で実行すると restore で元に戻せないため、
        # 移動元と上書きされる移動先の両方を事前に退避する。
        snapshot_file(backup_root, tag, src, src_path)
        snapshot_file(backup_root, tag, dest, dest_path)
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        src_path.rename(dest_path)
        written.append(f"MOVE   {src} -> {dest}")
    return written, skipped


def norm(lines: Sequence[str]) -> list[str]:
    return [l.rstrip() for l in lines if l.strip()]


def find_in(hay: Sequence[str], frag: Sequence[str], start: int = 0) -> int:
    fl = norm(frag)
    if not fl:
        return -1
    n, m = len(hay), len(fl)
    for i in range(start, n - m + 1):
        if hay[i:i + m] == fl:
            return i
    return -1


def has_ellipsis(body: str) -> bool:
    return any(ELLIP_C.match(l) or ELLIP_W.match(l) or ELLIP_B.match(l)
               for l in body.split("\n"))


def strip_fp(code: str) -> str:
    return "\n".join(l for l in code.split("\n") if "filepath:" not in l)


def ext_of(path: str) -> str:
    return path.rsplit(".", 1)[-1].lower() if "." in path else ""


def classify_prose(before: str) -> str:
    if FRAG_PROSE.search(before) and not WRITE_PROSE.search(before):
        return "frag"
    return "write" if WRITE_PROSE.search(before) else "neutral"


# ---------------------------------------------------------------------------
# 位置指示（directive）解析
# ---------------------------------------------------------------------------
#
# filepath 行の（...）括弧内、または断片先頭コメントに書かれる写経位置指示。
# 識別子アンカー（const/function/ルータのメンバ宣言）と、
# リテラル文字列アンカー（JSX属性・プレースホルダー）の両方を扱う。

D_BEFORE = re.compile(r"(.+?)\s*の前に(?:追加|挿入)")
D_AFTER = re.compile(r"(.+?)\s*の直後に(?:追加|挿入)")
D_AFTER_E = re.compile(r"(.+?)\s*の後に(?:追加|挿入)")
D_AFTER_ELEM = re.compile(r"(.+?)\s*の要素の直後に(?:追加|挿入)")
D_REPLACE_DECL = re.compile(r"(.+?)\s*の宣言を書き直す")
D_REPLACE_ELEM = re.compile(r"(.+?)\s*の要素を書き直す")
D_REPLACE_GENERIC = re.compile(r"既存の?\s*(.+?)\s*を置き換える|(.+?)\s*を書き換える|(.+?)\s*を置き換え")
D_RANGE = re.compile(r"(.+?)\s*から「(.+?)」の\s*(.+?)\s*までを書き直す")
D_AT = re.compile(r"「(.+?)」の位置に(?:追加|挿入)")
D_ARRAY_APPEND = re.compile(r"(.+?)\s*の配列に(?:追加|挿入)")
D_INSIDE = re.compile(r"(.+?)\s*の中に(?:追加|挿入)")
D_IMPORT_ADD = re.compile(r"import\s*に\s*(.+?)\s*を足した(?:完成形|形|もの)")
D_IMPORT_BLOCK = re.compile(r"import\s*群?に(?:追加|挿入)")
# `{/* A の return 内、B の中。 */}` 型は最後の「、」以降をアンカーに取る。
D_INSIDE_BODY = re.compile(r"(?:、|^)\s*([^、]+?)\s*の中[。、]?\s*(?:\*/\}?)?$")
D_UNDER = re.compile(r"(.+?)内、\s*(.+?)\s*の下に(?:追加|挿入)")
D_EDGE_END = re.compile(r"末尾に(?:追加|挿入)")
D_EDGE_START = re.compile(r"先頭に(?:追加|挿入)")
D_SKIP = re.compile(r"配布済み|写経しません|実ファイルには対応しません|読み比べ|抜粋|再掲")


@dataclass
class Directive:
    kind: str   # before/after/inside/array_append/replace_decl/replace_elem/
                # range/at/import_add/import_block/inside_lit/append_start/
                # append_end/skip
    arg: tuple


def _decl_or_literal(name: str) -> tuple[str, str]:
    """アンカー名が識別子なら 'decl'、それ以外（JSX属性片など）は 'literal'。"""
    name = name.strip()
    if len(name) >= 2 and name[0] in "`'\"" and name[-1] == name[0]:
        name = name[1:-1]
    return ("decl", name) if IDENT_RE.match(name) else ("literal", name)


def parse_directive(text: str) -> Optional[Directive]:
    """括弧内テキスト1個分を directive に解釈。不明なら None。"""
    t = text.strip()
    if not t:
        return None
    if D_SKIP.search(t):
        return Directive("skip", ())
    if m := D_RANGE.search(t):
        return Directive("range", (m.group(1).strip(), m.group(3).strip()))
    if m := D_AT.search(t):
        return Directive("at", (m.group(1).strip(),))
    if m := D_AFTER_ELEM.search(t):
        return Directive("after", (_decl_or_literal(m.group(1))[1],))
    if m := D_AFTER.search(t) or (m := D_AFTER_E.search(t)):
        k, name = _decl_or_literal(m.group(1))
        return Directive("after", (name,))
    if m := D_BEFORE.search(t):
        return Directive("before", (_decl_or_literal(m.group(1))[1],))
    if m := D_REPLACE_DECL.search(t):
        return Directive("replace_decl", (m.group(1).strip(),))
    if m := D_REPLACE_ELEM.search(t):
        return Directive("replace_elem", (m.group(1).strip(),))
    if m := D_REPLACE_GENERIC.search(t):
        arg = next(g for g in m.groups() if g)
        return Directive("replace_auto", (arg.strip(),))
    if m := D_ARRAY_APPEND.search(t):
        return Directive("array_append", (m.group(1).strip(),))
    if m := D_INSIDE.search(t):
        return Directive("inside", (m.group(1).strip(),))
    if m := D_IMPORT_ADD.search(t):
        return Directive("import_add", (m.group(1).strip(),))
    if D_IMPORT_BLOCK.search(t):
        return Directive("import_block", ())
    if m := D_UNDER.search(t):
        return Directive("after", (m.group(2).strip(),))
    if m := re.search(r"(.+?)\s*の下に(?:追加|挿入)", t):
        return Directive("after", (m.group(1).strip(),))
    if m := re.search(r"(.+?)\s*の直前に(?:追加|挿入)", t):
        return Directive("before", (m.group(1).strip(),))
    if m := D_INSIDE_BODY.search(t):
        return Directive("inside_lit", (m.group(1).strip(),))
    if D_EDGE_END.search(t):
        return Directive("append_end", ())
    if D_EDGE_START.search(t):
        return Directive("append_start", ())
    return None


def directive_of(fp_line: str, code: str) -> Optional[Directive]:
    """filepath 行の括弧 → 断片先頭のメタコメント の順で directive を引く。"""
    m = re.search(r"（([^（）]{1,120}?)）", fp_line)
    if m:
        d = parse_directive(m.group(1))
        if d:
            return d
    # 「続き」は新しい位置指示ではなく前断片の延長なので None を返す。
    for line in code.split("\n")[:3]:
        s = line.strip()
        if not s:
            continue
        if not re.match(r"^(//|/\*|\{/\*|#)", s):
            break
        cm = re.search(r"（([^（）]{1,120}?)）", s)
        if cm:
            d = parse_directive(cm.group(1))
            if d:
                return d
        # 括弧なし本文コメント指示: `// X の中に追加`, `// import群に追加`,
        # `{/* TaskDetailDialog の return 内、{taskDetail && ( の中。 */}` 等
        im = re.search(
            r"の中に(?:追加|挿入)|の中[。、]?\s*(?:\*/\}?)?\s*$|import\s*群?に|内、.+の下に(?:追加|挿入)", s)
        if im:
            cleaned = re.sub(r"\*/\}?\s*$", "", s.lstrip("/*{# "))
            d = parse_directive(cleaned)
            if d:
                return d
    return None


def is_continuation(fp_line: str, code: str) -> bool:
    m = re.search(r"（([^（）]*)）", fp_line)
    if m:
        return "続き" in m.group(1)
    head = "\n".join(l for l in code.split("\n")[:3] if l.strip())[:200]
    return "続き" in head


@dataclass
class Part:
    cont: bool          # 前フェンスの続き
    body: str           # filepath 行を除いたコード本体
    kansei: bool        # 完成版ラベル
    unmarked: bool      # filepath なしで前フェンスに接続
    prose: str          # 'write'|'frag'|'neutral'
    directive: Optional[Directive]


def collect_parts(text: str) -> dict[str, list[Part]]:
    parts: dict[str, list[Part]] = {}
    cur_fp: Optional[str] = None
    prev_end = 0
    for m in re.finditer(r"```([a-zA-Z0-9]*)\n(.*?)```", text, re.S):
        lang, code = m.group(1).lower(), m.group(2)
        before = text[max(prev_end, m.start() - 400):m.start()]
        before = "\n".join(before.split("\n")[-6:])
        prose = classify_prose(before)
        prev_end = m.end()
        fm = FP_RE.search(code)
        if fm:
            fp = fm.group(1).strip()
            fp_line = next(l for l in code.split("\n") if "filepath:" in l)
            if PATH_OK.match(fp) and is_safe_rel_path(fp) and not JP_RE.search(fp):
                cur_fp = fp
                body = strip_fp(code)
                if not body.strip():
                    continue
                head = "\n".join(body.split("\n")[:2])
                parts.setdefault(fp, []).append(Part(
                    cont=is_continuation(fp_line, code),
                    body=body,
                    kansei=bool(KANSEI_RE.search(head)),
                    unmarked=False,
                    prose=prose,
                    directive=directive_of(fp_line, body),
                ))
            else:
                cur_fp = None  # 読み比べ用・ターミナル等
            continue
        if cur_fp is None or lang in SHELLISH:
            continue
        if lang in FAMILY.get(ext_of(cur_fp), set()):
            parts.setdefault(cur_fp, []).append(Part(
                cont=True, body=code,
                kansei=bool(KANSEI_RE.search("\n".join(code.split("\n")[:2]))),
                unmarked=True, prose=prose, directive=None))
    return parts


# ---------------------------------------------------------------------------
# 全量リスティング候補
# ---------------------------------------------------------------------------

def candidates(parts: list[Part]):
    """(label, joined, first_prose) を優先順に yield。"""
    seen: set[str] = set()
    def emit(label: str, sub: list[Part]):
        body = "\n".join(
            l for p in sub for l in p.body.split("\n")
            if not KANSEI_LABEL.match(l))
        key = body[:4000]
        if body.strip() and key not in seen:
            seen.add(key)
            return (label, body, sub[0].prose)
        return None
    n = len(parts)
    # 「完成版」の確認用全量リスティングは末尾に来る。
    # 途中の断片も「〜の完成形」と名付くことがあるため、
    # 先頭の完成ラベルからではなく後ろの完成ラベルから順に試す。
    kansei_idx = [i for i, p in enumerate(parts) if p.kansei]
    for k0 in reversed(kansei_idx):
        for label, sub in (("kansei-run", parts[k0:]),
                           ("kansei-run-marked", [p for p in parts[k0:] if not p.unmarked]),
                           ("kansei-single", [parts[k0]])):
            r = emit(label, sub)
            if r:
                yield r
    if kansei_idx:
        # 完成版を節別リスティングで積み上げる教材: 全kansei部分を順に結合
        k0, k1 = kansei_idx[0], kansei_idx[-1]
        r = emit("kansei-all", [p for p in parts[k0:k1 + 1]])
        if r:
            yield r
    fresh = [i for i, p in enumerate(parts) if not p.cont and not p.unmarked]
    for i in reversed(fresh):
        for label, sub in (("listing-run", parts[i:]),
                           ("listing-run-marked", [p for p in parts[i:] if not p.unmarked])):
            r = emit(label, sub)
            if r:
                yield r
    for label, sub in (("all-joined", parts),
                       ("all-joined-marked", [p for p in parts if not p.unmarked])):
        r = emit(label, sub)
        if r:
            yield r
    for i in sorted(range(n), key=lambda i: -len(parts[i].body))[:4]:
        r = emit("single", [parts[i]])
        if r:
            yield r


def looks_complete(joined: str) -> bool:
    for l in joined.split("\n"):
        s = l.strip()
        if not s:
            continue
        return bool(re.match(
            r"^('use (client|server)'|\"use (client|server)\"|import |export |//|/\*|\{/\*|#|@|/\*)", s))
    return False


def structural_balance_ok(body: str) -> bool:
    """括弧の深さが負にならず 0 で閉じる簡易構文健全性チェック。"""
    depth = {"{": 0, "(": 0, "[": 0}
    pairs = {"}": "{", ")": "(", "]": "["}
    for ch in re.sub(r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`", "", body):
        if ch in depth:
            depth[ch] += 1
        elif ch in pairs:
            depth[pairs[ch]] -= 1
            if depth[pairs[ch]] < 0:
                return False
    return all(v == 0 for v in depth.values())


def parses_as_file(path: str, body: str, esbuild: Optional[str]) -> bool:
    if has_ellipsis(body) or not body.strip():
        return False
    ext = ext_of(path)
    if ext in ("ts", "tsx", "js", "mjs", "jsx"):
        if esbuild:
            with tempfile.NamedTemporaryFile("w", suffix="." + ext, delete=False) as t:
                t.write(body)
                tmp = t.name
            try:
                r = subprocess.run([esbuild, tmp, "--outfile=/dev/null"],
                                   capture_output=True, text=True)
                return r.returncode == 0
            finally:
                os.unlink(tmp)
        # esbuild が無い環境では構造的健全性で代替する
        return structural_balance_ok(body) and looks_complete(body)
    if ext == "json":
        try:
            json.loads(body)
            return True
        except Exception:
            return False
    return True


def coverage(joined: str, base_lines: list[str]) -> tuple[float, float]:
    jl = norm(joined.split("\n"))
    if not jl or not base_lines:
        return 0.0, 0.0
    js, bs = set(jl), set(base_lines)
    return (sum(1 for l in jl if l in bs) / len(jl),
            sum(1 for l in base_lines if l in js) / len(base_lines))


# ---------------------------------------------------------------------------
# 宣言境界アンカー（day16 型の修正: 宣言の開始行・終了行を基準に挿入する）
# ---------------------------------------------------------------------------

def _code_depth_before(lines: Sequence[str], upto: int) -> int:
    depth = 0
    for l in lines[:upto]:
        s = re.sub(r"//.*|/\*.*?\*/|'(\\.|[^'\\])*'|\"(\\.|[^\"\\])*\"", "", l)
        depth += s.count("{") + s.count("(") + s.count("[")
        depth -= s.count("}") + s.count(")") + s.count("]")
    return depth


def find_decl_start(lines: Sequence[str], name: str) -> Optional[int]:
    """宣言の開始行インデックスを返す。ネスト深度が最小の一致を宣言とみなす。"""
    esc = re.escape(name)
    pats = [
        re.compile(rf"^\s*(?:export\s+)?(?:default\s+)?(?:const|let|var)\s+{esc}\b"),
        re.compile(rf"^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+{esc}\b"),
        re.compile(rf"^\s*(?:export\s+)?(?:default\s+)?class\s+{esc}\b"),
        re.compile(rf"^\s*{esc}\s*:"),          # オブジェクト/ルーターのメンバ
        re.compile(rf"^\s*{esc}\s*="),
        re.compile(rf"^\s*{esc}\s*\("),          # メソッド短縮形
        re.compile(rf"^\s*(?:get|set|static|async|public|private|protected|readonly|override)\s+{esc}\s*[:(]"),
    ]
    hits: list[int] = []
    for i, l in enumerate(lines):
        if any(p.search(l) for p in pats):
            hits.append(i)
    if not hits:
        return None
    # 「X の前に追加」の X が識別子なら宣言を指すはずなので、
    # 呼び出しやプロパティ参照ではなく最も浅い宣言行を選ぶ。
    best = min(hits, key=lambda i: (_code_depth_before(lines, i), i))
    return best


def _strip_for_depth(line: str) -> str:
    s = re.sub(r"//.*", "", line)
    s = re.sub(r"/\*.*?\*/", "", s)
    s = re.sub(r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`", "", s)
    return s


def find_decl_end(lines: Sequence[str], start: int) -> int:
    """宣言ブロックの終了行。メソッドチェーン(.foo( や => の継続を読み飛ばす。"""
    depth = 0
    j = start
    while j < len(lines):
        s = _strip_for_depth(lines[j])
        depth += s.count("{") + s.count("(") + s.count("[")
        depth -= s.count("}") + s.count(")") + s.count("]")
        # 行末の // コメントを終端判定に含めると `x = 1; // note` の宣言が
        # 終わらず、置き換えで後続の宣言まで消える。ただし _code_text は
        # 複数行テンプレートや JSX テキスト内の `https://` もコメントとみなす
        # ため、原文の行末が終端記号ならそちらを優先する
        raw_last = lines[j].rstrip()[-1:]
        last = (raw_last if raw_last and raw_last in ";,)}]>"
                else _code_text(lines[j]).rstrip()[-1:])
        nxt = lines[j + 1].strip() if j + 1 < len(lines) else ""
        if depth <= 0 and last and last in ";,)}]>":
            if not nxt.startswith((".", "=>", "?", ":")):
                return j
        if depth < 0:
            return j
        j += 1
    return len(lines) - 1


def decl_boundary(lines: Sequence[str], name: str) -> Optional[tuple[int, int]]:
    """(decl_start, decl_end)。開始行は直上のコメントブロックを含まない。"""
    si = find_decl_start(lines, name)
    if si is None:
        return None
    return si, find_decl_end(lines, si)


def element_start(lines: Sequence[str], i: int) -> int:
    """JSX 属性行から遡って要素の開始行（<Tag 行）を引く。"""
    for j in range(i, -1, -1):
        s = lines[j].strip()
        if re.search(r"<[A-Za-z][\w.]*", s) and not s.startswith("</"):
            return j
    return i


def element_end(lines: Sequence[str], start: int) -> int:
    """<Tag の開始行から、対応する </Tag> または /> の行を引く。
    対象タグの開閉だけを追跡する。他タグの /> は深さに影響しない。"""
    m = re.search(r"<([A-Za-z][\w.]*)", lines[start])
    if not m:
        return start
    tag = m.group(1)
    depth = 0
    in_tag = False  # <Tag の属性途中（> 未着）
    for j in range(start, len(lines)):
        l = lines[j]
        i = 0
        while i < len(l):
            if in_tag:
                g = re.search(r"(?<![=\-+])>", l[i:])
                if not g:
                    i = len(l)
                    break
                seg = l[i:i + g.start()]
                depth += -1 if seg.rstrip().endswith("/") else 1
                in_tag = False
                i += g.end()
                continue
            if l[i] == "<":
                if l[i + 1:i + 2] == "/":
                    g = l.find(">", i)
                    if g < 0:
                        i = len(l)
                        break
                    if l[i + 2:i + 2 + len(tag)] == tag:
                        depth -= 1
                    i = g + 1
                    continue
                if l[i + 1:i + 2] == ">":
                    depth += 1
                    i += 2
                    continue
                mm = re.match(r"<([A-Za-z][\w.]*)", l[i:])
                if mm:
                    if mm.group(1) == tag:
                        in_tag = True
                    else:
                        g = re.search(r"(?<![=\-+])>", l[i:])
                        if not g:
                            i = len(l)
                            break
                        i += g.end()
                    continue
            i += 1
        # 複数行の開始タグ（<Tag \n attr \n />）は > 未到達のまま depth=0。
        # in_tag の間は開タグすら確定していないので終端と誤認して返さない。
        if depth <= 0 and not in_tag:
            return j
    return len(lines) - 1


def find_literal(lines: Sequence[str], literal: str) -> Optional[int]:
    for i, l in enumerate(lines):
        if literal in l:
            return i
    return None


def replace_import(cur: list[str], fl: list[str]) -> Optional[list[str]]:
    """断片が完成形 import 文の時、同名モジュールの import ブロックを置き換える。"""
    mods = [re.search(r"from\s+['\"]([^'\"]+)['\"]", l) for l in fl]
    mods = [m.group(1) for m in mods if m]
    if not mods:
        return None
    out = list(cur)
    for mod in mods:
        hit = [i for i, l in enumerate(out) if re.search(rf"from\s+['\"]{re.escape(mod)}['\"]", l)]
        if hit:
            start = hit[0]
            while start > 0 and out[start - 1].strip() not in {";", ""} and \
                    re.match(r"^\s*(import\s(?!\()|[A-Za-z_$][\w$]*,?|})", out[start - 1]) and \
                    ";" not in out[start - 1]:
                start -= 1
            end = hit[0]
            out[start:end + 1] = fl
            return out
    # 同名 import が無ければ import 群の末尾へ足す。
    # 複数行 import（`import {` 〜 `} from 'x'`）の途中には挿入しない。
    # 開始行だけ見ると `import {` の直後に割り込んで構文を壊すため、
    # 文末（from 行・side-effect import・;）まで読み進める（issue #630）
    last_import = max((i for i, l in enumerate(out) if STATIC_IMPORT_RE.match(l)), default=-1)
    if last_import < 0:
        return fl + out
    end = _import_end(out, last_import)
    if end is None:
        return None
    pos = end + 1
    return out[:pos] + fl + out[pos:]


def _last_unquoted(line: str, ch: str) -> int:
    """文字列リテラル内を除いた `ch` の最後の出現位置。無ければ -1。"""
    quote = None
    esc = False
    pos = -1
    for i, c in enumerate(line):
        if esc:
            esc = False
            continue
        if c == "\\":
            esc = True
            continue
        if quote:
            if c == quote:
                quote = None
            continue
        if c in "'\"`":
            quote = c
            continue
        if c == ch:
            pos = i
    return pos


def _code_text(line: str) -> str:
    """// コメントを除いたコード部分を返す。文字列リテラル内の // は残す。"""
    quote = None
    esc = False
    for i, c in enumerate(line):
        if esc:
            esc = False
            continue
        if c == "\\":
            esc = True
            continue
        if quote:
            if c == quote:
                quote = None
            continue
        if c in "'\"`":
            quote = c
            continue
        if c == "/" and i + 1 < len(line) and line[i + 1] == "/":
            return line[:i]
    return line


def _mask_code(lines: Sequence[str]) -> list[str]:
    """各行を「コード位置の文字だけ残した」文字列に変換する。

    文字列・テンプレートリテラルの中身は \\x00 に伏せ（引用符自体は残す）、
    // コメントと /* */ コメントは取り除く。` は行を跨ぐリテラルとして、
    /* */ も行を跨いで状態を維持する。' と " は行を跨げないため
    行末で未閉鎖なら状態をリセットする。
    走査結果は元の行と同じ長さなので列位置をそのまま使える。"""
    out: list[str] = []
    quote: Optional[str] = None
    in_block = False
    for l in lines:
        buf: list[str] = []
        i, n = 0, len(l)
        while i < n:
            c = l[i]
            if in_block:
                if c == "*" and l[i + 1:i + 2] == "/":
                    in_block = False
                    i += 2
                    continue
                i += 1
                continue
            if quote:
                if c == "\\":
                    buf.append("\x00\x00")
                    i += 2
                    continue
                if c == quote:
                    buf.append(c)
                    quote = None
                    i += 1
                    continue
                buf.append("\x00")
                i += 1
                continue
            if c == "/" and l[i + 1:i + 2] == "/":
                break
            if c == "/" and l[i + 1:i + 2] == "*":
                in_block = True
                i += 2
                continue
            if c in "'\"`":
                quote = c
                buf.append(c)
                i += 1
                continue
            buf.append(c)
            i += 1
        out.append("".join(buf))
        # ' と " は行を跨げないので行末で未閉鎖なら状態をリセットする
        if quote in ("'", '"'):
            quote = None
    return out


# 静的な import 宣言だけを拾う。`import(`（動的 import）や
# `import.meta` は文の先頭ではないため除外する。
STATIC_IMPORT_RE = re.compile(r"^\s*import\s(?!\()")

# `import x = require('y')` 形式。`;` も from 指定子も無い終端形を拾う
IMPORT_REQUIRE_RE = re.compile(r"\bimport\s+[\w${},\s*]*=\s*require\s*\(")

# 別の文が始まる先頭キーワード（import 文の継続行になり得ないもの）
_STMT_START_RE = re.compile(
    r"^(?:import\s(?!\()|export\b|const\b|let\b|var\b|function\b|class\b"
    r"|interface\b|type\b|enum\b|if\b|for\b|while\b|return\b|switch\b"
    r"|try\b|throw\b)")


def _import_end(lines: Sequence[str], start: int) -> Optional[int]:
    """start 行から始まる import 文の終端行 index を返す。見つからなければ None。

    文字列・コメント・テンプレートリテラルの外側のコードだけを走査し、
    文の終端（コード位置の `;` か、from/require 指定子を持つ行の ASI）を
    検出する。コメント内の `;` や文字列内の `;` では止まらない。
    別の文が波括弧深度 0 で始まったら直前行を ASI の終端とみなす。
    見つからない場合（`import x = require('y')` が EOF まで延びる等）は
    None を返し、呼び出し側で gap 扱いにする。
    `with {`/`assert {` の属性句が指定子の後に続く場合も終端まで読み進める
    （issue #630）。"""
    masked = _mask_code(lines)
    depth = 0
    for j in range(start, len(lines)):
        code = masked[j]
        s = code.strip()
        if (j > start and depth == 0 and s
                and _STMT_START_RE.match(s)):
            # 前の文が継続中でない位置で別文が始まった → 直前行が ASI の終端
            return j - 1
        if ";" in code:
            return j
        if (IMPORT_FROM_RE.search(code) or BARE_IMPORT_RE.match(code)
                or IMPORT_REQUIRE_RE.search(code)):
            # 属性句が `{` で開いて続く場合・次のコード行が with/assert の場合は
            # 文がまだ続く。それ以外なら指定子のある行が文の終端（ASI も含む）
            if not code.rstrip().endswith("{"):
                nxt = next(
                    (masked[k].strip() for k in range(j + 1, len(lines))
                     if masked[k].strip()),
                    "")
                if not re.match(r"^(with|assert)\b", nxt):
                    return j
        depth += code.count("{") - code.count("}")
    return None


def _noncode_line_flags(lines: Sequence[str]) -> list[bool]:
    """各行が「コードを含まない」か（コメント・空行のみ）。
    /* */ 内に置かれた見掛け上のコード行を「適用済み」と誤認しないための判定。"""
    masked = _mask_code(lines)
    return [not m.strip() for m in masked]


def apply_directive(cur: list[str], directive: Directive, fl: list[str]) -> Optional[list[str]]:
    """宣言境界アンカーで1断片を配置。解決不能なら None（= そのファイルを巻き戻す）。"""
    kind, arg = directive.kind, directive.arg
    if kind == "skip":
        return cur
    if kind == "append_end":
        return cur + fl
    if kind == "append_start":
        return fl + cur
    if kind == "before":
        if IDENT_RE.match(arg[0]):
            b = decl_boundary(cur, arg[0])
            if b is None:
                return None
            si = b[0]
        else:
            # JSX要素などリテラル指示: 要素の開始行の直前に置く
            i = find_literal(cur, arg[0])
            if i is None:
                return None
            si = element_start(cur, i)
        while si > 0 and cur[si - 1].strip().startswith(("//", "/*", "*", "{/*")):
            si -= 1
        return cur[:si] + fl + cur[si:]
    if kind == "after":
        if IDENT_RE.match(arg[0]):
            b = decl_boundary(cur, arg[0])
            if b is None:
                return None
            return cur[:b[1] + 1] + fl + cur[b[1] + 1:]
        # 「X の要素の直後に追加」: リテラル行を含む要素の終了行の直後に置く
        i = find_literal(cur, arg[0])
        if i is None:
            return None
        e = element_end(cur, element_start(cur, i))
        return cur[:e + 1] + fl + cur[e + 1:]
    if kind == "inside":
        b = decl_boundary(cur, arg[0])
        if b is None:
            return None
        si, ei = b
        if si == ei:
            # `const x = {};` のような1行宣言は括弧内へ展開して入れる
            line = cur[si]
            open_i = line.find("{")
            close_i = line.rfind("}")
            if open_i < 0 or close_i <= open_i:
                return None
            head = cur[:si] + [line[:close_i].rstrip()]
            tail = ["  " + l.strip() for l in fl] + [line[close_i:]]
            return head + tail + cur[ei + 1:]
        return cur[:ei] + fl + cur[ei:]
    if kind == "inside_lit":
        # `{/* A の return 内、B の中。 */}` — B を含む行の直後に入れる
        i = find_literal(cur, arg[0])
        if i is None:
            return None
        return cur[:i + 1] + fl + cur[i + 1:]
    if kind == "import_block":
        # `// import群に追加` — 既存 import 群の末尾へ、未導入の行だけ足す
        existing = set(cur)
        add = [l for l in fl if l not in existing]
        if not add:
            return cur
        last_import = max(
            (i for i, l in enumerate(cur) if STATIC_IMPORT_RE.match(l)),
            default=-1)
        if last_import < 0:
            return add + cur
        end = _import_end(cur, last_import)
        if end is None:
            return None
        pos = end + 1
        return cur[:pos] + add + cur[pos:]
    if kind == "array_append":
        name = arg[0]
        j = None
        # `name: [...]` のプロパティ配列を優先する。`headers の配列に追加`
        # は `async headers()` 関数の return 配列ではなく、その内側の
        # `headers: [...]` プロパティを指すため
        prop_re = re.compile(r"^\s*" + re.escape(name) + r"\s*:\s*\[")
        for i, l in enumerate(cur):
            if prop_re.match(l):
                j = i
                break
        if j is None:
            b = decl_boundary(cur, name)
            if b is None:
                return None
            si, ei = b
            for jj in range(si, ei + 1):
                if "[" in _strip_for_depth(cur[jj]):
                    j = jj
                    break
        if j is None:
            return None
        depth = 0
        for k in range(j, len(cur)):
            s = _strip_for_depth(cur[k])
            depth += s.count("[") - s.count("]")
            if depth <= 0:
                if k == j:
                    # `const x = [a];` のような1行配列は閉じ括弧の
                    # 直前に要素を足す（行頭挿入は宣言外になる）。
                    # `]` は文字列リテラル内を除く最後のものを使い、
                    # 入れ子配列では外側の配列を対象にする
                    line = cur[j]
                    ci = _last_unquoted(line, "]")
                    if ci < 0:
                        return None
                    head = line[:ci].rstrip()
                    if not head.endswith(("[", ",")):
                        head += ","
                    return (cur[:j] + [head] + fl
                            + [line[ci:]] + cur[j + 1:])
                return cur[:k] + fl + cur[k:]
        return None
    if kind == "replace_decl":
        b = decl_boundary(cur, arg[0])
        if b is None:
            return None
        return cur[:b[0]] + fl + cur[b[1] + 1:]
    if kind == "replace_elem":
        i = find_literal(cur, arg[0])
        if i is None:
            return None
        s = element_start(cur, i)
        e = element_end(cur, s)
        return cur[:s] + fl + cur[e + 1:]
    if kind == "replace_auto":
        name = arg[0]
        if "import" in name:
            word = name.replace("既存の", "").replace("import", "").strip()
            hit = [i for i, l in enumerate(cur)
                   if STATIC_IMPORT_RE.match(l) and (not word or word in l)]
            if not hit:
                return None
            si = hit[0]
            ei = find_decl_end(cur, si)
            return cur[:si] + fl + cur[ei + 1:]
        b = decl_boundary(cur, name)
        if b is not None:
            return cur[:b[0]] + fl + cur[b[1] + 1:]
        i = find_literal(cur, name)
        if i is None:
            return None
        s = element_start(cur, i)
        e = element_end(cur, s)
        return cur[:s] + fl + cur[e + 1:]
    if kind == "range":
        start_lit, end_lit = arg
        i = find_literal(cur, start_lit)
        if i is None:
            return None
        s = element_start(cur, i)
        j = find_literal(cur, end_lit)
        if j is None or j < s:
            return None
        e = element_end(cur, j)
        return cur[:s] + fl + cur[max(e, j) + 1:]
    if kind == "at":
        i = find_literal(cur, arg[0])
        if i is None:
            return None
        return cur[:i] + fl + cur[i + 1:]
    if kind == "import_add":
        return replace_import(cur, fl)
    return None


def leading_meta_lines(fl: list[str]) -> int:
    """先頭にあるメタ系コメント行数を数える。
    位置指示・完成版ラベル・再掲コメントは oracle に存在しないため、
    照合時は剥がして評価する。挿入される本文には元の行を残す。"""
    i = 0
    while i < len(fl):
        s = fl[i].strip()
        if not s:
            i += 1
            continue
        if not re.match(r"^(//|/\*|\{/\*|#)", s):
            break
        if re.search(r"完成版|完成形|追加|挿入|置き換え|書き直す|抜粋|作成済み|の中に|直後|の前|続き|filepath|で書いた|を残す|import", s):
            i += 1
            continue
        break
    return i


META_ANYWHERE = re.compile(r"filepath:|完成版|完成形|で書いた|を残す|の中に|の中。|直後に追加|の前に追加|の下に追加|を追加|を挿入|読み比べ|抜粋|再掲")


def _variants_for_match(fl: list[str]) -> list[list[str]]:
    """照合に使う断片の変形群: そのまま → 先頭メタコメント剥がし → コメント行全除外。"""
    variants = [fl]
    i = leading_meta_lines(fl)
    if i:
        variants.append(fl[i:])
    nocmt = [l for l in fl if not re.match(r"^\s*(//|/\*|\{/\*|#|--)", l)]
    if nocmt and len(nocmt) != len(fl):
        variants.append(nocmt)
    return variants


def _norm_blob(lines: Sequence[str], keep_comments: bool = False) -> list[str]:
    """コード上の空白だけ潰した照合用の行リスト。
    文字列リテラル内の空白は内容なので残す。全部潰すと `"a b"` → `"ab"`
    の変更を適用済みと誤認する（issue #630）。テンプレートリテラルは行を
    跨ぐため引用状態と `${}` のブレース深さを行間で持ち回る。
    `${}` の中に文字列やテンプレートが入れ子になっても外側のテンプレート
    状態を失わないよう、テンプレートの文脈はスタックで持つ。
    keep_comments は冪等判定用。コメントも空白だけ潰して残し、
    コメントだけが違う断片を適用済みと誤認しないようにする。"""
    out: list[str] = []
    quote: Optional[str] = None  # ' / " の文字列内
    # 要素は "`"（テンプレート文字列部）か int（その `${}` 内のブレース深さ）
    tpl: list[str | int] = []
    in_block_comment = False
    for l in lines:
        if not l.strip():
            # テンプレート内の空行は文字列の中身なので、直前の行へ畳んで残す
            if tpl and tpl[-1] == "`" and out:
                out[-1] += l + "\n"
            continue
        buf: list[str] = []
        i, n = 0, len(l)
        while i < n:
            c = l[i]
            if in_block_comment:
                if c == "*" and i + 1 < n and l[i + 1] == "/":
                    in_block_comment = False
                    if keep_comments:
                        buf.append("*/")
                    i += 2
                    continue
                if keep_comments and not c.isspace():
                    buf.append(c)
                i += 1
                continue
            if quote or (tpl and tpl[-1] == "`"):
                # 文字列内容は空白も内容なのでそのまま残す
                buf.append(c)
                if c == "\\" and i + 1 < n:
                    buf.append(l[i + 1])
                    i += 2
                    continue
                if quote:
                    if c == quote:
                        quote = None
                elif c == "$" and i + 1 < n and l[i + 1] == "{":
                    buf.append("{")
                    tpl.append(1)
                    i += 1
                elif c == "`":
                    tpl.pop()
                i += 1
                continue
            if c.isspace():
                i += 1
                continue
            if c == "/" and i + 1 < n:
                if l[i + 1] == "/":
                    if keep_comments:
                        buf.append(re.sub(r"\s+", "", l[i:]))
                    break
                if l[i + 1] == "*":
                    in_block_comment = True
                    if keep_comments:
                        buf.append("/*")
                    i += 2
                    continue
            if c in "'\"":
                quote = c
            elif c == "`":
                tpl.append("`")
            elif tpl and c == "{":
                tpl[-1] += 1
            elif tpl and c == "}":
                tpl[-1] -= 1
                if tpl[-1] == 0:
                    tpl.pop()
            buf.append(c)
            i += 1
        # テンプレート内の改行も文字列の中身。区切りなしで連結する
        # _blob_locate で `a\nb` と `ab` が同一視されないよう残す
        if tpl and tpl[-1] == "`":
            buf.append("\n")
        out.append("".join(buf))
        # ' と " は行を跨げないので行末で未閉鎖なら状態をリセットする
        quote = None
    return out


def _squash(line: str) -> str:
    """照合用の1行つぶし。コード側の空白だけ潰し、文字列中身は保持する。
    _norm_blob の1行版。比較の両側で同じつぶし方を使うために統一する。
    空行は _norm_blob が落とすため '' を返す。"""
    b = _norm_blob([line])
    return b[0] if b else ""


def _match_keys(line: str) -> list[str]:
    """oracle行探し用のつぶしキー候補。
    リテラル保持つぶしを先に試し、断片がテンプレート行途中から始まる等で
    行単位のリテラル状態が取れない場合に備えて全空白つぶしもフォールバックにする。
    位置はあくまで手がかりで、内容の同一性は後段の照合が担保する。"""
    a = _squash(line)
    b = re.sub(r"\s+", "", line)
    return [a, b] if a != b else [a]


def _blob_locate(base_nb: list[str], frag_lines: list[str],
                 keep_comments: bool = False) -> int:
    """空白無視の文字列ブロブ照合で oracle 内の行位置を返す。
    教材と完成版コードで行の折り返しが違っていても内容が一致すれば見つかる。
    keep_comments は base_nb を作った _norm_blob と揃える。"""
    vb = "".join(_norm_blob(frag_lines, keep_comments))
    if len(vb) < 10:
        return -1
    # 検索側は行をまたいで結合する。区切り記号を挟むと断片の行折り返し差を
    # 吸収できないため、haystack 側も同じく区切りなしで並べて探す。
    flat = "".join(base_nb)
    pos = flat.find(vb)
    if pos < 0:
        return -1
    acc = 0
    for i, l in enumerate(base_nb):
        acc += len(l)
        if acc > pos:
            return i
    return -1


def _match_in_oracle(base_lines: list[str], fl: list[str]) -> tuple[int, int]:
    """断片が oracle で始まる位置と有効行数。見つからなければ (-1, 0)。
    教材の位置コメントは oracle に無いため、コメントを落とした変形でも照合し、
    行の折り返し差は空白無視ブロブ照合で吸収する。挿入は元の断片のまま行う。"""
    for v in _variants_for_match(fl):
        if not v:
            continue
        bi = find_in(base_lines, v)
        if bi >= 0:
            return bi, len(v)
    base_nb = _norm_blob(base_lines)
    for v in _variants_for_match(fl):
        bi = _blob_locate(base_nb, v)
        if bi >= 0:
            return bi, len(v)
    return -1, 0


def oracle_anchor(cur: list[str], base_lines: list[str], fl: list[str]) -> Optional[list[str]]:
    """指示なし断片: oracle との行アライメントで挿入位置を決める。
    cur と oracle の共通部分を SequenceMatcher で揃え、断片の oracle 位置の
    直前にある「最も近い一致ブロック」の cur 側位置へ挿入する。
    アンカー行の重複（`});` 等）に左右されず、宣言内への誤挿入も起きない。"""
    bi, _mlen = _match_in_oracle(base_lines, fl)
    if bi < 0:
        return None
    if bi == 0:
        return fl + cur
    sm = difflib.SequenceMatcher(a=base_lines, b=cur, autojunk=False)
    best_end_a = -1
    best_b = -1
    for blk in sm.get_matching_blocks():
        end_a = blk.a + blk.size
        end_b = blk.b + blk.size
        if end_a <= bi and (end_a > best_end_a or
                            (end_a == best_end_a and end_b < best_b)):
            best_end_a, best_b = end_a, end_b
    if best_b < 0:
        return None
    fl_ins = _dedup_tail(_strip_excess_closers(fl), cur, best_b)
    if not _literal_fragment_insert_ok(cur, fl_ins, best_b):
        return None
    return cur[:best_b] + fl_ins + cur[best_b:]


JSX_ELEM_HEAD = re.compile(r"^\s*<([A-Za-z][\w.]*)")
PLACEHOLDER_COMMENT = re.compile(r"残す|そのまま|変えない|残して")


def element_replace(cur: list[str], base_lines: list[str], fl: list[str]) -> Optional[list[str]]:
    """断片が <Tag ...> の完全な要素で cur に同名要素がある時は要素ごと置き換える。
    「Day 15 で置いた <TaskCard ... /> 全体を置き換える」型の指示を機械化するため、
    内容が oracle に存在する断片にだけ適用する。"""
    m = JSX_ELEM_HEAD.match(fl[0])
    # 先頭がコメントの断片は最初の要素だけを oracle に照合する
    # （完成版マージ断片は複数要素で oracle 連続一致に落ちないため）
    probe = fl
    if not m:
        for k in range(min(8, len(fl))):
            if JSX_ELEM_HEAD.match(fl[k]):
                probe = fl[k:element_end(fl, k) + 1]
                break
    if _match_in_oracle(base_lines, probe)[0] < 0:
        return None  # oracle に無い断片は置き換え根拠にできない
    if m:
        tag = m.group(1)
        hits = [i for i, l in enumerate(cur)
                if re.search(rf"<{re.escape(tag)}\b", l) and not l.strip().startswith("</")]
        if len(hits) != 1:
            return None
        s = element_start(cur, hits[0])
        e = element_end(cur, s)
        return cur[:s] + fl + cur[e + 1:]
    # 先頭がコメントの断片は、断片内の最初の要素開始行を cur で一意検索して置き換える。
    # 指示済み編集と完成版断片が二重に挿入されるのを防ぐ
    key = None
    key_idx = -1
    for k, l in enumerate(fl[:8]):
        if JSX_ELEM_HEAD.match(l):
            key = l.strip()
            key_idx = k
            break
    if key is None:
        return None
    hits = [i for i, l in enumerate(cur) if l.strip() == key]
    if len(hits) != 1:
        return None
    s = element_start(cur, hits[0])
    e = element_end(cur, s)
    return cur[:s] + fl + cur[e + 1:]


def retag_element(cur: list[str], base_lines: list[str], fl: list[str]) -> Optional[list[str]]:
    """`{/* 既存の〜を残す */}` のようなプレースホルダー付き断片。
    開閉タグだけを断片側へ交換し、中身は cur の子要素をそのまま残す。
    断片の開タグ位置を oracle で特定し、アライメントで cur 側の被ラップ要素を引く。"""
    if not any(PLACEHOLDER_COMMENT.search(l) for l in fl):
        return None
    head: list[str] = []
    for l in fl:
        if PLACEHOLDER_COMMENT.search(l):
            break
        head.append(l)
    if len(head) < 2:
        return None
    bi = find_in(base_lines, head)
    if bi < 0:
        bi = _blob_locate(_norm_blob(base_lines), head)
    if bi < 0:
        return None
    tail = fl[-1] if fl[-1].strip().startswith("</") or fl[-1].strip().endswith("/>") else None
    # oracle 上で断片が始まる要素の開始位置を割り出し、
    # その直前の一致ブロックに対応する cur 位置を引く。
    es = element_start(base_lines, bi)
    sm = difflib.SequenceMatcher(a=base_lines, b=cur, autojunk=False)
    best_end_a, best_b = -1, -1
    for blk in sm.get_matching_blocks():
        end_a, end_b = blk.a + blk.size, blk.b + blk.size
        if end_a <= es and (end_a > best_end_a or
                            (end_a == best_end_a and end_b < best_b)):
            best_end_a, best_b = end_a, end_b
    if best_b < 0:
        return None
    s = best_b
    while s < len(cur) and not cur[s].strip():
        s += 1
    if s >= len(cur) or not JSX_ELEM_HEAD.match(cur[s]):
        return None
    # 開タグが複数行に跨る時は `>` の行までを開タグ群として交換する。
    open_end = s
    while open_end < len(cur) and ">" not in cur[open_end]:
        open_end += 1
    e = element_end(cur, s)
    inner = cur[open_end + 1:e] if e > open_end else []
    close_lines = [tail] if tail else cur[e:e + 1]
    return cur[:s] + head + inner + close_lines + cur[e + 1:]


GENERIC_TAGS = {"div", "span", "p", "section", "main", "nav", "ul", "li", "a"}


IMPORT_FROM_RE = re.compile(r"from\s+['\"]([^'\"]+)['\"]")
BARE_IMPORT_RE = re.compile(r"^import\s+['\"]([^'\"]+)['\"]")


def _split_imports(fl: list[str]) -> list[list[str]]:
    """断片から import 文の塊を切り出す（複数行にまたがる import も一塊）。"""
    imps: list[list[str]] = []
    cur_imp: Optional[list[str]] = None
    for l in fl:
        s = l.strip()
        if not s:
            if cur_imp:
                cur_imp.append(l)
            continue
        if re.match(r"^(//|/\*|\{/\*|#)", s):
            continue  # 教材の位置コメントは import 本体ではない
        if cur_imp is None:
            if STATIC_IMPORT_RE.match(s):
                cur_imp = [l]
                if IMPORT_FROM_RE.search(s) or BARE_IMPORT_RE.match(s):
                    imps.append(cur_imp)
                    cur_imp = None
            else:
                return []  # import 以外の行が混じる断片は対象外
        else:
            cur_imp.append(l)
            if IMPORT_FROM_RE.search(s) or s.endswith((";", "'}")):
                imps.append(cur_imp)
                cur_imp = None
    if cur_imp is not None:
        imps.append(cur_imp)
    return [b for b in imps if b]


def _import_module(imp_lines: list[str]) -> Optional[str]:
    joined = "\n".join(imp_lines)
    m = IMPORT_FROM_RE.search(joined)
    if m:
        return m.group(1)
    m = BARE_IMPORT_RE.search(joined)
    return m.group(1) if m else None


def import_splice(cur: list[str], fl: list[str]) -> Optional[list[str]]:
    """import 断片: 同一モジュールの import ブロックを置き換え、
    無いモジュールは import 群の末尾に足す。複数行・分割 import の統合に対応。"""
    imps = _split_imports(fl)
    if not imps:
        return None
    out = cur
    for imp in imps:
        mod = _import_module(imp)
        if mod is None:
            continue
        mod_re = re.compile(
            rf"from\s+['\"]{re.escape(mod)}['\"]|^import\s+['\"]{re.escape(mod)}['\"]")
        hits = [i for i, l in enumerate(out) if mod_re.search(l)]
        if hits:
            # 最後尾から処理し、最初のヒットに新 import を置き、重複は除く
            for h in reversed(hits):
                start = h
                while start > 0 and not out[start].lstrip().startswith("import "):
                    start -= 1
                replacement = imp if h == hits[0] else []
                out = out[:start] + replacement + out[h + 1:]
        else:
            last_imp = max(
                (i for i, l in enumerate(out)
                 if STATIC_IMPORT_RE.match(l)),
                default=-1)
            if last_imp < 0:
                return imp + out
            end = _import_end(out, last_imp)
            if end is None:
                return None
            pos = end + 1
            out = out[:pos] + imp + out[pos:]
    return out


def _jsx_depth(lines: list[str]) -> int:
    """JSX タグの開閉深度。コメント・self-close を除いて <Tag> +1, </Tag> -1。"""
    depth = 0
    in_tag = False
    for l in lines:
        s = re.sub(r"/\*.*?\*/", "", l)
        if s.lstrip().startswith("//"):
            continue
        i = 0
        while i < len(s):
            if in_tag:
                m = re.search(r"(?<![=\-+])>", s[i:])
                if not m:
                    break
                j = i + m.start()
                if not s[i:j].rstrip().endswith("/"):
                    depth += 1
                in_tag = False
                i = j + 1
                continue
            if s[i] == "<":
                if s[i + 1:i + 2] == "/":
                    m = re.search(r"(?<![=\-+])>", s[i:])
                    if not m:
                        break
                    depth -= 1
                    i += m.start() + 1
                    continue
                if s[i + 1:i + 2] == ">":
                    depth += 1
                    i += 2
                    continue
                # 識別子直後の < はジェネリクス（useState<T> 等）なので JSX 扱いしない
                if (re.match(r"<[A-Za-z]", s[i:])
                        and (i == 0 or not re.match(r"[\w$]", s[i - 1]))):
                    m = re.search(r"(?<![=\-+])>", s[i:])
                    if not m:
                        in_tag = True
                        break
                    j = i + m.start()
                    if not s[i:j].rstrip().endswith("/"):
                        depth += 1
                    i = j + 1
                    continue
            i += 1
    return depth


def _splice_balanced(text: str) -> bool:
    """括弧と JSX タグの両方が閉じているか"""
    return (structural_balance_ok(text)
            and _jsx_depth(norm(text.split("\n"))) == 0)


def _is_test_like(path: str, joined: str) -> bool:
    """export を持たない正当なファイル: テスト・セットアップ・エントリ系。"""
    if re.search(r"\.(test|spec)\.", path) or "/test" in path or "test/" in path:
        return True
    return bool(re.search(r"\b(describe|it|test)\s*\(", joined))


def _strip_excess_closers(fl: list[str]) -> list[str]:
    """断片末尾の、断片自身の開きを超えて過剰な純閉じ行を削る。

    教材は「配列の最後の項目＋`],`」のように親構造の閉じ行まで
    文脈として含めて載せる。そのまま挿すと親の閉じが二重になる。"""
    pairs = {"}": "{", ")": "(", "]": "["}
    opens = {"{": 0, "(": 0, "[": 0}
    for l in fl:
        body = re.sub(r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`", "", l)
        for ch in body:
            if ch in opens:
                opens[ch] += 1
            elif ch in pairs:
                opens[pairs[ch]] -= 1
    i = len(fl) - 1
    while i >= 0:
        s = fl[i].strip()
        if not s:
            i -= 1
            continue
        line_pairs = {"{": 0, "(": 0, "[": 0}
        line_closers = {"{": 0, "(": 0, "[": 0}
        for ch in re.sub(r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`", "", fl[i]):
            if ch in line_pairs:
                line_pairs[ch] += 1
            elif ch in pairs:
                line_closers[pairs[ch]] += 1
        excess = any(line_closers[k] > line_pairs[k] and opens[k] < 0
                     for k in opens)
        if not excess:
            break
        for k in opens:
            opens[k] += line_pairs[k] - line_closers[k]
        fl = fl[:i] + fl[i + 1:]
        i -= 1
    return fl


def _dedup_tail(fl: list[str], cur: list[str], pos: int) -> list[str]:
    """挿入断片の末尾が cur の直後行と重複する場合、その重複分を削る。

    教材断片は文脈として閉じ括弧や要素終了行を含むことがあり、
    そのまま挿すと同一の閉じ行が二重になり開閉がずれる。"""
    dropped = 0
    while dropped < len(fl) and pos + dropped < len(cur):
        fl_l = fl[len(fl) - 1 - dropped]
        fn = _squash(fl_l)
        cn = _squash(cur[pos + dropped])
        pure_closer = (re.fullmatch(r"[\)\]\};/,]+", fn)
                       or re.match(r"^</", fl_l.strip()))
        if fn and fn == cn and pure_closer:
            dropped += 1
        else:
            break
    return fl[:len(fl) - dropped] if dropped else fl


def element_region_replace(cur: list[str], base_lines: list[str],
                           fl: list[str]) -> Optional[list[str]]:
    """断片が oracle 内で1つの JSX 要素領域を占める場合、その要素を
    cur 内の対応要素と差し替える。cur に似た要素が無い（新規追加）なら None。

    完成版節の断片は「新しい要素の中身」を示すが既存要素を置き換える意図の
    ものが多く、単純挿入すると新旧要素が二重化してタグが閉じなくなる。"""
    base_nb = _norm_blob(base_lines)
    joined = "\x00".join(base_nb)
    hits: list[int] = []
    for l in fl:
        for nb in _match_keys(l):
            if len(nb) < 15:
                continue
            pos = joined.find(nb)
            if pos < 0:
                continue
            acc = 0
            for i, b in enumerate(base_nb):
                acc += len(b) + 1
                if acc > pos:
                    hits.append(i)
                    break
            break
    if len(hits) < 2:
        return None
    bi0, bi1 = min(hits), max(hits)
    es = element_start(base_lines, bi0)
    ee = element_end(base_lines, es)
    while ee < bi1 and es > 0:
        es = element_start(base_lines, es - 1)
        ee = element_end(base_lines, es)
    if ee <= es:
        return None
    span = base_lines[es:ee + 1]
    sm = difflib.SequenceMatcher(a=base_lines, b=cur, autojunk=False)
    bs = be = -1
    for block in sm.get_matching_blocks():
        a0, b0, size = block
        if a0 <= es < a0 + size:
            bs = b0 + (es - a0)
        if a0 <= ee < a0 + size:
            be = b0 + (ee - a0) + 1
    if bs < 0 or be <= bs:
        return None
    # アライメントが旧要素の途中で止まると、その尻尾が孤立閉じ行になる。
    # cur 側も対応する要素の実際の終端まで伸ばす
    cs = element_start(cur, bs)
    ce = element_end(cur, cs)
    if ce >= be:
        be = ce + 1
    # cur 側の対象区間が oracle の要素と十分に似ている時だけ置き換える。
    # 行単位の _squash は複数行テンプレート・コメント中の引用符で揺れるため
    # 状態を持ち回る _norm_blob 側で比較する（issue #630）
    span_set = set(_norm_blob(span))
    cur_set = set(_norm_blob(cur[bs:be]))
    common = len(span_set & cur_set)
    # 分割断片のマージ単位は完成版の権威。一致3行以上あれば差し替えを認める
    if common < 3:
        return None
    return cur[:bs] + fl + cur[be:]


def decl_replace(cur: list[str], fl: list[str]) -> Optional[list[str]]:
    """均衝の取れた宣言断片が cur に同一名の宣言を持つなら、その宣言ごと置き換える。

    完成版節が「関数・コンポーネント全体」の新しい版を示す時、
    単純挿入すると旧宣言が残り二重定義＋開閉ずれになる。"""
    if not _splice_balanced("\n".join(fl)):
        return None
    subj = _fl_subject(fl)
    if subj is None or subj[0] != "decl":
        return None
    b = decl_boundary(cur, subj[1])
    if b is None:
        return None
    return cur[:b[0]] + fl + cur[b[1] + 1:]


def _fl_subject(fl: list[str]) -> Optional[tuple[str, str]]:
    """断片の主体: 最初の意味行から宣言名か JSX タグを取る。"""
    for l in fl:
        s = l.strip()
        if not s or re.match(r"^(//|/\*|\{/\*|#)", s):
            continue
        m = re.match(r"(?:export\s+)?(?:default\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)", s)
        if m:
            return ("decl", m.group(1))
        m = re.match(r"([A-Za-z_$][\w$]*)\s*:", s)
        if m:
            return ("decl", m.group(1))
        m = re.match(r"<([A-Za-z][\w.]*)", s)
        if m:
            return ("elem", m.group(1))
        break
    return None


def _oracle_pos(base_lines: list[str], fl: list[str]) -> int:
    """断片の oracle 内位置。最も長い「oracle に存在する行」が最も確かな手がかり。"""
    base_nb = _norm_blob(base_lines)
    joined = "\x00".join(base_nb)
    for l in sorted(fl, key=lambda x: -len(re.sub(r"\s+", "", x))):
        for nb in _match_keys(l):
            if len(nb) < 20:
                continue
            pos = joined.find(nb)
            if pos < 0:
                continue
            acc = 0
            for i, b in enumerate(base_nb):
                acc += len(b) + 1
                if acc > pos:
                    return i
    return -1


def positional_splice(cur: list[str], base_lines: list[str], fl: list[str]) -> Optional[list[str]]:
    """中間バージョン断片の最終フォールバック。
    断片が oracle と一致しない＝完成版が書き換わっている場合、断片の主体が
    oracle 内で占める位置をアライメントで cur に写し、
    同じ主体がそこにあれば置き換え、無ければ挿入する。"""
    subj = _fl_subject(fl)
    es = _oracle_pos(base_lines, fl)
    if es < 0 and subj is not None and not (
            subj[0] == "elem" and subj[1] in GENERIC_TAGS):
        kind, name = subj
        if kind == "decl":
            b = decl_boundary(base_lines, name)
            es = b[0] if b else -1
        else:
            hits = [i for i, l in enumerate(base_lines)
                    if re.search(rf"<{re.escape(name)}\b", l)
                    and not l.strip().startswith("</")]
            if hits:
                es = element_start(base_lines, hits[0])
    if es < 0:
        return None
    sm = difflib.SequenceMatcher(a=base_lines, b=cur, autojunk=False)
    best_end_a, best_b = -1, -1
    for blk in sm.get_matching_blocks():
        end_a, end_b = blk.a + blk.size, blk.b + blk.size
        if end_a <= es and (end_a > best_end_a or
                            (end_a == best_end_a and end_b < best_b)):
            best_end_a, best_b = end_a, end_b
    if best_b < 0:
        return None
    # 同じ主体がアライメント先に居るなら置き換え（教材版）、無ければ挿入
    if subj is not None:
        kind, name = subj
        if kind == "decl":
            cb = decl_boundary(cur, name)
            if cb is not None and abs(cb[0] - best_b) <= 8:
                return cur[:cb[0]] + fl + cur[cb[1] + 1:]
        else:
            # 汎用タグ(div等)主体の置換は範囲を取り違えて壊すため採用しない
            if name not in GENERIC_TAGS:
                for i in range(best_b, min(best_b + 8, len(cur))):
                    if re.search(rf"<{re.escape(name)}\b", cur[i]):
                        s = element_start(cur, i)
                        e = element_end(cur, s)
                        return cur[:s] + fl + cur[e + 1:]
    fl_ins = _dedup_tail(_strip_excess_closers(fl), cur, best_b)
    if not _literal_fragment_insert_ok(cur, fl_ins, best_b):
        return None
    return cur[:best_b] + fl_ins + cur[best_b:]


def _code_bracket_stack(
        lines: Sequence[str], upto: int
) -> list[tuple[str, int, int]]:
    """upto 行までの未閉鎖括弧スタック（文字・行・列）。文字列・コメント内の
    括弧は数えない。裸のオブジェクト/配列リテラル断片を文レベルの位置へ
    誤挿入するのを防ぐコンテキスト判定に使う。"""
    stack: list[tuple[str, int, int]] = []
    closer_of = {"}": "{", ")": "(", "]": "["}
    masked = _mask_code(lines[:upto])
    for ln, code in enumerate(masked):
        for i, c in enumerate(code):
            if c in "{([":
                stack.append((c, ln, i))
            elif (c in "})]" and stack
                  and stack[-1][0] == closer_of[c]):
                stack.pop()
    return stack


def _literal_fragment_insert_ok(
        cur: list[str], fl_ins: list[str], pos: int) -> bool:
    """裸のオブジェクト/配列リテラル断片（`{...}`/`[...]` 単体）の挿入可否。
    式コンテナ外の文位置に入ると `{ text: ... },` が裸ブロック化して構文
    エラーになるため、最内の開き括弧が式位置であることを確認する。"""
    first = next((l for l in fl_ins if l.strip()), "")
    if not re.match(r"^\s*[{([]", first):
        return True
    stack = _code_bracket_stack(cur, pos)
    if not stack:
        # 括弧スタックが空でも暗黙 return の JSX（`() => <div>…`）の中なら
        # `{` 始まり断片は式コンテナに入るので許可する（issue #630）
        return _jsx_depth(list(cur[:pos])) > 0
    ch, li, ci = stack[-1]
    if ch in "[(":
        return True
    prev = _code_text(cur[li])[:ci].rstrip()
    if not prev:
        # `{` が行頭に来る JS ブロック文位置は拒否するが、JSX 要素の内側なら
        # `{expr}` の式コンテナなので許可する
        return _jsx_depth(list(cur[:li])) > 0
    if prev.endswith("=>"):
        return False
    if re.search(r"\b(return|yield|throw|await|case)$", prev):
        return True
    if prev[-1] in "=(:,?[!&|{>":
        return True
    # 最内の `{` が式位置でなくても、挿入位置が JSX 要素の内側なら
    # `{` 断片は式コンテナに入るので許可する（issue #630）
    return _jsx_depth(list(cur[:pos])) > 0


def _is_listing_like(fl: list[str]) -> bool:
    """断片扱いに見えて実は全量リスティング相当のものを検出する。
    検証用リスティングを部分挿入すると宣言が二重になるので splice しない。"""
    if len(fl) < 40:
        return False
    first = next((l for l in fl if l.strip()), "")
    return bool(re.match(r"^\s*(import\b|export\b|'use |\"use )", first))


def _closers_only(fl: list[str]) -> bool:
    """閉じタグ・閉じ括弧だけで構成される断片か。コメント行は無視する。"""
    body = [l for l in fl if not re.match(r"^\s*(//|/\*|\{/\*)", l)]
    if not body:
        return False
    for l in body:
        s = l.strip()
        if not s:
            continue
        if not re.match(r"^[\}\)\]\>]|^</", s):
            return False
    return True


def _diff_start(before: list[str], after: list[str]) -> int:
    """適用で変わった先頭位置。挿入位置の記録に使う。"""
    for i in range(min(len(before), len(after))):
        if before[i] != after[i]:
            return i
    return min(len(before), len(after))


def _raw_groups(raw_lines: list[str]) -> list[list[str]]:
    """生行を「空行でない1行 + その直前の連続空行」のグループに分ける。

    照合用の norm 行1つに対応する書き込み単位。末尾に残った空行は
    最後のグループへ畳み込む。"""
    groups: list[list[str]] = []
    pend: list[str] = []
    for l in raw_lines:
        if not l.strip():
            pend.append(l)
            continue
        groups.append(pend + [l])
        pend = []
    if pend:
        if groups:
            groups[-1] += pend
        else:
            groups.append(pend)
    return groups


def _splice_raw(raw: list[list[str]], out: list[str], res: list[str],
                frag_norm: list[str], frag_groups: list[list[str]]
                ) -> tuple[list[list[str]], int]:
    """out→res の変更を書き込み用 raw 行グループへ写す。

    変更の無い行は raw の元グループ（空行・行末空白つき）をそのまま維持し、
    変更区間は res の行を使う。res 行が断片の norm 行と順に一致するなら
    断片側の生行グループを採用して、断片内部の空行・行末空白も復元する。
    消える行が所有していた先頭空行は次の行へ付け替えて消えないようにする。
    戻り値は (新しい raw グループ, res 上の変更終端 index)。"""
    sm = difflib.SequenceMatcher(None, out, res, autojunk=False)
    opcodes = sm.get_opcodes()
    new_raw: list[list[str]] = []
    pend: list[str] = []
    fp = 0
    first_change_end: Optional[int] = None
    # 断片が res 内に連続して書き込まれている位置。SequenceMatcher は断片の
    # 先頭行などを既存行との equal として扱うことがあり、変更区間だけで
    # 断片行を数えると対応がずれて正規化行が書き込まれるため、断片全体の
    # 位置で対応させる。変更区間と重なる出現だけを書き込み位置とみなす
    span = -1
    m = len(frag_norm)
    changed = [(j1, j2) for op, _i1, _i2, j1, j2 in opcodes
               if op != "equal" and j1 < j2]
    if m:
        for p in range(len(res) - m + 1):
            if res[p:p + m] == frag_norm and any(
                    j1 < p + m and p < j2 for j1, j2 in changed):
                span = p
                break

    def emit(group: list[str]) -> None:
        nonlocal pend
        if pend:
            group = pend + group
            pend = []
        new_raw.append(group)

    def frag_group(j: int, existing: Optional[list[str]]) -> list[str]:
        nonlocal pend
        k = j - span
        if k > 0:
            # 断片内部の空行配置は断片原文が持つ。置き換えで消える既存行の
            # 空行まで前置するとテンプレート内に改行が増える
            pend = []
        if k == 0 and existing is not None:
            # 断片先頭行の前の空行は既存ファイル側の配置を保つ
            return existing[:-1] + frag_groups[0][-1:]
        return list(frag_groups[k])

    for op, i1, i2, j1, j2 in opcodes:
        if op == "equal":
            for k in range(i1, i2):
                j = j1 + (k - i1)
                if span >= 0 and span <= j < span + m:
                    emit(frag_group(j, raw[k]))
                else:
                    emit(list(raw[k]))
            continue
        if first_change_end is None:
            first_change_end = j2
        if i1 < i2:
            pend.extend(raw[i1][:-1])
        for j in range(j1, j2):
            rline = res[j]
            if span >= 0:
                if span <= j < span + m:
                    emit(frag_group(j, None))
                else:
                    emit([rline])
            elif fp < len(frag_norm) and rline == frag_norm[fp]:
                emit(list(frag_groups[fp]))
                fp += 1
            else:
                emit([rline])
    if pend:
        if new_raw:
            new_raw[-1] += pend
        else:
            new_raw.append(pend)
    # 断片の先頭や末尾が既存行と equal 扱いになると最初の変更区間は断片の
    # 途中で終わる。続く閉じ断片を断片の内側へ入れないよう、断片全体の
    # 終端を優先する
    if span >= 0:
        return new_raw, span + m
    return new_raw, (first_change_end
                     if first_change_end is not None else len(res))


def splice_parts(cur_norm: list[str], cur_raw: list[str],
                 parts: list[Part], base_lines: list[str],
                 path: str, tag: str
                 ) -> tuple[Optional[tuple[list[str], list[str]]], list[dict]]:
    """1ファイル分の全断片を適用。1つでも失敗したら None（呼び出し側で巻き戻す）。

    照合は cur_norm（空行削除・行末空白削除済み）で行い、書き込み用の原文は
    cur_raw 由来の行グループだけで組み立てる。正規化済み行を書き戻すと
    無関係なテンプレートリテラル内の空行・行末空白まで壊れるため（issue #630）。"""
    gaps: list[dict] = []
    out = list(cur_norm)
    raw = _raw_groups(cur_raw)
    # 空白行だけのファイルは norm 行を持たないが _raw_groups は空行だけの
    # グループを1つ作る。対応する norm 行が無いので先頭の原文として退避する
    lead: list[str] = []
    if not out and len(raw) == 1:
        lead = raw.pop()
    if len(raw) != len(out):
        return None, [{"day": tag, "path": path,
                       "reason": "raw-norm-mismatch"}]
    last_end: Optional[int] = None
    idx = 0
    while idx < len(parts):
        part = parts[idx]
        idx += 1
        # 教材は1つの要素を複数フェンスに分けて載せることがある。
        # 括弧やJSXタグが閉じない断片に置き換え系の指示を適用すると
        # 要素ごと失うため、結合して閉じるまで後続のフェンスを畳み込む
        fl_probe = norm(part.body.split("\n"))
        merged = False
        if fl_probe and not _splice_balanced(part.body):
            acc_body = part.body
            # idx は既に次断片を指すため、そこから順に畳み込む。
            #（先に j += 1 すると直後の断片を読み飛ばして別要素を誤結合する）
            j = idx
            while j < len(parts) and j - idx < 8:
                acc_body += "\n" + parts[j].body
                if _splice_balanced(acc_body):
                    part = Part(cont=part.cont, body=acc_body,
                                kansei=part.kansei,
                                unmarked=part.unmarked,
                                prose=part.prose,
                                directive=part.directive)
                    idx = j + 1
                    merged = True
                    break
                j += 1
        fl = norm(part.body.split("\n"))
        if not fl:
            continue
        head0 = fl[0]
        if EXCERPT_RE.search(head0):
            continue  # 抜粋・読み比べ・写経しませんは参照提示なので適用しない
        # プレースホルダー行（「既存の〜を残す」）はコードではなく指示なので、
        # 挿入用の断片からは除く。retag だけは区切り記号として使うため元の fl を見る
        fl_ins = [l for l in fl
                  if not PLACEHOLDER_COMMENT.search(l)
                  and not KANSEI_LABEL.match(l)]
        if not fl_ins:
            continue
        # 照合は norm 済み行で行うが、書き込みは教材フェンスの原文を使う。
        # norm 結果を書き込むと文字列リテラルやテンプレート内の空行・行末空白が
        # 失われて完成版と食い違うため、前後の空行だけ落とした原文断片を使う
        raw_lines = [l for l in part.body.split("\n")
                     if not PLACEHOLDER_COMMENT.search(l)
                     and not KANSEI_LABEL.match(l)]
        fl_write = list(raw_lines)
        while fl_write and not fl_write[0].strip():
            fl_write.pop(0)
        while fl_write and not fl_write[-1].strip():
            fl_write.pop()
        if not fl_write:
            continue
        # fl_ins（norm・空行無し）と同じ対応順の生行グループ
        frag_groups = _raw_groups(fl_write)
        # retag はプレースホルダー行自体を区切りに使うため、
        # フィルタ無しの原文断片を別途渡す（norm 版の fl だと中身が失われる）
        fl_raw = part.body.split("\n")
        while fl_raw and not fl_raw[0].strip():
            fl_raw.pop(0)
        while fl_raw and not fl_raw[-1].strip():
            fl_raw.pop()
        # 先頭コメント行を落とした変形・空白吸収ブロブでも一致判定
        #（位置コメントや行折り返し差で一致しないだけの再適用を防ぐ）
        strip_i = leading_meta_lines(fl_ins)
        fl_core = fl_ins[strip_i:] if strip_i else fl_ins
        # 冪等判定ではコメントも内容として比べる。落とすと `// old` → `// new`
        # のようなコメントだけの書き換えを適用済みと誤認して黙って飛ばす
        out_nb = _norm_blob(out, keep_comments=True)
        # 空白吸収ブロブ一致は冪等判定には使えるが、指示つき断片では
        # 文字列リテラル内の空白差を「適用済み」と誤認するため除外する
        present_norm = (find_in(out, fl_ins) >= 0
                        or (fl_core and find_in(out, fl_core) >= 0)
                        or (not part.directive
                            and any(_blob_locate(out_nb, v, keep_comments=True)
                                    >= 0
                                    for v in _variants_for_match(fl_ins))))
        # 正規化は空行・行末空白を消すため、空白だけが違う壊れた baseline を
        # 「適用済み」と見逃す。原文で存在する時だけスキップする（issue #630）。
        # 比較は変化し続ける現在のファイル内容（raw 全体）に対し行境界つきで行い、
        # /* */ や // の中に置かれた見掛け上の一致は適用済みと数えない
        flat = [l for g in raw for l in g]
        noncode = _noncode_line_flags(flat)
        # コメントだけの断片はコメント自体が書き込む中身なので、
        # 一致区間がコメント行だけでも適用済みとして数える
        frag_has_code = not all(_noncode_line_flags(fl_write))

        def _counts_as_present(s: int, e: int) -> bool:
            return not frag_has_code or not all(noncode[s:e])

        m = len(fl_write)
        verbatim = any(
            flat[k:k + m] == fl_write and _counts_as_present(k, k + m)
            for k in range(len(flat) - m + 1))
        if verbatim:
            continue  # 冪等: 既に存在する断片はスキップ（完成版参照や再適用）
        res: Optional[list[str]] = None
        if present_norm:
            # 正規化済みでは存在するが原文が違う = 空白差だけの壊れた
            # baseline。find_in で位置が取れるならその場で原文断片へ
            # 置き換えて修復する。取れない緩い一致は従来どおりスキップ
            i = find_in(out, fl_ins)
            off = 0
            if i < 0 and fl_core:
                i = find_in(out, fl_core)
                off = strip_i
            if i < 0:
                continue
            # 本体だけが一致した場合は先頭の位置指示コメントを書き込まない。
            # 教材用のコメントがファイルへ紛れ込むため
            seg = fl_ins[off:]
            seg_groups = frag_groups[off:]
            hit = len(seg)
            # 一致区間が /* */ や // の内側なら「適用済み」の見掛け一致なので
            # 修復せず、通常の splice 経路で実際のコード位置へ書き込む
            s0 = sum(len(g) for g in raw[:i])
            e0 = s0 + sum(len(g) for g in raw[i:i + hit])
            if _counts_as_present(s0, e0):
                # 先頭行の前の空行は既存ファイル側を保ち、以降は断片原文を使う
                fg = ([raw[i][:-1] + seg_groups[0][-1:]]
                      + [list(g) for g in seg_groups[1:]])
                out = out[:i] + seg + out[i + hit:]
                raw = raw[:i] + fg + raw[i + hit:]
                last_end = i + hit
                continue
        if part.directive:
            res = apply_directive(out, part.directive, fl_ins)
            if res is None:
                # 指示が解けない時も oracle 位置照合で救えるなら救う
                res = oracle_anchor(out, base_lines, fl_ins)
            if res is None:
                res = positional_splice(out, base_lines, fl_ins)
            if res is not None:
                raw, last_end = _splice_raw(raw, out, res,
                                            fl_ins, frag_groups)
                out = res
                continue
            gaps.append({"day": tag, "path": path,
                         "reason": "directive-anchor-not-found",
                         "anchor": f"{part.directive.kind}:{part.directive.arg[0] if part.directive.arg else ''}"[:80]})
            return None, gaps
        res = retag_element(out, base_lines, fl_raw)
        if res is None:
            res = import_splice(out, fl_ins)
        if res is None:
            res = decl_replace(out, fl_ins)
        if res is None:
            res = element_replace(out, base_lines, fl_ins)
        if res is None and merged:
            res = element_region_replace(out, base_lines, fl_ins)
        if res is None:
            res = oracle_anchor(out, base_lines, fl_ins)
        if res is None:
            res = positional_splice(out, base_lines, fl_ins)
        if res is None and last_end is not None and _closers_only(fl_ins):
            # 閉じタグだけの断片: 教材は同じ編集箇所を連続で示すため
            # 直前に挿入した断片の直後に続ける。書き込み側の行数で進める
            out = out[:last_end] + fl_ins + out[last_end:]
            raw = raw[:last_end] + [list(g) for g in frag_groups] \
                + raw[last_end:]
            last_end += len(fl_ins)
            continue
        if res is None:
            if part.kansei or _is_listing_like(fl):
                # 確認用リスティングが置けなくても実害はないので、
                # ファイルを巻き戻さず記録だけして進める
                gaps.append({"day": tag, "path": path,
                             "reason": "kansei-listing-unplaced",
                             "head": head0[:80]})
                continue
            gaps.append({"day": tag, "path": path,
                         "reason": "fragment-not-in-baseline-or-anchor-ambiguous",
                         "head": head0[:80]})
            return None, gaps
        # 挿入位置の記録は「書き込んだ側」の長さで進める。
        # norm 後の長さだと断片中の空行分ずれて次の断片が文の途中へ入る
        raw, last_end = _splice_raw(raw, out, res, fl_ins, frag_groups)
        out = res
    flat_out = lead + [l for g in raw for l in g]
    return (out, flat_out), gaps


# ---------------------------------------------------------------------------
# 適用前バックアップ（verify_day 失敗時に baseline へ戻すため）
# ---------------------------------------------------------------------------

def backup_root_for(target_dir: Path) -> Path:
    # ビルド対象アプリのツールチェーンに拾われないよう target の兄弟ディレクトリに置く
    return target_dir.parent / f"{target_dir.name}.apply-backups"


def snapshot_file(backup_root: Path, tag: str, rel_path: str, dest: Path) -> None:
    meta_path = backup_root / tag / "manifest.json"
    meta = {"modified": [], "created": []}
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    # パス区切りと `_` を個別エスケープしないと `a/b` と `a_b` や
    # `a_/b` と `a/_b` が衝突する。`_`→`_u`、`/`→`_s` の一方向変換にする
    key = "".join("_u" if c == "_" else "_s" if c == "/" else c
                  for c in rel_path)
    if rel_path in meta["created"]:
        # 初回実行で新規作成と記録済み。再実行時は作成状態のまま残し、
        # restore で削除できるようにする（modified へ再分類しない）。
        pass
    elif dest.exists():
        snap = backup_root / tag / "files" / key
        # 同タグで再実行しても初回のバックアップを上書きしない。
        # restore は「このタグの適用前」の状態を保証する責務があるため。
        if not snap.exists():
            snap.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(dest, snap)
        if rel_path not in meta["modified"]:
            meta["modified"].append(rel_path)
    else:
        # modified 記録済みのパスは「タグ開始時に存在した」が正しい状態。
        # mv で移動した後に同名を再作成すると、modified と created の両方へ
        # 登録され、restore が復元直後に削除してしまう。created は未登録の
        # パスのみに限定する。
        if rel_path not in meta["created"] and rel_path not in meta["modified"]:
            meta["created"].append(rel_path)
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n",
                         encoding="utf-8")


def restore_day(backup_root: Path, tag: str, target_dir: Path) -> list[str]:
    """manifest に従い <tag> の適用前状態へ復元し、復元したパスを返す。"""
    meta_path = backup_root / tag / "manifest.json"
    if not meta_path.exists():
        return []
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    restored: list[str] = []
    for rel in meta.get("modified", []):
        snap = backup_root / tag / "files" / "".join(
            "_u" if c == "_" else "_s" if c == "/" else c for c in rel)
        if not snap.exists():
            # キー形式変更前に作られたバックアップ（`/`→`__` 形式）も復元対象にする
            snap = backup_root / tag / "files" / rel.replace("/", "__")
        if snap.exists():
            dest = target_dir / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(snap, dest)
            restored.append(rel)
    for rel in meta.get("created", []):
        dest = target_dir / rel
        if dest.exists():
            dest.unlink()
            restored.append(rel)
    return restored


# ---------------------------------------------------------------------------
# メイン適用
# ---------------------------------------------------------------------------

def apply_day(md_path: Path, target_dir: Path, *, oracle_dir: Optional[Path] = None,
              backup_root: Optional[Path] = None, tag: str = "day00",
              ledger_path: Optional[Path] = None) -> tuple[list[str], list[str]]:
    """教材 markdown を target_dir へ適用。(written, skipped) を返す。"""
    oracle_dir = oracle_dir or REPO_DIR
    backup_root = backup_root or backup_root_for(target_dir)
    content = md_path.read_text(encoding="utf-8")
    esbuild_env = os.environ.get("APPLY_DAY_ESBUILD")
    esbuild_candidates = [
        esbuild_env,
        str(target_dir / "node_modules" / ".bin" / "esbuild"),
        shutil.which("esbuild"),
    ]
    esbuild = next((p for p in esbuild_candidates if p and Path(p).exists()), None)

    parts_map = collect_parts(content)

    # シェル操作(mv)はファイル系フェンスより先に処理する
    written: list[str] = []
    skipped: list[str] = []
    for m in re.finditer(r"```(bash|shell|sh|zsh)\n(.*?)```", content, re.S):
        w, s = apply_safe_shell_ops(m.group(2), target_dir, backup_root, tag)
        written.extend(w)
        skipped.extend(s)

    applied_rec: list[dict] = []
    gaps: list[dict] = []

    for path, parts in parts_map.items():
        dest = target_dir / path
        baseline = oracle_dir / path
        base_lines = norm(baseline.read_text(encoding="utf-8").split("\n")) \
            if baseline.exists() else []
        dest_exists = dest.exists()
        dest_text = dest.read_text(encoding="utf-8") if dest_exists else ""
        any_import = any("import " in p.body for p in parts) or (
            dest_exists and "import " in dest_text)
        any_export = any("export " in p.body for p in parts)
        is_ts_family = ext_of(path) in ("ts", "tsx", "js", "mjs", "jsx")

        # 全量リスティング候補を試す（完成版ラン → 末尾ラン → 全結合 → 最大単品）
        cur_lines_for_cov = norm(dest_text.split("\n")) if dest_exists else []
        picked: Optional[str] = None
        mode = None
        for label, joined, prose in candidates(parts):
            if any_import and "import " not in joined:
                continue
            if is_ts_family and any_export and "export " not in joined:
                continue
            if not parses_as_file(path, joined, esbuild):
                continue
            if dest_exists:
                r1, r2 = coverage(joined, base_lines)
                # 中間バージョンは完成版 oracle と乖離するため、
                # 「当日の完成版が現在ファイルをほぼ包含するか」でも採用を判定する
                _c1, r2_cur = coverage(joined, cur_lines_for_cov)
                nlines = len([l for l in joined.split("\n") if l.strip()])
                # 既存ファイルの WRITE 採用は「現在のファイルをほぼ包含」が条件。
                # 完成版以外の断片候補がファイルの一部（例: 末尾2行）を被覆するだけで
                # 全量リスティング扱いされると残りが消えるため、kansei 系以外は
                # 0.9 以上の高い包含率を要求する。
                if r2_cur >= 0.6 and (label.startswith("kansei") or r2_cur >= 0.9):
                    picked, mode = joined, label
                elif r2 >= 0.30 and (r2 >= 0.85 or nlines >= 25):
                    # oracle 包含率でも短い断片が紛れ込むため、
                    # ほぼ全量を被覆するか中規模以上の listing のみ採用する
                    picked, mode = joined, label
                elif (r1 < 0.30 and nlines >= 25 and looks_complete(joined)
                        and prose != "frag"
                        and (not is_ts_family or "export " in joined)):
                    picked, mode = joined, label + "-divergent"
                else:
                    continue
            else:
                # 新規ファイル: 断片の寄せ集めを「ファイル」として書き出さない。
                # ts系の完全なリスティングには必ず export がある
                #（ただしテスト・セットアップ等は export を持たない）
                if (is_ts_family and "export " not in joined
                        and not _is_test_like(path, joined)):
                    continue
                picked, mode = joined, label
            if picked is not None:
                if dest_exists and not mode.endswith("-divergent"):
                    # 既存ファイルを「明らかに小さい継ぎ足し」で上書きすると
                    # 既存宣言が消える（day28 task.ts 型の損失: 完成版の断片結合を
                    # 全量リスティングと誤認し残りを丸ごと落とす）。部分リスティング
                    # による内容喪失を防ぐため、大きく縮む WRITE は採用しない。
                    # -divergent は全量置き換えが意図の候補なので対象外。
                    cur_n = len([l for l in dest_text.split("\n") if l.strip()])
                    if nlines < cur_n * 0.9:
                        picked, mode = None, None
                        continue
                # 現ファイルと一致するだけの断片は「全量リスティング」ではなく
                # 再掲コピー。それを WRITE すると、同じフェンス群にある他の
                # 追記断片が静かに捨てられるため採用しない。
                if norm(picked.split("\n")) == cur_lines_for_cov:
                    picked, mode = None, None
                    continue
                break

        if picked is not None:
            snapshot_file(backup_root, tag, path, dest)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(picked + ("" if picked.endswith("\n") else "\n"),
                            encoding="utf-8")
            written.append(f"WRITE  {path} ({mode})")
            applied_rec.append({"path": path, "n": len(parts), "mode": mode})
            continue

        # リスティングとして採用できない = 断片。既存ファイルへ splice する。
        if not dest_exists:
            gaps.append({"day": tag, "path": path,
                         "reason": "diff-fragments-for-nonexistent-file; cannot create"})
            skipped.append(f"splice skipped (file absent): {path}")
            continue

        # 照合は norm 済み行で行うが、書き込みは既存ファイルの原文を使う。
        # norm の結果をそのまま書くと無関係な箇所の空行・行末空白まで
        # 消えて完成版と食い違うため、照合用と書込用を別系列で持ち回る
        #（issue #630）
        cur = norm(dest_text.split("\n"))
        cur_raw = dest_text.split("\n")
        if cur_raw and not cur_raw[-1]:
            cur_raw.pop()
        spliced, file_gaps = splice_parts(
            cur, cur_raw, parts, base_lines, path, tag)
        if spliced is None:
            # 断片照合の失敗: このファイルは書き換えない（= 直前の正常 baseline を維持）。
            gaps.extend(file_gaps)
            skipped.append(f"splice rejected, baseline kept: {path}")
            continue
        # splice 成功でも未適用断片が残る場合がある（kansei-listing-unplaced 等）。
        # 成功パスで握り潰すと ledger と終了コード判定から漏れ「部分適用」を
        # 完走と誤判定するため、成否に関わらず gaps へ集計する。
        gaps.extend(file_gaps)
        _new_norm, new_raw_lines = spliced
        spliced_text = "\n".join(new_raw_lines) + "\n"
        if is_ts_family and not parses_as_file(path, spliced_text, esbuild):
            # splice 後の構文健全性が壊れている時も書き込まず baseline を維持する。
            gaps.append({"day": tag, "path": path,
                         "reason": "splice-result-failed-parse; baseline kept"})
            skipped.append(f"splice parse-failed, baseline kept: {path}")
            continue

        snapshot_file(backup_root, tag, path, dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(spliced_text, encoding="utf-8")
        written.append(f"SPLICE {path} ({len(parts)} parts)")
        applied_rec.append({"path": path, "n": len(parts), "mode": "splice"})

    if ledger_path is not None:
        rec = {"day": tag, "md": md_path.name, "applied": applied_rec, "gaps": gaps}
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        with ledger_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    skipped.extend(f"gap:{g['reason']}:{g['path']}" for g in gaps)
    return written, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description="Day教材の写経適用/復元")
    parser.add_argument("args", nargs="*", help="<md> <target> or <tag> <target> with --restore")
    parser.add_argument("--restore", action="store_true",
                        help="指定 tag の適用前 baseline へ復元する")
    parser.add_argument("--oracle", type=Path, default=None,
                        help="断片照合に使う完成版アプリのルート (既定: このリポジトリ)")
    parser.add_argument("--tag", default=None,
                        help="バックアップ/台帳に使う日タグ (既定: dayNNをmd名から推測)")
    parser.add_argument("--backup-root", type=Path, default=None,
                        help="適用前スナップショットの保存先 (既定: <target>.apply-backups)")
    parser.add_argument("--ledger", type=Path, default=None,
                        help="適用結果 JSONL の追記先")
    ns = parser.parse_args()

    if ns.restore:
        if len(ns.args) != 2:
            print("Usage: apply_day.py --restore <tag> <target_app_dir> [--backup-root DIR]")
            sys.exit(1)
        tag, target_dir = ns.args[0], Path(ns.args[1])
        backup_root = ns.backup_root or backup_root_for(target_dir)
        restored = restore_day(backup_root, tag, target_dir)
        print(f"[apply_day] restore {tag}: {len(restored)} files")
        for r in restored:
            print(f"  ↩ {r}")
        sys.exit(0 if restored or not (backup_root / tag).exists() else 1)

    if len(ns.args) != 2:
        print("Usage: apply_day.py <day_md_file> <target_app_dir> [--oracle DIR] [--tag TAG] [--ledger PATH]")
        sys.exit(1)

    md_path, target_dir = Path(ns.args[0]), Path(ns.args[1])
    if not md_path.exists():
        print(f"ERROR: {md_path} not found")
        sys.exit(1)
    if not target_dir.exists():
        print(f"ERROR: {target_dir} not found")
        sys.exit(1)

    tag = ns.tag or (re.search(r"day(\d+)", md_path.name).group(0)
                     if re.search(r"day(\d+)", md_path.name) else "day00")

    written, skipped = apply_day(
        md_path, target_dir,
        oracle_dir=ns.oracle, backup_root=ns.backup_root,
        tag=tag, ledger_path=ns.ledger)

    print(f"[apply_day] {md_path.name} (tag={tag})")
    for w in written:
        print(f"  ✅ {w}")
    if skipped:
        print(f"  (skipped {len(skipped)} blocks)")
        for s in skipped:
            print(f"  ⚠️  {s}")
    print(f"  → {len(written)} files written")

    # 0 件書き込みかつ skip もない = アプリコードを書かない Day。
    # build 検証だけ続けられるよう success とする。
    if not written and not skipped:
        print("  ℹ️ no app file changes in this day")
        return

    # 0 件書き込みで skip がある = filepath マーカー不足 or 検出ロジック過剰スキップ。
    # 後段ステップが false-positive で「pass」と判定するのを防ぐため non-zero で抜ける。
    if not written:
        print("  ❌ no files written — fail to surface false-positive day-pass")
        sys.exit(2)

    # 一部のファイルが reject/skip されても別ファイルが書ければ終了コード0に
    # なると、「完走した」と見做して部分適用のまま翌日へ進んでしまう。
    # Gate B では1件でも未適用があれば失敗として扱う。
    if skipped:
        print(f"  ❌ {len(skipped)} block(s) not applied — partial apply is a fail")
        sys.exit(3)


if __name__ == "__main__":
    main()
