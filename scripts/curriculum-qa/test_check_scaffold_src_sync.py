#!/usr/bin/env python3
"""check_scaffold_src_sync.py の退行テスト。"""

import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import check_scaffold_src_sync as sync_guard

sys.path.insert(0, str(Path(__file__).parent))

from check_scaffold_src_sync import (  # noqa: E402
    EXPECTED_DIFFERENT,
    REPO_ROOT,
    USER_ROUTER_DEST,
    USER_ROUTER_NORMALIZATIONS,
    USER_ROUTER_SOURCE,
    UserRouterNormalizationError,
    classify,
    normalize_product_user_router,
    observe,
    observe_excluded_routers,
)

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

# 指定された5差分だけなら、認可条件を含む残りの全バイトが一致する
approved_product = (REPO_ROOT / USER_ROUTER_DEST).read_bytes().decode("utf-8")
approved_scaffold = USER_ROUTER_SOURCE.read_bytes().decode("utf-8")
normalized_user = normalize_product_user_router(approved_product)
check("user router の許可済み5差分を通す", normalized_user == approved_scaffold)

# 正規化対象ではない認可条件が欠ければ、通常の差分として落ちる
scaffold_without_membership = approved_scaffold.replace(
    "                  some: { userId: ctx.session.userId },\n",
    "",
)
check(
    "assignedTasks のメンバー条件削除を落とす",
    normalized_user != scaffold_without_membership,
)

scaffold_without_version = approved_scaffold.replace(
    "          sessionVersion: ctx.session.version,\n",
    "",
    1,
)
check(
    "sessionVersion 条件削除を落とす",
    normalized_user != scaffold_without_version,
)

# 配布版 logger に秘密情報が足されても正規化済み本体とは一致しない
scaffold_with_secret = approved_scaffold.replace(
    "      userId: user.id,\n",
    "      userId: user.id,\n      password: user.password,\n",
)
check("logger の秘密情報追加を落とす", normalized_user != scaffold_with_secret)


def rejects_normalization(name: str, source: str) -> None:
    try:
        normalize_product_user_router(source)
    except UserRouterNormalizationError:
        check(name, True)
    else:
        check(name, False, "許可済み hunk の個数異常を受理した")


for index, (hunk, _, _) in enumerate(USER_ROUTER_NORMALIZATIONS, start=1):
    rejects_normalization(
        f"許可済み hunk {index} の欠落を落とす",
        approved_product.replace(hunk, ""),
    )
    rejects_normalization(
        f"許可済み hunk {index} の重複を落とす",
        hunk + approved_product,
    )

# 改行の変換で差分が消えず、logger import の移動も許可しない
rejects_normalization("CRLF の本体を落とす", approved_product.replace("\n", "\r\n"))
import_line = "import { writeStructuredLog } from '@/lib/observability';\n"
rejects_normalization(
    "logger import の位置変更を落とす",
    approved_product.replace(import_line, "") + import_line,
)


def rejects_observation(name: str) -> None:
    try:
        observe()
    except UserRouterNormalizationError:
        check(name, True)
    else:
        check(name, False, "不正な例外または対応表を受理した")


with patch.dict(EXPECTED_DIFFERENT, {USER_ROUTER_DEST: "誤った例外登録を拒否するテスト"}):
    rejects_observation("user router の例外登録を拒否する")
with patch.object(sync_guard, "scaffold_copies", return_value=((USER_ROUTER_DEST, REPO_ROOT / "wrong.ts"),)):
    rejects_observation("user router の配布元変更を拒否する")
with patch.object(sync_guard, "scaffold_copies", return_value=((USER_ROUTER_DEST, USER_ROUTER_SOURCE),) * 2):
    rejects_observation("user router の対応重複を拒否する")

# 配らない router は user の意図的なログ差分を除外し、ほかの写しの drift を落とす
with tempfile.TemporaryDirectory() as scripts_tmp, tempfile.TemporaryDirectory() as routers_tmp:
    scripts_dir = Path(scripts_tmp)
    routers_dir = Path(routers_tmp)
    for name in ("comment.ts", "project.ts", "report.ts", "search.ts", "task.ts", "user.ts"):
        (scripts_dir / name).write_text("same\n", encoding="utf-8")
        (routers_dir / name).write_text("same\n", encoding="utf-8")
    (scripts_dir / "report.ts").write_text("stale\n", encoding="utf-8")
    (scripts_dir / "user.ts").write_text("intentional scaffold logger\n", encoding="utf-8")
    excluded = observe_excluded_routers(scripts_dir, routers_dir)
check(
    "excluded router の report drift だけを検出",
    [Path(dest).name for dest, _label, same in excluded if not same] == ["report.ts"]
    and all(Path(dest).name != "user.ts" for dest, _label, _same in excluded),
    str(excluded),
)


# 現物を突き合わせられる（配布物の対応表が壊れていないこと）
observations = observe()
check("現物の突き合わせが取れる", len(observations) >= 60, f"{len(observations)} 件")
check(
    "user router は厳密比較を1回だけ使う",
    sum(dest == USER_ROUTER_DEST for dest, _, _ in observations) == 1,
)

# 現物がいま通ること
drifted, stale = classify(observations, EXPECTED_DIFFERENT)
check("いまのリポジトリが通る", not drifted and not stale, f"{drifted} / {stale}")

print(f"{'✅' if failed == 0 else '❌'} check_scaffold_src_sync 自己テスト {passed}/{passed + failed} 合格")
sys.exit(1 if failed else 0)
