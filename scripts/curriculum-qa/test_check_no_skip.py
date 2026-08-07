#!/usr/bin/env python3
"""check_no_skip.py の退行テスト。

このチェッカーは「### Step N:」の節ごとに、コードブロック・filepath 目印・
確認ポイントの3つがそろっているかを見る。テストが無いまま運用されていたので、
免除条件（GUI 語・対象言語・冒頭500字の窓）がこっそり広がっても誰も気づかない。
直近 check_tone.py で、正規表現が日本語で成立せず検出が一度も動いていなかった
のと同じ穴である。

見るのは次の6つ。
  1. 3つの検査項目が、そろっていれば通り、欠ければ落ちること
  2. GUI 操作ステップの免除語が全部生きていること（GUI_KEYWORDS）
  3. GUI 語でない普通の語では免除されないこと（免除条件の広がりを止める）
  4. filepath を要求する言語が全部生きていること（FILEPATH_REQUIRED_LANGS）
     大文字混じりの表記でも、正規化されて対象言語のままであること
  5. 要求しない言語では filepath を求めないこと
  6. 冒頭500字という窓が、内側・外側の両方から動いていないこと

2 と 4 があるので、免除語や対象言語を1つ削るとこのテストが落ちる。
6 は窓を広げても狭めても落ちる。
"""

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_no_skip import check_step_completeness  # noqa: E402

# 本体は結果を print と sys.exit でしか外へ出さないので、標準出力から読み戻す。
Result = tuple[int, int, dict[int, tuple[str, ...]]]


def run(text: str) -> Result:
    """(終了コード, 検出ステップ数, {ステップ番号: 不備の並び}) を返す。"""
    with tempfile.TemporaryDirectory() as d:
        target = Path(d, "day01_検証用.md")
        target.write_text(text, encoding="utf-8")
        buf = io.StringIO()
        code = 0
        with contextlib.redirect_stdout(buf):
            try:
                check_step_completeness(str(target))
            except SystemExit as e:
                code = e.code if isinstance(e.code, int) else 1
    steps = 0
    errors: dict[int, tuple[str, ...]] = {}
    for line in buf.getvalue().splitlines():
        if line.startswith("検出されたステップ数: "):
            steps = int(line.split(": ", 1)[1])
        elif line.startswith("❌ Step "):
            head, body = line[len("❌ Step "):].split(": ", 1)
            errors[int(head)] = tuple(body.split(", "))
    return code, steps, errors


def step(title: str = "実装する", body: str = "", check_point: str = "\n**確認ポイント**: 画面が出た\n") -> str:
    """検査対象を1つだけ変えられるよう、ステップの雛形を組む。"""
    return f"### Step 1: {title}\n\n{body}{check_point}"


CODE_OK = "```tsx\n// filepath: src/app/page.tsx\nconst a = 1;\n```\n"
CODE_NO_PATH = "```tsx\nconst a = 1;\n```\n"

# (テスト名, 本文, (検出ステップ数, {ステップ番号: 不備}))
CASES: list[tuple[str, str, tuple[int, dict[int, tuple[str, ...]]]]] = [
    ("3つそろっていれば通る", step(body=CODE_OK), (1, {})),
    ("コードブロックが無ければ落ちる", step(body="本文だけです。\n"), (1, {1: ("コードブロックなし",)})),
    ("filepath 目印が無ければ落ちる", step(body=CODE_NO_PATH), (1, {1: ("filepathコメントなし",)})),
    ("確認ポイントが無ければ落ちる", step(body=CODE_OK, check_point=""), (1, {1: ("確認ポイントなし",)})),
    # 確認ポイントは「✅ があるか」「確認ポイントと書いてあるか」のどちらかで足りる。
    # ここを and から or へ変えると、✅ だけの日が全部落ちる。
    ("✅ だけでも確認ポイントとして通る", step(body=CODE_OK, check_point="\n✅ 画面が出た\n"), (1, {})),
    ("不備は1ステップにまとめて並ぶ", step(body="本文だけです。\n", check_point=""), (1, {1: ("コードブロックなし", "確認ポイントなし")})),
    # filepath は「対象言語のブロックのどれか1つ」に在ればよい。any を all へ変えると落ちる。
    ("2ブロックのうち片方に filepath があれば通る", step(body=CODE_NO_PATH + "\n" + CODE_OK), (1, {})),
    ("2ブロックとも filepath が無ければ落ちる", step(body=CODE_NO_PATH + "\n```tsx\nconst b = 2;\n```\n"), (1, {1: ("filepathコメントなし",)})),
    # 対象外言語の filepath で対象言語のブロックを救うと、写経先が分からないまま通る。
    (
        "bash の filepath は tsx の代わりにならない",
        step(body="```bash\n# filepath: scripts/a.sh\nls\n```\n\n" + CODE_NO_PATH),
        (1, {1: ("filepathコメントなし",)}),
    ),
    # GUI ステップの免除はコードブロックの有無だけ。コードがあるなら filepath は要る。
    ("GUI ステップでもコードがあれば filepath は要る", step(title="ブラウザで開く", body=CODE_NO_PATH), (1, {1: ("filepathコメントなし",)})),
    # 目印は閉じまで含めて1行として読む。閉じの無い `{/* filepath:` は貼ると構文エラーになる。
    ("閉じの無い JSX 目印は目印として数えない", step(body="```tsx\n{/* filepath: src/app/page.tsx\nconst a = 1;\n```\n"), (1, {1: ("filepathコメントなし",)})),
    ("閉じのある JSX 目印は通る", step(body="```tsx\n{/* filepath: src/app/page.tsx */}\nconst a = 1;\n```\n"), (1, {})),
    # 節の切れ目。`## ` でステップが終わらないと、後ろの節のコードと確認ポイントを
    # 吸い込んで、中身が空のステップが「完全」として通る。
    (
        "`## ` より後ろの節をステップに吸い込まない",
        step(body="本文だけです。\n", check_point="")
        + "\n## まとめ\n\n"
        + CODE_OK
        + "\n**確認ポイント**: 画面が出た\n",
        (1, {1: ("コードブロックなし", "確認ポイントなし")}),
    ),
    ("次の Step 見出しでステップが切れる", step(body=CODE_OK) + "\n### Step 2: 続き\n\n本文だけです。\n", (2, {2: ("コードブロックなし", "確認ポイントなし")})),
    ("コロンの無い見出しはステップとして数えない", "### Step 1 実装する\n\n本文だけです。\n", (0, {})),
    ("ステップが無いファイルは通る", "## まとめ\n\n本文だけです。\n", (0, {})),
]

# GUI 操作ステップとしてコードブロックを免除する語。本体の gui_keywords と対で、
# 1つ削るとここが落ちる。
GUI_KEYWORDS: list[str] = [
    "ブラウザ",
    "GUI",
    "Webサイト",
    "サイト上で",
    "画面で操作",
    "Vercel",
    "GitHubで",
    "アカウントを作成",
    "サインアップ",
    "動作確認",
    "リポジトリを作成",
    "リポジトリをインポート",
]

# 免除語でない普通の語。ここが免除されるようになったら、免除条件が広がりすぎている。
NON_GUI_WORDS: list[str] = ["実装", "コンポーネント", "テスト", "ファイル", "コード", "設定", "確認"]

# filepath 目印を要求する言語。写経先が要るのはこの6つ。
FILEPATH_REQUIRED_LANGS: list[str] = ["typescript", "javascript", "tsx", "jsx", "ts", "js"]

# 大文字混じりで書かれた対象言語。本体は lang.lower() で正規化してから対象か判定する。
# その正規化を外すと ```TSX が対象外に落ち、filepath 目印なしで素通りする。
# 教材は今すべて小文字だが、表記ゆれ1つで検査が抜ける経路なので固定しておく。
FILEPATH_REQUIRED_LANGS_MIXED_CASE: list[str] = ["TSX", "TypeScript", "JS", "Tsx"]

# 写経先を持たない言語。ここに filepath を求めると、正しい教材が落ちる。
FILEPATH_FREE_LANGS: list[str] = ["bash", "shell", "sh", "zsh", "mermaid", "text", "json"]

# GUI 語を探す窓は本体が step[:500] と直書きしているので、テスト側でも 500 を持つ。
# 本体の数字が動いたらここと食い違って落ちる。
GUI_WINDOW = 500
GUI_KEYWORD = "ブラウザ"
STEP_PREFIX_LENGTH = len(step(body="", check_point=""))

# 語の末尾がちょうど窓の最後の文字（index 499）に来る位置。1字でも窓を狭めると外れる。
PADDING_INSIDE_WINDOW = "あ" * (GUI_WINDOW - STEP_PREFIX_LENGTH - len(GUI_KEYWORD))
# 語の先頭がちょうど窓の次の文字（index 500）に来る位置。1字でも窓を広げると入る。
PADDING_OUTSIDE_WINDOW = "あ" * (GUI_WINDOW - STEP_PREFIX_LENGTH)


def check_cases() -> int:
    failed = 0
    for name, text, expected in CASES:
        code, steps, errors = run(text)
        got = (steps, errors)
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
        # 不備があるのに 0 で返ると、check_quality.sh が緑のまま通る。
        want_code = 1 if expected[1] else 0
        if code != want_code:
            failed += 1
            print(f"  ❌ {name}: 終了コード 期待 {want_code} / 実際 {code}")
    return failed


def check_gui_keywords() -> int:
    failed = 0
    for keyword in GUI_KEYWORDS:
        _code, _steps, errors = run(step(body=f"{keyword}の手順で進めます。\n"))
        if errors:
            failed += 1
            print(f"  ❌ GUI 免除が効いていない語: {keyword} → {errors}")
    for word in NON_GUI_WORDS:
        _code, _steps, errors = run(step(body=f"{word}の手順で進めます。\n"))
        if errors.get(1) != ("コードブロックなし",):
            failed += 1
            print(f"  ❌ 免除語でない語で免除された: {word} → {errors}")
    return failed


def check_langs() -> int:
    failed = 0
    for lang in FILEPATH_REQUIRED_LANGS:
        _code, _steps, errors = run(step(body=f"```{lang}\nconst a = 1;\n```\n"))
        if errors.get(1) != ("filepathコメントなし",):
            failed += 1
            print(f"  ❌ filepath を要求しない言語になっている: {lang} → {errors}")
    for lang in FILEPATH_REQUIRED_LANGS_MIXED_CASE:
        _code, _steps, errors = run(step(body=f"```{lang}\nconst a = 1;\n```\n"))
        if errors.get(1) != ("filepathコメントなし",):
            failed += 1
            print(f"  ❌ 大文字混じりで対象言語から外れた: {lang} → {errors}")
    for lang in FILEPATH_FREE_LANGS:
        _code, _steps, errors = run(step(body=f"```{lang}\nx\n```\n"))
        if errors:
            failed += 1
            print(f"  ❌ 写経先を持たない言語に filepath を求めた: {lang} → {errors}")
    return failed


def check_gui_window() -> int:
    """冒頭500字の窓が両側から動いていないか見る。"""
    failed = 0
    _code, _steps, inside = run(step(body=PADDING_INSIDE_WINDOW + GUI_KEYWORD + "で確認します。\n"))
    if inside:
        failed += 1
        print(f"  ❌ 窓が狭められています（{GUI_WINDOW}字目で終わる GUI 語で免除されない）→ {inside}")
    _code, _steps, outside = run(step(body=PADDING_OUTSIDE_WINDOW + GUI_KEYWORD + "で確認します。\n"))
    if outside.get(1) != ("コードブロックなし",):
        failed += 1
        print(f"  ❌ 窓が広げられています（{GUI_WINDOW + 1}字目から始まる GUI 語で免除された）→ {outside}")
    return failed


def main() -> int:
    failed = check_cases() + check_gui_keywords() + check_langs() + check_gui_window()
    total = (
        len(CASES) * 2
        + len(GUI_KEYWORDS)
        + len(NON_GUI_WORDS)
        + len(FILEPATH_REQUIRED_LANGS)
        + len(FILEPATH_REQUIRED_LANGS_MIXED_CASE)
        + len(FILEPATH_FREE_LANGS)
        + 2
    )
    if failed:
        print(f"❌ check_no_skip 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_no_skip 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
