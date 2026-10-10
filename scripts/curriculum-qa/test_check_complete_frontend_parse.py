#!/usr/bin/env python3
"""check_complete_frontend_parse の退行テスト。"""

from __future__ import annotations

import sys
import os
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_complete_frontend_parse import complete_frontend_sources, parse_sources  # noqa: E402

REPO_ROOT = Path(os.environ.get("TASK_APP_REPO_ROOT", Path(__file__).resolve().parents[2]))
MATERIAL_DIR = Path(
    os.environ.get("TASK_APP_MATERIAL_DIR", REPO_ROOT / "material/30days-curriculum")
)
DAY19_NAME = "day19_コメント編集・削除.md:src/component/task/task-detail-dialog.tsx"
DAY17_NAME = "day17_自分のタスクページ.md:src/app/my-task/page.tsx"
QUALITY_SH = Path(__file__).with_name("check_quality.sh")

BAD_TERNARY = """const view = ok ? (
{/* filepath: src/a.tsx（同じファイルの続き） */}
{/* 完成版: 2/2 */}
<p>ok</p>
) : null;
"""

BAD_ATTRIBUTE = """const view = <Button
  className="x"
{/* 完成版: 2/2 */}
  aria-label="保存"
/>;
"""

GOOD_CHILD = """const view = ok ? (
  <div>
    {/* filepath: src/a.tsx（同じファイルの続き） */}
    {/* 完成版: 2/2 */}
    <p>ok</p>
  </div>
) : null;
"""


def completed_block(target: str, name: str, body: str) -> str:
    return (
        "```tsx\n"
        f"// filepath: {target}\n"
        f"// 完成版: {name}\n"
        f"{body}\n"
        "```\n"
    )


def fixture_sources(second_body: str) -> list[tuple[str, str]]:
    with tempfile.TemporaryDirectory() as raw:
        material = Path(raw)
        (material / "day01_fixture.md").write_text(
            completed_block("src/a.tsx", "first", "export const A = () => <div />;")
            + completed_block("src/b.tsx", "second", second_body),
            encoding="utf-8",
        )
        return complete_frontend_sources(material)


def historical_sources() -> list[tuple[str, str]]:
    with tempfile.TemporaryDirectory() as raw:
        material = Path(raw)
        (material / "day01_fixture.md").write_text(
            completed_block("src/a.tsx", "historical", "export const A = () => <div>;"),
            encoding="utf-8",
        )
        (material / "day02_fixture.md").write_text(
            completed_block("src/a.tsx", "current", "export const A = () => <div />;"),
            encoding="utf-8",
        )
        return complete_frontend_sources(material)


def repeated_explicit_sources() -> list[tuple[str, str]]:
    with tempfile.TemporaryDirectory() as raw:
        material = Path(raw)
        (material / "day01_fixture.md").write_text(
            completed_block("src/a.tsx", "broken", "export const A = () => <div>;")
            + "```tsx\n// filepath: src/a.tsx\nexport const A = () => <aside />;\n```\n"
            + completed_block("src/a.tsx", "fixed", "export const A = () => <div />;"),
            encoding="utf-8",
        )
        return complete_frontend_sources(material)


def patch_then_final_sources() -> list[tuple[str, str]]:
    with tempfile.TemporaryDirectory() as raw:
        material = Path(raw)
        (material / "day01_fixture.md").write_text(
            "```tsx\n// filepath: src/a.tsx\nexport const A = () => <div />;\n```\n"
            "```tsx\n// filepath: src/a.tsx（return の前に追加）\n"
            "const PATCH_SENTINEL = true;\n```\n"
            + completed_block("src/a.tsx", "terminal", "export const A = () => <main />;"),
            encoding="utf-8",
        )
        return complete_frontend_sources(material)


def malformed_whole_file_sources(body: str) -> list[tuple[str, str]]:
    with tempfile.TemporaryDirectory() as raw:
        material = Path(raw)
        (material / "day01_fixture.md").write_text(
            completed_block("src/a.tsx", "malformed", body),
            encoding="utf-8",
        )
        return complete_frontend_sources(material)


def main() -> int:
    reports = parse_sources(
        [("bad-ternary.tsx", BAD_TERNARY), ("bad-attribute.tsx", BAD_ATTRIBUTE), ("good.tsx", GOOD_CHILD)],
        REPO_ROOT,
    )
    counts = {report["name"]: len(report["diagnostics"]) for report in reports}
    failed = 0
    if counts["bad-ternary.tsx"] == 0:
        print("❌ ternary途中の目印を検出できていません")
        failed += 1
    if counts["bad-attribute.tsx"] == 0:
        print("❌ JSX属性途中の目印を検出できていません")
        failed += 1
    if counts["good.tsx"] != 0:
        print("❌ JSX子要素の目印を誤検出しました")
        failed += 1
    valid = fixture_sources("export const B = () => <span />;")
    valid_reports = parse_sources(valid, REPO_ROOT)
    if len(valid) != 2 or any(report["diagnostics"] for report in valid_reports):
        print("❌ 複数の正常な完成版を構文検査できていません")
        failed += 1
    if any("filepath:" not in text or "完成版:" not in text for _name, text in valid):
        print("❌ 複数完成版の目印が構文検査前に失われています")
        failed += 1
    malformed = fixture_sources("export const B = () => <span>;")
    malformed_counts = {
        report["name"]: len(report["diagnostics"])
        for report in parse_sources(malformed, REPO_ROOT)
    }
    if len(malformed) != 2 or malformed_counts.get("day01_fixture.md:src/b.tsx", 0) == 0:
        print("❌ 2件目の壊れた完成版を検出できていません")
        failed += 1
    historical = historical_sources()
    historical_counts = {
        report["name"]: len(report["diagnostics"])
        for report in parse_sources(historical, REPO_ROOT)
    }
    if len(historical) != 2 or historical_counts.get("day01_fixture.md:src/a.tsx", 0) == 0:
        print("❌ 後日の版があると過去の明示完成版を検査対象から落としています")
        failed += 1
    repeated = repeated_explicit_sources()
    repeated_reports = parse_sources(repeated, REPO_ROOT)
    if len(repeated) != 2 or not any(report["diagnostics"] for report in repeated_reports):
        print("❌ 同じ日の過去の明示完成版を後の正常な明示完成版で隠しています")
        failed += 1
    terminal = patch_then_final_sources()
    if (
        len(terminal) != 1
        or "PATCH_SENTINEL" in terminal[0][1]
        or parse_sources(terminal, REPO_ROOT)[0]["diagnostics"]
    ):
        print("❌ 未明示の差分連結を捨てて明示完成版だけを選べていません")
        failed += 1
    for label, body in (
        ("閉じ波括弧", "export function A() { return <div />;"),
        ("閉じ丸括弧", "export const A = (value: string => <div>{value}</div>;"),
    ):
        malformed_whole = malformed_whole_file_sources(body)
        if (
            len(malformed_whole) != 1
            or not parse_sources(malformed_whole, REPO_ROOT)[0]["diagnostics"]
        ):
            print(f"❌ {label}が欠けた明示完成版を構文検査前に落としています")
            failed += 1
    quality = QUALITY_SH.read_text(encoding="utf-8")
    if quality.count("\n  check_complete_frontend_parse\n") != 1:
        print("❌ 完成版 frontend 構文検査が CORPUS_CHECKS に1回だけ登録されていません")
        failed += 1
    if quality.count("\n  test_check_complete_frontend_parse\n") != 1:
        print("❌ 完成版 frontend 構文自己テストが SELF_TESTS に1回だけ登録されていません")
        failed += 1
    day17 = [source for source in complete_frontend_sources(MATERIAL_DIR) if source[0] == DAY17_NAME]
    if len(day17) != 1:
        print(f"❌ Day 17 明示完成版を1件に確定できません: {len(day17)} 件")
        failed += 1
    else:
        visible = day17[0][1]
        if "filepath:" not in visible or "同じファイルの続き" not in visible:
            print("❌ Day 17 完成版の継続 filepath 目印が構文検査前に失われています")
            failed += 1
        actual = parse_sources(day17, REPO_ROOT)[0]
        if actual["diagnostics"]:
            print(
                f"❌ Day 17 完成版は継続 filepath 目印を保持すると構文エラーです: "
                f"{len(actual['diagnostics'])} 件"
            )
            failed += 1
    day19 = [source for source in complete_frontend_sources(MATERIAL_DIR) if source[0] == DAY19_NAME]
    if len(day19) != 1:
        print(f"❌ Day 19 完成版を1件に確定できません: {len(day19)} 件")
        failed += 1
    else:
        visible = day19[0][1]
        if "filepath:" not in visible or "完成版:" not in visible:
            print("❌ Day 19 完成版の目印が構文検査前に失われています")
            failed += 1
        actual = parse_sources(day19, REPO_ROOT)[0]
        if actual["diagnostics"]:
            print(
                f"❌ Day 19 完成版は目印を保持すると構文エラーです: "
                f"{len(actual['diagnostics'])} 件"
            )
            failed += 1
    if failed:
        return 1
    print("✅ 完成版 frontend 構文 自己テスト 15/15 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
