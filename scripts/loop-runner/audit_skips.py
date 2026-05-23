#!/usr/bin/env python3
"""
Audit apply_day.py snippet detection across all Day curriculum files.

For each ```ts/tsx/js/jsx code block:
  - Record filepath, lang, lines, has_export, brace_balance, has_jp_in_path
  - Classify into: WRITE / APPEND / SKIP_NO_EXPORT / SKIP_BRACE / SKIP_JP_PATH / SKIP_NON_SRC / SKIP_INSTRUCTIONAL_COMMENT
  - For each SKIP, store first 5 lines so a human can judge whether the skip was correct
"""

import json
import re
import shlex
import sys
from pathlib import Path
from typing import Optional, Tuple

SKIP_LANGS = {"bash", "shell", "sh", "zsh", "mermaid", "sql", "text", ""}
WRITE_LANGS = {"typescript", "tsx", "javascript", "jsx", "ts", "js", "css", "json", "prisma"}
TS_JS_LANGS = {"typescript", "tsx", "ts", "javascript", "jsx", "js"}
CONTINUE_PATTERN = re.compile(r"^(.+?)（続き）\s*$")
JP_RE = re.compile(r"[぀-ヿ一-鿿]")


def is_safe_rel_path(rel_path: str) -> bool:
    return ".." not in rel_path and (
        rel_path.startswith("src/")
        or rel_path.startswith("prisma/")
        or rel_path.startswith("public/")
    )


def has_safe_shell_move(body: str) -> bool:
    for raw_line in body.split("\n"):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        try:
            parts = shlex.split(line)
        except ValueError:
            continue
        if len(parts) == 3 and parts[0] == "mv" and is_safe_rel_path(parts[1]) and is_safe_rel_path(parts[2]):
            return True
    return False


def has_continuation_header(body: str) -> bool:
    lines = body.split("\n")
    first_line = lines[0].strip() if lines else ""
    filepath_match = re.match(r"//\s*filepath:\s*(.+)", first_line)
    if not filepath_match:
        return False

    rel_path_raw = filepath_match.group(1).strip()
    return rel_path_raw == "続き" or bool(CONTINUE_PATTERN.match(rel_path_raw))


def analyze_block(lang: str, body: str, append_target_path: Optional[str], has_next_continuation: bool) -> Tuple[dict, Optional[str]]:
    lang = (lang or "").lower().strip()
    lines = body.split("\n")
    first_line = lines[0].strip() if lines else ""
    filepath_match = re.match(r"//\s*filepath:\s*(.+)", first_line)
    info = {
        "lang": lang,
        "lines": len(lines),
        "first_line": first_line[:120],
        "has_filepath": bool(filepath_match),
        "filepath": None,
        "classification": None,
        "reason": None,
        "preview": "\n".join(lines[:6]),
    }
    if lang in {"bash", "shell", "sh", "zsh"} and has_safe_shell_move(body):
        info["classification"] = "MOVE"
        return info, None

    if lang in SKIP_LANGS and lang not in WRITE_LANGS:
        info["classification"] = "IGNORE_LANG"
        return info, append_target_path
    if not filepath_match:
        info["classification"] = "SKIP_NO_FILEPATH"
        info["reason"] = f"no filepath header (lang={lang})"
        return info, None
    rel_path_raw = filepath_match.group(1).strip()
    if rel_path_raw == "続き":
        if not append_target_path:
            info["classification"] = "SKIP_ORPHAN_CONTINUATION"
            info["reason"] = rel_path_raw
            return info, None
        rel_path = append_target_path
        force_append = True
    else:
        cont = CONTINUE_PATTERN.match(rel_path_raw)
        if cont:
            rel_path = cont.group(1).strip()
            if rel_path != append_target_path:
                info["classification"] = "SKIP_ORPHAN_CONTINUATION"
                info["reason"] = rel_path_raw
                return info, None
            force_append = True
        else:
            rel_path = rel_path_raw
            force_append = False
    info["filepath"] = rel_path
    if not is_safe_rel_path(rel_path):
        info["classification"] = "SKIP_NON_SRC"
        info["reason"] = rel_path
        return info, None
    if re.search(r"[぀-ヿ一-鿿（）]", rel_path):
        info["classification"] = "SKIP_JP_PATH"
        info["reason"] = rel_path
        return info, None
    explicit_append = len(lines) > 1 and lines[1].strip() == "// 追記"
    append_mode = force_append or explicit_append
    start = 2 if explicit_append else 1
    code = "\n".join(lines[start:]).rstrip("\n") + "\n"
    if append_mode:
        info["classification"] = "APPEND"
        return info, rel_path
    if has_next_continuation:
        info["classification"] = "WRITE"
        return info, rel_path
    first_content_line = lines[start].strip() if len(lines) > start else ""
    if first_content_line.startswith("//") and JP_RE.search(first_content_line):
        info["classification"] = "SKIP_INSTRUCTIONAL_COMMENT"
        info["reason"] = first_content_line[:100]
        return info, None
    if lang in TS_JS_LANGS:
        has_export = bool(re.search(r"^export\b", code, re.MULTILINE))
        if not has_export:
            info["classification"] = "SKIP_NO_EXPORT"
            info["reason"] = "no `^export` in TS/JS body"
            return info, None
        depth = 0
        for ch in code:
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
        if depth != 0:
            info["classification"] = "SKIP_BRACE"
            info["reason"] = f"brace depth = {depth}"
            return info, None
    info["classification"] = "WRITE"
    return info, rel_path


def audit_day(md_path: Path) -> dict:
    content = md_path.read_text(encoding="utf-8")
    code_blocks = re.findall(r"```(\w+)?\n(.*?)```", content, re.DOTALL)
    results = []
    append_target_path = None
    for index, (lang, body) in enumerate(code_blocks):
        has_next_continuation = index + 1 < len(code_blocks) and has_continuation_header(code_blocks[index + 1][1])
        result, append_target_path = analyze_block(lang, body, append_target_path, has_next_continuation)
        results.append(result)
    summary = {}
    for r in results:
        c = r["classification"]
        summary[c] = summary.get(c, 0) + 1
    return {"file": md_path.name, "total_blocks": len(results), "summary": summary, "blocks": results}


def main():
    curriculum_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("material/30days-curriculum")
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("audit-skips.json")
    day_files = sorted(curriculum_dir.glob("day*.md"))
    all_results = [audit_day(p) for p in day_files]
    out_path.write_text(json.dumps(all_results, ensure_ascii=False, indent=2), encoding="utf-8")
    # print summary
    print(f"{'file':70} {'total':>6} {'WRITE':>6} {'APPEND':>6} {'MOVE':>6} {'SKIP_NOEX':>10} {'SKIP_BRACE':>11} {'SKIP_JPPATH':>12} {'SKIP_NONSRC':>12} {'SKIP_NOFP':>10} {'SKIP_ORPHAN':>12} {'SKIP_COMMENT':>13}")
    totals = {}
    for r in all_results:
        s = r["summary"]
        print(
            f"{r['file']:70} "
            f"{r['total_blocks']:>6} "
            f"{s.get('WRITE', 0):>6} "
            f"{s.get('APPEND', 0):>6} "
            f"{s.get('MOVE', 0):>6} "
            f"{s.get('SKIP_NO_EXPORT', 0):>10} "
            f"{s.get('SKIP_BRACE', 0):>11} "
            f"{s.get('SKIP_JP_PATH', 0):>12} "
            f"{s.get('SKIP_NON_SRC', 0):>12} "
            f"{s.get('SKIP_NO_FILEPATH', 0):>10} "
            f"{s.get('SKIP_ORPHAN_CONTINUATION', 0):>12} "
            f"{s.get('SKIP_INSTRUCTIONAL_COMMENT', 0):>13}"
        )
        for k, v in s.items():
            totals[k] = totals.get(k, 0) + v
    print(f"\nTOTALS: {totals}")
    print(f"\nDetails saved to: {out_path}")


if __name__ == "__main__":
    main()
