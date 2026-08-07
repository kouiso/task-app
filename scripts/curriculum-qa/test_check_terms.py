#!/usr/bin/env python3
"""check_terms.py の退行テスト。

このチェッカーは辞書を持たない。拾ったカタカナ語を normalize で束ね、1つの束に
2通り以上の表記が入ったら報告する、という一本道で動く。束ね方が壊れると
どの語も別々の束に落ちるだけなので、出るのは「❌ 0件」ではなく
「✅ 用語の表記ゆれなし」になる。緑のまま検出が死ぬ形で、check_tone.py で
実際に起きたのがこれ。テストが無かったので誰も気づかなかった。

見るのは5つ。
  1. normalize が畳む4軸（ヴ・小書きかな・エ段+イ・長音記号）が生きていること
  2. 畳みすぎないこと（別の語が同じ鍵に落ちない）
  3. 拾う語のしきい値（カタカナ3文字以上）
  4. 束の読み方と検査範囲（2表記で報告・多数派・ALLOW は組単位・コード除外・対象ファイル）
  5. しきい値と正規化表がこっそり緩められていないこと
"""

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import check_terms  # noqa: E402
from check_terms import (  # noqa: E402
    E_ROW,
    KATAKANA,
    SMALL_TO_LARGE,
    VU_DIGRAPHS,
    normalize,
)

# 同じ鍵に落ちるべき組。ここが割れると、揺れが2つの束に分かれて報告されなくなる。
SAME_KEY: list[tuple[str, str, str]] = [
    ("長音記号の有無を畳む", "ハンドラー", "ハンドラ"),
    ("ヴは後ろの小書きかなと組で読み替える", "ヴァリデーション", "バリデーション"),
    ("小書きかなを大書きへ寄せる", "ウェブ", "ウエブ"),
    ("エ段の後ろのイは長音の代用として畳む", "インターフェイス", "インターフェース"),
    ("4軸が重なっても同じ鍵", "ヴァリデータ", "バリデーター"),
    ("促音の小書きも畳む", "バッチ", "バツチ"),
]

# 別の鍵のままであるべき組。畳みすぎると無関係な語が「揺れ」として報告され、
# 教材の執筆が止まる。
DIFFERENT_KEY: list[tuple[str, str, str]] = [
    # エ段の判定を外して「イ」を無条件に落とすと、この2語が同じ鍵になる。
    ("エ段以外の後ろのイは残す", "タイプ", "タープ"),
    ("末尾が違えば別の鍵", "コンポーネント", "コンポーネンツ"),
    ("無関係な語は別の鍵", "コンポーネント", "コンテナ"),
]

# 拾う語の範囲。3文字未満を拾い始めると「サバ」のような別語が束に混ざる。
EXTRACT_CASES: list[tuple[str, str, list[str]]] = [
    ("2文字のカタカナは拾わない", "アイを見る", []),
    ("3文字のカタカナは拾う", "アイウを見る", ["アイウ"]),
    ("長音記号も1文字として数える", "サーバを立てる", ["サーバ"]),
    ("ひらがなは拾わない", "はんどらーを見る", []),
    ("漢字は拾わない", "関数を見る", []),
]

MAJOR = "ハンドラーを登録します。ハンドラーは1つです。ハンドラーを使います。\n"
MINOR = "ハンドラを登録します。\n"

# (テスト名, 置くファイル, 差し替える ALLOW, 期待する終了コード, 出るべき文字列, 出てはいけない文字列)
CASES: list[tuple[str, dict[str, str], set[tuple[str, str]] | None, int, list[str], list[str]]] = [
    (
        "同じ束に2通りあれば止める",
        {"day01_a.md": MAJOR, "day02_b.md": MINOR},
        None,
        1,
        ["「ハンドラー」3回 に対して「ハンドラ」1回", "day02_b.md"],
        [],
    ),
    (
        "1通りだけなら通す",
        {"day01_a.md": MAJOR},
        None,
        0,
        ["✅ 用語の表記ゆれなし"],
        [],
    ),
    (
        "3文字の表記も束に入れる",
        {"day01_a.md": "サーバーを立てます。\n", "day02_b.md": "サーバを立てます。\n"},
        None,
        1,
        ["サーバ"],
        [],
    ),
    (
        "2文字の語は束に入れない",
        {"day01_a.md": "サーバを立てます。\n", "day02_b.md": "サバを焼きます。\n"},
        None,
        0,
        ["✅"],
        [],
    ),
    (
        "コードブロックの中は検査しない",
        {"day01_a.md": MAJOR + "\n```ts\nハンドラを書く\n```\n"},
        None,
        0,
        ["✅"],
        [],
    ),
    (
        "インラインコードの中も検査しない",
        {"day01_a.md": MAJOR + "\n`ハンドラ` と書きます。\n"},
        None,
        0,
        ["✅"],
        [],
    ),
    (
        # フェンスの長さを見ないと、内側の3連が4連のブロックを閉じて中身が地の文になる。
        "4連フェンスの中の3連はブロックを閉じない",
        {"day01_a.md": MAJOR + "\n````md\n```\nハンドラ\n```\n````\n"},
        None,
        0,
        ["✅"],
        [],
    ),
    (
        "教材の命名から外れたファイルは読まない",
        {"day01_a.md": MAJOR, "notes.md": MINOR, "README.md": MINOR},
        None,
        0,
        ["✅"],
        [],
    ),
    (
        "00 と appendix も教材として読む",
        {"00_intro.md": MAJOR, "appendix_z.md": MINOR},
        None,
        1,
        ["appendix_z.md"],
        [],
    ),
    (
        "ALLOW に登録した組は見逃す",
        {"day01_a.md": MAJOR, "day02_b.md": MINOR},
        {("ハンドラ", "ハンドラ")},
        0,
        ["✅"],
        [],
    ),
    (
        # 束ごと外すと、同じ束に紛れ込んだ別の誤記まで一緒に隠れる。
        "ALLOW は束ごとではなく組で外す",
        {
            "day01_a.md": "バリデーションを書きます。バリデーションは2つです。\n",
            "day02_b.md": "ヴァリデーションを書きます。\n",
            "day03_c.md": "バリデーシヨンを書きます。\n",
        },
        {("バリデシヨン", "ヴァリデーション")},
        1,
        ["バリデーシヨン"],
        ["ヴァリデーション"],
    ),
    (
        "表記系をまたぐ揺れは範囲外",
        {"day01_a.md": "コンポーネントを作ります。\n", "day02_b.md": "component を作ります。\n"},
        None,
        0,
        ["✅"],
        [],
    ),
    (
        "出現ファイルが4つ以上なら省略記号を付ける",
        {
            "day01_a.md": MAJOR * 2,
            "day02_b.md": MINOR,
            "day03_c.md": MINOR,
            "day04_d.md": MINOR,
            "day05_e.md": MINOR,
        },
        None,
        1,
        ["day02_b.md、day03_c.md、day04_d.md…"],
        [],
    ),
]


def run(files: dict[str, str], allow: set[tuple[str, str]] | None) -> tuple[int, str]:
    """一時ディレクトリに教材を置いて main を走らせ、(終了コード, 出力) を返す。

    ALLOW はモジュール変数を直接書き換える。main が参照するのがこの集合そのもので、
    引数から差し込む口が無いため。終わったら必ず元へ戻す。
    """
    saved = set(check_terms.ALLOW)
    if allow is not None:
        check_terms.ALLOW.clear()
        check_terms.ALLOW.update(allow)
    try:
        with tempfile.TemporaryDirectory() as tmp:
            for name, body in files.items():
                (Path(tmp) / name).write_text(body, encoding="utf-8")
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
                code = check_terms.main(["check_terms.py", tmp])
            return code, buf.getvalue()
    finally:
        check_terms.ALLOW.clear()
        check_terms.ALLOW.update(saved)


def check_input_errors() -> tuple[int, int]:
    """読めない入力を 2 で返すか。0 で返すと、教材を1つも見ずに緑になる。"""
    failed = 0
    code, _ = run({}, None)
    if code != 2:
        failed += 1
        print(f"  ❌ 教材が1つも無いディレクトリで {code} を返す（期待 2）")
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
        code = check_terms.main(["check_terms.py", "/no/such/dir"])
    if code != 2:
        failed += 1
        print(f"  ❌ 存在しないディレクトリで {code} を返す（期待 2）")
    return failed, 2


def check_report_order() -> tuple[int, int]:
    """1つの束に少数派が2つ以上あるとき、出現回数の少ない順に報告するか。

    多い順に並ぶと、いちばん珍しい誤記——つまり1箇所直せば消えるものが報告の
    後ろへ回る。束の読み方は変わらないので終了コードは 1 のままで、
    並べ替えを外したことに終了コードでは気づけない。
    """
    files = {
        "day01_a.md": "バリデーションを書きます。バリデーションは2つ。バリデーションは3つ。\n",
        "day02_b.md": "ヴァリデーションを書きます。ヴァリデーションも書きます。\n",
        "day03_c.md": "バリデーシヨンを書きます。\n",
    }
    code, out = run(files, None)
    if code != 1:
        print(f"  ❌ 少数派が2つある束で終了コード {code}（期待 1）\n{out}")
        return 1, 1
    rare = out.find("「バリデーシヨン」1回")
    common = out.find("「ヴァリデーション」2回")
    if rare < 0 or common < 0:
        print(f"  ❌ 少数派2つのうち報告されていないものがあります\n{out}")
        return 1, 1
    if rare > common:
        print(f"  ❌ 少数派の報告が出現回数の少ない順になっていません\n{out}")
        return 1, 1
    return 0, 1


def check_guards() -> tuple[int, int]:
    """しきい値と正規化表が緩められていないか見る。"""
    failed = 0
    if KATAKANA.pattern != r"[ァ-ヶー]{3,}":
        failed += 1
        print(f"  ❌ KATAKANA が {KATAKANA.pattern} に変えられています")
    if set(VU_DIGRAPHS) != {"ヴァ", "ヴィ", "ヴゥ", "ヴェ", "ヴォ", "ヴャ", "ヴュ", "ヴョ"}:
        failed += 1
        print(f"  ❌ VU_DIGRAPHS の組が {sorted(VU_DIGRAPHS)} に変えられています")
    if "ァィゥェォャュョヮッ".translate(SMALL_TO_LARGE) != "アイウエオヤユヨワツ":
        failed += 1
        print("  ❌ SMALL_TO_LARGE の写像が変えられています")
    if set(E_ROW) != set("エケセテネヘメレゲゼデベペ"):
        failed += 1
        print(f"  ❌ E_ROW が {E_ROW} に変えられています")
    # 鍵だけの登録を許すと ALLOW が束ごとの除外に化け、同じ束の誤記まで隠れる。
    bad = [e for e in check_terms.ALLOW if not (isinstance(e, tuple) and len(e) == 2)]
    if bad:
        failed += 1
        print(f"  ❌ ALLOW に (鍵, 表記) の形でない要素があります: {bad}")
    return failed, 5


def main() -> int:
    failed = 0

    for name, left, right in SAME_KEY:
        if normalize(left) != normalize(right):
            failed += 1
            print(f"  ❌ {name}: {left}→{normalize(left)} と {right}→{normalize(right)} が別の鍵")

    for name, left, right in DIFFERENT_KEY:
        if normalize(left) == normalize(right):
            failed += 1
            print(f"  ❌ {name}: {left} と {right} がどちらも {normalize(left)} に潰れています")

    for name, text, expected in EXTRACT_CASES:
        got = KATAKANA.findall(text)
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")

    for name, files, allow, want_code, contains, absent in CASES:
        code, out = run(files, allow)
        if code != want_code:
            failed += 1
            print(f"  ❌ {name}: 終了コード 期待 {want_code} / 実際 {code}\n{out}")
            continue
        missing = [s for s in contains if s not in out]
        extra = [s for s in absent if s in out]
        if missing or extra:
            failed += 1
            print(f"  ❌ {name}: 出ていない {missing} / 出てはいけない {extra}\n{out}")

    input_failed, input_total = check_input_errors()
    failed += input_failed
    order_failed, order_total = check_report_order()
    failed += order_failed
    guard_failed, guard_total = check_guards()
    failed += guard_failed

    total = (
        len(SAME_KEY)
        + len(DIFFERENT_KEY)
        + len(EXTRACT_CASES)
        + len(CASES)
        + input_total
        + order_total
        + guard_total
    )
    if failed:
        print(f"❌ check_terms 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_terms 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
