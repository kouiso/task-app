#!/usr/bin/env python3
"""完成版の TSX/JSX を、教材に見える目印も残して構文検査する。

build_day_snapshots.py は生成ツリーへ置くときに filepath と完成版の目印を落とす。
それは読者用コードを作る処理として正しいが、目印自体が JSX の属性や式の途中へ
置かれた事故を観測できない。この検査は完全なファイルになる完成版だけを選び、
Markdown に見えている両方の目印を残したまま TypeScript parser へ渡す。
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

sys.path.insert(0, str(Path(__file__).parent))

from build_day_snapshots import (  # noqa: E402
    COMMENT_HEAD,
    MODULE_HEAD,
    TOP_LEVEL_EXPORT,
    is_marked_final,
    render,
    version_groups,
)
from curriculum_blocks import (  # noqa: E402
    Block,
    FILEPATH,
    concat_by_file,
    day_number,
    filepath_value,
    _split_target,
)
from markdown_scan import fence_states  # noqa: E402

REPO_ROOT = Path(os.environ.get("TASK_APP_REPO_ROOT", Path(__file__).resolve().parents[2]))
FRONTEND_SUFFIXES = (".tsx", ".jsx")


class VisibleBlock(NamedTuple):
    source: str
    lineno: int
    target: str
    text: str


def visible_blocks(path: Path) -> dict[tuple[str, int, str], VisibleBlock]:
    """filepath と完成版の目印を落とさず、iter_blocks と同じ鍵で返す。"""
    out: dict[tuple[str, int, str], VisibleBlock] = {}
    lines: list[str] = []
    value: str | None = None
    start = 0
    for lineno, line, state, _fence in fence_states(path.read_text(encoding="utf-8")):
        if state == "open":
            lines, value, start = [], None, lineno
            continue
        if state == "inside":
            lines.append(line)
            match = FILEPATH.match(line)
            if match and value is None:
                value = filepath_value(match)
            continue
        if state == "close" and value is not None:
            target, _note = _split_target(value)
            key = (path.name, start, target)
            out[key] = VisibleBlock(path.name, start, target, "\n".join(lines))
    return out


def complete_frontend_sources(material_dir: Path) -> list[tuple[str, str]]:
    """日ごとの明示完成版か末尾の完全コピーを、表示中の目印付きで返す。"""
    paths = sorted(material_dir.glob("day[0-9][0-9]_*.md"), key=lambda p: day_number(p.name))
    groups = concat_by_file(paths)
    visible: dict[tuple[str, int, str], VisibleBlock] = {}
    for path in paths:
        visible.update(visible_blocks(path))

    sources: list[tuple[str, str]] = []
    for target, blocks in sorted(groups.items()):
        if not target.endswith(FRONTEND_SUFFIXES):
            continue
        complete_by_day: dict[int, list[list[Block]]] = {}
        for group in version_groups(blocks):
            text = render(group)
            head = next((line for line in text.split("\n") if line.strip()), "")
            if (
                head
                and not COMMENT_HEAD.match(head)
                and MODULE_HEAD.match(head)
                and TOP_LEVEL_EXPORT.search(text)
            ):
                complete_by_day.setdefault(group[-1].day, []).append(group)
        selected: list[list[Block]] = []
        for complete in complete_by_day.values():
            marked = [group for group in complete if any(is_marked_final(block) for block in group)]
            selected.extend(marked or complete[-1:])
        for group in selected:
            chunks = [visible[(b.source, b.lineno, b.target)].text for b in group]
            name = f"{group[-1].source}:{target}"
            sources.append((name, "\n".join(chunks) + "\n"))
    return sources


def parse_sources(sources: list[tuple[str, str]], repo_root: Path) -> list[dict[str, object]]:
    """導入済み TypeScript を1回起動し、全sourceのparse diagnosticsを返す。"""
    typescript = repo_root / "node_modules/typescript"
    if not (typescript / "package.json").is_file():
        raise FileNotFoundError(f"TypeScript がありません: {typescript}")
    payload = [{"name": name, "text": text} for name, text in sources]
    script = r"""
const fs = require('fs');
const ts = require(process.argv[1]);
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const out = input.map(({ name, text }) => {
  const sf = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return {
    name,
    diagnostics: sf.parseDiagnostics.map((d) => {
      const pos = sf.getLineAndCharacterOfPosition(d.start ?? 0);
      return {
        code: d.code,
        line: pos.line + 1,
        column: pos.character + 1,
        message: ts.flattenDiagnosticMessageText(d.messageText, ' '),
      };
    }),
  };
});
process.stdout.write(JSON.stringify(out));
"""
    result = subprocess.run(
        ["node", "-e", script, str(typescript)],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"node exit {result.returncode}")
    return json.loads(result.stdout)


def check(material_dir: Path, repo_root: Path = REPO_ROOT) -> tuple[list[dict[str, object]], int]:
    sources = complete_frontend_sources(material_dir)
    return parse_sources(sources, repo_root), len(sources)


def main(argv: list[str]) -> int:
    args = argv[1:] or ["material/30days-curriculum"]
    if len(args) != 1 or not Path(args[0]).is_dir():
        print("❌ 教材ディレクトリを1つ指定してください", file=sys.stderr)
        return 2
    try:
        reports, count = check(Path(args[0]))
    except (FileNotFoundError, RuntimeError, KeyError) as error:
        print(f"❌ 完成版 frontend 構文検査を実行できません: {error}", file=sys.stderr)
        return 2
    failures = [report for report in reports if report["diagnostics"]]
    for report in failures:
        for diagnostic in report["diagnostics"]:
            print(
                f"❌ {report['name']}:{diagnostic['line']}:{diagnostic['column']} "
                f"TS{diagnostic['code']} {diagnostic['message']}"
            )
    if failures:
        print(f"❌ 完成版 frontend 構文エラー {len(failures)} ファイル / {count} 完成版")
        return 1
    print(f"✅ 完成版 frontend 構文 OK（目印を保持した {count} 完成版）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
