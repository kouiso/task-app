#!/usr/bin/env python3
"""release-manifest.json を生成する。

現在状態の構造検査に加え、実際の全冊ビルドが発行した証跡を照合する。
レビュー指摘 R06 の受入条件:

- コミット SHA と dirty 状態を記録する。dirty のまま作った場合は
  `git diff` と未追跡ファイルのハッシュも残し、ツリー全体を一意にできる。
- 成果物ごとに SHA256（PDF 36冊・配布 ZIP・スクショ束の集約ハッシュ）。
- 組版に使った道具とフォントの版・ハッシュ。
- Drive のファイル ID と共有リンク。
- --remote-check で Drive から再取得して SHA256 を照合する。
  1件でも違えば終了コード1で落ちる（そのまま出荷させない）。

使い方:
    python3 release_manifest.py --write dist/release-manifest.json
    python3 release_manifest.py --remote-check   # Drive 照合まで
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PDF_DIR = REPO_ROOT / "dist" / "pdf"
DRIVE_META = REPO_ROOT / "dist" / "drive-backup-9cff5605" / "metadata.json"
SCREENSHOT_DIR = REPO_ROOT / "material" / "30days-curriculum" / "screenshots"
SNAPSHOT_DIR = REPO_ROOT / "dist" / "day-snapshots"
MATERIAL_DIR = REPO_ROOT / "material" / "30days-curriculum"
CORRESPONDENCE_LEDGER = REPO_ROOT / "material" / "release-correspondence.json"
EXPECTED_PDFS = 36
RELEASE_ZIP = REPO_ROOT / "task-app-curriculum-v1.1.zip"

# 台帳で必須とする承認済み組合せ。成果物の系統ごとに1件必要
REQUIRED_COMBINATIONS = {
    "pdf-set", "screenshots", "distribution-zip", "drive-delivery",
}
PREUPLOAD_COMBINATIONS = REQUIRED_COMBINATIONS - {"drive-delivery"}

sys.path.insert(0, str(REPO_ROOT / "scripts" / "pdf-book"))
from build_pdf_book import (  # noqa: E402
    FONT_SOURCES,
    MERMAID_CLI,
    THEME,
    VFM_CLI,
    VIVLIOSTYLE_CLI,
    RELEASE_RECEIPT,
    find_browser,
    release_input_snapshot,
)


def run(args: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(
        args, capture_output=True, text=True, cwd=cwd, timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"{args[0]} が失敗: {result.stderr.strip()[-200:]}")
    return result.stdout.strip()


def run_bytes(args: list[str], cwd: Path | None = None) -> bytes:
    result = subprocess.run(args, capture_output=True, cwd=cwd, timeout=120)
    if result.returncode != 0:
        error = os.fsdecode(result.stderr[-200:]).strip()
        raise RuntimeError(f"{args[0]} が失敗: {error}")
    return result.stdout


def _hash_file_stably(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        before = os.fstat(stream.fileno())
        size = 0
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
            size += len(chunk)
        after = os.fstat(stream.fileno())
    before_signature = (
        before.st_dev, before.st_ino, before.st_mode, before.st_size,
        before.st_mtime_ns, before.st_ctime_ns,
    )
    after_signature = (
        after.st_dev, after.st_ino, after.st_mode, after.st_size,
        after.st_mtime_ns, after.st_ctime_ns,
    )
    if before_signature != after_signature or size != before.st_size:
        raise OSError(f"ハッシュ計算中にファイルが変わった: {path}")
    return digest.hexdigest(), size


def sha256_file(path: Path) -> str:
    return _hash_file_stably(path)[0]


def _update_framed(digest, value: bytes) -> None:
    digest.update(len(value).to_bytes(8, "big"))
    digest.update(value)


def _index_entries(root: Path) -> dict[bytes, tuple[bytes, bytes]]:
    output = run_bytes(["git", "ls-files", "-s", "-z"], root)
    entries = {}
    for record in (item for item in output.split(b"\0") if item):
        metadata, name = record.split(b"\t", 1)
        mode, object_id, _stage = metadata.split(b" ", 2)
        entries[name] = (mode, object_id)
    return entries


def _worktree_identity(root: Path, ancestors: set[Path]) -> dict:
    """tracked と untracked の実体をファイル名・内容ごとに束ねる。"""
    resolved_root = root.resolve()
    if resolved_root in ancestors:
        raise RuntimeError(f"submodule が循環している: {root}")
    ancestors = {*ancestors, resolved_root}
    output = run_bytes(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        root,
    )
    index = _index_entries(root)
    names = sorted((name for name in output.split(b"\0") if name))
    digest = hashlib.sha256()
    regular = 0
    symlinks = 0
    submodules = []
    missing = 0
    for raw_name in names:
        _update_framed(digest, raw_name)
        path = root / os.fsdecode(raw_name)
        index_mode, index_object = index.get(raw_name, (b"", b""))
        if index_mode == b"160000":
            _update_framed(digest, b"gitlink")
            _update_framed(digest, index_object)
            record = {"path": os.fsdecode(raw_name), "index_commit": index_object.decode()}
            try:
                top_level = Path(run(["git", "rev-parse", "--show-toplevel"], path)).resolve()
                if top_level != path.resolve():
                    raise RuntimeError("submodule の作業ツリーが初期化されていない")
                head = run(["git", "rev-parse", "HEAD"], path)
                nested = _worktree_identity(path, ancestors)
                _update_framed(digest, head.encode())
                _update_framed(digest, bytes.fromhex(nested["aggregate_sha256"]))
                record.update({
                    "worktree_available": True,
                    "head_commit": head,
                    "worktree_identity": nested,
                })
            except (FileNotFoundError, RuntimeError) as error:
                _update_framed(digest, b"unavailable")
                record["worktree_available"] = False
                record["error"] = str(error)[:200]
            submodules.append(record)
            continue
        try:
            mode = path.lstat().st_mode
        except FileNotFoundError:
            missing += 1
            _update_framed(digest, b"missing")
            continue
        if stat.S_ISLNK(mode):
            symlinks += 1
            _update_framed(digest, b"symlink")
            _update_framed(digest, str(stat.S_IMODE(mode)).encode())
            _update_framed(digest, os.fsencode(os.readlink(path)))
        elif stat.S_ISREG(mode):
            regular += 1
            _update_framed(digest, b"file")
            _update_framed(digest, str(stat.S_IMODE(mode)).encode())
            file_sha, size = _hash_file_stably(path)
            _update_framed(digest, str(size).encode())
            _update_framed(digest, bytes.fromhex(file_sha))
        else:
            _update_framed(digest, b"other")
    return {
        "scope": (
            "tracked-and-untracked-files; initialized-submodules-include-recursive-"
            "worktree-content; unavailable-submodules-are-bound-by-index-commit"
        ),
        "file_count": len(names),
        "regular_file_count": regular,
        "symlink_count": symlinks,
        "submodule_count": len(submodules),
        "submodules": submodules,
        "missing_count": missing,
        "aggregate_sha256": digest.hexdigest(),
    }


def worktree_identity() -> dict:
    return _worktree_identity(REPO_ROOT, set())


def git_state() -> dict:
    commit = run(["git", "rev-parse", "HEAD"], REPO_ROOT)
    branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], REPO_ROOT)
    status = run(["git", "status", "--porcelain"], REPO_ROOT)
    dirty = bool(status.strip())
    state = {"commit": commit, "branch": branch, "clean": not dirty}
    state["worktree_identity"] = worktree_identity()
    if dirty:
        # dirty のまま組んだ場合でもツリーを一意に再現できるよう、
        # 差分と未追跡ファイルの実体ハッシュを束ねて記録する
        diff = run(["git", "diff", "HEAD"], REPO_ROOT)
        untracked = [
            line[3:] for line in status.splitlines() if line.startswith("?? ")
        ]
        untracked_hashes = {}
        for name in sorted(untracked):
            target = REPO_ROOT / name
            if target.is_file():
                untracked_hashes[name] = sha256_file(target)
        state["dirty_diagnostics"] = {
            "scope": "partial-human-readable-summary-not-tree-identity",
            "diff_sha256": hashlib.sha256(diff.encode()).hexdigest(),
            "top_level_untracked_file_sha256": untracked_hashes,
        }
        state["status_lines"] = len(status.splitlines())
    return state


def pdf_inventory() -> list[dict]:
    items: list[dict] = []
    for pdf in sorted(PDF_DIR.glob("*.pdf")):
        pages = None
        parse_error = None
        try:
            info = run(["pdfinfo", str(pdf)])
            match = re.search(r"Pages:\s*(\d+)", info)
            if match:
                pages = int(match.group(1))
            else:
                parse_error = "pdfinfo の出力にページ数が無い"
        except (RuntimeError, FileNotFoundError) as error:
            parse_error = str(error)[:200]
        items.append({
            "name": pdf.name,
            "size": pdf.stat().st_size,
            "sha256": sha256_file(pdf),
            "pages": pages,
            "parse_error": parse_error,
        })
    return items


def zip_inventory() -> dict | None:
    if not RELEASE_ZIP.exists():
        return None
    parse_error = None
    entry_count = 0
    try:
        with zipfile.ZipFile(RELEASE_ZIP) as archive:
            entries = [info for info in archive.infolist() if not info.is_dir()]
            entry_count = len(entries)
            broken = archive.testzip()
            if broken is not None:
                parse_error = f"CRC が壊れている: {broken}"
    except (OSError, zipfile.BadZipFile) as error:
        parse_error = str(error)[:200]
    return {
        "name": RELEASE_ZIP.name,
        "size": RELEASE_ZIP.stat().st_size,
        "sha256": sha256_file(RELEASE_ZIP),
        "entry_count": entry_count,
        "parse_error": parse_error,
    }


def expected_pdf_names() -> list[str]:
    return sorted(path.with_suffix(".pdf").name for path in MATERIAL_DIR.glob("*.md"))


def verify_pdf_inventory(items: list[dict], expected: list[str] | None = None) -> list[str]:
    problems: list[str] = []
    names = [item["name"] for item in items]
    expected_names = expected_pdf_names() if expected is None else sorted(expected)
    if len(expected_names) != EXPECTED_PDFS:
        problems.append(
            f"PDF原稿が {len(expected_names)} 冊（{EXPECTED_PDFS} 冊ではない）"
        )
    missing = sorted(set(expected_names) - set(names))
    unexpected = sorted(set(names) - set(expected_names))
    duplicates = sorted(name for name, count in Counter(names).items() if count > 1)
    if missing:
        problems.append("PDF が不足: " + ", ".join(missing[:5]))
    if unexpected:
        problems.append("想定外の PDF: " + ", ".join(unexpected[:5]))
    if duplicates:
        problems.append("PDF名が重複: " + ", ".join(duplicates[:5]))
    for item in items:
        if item.get("size", 0) <= 0:
            problems.append(f"{item['name']}: PDF が空")
        if item.get("parse_error"):
            problems.append(f"{item['name']}: PDF を解析できない")
        if not isinstance(item.get("pages"), int) or item["pages"] <= 0:
            problems.append(f"{item['name']}: 正のページ数を取得できない")
    return problems


def verify_zip_inventory(item: dict | None) -> list[str]:
    if item is None:
        return [f"配布 ZIP が無い: {RELEASE_ZIP.name}"]
    problems = []
    if item.get("name") != RELEASE_ZIP.name:
        problems.append(f"配布 ZIP が正本名ではない: {item.get('name')}")
    if item.get("size", 0) <= 0:
        problems.append("配布 ZIP が空")
    if item.get("parse_error"):
        problems.append(f"配布 ZIP を解析できない: {item['parse_error']}")
    if item.get("entry_count", 0) <= 0:
        problems.append("配布 ZIP にファイルが無い")
    return problems


def screenshots_aggregate() -> dict | None:
    if not SCREENSHOT_DIR.is_dir():
        return None
    lines = []
    files = sorted(p for p in SCREENSHOT_DIR.rglob("*") if p.is_file())
    for path in files:
        lines.append(f"{sha256_file(path)}  {path.relative_to(SCREENSHOT_DIR)}")
    digest = hashlib.sha256("\n".join(lines).encode()).hexdigest()
    return {"count": len(files), "aggregate_sha256": digest}


def tool_versions() -> dict:
    def version_of(args: list[str]) -> str | None:
        try:
            return run(args)
        except (RuntimeError, FileNotFoundError):
            return None

    return {
        "node": version_of(["node", "--version"]),
        "npm": version_of(["npm", "--version"]),
        "vivliostyle_cli": VIVLIOSTYLE_CLI,
        "vfm": VFM_CLI,
        "theme": THEME,
        "mermaid_cli": MERMAID_CLI,
        "chrome": version_of(["google-chrome", "--version"]),
        "pdfinfo": (version_of(["pdfinfo", "-v"]) or "").splitlines()[:1],
        "python": sys.version.split()[0],
        "platform": run(["uname", "-srmo"]) if Path("/usr/bin/uname").exists() else "",
    }


def font_inventory() -> list[dict]:
    fonts = []
    for package, path, family, weight, fmt in FONT_SOURCES:
        source = REPO_ROOT / "node_modules" / package / path
        fonts.append({
            "family": family, "weight": weight, "format": fmt,
            "file": f"{package}/{path}",
            "sha256": sha256_file(source) if source.exists() else None,
        })
    return fonts


def generation_input_inventory() -> dict:
    """manifest 実行時点の主要入力を記録する（生成由来の証明ではない）。"""
    sources = sorted(MATERIAL_DIR.glob("*.md"))
    inputs = [
        *sources,
        REPO_ROOT / "scripts" / "pdf-book" / "build_pdf_book.py",
        REPO_ROOT / "material" / "style" / "book.css",
        REPO_ROOT / "package-lock.json",
    ]
    records = []
    digest = hashlib.sha256()
    for path in inputs:
        relative = path.relative_to(REPO_ROOT)
        name = os.fsencode(str(relative))
        _update_framed(digest, name)
        if path.is_file():
            file_sha = sha256_file(path)
            _update_framed(digest, bytes.fromhex(file_sha))
            records.append({"file": str(relative), "sha256": file_sha})
        else:
            _update_framed(digest, b"missing")
            records.append({"file": str(relative), "sha256": None})
    return {
        "scope": "structural-current-state-only",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "source_count": len(sources),
        "source_pdf_names": [path.with_suffix(".pdf").name for path in sources],
        "files": records,
        "aggregate_sha256": digest.hexdigest(),
    }


def build_receipt_section() -> dict:
    if not RELEASE_RECEIPT.is_file():
        return {"loaded": False, "error": "全冊ビルド証跡が無い"}
    try:
        receipt = json.loads(RELEASE_RECEIPT.read_text(encoding="utf-8"))
        link_map_file = receipt.get("inputs", {}).get("link_map_file")
        current_inputs = release_input_snapshot(
            sorted(MATERIAL_DIR.glob("*.md")), link_map_file, find_browser()
        )
    except (AttributeError, json.JSONDecodeError, OSError, ValueError) as error:
        return {"loaded": False, "error": f"全冊ビルド証跡を読めない: {error}"}
    return {
        "loaded": True,
        "file": str(RELEASE_RECEIPT.relative_to(REPO_ROOT)),
        "receipt": receipt,
        "current_inputs": current_inputs,
    }


def verify_build_receipt(section: dict, pdfs: list[dict]) -> list[str]:
    """実ビルド時の入力・出力と現在の入力・PDFが同一か検証する。"""
    if not section.get("loaded"):
        return [section.get("error") or "全冊ビルド証跡が無い"]
    receipt = section.get("receipt")
    current_inputs = section.get("current_inputs")
    if not isinstance(receipt, dict) or not isinstance(current_inputs, dict):
        return ["全冊ビルド証跡の形式が不正"]
    problems: list[str] = []
    if receipt.get("version") != 1 or receipt.get("scope") != "full-36-book-build":
        problems.append("全冊ビルド証跡の版または範囲が不正")
    receipt_inputs = receipt.get("inputs")
    if not isinstance(receipt_inputs, dict):
        return problems + ["全冊ビルド証跡に入力記録が無い"]
    if receipt_inputs.get("source_count") != EXPECTED_PDFS:
        problems.append("全冊ビルド証跡が36原稿を対象にしていない")
    if receipt_inputs.get("aggregate_sha256") != current_inputs.get("aggregate_sha256"):
        problems.append("全冊ビルド後に入力が変わっている")
    if receipt_inputs.get("source_pdf_names") != current_inputs.get("source_pdf_names"):
        problems.append("全冊ビルド証跡のPDF名集合が現在の原稿と違う")

    outputs = receipt.get("outputs")
    if not isinstance(outputs, list):
        return problems + ["全冊ビルド証跡に出力記録が無い"]
    receipt_by_name = {
        item.get("name"): item for item in outputs if isinstance(item, dict)
    }
    if len(outputs) != EXPECTED_PDFS or len(receipt_by_name) != EXPECTED_PDFS:
        problems.append("全冊ビルド証跡のPDF出力が36冊一意ではない")
    current_by_name = {item["name"]: item for item in pdfs}
    if set(receipt_by_name) != set(current_by_name):
        problems.append("全冊ビルド証跡のPDF名集合が現在の出力と違う")
    for name in sorted(set(receipt_by_name) & set(current_by_name)):
        proven = receipt_by_name[name]
        current = current_by_name[name]
        if (
            proven.get("sha256") != current.get("sha256")
            or proven.get("size") != current.get("size")
        ):
            problems.append(f"全冊ビルド後にPDFが変わっている: {name}")
    return problems


def drive_inventory() -> list[dict]:
    if not DRIVE_META.exists():
        return []
    data = json.loads(DRIVE_META.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Drive metadata は配列でなければならない")
    return [
        {"id": e["id"], "name": e["name"], "url": e["url"],
         "uploaded_sha256": e.get("sha256")}
        for e in data
    ]


def correspondence_section() -> dict:
    """R06: 成果物→対応するコード・画面状態のトレースと申告台帳。

    全成果物を同一コミットのハッシュで縛るのではなく、「互換性を確認した
    組合せ」を台帳へ記録する。ここでは実体から辿れる対応を自動で引き、
    台帳の記載と突き合わせる。記入者名があるだけで内容を証明済みとは扱わない。
    """
    pdf_traces = []
    for pdf in sorted(PDF_DIR.glob("*.pdf")):
        stem = pdf.stem
        md = MATERIAL_DIR / f"{stem}.md"
        snapshot = SNAPSHOT_DIR / stem.split("_")[0]
        trace = {
            "pdf": pdf.name,
            "source_md": str(md.relative_to(REPO_ROOT)) if md.exists() else None,
            "day_snapshot": (
                str(snapshot.relative_to(REPO_ROOT))
                if snapshot.is_dir() else None
            ),
        }
        pdf_traces.append(trace)

    screenshot_traces = []
    if SCREENSHOT_DIR.is_dir():
        for path in sorted(SCREENSHOT_DIR.rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(SCREENSHOT_DIR)
            # dayNN/ 配下か、根の dayNN-*.png どちらでも day を拾う
            day_m = re.match(r"day\d+", rel.parts[0])
            snap = SNAPSHOT_DIR / day_m.group(0) if day_m else None
            screenshot_traces.append({
                "file": str(rel),
                "day_snapshot": (
                    str(snap.relative_to(REPO_ROOT))
                    if snap and snap.is_dir() else None
                ),
            })

    ledger = None
    if CORRESPONDENCE_LEDGER.exists():
        ledger = json.loads(CORRESPONDENCE_LEDGER.read_text(encoding="utf-8"))

    return {
        "ledger": str(CORRESPONDENCE_LEDGER.relative_to(REPO_ROOT)),
        "ledger_loaded": ledger is not None,
        "ledger_content": ledger,
        "derived": {
            "pdfs": pdf_traces,
            "screenshots": screenshot_traces,
        },
    }


def verify_correspondence(
    section: dict,
    required_combinations: set[str] = REQUIRED_COMBINATIONS,
) -> list[str]:
    """対応不明または構造不備があれば失敗理由を返す。"""
    problems: list[str] = []
    if not section["ledger_loaded"]:
        return ["対応台帳 release-correspondence.json が読めない"]

    derived = section["derived"]
    for trace in derived["pdfs"]:
        if trace["source_md"] is None:
            problems.append(f"{trace['pdf']}: 対応する md が無い")
        if trace["pdf"].startswith("day") and trace["day_snapshot"] is None:
            problems.append(f"{trace['pdf']}: 対応する day スナップショットが無い")
    for trace in derived["screenshots"]:
        if trace["file"].startswith("day") and trace["day_snapshot"] is None:
            problems.append(
                f"screenshots/{trace['file']}: 対応する day スナップショットが無い"
            )

    ledger = section["ledger_content"]
    combos = {c.get("id"): c for c in ledger.get("combinations", [])}
    missing = required_combinations - set(combos)
    for combo_id in sorted(missing):
        problems.append(f"台帳に対応申告 {combo_id} が無い")
    for combo_id, combo in combos.items():
        for field in ("subject", "corresponds_to", "basis"):
            if not combo.get(field):
                problems.append(f"組合せ {combo_id}: {field} が未記入")
    for ex in ledger.get("exceptions", []):
        for field in ("subject", "delta", "disposition", "basis"):
            if not ex.get(field):
                problems.append(
                    f"例外 {ex.get('id', '?')}: {field} が未記入"
                )
        if ex.get("disposition") not in ("reuse_approved", "recaptured",
                                        "excluded"):
            problems.append(
                f"例外 {ex.get('id', '?')}: disposition が未承認の値"
            )
    return problems


DRIVE_FOLDER_ID = "1LXf2Ws7MKN0hBjEGCU6W3CmwH5Y4GjxU"


def remote_check(manifest: dict) -> list[dict]:
    """Drive から1件ずつ再取得して SHA256 を照合する。

    rclone はファイルIDで直接取得できないので、フォルダを root 扱いにして
    名前で取る。先に lsjson で現在の 名前→ID 対応を取り、metadata.json が
    記録したIDと今のDrive実体が一致することもあわせて検査する
    （同名の別ファイルを掴まないため）。
    """
    local = {p["name"]: p for p in manifest["artifacts"]["pdfs"]}
    listing = run([
        "rclone", "lsjson",
        f"--drive-root-folder-id={DRIVE_FOLDER_ID}", "gdrive:",
    ])
    live_by_name: dict[str, list[str]] = defaultdict(list)
    for item in json.loads(listing):
        if isinstance(item, dict) and item.get("Name") and item.get("ID"):
            live_by_name[item["Name"]].append(item["ID"])

    metadata_by_name: dict[str, list[dict]] = defaultdict(list)
    for entry in manifest["drive"]:
        metadata_by_name[entry.get("name")].append(entry)

    results = []
    with tempfile.TemporaryDirectory() as tmp:
        for name, local_entry in sorted(local.items()):
            metadata_entries = metadata_by_name.get(name, [])
            live_ids = live_by_name.get(name, [])
            if len(metadata_entries) != 1:
                results.append({
                    "name": name,
                    "ok": False,
                    "error": f"metadata の件数が {len(metadata_entries)}",
                })
                continue
            entry = metadata_entries[0]
            downloaded = Path(tmp) / name
            record = {"id": entry["id"], "name": name}
            if len(live_ids) != 1:
                record.update({
                    "ok": False,
                    "error": f"Drive上の同名ファイルが {len(live_ids)} 件",
                })
                results.append(record)
                continue
            if live_ids[0] != entry["id"]:
                record.update({
                    "ok": False,
                    "error": f"Drive上のIDが記録と違う: {live_ids[0]}",
                })
                results.append(record)
                continue
            try:
                run([
                    "rclone", "copyto",
                    f"--drive-root-folder-id={DRIVE_FOLDER_ID}",
                    f"gdrive:{name}", str(downloaded),
                ])
            except (RuntimeError, FileNotFoundError) as error:
                record.update({"ok": False, "error": str(error)[:200]})
                results.append(record)
                continue
            remote_sha = sha256_file(downloaded)
            local_sha = local_entry["sha256"]
            uploaded_sha = entry.get("uploaded_sha256")
            record.update({
                "ok": remote_sha == local_sha == uploaded_sha,
                "remote_sha256": remote_sha,
                "local_sha256": local_sha,
                "uploaded_sha256": uploaded_sha,
            })
            results.append(record)
    return results


def preupload_failures(manifest: dict, require_clean: bool = False) -> list[str]:
    """ローカル成果物をアップロード前に止める条件。"""
    failures: list[str] = []
    if require_clean and not manifest["git"]["clean"]:
        failures.append(
            f"git ツリーが dirty（{manifest['git'].get('status_lines')} 件）"
        )
    generation = manifest.get("generation_inputs") or {}
    source_names = generation.get("source_pdf_names", [])
    if generation.get("source_count") != EXPECTED_PDFS:
        failures.append(
            f"PDF原稿が {generation.get('source_count')} 冊（{EXPECTED_PDFS} 冊ではない）"
        )
    if not generation.get("aggregate_sha256"):
        failures.append("PDF生成入力の集約ハッシュが無い")
    for item in generation.get("files", []):
        if not item.get("sha256"):
            failures.append(f"PDF生成入力が無い: {item.get('file')}")
    failures += verify_pdf_inventory(manifest["artifacts"]["pdfs"], source_names)
    failures += verify_build_receipt(
        manifest.get("build_receipt", {}), manifest["artifacts"]["pdfs"]
    )
    failures += verify_zip_inventory(manifest["artifacts"]["zip"])
    for font in manifest.get("fonts", []):
        if not font.get("sha256"):
            failures.append(f"組版フォントが無い: {font.get('file')}")
    if len(manifest.get("fonts", [])) != len(FONT_SOURCES):
        failures.append("組版フォントの件数が FONT_SOURCES と一致しない")
    failures += verify_correspondence(
        manifest["correspondence"], PREUPLOAD_COMBINATIONS
    )
    return failures


def postupload_failures(manifest: dict, results: list[dict]) -> list[str]:
    """アップロード後の全PDF再取得を止める条件。"""
    failures: list[str] = []
    failures += verify_correspondence(
        manifest["correspondence"], {"drive-delivery"}
    )
    expected = [item["name"] for item in manifest["artifacts"]["pdfs"]]
    drive = manifest.get("drive", [])
    drive_names = [item.get("name") for item in drive]
    drive_ids = [item.get("id") for item in drive]
    duplicate_drive_names = sorted(
        name for name, count in Counter(drive_names).items()
        if name is not None and count > 1
    )
    duplicate_drive_ids = sorted(
        item_id for item_id, count in Counter(drive_ids).items()
        if item_id is not None and count > 1
    )
    if duplicate_drive_names:
        failures.append(
            "Drive metadata の名前が重複: " + ", ".join(duplicate_drive_names[:5])
        )
    if duplicate_drive_ids:
        failures.append(
            "Drive metadata のIDが重複: " + ", ".join(duplicate_drive_ids[:5])
        )
    missing_metadata = sorted(set(expected) - set(drive_names))
    unexpected_metadata = sorted(
        name for name in set(drive_names) - set(expected) if name
    )
    if missing_metadata:
        failures.append("Drive metadata が不足: " + ", ".join(missing_metadata[:5]))
    if unexpected_metadata:
        failures.append(
            "Drive metadata に想定外の名前: " + ", ".join(unexpected_metadata[:5])
        )
    local_by_name = {
        item["name"]: item["sha256"] for item in manifest["artifacts"]["pdfs"]
    }
    for entry in drive:
        if not entry.get("id") or not entry.get("url"):
            failures.append(f"Drive metadata のIDまたはURLが無い: {entry.get('name')}")
        local_sha = local_by_name.get(entry.get("name"))
        if local_sha and entry.get("uploaded_sha256") != local_sha:
            failures.append(
                f"Drive metadata の記録ハッシュがローカルと違う: {entry.get('name')}"
            )
    result_names = [item.get("name") for item in results]
    if not results:
        failures.append("Drive 照合結果が空")
    duplicates = sorted(
        name for name, count in Counter(result_names).items()
        if name is not None and count > 1
    )
    if duplicates:
        failures.append("Drive 照合結果の名前が重複: " + ", ".join(duplicates[:5]))
    missing = sorted(set(expected) - set(result_names))
    unexpected = sorted(name for name in set(result_names) - set(expected) if name)
    if missing:
        failures.append("Drive 照合結果が不足: " + ", ".join(missing[:5]))
    if unexpected:
        failures.append("Drive 照合結果に想定外の名前: " + ", ".join(unexpected[:5]))
    mismatched = [item.get("name", "?") for item in results if not item.get("ok")]
    if mismatched:
        failures.append(
            f"Drive とのIDまたはハッシュ不一致 {len(mismatched)} 件: "
            + ", ".join(mismatched[:5])
        )
    return failures


def build_manifest() -> dict:
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "git": git_state(),
        "tools": tool_versions(),
        "fonts": font_inventory(),
        "generation_inputs": generation_input_inventory(),
        "build_receipt": build_receipt_section(),
        "artifacts": {
            "pdfs": pdf_inventory(),
            "zip": zip_inventory(),
            "screenshots": screenshots_aggregate(),
        },
        "drive": drive_inventory(),
        "correspondence": correspondence_section(),
        "remote_verification": None,
        "verification": {
            "preupload": None,
            "postupload": None,
        },
    }
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", type=Path, help="出力先 JSON")
    parser.add_argument("--require-clean", action="store_true",
                        help="git ツリーが dirty なら失敗にする")
    parser.add_argument("--remote-check", action="store_true",
                        help="Drive から再取得して SHA256 を照合する")
    args = parser.parse_args()

    manifest = build_manifest()
    failures = preupload_failures(manifest, require_clean=args.require_clean)
    manifest["verification"]["preupload"] = {
        "ok": not failures,
        "scope": "release-ready-with-full-build-receipt",
        "failures": failures.copy(),
    }

    if args.remote_check:
        results = remote_check(manifest)
        manifest["remote_verification"] = {
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "results": results,
        }
        remote_failures = postupload_failures(manifest, results)
        manifest["verification"]["postupload"] = {
            "ok": not remote_failures,
            "failures": remote_failures,
        }
        failures += remote_failures

    if args.write:
        args.write.parent.mkdir(parents=True, exist_ok=True)
        args.write.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"manifest: {args.write}")

    if failures:
        print("❌ release 条件を満たさない:", file=sys.stderr)
        for failure in failures:
            print(f"  - {failure}", file=sys.stderr)
        return 1
    print("✅ 全冊ビルド証跡を含む release-ready 検証 OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
