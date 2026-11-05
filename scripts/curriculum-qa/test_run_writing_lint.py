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

# 13. リポジトリの設定で著者名の禁止だけを外せる（sns-app の話者ラベル）。理由が無い例外は止める
def with_config(root: Path, allow: list[dict]) -> Path:
    (root / "_meta").mkdir(exist_ok=True)
    (root / "_meta" / rwl.CONFIG_NAME).write_text(json.dumps({"allow_names": allow}, ensure_ascii=False), encoding="utf-8")
    return root


speaker = CLEAN + "磯貝）では、画面を開いてみましょう。\n"
check(run(corpus({"day01_a.md": speaker})) == 1, "speaker label fails without config")
check(run(with_config(corpus({"day01_a.md": speaker}), [{"id": "author", "reason": "対話台本の話者"}])) == 0,
      "speaker label passes with author allowed")
check(run(with_config(corpus({"day01_a.md": CLEAN + "内田祐貴です。\n"}), [{"id": "author", "reason": "対話台本の話者"}])) == 1,
      "persona still fails when only author allowed")
for bad_allow in ([{"id": "author", "reason": ""}], [{"id": "nope", "reason": "x"}]):
    try:
        run(with_config(corpus({"day01_a.md": CLEAN}), bad_allow))
        check(False, f"invalid config rejected: {bad_allow}")
    except SystemExit:
        pass

# 15. コードブロックの中の人格名も FATAL（修了証の講師名のように、フェンス内も出荷物に出る）
fenced = CLEAN + "\n```text\n講師: 内田 祐貴\n```\n"
check(run(corpus({"day01_a.md": fenced})) == 1, "persona in code fence fails")
check(run(corpus({"day01_a.md": CLEAN + "\n```text\nワイが書いた\n```\n"})) == 1, "first-person in code fence fails")

# 16. 奥付で許すのは著者名だけ。奥付の人格名・一人称は FATAL
check(run(corpus({"day01_a.md": CLEAN + "\n## 奥付\n\n監修: 内田祐貴\n"})) == 1, "persona in colophon fails")
check(run(corpus({"day01_a.md": CLEAN + "\n## 奥付\n\nワイが書いた\n"})) == 1, "first-person in colophon fails")
check(run(corpus({"day01_a.md": CLEAN + "\n## 奥付\n\n| 著者 | 磯貝光佑 |\n\n© 2026 磯貝光佑\n"})) == 0,
      "author table in colophon passes")

# 17. 人格設定の私的な例は FATAL。一般語の「ゲーム」は通す
for private in ["著者の趣味は音ゲーです。", "阪神タイガースが好きです。", "馬術の例えで説明します。", "猫のネルが鳴きました。"]:
    check(run(corpus({"day01_a.md": CLEAN + private + "\n"})) == 1, f"persona private fails: {private}")
for ok in ["Git はゲームのセーブポイントです。", "パネルとチャネルとカーネルを並べます。"]:
    check(run(corpus({"day01_a.md": CLEAN + ok + "\n"})) == 0, f"general word passes: {ok}")

# 18. 「たった今」の除外はその箇所だけ。同じ行の「一択」や別の「たった」は数える
def b3(body: str) -> list:
    return [o for o in rwl.lint_file(corpus({"day05_a.md": body}) / "day05_a.md")[1] if o[0] == "B-3 切り詰め"]


check(len(b3("# Day 05\n\n" + "\n\n".join(["たった今保存した、方法は一択です。"] * 4) + "\n")) == 1,
      "ittaku on tatta-ima line counted")
check(len(b3("# Day 05\n\n" + "\n\n".join(["たった今保存した。たった三行で書けます。"] * 4) + "\n")) == 1,
      "other tatta on tatta-ima line counted")

# 19. ~~~ の中に ``` が入れ子でも、中身は地の文として数えない
nested = "# Day 06\n\n~~~md\n```bash\n返してくれます。返してくれます。返してくれます。\n```\n返してくれます。\n~~~\n"
check(run(corpus({"day06_a.md": nested})) == 0, "nested fence content not counted")
lines, _ = rwl.preprocess(nested.splitlines())
check(not any(line.strip() for line in lines[2:]), "nested fence lines masked")

# 20. filepath ブロックの除外は直後の段落だけ。見出しや次のコードブロックを越えない
fp = "# D\n\n```ts\n// filepath: a.ts\nx\n```\n\n"
_, after_heading = rwl.preprocess((fp + "## 見出し\n\nAではなくB。\n").splitlines())
check(after_heading == set(), "filepath exclusion stops at heading")
_, after_fence = rwl.preprocess((fp + "```bash\nnpm i\n```\n\nAではなくB。\n").splitlines())
check(after_fence == set(), "filepath exclusion stops at next fence")
_, direct = rwl.preprocess((fp + "AではなくB。\n").splitlines())
check(direct == {8}, "paragraph right after filepath excluded")

# 14. 上流本体は無改変で読み込めている（関数を借りる前提が崩れていない）
for attr in ("COUNTERS", "PER_WORD_LIMIT1", "ZERO_PHRASES", "scan", "mask_code_fences", "sentences_with_lines"):
    check(hasattr(rwl.wl, attr), f"upstream has {attr}")

if FAILURES:
    print("❌ test_run_writing_lint FAIL:")
    for f in FAILURES:
        print(f"  - {f}")
    sys.exit(1)
print("✅ test_run_writing_lint PASS")
