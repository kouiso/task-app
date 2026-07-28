#!/usr/bin/env python3
"""sale_package.py の退行テスト。

見張るのは1点。「scaffold が読者へ配るファイル」の一覧が、実際の配布物より
狭くなっていないこと。狭いと、読者の手元に確かに在るファイルを
check_zip_reference が「ZIP に無い照合先」として弾き、check_tag_balance が
配布済みの中身を無視して断片だけの収支を数える。どちらも誤検知になる。

一覧は build-zip.sh と scaffold-from-scratch.sh の2本から決まる。片方を触った人が
この表を直し忘れても、ここで止まる。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sale_package import (  # noqa: E402
    comparable_src_paths,
    scaffold_src_paths,
    uncovered_scaffold_dirs,
)

# scaffold-from-scratch.sh が名指しでコピーしていて、以前は一覧から漏れていたもの。
# copy_server_base / copy_app_base / copy_prisma_files が置く。
MUST_CONTAIN = [
    "src/app/layout.tsx",
    "src/app/providers.tsx",
    "src/app/api/trpc/[trpc]/route.ts",
    "src/server/api/root.ts",
    "src/server/api/trpc.ts",
    "src/command/seed.ts",
    "prisma/schema.prisma",
    # ディレクトリ丸ごとコピーの側。こちらは元から入っていた。
    "src/server/api/routers/_helpers/select.ts",
]

# 読者が30日かけて自分で書くルーター。配らないので、一覧に入っていてはいけない。
MUST_NOT_CONTAIN = [
    "src/server/api/routers/project.ts",
    "src/server/api/routers/task.ts",
    "src/server/api/routers/user.ts",
]


def main_test() -> int:
    failed = 0
    provided = scaffold_src_paths()

    for path in MUST_CONTAIN:
        if path not in provided:
            failed += 1
            print(f"  ❌ 配布物なのに一覧に無い: {path}")

    for path in MUST_NOT_CONTAIN:
        if path in provided:
            failed += 1
            print(f"  ❌ 配らないのに一覧に在る: {path}")

    # 「手元に在る」と「照合先として使える」は別。配る版とこのリポジトリの版が
    # 違うファイルを照合先として通すと、読者は持っていない版を見に行かされる。
    comparable = comparable_src_paths()
    if not comparable <= provided:
        failed += 1
        print(f"  ❌ 照合先が配布物の外にある: {sorted(comparable - provided)}")
    for path in ("prisma/schema.prisma", "src/server/api/root.ts"):
        if path not in provided:
            failed += 1
            print(f"  ❌ 配布物なのに一覧に無い: {path}")
        if path in comparable:
            failed += 1
            print(f"  ❌ 配る版と完成版が違うのに照合先として通している: {path}")
    if "src/server/api/routers/_helpers/select.ts" not in comparable:
        failed += 1
        print("  ❌ 中身まで一致する配布物を照合先として弾いている: _helpers/select.ts")

    uncovered = uncovered_scaffold_dirs()
    if uncovered:
        failed += 1
        print(f"  ❌ 置かれる先が分からない補助ディレクトリ: {sorted(uncovered)}")
        print("     sale_package.py の EXTRA_COPY_MAP か SCAFFOLD_COPY_MAP に足してください。")

    total = len(MUST_CONTAIN) + len(MUST_NOT_CONTAIN) + 7
    if failed:
        print(f"❌ sale_package 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ sale_package 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main_test())
