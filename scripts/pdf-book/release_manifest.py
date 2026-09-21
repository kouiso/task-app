#!/usr/bin/env python3
"""release-manifest.json を生成する。

納品物の同一性を「どの入力から何が出て、どこへ置いたか」で固定する。
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
import hashlib
import json
import re
import subprocess
import sys
import tempfile
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

# 台帳で必須とする承認済み組合せ。成果物の系統ごとに1件必要
REQUIRED_COMBINATIONS = {
    "pdf-set", "screenshots", "distribution-zip", "drive-delivery",
}

sys.path.insert(0, str(REPO_ROOT / "scripts" / "pdf-book"))
from build_pdf_book import (  # noqa: E402
    FONT_SOURCES,
    MERMAID_CLI,
    THEME,
    VFM_CLI,
    VIVLIOSTYLE_CLI,
)


def run(args: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(
        args, capture_output=True, text=True, cwd=cwd, timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"{args[0]} が失敗: {result.stderr.strip()[-200:]}")
    return result.stdout.strip()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def git_state() -> dict:
    commit = run(["git", "rev-parse", "HEAD"], REPO_ROOT)
    branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], REPO_ROOT)
    status = run(["git", "status", "--porcelain"], REPO_ROOT)
    dirty = bool(status.strip())
    state = {"commit": commit, "branch": branch, "clean": not dirty}
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
        state["diff_sha256"] = hashlib.sha256(diff.encode()).hexdigest()
        state["untracked_sha256"] = untracked_hashes
        state["status_lines"] = len(status.splitlines())
    return state


def pdf_inventory() -> list[dict]:
    items: list[dict] = []
    for pdf in sorted(PDF_DIR.glob("*.pdf")):
        pages = ""
        try:
            info = run(["pdfinfo", str(pdf)])
            match = re.search(r"Pages:\s*(\d+)", info)
            pages = int(match.group(1)) if match else None
        except (RuntimeError, FileNotFoundError):
            pages = None
        items.append({
            "name": pdf.name,
            "size": pdf.stat().st_size,
            "sha256": sha256_file(pdf),
            "pages": pages,
        })
    return items


def zip_inventory() -> dict | None:
    candidates = [REPO_ROOT / "dist" / "task-app.zip"]
    candidates += sorted(REPO_ROOT.glob("task-app-curriculum-*.zip"))
    candidates = [c for c in candidates if c.exists()]
    if not candidates:
        return None
    latest = candidates[-1]
    return {
        "name": latest.name,
        "size": latest.stat().st_size,
        "sha256": sha256_file(latest),
    }


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


def drive_inventory() -> list[dict]:
    if not DRIVE_META.exists():
        return []
    data = json.loads(DRIVE_META.read_text(encoding="utf-8"))
    return [
        {"id": e["id"], "name": e["name"], "url": e["url"],
         "uploaded_sha256": e.get("sha256")}
        for e in data
    ]


def correspondence_section() -> dict:
    """R06: 成果物→対応するコード・画面状態のトレースと承認台帳。

    全成果物を同一コミットのハッシュで縛るのではなく、「互換性を確認した
    組合せ」を台帳が承認する形を採る。ここでは実体から辿れる対応を自動で
    引き、台帳の記載と突き合わせられるよう manifest に載せる。
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


def verify_correspondence(section: dict) -> list[str]:
    """対応不明・未承認の組合せがあれば失敗理由を返す（R06 完了条件）。"""
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
    missing = REQUIRED_COMBINATIONS - set(combos)
    for combo_id in sorted(missing):
        problems.append(f"台帳に承認済み組合せ {combo_id} が無い")
    for combo_id, combo in combos.items():
        for field in ("subject", "corresponds_to", "basis",
                      "approved_by", "at"):
            if not combo.get(field):
                problems.append(f"組合せ {combo_id}: {field} が未記入")
    for ex in ledger.get("exceptions", []):
        for field in ("subject", "delta", "disposition", "basis",
                      "approved_by", "at", "evidence"):
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
    live_ids = {item["Name"]: item["ID"] for item in json.loads(listing)}

    results = []
    with tempfile.TemporaryDirectory() as tmp:
        for entry in manifest["drive"]:
            name = entry["name"]
            downloaded = Path(tmp) / name
            record = {"id": entry["id"], "name": name}
            if live_ids.get(name) != entry["id"]:
                record.update({
                    "ok": False,
                    "error": f"Drive上のIDが記録と違う: {live_ids.get(name)}",
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
            local_sha = local.get(name, {}).get("sha256")
            record.update({
                "ok": remote_sha == local_sha,
                "remote_sha256": remote_sha,
                "local_sha256": local_sha,
                "uploaded_sha256": entry.get("uploaded_sha256"),
            })
            results.append(record)
    return results


def build_manifest() -> dict:
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "git": git_state(),
        "tools": tool_versions(),
        "fonts": font_inventory(),
        "artifacts": {
            "pdfs": pdf_inventory(),
            "zip": zip_inventory(),
            "screenshots": screenshots_aggregate(),
        },
        "drive": drive_inventory(),
        "correspondence": correspondence_section(),
        "remote_verification": None,
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
    failures: list[str] = []

    if args.require_clean and not manifest["git"]["clean"]:
        failures.append(
            f"git ツリーが dirty（{manifest['git'].get('status_lines')} 件）"
        )
    pdfs = manifest["artifacts"]["pdfs"]
    if len(pdfs) != EXPECTED_PDFS:
        failures.append(f"PDF が {len(pdfs)} 冊（{EXPECTED_PDFS} 冊ではない）")
    if manifest["artifacts"]["zip"] is None:
        failures.append("配布 ZIP が無い")

    # R06: 対応不明・未承認の組合せがあれば出荷確認を止める
    failures += verify_correspondence(manifest["correspondence"])

    if args.remote_check:
        results = remote_check(manifest)
        manifest["remote_verification"] = {
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "results": results,
        }
        mismatched = [r["name"] for r in results if not r.get("ok")]
        if mismatched:
            failures.append(
                f"Drive とのハッシュ不一致 {len(mismatched)} 件: "
                + ", ".join(mismatched[:5])
            )

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
    print("✅ manifest 生成・検証 OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
