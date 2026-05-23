#!/usr/bin/env python3
"""
Day教材のコードブロックを抽出してターゲットディレクトリに書き込む。

Usage: python3 apply_day.py <day_md_file> <target_app_dir>
"""

import sys
import re
import shlex
from pathlib import Path
from typing import Optional


SKIP_LANGS = {"bash", "shell", "sh", "zsh", "mermaid", "sql", "text", ""}
WRITE_LANGS = {"typescript", "tsx", "javascript", "jsx", "ts", "js", "css", "json", "prisma"}

# （続き） suffix pattern — continuation blocks append to previous file
CONTINUE_PATTERN = re.compile(r'^(.+?)（続き）\s*$')


def is_safe_rel_path(rel_path: str) -> bool:
    return ".." not in rel_path and (
        rel_path.startswith("src/")
        or rel_path.startswith("prisma/")
        or rel_path.startswith("public/")
    )


def apply_safe_shell_ops(body: str, target_dir: Path) -> list[str]:
    written: list[str] = []
    for raw_line in body.split("\n"):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        try:
            parts = shlex.split(line)
        except ValueError:
            continue

        if len(parts) == 3 and parts[0] == "mv":
            src, dest = parts[1], parts[2]
            if not is_safe_rel_path(src) or not is_safe_rel_path(dest):
                continue

            src_path = target_dir / src
            dest_path = target_dir / dest
            if src_path.exists():
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                src_path.rename(dest_path)
                written.append(f"MOVE   {src} -> {dest}")

    return written


def has_continuation_header(body: str) -> bool:
    lines = body.split("\n")
    if not lines:
        return False

    filepath_match = re.match(r"//\s*filepath:\s*(.+)", lines[0].strip())
    if not filepath_match:
        return False

    rel_path_raw = filepath_match.group(1).strip()
    return rel_path_raw == "続き" or bool(CONTINUE_PATTERN.match(rel_path_raw))


def apply_day(md_path: Path, target_dir: Path) -> tuple[list[str], list[str]]:
    content = md_path.read_text(encoding="utf-8")
    code_blocks = re.findall(r"```(\w+)?\n(.*?)```", content, re.DOTALL)

    written: list[str] = []
    skipped_gui: list[str] = []
    append_target_path: Optional[str] = None

    for index, (lang, body) in enumerate(code_blocks):
        lang = (lang or "").lower().strip()
        if lang in {"bash", "shell", "sh", "zsh"}:
            shell_written = apply_safe_shell_ops(body, target_dir)
            if shell_written:
                written.extend(shell_written)
                append_target_path = None
            continue

        if lang in SKIP_LANGS and lang not in WRITE_LANGS:
            continue

        lines = body.split("\n")
        if not lines:
            append_target_path = None
            continue

        # filepath: コメントが最初の行にあるか確認
        first_line = lines[0].strip()
        filepath_match = re.match(r"//\s*filepath:\s*(.+)", first_line)
        if not filepath_match:
            skipped_gui.append(f"no filepath: in block (lang={lang})")
            append_target_path = None
            continue

        rel_path_raw = filepath_match.group(1).strip()

        # 「続き」は直前に同じファイルを書けた場合だけ追記する。
        # 比較用・読むのみブロックが skip された直後の「（続き）」を誤って本番ファイルへ
        # append すると、壊れた断片が混入して build が落ちるため。
        if rel_path_raw == "続き":
            if not append_target_path:
                skipped_gui.append("skipped orphan continuation: 続き")
                append_target_path = None
                continue
            rel_path = append_target_path
            force_append = True
        else:
            continue_match = CONTINUE_PATTERN.match(rel_path_raw)
            if continue_match:
                candidate_path = continue_match.group(1).strip()
                if candidate_path != append_target_path:
                    skipped_gui.append(f"skipped orphan continuation: {rel_path_raw}")
                    append_target_path = None
                    continue
                rel_path = candidate_path
                force_append = True
            else:
                rel_path = rel_path_raw
                force_append = False

        # src/ / prisma/ / public/ で始まらない場合はスキップ（安全のため）
        # ".." を含む場合も明示的に弾く（target_dir 外への書き込み防止）
        if not is_safe_rel_path(rel_path):
            skipped_gui.append(f"skipped non-src or unsafe path: {rel_path}")
            append_target_path = None
            continue

        # パスに日本語文字が含まれる場合はスキップ（説明用ラベルが混入した教材ブロック）
        if re.search(r'[\u3040-\u30ff\u4e00-\u9fff（）]', rel_path):
            skipped_gui.append(f"skipped path with Japanese chars: {rel_path}")
            append_target_path = None
            continue

        # 2行目が // 追記 なら追記モード（明示的マーカー）
        explicit_append = len(lines) > 1 and lines[1].strip() == "// 追記"
        append_mode = force_append or explicit_append
        has_next_continuation = index + 1 < len(code_blocks) and has_continuation_header(code_blocks[index + 1][1])

        # filepath: 行と 追記 行を除いたコード本体
        start = 2 if explicit_append else 1
        code_content = "\n".join(lines[start:])
        # 末尾の余分な改行を1つに統一
        code_content = code_content.rstrip("\n") + "\n"

        # WRITE モードの場合、挿入指示スニペットをスキップ。
        # 判定: filepath の次の行 (lines[start]) が // で始まり、かつ日本語を含む場合は
        # 「〜に追加」「〜の前に追加」等の挿入位置指示コメントと判断してスキップする。
        # append_mode（続き / 追記）は複数ブロックで1ファイルを組み立てるため対象外。
        if not append_mode and not has_next_continuation:
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
                append_target_path = None
                continue

        dest = target_dir / rel_path
        dest.parent.mkdir(parents=True, exist_ok=True)

        if append_mode:
            with dest.open("a", encoding="utf-8") as f:
                f.write(code_content)
            written.append(f"APPEND {rel_path}")
            append_target_path = rel_path
        else:
            dest.write_text(code_content, encoding="utf-8")
            written.append(f"WRITE  {rel_path}")
            append_target_path = rel_path

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

    # 0 件書き込みかつ skip もない = GitHub / deploy などアプリコードを書かない Day。
    # build 検証だけ続けられるよう success とする。
    if not written and not skipped:
        print("  ℹ️ no app file changes in this day")
        return

    # 0 件書き込みで skip がある = 教材の filepath マーカー不足 or 検出ロジック過剰スキップ。
    # 後段ステップが false-positive で「pass」と判定するのを防ぐため non-zero で抜ける。
    if not written:
        print("  ❌ no files written — fail to surface false-positive day-pass")
        sys.exit(2)


if __name__ == "__main__":
    main()
