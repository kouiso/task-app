#!/usr/bin/env python3
"""hana652/tech-writing-pack の writing-lint.py を教材向けに包むゲート。

writing-lint.py はブログ記事向けで、そのまま教材に当てると次の3点で役に立たない。

1. rc=1 になるのは FATAL のときだけで、DENSITY 超過は rc=0 のまま流れる。
   rc で判定すると、超過が何件あっても合格になる。
2. カウンタの上限は「1記事あたりの回数」で、文字数に比例しない。2,000字のブログと
   4万字の教材に同じ上限を当てると、教材は全本が超過する（2026-10-30 実測: B-2 が 28/30、
   B-1 が 27/30）。超過が常態になれば、誰も読まない警告になる。
3. 画像の alt・表・インラインコード・奥付も地の文として数える。

そこで本体には手を入れず（CC BY のまま上流と突き合わせるため）、関数と定数を
importlib で借りて、前処理と判定だけをここで持つ。

判定:
- FATAL（壊れた句読点・慣用句混交・禁止固有名詞）は1件でも失敗。
- DENSITY は、上限を超えたカウンタのヒットに処置（keep と理由）が記録されていなければ未処置。
  未処置が1件でもあれば失敗。処置の置き場は `_meta/writing-lint-dispositions.json` で、
  対象ファイルから親へたどって最初に見つかったものを使う。
- 処置が当たるヒットが無くなった keep は stale として失敗にする。直した後に記録だけが残り、
  次に同じ文を書いたとき黙って通るのを防ぐ。直した記録は action=fixed で残す（照合しない）。

モード:
- gate: 上の条件で exit 1。task-app と redmine-clone で使う。
- warn: 同じ内容を出すが exit 0。sns-app のように、ゲート化を局長判断待ちにしている所で使う。

上限の根拠は SKILL.md の「writing-lint の精度表」節にある。上限を変えるときは、
先にそこへ実測を足す。
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
LINT_PATH = (
    REPO_ROOT
    / ".claude/skills/material-writing/hana652-tech-writing-pack/scripts/writing-lint.py"
)
DISPOSITIONS_NAME = "writing-lint-dispositions.json"
# リポジトリごとの例外。sns-app の対話台本では著者が登場人物（話者ラベル「磯貝）」）として
# 本文に出るので、著者名の禁止をそのリポジトリだけ外す必要がある。置き場は処置記録と同じ _meta/。
CONFIG_NAME = "writing-lint-config.json"


def load_upstream(path: Path = LINT_PATH):
    spec = importlib.util.spec_from_file_location("hana652_writing_lint", path)
    if spec is None or spec.loader is None:
        raise SystemExit(f"writing-lint.py を読み込めません: {path}")
    module = importlib.util.module_from_spec(spec)
    # vendor の中に __pycache__ を作ると、sha256 一覧との照合（vendor-files.sh）が落ちる。
    previous = sys.dont_write_bytecode
    sys.dont_write_bytecode = True
    try:
        spec.loader.exec_module(module)
    finally:
        sys.dont_write_bytecode = previous
    return module


wl = load_upstream()

# 1,000字あたりの上限に置き換えるカウンタ。値は精度表の「正当」の密度から決めた。
PER_1000_LIMITS: dict[str, float] = {
    "B-1 対比構文": 1.0,
    "B-2 三連反復": 0.5,
    "B-11 するだけ": 0.3,
    "B-9 つまり": 0.2,
}
# 精度表で誤検知・正当が大半だったため、DENSITY として数えないカウンタ。
# 数えない理由は SKILL.md の精度表に1行ずつある。
DISABLED_COUNTERS: frozenset[str] = frozenset({"B-10 文体混在"})

# 奥付の著者名以外で出てはいけない固有名詞。AI 人格名や一人称が出荷物に混ざった
# 実績がある（redmine-clone の FAQ_BEGINNER.md:350 ほか）。
FORBIDDEN_NAMES: list[tuple[str, str, str]] = [
    ("persona", r"内田\s?祐貴|祐貴", "AI 人格名"),
    ("first-person", r"(?<![ァ-ヶー])ワイ(?![ァ-ヶー])", "一人称「ワイ」"),
    ("author", r"磯貝\s?光佑|磯貝", "著者名（奥付以外）"),
]

COLOPHON_RE = re.compile(r"^##\s*奥付")
H2_RE = re.compile(r"^##\s")
IMAGE_RE = re.compile(r"^\s*!\[")
TABLE_RE = re.compile(r"^\s*\|")
HTML_COMMENT_RE = re.compile(r"<!--.*?-->")
INLINE_CODE_RE = re.compile(r"`[^`]*`")
HEADING_RE = re.compile(r"^\s*#{1,6}\s")
BOLD_ONLY_RE = re.compile(r"^\s*\*\*[^*]+\*\*\s*$")
# 上流の B-3 は「たった」を数えるが、「たった今」は切り詰めではない（精度表の誤検知）。
FALSE_HITS: dict[str, re.Pattern[str]] = {"B-3 切り詰め": re.compile(r"たった今")}
FILEPATH_RE = re.compile(r"filepath:")


@dataclass(frozen=True)
class Hit:
    file: str
    counter: str
    line: int
    text: str
    occurrence: int = 0

    @property
    def key(self) -> str:
        return disposition_key(self.file, self.counter, self.text, self.occurrence)


def disposition_key(file: str, counter: str, text: str, occurrence: int = 0) -> str:
    # 行番号は編集でずれるのでキーに入れない。同じ文が何度も出るときは出現順で区別する。
    # 区別しないと、3回のうち1回だけ処置を消しても残り2件の keep で通ってしまう。
    norm = re.sub(r"\s+", "", text)
    digest = hashlib.sha256(norm.encode("utf-8")).hexdigest()[:16]
    suffix = f"#{occurrence}" if occurrence else ""
    return f"{file}::{counter}::{digest}{suffix}"


def number_occurrences(hits: list[Hit]) -> list[Hit]:
    seen: dict[str, int] = {}
    numbered: list[Hit] = []
    for hit in hits:
        base = disposition_key(hit.file, hit.counter, hit.text)
        n = seen.get(base, 0)
        seen[base] = n + 1
        numbered.append(Hit(hit.file, hit.counter, hit.line, hit.text, n))
    return numbered


def preprocess(raw_lines: list[str]) -> tuple[list[str], set[int]]:
    """地の文以外を空行にした行リストと、filepath 付きブロック直後の段落の行番号を返す。

    行番号は保つ（処置記録と人間の確認が同じ行を指すように）。
    """
    masked = wl.mask_code_fences(raw_lines)
    out: list[str] = []
    after_filepath: set[int] = set()
    in_colophon = False
    in_fence = False
    fence_has_filepath = False
    pending_after = False
    for idx, (raw, line) in enumerate(zip(raw_lines, masked), 1):
        if wl.CODE_FENCE_RE.match(raw):
            if in_fence and fence_has_filepath:
                pending_after = True
            in_fence = not in_fence
            fence_has_filepath = False
            out.append("")
            continue
        if in_fence:
            if FILEPATH_RE.search(raw):
                fence_has_filepath = True
            out.append("")
            continue
        if COLOPHON_RE.match(raw):
            in_colophon = True
        elif H2_RE.match(raw):
            in_colophon = False
        if (in_colophon or IMAGE_RE.match(raw) or TABLE_RE.match(raw)
                or HEADING_RE.match(raw) or BOLD_ONLY_RE.match(raw)):
            out.append("")
            continue
        text = HTML_COMMENT_RE.sub("", line)
        text = INLINE_CODE_RE.sub("〈code〉", text)
        if pending_after:
            if text.strip():
                after_filepath.add(idx)
            elif idx - 1 in after_filepath:
                pending_after = False
        out.append(text)
    return out, after_filepath


def colophon_lines(raw_lines: list[str]) -> set[int]:
    lines: set[int] = set()
    inside = False
    for idx, raw in enumerate(raw_lines, 1):
        if COLOPHON_RE.match(raw):
            inside = True
        elif H2_RE.match(raw):
            inside = False
        if inside:
            lines.add(idx)
    return lines


def lint_file(
    path: Path, allowed_names: frozenset[str] = frozenset()
) -> tuple[list[Hit], list[tuple[str, int, int, float, list[Hit]]]]:
    """(FATAL のヒット, DENSITY のカウンタ別結果) を返す。

    DENSITY の要素は (カウンタ名, 件数, 上限, 本文字数, ヒット) で、上限を超えたものだけ。
    """
    raw = path.read_text(encoding="utf-8").splitlines()
    name = path.name
    lines, after_filepath = preprocess(raw)
    sents = wl.sentences_with_lines(lines)
    clines = wl.strip_short_quotes(lines)
    chars = sum(len(line) for line in lines)
    kchars = max(1.0, chars / 1000)

    fatal: list[Hit] = []
    for i, w, c in wl.scan(lines, wl.BROKEN_PUNCT):
        fatal.append(Hit(name, f"壊れた句読点「{w}」", i, c))
    for wrong, right in wl.IDIOM_MIX.items():
        for i, w, c in wl.scan(lines, [wrong], regex=False):
            fatal.append(Hit(name, f"慣用句混交「{w}」→{right}", i, c))
    # 固有名詞は表・画像も含めて見る（奥付だけを除く）。表の中の人格名も出荷物に出るため。
    colophon = colophon_lines(raw)
    name_lines = ["" if i in colophon else line for i, line in enumerate(wl.mask_code_fences(raw), 1)]
    for name_id, pattern, label in FORBIDDEN_NAMES:
        if name_id in allowed_names:
            continue
        for i, w, c in wl.scan(name_lines, [pattern]):
            fatal.append(Hit(name, f"禁止固有名詞「{w}」（{label}）", i, c))

    over: list[tuple[str, int, int, float, list[Hit]]] = []

    def judge(counter: str, hits: list[Hit], base_limit: int) -> None:
        if counter in DISABLED_COUNTERS:
            return
        if counter in PER_1000_LIMITS:
            limit = math.floor(PER_1000_LIMITS[counter] * kchars)
        else:
            limit = base_limit
        if len(hits) > limit:
            over.append((counter, len(hits), limit, chars, number_occurrences(hits)))

    for counter, pat, base, _note, _mult in wl.COUNTERS:
        hits = [
            Hit(name, counter, i, c)
            for i, _w, c in wl.scan(clines, [pat])
            if not (counter == "B-1 対比構文" and i in after_filepath)
            and not (counter in FALSE_HITS and FALSE_HITS[counter].search(clines[i - 1]))
        ]
        judge(counter, hits, base)
    for word in wl.PER_WORD_LIMIT1:
        hits = [Hit(name, f"A系 同一語反復「{word}」", i, c) for i, _w, c in wl.scan(clines, [word], regex=False)]
        judge(f"A系 同一語反復「{word}」", hits, 1)
    pair_hits = [Hit(name, "A-1 転用ペア", i, c) for i, _w, c in wl.scan(clines, wl.TENYO_PAIRS)]
    judge("A-1 転用ペア", pair_hits, math.floor(kchars))
    zero_hits = [Hit(name, "指紋・0回定型句", i, c) for i, _w, c in wl.scan(clines, wl.ZERO_PHRASES, regex=False)]
    judge("指紋・0回定型句", zero_hits, 0)

    # 上流は空行・コード・表をまたいで文をつなぐため、別の段落の文末がそろっただけで
    # 三連と数える（精度表の誤検知 51/127 がすべてこれ）。段落の中だけで数える。
    para: dict[int, int] = {}
    pid = 0
    for i, line in enumerate(lines, 1):
        if not line.strip():
            pid += 1
        para[i] = pid
    prose = [(i, s) for i, s in sents if re.search(r"[ぁ-ん]$", s)]
    triple: list[Hit] = []
    for k in range(len(prose) - 2):
        ends = [s[-3:] for _, s in prose[k : k + 3]]
        same_para = para[prose[k][0]] == para[prose[k + 2][0]]
        if ends[0] == ends[1] == ends[2] and same_para and prose[k][0] not in after_filepath:
            triple.append(Hit(name, "B-2 三連反復", prose[k][0], " | ".join(s for _, s in prose[k : k + 3])))
    judge("B-2 三連反復", triple, 0)

    kei = [(i, s) for i, s in sents if wl.KEITAI_RE.search(s)]
    jou = [(i, s) for i, s in sents if not wl.KEITAI_RE.search(s) and wl.JOUTAI_RE.search(s)]
    mixed: list[Hit] = []
    if len(kei) + len(jou) >= 8 and kei and jou:
        minority = kei if len(kei) < len(jou) else jou
        if len(minority) / (len(kei) + len(jou)) < 0.3:
            mixed = [Hit(name, "B-10 文体混在", i, s) for i, s in minority]
    judge("B-10 文体混在", mixed, 0)
    return fatal, over


def find_meta(path: Path, filename: str) -> Path | None:
    for parent in [path.parent, *path.parents]:
        candidate = parent / "_meta" / filename
        if candidate.is_file():
            return candidate
        if parent == REPO_ROOT:
            break
    return None


def find_dispositions(path: Path) -> Path | None:
    return find_meta(path, DISPOSITIONS_NAME)


def load_allowed_names(path: Path | None) -> frozenset[str]:
    """設定の allow_names（id と理由）を読む。理由の無い例外と、存在しない id は止める。"""
    if path is None:
        return frozenset()
    data = json.loads(path.read_text(encoding="utf-8"))
    known = {name_id for name_id, _p, _l in FORBIDDEN_NAMES}
    allowed: set[str] = set()
    for entry in data.get("allow_names", []):
        if entry.get("id") not in known:
            raise SystemExit(f"{path}: allow_names の id は {sorted(known)} のどれか: {entry}")
        if not entry.get("reason"):
            raise SystemExit(f"{path}: allow_names の reason が空: {entry}")
        allowed.add(entry["id"])
    return frozenset(allowed)


def load_dispositions(path: Path | None) -> dict[str, dict]:
    if path is None:
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data.get("entries", [])
    result: dict[str, dict] = {}
    for entry in entries:
        if entry.get("action") not in ("keep", "fixed"):
            raise SystemExit(f"{path}: action は keep か fixed: {entry}")
        if not entry.get("reason"):
            raise SystemExit(f"{path}: reason が空: {entry}")
        result[entry["key"]] = entry
    return result


def collect_targets(args: list[str]) -> list[Path]:
    targets: list[Path] = []
    for arg in args:
        p = Path(arg)
        if p.is_dir():
            targets.extend(sorted(p.glob("day[0-9][0-9]_*.md")))
            targets.extend(sorted(p.glob("appendix_*.md")))
        elif p.is_file():
            targets.append(p)
        else:
            raise SystemExit(f"見つかりません: {arg}")
    return targets


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--mode", choices=["gate", "warn"], default="gate")
    ap.add_argument("--dispositions", type=Path, default=None)
    ap.add_argument("--emit-pending", type=Path, default=None,
                    help="未処置のヒットを処置 JSON の entries と同じ形で書き出す（記録作業用）")
    args = ap.parse_args(argv)

    targets = collect_targets(args.paths)
    if not targets:
        print("対象ファイルがありません")
        return 1
    disp_path = args.dispositions or find_dispositions(targets[0])
    dispositions = load_dispositions(disp_path)
    allowed_names = load_allowed_names(find_meta(targets[0], CONFIG_NAME))
    used: set[str] = set()

    fatal_total = 0
    pending: list[Hit] = []
    for path in targets:
        fatal, over = lint_file(path, allowed_names)
        fatal_total += len(fatal)
        for hit in fatal:
            print(f"FATAL {path.name}:L{hit.line} {hit.counter} → {hit.text}")
        for counter, count, limit, chars, hits in over:
            unresolved = [h for h in hits if dispositions.get(h.key, {}).get("action") != "keep"]
            used.update(h.key for h in hits if h.key in dispositions)
            status = "未処置あり" if unresolved else "処置済み"
            print(f"DENSITY {path.name} {counter}: {count}回 / 上限{limit}（本文{chars}字）{status}")
            for hit in unresolved:
                print(f"  未処置 L{hit.line}: {hit.text[:80]}")
            pending.extend(unresolved)

    checked = {t.name for t in targets}
    stale = [
        e for k, e in dispositions.items()
        if e["action"] == "keep" and k not in used and k.split("::", 1)[0] in checked
    ]
    for entry in stale:
        print(f"STALE {entry['key']}: 当たるヒットが無い keep（直したなら action を fixed にする）")

    if args.emit_pending is not None:
        args.emit_pending.write_text(json.dumps(
            [{"key": h.key, "file": h.file, "counter": h.counter, "line": h.line, "text": h.text,
              "action": "", "reason": ""} for h in pending],
            ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"判定: FATAL {fatal_total} / DENSITY 未処置 {len(pending)} / stale {len(stale)}"
          f"（{len(targets)}ファイル、処置記録: {disp_path or 'なし'}）")
    failed = bool(fatal_total or pending or stale)
    if failed and args.mode == "gate":
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
