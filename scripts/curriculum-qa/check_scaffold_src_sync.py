#!/usr/bin/env python3
"""
配布物とリポジトリ本体のズレを見張る。

読者が受け取るのは `scripts/_*` の配布物であって `src/` ではない。だから
`src/` だけを直すと、リポジトリのアプリと読者が組み上げるアプリの中身が食い違う。
写真はリポジトリの `src/` からではなく配布物から組んだツリーで撮るので、
食い違ったまま出荷すると「写真と自分の画面が違う」が最悪の形で起きる。

実例（2026-08-30）: バッジの色をトークン由来へ直したとき `src/` の3ファイルしか
直さず、`scripts/_constants/` と `scripts/_lib-base/` が古い hex のまま残った。
既存の `check_scaffold_curriculum_alignment.py` は import が解決するかしか見ないので
素通りした。

配布物 65 件のうち 61 件は `src/` と一字一句同じで、違うのは読者が教材の中で
書き換える 4 件だけだった。つまり「同じ」が既定で、「違う」ほうが例外である。
例外は下の EXPECTED_DIFFERENT に理由つきで並べる。
"""

import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sale_package import excluded_routers, scaffold_copies  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
USER_ROUTER_DEST = "src/server/api/routers/user.ts"
USER_ROUTER_SOURCE = REPO_ROOT / "scripts" / "_server-routers" / "user.ts"

# 読者が教材の中で書き換えるので、配布物は途中の版で止まっている。
# 値は「なぜ違ってよいか」。理由を書けない差分は、ただのズレとして落とす。
EXPECTED_DIFFERENT: dict[str, str] = {
    "src/component/task/task-card.tsx": "Day 13 で読者が編集ボタンと削除ボタンを足す",
    "src/component/task/task-dialog.tsx": "Day 14 で読者が入力欄を1つずつ書き足す",
    "src/component/task/task-detail-dialog.tsx": "Day 16 と Day 18 で読者が中身を足す",
    "src/component/project/project-detail-view.tsx": "Day 12 で読者がメンバー管理を足す",
    "src/server/api/root.ts": "読者が Day ごとに router を1つずつ登録していく。配布物は空の状態",
    "src/server/api/trpc.ts": "本体だけ Sentry と構造化ログの middleware を持つ。教材では教えない",
    # 中身のズレは `isTimerActive` と `timerStartedAt` の2列だけ（配布物にしかない）。
    # `src/` にも教材にも参照が0件の死んだ列で、読者の DB にだけできる。
    # 消すと30日ぶんの再構成ビルドをやり直すことになるので、リリース後へ回した。
    # doc/post-release-backlog.md に記録してある。
    "prisma/schema.prisma": "配布物にだけ残る未使用の2列。リリース後に消す（backlog 記載）",
}


class UserRouterNormalizationError(ValueError):
    """許可した user router の差分を一意に特定できない。"""


def _replace_user_hunk_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise UserRouterNormalizationError(
            f"user router の {label} は1件必要だが {count} 件だった",
        )
    return source.replace(old, new)


USER_ROUTER_NORMALIZATIONS = (
    (
        "import { writeStructuredLog } from '@/lib/observability';\n"
        "import { createPasswordSchema } from '@/lib/password';\n",
        "import { createPasswordSchema } from '@/lib/password';\n",
        "observability import",
    ),
    (
        """async function tryReissueSession(
  requestId: string,
  path: string,
  user: SessionUser,
): Promise<boolean> {""",
        """async function tryReissueSession(path: string, user: SessionUser): Promise<boolean> {""",
        "helper signature",
    ),
    (
        """    writeStructuredLog({
      level: 'error',
      event: 'auth.session_reissue_failed',
      requestId,
      path,
      status: 200,
      userId: user.id,
    });""",
        """    console.error('[auth] session reissue failed', {
      event: 'auth.session_reissue_failed',
      path,
      userId: user.id,
    });""",
        "safe logger",
    ),
    (
        "await tryReissueSession(ctx.requestId, 'user.updateProfile', {",
        "await tryReissueSession('user.updateProfile', {",
        "profile call",
    ),
    (
        "await tryReissueSession(ctx.requestId, 'user.changePassword', {",
        "await tryReissueSession('user.changePassword', {",
        "password call",
    ),
)


def normalize_product_user_router(source: str) -> str:
    """本体固有の構造化ログ5差分だけを配布版の表現へそろえる。"""
    for old, _, label in USER_ROUTER_NORMALIZATIONS:
        _replace_user_hunk_once(source, old, old, label)
    for old, new, label in USER_ROUTER_NORMALIZATIONS:
        source = _replace_user_hunk_once(source, old, new, label)
    return source


def digest(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def classify(
    observations: list[tuple[str, str, bool]],
    expected_different: dict[str, str],
) -> tuple[list[str], list[str]]:
    """突き合わせの結果を「ズレ」と「例外の登録が古い」に仕分ける。

    observations は (読者の手元での置き場, 配られる現物の表示名, 中身が同じか) の組。
    ファイルを読む所と切り離してあるのは、退行テストが現物を用意せずに
    判定だけを確かめられるようにするため。
    """
    drifted: list[str] = []
    stale: list[str] = []
    for dest_rel, source_label, same in observations:
        is_exception = dest_rel in expected_different
        if not same and not is_exception:
            drifted.append(f"{source_label} と {dest_rel} の中身が違う")
        if same and is_exception:
            stale.append(f"{dest_rel} は EXPECTED_DIFFERENT に載っているが中身は同じ")
    return drifted, stale


def observe() -> list[tuple[str, str, bool]]:
    if USER_ROUTER_DEST in EXPECTED_DIFFERENT:
        raise UserRouterNormalizationError("user router は例外登録できない")
    out: list[tuple[str, str, bool]] = []
    user_mapping_count = 0
    for dest_rel, source in scaffold_copies():
        if dest_rel == USER_ROUTER_DEST:
            user_mapping_count += 1
            if source != USER_ROUTER_SOURCE or user_mapping_count > 1:
                raise UserRouterNormalizationError("user router の配布元対応が変わっている")
            # build-zip 側の除外が将来変わっても、user router は下の厳密比較を1回だけ使う。
            continue
        target = REPO_ROOT / dest_rel
        if not target.exists():
            # 置き場が `src/` の外や、リポジトリに対応物が無い配布物は対象外。
            # import の解決は check_scaffold_curriculum_alignment.py が見ている。
            continue
        out.append((dest_rel, str(source.relative_to(REPO_ROOT)), digest(source) == digest(target)))

    # user router は本体だけ requestId 付き構造化ログを使うため、許可した5差分を
    # 取り除いてから残りを丸ごと比較する。例外登録では未知の差分まで通ってしまう。
    target = REPO_ROOT / USER_ROUTER_DEST
    if not target.exists() or not USER_ROUTER_SOURCE.exists():
        raise UserRouterNormalizationError("本体または配布版の user router が存在しない")
    normalized = normalize_product_user_router(target.read_bytes().decode("utf-8"))
    scaffold = USER_ROUTER_SOURCE.read_bytes().decode("utf-8")
    out.append(
        (
            USER_ROUTER_DEST,
            str(USER_ROUTER_SOURCE.relative_to(REPO_ROOT)),
            normalized == scaffold,
        ),
    )
    return out


def observe_excluded_routers(
    scripts_dir: Path, routers_dir: Path
) -> list[tuple[str, str, bool]]:
    """配らない router の写しも見張る。user は本体固有ログを正規化して observe が扱う。"""
    out: list[tuple[str, str, bool]] = []
    for name in sorted(excluded_routers() - {Path(USER_ROUTER_DEST).name}):
        copy = scripts_dir / name
        source = routers_dir / name
        same = source.is_file() and copy.is_file() and digest(source) == digest(copy)
        out.append(
            (f"scripts/_server-routers/{name}", f"src/server/api/routers/{name}", same)
        )
    return out


def main() -> int:
    try:
        observations = observe() + observe_excluded_routers(
            REPO_ROOT / "scripts" / "_server-routers",
            REPO_ROOT / "src" / "server" / "api" / "routers",
        )
    except UserRouterNormalizationError as err:
        print("❌ user router の許可済み差分を特定できない")
        print(f"   {err}")
        return 1
    checked = len(observations)
    drifted, stale = classify(observations, EXPECTED_DIFFERENT)

    print(f"配布物と本体の突き合わせ: {checked} 件")

    if drifted:
        print(f"❌ 配布物が本体とズレている（{len(drifted)} 件）")
        for line in drifted:
            print(f"   {line}")
        print("   読者が受け取るのは配布物のほう。`src/` を直したら同じ変更を配布物へも入れること")
    if stale:
        print(f"❌ 例外の登録が古い（{len(stale)} 件）")
        for line in stale:
            print(f"   {line}")
        print("   中身が同じになったなら EXPECTED_DIFFERENT から外すこと")

    if drifted or stale:
        return 1

    print(f"✅ 配布物と本体が一致（例外 {len(EXPECTED_DIFFERENT)} 件は理由つきで登録済み）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
