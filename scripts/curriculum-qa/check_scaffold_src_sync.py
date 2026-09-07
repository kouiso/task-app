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

from sale_package import scaffold_copies  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]

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
    out: list[tuple[str, str, bool]] = []
    for dest_rel, source in scaffold_copies():
        target = REPO_ROOT / dest_rel
        if not target.exists():
            # 置き場が `src/` の外や、リポジトリに対応物が無い配布物は対象外。
            # import の解決は check_scaffold_curriculum_alignment.py が見ている。
            continue
        out.append((dest_rel, str(source.relative_to(REPO_ROOT)), digest(source) == digest(target)))
    return out


def main() -> int:
    observations = observe()
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
