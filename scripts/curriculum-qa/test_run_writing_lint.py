#!/usr/bin/env python3
"""run_writing_lint.py の退行テスト。

上流の writing-lint.py は rc=1 を FATAL のときにしか返さないので、ラッパー側の
判定（未処置の DENSITY で失敗、stale で失敗、warn は失敗させない）が緩むと、
ゲートは黙って何でも通すようになる。陽性と陰性を両方置いて、それを見る。
"""

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import run_writing_lint as rwl  # noqa: E402

FAILURES: list[str] = []


def check(cond: bool, label: str) -> None:
    if not cond:
        FAILURES.append(label)


def corpus(files: dict[str, str], dispositions: list[dict] | None = None) -> Path:
    root = Path(tempfile.mkdtemp())
    for name, body in files.items():
        (root / name).write_text(body, encoding="utf-8")
    if dispositions is not None:
        (root / "_meta").mkdir()
        (root / "_meta" / rwl.DISPOSITIONS_NAME).write_text(
            json.dumps({"entries": dispositions}, ensure_ascii=False), encoding="utf-8")
    return root


CLEAN = "# Day 01\n\nアプリを起動します。画面に一覧が出ます。\n"
# 「してくれます」は上限2。3回で超過する。
OVER = "# Day 02\n\n" + "\n\n".join(["関数が値を返してくれます。"] * 3) + "\n"


def run(root: Path, *extra: str) -> int:
    return rwl.main([str(root), *extra])


# 1. きれいな文書は通る
check(run(corpus({"day01_a.md": CLEAN})) == 0, "clean passes")

# 2. FATAL（壊れた句読点・慣用句混交・人格名）は gate で失敗する
for bad in ["読みます。。", "的を得た説明です。", "内田祐貴が書きました。", "ワイが説明します。"]:
    check(run(corpus({"day01_a.md": CLEAN + bad + "\n"})) == 1, f"fatal fails: {bad}")

# 3. 奥付の著者名は許し、本文の著者名は FATAL
colophon = CLEAN + "\n## 奥付\n\n著者: 磯貝光佑\n"
check(run(corpus({"day01_a.md": colophon})) == 0, "author in colophon passes")
check(run(corpus({"day01_a.md": CLEAN + "磯貝光佑が書きました。\n"})) == 1, "author in body fails")

# 4. 「ワイヤー」のようなカタカナ語は一人称と見なさない
check(run(corpus({"day01_a.md": CLEAN + "ワイヤーフレームを描きます。\n"})) == 0, "katakana word passes")

# 5. DENSITY 超過は、rc ではなく未処置の有無で失敗する（上流は rc=0 を返す場面）
check(run(corpus({"day02_a.md": OVER})) == 1, "unresolved density fails")

# 6. 全件に keep があれば通る
_, over = rwl.lint_file(corpus({"day02_a.md": OVER}) / "day02_a.md")
keeps = [{"key": h.key, "action": "keep", "reason": "テスト"} for _c, _n, _l, _ch, hits in over for h in hits]
check(run(corpus({"day02_a.md": OVER}, keeps)) == 0, "dispositioned density passes")

# 7. 1件でも keep が欠けると失敗する
check(run(corpus({"day02_a.md": OVER}, keeps[:-1])) == 1, "partial disposition fails")

# 8. 当たるヒットが無くなった keep は stale で失敗。fixed は照合しない
check(run(corpus({"day02_a.md": CLEAN}, keeps)) == 1, "stale keep fails")
fixed = [dict(k, action="fixed") for k in keeps]
check(run(corpus({"day02_a.md": CLEAN}, fixed)) == 0, "fixed record passes")

# 9. warn モードは同じ違反でも exit 0
check(run(corpus({"day02_a.md": OVER}), "--mode", "warn") == 0, "warn mode exits 0")
check(run(corpus({"day01_a.md": CLEAN + "読みます。。\n"}), "--mode", "warn") == 0, "warn mode fatal exits 0")

# 10. 地の文以外（表・画像 alt・見出し・コード・インラインコード）は数えない
non_prose = "# Day 03\n\n" + "\n".join([
    "| 列 | 値してくれます | 値してくれます | 値してくれます |",
    "![返してくれます返してくれます返してくれます](a.png)",
    "## 返してくれます返してくれます返してくれます",
    "```text", "返してくれます。返してくれます。返してくれます。", "```",
    "`返してくれます` `返してくれます` `返してくれます` を確かめます。",
]) + "\n"
check(run(corpus({"day03_a.md": non_prose})) == 0, "non-prose not counted")

# 11. 段落をまたいだ文末の一致は三連と数えない。同じ段落の中なら数える
split = "# Day 04\n\n" + "\n\n".join(["一覧を表示しました。", "詳細を表示しました。", "編集を表示しました。"]) + "\n"
_, over_split = rwl.lint_file(corpus({"day04_a.md": split}) / "day04_a.md")
check(not [o for o in over_split if o[0] == "B-2 三連反復"], "triple across paragraphs ignored")
one_para = "# Day 04\n\n一覧を表示しました。詳細を表示しました。編集を表示しました。\n"
triples = [h for _c, _n, _l, _ch, hits in rwl.lint_file(corpus({"day04_a.md": one_para}) / "day04_a.md")[1]
           if _c == "B-2 三連反復" for h in hits]
check(len(triples) == 1, "triple in one paragraph counted")

# 12. B-3 の「たった今」は切り詰めと見なさない
now = "# Day 05\n\n" + "\n\n".join(["たった今保存しました。"] * 4) + "\n"
check(not [o for o in rwl.lint_file(corpus({"day05_a.md": now}) / "day05_a.md")[1] if o[0] == "B-3 切り詰め"],
      "tatta-ima ignored")

# 13. 上流本体は無改変で読み込めている（関数を借りる前提が崩れていない）
for attr in ("COUNTERS", "PER_WORD_LIMIT1", "ZERO_PHRASES", "scan", "mask_code_fences", "sentences_with_lines"):
    check(hasattr(rwl.wl, attr), f"upstream has {attr}")

if FAILURES:
    print("❌ test_run_writing_lint FAIL:")
    for f in FAILURES:
        print(f"  - {f}")
    sys.exit(1)
print("✅ test_run_writing_lint PASS")
