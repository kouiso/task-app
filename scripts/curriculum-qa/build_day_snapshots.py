#!/usr/bin/env python3
"""Day N を終えた読者の手元を組み立てて、型検査とビルドが通るかを見る。

教材の点検はこれまで「書いてあることが揃っているか」しか見ていない。揃っていても、
写経した結果が TypeScript として通るかは別の問いである。読者が最初に気づくのは
そこで、そこで詰まると教材は使われなくなる。ここでは実際にソースツリーを組んで、
機械に判定させる。

## 何を組むか

土台は `scaffold-from-scratch.sh` の配布物（`scripts/_*`）。その上に day01 から
day N までの写経ブロックを `concat_by_file` で書き込み先ごとに連結して置く。
出来上がりは `dist/day-snapshots/dayNN/`。

## 意図的に組まない部分

- scaffold が配るファイル（`sale_package.scaffold_src_paths()`）は上書きしない。
  教材のブロックはその中の一部を書き換える断片であり、丸ごと置き換えると読者の
  手元より壊れた状態になる。`check_tag_balance.py` がこれらを対象外にするのと同じ理由。
- `concat_by_file` は TypeScript/JavaScript のブロックだけを集める（`CODE_LANGS`）。
  `prisma/schema.prisma` と `scripts/*.sh` は scaffold の配布物をそのまま使う。
- リポジトリ直下の設定ファイルは、このリポジトリの現物を借りる。scaffold は
  `create-next-app` の出力へ `npm pkg set` を掛けて作るので現物が無い。型検査に効くのは
  `paths` と `strict` 系の設定で、そこは同じものが入る。`tsconfig.json` の exclude だけは
  scaffold が足す分があるので、`scaffold-from-scratch.sh` から読んで再現する。

## 書き直しは連結でなく置き換えになる

同じ書き込み先へ何度もブロックが来る。全部繋ぐと `export default` が何度も現れて
`TS2323 Cannot redeclare exported variable 'default'` になる。読者は書き直すのだから、
後から来た完全版は前を置き換えるのが正しい。判定は `starts_module` と `latest_version` に置いた。
規則は現物から決めた（`material/30days-curriculum/day02` の
`src/app/dashboard/page.tsx` は同じ日に4つの版を出し、版の先頭だけが注記を持たない）。

`concat_by_file` そのものは触っていない。もう1つの呼び出し元 `check_tag_balance.py` は
「開いたタグが30日のどこかで閉じているか」を見るので、途中の版も含めて全部繋ぐ側が正しい。
共通処理の意味を変えるとあちらが壊れるので、置き換えはここでの後処理にする。

## それでも連結では再現できない書き方が残る

教材のブロックは「追記」だけでなく「既存行の一部の書き換え」も含み、置き換えの単位に
ならない断片がある。だから tsc の NG は「教材の欠陥」と「連結では再現できない書き方」の
両方を含む。NG を1件ずつ現物と突き合わせるまでは、教材の欠陥とは言えない。

## エラーの扱い

`npx tsc --noEmit` は必須。`npm run build` は DB 接続を要求することがあり、DB の
無い機械で赤くしても教材の欠陥を指していない。失敗したら理由を記録して続行する。
握り潰しではない。表に NG として残す。
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

sys.path.insert(0, str(Path(__file__).parent))

from curriculum_blocks import Block, concat_by_file, day_number, mask_code  # noqa: E402
from sale_package import scaffold_copies, scaffold_src_paths  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
MATERIAL_DIR = REPO_ROOT / "material" / "30days-curriculum"
SNAPSHOT_ROOT = REPO_ROOT / "dist" / "day-snapshots"
RESULT_DOC = REPO_ROOT / "doc" / "review-handoff" / "day-snapshots-result.md"
SCAFFOLD_SH = REPO_ROOT / "scripts" / "scaffold-from-scratch.sh"

# 読者の手元にあって、scaffold が現物を配らないファイル。設定ファイルは
# `create-next-app` の出力へ `npm pkg set` を掛けて作られ、`src/app/globals.css` は
# `create-next-app` がそのまま置く。どちらも配布物として scripts/_* に無いので、
# このリポジトリの同じ位置の現物を借りる。globals.css は scaffold が配る
# `_app-base/layout.tsx` が import しており、欠けるとビルドがそこで止まる。
BORROWED_FILES = (
    "next.config.ts",
    "postcss.config.js",
    "tailwind.config.js",
    "package.json",
    "src/app/globals.css",
    ".env.example",
)

# 表の状態欄。実行しなかったことと落ちたことを同じ記号で書くと、
# `--verify` を付け忘れた回が「全部通った」ように読める。
NOT_RUN = "未実行"

# その日の最終形に教材が付ける目印。読者はここに書いてあるものを最後に持つ。
FINAL_MARK = "完成版"

# 貼る位置の説明から始まるブロックは断片である。`// LoginFormの先頭に追加` や
# `{/* メール入力欄の下に追加 */}` がこれで、ファイルの先頭には来られない。
COMMENT_HEAD = re.compile(r"^\s*(?://|/\*|\{/\*)")
# ファイルの1行目に来られる構文。ここから始まる注記なしのブロックは、
# 途中への追記ではなくファイルの書き直し版である。
MODULE_HEAD = re.compile(
    r"^\s*(?:['\"]use (?:client|server)['\"]|"
    r"import\b|export\b|type\b|interface\b|enum\b|declare\b|"
    r"const\b|let\b|var\b|function\b|async\s+function\b)"
)

# NG の日の切り分け。機械には「教材の欠陥か、道具の限界か」を決められないので、
# 現物を読んだ結果を人がここへ書く。書いていない日は「判定不能（未調査）」と出る。
# 推測で「教材の欠陥」と書かない。根拠は必ず現物の行を指すこと。
# NG の日の切り分け。機械には「教材の欠陥か、道具の限界か」を決められないので、
# 現物を読んだ結果を人がここへ書く。書いていない日は「判定不能（未調査）」と出る。
# 推測で「教材の欠陥」と書かない。根拠は必ず現物の行か実測の数を指すこと。
#
# 2026-08-30 時点の22件は全部同じ機構である。教材はその日の `完成版` として
# ファイル全体ではなく変更箇所の抜粋だけを出す日があり、道具はそれを丸ごとの
# 書き直しとして扱って前の版を捨てる。かといって追記にすると import と定義が
# 二重になるので、置き換えでも追記でも復元できない。教材の欠陥ではない。
TRIAGE: dict[int, tuple[str, str]] = {
    9: ('ツールの限界', 'src/app/project/page.tsx が 30 ブロック中 9（118/353 行）しか残らない。TS6133 の dialogOpen は捨てたブロックの中で使われている'),
    10: ('ツールの限界', 'src/server/api/root.ts が 7 ブロック中 1 しか残らず authRouter だけの版になる。api.project が無いのはそのため'),
    11: ('ツールの限界', 'day10 と同じ。root.ts が authRouter だけの版になる（src/app/project/page.tsx も 86 ブロック中 21）'),
    12: ('ツールの限界', 'day10 と同じ。root.ts が authRouter だけの版になる（src/app/project/page.tsx も 141 ブロック中 31）'),
    13: ('ツールの限界', 'src/component/layout/app-layout.tsx が 27 ブロック中 2（31/362 行）しか残らず AppLayout の export が落ちる'),
    14: ('ツールの限界', 'day13 と同じ。app-layout.tsx の AppLayout が落ちる'),
    15: ('ツールの限界', 'day13 と同じ。app-layout.tsx の AppLayout が落ちる'),
    16: ('ツールの限界', 'day13 と同じ。app-layout.tsx の AppLayout が落ちる'),
    17: ('ツールの限界', 'day13 と同じ app-layout.tsx に加え、src/app/my-task/page.tsx も 68 ブロック中 24（412/869 行）しか残らない'),
    18: ('ツールの限界', 'day17 と同じ。app-layout.tsx と my-task/page.tsx が欠ける'),
    19: ('ツールの限界', 'day17 と同じ。app-layout.tsx と my-task/page.tsx が欠ける'),
    20: ('ツールの限界', 'day17 と同じ。app-layout.tsx と my-task/page.tsx が欠ける'),
    21: ('ツールの限界', 'src/component/layout/app-layout.tsx が 34 ブロック中 2（14/487 行）しか残らず、その断片が構文として閉じていない'),
    22: ('ツールの限界', 'day21 と同じ。app-layout.tsx が 14/487 行しか残らない'),
    23: ('ツールの限界', 'day21 と同じ。app-layout.tsx が 14/487 行しか残らない'),
    24: ('ツールの限界', 'day17 と同じ。app-layout.tsx と my-task/page.tsx が欠ける'),
    25: ('ツールの限界', 'src/component/layout/app-layout.tsx が 44 ブロック中 3（39/601 行）しか残らない'),
    26: ('ツールの限界', 'day25 と同じ。app-layout.tsx が 39/601 行しか残らない'),
    27: ('ツールの限界', 'day25 と同じ。app-layout.tsx が 39/601 行しか残らない'),
    28: ('ツールの限界', 'src/app/task/page.tsx が 160 ブロック中 19（259/2044 行）しか残らず、div の閉じタグが捨てたブロックの中にある'),
    29: ('ツールの限界', 'day28 と同じ。task/page.tsx が 259/2044 行しか残らない'),
    30: ('ツールの限界', 'day28 と同じ。task/page.tsx が 259/2044 行しか残らない'),
}

# チャンクの見出し行。教材は長いファイルを分けて出すとき、各チャンクの先頭へ
# `// 完成版: 取り込みと型定義` のような見出しを置く。すぐ上の `filepath:` の目印と
# 同じ教材側のメタ情報であり、`iter_blocks` はその目印を落としている。見出しも同じ扱いにする。
# 落とさないと、`{/* 完成版: 残りのカード */}` が配列リテラルの中へ入って構文エラーになる
# （day08 `src/app/dashboard/page.tsx` の focusCards がこれ）。
CHUNK_LABEL = re.compile(r"^\s*(?://|\{/\*)\s*完成版[:：]")

# 読者の tsconfig.json には入らない厳しめの設定。scaffold の `configure_tsconfig` は
# `exclude` しか触らず、残りは `create-next-app` が置いた雛形のままである。
# 教材自身も day11 で「Day 01 で生成される tsconfig.json は exactOptionalPropertyTypes を
# 有効にしていません」と書いている。このリポジトリの tsconfig を借りたまま検査すると、
# 読者の手元では出ないエラー（未使用の引数 TS6133 等）で赤くなり、教材の欠陥に見えてしまう。
STRICTER_THAN_READER = (
    "noUnusedLocals",
    "noUnusedParameters",
    "noImplicitReturns",
    "noFallthroughCasesInSwitch",
    "noUncheckedIndexedAccess",
    "exactOptionalPropertyTypes",
    "noPropertyAccessFromIndexSignature",
)

# 行頭の `export`。ファイルまるごとの版なら、そのファイルが外へ出すものが必ず入っている。
# 抜粋（変更箇所だけの提示）には入らない。ここが全体と抜粋を分ける一番強い手掛かりで、
# day13 の `app-layout.tsx` の抜粋（アイコンの import とメニュー項目だけ）は
# 括弧の収支が合っていて先頭も `import` なので、この条件でしか落とせない。
TOP_LEVEL_EXPORT = re.compile(r"^export\s", re.M)

# 表へ載せるエラー1行の長さ。
ERROR_LINE_WIDTH = 160

# エラーらしい行の目印。tsc は `error TS2304`、Next.js は `Failed to compile.` と
# `Module not found:`、npm は `npm ERR!` を出す。
ERROR_MARK = re.compile(r"error|failed|not found|Cannot find|✗|⨯", re.I)

USAGE = "使い方: build_day_snapshots.py (--day N | --all) [--verify]"


class DayResult(NamedTuple):
    """1日ぶんの判定。"""

    day: int
    files: int
    tree_ok: bool
    tsc: str
    build: str
    errors: tuple[str, ...]


def available_days() -> list[int]:
    """教材に存在する day 番号を昇順で返す。"""
    return sorted({day_number(p.name) for p in MATERIAL_DIR.glob("day[0-9][0-9]_*.md")})


def day_sources(upto: int) -> list[Path]:
    """day01 から day{upto} までの教材ファイルを day 順で返す。"""
    return sorted(
        (p for p in MATERIAL_DIR.glob("day[0-9][0-9]_*.md") if 1 <= day_number(p.name) <= upto),
        key=lambda p: (day_number(p.name), p.name),
    )


def select_days(day: int | None, want_all: bool, days: list[int]) -> list[int]:
    """CLI の指定から、組み立てる day の並びを返す。

    範囲外の指定は ValueError。黙って空の結果を返すと、存在しない日を指定した回が
    「対象0件で全部緑」に見えてしまう。
    """
    if want_all == (day is not None):
        raise ValueError("--day か --all のどちらか一方を指定してください")
    if want_all:
        return days
    if day not in days:
        raise ValueError(f"day{day} は教材にありません（{days[0]}〜{days[-1]}）")
    return [day]


def tsconfig_excludes() -> tuple[str, ...]:
    """scaffold が tsconfig.json へ足す exclude を scaffold-from-scratch.sh から読む。

    値をここへ写し取ると、scaffold を変えたときに写した側が古くなる。古い exclude で
    型検査を回すと、読者の手元では検査されない範囲まで赤くなり、教材の欠陥でない赤が出る。
    `sale_package` が build-zip.sh の配列を読むのと同じやり方で、現物から取る。
    """
    m = re.search(r"for \(const entry of \[(.*?)\]\)", SCAFFOLD_SH.read_text(encoding="utf-8"), re.S)
    if m is None:
        raise ValueError("scaffold-from-scratch.sh の configure_tsconfig を読めません")
    return tuple(re.findall(r"'([^']+)'", m.group(1)))


def write_reader_tsconfig(dest: Path) -> None:
    """読者の手元と同じ tsconfig.json を置く。"""
    config = json.loads((REPO_ROOT / "tsconfig.json").read_text(encoding="utf-8"))
    for option in STRICTER_THAN_READER:
        config["compilerOptions"].pop(option, None)
    excludes = list(config.get("exclude", []))
    for entry in tsconfig_excludes():
        if entry not in excludes:
            excludes.append(entry)
    config["exclude"] = excludes
    (dest / "tsconfig.json").write_text(f"{json.dumps(config, indent=2, ensure_ascii=False)}\n", encoding="utf-8")


def copy_scaffold(dest: Path) -> int:
    """scaffold の配布物を読者の置き場へ並べる。返り値は置いたファイル数。"""
    count = 0
    for rel, src in scaffold_copies():
        out = dest / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, out)
        count += 1
    for name in BORROWED_FILES:
        src = REPO_ROOT / name
        if not src.is_file():
            raise FileNotFoundError(f"読者の土台に要るファイルがありません: {name}")
        out = dest / name
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, out)
        count += 1
    # scaffold の setup_database と同じ。置き場所だけの雛形なので秘密は入っていない。
    shutil.copyfile(dest / ".env.example", dest / ".env")
    write_reader_tsconfig(dest)
    return count + 2


def first_code_line(block: Block) -> str:
    """ブロックの最初の空でない行。"""
    return next((line for line in block.lines if line.strip()), "")


def is_marked_final(block: Block) -> bool:
    """その日の最終形として示されたブロックか。"""
    return any(FINAL_MARK in line for line in block.lines)


def starts_module(block: Block) -> bool:
    """このブロックがファイルの1行目から始まる書き直し版なら True。

    注記（`（同じファイルの続き）` `（import に追加）` 等）が付いていれば、教材が
    「これは前の続き・一部だ」と言っているので違う。貼る位置の説明から始まる断片も違う。
    day02 の `src/app/dashboard/page.tsx` は同じ日に4つの版を出すが、版の先頭だけが
    注記を持たずコードで始まり、続きのチャンクには必ず注記が付いている。
    """
    if block.note:
        return False
    head = first_code_line(block)
    return bool(head) and not COMMENT_HEAD.match(head) and bool(MODULE_HEAD.match(head))


def version_groups(blocks: list[Block]) -> list[list[Block]]:
    """ブロックの並びを、書き直しの候補ごとの塊へ切る。

    切れ目は2つ。`完成版` run の先頭と、ファイルの1行目から始まる注記なしのブロック。
    `完成版` はその日の最終形なので、run が始まったらその日の残りは全部その run に属する。
    run の途中には注記なしのチャンクも混ざる（day06 の `src/app/register/page.tsx` は
    import とスキーマの間に `（同じファイルの続き）` を挟む）ので、日をまたぐまで状態で持つ。
    """
    out: list[list[Block]] = []
    current: list[Block] = []
    day: int | None = None
    in_final = False
    for b in blocks:
        if b.day != day:
            # 版は日をまたがない。翌日の `（delete の直後に追加）` のような差し込みを
            # 前の日の完全な版へ足すと、閉じ括弧の後ろへ手続きが1本入った壊れた版になる
            # （day15 の `src/server/api/routers/task.ts` がこれで 375 行目に落ちていた）。
            # 差し込みは道具ではマージできないので、別の塊にして落とす側へ回す。
            if current:
                out.append(current)
            current, day, in_final = [], b.day, False
        if b.note:
            current.append(b)
        elif is_marked_final(b):
            # run の途中の `完成版` チャンクは同じ塊。先頭なら新しい塊を起こす。
            if in_final:
                current.append(b)
            else:
                if current:
                    out.append(current)
                current, in_final = [b], True
        elif starts_module(b):
            # `完成版` run の中でも、注記も目印も無いファイル先頭は別の版である。
            # day09 の `src/server/api/root.ts` は完成版の後ろにもう1つ全体版を出しており、
            # 同じ塊に入れると import が二重になる。
            if current:
                out.append(current)
            current, in_final = [b], False
        else:
            current.append(b)
    if current:
        out.append(current)
    return out


def is_complete_file(blocks: list[Block]) -> bool:
    """その塊だけでファイルまるごとになっているなら True。

    教材はその日の `完成版` として、ファイル全体を出す日と変更箇所の抜粋だけを出す日の
    両方がある。抜粋を丸ごとの書き直しとして扱うと前の版が消え、追記にすると import と
    定義が二重になる。どちらでも復元できないので、抜粋だと分かった塊は使わない。

    見分けは3つとも満たすこと。現物で確かめた形は次のとおり:
      - 先頭がファイルの1行目に来られる構文。day25 の `app-layout.tsx` の抜粋は
        `<Link` から始まっており、ここで落ちる。
      - 行頭の `export` がある。day13 の同ファイルの抜粋はアイコンの import と
        メニュー項目だけで、外へ出すものが無い。
      - 括弧の収支が合っている。途中で切れた塊を全体と見なさないための保険。
    """
    text = render(blocks)
    head = next((line for line in text.split("\n") if line.strip()), "")
    if not head or COMMENT_HEAD.match(head) or not MODULE_HEAD.match(head):
        return False
    if not TOP_LEVEL_EXPORT.search(text):
        return False
    masked = mask_code(text)
    return all(masked.count(o) == masked.count(c) for o, c in ("{}", "()", "[]"))


def latest_version(blocks: list[Block]) -> list[Block]:
    """読者の手元に最後に残るブロックだけを、順番のまま返す。

    まるごと1ファイルになる塊のうち、いちばん後ろのものを採る。そのあとに続く抜粋は
    落とす。落とした日の変更は反映されないが、道具は抜粋をマージできないので、
    直前の完全な版をその日の手元とみなすのがいちばん実物に近い。
    まるごとの塊が1つも無いときは、最後の塊をそのまま返す（従来どおりの最善努力）。
    """
    groups = version_groups(blocks)
    complete = [g for g in groups if is_complete_file(g)]
    return complete[-1] if complete else (groups[-1] if groups else [])


def strip_chunk_label(lines: tuple[str, ...]) -> list[str]:
    """先頭のチャンク見出しを落とす。見出しが無ければそのまま返す。"""
    for i, line in enumerate(lines):
        if not line.strip():
            continue
        return list(lines[i + 1 :]) if CHUNK_LABEL.match(line) else list(lines[i:])
    return []


def render(blocks: list[Block]) -> str:
    """ブロックの並びを1つのファイルの中身にする。"""
    return "\n".join("\n".join(strip_chunk_label(b.lines)).strip("\n") for b in blocks)


def apply_blocks(dest: Path, paths: list[Path]) -> int:
    """写経ブロックを書き込み先ごとに置く。返り値は書いたファイル数。

    scaffold が配るファイルへは、教材がまるごとの書き直しを出したときだけ上書きする。
    `src/server/api/root.ts` がこれで、配布物は auth だけを登録した版なのに、教材は
    day09 以降その日までの router を全部登録した完成版を出す。上書きしないと
    `api.project` が無い版のまま残り、day10 以降の画面が軒並み型検査で落ちる。
    逆に抜粋しか無いファイル（`src/lib/utils.ts` 等）は配布物のままが正しい。
    読者が写経していない行がそこに在るためである。
    """
    provided = scaffold_src_paths()
    count = 0
    for target, blocks in sorted(concat_by_file(paths).items()):
        version = latest_version(blocks)
        if target in provided and not is_complete_file(version):
            continue
        out = dest / target
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(f"{render(version)}\n", encoding="utf-8")
        count += 1
    return count


def build_tree(day: int) -> tuple[Path, int]:
    """Day N を終えた読者のソースツリーを組んで、(置き場, ファイル数) を返す。"""
    dest = SNAPSHOT_ROOT / f"day{day:02d}"
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    files = copy_scaffold(dest) + apply_blocks(dest, day_sources(day))
    return dest, files


def error_lines(output: str) -> tuple[str, ...]:
    """出力から、最初のエラー3行を抜く。

    先頭3行をそのまま採ると `> task-app@1.0.0 build` のような npm の前口上しか
    残らない。読んだ人が原因へ辿れないので、エラーらしい行を先に探す。
    見つからないときだけ先頭から採る。
    """
    lines = [ln.rstrip() for ln in output.split("\n") if ln.strip()]
    hits = [ln for ln in lines if ERROR_MARK.search(ln)]
    # tsc の型不一致は型の中身を丸ごと吐くので、1行が数百文字になる。原因を指すのは
    # 行頭のファイル位置とエラー番号なので、そこが読める長さで切る。
    return tuple(ln[:ERROR_LINE_WIDTH] for ln in (hits or lines)[:3])


def run_step(cmd: list[str], cwd: Path) -> tuple[bool, tuple[str, ...]]:
    """コマンドを走らせて (成功したか, 最初のエラー3行) を返す。"""
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=False)
    if proc.returncode == 0:
        return True, ()
    return False, error_lines(f"{proc.stdout}\n{proc.stderr}")


def link_node_modules(dest: Path) -> None:
    """このリポジトリの node_modules を借りる。

    Day ごとに `npm install` を走らせると30回ぶんの時間とディスクを食う。型検査に
    要るのは型定義と生成済みの Prisma クライアントで、どちらも共有して差し支えない。
    """
    link = dest / "node_modules"
    if link.exists() or link.is_symlink():
        link.unlink()
    link.symlink_to(REPO_ROOT / "node_modules", target_is_directory=True)


def verify_tree(dest: Path) -> tuple[str, str, tuple[str, ...]]:
    """組んだツリーへ型検査とビルドを掛けて (tsc, build, エラー行) を返す。"""
    link_node_modules(dest)
    tsc_ok, tsc_errors = run_step(["npx", "tsc", "--noEmit"], dest)
    build_ok, build_errors = run_step(["npm", "run", "build"], dest)
    return (
        "OK" if tsc_ok else "NG",
        "OK" if build_ok else "NG",
        tsc_errors or build_errors,
    )


def snapshot_day(day: int, verify: bool) -> DayResult:
    """1日ぶんを組んで判定する。"""
    try:
        dest, files = build_tree(day)
    except (OSError, ValueError) as e:
        return DayResult(day, 0, False, NOT_RUN, NOT_RUN, (f"{type(e).__name__}: {e}",))
    if not verify:
        return DayResult(day, files, True, NOT_RUN, NOT_RUN, ())
    tsc, build, errors = verify_tree(dest)
    return DayResult(day, files, True, tsc, build, errors)


def _cell(text: str) -> str:
    """表のセルへ入れられる形へ直す。`|` は列の区切りなので潰す。"""
    return text.replace("|", "\\|").replace("`", "'")


def result_table(results: list[DayResult]) -> str:
    """判定を Markdown の表にする。"""
    rows = [
        "| Day | ツリー構築 | tsc | build | 最初のエラー3行 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for r in results:
        tree = f"OK（{r.files} ファイル）" if r.tree_ok else "NG"
        errors = "<br>".join(_cell(e) for e in r.errors) or "-"
        rows.append(f"| day{r.day:02d} | {tree} | {r.tsc} | {r.build} | {errors} |")
    return "\n".join(rows)


def triage_section(results: list[DayResult]) -> str:
    """NG の日の切り分けを書く。"""
    ng = [r for r in results if not r.tree_ok or r.tsc == "NG" or r.build == "NG"]
    if not ng:
        return ""
    rows = [
        "",
        "## NG の日の切り分け",
        "",
        "「教材の欠陥」は現物を読んで確かめたものだけ。読んでいない日は「判定不能（未調査）」。",
        "",
        "| Day | 分類 | 根拠 |",
        "| --- | --- | --- |",
    ]
    for r in ng:
        kind, why = TRIAGE.get(r.day, ("判定不能（未調査）", "現物と突き合わせていない"))
        rows.append(f"| day{r.day:02d} | {_cell(kind)} | {_cell(why)} |")
    return "\n".join(rows) + "\n"


def write_result_doc(results: list[DayResult], verify: bool) -> None:
    """判定を doc/review-handoff/day-snapshots-result.md へ書き出す。"""
    RESULT_DOC.parent.mkdir(parents=True, exist_ok=True)
    passed = sum(r.tsc == "OK" and r.build == "OK" for r in results)
    head = [
        "# Day スナップショットの検査結果",
        "",
        "`scripts/curriculum-qa/build_day_snapshots.py` の出力。Day N を終えた読者の",
        "手元を組み直して、型検査とビルドが通るかを見た結果である。",
        "",
        f"- 型検査とビルド: {'実行した' if verify else '実行していない（--verify なし）'}",
        f"- tsc・build とも OK: {passed} / {len(results)} 日",
        f"- ツリーの置き場: `{SNAPSHOT_ROOT.relative_to(REPO_ROOT)}/dayNN/`",
        "- tsc の NG は教材の欠陥とは限らない。教材がその日の `完成版` として",
        "  変更箇所の抜粋だけを出す日があり、道具はそれを丸ごとの書き直しとして扱う。",
        "  1件ずつ現物と突き合わせてから判断すること。下の切り分けの表を見ること。",
        "",
        "",
    ]
    body = "\n".join(head) + result_table(results) + "\n"
    RESULT_DOC.write_text(body + triage_section(results), encoding="utf-8")


def main(argv: list[str]) -> int:
    args = argv[1:]
    verify = "--verify" in args
    rest = [a for a in args if a != "--verify"]
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

    days = available_days()
    if not days:
        print(f"❌ 教材が見つかりません: {MATERIAL_DIR}", file=sys.stderr)
        return 2
    try:
        targets = select_days(day, want_all, days)
    except ValueError as e:
        print(f"❌ {e}\n{USAGE}", file=sys.stderr)
        return 2

    results = []
    for n in targets:
        r = snapshot_day(n, verify)
        results.append(r)
        print(f"day{n:02d}: ツリー {'OK' if r.tree_ok else 'NG'}（{r.files} ファイル） tsc {r.tsc} build {r.build}")
        for line in r.errors:
            print(f"    {line}")

    write_result_doc(results, verify)
    print(f"結果を書き出しました: {RESULT_DOC.relative_to(REPO_ROOT)}")

    # build の失敗では止めない。DB の無い機械でも赤くなるので、教材の欠陥を指さない。
    broken = [r for r in results if not r.tree_ok or r.tsc == "NG"]
    if broken:
        print(f"❌ ツリー構築または型検査が通らない {len(broken)} 日")
        return 1
    print(f"✅ {len(results)} 日ぶんを組み立てました")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
