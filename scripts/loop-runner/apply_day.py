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

# （続き） suffix pattern — continuation blocks append to previous file
CONTINUE_PATTERN = re.compile(r'^(.+?)（続き）\s*$')


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

        rel_path_raw = filepath_match.group(1).strip()

        # （続き） suffix → append to the base file
        continue_match = CONTINUE_PATTERN.match(rel_path_raw)
        if continue_match:
            rel_path = continue_match.group(1).strip()
            force_append = True
        else:
            rel_path = rel_path_raw
            force_append = False

        # src/ / prisma/ / public/ で始まらない場合はスキップ（安全のため）
        # ".." を含む場合も明示的に弾く（target_dir 外への書き込み防止）
        if ".." in rel_path or not (rel_path.startswith("src/") or rel_path.startswith("prisma/") or rel_path.startswith("public/")):
            skipped_gui.append(f"skipped non-src or unsafe path: {rel_path}")
            continue

        # パスに日本語文字が含まれる場合はスキップ（説明用ラベルが混入した教材ブロック）
        if re.search(r'[\u3040-\u30ff\u4e00-\u9fff（）]', rel_path):
            skipped_gui.append(f"skipped path with Japanese chars: {rel_path}")
            continue

        # 2行目が // 追記 なら追記モード（明示的マーカー）
        explicit_append = len(lines) > 1 and lines[1].strip() == "// 追記"
        append_mode = force_append or explicit_append

        # filepath: 行と 追記 行を除いたコード本体
        start = 2 if explicit_append else 1
        code_content = "\n".join(lines[start:])
        # 末尾の余分な改行を1つに統一
        code_content = code_content.rstrip("\n") + "\n"

        # WRITE モードの場合、挿入指示スニペットをスキップ。
        # 判定: filepath の次の行 (lines[start]) が // で始まり、かつ日本語を含む場合は
        # 「〜に追加」「〜の前に追加」等の挿入位置指示コメントと判断してスキップする。
        # append_mode（続き / 追記）は複数ブロックで1ファイルを組み立てるため対象外。
        if not append_mode:
            first_content_line = lines[start].strip() if len(lines) > start else ""
            is_instructional = (
                first_content_line.startswith("//")
                and bool(re.search(r'[\u3040-\u30ff\u4e00-\u9fff]', first_content_line))
            )
            # For TypeScript/JS files: skip blocks that don't look like complete modules.
            # Rule 1: Complete modules have at least one export statement.
            # Rule 2: Complete modules have balanced braces (unclosed = truncated snippet).
            if not is_instructional and lang in {"typescript", "tsx", "ts", "javascript", "jsx", "js"}:
                has_export = bool(re.search(r'^export\b', code_content, re.MULTILINE))
                if not has_export:
                    is_instructional = True
                else:
                    # Brace balance check — unbalanced means the file is cut off mid-way
                    depth = 0
                    for ch in code_content:
                        if ch == '{':
                            depth += 1
                        elif ch == '}':
                            depth -= 1
                    if depth != 0:
                        is_instructional = True
            if is_instructional:
                skipped_gui.append(f"skipped instructional snippet: {rel_path}")
                continue

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
