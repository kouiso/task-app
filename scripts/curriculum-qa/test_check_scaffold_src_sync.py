#!/usr/bin/env python3
"""check_scaffold_src_sync.py の退行テスト。"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_scaffold_src_sync import EXPECTED_DIFFERENT, classify, observe  # noqa: E402

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

print(f"{'✅' if failed == 0 else '❌'} check_scaffold_src_sync 自己テスト {passed}/{passed + failed} 合格")
sys.exit(1 if failed else 0)
