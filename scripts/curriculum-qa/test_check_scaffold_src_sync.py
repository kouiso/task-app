#!/usr/bin/env python3
"""check_scaffold_src_sync.py の退行テスト。"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_scaffold_src_sync import (  # noqa: E402
    EXPECTED_DIFFERENT,
    REPO_ROOT,
    classify,
    observe,
    observe_excluded_routers,
)
from sale_package import excluded_routers  # noqa: E402

passed = 0
failed = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global passed, failed
    if ok:
        passed += 1
    else:
        failed += 1
        print(f"❌ {name}{': ' + detail if detail else ''}")


# 中身が違うのに例外へ登録されていなければ、ズレとして落とす
drifted, stale = classify([("src/lib/a.ts", "scripts/_x/a.ts", False)], {})
check("登録の無いズレを落とす", len(drifted) == 1 and not stale, f"{drifted} / {stale}")

# 例外へ登録してあれば、中身が違っても通す
drifted, stale = classify([("src/lib/a.ts", "scripts/_x/a.ts", False)], {"src/lib/a.ts": "理由"})
check("登録済みの差は通す", not drifted and not stale)

# 中身が同じなら、登録が無くても通す
drifted, stale = classify([("src/lib/a.ts", "scripts/_x/a.ts", True)], {})
check("一致は通す", not drifted and not stale)

# 例外へ登録したまま中身が同じになったら、登録が古いとして落とす
drifted, stale = classify([("src/lib/a.ts", "scripts/_x/a.ts", True)], {"src/lib/a.ts": "理由"})
check("古い登録を落とす", not drifted and len(stale) == 1, f"{drifted} / {stale}")

# 複数件をまとめて仕分けられる
drifted, stale = classify(
    [
        ("src/lib/a.ts", "scripts/_x/a.ts", False),
        ("src/lib/b.ts", "scripts/_x/b.ts", True),
        ("src/lib/c.ts", "scripts/_x/c.ts", True),
    ],
    {"src/lib/c.ts": "理由"},
)
check("複数件を仕分ける", len(drifted) == 1 and len(stale) == 1, f"{drifted} / {stale}")

# 例外の値は必ず理由の文言を持つ（空文字を置いて骨抜きにさせない）
check(
    "例外に理由が書いてある",
    all(isinstance(v, str) and len(v.strip()) >= 8 for v in EXPECTED_DIFFERENT.values()),
    str({k: v for k, v in EXPECTED_DIFFERENT.items() if len(str(v).strip()) < 8}),
)

# 現物を突き合わせられる（配布物の対応表が壊れていないこと）
observations = observe()
check("現物の突き合わせが取れる", len(observations) >= 60, f"{len(observations)} 件")

# 現物がいま通ること
drifted, stale = classify(observations, EXPECTED_DIFFERENT)
check("いまのリポジトリが通る", not drifted and not stale, f"{drifted} / {stale}")

# 配らない写しの突き合わせ: scaffold_copies() が外す6本も見張る。
# 一時フォルダで1本だけずらすと、classify() がズレを1件返す。
with tempfile.TemporaryDirectory() as src_tmp, tempfile.TemporaryDirectory() as copy_tmp:
    src_routers = Path(src_tmp)
    copy_routers = Path(copy_tmp)
    for name in sorted(excluded_routers()):
        (src_routers / name).write_text("same\n", encoding="utf-8")
        (copy_routers / name).write_text("same\n", encoding="utf-8")
    (copy_routers / sorted(excluded_routers())[0]).write_text(
        "drifted\n", encoding="utf-8"
    )
    excluded_obs = observe_excluded_routers(copy_routers, src_routers)
check("配らない写しは6件", len(excluded_obs) == len(excluded_routers()), f"{len(excluded_obs)} 件")
drifted, stale = classify(excluded_obs, {})
check("配らない写しのズレを落とす", len(drifted) == 1 and not stale, f"{drifted} / {stale}")

# 本物のリポジトリでは、組の1つ目は excluded_routers() の6名で、6件とも中身が同じ
excluded_obs = observe_excluded_routers(
    REPO_ROOT / "scripts" / "_server-routers",
    REPO_ROOT / "src" / "server" / "api" / "routers",
)
check(
    "除外6本の名前がそろう",
    sorted(Path(dest).name for dest, _label, _same in excluded_obs)
    == sorted(excluded_routers()),
    str([dest for dest, _label, _same in excluded_obs]),
)
check(
    "除外6本はすべて本体と一致",
    all(same for _dest, _label, same in excluded_obs),
    str([(dest, same) for dest, _label, same in excluded_obs]),
)

print(f"{'✅' if failed == 0 else '❌'} check_scaffold_src_sync 自己テスト {passed}/{passed + failed} 合格")
sys.exit(1 if failed else 0)
