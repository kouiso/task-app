#!/usr/bin/env python3
"""shoot_screenshots.py の退行テスト。

この道具は「読者がその日に見る画面」を撮ることに全部を賭けている。境界が1つずれると、
出てくる画像は今までと同じ「別の日の画面」に戻り、しかも撮れてしまうので誰も気づけない。
ずれやすいのは次の4つで、ここで固定する。

  - 赤枠と切り抜きの座標は `boundingBox()` から起こす。宣言表に手で座標を書けてしまうと、
    UI が少し動いた回に枠がずれ、次に撮り直すまで誰も気づけない。
  - 日別シードは day 番号で決まる。Day 06 で読者が自分のアカウントを1件足すので、
    day05 と day06 の間に境界がある。裏を取っていない日は撮らせない。
  - 宣言表の読み込みは、壊れた宣言で黙って0枚にならない。対象0件は「全部成功」に見える。
  - 画角の指定は1つだけ。`full_page` と `clip` の両方を書けると、書いた人の思っている
    画角と出てくる画像が食い違う。
"""

import json
import queue
import sys
import time
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import shoot_screenshots as target  # noqa: E402

WORKER = Path(__file__).with_name("shoot-page.mjs")


def write_config(root: Path, shots: list[dict], viewport: dict | None = None) -> Path:
    path = root / "shots.json"
    path.write_text(
        json.dumps({"viewport": viewport if viewport is not None else {"width": 1440, "height": 900}, "shots": shots}, ensure_ascii=False),
        encoding="utf-8",
    )
    return path


def load_error(shots: list[dict]) -> str:
    """壊れた宣言表を読ませて、返ってきた文言を返す。通ってしまったら空文字。"""
    with tempfile.TemporaryDirectory() as d:
        try:
            target.load_config(write_config(Path(d), shots))
        except ValueError as e:
            return str(e)
    return ""


BASE_SHOT = {"name": "day01/a.png", "day": 1, "path": "/"}


def check_mark_rect_source() -> list[str]:
    """赤枠の座標が boundingBox() 由来であることを固定する。"""
    fails = []
    source = WORKER.read_text(encoding="utf-8")
    if "boundingBox()" not in source:
        fails.append("❌ ワーカーが boundingBox() を呼んでいない")
    if target.MARK_RECT_SOURCE != "boundingBox":
        fails.append(f"❌ 座標の出どころが boundingBox でない: {target.MARK_RECT_SOURCE}")

    # 手で座標を書いた宣言は、どの綴りでも弾く。
    for key in ("x", "y", "width", "height", "rect", "left", "top", "box"):
        shot = {**BASE_SHOT, "marks": [{"selector": ".a", key: 10}]}
        msg = load_error([shot])
        if not msg:
            fails.append(f"❌ 赤枠に座標 {key} を書いた宣言が通ってしまう")
        elif target.MARK_RECT_SOURCE not in msg:
            fails.append(f"❌ {key} を弾いた説明が座標の出どころを指していない: {msg}")

    # 切り抜きも同じ扱い。こちらだけ座標を書けると抜け道になる。
    if not load_error([{**BASE_SHOT, "clip": {"selector": ".a", "x": 1}}]):
        fails.append("❌ 切り抜きに座標を書いた宣言が通ってしまう")

    # selector が無い赤枠は、何も指さない枠になる。
    if not load_error([{**BASE_SHOT, "marks": [{"label": "ここ"}]}]):
        fails.append("❌ selector の無い赤枠が通ってしまう")

    # 正しい書き方は通り、座標を持たないこと。
    with tempfile.TemporaryDirectory() as d:
        config = target.load_config(write_config(Path(d), [{**BASE_SHOT, "marks": [{"selector": ".a", "label": "ここ"}]}]))
    mark = config.shots[0].marks[0]
    if tuple(mark._fields) != ("selector", "label"):
        fails.append(f"❌ 赤枠が座標の欄を持っている: {mark._fields}")
    return fails


def check_day_seed_boundary() -> list[str]:
    """日別シードが day 番号で決まることを固定する。"""
    fails = []
    # scan-day01-08.md (f): Day 01-05 はシードの4件だけ。読者が作ったものは0件。
    for day in (1, 2, 3, 4, 5):
        if len(target.seed_for_day(day).users) != 4:
            fails.append(f"❌ day{day:02d} のユーザーが4件でない")
    # Day 06 Step 10 で読者が自分のアカウントを1件登録する。
    for day in (6, 7, 8):
        seed = target.seed_for_day(day)
        if len(seed.users) != 5:
            fails.append(f"❌ day{day:02d} のユーザーが5件でない")
        if target.READER_USER not in seed.users:
            fails.append(f"❌ day{day:02d} に読者が登録したアカウントが入っていない")
    # プロジェクト・タスク・コメントは Day 01-08 を通して変わらない。
    for day in (1, 8):
        seed = target.seed_for_day(day)
        counts = (len(seed.projects), len(seed.tasks), len(seed.comments))
        if counts != (2, 5, 2):
            fails.append(f"❌ day{day:02d} の件数が (2, 5, 2) でない: {counts}")

    # Day 18〜22 は読者がデータを作らない。`day19_...md:830` が Day 19 の時点の手元を
    # 「初期データでは……1件ずつ」と名指しで書いており、day16 の記述と一致する。
    for day in (18, 19, 20, 21, 22):
        seed = target.seed_for_day(day)
        counts = (len(seed.users), len(seed.projects), len(seed.tasks), len(seed.comments))
        if counts != (5, 2, 5, 2):
            fails.append(f"❌ day{day:02d} の件数が (5, 2, 5, 2) でない: {counts}")

    # Day 23 の前提（`day23_...md:28`）が、自分を担当者にした完了タスクを作らせる。
    # ここが欠けると週次レポートが「完了0件」になり、本文の説明と画面が食い違う。
    for day in (23, 24, 30):
        seed = target.seed_for_day(day)
        if len(seed.tasks) != 8:
            fails.append(f"❌ day{day:02d} のタスクが8件でない: {len(seed.tasks)}")
        done = [t for t in seed.tasks if t["status"] == "DONE" and t["assigneeEmail"] == "admin@example.com"]
        if len(done) != 3:
            fails.append(f"❌ day{day:02d} に admin 担当の完了タスクが3件ない: {len(done)}")

    # 裏を取っていない日は撮らせない。足りないデータで撮った画像は、
    # 完成版で撮った画像と同じで「読者の画面ではないもの」を教材へ載せることになる。
    # 上限そのものを書かずに `MAX_SEEDED_DAY` から起こすのは、裏を取った日が増えた回に
    # 「実際は撮れる日」を撮れないことにして落ちるテストにしないため。
    for day in (0, -1, target.MAX_SEEDED_DAY + 1, target.MAX_SEEDED_DAY + 10):
        try:
            target.seed_for_day(day)
        except ValueError:
            continue
        fails.append(f"❌ 裏の無い day{day} のシードが取れてしまう")
    return fails


def check_config_loading() -> list[str]:
    """壊れた宣言表で黙って0枚にならないことを固定する。"""
    fails = []
    cases = {
        "名前が .png でない": {**BASE_SHOT, "name": "day01/a"},
        "名前が外を指す": {**BASE_SHOT, "name": "../a.png"},
        "day が数字でない": {**BASE_SHOT, "day": "1"},
        "path が / で始まらない": {**BASE_SHOT, "path": "dashboard"},
        "login に password が無い": {**BASE_SHOT, "login": {"email": "a@example.com"}},
        "知らない操作": {**BASE_SHOT, "actions": [{"kind": "scroll", "selector": ".a"}]},
        "fill に value が無い": {**BASE_SHOT, "actions": [{"kind": "fill", "selector": ".a"}]},
        "full_page が真偽値でない": {**BASE_SHOT, "full_page": "yes"},
        "clip の padding が負": {**BASE_SHOT, "clip": {"selector": ".a", "padding": -1}},
        "stall が空の配列": {**BASE_SHOT, "stall": []},
        "stall の中身が文字列でない": {**BASE_SHOT, "stall": [1]},
        # 画角の指定は1つだけ。両方書けると、思っている画角と出てくる画像が食い違う。
        "full_page と clip の同時指定": {**BASE_SHOT, "full_page": True, "clip": {"selector": ".a"}},
    }
    for why, shot in cases.items():
        if not load_error([shot]):
            fails.append(f"❌ {why} の宣言が通ってしまう")

    # 同じ出力名を2度書くと、後から撮ったほうが前を黙って上書きする。
    if not load_error([BASE_SHOT, {**BASE_SHOT, "path": "/dashboard"}]):
        fails.append("❌ 同じ出力名を2度書いた宣言が通ってしまう")

    # shots が空の宣言表は「対象0件で全部成功」に見える。
    with tempfile.TemporaryDirectory() as d:
        try:
            target.load_config(write_config(Path(d), []))
            fails.append("❌ shots が空の宣言表が通ってしまう")
        except ValueError:
            pass

    # 範囲外の day を指定したら止まる。黙って空を返すと全部成功に見える。
    try:
        target.select_days(99, False, [1, 2])
        fails.append("❌ 宣言表に無い day の指定が通ってしまう")
    except ValueError:
        pass
    try:
        target.select_days(1, True, [1, 2])
        fails.append("❌ --day と --all の同時指定が通ってしまう")
    except ValueError:
        pass
    if target.select_days(None, True, [1, 4, 8]) != [1, 4, 8]:
        fails.append("❌ --all が宣言表の day を全部返していない")
    return fails


def check_shipped_config() -> list[str]:
    """同梱の宣言表が、いま撮れる範囲に収まっていることを確かめる。"""
    fails = []
    config = target.load_config()
    for day in target.config_days(config):
        try:
            target.seed_for_day(day)
        except ValueError as e:
            fails.append(f"❌ 宣言表の day{day:02d} は撮れない: {e}")
    for shot in config.shots:
        if not shot.name.startswith(f"day{shot.day:02d}/"):
            fails.append(f"❌ 出力名が day{shot.day:02d}/ で始まっていない: {shot.name}")
    return fails


def check_worker_isolation() -> list[str]:
    """並べて撮るときに、ワーカー同士が DB とポートを取り合わないことを固定する。

    ここが崩れると、片方が撮っている最中にもう片方が DB の中身を入れ替える。
    出てくる画像は別の日のデータになるが、撮影自体は成功するので誰も気づけない。
    """
    fails = []
    base = {"DATABASE_URL": "postgresql://user:password@localhost:25532/taskapp?schema=public"}
    urls = {target.worker_env(base, w)["DATABASE_URL"] for w in range(target.MAX_WORKERS)}
    if len(urls) != target.MAX_WORKERS:
        fails.append(f"❌ ワーカーごとの DATABASE_URL が重なっている: {sorted(urls)}")
    for url in urls:
        if "localhost:25532" not in url or "schema=public" not in url:
            fails.append(f"❌ DB 名以外まで書き換えている: {url}")
    try:
        target.worker_env({"DATABASE_URL": "mysql://x/y"}, 1)
    except ValueError:
        pass
    else:
        fails.append("❌ 読めない DATABASE_URL が素通りする")

    # ポートの帯が重なると、空きを見つけてから next が握るまでの隙に取り合う。
    bands = [range(target.BASE_PORT + w * target.PORT_SPAN, target.BASE_PORT + (w + 1) * target.PORT_SPAN)
             for w in range(target.MAX_WORKERS)]
    for i, a in enumerate(bands):
        for b in bands[i + 1 :]:
            if max(a.start, b.start) < min(a.stop, b.stop):
                fails.append(f"❌ ポートの帯が重なっている: {a} と {b}")
    if target.MAX_WORKERS < 1:
        fails.append("❌ ワーカー数が 1 未満")
    return fails


def check_slot_exclusivity() -> list[str]:
    """同時に走っとる日が同じスロットを掴まんことを見る。

    以前は `i % workers` でスロットを配っとった。ThreadPoolExecutor は ID を
    スレッドへ固定せんので、先に終わった日の後ろに同じ ID の日が入り込み、
    2つの日が同時に `shoot_wN` を seed し合う。片方の撮影中にもう片方が
    clearAll() を呼ぶので、別の日のデータが写った写真が出て、しかも成功と報告される。
    ここでは実際に走らせて、同じスロットが二重に貸し出されんことを確かめる。
    """
    import threading
    from concurrent.futures import ThreadPoolExecutor, as_completed

    fails: list[str] = []
    src = (Path(__file__).parent / "shoot_screenshots.py").read_text(encoding="utf-8")
    # 説明コメントにも同じ字面が出るので、コードの行だけを見る
    code = "\n".join(ln for ln in src.splitlines() if not ln.lstrip().startswith("#"))
    if "% workers" in code:
        fails.append("❌ スロットを剰余で配る書き方が戻っとる（同時実行で衝突する）")
    if "slots.get()" not in code or "slots.put(" not in code:
        fails.append("❌ スロットの貸し出し（slots.get / slots.put）が無くなっとる")

    # 本体と同じ貸し出しの形を組んで、重複が起きひんことを実測する
    workers = 3
    slots: "queue.Queue[int]" = queue.Queue()
    for slot in range(workers):
        slots.put(slot)
    live: dict[int, int] = {}
    lock = threading.Lock()
    seen_overlap: list[int] = []

    def job(day: int) -> int:
        slot = slots.get()
        try:
            with lock:
                live[slot] = live.get(slot, 0) + 1
                if live[slot] > 1:
                    seen_overlap.append(slot)
            # 日ごとに長さを変える。短い日が先に終わって次が滑り込む形を作る
            time.sleep(0.01 * (1 + day % 4))
            return slot
        finally:
            with lock:
                live[slot] -= 1
            slots.put(slot)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(job, d) for d in range(30)]
        for f in as_completed(futures):
            f.result()

    if seen_overlap:
        fails.append(f"❌ 同じスロットが同時に2つの日へ貸し出された: {sorted(set(seen_overlap))}")
    return fails


CHECKS = (
    ("赤枠と切り抜きの座標の出どころ", check_mark_rect_source),
    ("日別シードの境界", check_day_seed_boundary),
    ("宣言表の読み込み", check_config_loading),
    ("同梱の宣言表", check_shipped_config),
    ("ワーカーの分離", check_worker_isolation),
    ("スロットの排他", check_slot_exclusivity),
)


def main() -> int:
    failed = 0
    for name, check in CHECKS:
        fails = check()
        for msg in fails:
            print(f"  {msg}（{name}）")
        failed += 1 if fails else 0
    total = len(CHECKS)
    if failed:
        print(f"❌ shoot_screenshots 自己テスト {total - failed}/{total} 合格")
        return 1
    print(f"✅ shoot_screenshots 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
