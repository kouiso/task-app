#!/usr/bin/env python3
"""フェンス役割タグと書き込み先パスの共通判定。

`loop-runner/apply_day.py`（写経実行）と `curriculum-qa/check_fence_roles.py`
（品質ゲート）で同じ規則を共有するためのモジュール。同じ判定を2か所に
コピーすると「lint は通るが写経で reject」（または逆）のすれ違いが起きる。

役割タグ記法（#631 で確定）:

    ```lang apply path=src/...   …適用する断片/リスティング
    ```lang expect path=src/...  …その日の最終状態の検算用オラクル（適用しない）

`apply expect` の併記は廃止。同じ本文を適用してから自分自身と突合する
自己比較は何も検算しないため、複合役割は lint エラーかつ実行時に invalid。
"""

from __future__ import annotations

import re

# 教材が書き込み指示を出すルート直下ファイルの限定許可。
SAFE_PREFIXES = ("src/", "prisma/", "public/", "scripts/", "e2e/")
SAFE_ROOT_FILES = frozenset({
    ".env.example", ".env.local.example", "docker-compose.yml",
    "docker-compose.yaml", "next.config.ts", "next.config.js",
    "next.config.mjs", "vitest.config.ts", "vitest.config.mts",
    "tailwind.config.ts", "tailwind.config.js", "postcss.config.mjs",
    "postcss.config.js", "components.json", "middleware.ts",
    "tsconfig.json", "playwright.config.ts",
})
PATH_OK = re.compile(r"^[A-Za-z0-9_./\-]+$")
JP_RE = re.compile(r"[぀-ヿ一-鿿（）]")  # noqa: E501 -- ひらがな/カタカナ/漢字/全角括弧
INFO_PATH = re.compile(r"\bpath=([^\s（)]+)")
ROLE_WORDS = frozenset({"apply", "expect"})


def roles(info: str) -> frozenset:
    """info 文字列から役割トークンを取り出す。

    `path=src/expect.ts` や `meta=apply` のような属性値の中の語を役割と
    誤認しないよう、空白区切りで独立したトークンだけを見る。
    """
    return frozenset(t for t in info.split() if t in ROLE_WORDS)


def has_safe_path_shape(rel_path: str) -> bool:
    """書き込み先として許すパス形か（prefix / root 一覧の形状判定のみ）。

    シェル系の移動指示など「パス形だけ」見たい用途向け。教材の写経対象は
    is_safe_rel_path（形状 + 許容文字 + 日本語名の禁止）を使う。
    """
    if ".." in rel_path or rel_path.startswith("/"):
        return False
    return rel_path.startswith(SAFE_PREFIXES) or rel_path in SAFE_ROOT_FILES


def is_safe_rel_path(rel_path: str) -> bool:
    """写経対象として安全なパスか（パス形 + 許容文字 + 日本語名の禁止）。"""
    return bool(
        PATH_OK.match(rel_path)
        and not JP_RE.search(rel_path)
        and has_safe_path_shape(rel_path))
