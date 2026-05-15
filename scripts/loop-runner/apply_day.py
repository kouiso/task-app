#!/usr/bin/env python3
"""
Day教材のコードブロックを抽出してターゲットディレクトリに書き込む。

Usage: python3 apply_day.py <day_md_file> <target_app_dir>
"""

import sys
import re
from pathlib import Path


SKIP_LANGS = {"bash", "shell", "sh", "zsh", "mermaid", "sql", "text", ""}
WRITE_LANGS = {"typescript", "tsx", "javascript", "jsx", "ts", "js", "css", "json", "prisma"}


def apply_day(md_path: Path, target_dir: Path) -> tuple[list[str], list[str]]:
    content = md_path.read_text(encoding="utf-8")
    code_blocks = re.findall(r"```(\w+)?\n(.*?)```", content, re.DOTALL)

    written: list[str] = []
    skipped_gui: list[str] = []

    for lang, body in code_blocks:
        lang = (lang or "").lower().strip()
        if lang in SKIP_LANGS and lang not in WRITE_LANGS:
            continue

        lines = body.split("\n")
        if not lines:
            continue

        # filepath: コメントが最初の行にあるか確認
        first_line = lines[0].strip()
        filepath_match = re.match(r"//\s*filepath:\s*(.+)", first_line)
        if not filepath_match:
            skipped_gui.append(f"no filepath: in block (lang={lang})")
            continue

        rel_path = filepath_match.group(1).strip()
        # src/ で始まらない場合はスキップ（安全のため）
        if not rel_path.startswith("src/") and not rel_path.startswith("prisma/") and not rel_path.startswith("public/"):
            skipped_gui.append(f"skipped non-src path: {rel_path}")
            continue

        # 2行目が // 追記 なら追記モード
        append_mode = len(lines) > 1 and lines[1].strip() == "// 追記"

        # filepath: 行と 追記 行を除いたコード本体
        start = 2 if append_mode else 1
        code_content = "\n".join(lines[start:])
        # 末尾の余分な改行を1つに統一
        code_content = code_content.rstrip("\n") + "\n"

        dest = target_dir / rel_path
        dest.parent.mkdir(parents=True, exist_ok=True)

        if append_mode:
            with dest.open("a", encoding="utf-8") as f:
                f.write(code_content)
            written.append(f"APPEND {rel_path}")
        else:
            dest.write_text(code_content, encoding="utf-8")
            written.append(f"WRITE  {rel_path}")

    return written, skipped_gui


def main():
    if len(sys.argv) != 3:
        print("Usage: apply_day.py <day_md_file> <target_app_dir>")
        sys.exit(1)

    md_path = Path(sys.argv[1])
    target_dir = Path(sys.argv[2])

    if not md_path.exists():
        print(f"ERROR: {md_path} not found")
        sys.exit(1)
    if not target_dir.exists():
        print(f"ERROR: {target_dir} not found")
        sys.exit(1)

    written, skipped = apply_day(md_path, target_dir)

    print(f"[apply_day] {md_path.name}")
    for w in written:
        print(f"  ✅ {w}")
    if skipped:
        print(f"  (skipped {len(skipped)} non-filepath blocks)")

    print(f"  → {len(written)} files written")


if __name__ == "__main__":
    main()
