#!/usr/bin/env python3
"""code_wrap の退行テスト。

- SAFE_COLS 以下の行は一字も触らない（実改行を増やさない）
- 長い行は「非英数字→英数字」の境界のうち貪欲に選んだ位置だけ実改行が入る
- Prism の <span> をまたぐ境界でも改行が入る
- 文字列リテラル・URL・長い英数ラン・日本語コメントも拾う
- 変換後は unsafe_runs が必ず空になる（語の途中折れが起き得ない）
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from code_wrap import (  # noqa: E402
    SAFE_COLS,
    atoms,
    classify,
    unsafe_runs,
    wrap_code_in_html,
)


def pre(inner: str) -> str:
    return f'<pre class="language-tsx"><code>{inner}</code></pre>'


def count_breaks(html: str, base: str) -> int:
    return html.count("\n") - base.count("\n")


def main() -> int:
    failures: list[str] = []

    # 1. 短い行は無変換
    short = pre('<span class="token keyword">const</span> x = 1;')
    if wrap_code_in_html(short) != short:
        failures.append("短い行を書き換えてしまった")

    # 2. 長い行に実改行が入る。JSX属性値の中では空白直後のみが候補
    #    （vfm 出力では < は &lt; なのでテストも実体参照で書く）
    long_cls = ('&lt;div x' + 'x' * 30) + ' className="mx-auto flex ' \
        'min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10"'
    out = wrap_code_in_html(pre(long_cls))
    if count_breaks(out, pre(long_cls)) == 0:
        failures.append("長い className 行に実改行が入っていない")
    if unsafe_runs(out):
        failures.append(f"className 行に折返せないランが残る: {unsafe_runs(out)}")
    # 語の途中には入らない: "flex" の前後で折れてはいけない
    if 'f\nlex' in out or 'fle\nx' in out:
        failures.append("語の途中に改行が入った")
    # 属性値の中で空白以外の位置に入っていない（mx-auto の途中等）
    if 'mx\n-auto' in out or 'min\n-h-screen' in out:
        failures.append("属性値内の語の途中に改行が入った")

    # 3. TSのプレーン文字列は strict — 内側に改行を入れず行ごと縮小する
    url = 'DATABASE_URL="postgresql://user:password@localhost:25532/' \
        'taskapp?schema=public"'
    out = wrap_code_in_html(pre(url))
    if count_breaks(out, pre(url)) > 0:
        failures.append("strict な文字列の中に改行が入った")
    if "cw-shrink" not in out:
        failures.append("strict な長行がフォント縮小されていない")
    if unsafe_runs(out):
        failures.append(f"URL 行に折返せないランが残る: {unsafe_runs(out)}")

    # 4. <span> 境界をまたぐ識別子（utils.projectX…）。`.` は GLUE_PUNCTS
    #    なので直後に改行は入らず、収まらない行は縮小で1行に収める
    spanned = (
        '<span class="token">utils</span>'
        '<span class="token punctuation">.</span>'
        '<span class="token">project' + 'x' * 60 + '</span>'
    )
    out = wrap_code_in_html(pre(spanned))
    if '.\n' in out:
        failures.append("メンバーアクセスの . 直後に改行が入った")
    if "cw-shrink" not in out:
        failures.append("収まらないメンバーアクセス行が縮小されていない")

    # 5. 純粋な英数ランはコード領域で途中折れしない。60%未満なら残件報告
    run = "a" * (SAFE_COLS + 40)
    res_run: list[str] = []
    out = wrap_code_in_html(pre(run), res_run)
    if count_breaks(out, pre(run)) > 0:
        failures.append("英数ランの途中に改行が入った")
    if not res_run:
        failures.append("縮小下限を割る英数ランが残件に挙がっていない")
    # 縮小で収まる長さなら cw-shrink になる
    run2 = "a" * (SAFE_COLS + 20)
    out2 = wrap_code_in_html(pre(run2))
    if "cw-shrink" not in out2:
        failures.append("縮小可能な英数ランが縮小されていない")

    # 6. 日本語を含む長行（2桁カウント）も unsafe にならない（コード中のWIDE）
    jp = "const x = " + "あ" * 40 + " + " + "b" * 30
    out = wrap_code_in_html(pre(jp))
    if unsafe_runs(out):
        failures.append(f"日本語行に折返せないランが残る: {unsafe_runs(out)}")
    # // 行コメントは strict：中で折れるとコピー時に尻尾がコード化するため、
    # 収まらなければ残件として報告される
    res: list[str] = []
    cmt = "    // " + "あ" * 60
    out = wrap_code_in_html(pre(cmt), res)
    if not res:
        failures.append("長い行コメントが残件に挙がっていない")

    # 7. 実体参照 &#x3C; を1文字として数える（桁を6倍に誤算しない）
    ent = "x" * 50 + " " + "&#x3C;" * 3 + "y"
    out = wrap_code_in_html(pre(ent))
    if unsafe_runs(out):
        failures.append(f"実体参照行に折返せないランが残る: {unsafe_runs(out)}")

    # 8. 複数行のうち長い行だけが処理され、短い行は触らない。
    #    折れ候補を持たない英数ランは縮小になる
    mixed = pre("const a = 1;\n" + "y" * 70 + "\nconst b = 2;")
    out = wrap_code_in_html(mixed)
    if "const a = 1;\n" not in out:
        failures.append("短い先行が失われた")
    if "const b = 2;" not in out:
        failures.append("短い後行が失われた")
    if "cw-shrink" not in out:
        failures.append("混在ブロックの長行が縮小されていない")

    # 9. pre 以外（本文中の <wbr> らしき文字列・code インライン）は触らない。
    #    pre 内の長い英数ランは縮小で処理される
    body = "<p>本文 <code>abc" + "d" * 70 + "</code> です</p>" + pre("e" * 70)
    out = wrap_code_in_html(body)
    if "cw-shrink" not in out:
        failures.append("pre ブロックの長行が縮小されていない")
    if "<code>abc" + "d" * 20 + "\n" in out:
        failures.append("インライン code 内に改行を入れてしまった")

    # 10. 波ダッシュ等の非ASCII記号は境界として扱う
    wave = "x" * 30 + " 〜〜〜〜 " + "y" * 40
    out = wrap_code_in_html(pre(wave))
    if unsafe_runs(out):
        failures.append(f"非ASCII記号行に折返せないランが残る: {unsafe_runs(out)}")

    # 11. atoms/classify の単位確認
    if atoms("a&#x3C;b") != ["a", "&#x3C;", "b"]:
        failures.append(f"atoms の分解がおかしい: {atoms('a&#x3C;b')}")
    if classify("&#x3C;") != "PUNCT":
        failures.append("&#x3C; が PUNCT と見なせていない")
    if classify("あ") != "WIDE":
        failures.append("日本語が WIDE と見なせていない")

    # 12. 改行を含む pre で行またぎの誤判定がない
    twoline = pre("short\n" + "z" * 70)
    out = wrap_code_in_html(twoline)
    if unsafe_runs(out):
        failures.append(f"2行ブロックに折返せないランが残る: {unsafe_runs(out)}")

    # 13. 複数行JSX：<div が前行にあっても className は属性値と判定される
    jsx = pre(
        "&lt;div\n"
        '  className="flex items-center gap-3 rounded-md px-3 py-2 '
        'text-sm transition-colors hover:bg-accent"'
    )
    out = wrap_code_in_html(jsx)
    if unsafe_runs(out):
        failures.append(f"複数行JSXに折返せないランが残る: {unsafe_runs(out)}")
    if "cw-shrink" in out:
        failures.append("複数行JSX属性が縮小扱いになってしまった")

    # 14. {/* */} ブロックコメントは空白・CJK位置で折れる（strictにしない）
    bcom = pre(
        "x = 1\n"
        "    {/* filepath: src/component/task/task-detail-dialog.tsx"
        "（同じファイルの続き。ここに長い説明が続く） */}"
    )
    res2: list[str] = []
    out = wrap_code_in_html(bcom, res2)
    if res2:
        failures.append(f"ブロックコメントが残件化した: {res2}")
    if unsafe_runs(out):
        failures.append(f"ブロックコメントに折返せないランが残る: {unsafe_runs(out)}")

    # 15. テンプレートリテラルの ${} 内はコード領域（区切りで折れる）
    tpl = pre(
        "      ? `${formatDateOnly(reportData.startDate)}"
        " - ${formatDateOnly(reportData.endDate)}`"
    )
    res3: list[str] = []
    out = wrap_code_in_html(tpl, res3)
    if res3:
        failures.append(f"テンプレート行が残件化した: {res3}")
    if unsafe_runs(out):
        failures.append(f"テンプレート行に折返せないランが残る: {unsafe_runs(out)}")

    # 16. bash は行指向：行内に一切改行を入れず、長行は縮小で収める
    bash_pre = (
        '<pre class="language-bash"><code>'
        'git remote add origin https://github.com/your-user/task-app.git'
        "</code></pre>"
    )
    out = wrap_code_in_html(bash_pre)
    if count_breaks(out, bash_pre) > 0:
        failures.append("bash 行内に改行が入った")
    if "cw-shrink" not in out:
        failures.append("bash 長行が縮小されていない")
    if unsafe_runs(out):
        failures.append(f"bash 行に折返せないランが残る: {unsafe_runs(out)}")

    # 17. ASI: `return`・`throw` 直後の空白位置では折れない。
    #    `return\nexpr` は ASI で `return; expr` になり意味が変わる
    asi = pre(
        "      return ctx.db.task.findMany({ where: { id: taskId }, "
        "include: { project: true } });"
    )
    out = wrap_code_in_html(asi)
    if "return\n" in out or "return \n" in out:
        failures.append("return 直後で折れた")
    if unsafe_runs(out):
        failures.append(f"return 行に折返せないランが残る: {unsafe_runs(out)}")
    thr = pre(
        '      throw new TRPCError({ code: "FORBIDDEN", message: '
        '"プロジェクトのメンバーではありません" });'
    )
    out = wrap_code_in_html(thr)
    if "throw\n" in out or "throw \n" in out:
        failures.append("throw 直後で折れた")
    if unsafe_runs(out):
        failures.append(f"throw 行に折返せないランが残る: {unsafe_runs(out)}")
    # `foo.return` はメンバーアクセスなので ASI 対象外（折ってよい）
    mem = pre(
        "      const result = obj.return somethingElse.veryLongProperty"
        "Name.andEvenMore.toMakeThisLineLongEnoughToWrapAround"
    )
    out = wrap_code_in_html(mem)
    if "return\n" in out:
        # メンバー名直後でも ASI 語と誤認して折れ禁止にならないことを確認
        # （return と空白の間で折れないこと自体はどちらでもよいが、
        #   行全体が折れ候補を失って unsafe になってはいけない）
        pass
    if unsafe_runs(out):
        failures.append(f"メンバー return 行に折返せないランが残る: {unsafe_runs(out)}")

    # 18. 正規表現リテラル内では折れない（`/[\nA-Z]/` は構文エラー）。
    #    折り候補が消えるので行は縮小で収まるか残件になる
    rgx = pre(
        "    .regex(/[A-Z]/, 'パスワードには大文字を含める必要があります')"
    )
    out = wrap_code_in_html(rgx)
    if "[\n" in out or "/\n" in out:
        failures.append("正規表現リテラル内で折れた")
    # 除算の `/` は正規表現ではない（直後で折れるわけではないが strict に
    # ならない＝行全体が折れ候補を失わない）
    div = pre(
        "      const ratio = completedTasks.length / totalTasks.length"
        " * percentageFactor + offsetValue"
    )
    out = wrap_code_in_html(div)
    if unsafe_runs(out):
        failures.append(f"除算行に折返せないランが残る: {unsafe_runs(out)}")
    # `//` は行コメントであって正規表現ではない（strict 化＝残件対象）
    res4: list[str] = []
    cmt2 = "    // " + "あ" * 60
    out = wrap_code_in_html(pre(cmt2), res4)
    if not res4:
        failures.append("regex対応で // コメントが strict でなくなった")
    # 閉じ引用符の直前で折ると改行がリテラル内に入る（'…あ\n' は構文エラー）。
    # 折り候補が無い長い文字列行は縮小限界を超えるので残件になる
    res5: list[str] = []
    strline = "x = '" + "あ" * 40 + "' + tail"
    out = wrap_code_in_html(pre(strline), res5)
    if not res5:
        failures.append("長い文字列行が残件に挙がっていない")
    if re.search(r"[^\n']\n'", out):
        failures.append("閉じ引用符の直前で折れた（リテラル内改行）")

    # 19. 三項演算子の文字列は開始引用符の直前で折れる。
    #     strict ランの先頭（`'`）の手前は文字列の外なので、そこに改行を
    #     入れても `? 'AAA' : 'BBB'` の構文は保たれる。中身には入れない
    tern = pre(
        "                {authFailed ? 'ログインの有効期限が切れました'"
        " : 'アクセス権限がありません'}"
    )
    res6: list[str] = []
    out = wrap_code_in_html(tern, res6)
    if res6:
        failures.append(f"三項演算子行が残件化した: {res6}")
    if count_breaks(out, tern) == 0:
        failures.append("三項演算子行に実改行が入っていない")
    if "\n'" not in out:
        failures.append("開始引用符の直前で折れていない")
    if unsafe_runs(out):
        failures.append(f"三項演算子行に折返せないランが残る: {unsafe_runs(out)}")
    # 閉じ引用符の直前では折らない（改行がリテラル内に入る）
    if re.search(r"しま\n'", out) or re.search(r"せん\n'", out):
        failures.append("閉じ引用符の直前で折れた（リテラル内改行）")
    # ASI危険語の直後では開始引用符の前でも折らない（`return\n'x'` は
    # `return; 'x'` と解釈され意味が変わる）
    asi2 = pre("      return '" + "あ" * 40 + "';")
    res7: list[str] = []
    out = wrap_code_in_html(asi2, res7)
    if "return\n'" in out or "return \n'" in out:
        failures.append("return 直後の文字列開始位置で折れた")

    if failures:
        print(f"❌ {len(failures)} 件失敗")
        for failure in failures:
            print(f"  {failure}")
        return 1
    print("✅ code_wrap 全19ケース通過")
    return 0


if __name__ == "__main__":
    sys.exit(main())
