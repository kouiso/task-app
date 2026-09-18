#!/usr/bin/env python3
"""商品PDFを Drive へ同名上書きする。リンクを参照される側から先に上げる。

配布中の混在を最小にする順序: 章間リンクを持つ側（目次・ロードマップ）を
最後に上げる。名前順で先に目次が上がると、リンク先の dayNN がまだ旧版の
時間帯が生じて、購入者が新旧混在のセットを見る。上書き自体は数分だが、
この順なら混在ウィンドウは最小になる。

Drive のファイルIDは名前を維持したまま copyto で上書きすると保持される
（rclone が同名ファイルへ新リビジョンとして書く）。新しい名前のファイルは
新しいIDになるので、リネームを伴う場合は先に rclone moveto で名前を替えてから
内容を上書きすること。

終わったらフォルダを舐め直して件数と重複名を報告する。sha の往復照合は
release_manifest.py --remote-check がやるのでここでは形だけ見る。
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from release_manifest import DRIVE_FOLDER_ID

PDF_DIR = Path("dist/pdf")

# 他の冊へのリンクを多く持つ側。これらを最後に上げる。
LINK_HUB_PREFIXES = ("00_", "00-")


def upload_order(pdfs: list[Path]) -> list[Path]:
    hubs = [p for p in pdfs if p.name.startswith(LINK_HUB_PREFIXES)]
    leaves = [p for p in pdfs if not p.name.startswith(LINK_HUB_PREFIXES)]
    return sorted(leaves) + sorted(hubs)


def run(cmd: list[str]) -> str:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)}\n{proc.stderr.strip()[:300]}")
    return proc.stdout


def main(argv: list[str]) -> int:
    pdf_dir = Path(argv[1]) if len(argv) > 1 else PDF_DIR
    pdfs = upload_order(sorted(pdf_dir.glob("*.pdf")))
    if not pdfs:
        print(f"❌ PDF がありません: {pdf_dir}", file=sys.stderr)
        return 2

    failures = []
    for i, pdf in enumerate(pdfs, start=1):
        try:
            run([
                "rclone", "copyto",
                f"--drive-root-folder-id={DRIVE_FOLDER_ID}",
                str(pdf), f"gdrive:{pdf.name}",
            ])
            print(f"[{i}/{len(pdfs)}] {pdf.name}")
        except RuntimeError as error:
            failures.append(pdf.name)
            print(f"❌ {pdf.name}: {error}", file=sys.stderr)

    listing = json.loads(run([
        "rclone", "lsjson",
        f"--drive-root-folder-id={DRIVE_FOLDER_ID}", "gdrive:",
    ]))
    names = [i["Name"] for i in listing if isinstance(i, dict) and i.get("Name")]
    dupes = sorted(n for n in set(names) if names.count(n) > 1)
    print(f"Drive 上: {len(names)} 件 / 重複名: {dupes or 'なし'}")
    for name in {p.name for p in pdfs} - set(names):
        failures.append(name)
        print(f"❌ Drive に見つからない: {name}", file=sys.stderr)

    if failures or dupes:
        print("❌ アップロード検証に失敗しました", file=sys.stderr)
        return 1
    print("✅ 全件アップロード済み（sha 照合は release_manifest.py --remote-check で）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
