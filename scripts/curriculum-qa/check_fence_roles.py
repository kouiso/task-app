#!/usr/bin/env python3
"""フェンスの役割タグ（apply / expect）を検査する。

背景: day28 の完成版リスティング問題で確定した記法。

    ```typescript apply path=src/app/page.tsx    …適用する断片/リスティング
    ```typescript expect path=src/app/page.tsx   …その日の最終状態の検算

従来の完成版フェンスは「適用対象」と「検算用オラクル」の2役を1つの目印で
担っていた。Step の指示フェンスと完成版フェンスが同じ領域を二重に記述すると、
写経ツールはどちらが正の姿かを判別できず、安全 reject するしかなかった。
役割をフェンスの情報文字列で分離するのがこの記法である。

## 検査する規則

1. ` ```lang expect ` は `path=` を必須とする。検算先が書かれない expect は
   何を検算するのか読み手にも写経ツールにも分からない。
2. `expect` はファイル全体の最終状態だけを名乗れる。省略記号・「続き」注記・
   「既存の〜を残す」系のプレースホルダーが入った本体は部分ファイルであり、
   検算に使えないので lint エラーにする。
3. `expect` には同じファイル内の `apply` ブロック（`path=` 付きの apply か、
   従来の `// filepath:` ブロック）が1本以上必要である。検算だけ置いて
   適用する手順を書かない日は、読者が再現できない。
4. `apply path=` の path は写経対象の安全なパスでなければならない。

後方互換: 役割タグの無い `// filepath:` ブロックは従来どおり apply 扱い。
全30日を一度に書き換えるのではなく、新しい完成版の提示から徐々に移すため、
タグ無しそのものはエラーにしない。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from curriculum_blocks import (  # noqa: E402
    CODE_LANGS,
    filepath_value,
    first_filepath_match,
)
from markdown_scan import fence_states  # noqa: E402

# apply_day.py の is_safe_rel_path と同じ判定。写経ツールが書き込みを許すのと
# 同じ範囲を lint でも認める。乖離すると教材が lint で通って写経で reject される
# （またはその逆の）すれ違いが起きる。
SAFE_PREFIXES = ("src/", "prisma/", "public/", "scripts/", "e2e/")
SAFE_ROOT_FILES = frozenset({
    ".env.example", ".env.local.example", "docker-compose.yml",
    "docker-compose.yaml", "next.config.ts", "next.config.js",
    "next.config.mjs", "vitest.config.ts", "vitest.config.mts",
    "tailwind.config.ts", "tailwind.config.js", "postcss.config.mjs",
    "postcss.config.js", "components.json", "middleware.ts",
    "tsconfig.json", "playwright.config.ts",
})
PATH_OK = re.compile(r"^[A-Za-z0-9_./\-]+$")
JP_RE = re.compile(r"[぀-ヿ一-鿿（）]")  # noqa: E501 -- ひらがな/カタカナ/漢字/全角括弧
INFO_PATH = re.compile(r"\bpath=([^\s（)]+)")
ROLE_TOKEN = re.compile(r"\b(apply|expect)\b")
CONT_NOTE = re.compile(r"続き")
ELLIPSIS_LINE = re.compile(
    r"^\s*(?://+|/\*+|#|<!--)?\s*(?:…|\.{3,})\s*$|"
    r"^\s*(?://+|/\*+|#|<!--)\s*(?:…|\.{3,})")
PLACEHOLDER = re.compile(r"既存の|中略|省略|前略|後略|以下略")
# 「既存の〜」を含む表示文言など、実コード中の日本語はプレースホルダーでは
# ない。省略の目印として見るのはコメント行の注記だけに限る
COMMENT_LINE = re.compile(r"^\s*(?://|/\*|\*|#|<!--|--|;)")


def _roles(info: str) -> frozenset:
    """info 文字列の役割トークン。path= の値の中の apply/expect を
    役割と誤認しないよう、属性を除いてから判定する（apply_day と同じ）。"""
    return frozenset(ROLE_TOKEN.findall(INFO_PATH.sub("", info)))


def is_safe_rel_path(rel: str) -> bool:
    if ".." in rel or rel.startswith("/"):
        return False
    return bool(
        PATH_OK.match(rel)
        and not JP_RE.search(rel)
        and (rel.startswith(SAFE_PREFIXES) or rel in SAFE_ROOT_FILES))


class Finding(tuple):
    __slots__ = ()

    @property
    def lineno(self) -> int:
        return self[0]

    @property
    def message(self) -> str:
        return self[1]


def iter_code_fences(text: str):
    """(開始行, info, 中身行) を言語付きフェンスごとに返す。"""
    buf: list[str] = []
    start = 0
    info = ""
    open_lang = ""
    for lineno, line, state, fence in fence_states(text):
        if state == "open" and fence is not None:
            buf, start, info = [], lineno, fence.info
            open_lang = fence.lang
            continue
        if state == "inside":
            buf.append(line)
            continue
        if state == "close":
            if open_lang in CODE_LANGS:
                yield start, info, buf
            open_lang = ""


def check_text(text: str, name: str) -> list[Finding]:
    findings: list[Finding] = []
    apply_targets: set[str] = set()
    expect_entries: list[tuple[int, str, list[str]]] = []
    expect_seen: dict[str, int] = {}

    for lineno, info, body in iter_code_fences(text):
        joined = "\n".join(body)
        roles = _roles(info)
        is_expect = "expect" in roles
        is_apply = "apply" in roles
        pm = INFO_PATH.search(info)
        info_path = pm.group(1) if pm else None
        fm = first_filepath_match(joined)

        if is_expect:
            if info_path is None:
                findings.append(Finding((
                    lineno,
                    "expect フェンスに path= がありません（検算先が不明）")))
                continue
            target = info_path.strip()
            if target in expect_seen:
                findings.append(Finding((
                    lineno,
                    f"expect が同じ対象に重複しています: {target}"
                    f"（{expect_seen[target]} 行目と矛盾する恐れ）")))
            if not is_safe_rel_path(target):
                findings.append(Finding((
                    lineno,
                    f"expect の対象が写経先として安全ではありません: {target}")))
                continue
            if CONT_NOTE.search(info) or any(
                    CONT_NOTE.search(l) and "filepath" in l for l in body):
                findings.append(Finding((
                    lineno,
                    f"expect はファイル全体でなければなりません（続き注記）: {target}")))
            for j, l in enumerate(body):
                if ELLIPSIS_LINE.match(l) or (
                        COMMENT_LINE.match(l) and PLACEHOLDER.search(l)):
                    findings.append(Finding((
                        lineno,
                        f"expect 本体に省略/プレースホルダー行があります: "
                        f"{target}（{j + 1} 行目）")))
                    break
            expect_entries.append((lineno, target, body))
            expect_seen.setdefault(target, lineno)
            if is_apply:
                # ` ```lang apply expect ` は内容であり契約でもある両役フェンス。
                # 対応 apply の要件は自分自身で満たす。
                apply_targets.add(target)
            continue

        target = info_path or (filepath_value(fm).strip() if fm else None)
        if target is None:
            continue
        if is_apply and info_path and not is_safe_rel_path(info_path):
            findings.append(Finding((
                lineno,
                f"apply の対象が写経先として安全ではありません: {info_path}")))
            continue
        if is_safe_rel_path(target):
            apply_targets.add(target)

    for lineno, target, _body in expect_entries:
        if target not in apply_targets:
            findings.append(Finding((
                lineno,
                f"expect に対応する apply ブロックがありません: {target}")))
    return findings


def iter_day_files(root: Path) -> list[Path]:
    return sorted(root.glob("day[0-9][0-9]_*.md"))


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("❌ corpus ディレクトリを指定してください", file=sys.stderr)
        return 1
    root = Path(argv[1])
    files = iter_day_files(root)
    if not files:
        print("❌ day ファイルがありません", file=sys.stderr)
        return 1

    all_findings: list[tuple[str, Finding]] = []
    for f in files:
        for fg in check_text(f.read_text(encoding="utf-8"), f.name):
            all_findings.append((f.name, fg))

    if all_findings:
        print(f"❌ フェンス役割タグの問題が {len(all_findings)} 件")
        for name, fg in all_findings:
            print(f"  {name}:{fg.lineno} {fg.message}")
        return 1

    print(f"✅ フェンス役割タグ OK（{len(files)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
