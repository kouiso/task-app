#!/usr/bin/env python3
"""教材が「完成版」として出すコードと、リポジトリの src/ を機械照合する。

## この検査が生まれた事故

Day 29 の「完成コード全体」セクションが旧実装のまま残り、Step 節の教示内容と
矛盾していた（2026-09-18 レビューで発見・修正済み）。写経した読者が、正しい
コードをわざわざ古い実装へ書き戻す形になる。

`build_day_snapshots.py` は完成版ブロックから日次ツリーを組むが、それは
「組んだコードが型検査を通るか」しか見ない。古い実装も TypeScript としては
通るので、完成版と src/ の差分を照合する検査がどこにも無かった。
src/ が改良されるたびに教材の完成版が静かに陳腐化する構造的盲点である。

## 何を照合するか

ファイルごとに「教材が最後に出す完全な版」を採り、対応する `src/` の現物と
比べる。最後に出す版が最終形の宣言である。途中の日の版は中間状態なので
比べない（後の日が書き換えるのが教材の設計である）。

「最後に出す完全な版」の取り方は build_day_snapshots と同じ規則に寄せる:
そのファイルのブロックが最後に現れる日の、ファイルまるごとの塊
（`is_complete_file`）を使う。その日に断片しか出さないファイルは、
差し込みを道具では再現できないので対象外とする（下の「見ないもの」）。

## 差分の扱い

比較はコードの骨格だけで行う。コメントと空白は両側から取り除き、
隣り合う文字列連結（`'a' + 'b'`）は1つに畳んでからトークン列を比べる。
教材は紙面の都合で行を細かく折るので、折り返しだけの差は差分にしない。

骨格が違うファイルは全部ずれとして報告する。読者に意図的に別のものを
書かせるファイルは下の EXPECTED_DIFFERENT に理由つきで並べる。
理由を書けない差分は、ただのズレとして落とす。台帳に載せたファイルが
一致するようになったら「登録が古い」として報告する（直した側の
どちらかを消し忘れたときに気づけるように）。

## 見ないもの（この検査の限界）

- 最後の日に断片しか出さないファイル（`apply_insertions` を要する再構成が
  必要で、この検査は提示された完成版だけを見る）。例: `src/app/task/page.tsx`。
- 断片でしか出さないファイルの中身。それらは scaffold の配布物が正本で、
  `check_scaffold_src_sync.py` の担当である。
- src/ にあって教材が一度も出さないファイル（観測基盤など）。「教材が
  教えるコードは src/ と一致するか」がこの検査の問いであって、
  「src/ の全機能を教材が教えるか」は別の問いである。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import NamedTuple

sys.path.insert(0, str(Path(__file__).parent))

from build_day_snapshots import (  # noqa: E402
    is_complete_file,
    render,
    replaces_scaffold_file,
    version_groups,
)
from curriculum_blocks import concat_by_file, day_number  # noqa: E402
from sale_package import scaffold_src_paths  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]

# 読者に意図的に別のものを書かせるファイル。値は「なぜ違ってよいか」。
# 理由を書けない差分は、ただのズレとして落とす。
EXPECTED_DIFFERENT: dict[str, str] = {
    # src/ にはリクエストID・Sentry・構造化ログが入る。教材は認証だけを教える
    # 縮小版で、観測基盤はカリキュラムの対象外（check_scaffold_src_sync の
    # src/server/api/trpc.ts と同じ区分）。
    "src/middleware.ts": "src/ のみ観測基盤（requestId/Sentry/構造化ログ）を持つ。教材では教えない",
    # 同上。本体だけが持つ middleware 群を教材は出さない。
    "src/server/api/trpc.ts": "src/ のみ Sentry と構造化ログの middleware を持つ。教材では教えない",
    # 教材は useState 版を配布物から zod + useForm 版へ書き直させる。
    # src/ は配布版（useState 別解）のままで、教材が意図的に別実装を教える
    # （day16 本文に「配布版は useState だけで書いた別解」と明記済み）。
    "src/component/task/time-log-dialog.tsx": "教材は zod + useForm 版を教える。src/ は配布版の useState 別解",
    # 教材の / は Day 01 で作ったランディングページのまま。読者のアプリは
    # /dashboard が本体で、/ は案内の顔として残る設計である。
    "src/app/page.tsx": "教材の / は Day 01 のランディングページ。src/ はセッション判定リダイレクト",
    # 教材は esbuild の jsx 変換だけの最小構成を教える。
    "vitest.config.ts": "教材は esbuild jsx の最小構成。src/ は react plugin + loadEnv の実運用構成",
}

# 実ドリフトの棚卸し。src/ が後から改良されて教材が追いついていない差分、
# または教材が意図的に別の実装を教えているが台帳の「意図的」とは
# 言い切れない差分。失敗にはせず警告として毎回表示する。
# 処置は「教材を src/ に追従させる（PDF 再生成が要る）」か
# 「src/ を教材に合わせる」か「意図的として EXPECTED_DIFFERENT へ昇格」かの
# 3択で、解決したものから順にこの表を空にする。
KNOWN_DRIFT: dict[str, str] = {
    "src/app/login/page.tsx": "src/ は必須マーク（aria-required）と背景装飾を足した版",
    "src/app/my-task/page.tsx": "src/ は空状態の文言（あなた→条件）と col-span-full を更新した版",
    "src/app/profile/change-password/page.tsx": "教材は厳しいパスワード規則（.regex 群）を教える。src/ は aria 属性を足した版",
    "src/app/profile/edit/page.tsx": "src/ はアバタープレビューと aria 属性を足した版",
    "src/app/profile/page.tsx": "src/ は min-w-0・break-words・email フォールバックを足した版",
    "src/app/project/page.tsx": "src/ は selectedProject の代入位置と権限ヘルパー導入を変えた版",
    "src/app/register/page.tsx": "教材は厳しいパスワード規則（.regex 群）を教える。src/ は最小限",
    "src/app/report/weekly/page.tsx": "src/ は CSV ダウンロードと優先度チャートを足した版",
    "src/app/search/page.tsx": "src/ は検索パラメータを lib ヘルパー経由へ作り替えた版",
    "src/component/project/project-dialog.tsx": "src/ は必須マークとグリッド配置を変えた版",
    "src/component/task/task-detail-dialog.tsx": "src/ は canEditProject prop を memberRole 判定へ作り替えた版",
    "src/lib/session.ts": "src/ は saveSessionCookie を inline 化した版",
    "src/server/api/routers/auth.ts": "src/ は optional chaining へ置き換えた版",
}


class FileReport(NamedTuple):
    """1ファイルぶんの判定。"""

    target: str
    last_day: int
    status: str  # "same" | "different" | "expected" | "drift" | "skipped" | "missing-src"
    detail: str = ""


TOKEN = re.compile(
    r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`|"
    r"[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\sA-Za-z0-9_$]"
)
STRING_TOKEN = re.compile(r"^(['\"`])")


def strip_comments(text: str) -> str:
    """`//` と `/* */`（JSX の `{/* */}` を含む）を取り除く。文字列は残す。

    文字列リテラルの中の `//` はコメントではない（`'a // b'`）。
    引用符の中に居る間はコメントの開始を見ない。
    """
    out: list[str] = []
    i, n = 0, len(text)
    while i < n:
        c = text[i]
        if text[i : i + 2] == "//":
            j = text.find("\n", i)
            i = n if j < 0 else j
        elif text[i : i + 2] == "/*":
            j = text.find("*/", i + 2)
            i = n if j < 0 else j + 2
        elif c in "'\"`":
            out.append(c)
            i += 1
            while i < n and text[i] != c:
                if text[i] == "\\":
                    out.append(text[i])
                    i += 1
                    if i < n:
                        out.append(text[i])
                        i += 1
                    continue
                if text[i] == "\n" and c != "`":
                    break
                out.append(text[i])
                i += 1
            if i < n:
                out.append(text[i])
                i += 1
        else:
            out.append(c)
            i += 1
    return "".join(out)


def code_tokens(text: str) -> list[str]:
    """コメントを除いたコードをトークン列にする。

    `'a' + 'b'` のような隣接する文字列連結は1つの文字列トークンに畳む。
    教材は紙面の都合で文字列を途中で割るので、割っただけの差を差分にしない。
    """
    raw = TOKEN.findall(strip_comments(text))
    merged: list[str] = []
    i = 0
    while i < len(raw):
        if STRING_TOKEN.match(raw[i]):
            token = raw[i]
            while (
                i + 2 < len(raw)
                and raw[i + 1] == "+"
                and STRING_TOKEN.match(raw[i + 2])
                and raw[i + 2][0] == token[0]
            ):
                token = token[:-1] + raw[i + 2][1:]
                i += 2
            merged.append(token)
            i += 1
        else:
            merged.append(raw[i])
            i += 1
    return merged


def diff_summary(presented: list[str], actual: list[str], width: int = 3) -> str:
    """トークン列の差を、最初の食い違い箇所の周辺で短く示す。"""
    import difflib

    sm = difflib.SequenceMatcher(None, presented, actual, autojunk=False)
    parts: list[str] = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            continue
        a = "".join(presented[max(0, i1 - width) : i1])
        b = "".join(presented[i1:i2])[:60]
        c = "".join(actual[j1:j2])[:60]
        parts.append(f"{op} 教材:…{a}[{b}] src/:[{c}]")
        if len(parts) >= 3:
            break
    return " / ".join(parts)


def check_file(target: str, blocks: list, repo_root: Path) -> FileReport:
    """1ファイルぶんの照合。

    最後に出す完全な版を採って src/ の現物と骨格比較する。
    """
    last_day = max(b.day for b in blocks)
    last_groups = [g for g in version_groups(blocks) if g[-1].day == last_day]
    complete = [g for g in last_groups if is_complete_file(g)]
    if not complete:
        return FileReport(target, last_day, "skipped", "最終日は断片のみ")
    group = complete[-1]

    provided = scaffold_src_paths()
    if target in provided:
        body = render(group)
        if not replaces_scaffold_file(target, body):
            return FileReport(target, last_day, "skipped", "scaffold 配布物が正本")

    src_path = repo_root / target
    if not src_path.exists():
        return FileReport(target, last_day, "missing-src", "src/ に対応ファイルが無い")

    presented = code_tokens(render(group))
    actual = code_tokens(src_path.read_text(encoding="utf-8"))
    if presented == actual:
        if target in EXPECTED_DIFFERENT or target in KNOWN_DRIFT:
            return FileReport(target, last_day, "same", "台帳登録があるが一致（登録が古い）")
        return FileReport(target, last_day, "same")
    if target in EXPECTED_DIFFERENT:
        return FileReport(target, last_day, "expected", EXPECTED_DIFFERENT[target])
    if target in KNOWN_DRIFT:
        return FileReport(target, last_day, "drift", KNOWN_DRIFT[target])
    return FileReport(target, last_day, "different", diff_summary(presented, actual))


def check_corpus(material_dir: Path, repo_root: Path) -> tuple[list[FileReport], int]:
    """教材ディレクトリの全ファイルを照合する。返り値は (一覧, 未登録の差分数)。"""
    paths = sorted(material_dir.glob("day[0-9][0-9]_*.md"))
    groups = concat_by_file(paths)
    reports: list[FileReport] = []
    failures = 0
    for target, blocks in sorted(groups.items()):
        report = check_file(target, blocks, repo_root)
        reports.append(report)
        if report.status == "different":
            failures += 1
        elif report.status == "missing-src":
            failures += 1
        elif report.status == "same" and report.detail:
            # 台帳の登録が古い。差分ではないが放置すると台帳が腐るので報告する。
            failures += 1
    return reports, failures


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("使い方: check_complete_code.py <教材ディレクトリ>")
        return 1
    material_dir = Path(argv[1])
    reports, failures = check_corpus(material_dir, REPO_ROOT)

    checked = skipped = expected = drift = 0
    for r in reports:
        if r.status == "same":
            checked += 1
            if r.detail:
                print(f"⚠️  {r.target}: {r.detail}")
        elif r.status == "expected":
            expected += 1
        elif r.status == "skipped":
            skipped += 1
        elif r.status == "drift":
            drift += 1
            print(f"⚠️  {r.target} [day{r.last_day:02d} の完成版] {r.detail}")
        else:
            print(f"❌ {r.target} [day{r.last_day:02d} の完成版] {r.detail}")

    print(
        f"完成版↔src/ 照合: 一致 {checked} / 例外登録 {expected} / "
        f"対象外 {skipped} / 棚卸し済みドリフト {drift} / 未登録の差分 {failures}"
    )
    if failures:
        print("❌ 完成版と src/ が食い違っている（意図的な差分は EXPECTED_DIFFERENT に理由を書く）")
        return 1
    print("✅ 完成版は src/ と一致している")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
