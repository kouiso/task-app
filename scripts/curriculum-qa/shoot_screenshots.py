#!/usr/bin/env python3
"""教材のスクリーンショットを、その日の読者の手元で撮り直す。

## なぜこれが要るか

`material/30days-curriculum/screenshots/` の64枚は、ほとんどが完成版アプリで撮られている。
読者がその日に見る画面と違うものが載っていると、正しく作れた読者ほど「自分は間違えた」と
誤診する。`doc/review-handoff/scan-day01-08.md` の (g) に、Day 01–08 だけで16ファイルの
撮り直しが要ると実測がある。手で撮り直すと同じことが繰り返されるので、機械に撮らせる。

## 何を揃えれば「その日の画面」になるか

3つ揃わないと、その日の画面にならない。

1. **その日のコード** — `build_day_snapshots.py` が組む `dist/day-snapshots/dayNN/`。
   Day N を終えた読者のソースツリーそのもの。
2. **その日のデータ** — `scan-day*.md` の (f) にある実測（Day 08 終了時点で
   ユーザー5 / プロジェクト2 / タスク5 / コメント2）。`DAY_SEEDS` がこの表を持つ。
   `scripts/_seed/seed.ts` をそのまま使わないのは、あれが日で変わらない1つの状態しか
   作れないため。読者は Day 06 で自分のアカウントを1件足す。
3. **撮り方** — テーマ・ビューポート・言語・タイムゾーンを全冊で固定する。バラつきも
   読者にとっては「自分の画面と違う」であり、中身の間違いと区別が付かない。

## 赤枠

操作を指す赤枠は `locator.boundingBox()` から起こす（描画は `shoot_page.mjs`）。
手で座標を書くと、フォントやウィンドウ幅が少し変われば枠がずれ、しかも次に撮り直すまで
誰も気づけない。宣言表（`screenshot_shots.json`）は座標を書く欄を持たず、
`validate_marks` が座標らしいキーを弾く。

## 撮れる日の範囲

`DAY_SEEDS` が持つのは (f) を読んだ日ぶんだけ。持っていない日を指定したら止まる。
足りないデータで撮った画像は、完成版で撮った画像と同じ種類の嘘になる。
"""

from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, NamedTuple

sys.path.insert(0, str(Path(__file__).parent))

from build_day_snapshots import build_tree, day_sources, link_node_modules  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_ROOT = REPO_ROOT / "dist" / "day-snapshots"
SHOTS_CONFIG = Path(__file__).with_name("screenshot_shots.json")
WORKER = Path(__file__).with_name("shoot_page.mjs")
SEED_RUNNER = Path(__file__).with_name("day_seed_runner.ts")
OUT_DIR = REPO_ROOT / "material" / "30days-curriculum" / "screenshots"
PLAN_DOC = REPO_ROOT / "doc" / "review-handoff" / "screenshots-plan.md"

USAGE = "使い方: shoot_screenshots.py (--day N | --all | --list) [--out DIR]"

# 赤枠の座標の出どころ。ここ以外から座標を作ってはいけない。
MARK_RECT_SOURCE = "boundingBox"

# 宣言表に書いてはいけないキー。手で座標を置いた宣言を弾くための一覧。
FORBIDDEN_MARK_KEYS = ("x", "y", "width", "height", "rect", "left", "top", "box")

ACTION_KINDS = ("click", "fill", "wait_for")

# 起動に使うポート。読者の 3000 とぶつけない。
BASE_PORT = 3401

# `next start` が応えるまでの待ち上限（秒）。
SERVER_TIMEOUT = 90

# ブラウザの開始時刻。Day 02 の挨拶が時間帯で変わるため、固定しないと撮るたびに
# 「おはよう」「こんばんは」が入れ替わり、本文の説明と食い違う回が出る。
FIXED_CLOCK = "2026-04-01T09:00:00+09:00"


class Mark(NamedTuple):
    """赤枠1つ。座標は持たない。撮影時に boundingBox() から起こす。"""

    selector: str
    label: str


class Action(NamedTuple):
    """撮る前の操作1つ。"""

    kind: str
    selector: str
    value: str


class Clip(NamedTuple):
    """切り抜く範囲。座標は持たない。撮影時に boundingBox() から起こす。"""

    selector: str
    padding: int


class Shot(NamedTuple):
    """撮る画面1枚。"""

    name: str
    day: int
    path: str
    login: dict[str, str] | None
    actions: tuple[Action, ...]
    wait_for: str | None
    marks: tuple[Mark, ...]
    full_page: bool
    clip: Clip | None


class Config(NamedTuple):
    """宣言表そのもの。"""

    viewport: dict[str, int]
    shots: tuple[Shot, ...]


# --------------------------------------------------------------------------
# その日のデータ
# --------------------------------------------------------------------------

# `scripts/_seed/seed.ts` が作る4件。scaffold-from-scratch.sh:669 の `npm run db:seed` で
# Day 01 の時点から読者の DB に入っている。
SEED_USERS: tuple[dict[str, str], ...] = (
    {"email": "admin@example.com", "name": "管理者", "role": "ADMIN", "password": "password123"},
    {"email": "user1@example.com", "name": "田中太郎", "role": "USER", "password": "password123"},
    {"email": "user2@example.com", "name": "山田花子", "role": "USER", "password": "password123"},
    {"email": "empty@example.com", "name": "新人 太郎", "role": "USER", "password": "password123"},
)

# Day 06 Step 10 で読者が自分で登録する1件。どのプロジェクトにも属さない
# （`day06_...md:722-724` がそう断っている）。
READER_USER: dict[str, str] = {
    "email": "reader@example.com",
    "name": "読者 太郎",
    "role": "USER",
    "password": "password123",
}

SEED_PROJECTS: tuple[dict[str, Any], ...] = (
    {
        "key": "website",
        "name": "Webサイトリニューアル",
        "description": "企業サイトの全面リニューアルプロジェクト",
        "color": "#1976d2",
        "members": [
            {"email": "admin@example.com", "role": "OWNER"},
            {"email": "user1@example.com", "role": "MEMBER"},
            {"email": "user2@example.com", "role": "MEMBER"},
        ],
    },
    {
        "key": "mobile",
        "name": "モバイルアプリ開発",
        "description": "iOS/Android向けアプリ開発",
        "color": "#4caf50",
        "members": [
            {"email": "user1@example.com", "role": "OWNER"},
            {"email": "user2@example.com", "role": "ADMIN"},
        ],
    },
)

SEED_TASKS: tuple[dict[str, Any], ...] = (
    {
        "key": "mock",
        "title": "デザインモックアップ作成",
        "description": "新デザインのモックアップをFigmaで作成する",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "position": 1,
        "projectKey": "website",
        "createdByEmail": "admin@example.com",
        "assigneeEmail": "admin@example.com",
    },
    {
        "key": "db",
        "title": "データベース設計",
        "description": "ER図の作成とテーブル定義",
        "status": "DONE",
        "priority": "HIGH",
        "position": 2,
        "projectKey": "website",
        "createdByEmail": "admin@example.com",
        "assigneeEmail": "user1@example.com",
    },
    {
        "key": "api",
        "title": "API仕様書作成",
        "description": "RESTful APIの仕様書を作成",
        "status": "TODO",
        "priority": "MEDIUM",
        "position": 3,
        "projectKey": "website",
        "createdByEmail": "admin@example.com",
        "assigneeEmail": "user1@example.com",
    },
    {
        "key": "proto",
        "title": "プロトタイプ開発",
        "description": "基本機能のプロトタイプを実装",
        "status": "TODO",
        "priority": "HIGH",
        "position": 1,
        "projectKey": "mobile",
        "createdByEmail": "user1@example.com",
        "assigneeEmail": "user2@example.com",
    },
    {
        "key": "usertest",
        "title": "ユーザーテスト実施",
        "description": "ターゲットユーザーでのテスト",
        "status": "TODO",
        "priority": "MEDIUM",
        "position": 2,
        "projectKey": "mobile",
        "createdByEmail": "user1@example.com",
        "assigneeEmail": "admin@example.com",
    },
)

SEED_COMMENTS: tuple[dict[str, str], ...] = (
    {"content": "デザインの方向性について確認したいことがあります。", "taskKey": "mock", "userEmail": "admin@example.com"},
    {"content": "データベース設計完了しました。レビューをお願いします。", "taskKey": "db", "userEmail": "user1@example.com"},
)


class DaySeed(NamedTuple):
    """その日の読者の DB。"""

    users: tuple[dict[str, str], ...]
    projects: tuple[dict[str, Any], ...]
    tasks: tuple[dict[str, Any], ...]
    comments: tuple[dict[str, str], ...]


# 変わった日だけ書く。書いていない日は直前の記述を引き継ぐ（読者の手元も同じで、
# 何もしなければ前日のまま）。根拠は各 scan の (f)。
#
#   day01: scan-day01-08.md (f) Day 01 — scaffold の db:seed 直後。読者が作ったものは0件。
#   day06: scan-day01-08.md (f) Day 06 — 読者が Step 10 で自分のアカウントを1件登録する。
DAY_SEEDS: dict[int, DaySeed] = {
    1: DaySeed(SEED_USERS, SEED_PROJECTS, SEED_TASKS, SEED_COMMENTS),
    6: DaySeed(SEED_USERS + (READER_USER,), SEED_PROJECTS, SEED_TASKS, SEED_COMMENTS),
}

# (f) を読んで裏を取れている最後の日。ここから先は `scan-day09-16.md` 以降の (f) を
# 読んで DAY_SEEDS へ足すまで撮らない。
MAX_SEEDED_DAY = 8


def seed_for_day(day: int) -> DaySeed:
    """その日の読者の DB を返す。

    裏を取れていない日は撮らせない。足りないデータで撮った画像は、完成版で撮った
    画像と同じで「読者の画面ではないもの」を教材へ載せることになる。
    """
    if day < 1 or day > MAX_SEEDED_DAY:
        raise ValueError(f"day{day} のデータは未整備（scan の (f) を読んで DAY_SEEDS へ足すこと。現在 day1〜day{MAX_SEEDED_DAY}）")
    return DAY_SEEDS[max(d for d in DAY_SEEDS if d <= day)]


# --------------------------------------------------------------------------
# 宣言表の読み込み
# --------------------------------------------------------------------------


def validate_marks(raw: Any, where: str) -> tuple[Mark, ...]:
    """赤枠の宣言を確かめる。

    座標らしいキーがあれば弾く。手で置いた座標は、次に UI が動いた回に必ずずれ、
    ずれたことに誰も気づけない。枠はセレクタで指してもらう。
    """
    if raw is None:
        return ()
    if not isinstance(raw, list):
        raise ValueError(f"{where}: marks は配列で書いてください")
    marks = []
    for i, m in enumerate(raw):
        if not isinstance(m, dict):
            raise ValueError(f"{where}: marks[{i}] が表になっていません")
        bad = sorted(k for k in m if k in FORBIDDEN_MARK_KEYS)
        if bad:
            raise ValueError(f"{where}: marks[{i}] に座標 {bad} が書かれています。赤枠は selector で指してください（座標は {MARK_RECT_SOURCE}() から取ります）")
        selector = m.get("selector")
        if not isinstance(selector, str) or not selector.strip():
            raise ValueError(f"{where}: marks[{i}] に selector がありません")
        marks.append(Mark(selector, str(m.get("label", ""))))
    return tuple(marks)


def validate_actions(raw: Any, where: str) -> tuple[Action, ...]:
    """撮る前の操作の宣言を確かめる。"""
    if raw is None:
        return ()
    if not isinstance(raw, list):
        raise ValueError(f"{where}: actions は配列で書いてください")
    actions = []
    for i, a in enumerate(raw):
        if not isinstance(a, dict):
            raise ValueError(f"{where}: actions[{i}] が表になっていません")
        kind = a.get("kind")
        if kind not in ACTION_KINDS:
            raise ValueError(f"{where}: actions[{i}] の kind が {ACTION_KINDS} にありません: {kind!r}")
        selector = a.get("selector")
        if not isinstance(selector, str) or not selector.strip():
            raise ValueError(f"{where}: actions[{i}] に selector がありません")
        if kind == "fill" and not isinstance(a.get("value"), str):
            raise ValueError(f"{where}: actions[{i}] は fill なのに value がありません")
        actions.append(Action(kind, selector, str(a.get("value", ""))))
    return tuple(actions)


def validate_clip(raw: Any, where: str) -> Clip | None:
    """切り抜きの宣言を確かめる。

    赤枠と同じで、座標は書けない。要素を指すセレクタと、その外側へ足す余白だけ。
    """
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise ValueError(f"{where}: clip が表になっていません")
    bad = sorted(k for k in raw if k in FORBIDDEN_MARK_KEYS)
    if bad:
        raise ValueError(f"{where}: clip に座標 {bad} が書かれています。切り抜きも selector で指してください（座標は {MARK_RECT_SOURCE}() から取ります）")
    selector = raw.get("selector")
    if not isinstance(selector, str) or not selector.strip():
        raise ValueError(f"{where}: clip に selector がありません")
    padding = raw.get("padding", 0)
    if not isinstance(padding, int) or isinstance(padding, bool) or padding < 0:
        raise ValueError(f"{where}: clip の padding は 0 以上の整数にしてください: {padding!r}")
    return Clip(selector, padding)


def validate_shot(raw: Any, index: int) -> Shot:
    """1枚ぶんの宣言を確かめる。"""
    where = f"shots[{index}]"
    if not isinstance(raw, dict):
        raise ValueError(f"{where} が表になっていません")
    name = raw.get("name")
    if not isinstance(name, str) or not name.endswith(".png"):
        raise ValueError(f"{where}: name は .png で終わるファイル名にしてください: {name!r}")
    if name.startswith("/") or ".." in Path(name).parts:
        raise ValueError(f"{where}: name は screenshots/ の中の相対パスにしてください: {name!r}")
    day = raw.get("day")
    if not isinstance(day, int) or isinstance(day, bool):
        raise ValueError(f"{where}: day は整数で書いてください: {day!r}")
    path = raw.get("path")
    if not isinstance(path, str) or not path.startswith("/"):
        raise ValueError(f"{where}: path は / で始まるアプリ内のパスにしてください: {path!r}")
    login = raw.get("login")
    if login is not None:
        if not isinstance(login, dict) or not {"email", "password"} <= set(login):
            raise ValueError(f"{where}: login には email と password が要ります")
        login = {"email": str(login["email"]), "password": str(login["password"])}
    wait_for = raw.get("wait_for")
    if wait_for is not None and (not isinstance(wait_for, str) or not wait_for.strip()):
        raise ValueError(f"{where}: wait_for は空でないセレクタにしてください")
    full_page = raw.get("full_page", False)
    if not isinstance(full_page, bool):
        raise ValueError(f"{where}: full_page は true か false にしてください: {full_page!r}")
    clip = validate_clip(raw.get("clip"), where)
    # 「ページ全体」と「この要素だけ」は同時に成り立たない。両方書いてあると、
    # 書いた人が思っている画角と出てくる画像が食い違う。
    if full_page and clip is not None:
        raise ValueError(f"{where}: full_page と clip は同時に指定できません")
    return Shot(
        name=name,
        day=day,
        path=path,
        login=login,
        actions=validate_actions(raw.get("actions"), where),
        wait_for=wait_for,
        marks=validate_marks(raw.get("marks"), where),
        full_page=full_page,
        clip=clip,
    )


def load_config(path: Path = SHOTS_CONFIG) -> Config:
    """宣言表を読む。壊れていたら黙って0枚にせず止める。"""
    data = json.loads(path.read_text(encoding="utf-8"))
    viewport = data.get("viewport")
    if not isinstance(viewport, dict) or not {"width", "height"} <= set(viewport):
        raise ValueError("viewport に width と height が要ります")
    raw_shots = data.get("shots")
    if not isinstance(raw_shots, list) or not raw_shots:
        raise ValueError("shots が空です")
    shots = tuple(validate_shot(s, i) for i, s in enumerate(raw_shots))
    duplicated = sorted({s.name for s in shots if [x.name for x in shots].count(s.name) > 1})
    if duplicated:
        raise ValueError(f"同じ出力名が2度書かれています: {duplicated}")
    return Config({"width": int(viewport["width"]), "height": int(viewport["height"])}, shots)


def shots_for_day(config: Config, day: int) -> tuple[Shot, ...]:
    """その日に撮る枚数を、宣言表の順のまま返す。"""
    return tuple(s for s in config.shots if s.day == day)


def config_days(config: Config) -> list[int]:
    """宣言表に出てくる day を昇順で返す。"""
    return sorted({s.day for s in config.shots})


def select_days(day: int | None, want_all: bool, days: list[int]) -> list[int]:
    """CLI の指定から、撮る day の並びを返す。

    範囲外の指定は ValueError。黙って空を返すと、存在しない日を指定した回が
    「対象0件で全部成功」に見える。
    """
    if want_all == (day is not None):
        raise ValueError("--day か --all のどちらか一方を指定してください")
    if want_all:
        return days
    if day not in days:
        raise ValueError(f"day{day} の撮影対象は宣言表にありません（{days}）")
    return [day]


# --------------------------------------------------------------------------
# 撮影
# --------------------------------------------------------------------------


def snapshot_dir(day: int) -> Path:
    """その日のソースツリーの置き場。無ければ何を先に流すかを言って止まる。"""
    dest = SNAPSHOT_ROOT / f"day{day:02d}"
    if not dest.is_dir():
        raise FileNotFoundError(f"{dest} がありません。先に build_day_snapshots.py --day {day} を流してください")
    return dest


# .env にあってもプロセスの環境変数へ移してはいけないもの。
# `.env` の `NODE_ENV="development"` をそのまま渡すと `next build` が本番書き出しの
# 途中で `<Html> should not be imported outside of pages/_document.` を出して落ちる。
# Next.js は build と start で自分の NODE_ENV を決めるので、こちらから与えない。
NOT_FOR_PROCESS_ENV = ("NODE_ENV",)


def ensure_tree_fresh(day: int) -> Path:
    """教材より古いツリーは組み直してから返す。

    教材の文面を直しても、`dist/day-snapshots/dayNN/` は自動では追いつかない。古いツリーの
    まま撮ると、直したはずの文面が画像に残る。実際 day02 の挨拶文を直した回に、day04 の
    ツリーだけ古いままで、旧文面のダッシュボードが撮れた。撮る側が気づける事実なので、
    人の記憶に頼らずここで見る。
    """
    dest = snapshot_dir(day)
    newest = max(p.stat().st_mtime for p in day_sources(day))
    if newest <= dest.stat().st_mtime:
        return dest
    print(f"  教材のほうが新しいのでツリーを組み直します: {dest.name}")
    build_tree(day)
    return dest


def read_env(dest: Path) -> dict[str, str]:
    """スナップショットの .env を読んで、起動用の環境変数を作る。"""
    env = dict(os.environ)
    for line in (dest / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        if key.strip() in NOT_FOR_PROCESS_ENV:
            continue
        env[key.strip()] = value.strip().strip('"').strip("'")
    env.pop("NODE_ENV", None)
    return env


def free_port(start: int) -> int:
    """空いているポートを1つ返す。"""
    for port in range(start, start + 50):
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise OSError(f"{start} から 50 個のポートが全部埋まっています")


def ensure_schema(dest: Path, env: dict[str, str]) -> None:
    """DB にテーブルを用意する。

    読者も `scaffold-from-scratch.sh` の中で同じ `prisma db push` を通ってから
    seed を流している。空の DB へいきなり seed を入れると、テーブルが無いという
    分かりにくい失敗になる。
    """
    proc = subprocess.run(
        ["npx", "prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
        cwd=dest,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"prisma db push に失敗しました:\n{proc.stdout[-2000:]}\n{proc.stderr[-2000:]}")


def apply_seed(dest: Path, day: int, env: dict[str, str]) -> dict[str, int]:
    """その日のデータを DB へ入れて、入った件数を返す。"""
    seed = seed_for_day(day)
    payload = json.dumps(
        {
            "day": day,
            "users": list(seed.users),
            "projects": list(seed.projects),
            "tasks": list(seed.tasks),
            "comments": list(seed.comments),
        },
        ensure_ascii=False,
    )
    proc = subprocess.run(
        ["npx", "tsx", str(SEED_RUNNER)],
        cwd=dest,
        env=env,
        input=payload,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"day{day:02d} のシードに失敗しました:\n{proc.stdout}\n{proc.stderr}")
    return json.loads(proc.stdout)


def ensure_build(dest: Path, env: dict[str, str]) -> None:
    """本番ビルドが無ければ作る。`next dev` で撮らないのは開発用の目印が写り込むため。"""
    # 途中で落ちたビルドも BUILD_ID だけは残す。それを「ビルド済み」と見ると
    # `next start` が prerender-manifest.json を開けずに即死し、原因が1つ前の回にあるので追いにくい。
    built = dest / ".next"
    if all((built / name).is_file() for name in ("BUILD_ID", "prerender-manifest.json")):
        return
    if built.exists():
        shutil.rmtree(built)
    # 読者の `npm install` に当たる。これが無いと next が依存を辿れず、
    # `/404` の書き出しで落ちる（教材の欠陥ではなく組み立ての抜け）。
    link_node_modules(dest)
    proc = subprocess.run(["npm", "run", "build"], cwd=dest, env=env, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"{dest.name} のビルドに失敗しました:\n{proc.stdout[-2000:]}\n{proc.stderr[-2000:]}")


def wait_ready(url: str, proc: subprocess.Popen[str]) -> None:
    """サーバーが応えるまで待つ。落ちていたらログを付けて止める。"""
    deadline = time.time() + SERVER_TIMEOUT
    while time.time() < deadline:
        if proc.poll() is not None:
            # 終了コードだけ出しても原因へ辿れない。落ちた理由はサーバーの出力にある。
            log = proc.stdout.read() if proc.stdout is not None else ""
            raise RuntimeError(f"サーバーが起動前に終了しました（終了コード {proc.returncode}）\n{log[-2000:]}")
        try:
            with urllib.request.urlopen(url, timeout=3) as res:
                if res.status < 500:
                    return
        except (urllib.error.URLError, OSError):
            time.sleep(0.5)
    raise TimeoutError(f"{SERVER_TIMEOUT} 秒待っても {url} が応えません")


def run_worker(job: dict[str, Any]) -> list[dict[str, Any]]:
    """ワーカーへ仕事を渡して、撮れた一覧を受け取る。"""
    proc = subprocess.run(
        ["node", str(WORKER)],
        cwd=REPO_ROOT,
        input=json.dumps(job, ensure_ascii=False),
        capture_output=True,
        text=True,
        check=False,
    )
    if not proc.stdout.strip():
        raise RuntimeError(f"ワーカーが何も返しませんでした:\n{proc.stderr[-2000:]}")
    result = json.loads(proc.stdout)
    if not result.get("ok"):
        raise RuntimeError(f"撮影に失敗しました: {result.get('error')}\n{proc.stderr[-2000:]}")
    return result["shots"]


def shoot_day(config: Config, day: int, out_dir: Path) -> list[dict[str, Any]]:
    """1日ぶんを撮る。"""
    shots = shots_for_day(config, day)
    if not shots:
        return []
    dest = ensure_tree_fresh(day)
    env = read_env(dest)
    ensure_build(dest, env)
    ensure_schema(dest, env)
    counts = apply_seed(dest, day, env)
    print(f"  シード: ユーザー{counts['users']} / プロジェクト{counts['projects']} / タスク{counts['tasks']} / コメント{counts['comments']}")

    port = free_port(BASE_PORT)
    env["PORT"] = str(port)
    proc = subprocess.Popen(
        ["npx", "next", "start", "-p", str(port)],
        cwd=dest,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        wait_ready(f"http://127.0.0.1:{port}/", proc)
        job = {
            "baseUrl": f"http://127.0.0.1:{port}",
            "outDir": str(out_dir),
            "viewport": config.viewport,
            "clock": FIXED_CLOCK,
            "shots": [
                {
                    "name": s.name,
                    "path": s.path,
                    "login": s.login,
                    "actions": [{"kind": a.kind, "selector": a.selector, "value": a.value} for a in s.actions],
                    "wait_for": s.wait_for,
                    "full_page": s.full_page,
                    "clip": None if s.clip is None else {"selector": s.clip.selector, "padding": s.clip.padding},
                    "marks": [{"selector": m.selector, "label": m.label} for m in s.marks],
                }
                for s in shots
            ],
        }
        return run_worker(job)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()


def main(argv: list[str]) -> int:
    args = argv[1:]
    if "--list" in args:
        config = load_config()
        for s in config.shots:
            marks = f" 赤枠{len(s.marks)}" if s.marks else ""
            print(f"day{s.day:02d} {s.name:<32} {s.path}{marks}")
        print(f"合計 {len(config.shots)} 枚 / 対象 {config_days(config)}")
        return 0

    out_dir = OUT_DIR
    rest = list(args)
    if "--out" in rest:
        i = rest.index("--out")
        if len(rest) <= i + 1:
            print(f"❌ --out にはディレクトリが要ります\n{USAGE}", file=sys.stderr)
            return 2
        out_dir = Path(rest[i + 1]).resolve()
        del rest[i : i + 2]

    day: int | None = None
    want_all = "--all" in rest
    rest = [a for a in rest if a != "--all"]
    if rest[:1] == ["--day"]:
        if len(rest) != 2 or not rest[1].isdigit():
            print(f"❌ --day には数字が要ります\n{USAGE}", file=sys.stderr)
            return 2
        day, rest = int(rest[1]), []
    if rest:
        print(f"❌ 知らない引数: {' '.join(rest)}\n{USAGE}", file=sys.stderr)
        return 2

    if shutil.which("node") is None:
        print("❌ node が見つかりません", file=sys.stderr)
        return 2

    try:
        config = load_config()
        targets = select_days(day, want_all, config_days(config))
    except ValueError as e:
        print(f"❌ {e}\n{USAGE}", file=sys.stderr)
        return 2

    total, failed = 0, 0
    for n in targets:
        print(f"day{n:02d}: {len(shots_for_day(config, n))} 枚")
        try:
            done = shoot_day(config, n, out_dir)
        except (OSError, RuntimeError, ValueError) as e:
            failed += 1
            print(f"  ❌ {e}")
            continue
        for d in done:
            marks = f"（赤枠 {len(d['marks'])}）" if d["marks"] else ""
            print(f"  ✅ {d['name']}{marks}")
        total += len(done)

    if failed:
        print(f"❌ {failed} 日が撮れませんでした（撮れた {total} 枚）")
        return 1
    print(f"✅ {total} 枚を {out_dir} へ書き出しました")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
