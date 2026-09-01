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
from datetime import datetime, timezone
from functools import cache
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
    # 2026-08-30 時点、EXPECTED_RED の day11 以外はすべて通る。ここに残す行は無い。
    # 「教材の欠陥」と書く前に、その日の本文がその赤を先に断っとらんかを必ず読むこと。
    # day11 を一度ここへ「教材の欠陥」として書いて覆された。本文が
    # 「今日は失敗して正常です」と断っとった。断りがある日は EXPECTED_RED の担当で、
    # この表の担当ではない。
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

# 外へ出す名前。`export const X` `export function X` `export type X` `export { a, b }`。
EXPORT_NAME = re.compile(
    r"^export\s+(?:default\s+)?(?:async\s+)?"
    r"(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)",
    re.M,
)
EXPORT_LIST = re.compile(r"^export\s*\{([^}]*)\}", re.M)

# 差し込み先を名指しした注記。`（delete の直後に追加）` `（taskRouter の前に追加）` の形で、
# 教材が「どこへ入れるか」を書いている。ここを読めば抜粋を前の完全な版へ差し込める。
# 差し込めないと、day16 が足す `addTime` 手続きが落ちて、day16 以降の
# `time-log-dialog.tsx` が `api.task.addTime` を呼べずに型検査で落ちる。
INSERT_NOTE = re.compile(r"^[（(](.+?)\s*の\s*(直後に追加|前に追加)[）)]$")
# `（className="grid gap-6 …" の要素を書き直す）` の形。同じ名前のタグが何個も並ぶ所を
# 指すため、タグ名やのうて行の中の文字列で1つに絞る。`<div>` の書き直しは名前では
# 決められん（day28 の一覧グリッドと見出し行がどちらも `<div>` から始まる）。
REWRITE_NOTE = re.compile(r"^[（(](.+?)\s*の要素を書き直す[）)]$")
# `（A から B までを書き直す）` の形。並んだ2つの要素をまとめて1つへ包み直すときに使う。
# 片方だけを書き直すと、もう片方が二重に残る（day28 の見出しと「新規タスク」ボタンを
# `justify-between` の1行へ包む書き直しがこれ）。
REWRITE_SPAN_NOTE = re.compile(r"^[（(](.+?)\s*から\s*(.+?)\s*までを書き直す[）)]$")
TAG_NAME = re.compile(r"<([A-Za-z][\w.]*)")
# 抜粋の先頭がトップレベルの宣言なら、それは「その宣言をこの形へ書き直す」という指示である。
# day13 と day20 の `app-layout.tsx` は `const menuItems: MenuItem[] = [...]` を、項目を1つ
# 増やした形で丸ごと出し直す。当てられんと、サイドバーが Day 08 の3項目のまま止まり、
# 読者が自分で足した「タスク」「検索」が写真から消える。
DECL_HEAD = re.compile(
    r"^(?:export\s+)?(?:const|let|var|function|async\s+function)\s+([A-Za-z_$][\w$]*)\b"
)
# `const [selectedTasks, setSelectedTasks] = useState(...)` の形。束ねる名前が複数あるので
# 「その宣言を書き直す」には使えん。足す側だけを見る。
DESTRUCTURE_HEAD = re.compile(r"^(?:export\s+)?(?:const|let|var)\s*[\[{]")
# 部品の本体で最初に来る「抜けるかもしれん行」。まだ無い宣言はこの直前へ足す。
# `return (` だけを見ると、`if (tasksLoading) {` の中の早い return が先に当たって、
# hook を条件分岐の内側へ入れてしまう。どの `if` が本体直下かは字下げでは決まらん
# （差し込んだ抜粋は字下げ0で入るので、その中の `if` が字下げ2つになる）ので、
# 波括弧の深さで見る。
COMPONENT_GUARD = re.compile(r"^\s*(?:if \(|return \()")
# 抜粋そのものがオブジェクトの1要素なら、それは「この要素をどこかの配列へ足す」という指示である。
# day21 の `app-layout.tsx` は `{ text: 'レポート', icon: ..., path: ... },` だけを出す。
OBJECT_ELEMENT_HEAD = re.compile(r"^\s*\{\s*$")
# オブジェクトの欄名。`text:` `icon:` `path:` を拾う。文字列の中の `:` は mask_code が消す。
OBJECT_KEY = re.compile(r"^\s*([A-Za-z_$][\w$]*)\s*:", re.M)

# 抜粋の先頭が JSX 要素なら、それは「その要素をこの形へ書き換える」という指示である。
# day18 の `src/app/task/page.tsx` は `<TaskDetailDialog ... canEditProject={canEditProject} />`
# だけを出して、呼び出し側へ引数を1本足す。差し込みでも丸ごとの書き直しでもないので、
# 要素の置き換えとして扱わんと day18 以降がずっと古い版のままになる。
ELEMENT_HEAD = re.compile(r"^\s*<([A-Z][\w.]*)\b")
# import 文1本。`import { a, type B } from 'mod';` の名前部分と持ち込み元を取る。
IMPORT_LINE = re.compile(r"^import\s+\{([^}]*)\}\s*from\s*(['\"])([^'\"]+)\2\s*;?\s*$")
# import と、コメントと、空行だけでできとるチャンクか。
IMPORT_ONLY = re.compile(r"^\s*(?:import\b|//|/\*|\{/\*|$)")

# 波括弧の中の式。JSX は `canEditProject={canEditProject}` の形で値を渡すので、
# 参照しとる名前はここに出る。属性の名前（`open=`）は括弧の外なので拾わない。
BRACED = re.compile(r"\{([^{}]*)\}")
IDENTIFIER = re.compile(r"[A-Za-z_$][\w$]*")
# 参照として数える名前。`a.b` の `b` は `a` の持ち物であって、そのファイルに宣言が
# 要る名前やない。ドットの後ろを数えると、API が返す値の欄名まで「まだ無い名前」に
# なって、当てられるはずの抜粋が落ちる（day16 の `task.timeSpentMinutes`）。
REFERENCE = re.compile(r"(?<![.\w$])[A-Za-z_$][\w$]*")
# 名前やのうて構文の一部。参照の有無を数える対象から外す。
NOT_A_REFERENCE = frozenset(
    {"true", "false", "null", "undefined", "new", "await", "typeof", "return", "of", "in"}
)

# 「ここは前に書いたものがそのまま入る」を表す省略記号。`// ...Day 15 で渡した props...` の形。
# これが入った抜粋は、そこだけでは元の中身を復元できない。要素ごと置き換えると
# 前に渡していた props が消え、しかも `//` が JSX の属性の位置に残って構文エラーになる
# （day16 の `src/app/task/page.tsx` の `<TaskCard>` がこれ）。
ELISION = re.compile(r"^\s*(?://|\{?/\*)\s*\.{2,}")

# チャンクの先頭に1行だけ置かれる、貼る位置の説明。`{/* 権限判定を詳細ダイアログへ渡す */}` 等。
LEAD_COMMENT = re.compile(r"^\s*(?://|\{/\*)")

# 差し込む1本が複数チャンクに割れたときの、2つ目以降の注記。
CONTINUATION = re.compile(r"続き")
# 差し込み先の目印になる行。オブジェクトの要素（`delete: protectedProcedure`）と
# トップレベルの宣言（`export const taskRouter`）の両方を受ける。
ANCHOR = "^(\\s*)(?:{name}\\s*:|(?:export\\s+)?(?:const|let|function|async\\s+function)\\s+{name}\\b)"
# 差し込み先の名前が識別子1つか。`menuItems.map` のような式はここで外れ、行の中の
# 文字列として探す側へ回る。
IDENTIFIER_ONLY = re.compile(r"^[A-Za-z_$][\w$]*$")

# 表へ載せるエラー1行の長さ。
ERROR_LINE_WIDTH = 160

# エラーらしい行の目印。tsc は `error TS2304`、Next.js は `Failed to compile.` と
# `Module not found:`、npm は `npm ERR!` を出す。
ERROR_MARK = re.compile(r"error|failed|not found|Cannot find|✗|⨯", re.I)

# Node の stack frame。`    at ei.handleRequestError (...）` のようにメソッド名へ
# `Error` が入るので ERROR_MARK に当たってまう。中身は失敗の**場所**であって種類やない。
# 判定側は「説明の付かん行が1つでも混ざったら SKIP にせん」ので、この行が残ると
# DB だけの失敗が必ず本物の失敗に見え、DB を持たん機械で `--verify` が exit 1 になる。
# 落としても本物の失敗は見逃さん。frame の上には必ずメッセージの行が出て、そっちは残る。
STACK_FRAME_MARK = re.compile(r"^\s+at \S")

USAGE = "使い方: build_day_snapshots.py (--day N | --all) [--verify]"


class DayResult(NamedTuple):
    """1日ぶんの判定。"""

    day: int
    files: int
    tree_ok: bool
    tsc: str
    build: str
    errors: tuple[str, ...]
    build_errors: tuple[str, ...] = ()
    # 表示用の3行やのうて、tsc が出した全部。件数と中身で「断り書きどおりの赤か」を見るのに要る。
    tsc_errors: tuple[str, ...] = ()


def available_days() -> list[int]:
    """教材に存在する day 番号を昇順で返す。"""
    return sorted({day_number(p.name) for p in MATERIAL_DIR.glob("day[0-9][0-9]_*.md")})


def day_sources(upto: int) -> list[Path]:
    """day01 から day{upto} までの教材ファイルを day 順で返す。"""
    return sorted(
        (p for p in MATERIAL_DIR.glob("day[0-9][0-9]_*.md") if 1 <= day_number(p.name) <= upto),
        key=lambda p: (day_number(p.name), p.name),
    )


# ツリーの中身を決めているファイルのうち、教材でも配布物でもないもの。
# 組み立て方を変えた回は教材の更新時刻が動かないので、これを見ないと古いツリーが残る。
BUILDER_SOURCES = (
    Path(__file__).resolve(),
    Path(__file__).resolve().parent / "curriculum_blocks.py",
    Path(__file__).resolve().parent / "sale_package.py",
)


def tree_inputs(upto: int) -> list[Path]:
    """その日のツリーの中身を決める入力を全部返す。

    撮影側がツリーの古さを測るのに使う。教材と配布物だけを見ると、借り物
    （`globals.css` や `package.json`）と、組み立て方そのもの（このファイル）の
    変更を取りこぼす。取りこぼすと古いツリーのまま撮れて、画像だけが前の
    アプリのまま残る。撮れてしまうから、あとから誰も気づけない。
    """
    return [
        *day_sources(upto),
        *(src for _, src in scaffold_copies()),
        *(REPO_ROOT / name for name in BORROWED_FILES),
        # 複写やのうて write_reader_tsconfig が読んで書き直す入力。借り物の一覧に
        # 載せると中身がそのまま置かれて、読者の手元と違う設定で検査してしまう。
        # だから一覧には入れず、古さを測る材料としてここだけで数える。
        REPO_ROOT / "tsconfig.json",
        *BUILDER_SOURCES,
    ]


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


def _member_end(lines: list[str], start: int) -> int:
    """start 行から始まる要素が終わる行の次を返す。

    括弧の深さで見る。深さが0へ戻って、その行が `,` か `;` で終わったところが切れ目。
    """
    depth = 0
    for i in range(start, len(lines)):
        masked = mask_code(lines[i])
        depth += sum(masked.count(c) for c in "{([") - sum(masked.count(c) for c in "})]")
        if depth <= 0 and i > start and masked.rstrip().endswith((",", ";")):
            return i + 1
        if depth <= 0 and i > start and not masked.strip():
            return i
    return len(lines)


def insert_fragment(text: str, name: str, where: str, fragment: str) -> str | None:
    """`name` の直後／前へ fragment を差し込む。差し込み先が無ければ None。

    見つからないときに黙って足さない。位置の分からない差し込みを末尾へ付けると、
    閉じ括弧の外へ手続きが1本出た壊れたファイルになる。

    名前が識別子1つでないとき（`menuItems.map` のような式）は、その文字列を含む行を
    差し込み先と見る。JSX の中へ1項目足す指示がこの形になる（day24 のサイドバーの
    管理者リンク）。式の終わりは括弧の収支で見る。`))}` は `,` でも `;` でも終わらないので、
    要素を切る `_member_end` では次の宣言まで飲み込んでしまう。
    """
    lines = text.split("\n")
    if IDENTIFIER_ONLY.match(name):
        pattern = re.compile(ANCHOR.format(name=re.escape(name)))
        for i, line in enumerate(lines):
            if not pattern.match(line):
                continue
            at = i if where == "前に追加" else _member_end(lines, i)
            return "\n".join(lines[:at] + fragment.split("\n") + lines[at:])
        return None
    # 式で指された差し込み先は、1つに決まるときだけ使う。同じ式が2箇所にあると
    # 教材が指していない側へ入れてしまい、型検査は通っても画面が別物になる。
    hits = [i for i, line in enumerate(lines) if name in mask_code(line)]
    if not hits:
        # 教材が指す目印にクラス名が入ることがある（`className="flex gap-2 w-full`）。
        # マスクすると文字列の中身が消えて当たらんので、そのときだけ生の行で探す。
        # 1つに決まるときだけ使う条件は同じ。
        hits = [i for i, line in enumerate(lines) if name in line]
    if len(hits) != 1:
        return None
    i = hits[0]
    at = i if where == "前に追加" else _declaration_end(lines, i)
    return "\n".join(lines[:at] + fragment.split("\n") + lines[at:])


def operation_head(lines: tuple[str, ...]) -> str:
    """そのチャンクが何をする指示かを表す最初の行。

    チャンクの見出しと、貼る位置の説明1行を飛ばす。どちらも教材のメタ情報で、
    その下から本当の中身が始まる。
    """
    body = [line for line in strip_chunk_label(lines) if line.strip()]
    if body and LEAD_COMMENT.match(body[0]):
        body = body[1:]
    return body[0] if body else ""


def replace_element(text: str, name: str, fragment: str) -> str | None:
    """`<name ...>` を fragment へ丸ごと置き換える。置き換え先が1つに決まらなければ None。

    同じ名前の要素が複数あるときは、どれを指しているか決められない。`<Card>` が7つある
    画面で最初の1つを書き換えると、教材が指していない場所を壊す。決められないときは
    触らずに返す。
    """
    lines = text.split("\n")
    starts = [i for i, line in enumerate(lines) if re.match(rf"^\s*<{re.escape(name)}\b", line)]
    if len(starts) != 1:
        return None
    start = starts[0]
    end = _element_end(lines, start, name)
    if end is None:
        return None
    return "\n".join(lines[:start] + fragment.split("\n") + lines[end:])


def rewrite_element(text: str, mark: str, fragment: str) -> str | None:
    """`mark` を含む行から始まる要素を fragment へ丸ごと置き換える。決まらなければ None。

    `replace_element` はタグ名で探すので、`<div>` のように何十個もある要素は指せん。
    こちらは行の中の文字列で1つに絞ってから、同じ要素の終わりの見つけ方を借りる。
    """
    lines = text.split("\n")
    hits = [i for i, line in enumerate(lines) if mark in line]
    if len(hits) != 1:
        return None
    start = hits[0]
    name = TAG_NAME.search(lines[start])
    if name is None:
        return None
    end = _element_end(lines, start, name.group(1))
    if end is None:
        return None
    return "\n".join(lines[:start] + fragment.split("\n") + lines[end:])


def rewrite_span(text: str, start_mark: str, end_mark: str, fragment: str) -> str | None:
    """`start_mark` の行から `end_mark` の要素の終わりまでを fragment へ置き換える。

    並んだ2つの要素を1つの入れ物へ包み直す書き直しに使う。片方だけを対象にすると、
    もう片方が新しい入れ物の外に残って二重になる。どちらの目印も1つに決まらなければ触らない。
    """
    lines = text.split("\n")
    starts = [i for i, line in enumerate(lines) if start_mark in line]
    if len(starts) != 1:
        return None
    start = starts[0]
    ends = [i for i, line in enumerate(lines) if i >= start and end_mark in line]
    if len(ends) != 1:
        return None
    name = TAG_NAME.search(lines[ends[0]])
    if name is None:
        return None
    end = _element_end(lines, ends[0], name.group(1))
    if end is None:
        return None
    return "\n".join(lines[:start] + fragment.split("\n") + lines[end:])


def split_leading_imports(lines: tuple[str, ...]) -> tuple[list[str], list[str]]:
    """先頭に固まった import と、その後ろの本体に切り分ける。

    教材は「持ち込みを1行足して、その下に JSX を書き直す」を1枚のブロックへ載せる
    ことがある（day28 の Step 2 と Step 3）。丸ごと import と見なすと JSX が落ち、
    丸ごと本体と見なすと import 行が JSX の中へ紛れ込む。先頭だけ剥がして別に扱う。
    """
    body = strip_chunk_label(lines)
    joined = join_imports("\n".join(body))
    cut = 0
    seen_import = False
    for i, line in enumerate(joined):
        stripped = line.strip()
        if stripped.startswith("import "):
            seen_import, cut = True, i + 1
            continue
        # 持ち込みの後ろに続く `//` の覚え書きも一緒に剥がす。残すと JSX の中へ
        # `// タスク一覧の grid レイアウト` がそのまま出て、構文として通らん。
        if not stripped or LEAD_COMMENT.match(line):
            if seen_import:
                cut = i + 1
            continue
        break
    if not seen_import:
        return [], list(body)
    return joined[:cut], joined[cut:]


def _declaration_end(lines: list[str], start: int) -> int:
    """start 行から始まる宣言が終わる行の次を返す。

    `_member_end` は使えない。あちらはオブジェクトの要素を切る道具で、深さが0へ戻った行が
    `,` か `;` で終わっているかを見る。関数宣言の終わりは `}` だけなので当たらず、次に来る
    空行まで走る。空行が無ければ次の宣言まで飲み込む（`buildTaskFormValues` の置き換えが
    後ろの `export function TaskDialog` ごと消して、day15 以降が丸ごとビルドできなくなった）。
    宣言は括弧の収支が0へ戻ったところで終わる。見るのはそれだけでよい。
    """
    depth = 0
    for i in range(start, len(lines)):
        masked = mask_code(lines[i])
        depth += sum(masked.count(c) for c in "{([") - sum(masked.count(c) for c in "})]")
        if depth <= 0:
            return i + 1
    return len(lines)


def replace_declaration(text: str, name: str, fragment: str) -> str | None:
    """トップレベルの `name` の宣言を fragment へ丸ごと置き換える。決まらなければ None。

    教材はその日の変更を「増やした項目まで含めた宣言の全文」で出すことがある。差し込みでも
    要素の書き換えでもないので、宣言そのものを差し替える。行頭で始まる宣言だけを見るのは、
    関数の中の `const` まで拾うと、同じ名前の局所変数を書き換えてしまうため。
    見つかる宣言が1つに決まらないときは触らない。
    """
    pattern = re.compile(rf"^(?:export\s+)?(?:const|let|var|function|async\s+function)\s+{re.escape(name)}\b")
    lines = text.split("\n")
    starts = [i for i, line in enumerate(lines) if pattern.match(line)]
    if len(starts) != 1:
        return None
    start = starts[0]
    end = _declaration_end(lines, start)
    return "\n".join(lines[:start] + fragment.split("\n") + lines[end:])


def declares(text: str, name: str) -> bool:
    """その名前の宣言が、字下げされていても既にあるか。"""
    return re.search(ANCHOR.format(name=re.escape(name)), text, re.M) is not None


def fragment_declares(fragment: str) -> list[str]:
    """その抜粋が新しく作る、行頭の宣言の名前。"""
    return [m.group(1) for m in (DECL_HEAD.match(line) for line in fragment.split("\n")) if m]


def add_declaration(text: str, fragment: str) -> str | None:
    """まだ無い宣言を、部品の本体で最初に抜ける行の直前へ足す。置き場が無ければ None。

    教材は Day ごとに「その日から使う値」を1つずつ増やす。増やす側は書き直しではないので
    `replace_declaration` では当たらず、黙って落ちていた。day28 の一括操作は、選択中の集合から
    数え方・一括更新まで22箇所が全部これで落ち、Day 28 を終えたはずのツリーにチェックボックスが
    1つも無かった（写真も完成版アプリのものを流用したままになっていた）。

    足す先を「本体で最初に抜けるかもしれん行の直前」に決めると、教材が並べた順のまま
    後ろへ伸びるので、後の宣言が前の宣言を参照する並び（`canCompleteSelected` が
    `selectableTasks` を見る）がそのまま保たれる。早い return の手前なので、
    hook が条件分岐の内側で呼ばれる形にもならん。
    """
    # 1つの抜粋が宣言を2本足すことがある（mutation とそれを呼ぶハンドラー）。
    # 先頭の名前だけを見て足すと、`完成版` 側の同じ抜粋が2本目を二重に置く。
    if any(declares(text, name) for name in fragment_declares(fragment)):
        return None
    lines = text.split("\n")
    at, depth = None, 0
    for i, line in enumerate(lines):
        # 深さ1 = 部品の本体。0 はモジュールの直下、2 以上はハンドラーの中。
        if depth == 1 and COMPONENT_GUARD.match(line):
            at = i
            break
        masked = mask_code(line)
        depth += masked.count("{") - masked.count("}")
    if at is None:
        return None
    return "\n".join(lines[:at] + fragment.split("\n") + lines[at:])


def object_keys(text: str) -> frozenset[str]:
    """オブジェクトリテラルの欄名の集合。"""
    return frozenset(OBJECT_KEY.findall(mask_code(text)))


def append_array_element(text: str, fragment: str) -> str | None:
    """オブジェクト1件の抜粋を、同じ形の要素が並ぶ配列の末尾へ足す。決まらなければ None。

    day21 の `app-layout.tsx` は `{ text: 'レポート', icon: ..., path: ... },` だけを出し、
    どの配列へ入れるかは本文の散文でしか言わない。散文はブロックに残らないので、
    **要素の形**で行き先を決める。欄名の集合が同じ要素で埋まっている配列が1つだけなら、
    そこへ入れる。0個でも2個以上でも触らない。
    """
    keys = object_keys(fragment)
    if not keys:
        return None
    lines = text.split("\n")
    hits: list[tuple[int, int]] = []
    for i, line in enumerate(lines):
        if not (DECL_HEAD.match(line) and line.rstrip().endswith("[")):
            continue
        end = _declaration_end(lines, i)
        body = "\n".join(lines[i + 1 : end - 1])
        elements = [e for e in re.findall(r"^  \{$.*?^  \},$", body, re.M | re.S)]
        if elements and all(object_keys(e) == keys for e in elements):
            hits.append((i, end))
    if len(hits) != 1:
        return None
    _, end = hits[0]
    # 閉じの `];` の1行前へ入れる。要素の並びは教材が書いた順のまま後ろへ伸びる。
    return "\n".join(lines[: end - 1] + fragment.split("\n") + lines[end - 1 :])


def _tag_open_end(lines: list[str], start: int) -> tuple[int | None, bool]:
    """開始タグが閉じる行と、それが自己終了（`/>`）かを返す。

    属性の中の `>` は数えない。`onClick={() => x}` の `>` は波括弧の内側にあるので、
    深さを見れば開始タグの終わりと区別できる。

    引用符は行をまたいで持ち回る。`mask_code` は1行ずつしか見んので、
    `className="grid gap-6` から `xl:grid-cols-4">` まで3行に折り返した開始タグでは、
    最後の行が文字列の途中から始まっとることが分からず `>` を消してしまう。
    開始タグが閉じん判定になり、要素の終わりが後ろの `</div>` まで伸びて、
    書き直しが関係の無い所まで飲み込む（day28 の一覧グリッドが後ろのダイアログ2つを
    巻き込んで消した）。
    """
    depth = 0
    quote = ""
    for i in range(start, len(lines)):
        line = lines[i]
        for j, c in enumerate(line):
            if quote:
                if c == quote and (j == 0 or line[j - 1] != "\\"):
                    quote = ""
            elif c in "\"'`":
                quote = c
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            elif c == ">" and depth == 0:
                return i, j > 0 and line[j - 1] == "/"
    return None, False


def _element_end(lines: list[str], start: int, name: str) -> int | None:
    """`<name` が始まる行から、その要素が終わる行の次を返す。閉じが無ければ None。"""
    opened, self_closing = _tag_open_end(lines, start)
    if opened is None:
        return None
    if self_closing:
        return opened + 1
    depth = 1
    for k in range(opened + 1, len(lines)):
        masked = mask_code(lines[k])
        depth += len(re.findall(rf"<{re.escape(name)}\b", masked))
        depth -= len(re.findall(rf"</{re.escape(name)}\s*>", masked))
        if depth <= 0:
            return k + 1
    return None


# 抜粋が自分で束ねる名前を拾う道具。引数と、抜粋の中の宣言。ここを数えんと
# `setSelectedTasks((prev) => ...)` の `prev` や `mutationFn: (ids: string[]) => ...` の
# `ids` が「まだファイルに無い名前」に見えて、当てられるはずの抜粋が落ちる
# （day28 の一括操作は22箇所が全部これで消え、Day 28 を終えたツリーに
# チェックボックスが1つも無かった）。
ARROW_PARAMS = re.compile(r"\(([^()]*)\)\s*(?::[^=]*?)?=>")
FUNCTION_PARAMS = re.compile(r"\bfunction\s*[A-Za-z_$][\w$]*\s*\(([^()]*)\)")
LOCAL_BINDING = re.compile(r"\b(?:const|let|var)\s+([^=;\n]+?)\s*=")
CATCH_PARAM = re.compile(r"\bcatch\s*\(\s*([A-Za-z_$][\w$]*)")
FOR_BINDING = re.compile(r"\bfor\s*\(\s*(?:const|let|var)\s+([^;\n]+?)\s+(?:of|in)\b")


# `mutate({ ids: selectedTaskList.map(...) })` の `ids` は渡す先の欄名であって、
# そのファイルに宣言が要る名前やない。`{` `,` `(` `=>` の直後に来る `名前:` だけを欄名と見る。
# 三項演算子の `a ? b : c` の `b` は `?` の後ろなので当たらん。
OBJECT_KEY_REF = re.compile(r"(?:^|[{,(]|=>)\s*([A-Za-z_$][\w$]*)\s*:", re.M)


def bound_names(fragment: str) -> set[str]:
    """その抜粋が自分の中で束ねる名前。引数・局所宣言・catch・for の変数。"""
    masked = mask_code(fragment)
    out: set[str] = set()
    for pattern in (ARROW_PARAMS, FUNCTION_PARAMS, LOCAL_BINDING, CATCH_PARAM, FOR_BINDING):
        for group in pattern.findall(masked):
            out.update(IDENTIFIER.findall(group))
    return out


def introduces_unknown_names(text: str, fragment: str) -> bool:
    """その抜粋が、今のファイルに無い名前を持ち込むなら True。

    要素の書き換えは、その日の変更のうち画面に出る一部でしかないことがある。
    day28 の `src/app/task/page.tsx` は `<DeleteConfirmDialog>` の書き換えと一緒に
    `bulkDeleteDialogOpen` や `bulkDeleteMutation` の宣言も足すが、宣言のほうは
    貼る位置の指示が無いので当てられない。書き換えだけ当てると、宣言の無い名前を
    参照する半端なファイルになる。片方しか当てられんときは、両方とも当てない。
    """
    known = set(IDENTIFIER.findall(text)) | bound_names(fragment)
    # 文字列の中身は名前ではない。潰さずに数えると `path: '/search'` の `search` を
    # 「まだ無い名前」と見て、当てられるはずの抜粋を落とす（day20 のサイドバーがこれで
    # 「検索」を落としていた）。中身を消しても桁と行は変わらないので、位置はずれない。
    keys = set(OBJECT_KEY_REF.findall(mask_code(fragment)))
    referenced = {
        name
        for expr in BRACED.findall(mask_code(fragment))
        for name in REFERENCE.findall(expr)
        if name not in NOT_A_REFERENCE and name not in keys
    }
    return any(name not in known for name in referenced)


def join_imports(text: str) -> list[str]:
    """複数行に折り返された import 文を1行へ畳んだ行の並びを返す。

    教材は `import {` で改行して名前を縦に並べる書き方をよく使う。1行ずつ見る判定では
    2行目以降が import に見えず、import だけのチャンクを見落とす。
    """
    lines = text.split("\n")
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.lstrip().startswith("import ") and "{" in line and "}" not in line:
            buf = [line.strip()]
            i += 1
            while i < len(lines):
                buf.append(lines[i].strip())
                if "}" in lines[i]:
                    break
                i += 1
            out.append(re.sub(r"\s+", " ", " ".join(buf)))
        else:
            out.append(line)
        i += 1
    return out


def merge_imports(text: str, fragment: str) -> str | None:
    """import だけの抜粋を、今のファイルの import へ足し合わせる。

    同じ持ち込み元の import が既にあれば名前を足し合わせる。消さずに足すだけにするのは、
    抜粋が「その日の完成形」でも、こちらが採っとる版のほうが後ろの名前を持っとる場合が
    あるためである。持ち込み元が無ければ、最後の import の下へ1行足す。

    day28 の `src/server/api/routers/task.ts` は `（既存の Prisma import を置き換える）` として
    `ProjectMemberRole` と `PermissionKey` を持ち込む。これを当てんと、同じ日の
    差し込みが入れた `buildBulkPermissionWhere` が名前を解決できずに落ちる。
    """
    lines = join_imports(fragment)
    if not any(line.strip() for line in lines) or not all(IMPORT_ONLY.match(l) for l in lines):
        return None
    out = join_imports(text)
    changed = False
    for line in lines:
        m = IMPORT_LINE.match(line.strip())
        if not m:
            continue
        names = [n.strip() for n in m.group(1).split(",") if n.strip()]
        source = m.group(3)
        for i, existing in enumerate(out):
            e = IMPORT_LINE.match(existing.strip())
            if e and e.group(3) == source:
                have = [n.strip() for n in e.group(1).split(",") if n.strip()]
                merged = have + [n for n in names if n not in have]
                out[i] = f"import {{ {', '.join(merged)} }} from '{source}';"
                changed = True
                break
        else:
            last = max(
                (i for i, l in enumerate(out) if l.startswith("import ")), default=-1
            )
            out.insert(last + 1, line.strip())
            changed = True
    return "\n".join(out) if changed else None


def apply_insertions(text: str, blocks: list[Block], after_day: int) -> str:
    """採った版より後の日の「どこへ入れるか」付きの抜粋を、順に差し込む。

    採った版が day15 で day21 を組むとき、day16〜21 が足した手続きはどの版にも入っていない。
    注記が差し込み先を名指ししているものだけを、日の順に入れる。
    """
    ordered = sorted(blocks, key=lambda x: (x.day, x.lineno))
    for i, b in enumerate(ordered):
        if b.day <= after_day:
            continue
        m = INSERT_NOTE.match(b.note)
        rewrite = None if m else REWRITE_NOTE.match(b.note)
        span = None if (m or rewrite) else REWRITE_SPAN_NOTE.match(b.note)
        imports = merge_imports(text, render([b]))
        if imports is not None:
            # import だけのチャンクは、差し込み先の指示が無くても置き場所が決まる。
            text = imports
            continue
        # 持ち込みと本体が同じチャンクに同居しとるときは、先頭の import だけ先に足す。
        lead, rest = split_leading_imports(b.lines)
        if lead and rest:
            partial = merge_imports(text, "\n".join(lead))
            if partial is not None:
                text = partial
            b = b._replace(lines=tuple(rest))
        head = operation_head(b.lines)
        element = None if (m or rewrite or span) else ELEMENT_HEAD.match(head)
        # 要素の書き換え・宣言の書き直し・配列への1要素追加は、`完成版` の目印が付いていても
        # 当てる。要素だけを外していたが、Step の節が省略記号（`// ...` の類）を含む日は
        # そちらが落ち、全文が `完成版` の側にしか無い（day16 の `<TaskCard>`）。
        # ここまで来た時点で「採った版の日より後」に絞れており、採られなかった `完成版` は
        # その日の全文ではなく抜粋である。抜粋なら当てるのが実物に近い
        # （day20 の `menuItems` は `完成版` の側にしか全文が無い）。
        declaration = None if (m or rewrite or span or element) else DECL_HEAD.match(head)
        is_new_binding = not (m or rewrite or span or element or declaration) and bool(
            DESTRUCTURE_HEAD.match(head)
        )
        is_element_add = not (
            m or rewrite or span or element or declaration or is_new_binding
        ) and bool(OBJECT_ELEMENT_HEAD.match(head))
        if not (m or rewrite or span) and (
            b.note or not (element or declaration or is_new_binding or is_element_add)
        ):
            continue
        # 差し込む1本が複数チャンクに割れていることがある。先頭だけに差し込み先の注記が付き、
        # 続きは `（同じファイルの続き）` になる。続きを落とすと手続きが途中で切れる
        # （day28 の `src/server/api/routers/task.ts` が 439 行目で閉じずに落ちていた）。
        piece = [b]
        for nxt in ordered[i + 1 :]:
            if nxt.day != b.day or not CONTINUATION.search(nxt.note):
                break
            piece.append(nxt)
        body = render(piece)
        # 同じ断片が2度出る日がある。Step の節と「完成コード全体」の両方に同じものを
        # 載せる書き方で、どちらにも差し込み先の注記が付く（day24 のサイドバーの
        # 管理者リンク）。2度入れるとリンクが2本並ぶので、既に入っていれば飛ばす。
        if body.strip() and body in text:
            continue
        if not (m or rewrite or span) and (
            any(ELISION.match(line) for line in body.split("\n"))
            or introduces_unknown_names(text, body)
        ):
            continue
        if m:
            merged = insert_fragment(text, m.group(1), m.group(2), body)
        elif rewrite is not None:
            merged = rewrite_element(text, rewrite.group(1), body)
        elif span is not None:
            merged = rewrite_span(text, span.group(1), span.group(2), body)
        elif element is not None:
            merged = replace_element(text, element.group(1), body)
        elif declaration is not None:
            # 1つの抜粋が宣言を2本足すことがある（mutation とそれを呼ぶハンドラー）。
            # 書き直しが届くのは先頭の1本だけなので、2本目が既にあると二重になる。
            extra = [n for n in fragment_declares(body) if n != declaration.group(1)]
            if any(declares(text, name) for name in extra):
                merged = None
            else:
                merged = replace_declaration(text, declaration.group(1), body)
                if merged is None and not declares(text, declaration.group(1)):
                    merged = add_declaration(text, body)
        elif is_new_binding:
            merged = add_declaration(text, body)
        else:
            merged = append_array_element(text, body)
        if merged is not None:
            text = merged
    return text


def exported_names(text: str) -> set[str]:
    """そのソースが外へ出す名前を返す。"""
    names = set(EXPORT_NAME.findall(text))
    for group in EXPORT_LIST.findall(text):
        for item in group.split(","):
            head = item.strip().split(" as ")[-1].strip()
            if head:
                names.add(head)
    return names


@cache
def scaffold_exports() -> dict[str, frozenset[str]]:
    """scaffold が配るファイルが、それぞれ外へ出す名前。"""
    out: dict[str, frozenset[str]] = {}
    for dest, src in scaffold_copies():
        if src.suffix in {".ts", ".tsx"}:
            out[dest] = frozenset(exported_names(src.read_text(encoding="utf-8")))
    return out


def replaces_scaffold_file(target: str, text: str) -> bool:
    """教材のこの版で、scaffold の配布物を置き換えてよいか。

    配布物が外へ出す名前を全部含んでいるときだけ置き換える。教材はこの手のファイルへ
    関数1本だけの抜粋も出しており、それを丸ごとの書き直しと見なすと、配布物にしか
    無い名前が消える。`src/lib/constant/status.ts` がこれで、教材の抜粋は
    `isTaskStatus` 1本しか無いのに `TASK_STATUS` まで持っていってしまっていた。
    """
    required = scaffold_exports().get(target)
    if not required:
        return False
    return required <= exported_names(text)


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
        body = render(version)
        if target in provided and not (
            is_complete_file(version) and replaces_scaffold_file(target, body)
        ):
            continue
        out = dest / target
        out.parent.mkdir(parents=True, exist_ok=True)
        if version:
            body = apply_insertions(body, blocks, version[-1].day)
        out.write_text(f"{body}\n", encoding="utf-8")
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


def error_line_pool(output: str) -> tuple[str, ...]:
    """出力から、エラーらしい行を全部抜く。件数で切らない。

    切らんのは、赤の理由を判定する側（`build_failure_is_database_only`）がここを読むため。
    3行に切った標本で判定すると、DB のエラーが先に並んだ回に後ろの prerender の
    失敗が視界から落ちて、壊れた日が通る。表示用に短くするのは別の仕事。
    """
    # stack frame は判定の前に落とす。理由は STACK_FRAME_MARK の定義に書いた。
    lines = [
        ln.rstrip()
        for ln in output.split("\n")
        if ln.strip() and not STACK_FRAME_MARK.match(ln)
    ]
    # DB マーカーを持つ行は ERROR_MARK に当たらんでも拾う。Prisma は
    # `PrismaClientInitializationError:` と `Can't reach database server ...` を
    # 別の行に吐く。マーカー側の行に error / failed の語が無いので、ERROR_MARK だけで
    # 拾うと証拠の行が消え、DB だけの失敗を DB 以外の失敗として止めてまう。
    # 本物の失敗のマーカーも拾う。`You're importing a component that needs` は
    # REAL_BUILD_FAILURE_MARKERS の中で唯一 ERROR_MARK のどの語も含まん。DB の赤と
    # 同じ出力に混ざると、この行だけプールから落ちて DB だけの失敗に見え、SKIP へ倒れる。
    hits = [
        ln
        for ln in lines
        if ERROR_MARK.search(ln)
        or any(m in ln for m in DB_LESS_PRIMARY_MARKERS + DB_LESS_CORROBORATING_MARKERS)
        or any(m in ln for m in REAL_BUILD_FAILURE_MARKERS)
    ]
    # tsc の型不一致は型の中身を丸ごと吐くので、1行が数百文字になる。原因を指すのは
    # 行頭のファイル位置とエラー番号なので、そこが読める長さで切る。
    return tuple(ln[:ERROR_LINE_WIDTH] for ln in (hits or lines))


def error_lines(output: str) -> tuple[str, ...]:
    """出力から、表示用に最初のエラー3行を抜く。

    先頭3行をそのまま採ると `> task-app@1.0.0 build` のような npm の前口上しか
    残らない。読んだ人が原因へ辿れないので、エラーらしい行を先に探す。
    """
    return error_line_pool(output)[:3]


def run_step(cmd: list[str], cwd: Path) -> tuple[bool, tuple[str, ...], tuple[str, ...]]:
    """コマンドを走らせて (成功したか, 表示用の3行, 判定用の全エラー行) を返す。

    表示用と判定用を分けるのは、3行に切った標本で赤の理由を判定すると、
    後ろに並んだ本物の失敗が視界から落ちるため。
    """
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=False)
    if proc.returncode == 0:
        return True, (), ()
    pool = error_line_pool(f"{proc.stdout}\n{proc.stderr}")
    return False, pool[:3], pool


def link_node_modules(dest: Path) -> None:
    """このリポジトリの node_modules を借りる。

    Day ごとに `npm install` を走らせると30回ぶんの時間とディスクを食う。型検査に
    要るのは型定義と生成済みの Prisma クライアントで、どちらも共有して差し支えない。
    """
    link = dest / "node_modules"
    if link.exists() or link.is_symlink():
        link.unlink()
    link.symlink_to(REPO_ROOT / "node_modules", target_is_directory=True)


def verify_tree(dest: Path) -> tuple[str, str, tuple[str, ...], tuple[str, ...], tuple[str, ...]]:
    """組んだツリーへ型検査とビルドを掛けて (tsc, build, 表示用エラー, build の全行, tsc の全行) を返す。

    build のエラー行を「全部」別で返すのは、落ちた理由を判定に使うため。表示用の3行で
    判定すると、DB のエラーが先に並んだ回に後ろの prerender の失敗が落ちる。DB の無い機械では
    `next build` が必ず赤くなるので昔は build の赤を丸ごと無視しとったが、それやと
    prerender や server/client 境界の失敗まで一緒に見逃す。理由で切り分ける。
    """
    link_node_modules(dest)
    tsc_ok, tsc_shown, tsc_all = run_step(["npx", "tsc", "--noEmit"], dest)
    build_ok, build_shown, build_all = run_step(["npm", "run", "build"], dest)
    # 両方赤い日は両方見せる。`tsc_shown or build_shown` にすると、tsc が赤い時点で
    # build の行が丸ごと消える。day11 のように tsc の赤が想定内の日で build 側に別の
    # 欠陥が入ると、走行は exit 1 なのに画面と成果物には「知っとる型エラー」しか出ず、
    # 落ちた本当の理由が読めん。
    return (
        "OK" if tsc_ok else "NG",
        "OK" if build_ok else "NG",
        tsc_shown + build_shown,
        build_all,
        tsc_all,
    )


def snapshot_day(day: int, verify: bool) -> DayResult:
    """1日ぶんを組んで判定する。"""
    try:
        dest, files = build_tree(day)
    except (OSError, ValueError) as e:
        return DayResult(day, 0, False, NOT_RUN, NOT_RUN, (f"{type(e).__name__}: {e}",))
    if not verify:
        return DayResult(day, files, True, NOT_RUN, NOT_RUN, ())
    tsc, build, errors, build_errors, tsc_errors = verify_tree(dest)
    return DayResult(day, files, True, tsc, build, errors, build_errors, tsc_errors)


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
    # SKIP は「判定してへん」であって NG やない。切り分けの表へ入れると
    # 「判定不能（未調査）」として並び、教材の欠陥を疑わせる行が生える。
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
        # 教材が先に断っとる赤は、切り分けの対象やのうて想定内。ここを TRIAGE より
        # 先に見るのは、断りのある日を「教材の欠陥」と書いてしまう事故を機械で塞ぐため。
        #
        # ただし day 番号だけで「想定内」と書いたらアカン。断り書きと中身が合わん赤は
        # `broken_days()` が異常として止めるので、そちらは exit 1 やのに**成果物だけが
        # 「想定内」と言い張る**状態になる。走行の判定と文書の判定は同じ関数を使う。
        if expected_red_holds(r):
            kind, why = "想定内（教材が本文で断っている）", EXPECTED_RED[r.day]
        else:
            kind, why = TRIAGE.get(r.day, ("判定不能（未調査）", "現物と突き合わせていない"))
        rows.append(f"| day{r.day:02d} | {_cell(kind)} | {_cell(why)} |")
    return "\n".join(rows) + "\n"


def command_line(argv: list[str]) -> str:
    """この走行を再現できるコマンド文字列。"""
    return " ".join(["python3", f"scripts/curriculum-qa/{Path(argv[0]).name}", *argv[1:]])


def write_result_doc(
    results: list[DayResult], verify: bool, command: str = "（不明）"
) -> None:
    """判定を doc/review-handoff/day-snapshots-result.md へ書き出す。

    先頭に「どのコマンドで、いつ、何日ぶん出したか」を必ず書く。この書き出しは
    単日の走行でも同じファイルを上書きするので、出どころが無いと、30日ぶんの実測が
    `--day 1` の1行に置き換わっても誰も気づけない。実際に一度それをやって、
    報告の数字を裏付ける成果物を消してしまった。
    """
    RESULT_DOC.parent.mkdir(parents=True, exist_ok=True)
    passed = sum(r.tsc == "OK" and r.build == "OK" for r in results)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    total = len(available_days())
    head = [
        "# Day スナップショットの検査結果",
        "",
        "`scripts/curriculum-qa/build_day_snapshots.py` の出力。Day N を終えた読者の",
        "手元を組み直して、型検査とビルドが通るかを見た結果である。",
        "",
        f"- 出どころ: `{command}`（{stamp} / {len(results)} 日ぶん）",
        f"- 型検査とビルド: {'実行した' if verify else '実行していない（--verify なし）'}",
        f"- tsc・build とも OK: {passed} / {len(results)} 日",
        f"- ツリーの置き場: `{SNAPSHOT_ROOT.relative_to(REPO_ROOT)}/dayNN/`",
        *(
            []
            if len(results) >= total and verify
            else [
                f"",
                f"> ⚠ この結果は全 {total} 日の通し走行ではない"
                f"（{len(results)} 日ぶん / --verify {'あり' if verify else 'なし'}）。",
                "> 通しの実測を上書きした可能性がある。証拠として出す前に",
                "> `--all --verify` を回し直して、この行が消えたことを確かめること。",
            ]
        ),
        "- tsc の NG は教材の欠陥とは限らない。教材がその日の `完成版` として",
        "  変更箇所の抜粋だけを出す日があり、道具はそれを丸ごとの書き直しとして扱う。",
        "  1件ずつ現物と突き合わせてから判断すること。下の切り分けの表を見ること。",
        "",
        "",
    ]
    body = "\n".join(head) + result_table(results) + "\n"
    RESULT_DOC.write_text(body + triage_section(results), encoding="utf-8")


# 型検査が赤になることを教材が先に断っている日。
# day11 は `project-detail-view.tsx`（配布物）が `api.project.getById` を呼ぶが、
# その手続きを読者が書くのは day12。教材はこれを隠さず、day11 本文で
# 「この時点ではエディタに `getById` が無いという型エラーが出ます。写し間違いでは
# ありません」「実際に数えると5件出ます」「Day 11 を終えた時点で `npm run build` は
# 通りません。今日は失敗して正常です」と書いている（day11 の Step 7 付近）。
# 読者の手元と道具の結果が一致しているので、これは教材の欠陥ではない。
#
# ただし緑になったら、それはそれで報告する。教材が「落ちる」と断っているのに
# 落ちなくなったなら、本文の断りが嘘になっているということなので、直す先は本文になる。
EXPECTED_RED = {
    11: "day11 は `getById` を書く前に配布物を取り込むため型エラーが5件出る。教材が本文で明示している",
}

# 断り書きが名指ししとる中身。day 番号だけで免除すると、断ってへん欠陥がその日に紛れても
# 素通りする（型エラーの1行があるだけで「想定内」に化ける）。本文が名指ししとるものと
# 突き合わせて、合わんかったら免除せん。
#
# - marker: 本文が名指しする識別子。根っこのエラーがこれに触れとること
# - count:  本文が「実際に数えると5件出ます」と書いた件数。ここがずれたら別の欠陥が混ざっとる
# - path:   赤くなる場所。配布物の1ファイルに閉じとることが断り書きの前提
#
# 波及して出る `TS7006` / `TS7053` は識別子の名を含まん（`getById` が解決でけへんことで
# 型が any へ落ちた結果や）。せやから marker は「全行」やのうて「どれか1行」に課す。
# 代わりに件数と場所を効かせて、範囲が広がったら気づけるようにしてある。
# 診断1件を「どこで・どのコードが」まで縮めた形。メッセージの尻尾は型の中身を丸ごと
# 吐くので長さで切られる。位置とコードなら切られん上に、1件でも入れ替われば必ず変わる。
DIAGNOSTIC_HEAD = re.compile(r"^(.*?\(\d+,\d+\)): error (TS\d+):")


def diagnostic_heads(errors: tuple[str, ...]) -> tuple[str, ...] | None:
    """エラー行を「位置＋コード」の多重集合へ縮める。1行でも診断の形やなければ None。"""
    heads = []
    for line in errors:
        m = DIAGNOSTIC_HEAD.match(line)
        if m is None:
            return None
        heads.append(f"{m.group(1)}:{m.group(2)}")
    return tuple(sorted(heads))


EXPECTED_RED_SIGNATURE = {
    # `diagnostics` は day11 のツリーで `npx tsc --noEmit` を実際に流して採った5件
    # （2026-08-31 実測）。**件数・場所・コードの3つでは足りん。**「TS7006 が1件消えて、
    # 同じファイルの別の場所に無関係な TS7006 が1件入る」と、件数も場所もコードも
    # 揃うたまま別の欠陥が想定内で通ってまう。位置まで名指しして、**多重集合が
    # 丸ごと一致した時だけ**免除する。教材を直して診断が変わったら、ここも実測で
    # 採り直す（＝人が断り書きを見直す機会になる）。
    11: {
        "marker": "getById",
        "path": "project-detail-view.tsx",
        "diagnostics": (
            "src/component/project/project-detail-view.tsx(144,44):TS7006",
            "src/component/project/project-detail-view.tsx(167,31):TS7053",
            "src/component/project/project-detail-view.tsx(237,43):TS7006",
            "src/component/project/project-detail-view.tsx(246,26):TS7053",
            "src/component/project/project-detail-view.tsx(29,47):TS2339",
        ),
        # `next build` は最初の型エラー1件で止まる。包み紙を除いたあとに、本文で
        # 断っている根っこの診断だけが残ることも固定する。
        "build_count": 1,
    },
}


def expected_red_errors(result: DayResult) -> list[str]:
    """その日の tsc の赤のうち、型エラーとして数える行。"""
    return [line for line in result.tsc_errors if TYPE_ERROR_MARK.search(line)]


def tsc_failure_is_expected(result: DayResult) -> bool:
    """tsc の赤が、教材の断り書きが名指ししとるものと一致するか。

    day 番号だけで免除すると、day11 に無関係な型の欠陥が入っても「想定内」で通る。
    本文は識別子・件数・場所まで書いとるので、そこまで見て初めて免除する。
    """
    signature = EXPECTED_RED_SIGNATURE.get(result.day)
    if signature is None:
        return False
    errors = expected_red_errors(result)
    if not any(signature["marker"] in line for line in errors):
        return False
    if not all(signature["path"] in line for line in errors):
        return False
    # 位置まで名指しした多重集合が丸ごと一致した時だけ免除する。件数・コードの一致では
    # 「1件消えて別の場所に1件入る」入れ替わりを見逃す。
    return diagnostic_heads(errors) == tuple(sorted(signature["diagnostics"]))

# `next build` が DB へ届かんかったときだけ出る文言。DB を持たん機械では必ず出るので、
# これに当たる赤は教材の欠陥を指さん。逆に、ここに当たらん build の赤は
# prerender や server/client 境界の失敗なので、見逃したら壊れた日を通してしまう。
#
# ここへ入れんもの（どれも「DB が無い」の印に見えて、実際は壊れとる側の印。入れると
# 本物の欠陥が SKIP へ落ちて exit 0 になる — いちばんやったらアカン向きの見逃し）:
#
# - `Error validating datasource`: DB へ届かんことやのうて、スキーマの datasource
#   ブロックが不正でも出る。`npm run build` は `prisma generate` から始まるので、
#   provider の書き間違いがそのまま「DB の不在」に化ける。
# - `Environment variable not found: ...`: `copy_scaffold()` が `.env.example` を必ず
#   `.env` へ複写しており、その `.env.example` は `DATABASE_URL` を定義しとる。つまり
#   DB の無い機械でも変数は在る。無いと言われたのなら組んだツリーか schema が壊れとる印。
#   逆向きに `REAL_BUILD_FAILURE_MARKERS` へ入れて、必ず赤で止めとる。
# - `the database server at`: Prisma の**認証失敗**（P1000）の文面にも入っとる
#   （実測: `@prisma/client` の中に
#   `provide valid database credentials for the database server at the configured address`）。
#   あれは届いた上で資格情報が違う話なので、DB の不在やない。数えると資格情報の設定ミスが
#   SKIP へ落ちて exit 0 になる。届かんかった回の文面は
#   `Can't reach database server at ...` で、上の印で拾えるので要らん。
# - `P1012`: Prisma のスキーマ検証エラー全般の番号で、DB へ届かんことの印やない。
#   壊れたリレーションや型の書き間違いでも出る。
# - `PrismaClientInitializationError`: 接続でけへんときにも出るが、接続文字列が不正なとき
#   や query engine が欠けとるときにも同じ例外名が出る。名前だけで DB の不在に倒すと、
#   その2つが SKIP へ落ちて exit 0 になる。DB へ届かんかった回は必ず
#   `Can't reach database server` か `P1001` を一緒に吐くので、そっちで拾えば足りる
#   （判定用のプールは ERROR_MARK に当たらん行も、この一覧の語を含む行なら残す）。
# それ1行で「DB へ届いてへん」と言い切れる印。
DB_LESS_PRIMARY_MARKERS = (
    "Can't reach database server",
    # DB へ届かんことを指す Prisma のエラーコード。
    "P1001",
)

# それ単独では DB と言えん印。`ECONNREFUSED` は OS が返す汎用の接続拒否で、
# Redis や別の localhost 依存でも出る（例: `Error: connect ECONNREFUSED 127.0.0.1:6379`）。
# 単独で DB マーカーに数えると、その1行だけの出力が「DB だけの失敗」に見えて SKIP へ落ち、
# 壊れた日が exit 0 で出ていく。上の印が同じ出力に居るときだけ、裏付けとして数える。
DB_LESS_CORROBORATING_MARKERS = ("ECONNREFUSED",)


def db_less_markers(errors: tuple[str, ...]) -> tuple[str, ...]:
    """この出力で DB の不在の印として数えてよいものを返す。"""
    if any(
        any(marker in line for marker in DB_LESS_PRIMARY_MARKERS) for line in errors
    ):
        return DB_LESS_PRIMARY_MARKERS + DB_LESS_CORROBORATING_MARKERS
    return DB_LESS_PRIMARY_MARKERS


BUILD_SKIPPED = "SKIP"


# build が本当に壊れとることの印。Next.js の一般的なラッパー行は
# `BUILD_NOISE_MARKERS` へ置く。あれは原因やのうて包み紙で、DB の失敗も同じ言葉で包まれる。
# ここに入れてええのは「これが出とったら DB の有無に関係なく壊れとる」と言い切れるものだけ。
REAL_BUILD_FAILURE_MARKERS = (
    "TypeError",
    "ReferenceError",
    "SyntaxError",
    "Module not found",
    "Type error:",
    "You're importing a component that needs",
    "Cannot find module",
    # 環境変数の欠落。`.env` は `copy_scaffold()` が毎回書くので、無いと言われた時点で
    # 組んだツリーか schema の側が壊れとる。`PrismaClientInitializationError` と一緒に
    # 出るため、ここへ入れて DB マーカーより先に赤で止める（`has_real_build_failure` が
    # 先に効く）。
    "Environment variable not found",
)


def has_real_build_failure(errors: tuple[str, ...]) -> bool:
    """DB の有無に関係なく壊れとると言い切れる行があるか。"""
    return any(
        any(marker in line for marker in REAL_BUILD_FAILURE_MARKERS)
        for line in errors
    )


def build_failure_is_database_only(errors: tuple[str, ...]) -> bool:
    """build の赤に DB の不在が絡んどるか（＝この機械では build を判定できんか）。

    以前はここで「DB だけで説明できる赤か」を行ごとに当てにいっとった。それは3回直して
    3回とも別の文言で破れた。`next build` は根本原因を Next.js のラッパー行
    （`Failed to collect page data for /dashboard` 等）で包んで出すので、行の文言から
    「DB か、それ以外か」を当てる限り、ラッパーが1つ増えるたびに判定が壊れる。

    せやから判定を放棄する側へ倒した。DB のマーカーが1つでもあれば、この機械では
    build の結果に意味が無い。**通す（OK 扱い）のではなく、判定せんかったこと自体を
    SKIP として残して数える。**「検証した」と言わんので、DB の赤に紛れた本物の失敗を
    緑と report してしまう事故は起きん。DB のある機械ではマーカーが出んので、
    本物の失敗はこれまでどおり止まる。
    """
    # 本物の失敗の印が1行でもあったら SKIP にせん。DB のエラーが同じ出力に居るだけで
    # 通してしまうと、壊れた日が exit 0 で出ていく。SKIP は「判定してへん」であって
    # 「無罪」やない以上、無罪の証拠が要る側はこっち。
    if has_real_build_failure(errors):
        return False
    markers = db_less_markers(errors)
    if not any(any(m in line for m in markers) for line in errors):
        return False
    # DB のマーカーが在るだけでは足りん。**全部の行**が DB か包み紙で説明できて初めて
    # 「この機械では判定でけへん」と言える。説明の付かん行が混ざっとるのは、
    # 中身の分からん失敗が DB の赤に隠れとるということ。
    return all(
        any(m in line for m in markers)
        or any(
            marker in line
            for marker in BUILD_NOISE_MARKERS + DB_TRIAGE_NOISE_MARKERS
        )
        for line in errors
    )


# 原因やのうて「包み紙」の行。`next build` は根本原因をこれで包んで出す。
# DB だけの失敗を SKIP と名乗るには、出とる全部のエラー行が DB のマーカーか
# ここに載っとる包み紙で説明できんとアカン。**ここに無い行が1つでも混ざったら、
# 中身の分からん失敗なので SKIP にせん。**マーカーの allowlist だけで「本物か」を
# 当てにいくと、載せてへん文言（例: `Error: Unauthorized while prerendering /admin`）が
# DB の赤に紛れて SKIP へ落ち、壊れた日が exit 0 で出ていく。
BUILD_NOISE_MARKERS = (
    "Failed to collect page data",
    # 型エラーの直前に必ず出る Next.js の見出し行。原因は次の `Type error:` の行。
    "Failed to compile",
    # Prisma は例外のクラス名だけの行を先に吐く。原因は次の `Can't reach ...` の行。
    "PrismaClientInitializationError",
    "Build error occurred",
    "Collecting page data",
)

# **DB の判定のときだけ**包み紙に数える行。`Error occurred prerendering page` は
# 「これが出とったら DB の有無に関係なく壊れとる」を満たさん（DB へ届かん回も同じ言葉で
# 包まれる）ので `REAL_BUILD_FAILURE_MARKERS` には置けん。かというて素の
# `BUILD_NOISE_MARKERS` へ入れると、想定内の赤の免除（`build_failure_is_expected`）まで
# この行を見逃す。**問いが別なので一覧も別にする。**
# - 「DB だけの失敗か？」→ 原因は DB 側にあるので包み紙。ここに入れる
# - 「day11 の断り書きどおりの型エラーだけか？」→ 型エラーやないので通したらアカン。入れん
# 本物の prerender の失敗は原因の行（`TypeError: ...` 等）を必ず一緒に吐き、そっちが
# プールに残って赤で止まる。包み紙1行だけの出力も DB の印が無いので本物の失敗のままや。
DB_TRIAGE_NOISE_MARKERS = ("Error occurred prerendering page",)


TYPE_ERROR_MARK = re.compile(r"Type error:|TS\d{4}")


def build_failure_is_expected(result: DayResult) -> bool:
    """EXPECTED_RED の日の build 落ちを、断り書きどおりの型エラーだけで説明できるか。

    day 番号が EXPECTED_RED に載っとるだけで build を丸ごと免除すると、断り書きに無い
    失敗（prerender や server/client 境界）がその日に紛れても素通りする。断ってあるのは
    型エラーだけなので、免除するのも型エラーで説明できる範囲だけにする。
    """
    signature = EXPECTED_RED_SIGNATURE.get(result.day)
    if signature is None:
        return False
    # 包み紙は原因やないので除く。**残りは捨てずに全部見る。**
    # マーカーで絞ってから判定すると、`REAL_BUILD_FAILURE_MARKERS` に載ってへん失敗
    # （例: `Error: Unauthorized while prerendering /admin`）が黙って消えて、
    # 断り書きどおりの型エラーだけが残り、別の欠陥を抱えた日が免除されてまう。
    real = [
        line
        for line in result.build_errors
        if not any(marker in line for marker in BUILD_NOISE_MARKERS)
    ]
    # 型エラーの証拠が1行も無いなら、断り書きで説明できたことにせん。
    if not real:
        return False
    if len(real) != signature["build_count"]:
        return False
    if not all(TYPE_ERROR_MARK.search(line) for line in real):
        return False
    # `next build` は最初の型エラーで止まるので、出てくる行は根っこのほうや。
    # 断り書きが名指しした識別子に触れてへんのなら、それは別の欠陥。
    return sum(signature["marker"] in line for line in real) == 1


def expected_red_holds(result: DayResult) -> bool:
    """その日の赤が、教材の断り書きどおりのものだけで説明できるか。

    `broken_days()` と同じ線を、成果物の文書でも使うために切り出してある。
    ここが緩むと「走行は exit 1 やのに文書は想定内と書いてある」状態が生まれる。
    """
    # ツリーを組めてへん日は、断り書きの対象外。tsc も build も走っとらんので
    # 下の2つは素通りするが、broken_days() は異常として止める。ここで False を
    # 返さんと、走行が exit 1 やのに成果物だけ「想定内」と書く。
    if not result.tree_ok:
        return False
    if result.day not in EXPECTED_RED:
        return False
    if result.tsc == "NG" and not tsc_failure_is_expected(result):
        return False
    if result.build == "NG" and not build_failure_is_expected(result):
        return False
    return True


def broken_days(results: list[DayResult]) -> list[DayResult]:
    """教材の欠陥として止めるべき日だけを返す。

    免除は「断り書きが名指ししとるものと一致したとき」だけ。日付だけで免除すると、
    その日に紛れた別の欠陥が一緒に通る。ここを関数へ出してあるのは、main() を動かさんでも
    免除の線を実際に通して確かめられるようにするため。
    """
    return [
        r for r in results
        if not r.tree_ok
        or (r.tsc == "NG" and not tsc_failure_is_expected(r))
        or (r.build == "NG" and not build_failure_is_expected(r))
    ]


def triage_build_results(results: list[DayResult]) -> list[DayResult]:
    """DB が要る赤を SKIP へ振り替えた一覧を返す。

    振り替えるだけで、通した扱いにはせん。SKIP は `broken` から外れるが、
    成功の行に件数と日付が出るので「検証した」とは読めん形で残る。
    """
    return [
        r._replace(build=BUILD_SKIPPED)
        if r.build == "NG" and build_failure_is_database_only(r.build_errors)
        else r
        for r in results
    ]


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
        # 表示の前に切り分ける。あとに回すと、画面の日別行だけ NG のまま残り、
        # 成果物と最終行だけ SKIP になって、同じ走行が3通りの状態を名乗る。
        r = triage_build_results([r])[0]
        results.append(r)
        print(f"day{n:02d}: ツリー {'OK' if r.tree_ok else 'NG'}（{r.files} ファイル） tsc {r.tsc} build {r.build}")
        for line in r.errors:
            print(f"    {line}")

    skipped = [r for r in results if r.build == BUILD_SKIPPED]

    write_result_doc(results, verify, command_line(argv))
    print(f"結果を書き出しました: {RESULT_DOC.relative_to(REPO_ROOT)}")
    broken = broken_days(results)
    # 落ちると断ってある日が通ってしまったら、本文の断りのほうが古い。
    unexpected_green = [
        r for r in results if r.day in EXPECTED_RED and r.tsc == "OK"
    ]
    for r in results:
        if r.day in EXPECTED_RED and r.tsc == "NG" and tsc_failure_is_expected(r):
            print(f"  day{r.day:02d} の型エラーは想定どおり: {EXPECTED_RED[r.day]}")
    if unexpected_green:
        for r in unexpected_green:
            print(
                f"❌ day{r.day:02d} は教材が「型エラーが出る」と断っているのに通りました。"
                "本文の断りを見直してください"
            )
        return 1
    if broken:
        print(f"❌ ツリー構築・型検査・ビルドのどれかが通らない {len(broken)} 日")
        for r in broken:
            if r.build == "NG" and r.tsc == "OK":
                print(
                    f"  day{r.day:02d} は tsc が通ってビルドだけ落ちています。"
                    "DB の不在では説明できないので、prerender か server/client 境界を疑ってください"
                )
        return 1
    if skipped:
        # 「全部緑」と読ませたらアカン。判定してへん日があることを、成功の行そのものに書く。
        days = "・".join(f"day{r.day:02d}" for r in skipped)
        print(
            f"⚠️ {len(results)} 日ぶんを組み立てましたが、build を判定できんかった日が "
            f"{len(skipped)} 件あります（この機械に DB が無い）: {days}"
        )
        print("   この走行は build を検証していません。DB のある機械で流し直してください")
        return 0
    print(f"✅ {len(results)} 日ぶんを組み立てました")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
