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
from fence_roles import (  # noqa: E402
    INFO_PATH,
    is_safe_rel_path,
    roles as _roles,
)

CONT_NOTE = re.compile(r"続き")
ELLIPSIS_LINE = re.compile(
    r"^\s*(?://+|/\*+|#|<!--)?\s*(?:…|\.{3,})\s*$|"
    r"^\s*(?://+|/\*+|#|<!--)\s*(?:…|\.{3,})")
# 「既存の〜を残す」「中略」等、コメント自体が省略「指示」のものだけを
# プレースホルダーとみなす。`省略せず全文表示` のような通常コメントは
# 対象外（day27 実在コメント）。末尾は語の終わりを要求して誤検を防ぐ
PLACEHOLDER_NOTE = re.compile(
    r"^\s*(?://+|/\*+|\{/\*|\*\s|#|<!--|--|;)\s*(?:"
    r"既存の[^\n]*?(?:残す|そのまま|変えない)|"
    r"中略|前略|後略|以下略|省略)(?:$|[\s:：*/]|…)")


class Finding(tuple):
    __slots__ = ()

    @property
    def lineno(self) -> int:
        return self[0]

    @property
    def message(self) -> str:
        return self[1]


def _fm_target(fm) -> str | None:
    """従来の `// filepath:` 注記から対象パスを取り出す。

    `// filepath: src/a.ts（続き）` のような末尾の補足注記はパスでは
    ないので括弧以降を削る。残せると安全パス判定で落ちて対応 apply が
    数えられなくなる。
    """
    if fm is None:
        return None
    return re.split(r"[（(]", filepath_value(fm).strip())[0].strip() or None


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
            # 役割タグを持つフェンスは言語を問わず検査対象
            #（```yaml expect のような契約を素通りさせない）
            if open_lang in CODE_LANGS or _roles(info):
                yield start, info, buf
            # 閉じた後に info が残ると終端の未閉フェンス判定が
            # 同じフェンスを二重に返すため、ここで必ず消す
            buf, start, info, open_lang = [], 0, "", ""
    # CommonMark と同じく、閉じないまま終端したフェンスも本文として扱う。
    # 捨てると expect 契約が lint をすり抜ける
    if open_lang and (open_lang in CODE_LANGS or _roles(info)):
        yield start, info, buf


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
            if is_apply:
                # ` ```lang apply expect ` の併記は複合役割として廃止。
                # 同じ本文を適用してから自分と突合する自己比較は何も検算
                # しないため、apply 断片と expect 完成版に分けて書く。
                findings.append(Finding((
                    lineno,
                    "apply と expect の併記は使えません"
                    "（適用は apply フェンス、最終状態の検算は別の expect"
                    " フェンスに分けて書きます）")))
                continue
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
                if ELLIPSIS_LINE.match(l) or PLACEHOLDER_NOTE.match(l):
                    findings.append(Finding((
                        lineno,
                        f"expect 本体に省略/プレースホルダー行があります: "
                        f"{target}（{j + 1} 行目）")))
                    break
            expect_entries.append((lineno, target, body))
            expect_seen.setdefault(target, lineno)
            continue

        target = info_path or _fm_target(fm)
        if target is None:
            continue
        if is_apply and info_path and not is_safe_rel_path(info_path):
            findings.append(Finding((
                lineno,
                f"apply の対象が写経先として安全ではありません: {info_path}")))
            continue
        # 無タグフェンスの対応 apply は `// filepath:` 目印が根拠。
        # info 側の `path=` だけでは apply_day 側で対象が確定しないため
        # 数えない（数えると実行時に expect-without-apply で止まる教材を
        # 品質ゲートが通してしまう）
        if is_safe_rel_path(target) and (is_apply or fm is not None):
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
